import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { listMediaFormatsInternal } from "@/lib/video-intake/internal-resolver";
import { detectOriginPlatform, normalizeUrl, resolveShortLinks } from "@/lib/video-intake/platform";
import type { IntakeQualityPreference } from "@/lib/video-intake/types";
import { getAppEnv } from "@/lib/config/env";

export const runtime = "nodejs";

const SUPPORTED_QUALITY_PREFERENCES = new Set<IntakeQualityPreference>([
  "best",
  "1080p",
  "720p",
  "480p",
  "360p",
]);

async function fetchFromCobalt(
  cobaltUrl: string,
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<Response | null> {
  try {
    const response = await fetch(cobaltUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (response.ok) return response;
  } catch (e) {
    console.error(`Fetch to direct cobaltUrl ${cobaltUrl} failed:`, e);
  }

  if (!cobaltUrl.includes("/api/json")) {
    const fallbackUrl = cobaltUrl.endsWith("/")
      ? `${cobaltUrl}api/json`
      : `${cobaltUrl}/api/json`;
    try {
      const response = await fetch(fallbackUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (response.ok) return response;
    } catch (e) {
      console.error(`Fetch to cobalt fallbackUrl ${fallbackUrl} failed:`, e);
    }
  }

  return null;
}

async function analyzeViaCobalt(
  url: string,
  qualityPreference: IntakeQualityPreference,
  cobaltUrl: string,
) {
  let videoQuality = "1080";
  if (qualityPreference === "best") videoQuality = "max";
  else if (qualityPreference) videoQuality = qualityPreference.replace("p", "");

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  const cobaltApiKey = getAppEnv().COBALT_API_KEY;
  if (cobaltApiKey) {
    headers["Authorization"] = `Api-Key ${cobaltApiKey}`;
  }

  const body = {
    url,
    videoQuality,
    downloadMode: "auto",
    filenameStyle: "basic",
  };

  const response = await fetchFromCobalt(cobaltUrl, body, headers);

  if (!response) {
    return null;
  }

  const payload = (await response.json()) as {
    status: string;
    url?: string;
    filename?: string;
    text?: string;
  };

  if (payload.status === "error" || !payload.url) {
    return null;
  }

  return {
    sourceUrl: url,
    title: payload.filename || "Extracted Video",
    originPlatform: detectOriginPlatform(url),
    resolverProfile: "cobalt",
    formats: [
      {
        formatId: "cobalt-video",
        ext: "mp4",
        formatNote: "video + audio via cobalt",
        resolution: "best",
        hasAudio: true,
        hasVideo: true,
      },
      {
        formatId: "cobalt-audio",
        ext: "mp3",
        formatNote: "audio/voice only via cobalt",
        resolution: "audio",
        hasAudio: true,
        hasVideo: false,
      },
    ],
  };
}

async function analyzeViaTikWm(url: string) {
  try {
    const response = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url }).toString(),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      code: number;
      msg: string;
      data?: {
        id: string;
        title: string;
        cover: string;
        play: string;
        music: string;
      };
    };

    if (payload.code !== 0 || !payload.data) return null;

    return {
      sourceUrl: url,
      title: payload.data.title || "TikTok Video",
      originPlatform: "tiktok",
      resolverProfile: "tikwm",
      formats: [
        {
          formatId: "tikwm-video",
          ext: "mp4",
          formatNote: "video no watermark via tikwm",
          resolution: "best",
          hasAudio: true,
          hasVideo: true,
        },
        {
          formatId: "tikwm-audio",
          ext: "mp3",
          formatNote: "audio/voice only via tikwm",
          resolution: "audio",
          hasAudio: true,
          hasVideo: false,
        },
      ],
    };
  } catch (e) {
    console.error("TikWM analyze error:", e);
    return null;
  }
}

async function analyzeViaDouyinWtf(url: string) {
  try {
    const response = await fetch(
      `https://api.douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(url)}&minimal=true`,
      {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      status: string;
      video_data?: {
        desc?: string;
        nwm_video_url_HQ?: string;
        music_url?: string;
      };
    };

    if (!payload.video_data || !payload.video_data.nwm_video_url_HQ) {
      return null;
    }

    return {
      sourceUrl: url,
      title: payload.video_data.desc || "Douyin Video",
      originPlatform: "douyin",
      resolverProfile: "douyin_wtf",
      formats: [
        {
          formatId: "douyin-video-hq",
          ext: "mp4",
          formatNote: "video no watermark HQ via douyin.wtf",
          resolution: "best",
          hasAudio: true,
          hasVideo: true,
        },
        {
          formatId: "douyin-audio",
          ext: "mp3",
          formatNote: "audio/voice only via douyin.wtf",
          resolution: "audio",
          hasAudio: true,
          hasVideo: false,
        },
      ],
    };
  } catch (e) {
    console.error("Douyin.wtf analyze error:", e);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const payload = (await request.json()) as {
      sourceUrl?: unknown;
      qualityPreference?: unknown;
    };
    const sourceUrl =
      typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() : "";

    if (!sourceUrl) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_SOURCE_URL_REQUIRED",
          error: "sourceUrl is required.",
        },
        { status: 400 },
      );
    }

    let canonicalUrl = normalizeUrl(sourceUrl);
    canonicalUrl = await resolveShortLinks(canonicalUrl);
    const qualityRaw =
      typeof payload.qualityPreference === "string"
        ? payload.qualityPreference.trim()
        : "best";
    const qualityPreference = SUPPORTED_QUALITY_PREFERENCES.has(
      qualityRaw as IntakeQualityPreference,
    )
      ? (qualityRaw as IntakeQualityPreference)
      : "best";
    const platform = detectOriginPlatform(canonicalUrl);
    if (platform === "tiktok") {
      try {
        const tikWmData = await analyzeViaTikWm(canonicalUrl);
        if (tikWmData) {
          return NextResponse.json({
            ok: true,
            data: tikWmData,
          });
        }
      } catch (e) {
        console.error("Analyze via TikWM failed, falling back:", e);
      }
    }

    if (platform === "douyin") {
      try {
        const douyinWtfData = await analyzeViaDouyinWtf(canonicalUrl);
        if (douyinWtfData) {
          return NextResponse.json({
            ok: true,
            data: douyinWtfData,
          });
        }
      } catch (e) {
        console.error("Analyze via Douyin.wtf failed, falling back:", e);
      }
    }

    const cobaltUrl = getAppEnv().COBALT_API_URL;
    if (!cobaltUrl) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "COBALT_URL_MISSING",
          error: "Chưa cấu hình COBALT_API_URL trong biến môi trường. Vui lòng cấu hình COBALT_API_URL trong file .env.local và restart lại Next.js server.",
        },
        { status: 400 }
      );
    }

    const cobaltData = await analyzeViaCobalt(canonicalUrl, qualityPreference, cobaltUrl);
    if (!cobaltData) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "COBALT_ANALYZE_FAILED",
          error: "Cobalt API không thể phân tích link này. Vui lòng kiểm tra lại link hoặc sử dụng instance Cobalt khác.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: cobaltData,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "VID_FORMAT_LIST_FAILED",
        error:
          error instanceof Error ? error.message : "Could not list video formats.",
      },
      { status: 422 },
    );
  }
}
