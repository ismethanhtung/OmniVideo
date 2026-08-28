import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
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
        play: string;
        music: string;
      };
    };

    if (payload.code !== 0 || !payload.data) {
      return null;
    }

    return {
      sourceUrl: url,
      title: payload.data.title || "TikTok Video",
      originPlatform: "tiktok",
      resolverProfile: "tikwm",
      formats: [
        {
          formatId: "tikwm-video",
          ext: "mp4",
          formatNote: "video without watermark via TikWM",
          resolution: "best",
          hasAudio: true,
          hasVideo: true,
        },
        {
          formatId: "tikwm-audio",
          ext: "mp3",
          formatNote: "audio/voice only via TikWM",
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

interface TaiNhanhVideoResponse {
  status: boolean;
  message: string;
  data?: {
    video_url?: string;
    video_download_url?: string;
    music?: string;
    title?: string;
    cover?: string;
  };
}

async function fetchTaiNhanhVideoSession() {
  try {
    const getResponse = await fetch("https://tainhanhvideo.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
      }
    });

    if (!getResponse.ok) return null;

    const setCookieHeaders = getResponse.headers.getSetCookie();
    const cookiesArr = setCookieHeaders.map(c => c.split(";")[0]);
    const cookiesStr = cookiesArr.join("; ");

    const html = await getResponse.text();
    const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/) || html.match(/csrf-token"\s+content="([^"]+)"/);
    const csrfToken = csrfMatch ? csrfMatch[1] : null;

    const tokenInputMatch = html.match(/name="_token"\s+value="([^"]+)"/) || html.match(/value="([^"]+)"\s+name="_token"/);
    const formToken = tokenInputMatch ? tokenInputMatch[1] : null;

    const token = csrfToken || formToken;
    if (!token) return null;

    return { cookiesStr, token };
  } catch (e) {
    console.error("Fetch TaiNhanhVideo session failed:", e);
    return null;
  }
}

async function analyzeViaTaiNhanhVideo(url: string, type: string) {
  try {
    const session = await fetchTaiNhanhVideoSession();
    if (!session) return null;

    const response = await fetch("https://tainhanhvideo.com/tiktok/download", {
      method: "POST",
      headers: {
        "accept": "*/*",
        "accept-language": "vi,en;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-csrf-token": session.token,
        "x-requested-with": "XMLHttpRequest",
        "cookie": session.cookiesStr,
        "Referer": "https://tainhanhvideo.com/",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      body: new URLSearchParams({
        url,
        type,
        _token: session.token
      }).toString()
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as TaiNhanhVideoResponse;
    if (!payload.status || !payload.data || !payload.data.video_download_url) {
      return null;
    }

    const platformName = type === "douyin" ? "douyin" : type === "tiktok" ? "tiktok" : "youtube";

    return {
      sourceUrl: url,
      title: payload.data.title || `${type} Video`,
      originPlatform: platformName,
      resolverProfile: "tainhanhvideo",
      formats: [
        {
          formatId: `${type}-video-hd`,
          ext: "mp4",
          formatNote: `video no watermark via tainhanhvideo`,
          resolution: "best",
          hasAudio: true,
          hasVideo: true,
        },
        {
          formatId: `${type}-audio`,
          ext: "mp3",
          formatNote: `audio/voice only via tainhanhvideo`,
          resolution: "audio",
          hasAudio: true,
          hasVideo: false,
        },
      ],
    };
  } catch (e) {
    console.error(`TaiNhanhVideo analyze error for ${type}:`, e);
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

    // 1. TikTok
    if (platform === "tiktok") {
      try {
        const data = await analyzeViaTaiNhanhVideo(canonicalUrl, "tiktok");
        if (data) return NextResponse.json({ ok: true, data });
      } catch (e) {
        console.error("Analyze TikTok via TaiNhanhVideo failed, falling back:", e);
      }

      try {
        const tikWmData = await analyzeViaTikWm(canonicalUrl);
        if (tikWmData) return NextResponse.json({ ok: true, data: tikWmData });
      } catch (e) {
        console.error("Analyze TikTok via TikWM failed:", e);
      }
    }

    // 2. Douyin
    if (platform === "douyin") {
      try {
        const data = await analyzeViaTaiNhanhVideo(canonicalUrl, "douyin");
        if (data) return NextResponse.json({ ok: true, data });
      } catch (e) {
        console.error("Analyze Douyin via TaiNhanhVideo failed:", e);
      }
    }

    // 3. YouTube
    if (platform === "youtube") {
      try {
        const data = await analyzeViaTaiNhanhVideo(canonicalUrl, "youtube");
        if (data) return NextResponse.json({ ok: true, data });
      } catch (e) {
        console.error("Analyze YouTube via TaiNhanhVideo failed:", e);
      }
    }

    // 4. Facebook
    if (platform === "facebook") {
      try {
        const data = await analyzeViaTaiNhanhVideo(canonicalUrl, "facebook");
        if (data) return NextResponse.json({ ok: true, data });
      } catch (e) {
        console.error("Analyze Facebook via TaiNhanhVideo failed:", e);
      }
    }

    // 5. Fallback sang Cobalt (nếu có cấu hình)
    const cobaltUrl = getAppEnv().COBALT_API_URL;
    if (cobaltUrl) {
      try {
        const cobaltData = await analyzeViaCobalt(canonicalUrl, qualityPreference, cobaltUrl);
        if (cobaltData) {
          return NextResponse.json({
            ok: true,
            data: cobaltData,
          });
        }
      } catch (e) {
        console.error("Analyze via Cobalt fallback failed:", e);
      }
    }

    if (platform === "tiktok" || platform === "douyin" || platform === "youtube" || platform === "facebook") {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "ANALYSIS_FAILED",
          error: `Không thể phân tích link ${platform} này bằng các API công cộng. Vui lòng thử lại sau, hoặc cấu hình COBALT_API_URL (self-hosted) trong file .env.local làm giải pháp backup.`,
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "COBALT_URL_MISSING",
        error: "Chưa cấu hình COBALT_API_URL trong biến môi trường. Vui lòng cấu hình COBALT_API_URL trong file .env.local để hỗ trợ phân tích YouTube, Facebook và các nền tảng khác.",
      },
      { status: 400 }
    );
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
