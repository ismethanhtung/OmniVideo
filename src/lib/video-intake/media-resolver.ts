import { getAppEnv } from "@/lib/config/env";

import { resolveMediaUrlInternal } from "./internal-resolver";
import { isLikelyDirectMediaUrl } from "./platform";
import {
  type IntakeQualityPreference,
  type ResolvedMedia,
  type ValidatedIntakeInput,
} from "./types";

type ResolverResponse = {
  directMediaUrl?: string;
  downloadMode?: "direct-url" | "yt-dlp-file";
  resolverProfile?: string;
  formatSelector?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  formatId?: string;
  formatNote?: string;
  height?: number;
  width?: number;
  resolution?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  requestHeaders?: Record<string, string>;
};

function normalizeResolverQuality(preference: IntakeQualityPreference) {
  return preference;
}

function mapResolvedMedia({
  input,
  payload,
  resolver,
}: {
  input: ValidatedIntakeInput;
  payload: ResolverResponse;
  resolver: ResolvedMedia["resolver"];
}): ResolvedMedia {
  return {
    originalUrl: input.canonicalUrl,
    directMediaUrl: payload.directMediaUrl,
    originPlatform: input.originPlatform,
    title: payload.title ?? input.title,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    durationMs: payload.durationMs,
    requestedQuality: normalizeResolverQuality(input.qualityPreference ?? "best"),
    downloadMode: payload.downloadMode ?? "direct-url",
    resolverProfile: payload.resolverProfile,
    formatSelector: payload.formatSelector ?? input.formatSelector,
    hasAudio: payload.hasAudio,
    hasVideo: payload.hasVideo,
    formatId: payload.formatId,
    formatNote: payload.formatNote,
    height: payload.height,
    width: payload.width,
    resolution: payload.resolution,
    ext: payload.ext,
    vcodec: payload.vcodec,
    acodec: payload.acodec,
    requestHeaders: payload.requestHeaders,
    resolver,
  };
}

async function resolveViaExternalEndpoint(
  input: ValidatedIntakeInput,
  resolverEndpoint: string,
): Promise<ResolvedMedia | null> {
  const response = await fetch(resolverEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: input.canonicalUrl,
      platform: input.originPlatform,
      qualityPreference: input.qualityPreference ?? "best",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ResolverResponse;

  if (!payload.directMediaUrl) {
    return null;
  }

  return mapResolvedMedia({
    input,
    payload,
    resolver: "external-resolver",
  });
}

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

async function resolveViaCobalt(
  input: ValidatedIntakeInput,
  cobaltUrl: string,
): Promise<ResolvedMedia | null> {
  let videoQuality = "1080";
  if (input.qualityPreference === "best") videoQuality = "max";
  else if (input.qualityPreference) videoQuality = input.qualityPreference.replace("p", "");

  const downloadMode = (input.formatSelector?.includes("audio") || input.formatSelector?.includes("ba"))
    ? "audio"
    : "auto";

  const headers: Record<string, string> = {
    "Accept": "application/json",
    "Content-Type": "application/json",
  };

  const cobaltApiKey = getAppEnv().COBALT_API_KEY;
  if (cobaltApiKey) {
    headers["Authorization"] = `Api-Key ${cobaltApiKey}`;
  }

  const body = {
    url: input.canonicalUrl,
    videoQuality,
    downloadMode,
    audioFormat: "mp3",
    filenameStyle: "basic",
  };

  const response = await fetchFromCobalt(cobaltUrl, body, headers);

  if (!response) {
    console.error("Cobalt API request failed on all endpoint candidates.");
    return null;
  }

  const payload = (await response.json()) as {
    status: string;
    url?: string;
    filename?: string;
    text?: string;
  };

  if (payload.status === "error") {
    console.error(`Cobalt API returned error status: ${payload.text}`);
    return null;
  }

  if (!payload.url) {
    console.error("Cobalt API did not return download URL");
    return null;
  }

  return {
    originalUrl: input.canonicalUrl,
    directMediaUrl: payload.url,
    originPlatform: input.originPlatform,
    title: payload.filename || input.title || "extracted-media",
    requestedQuality: input.qualityPreference ?? "best",
    downloadMode: "direct-url",
    resolver: "cobalt",
    hasAudio: true,
    hasVideo: downloadMode === "auto",
    ext: downloadMode === "audio" ? "mp3" : "mp4",
  };
}

async function resolveViaTikWm(
  input: ValidatedIntakeInput,
): Promise<ResolvedMedia | null> {
  try {
    const response = await fetch("https://www.tikwm.com/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ url: input.canonicalUrl }).toString(),
    });

    if (!response.ok) {
      console.error(`TikWM API HTTP error: ${response.status}`);
      return null;
    }

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

    if (payload.code !== 0 || !payload.data) {
      console.error(`TikWM API error: ${payload.msg}`);
      return null;
    }

    const downloadMode = (input.formatSelector?.includes("audio") || input.formatSelector?.includes("ba"))
      ? "audio"
      : "auto";

    const directMediaUrl = downloadMode === "audio"
      ? payload.data.music
      : payload.data.play;

    let finalUrl = directMediaUrl;
    if (finalUrl && finalUrl.startsWith("/")) {
      finalUrl = `https://www.tikwm.com${finalUrl}`;
    }

    return {
      originalUrl: input.canonicalUrl,
      directMediaUrl: finalUrl,
      originPlatform: "tiktok",
      title: payload.data.title || "tiktok-video",
      requestedQuality: input.qualityPreference ?? "best",
      downloadMode: "direct-url",
      resolver: "cobalt",
      hasAudio: true,
      hasVideo: downloadMode === "auto",
      ext: downloadMode === "audio" ? "mp3" : "mp4",
    };
  } catch (e) {
    console.error("TikWM resolve error:", e);
    return null;
  }
}

async function resolveViaDouyinWtf(
  input: ValidatedIntakeInput,
): Promise<ResolvedMedia | null> {
  try {
    const response = await fetch(
      `https://api.douyin.wtf/api/hybrid/video_data?url=${encodeURIComponent(input.canonicalUrl)}&minimal=true`,
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

    const downloadMode = (input.formatSelector?.includes("audio") || input.formatSelector?.includes("ba"))
      ? "audio"
      : "auto";

    const directMediaUrl = downloadMode === "audio"
      ? payload.video_data.music_url
      : payload.video_data.nwm_video_url_HQ;

    if (!directMediaUrl) return null;

    return {
      originalUrl: input.canonicalUrl,
      directMediaUrl,
      originPlatform: "douyin",
      title: payload.video_data.desc || "douyin-video",
      requestedQuality: input.qualityPreference ?? "best",
      downloadMode: "direct-url",
      resolver: "cobalt",
      hasAudio: true,
      hasVideo: downloadMode === "auto",
      ext: downloadMode === "audio" ? "mp3" : "mp4",
    };
  } catch (e) {
    console.error("Douyin.wtf resolve error:", e);
    return null;
  }
}

export async function resolveMediaUrl(
  input: ValidatedIntakeInput,
): Promise<ResolvedMedia> {
  if (isLikelyDirectMediaUrl(input.canonicalUrl)) {
    return {
      originalUrl: input.canonicalUrl,
      directMediaUrl: input.canonicalUrl,
      originPlatform: input.originPlatform,
      title: input.title,
      requestedQuality: input.qualityPreference ?? "best",
      downloadMode: "direct-url",
      resolver: "direct-url",
    };
  }

  if (input.originPlatform === "tiktok") {
    try {
      const tikWmData = await resolveViaTikWm(input);
      if (tikWmData) {
        return tikWmData;
      }
    } catch (e) {
      console.error("Resolve via TikWM failed:", e);
    }
  }

  if (input.originPlatform === "douyin") {
    try {
      const douyinWtfData = await resolveViaDouyinWtf(input);
      if (douyinWtfData) {
        return douyinWtfData;
      }
    } catch (e) {
      console.error("Resolve via Douyin.wtf failed:", e);
    }
  }

  const cobaltUrl = getAppEnv().COBALT_API_URL;
  if (cobaltUrl) {
    try {
      const cobaltResult = await resolveViaCobalt(input, cobaltUrl);
      if (cobaltResult) {
        return cobaltResult;
      }
      throw new Error("Cobalt API failed to resolve the media URL.");
    } catch (e) {
      console.error("Resolve via Cobalt failed:", e);
      throw e;
    }
  }

  const resolverEndpoint = getAppEnv().VIDEO_RESOLVER_ENDPOINT;

  if (resolverEndpoint) {
    const externalResult = await resolveViaExternalEndpoint(input, resolverEndpoint);

    if (externalResult) {
      return externalResult;
    }
  }

  const payload = await resolveMediaUrlInternal(
    input.canonicalUrl,
    input.qualityPreference ?? "best",
    input.formatSelector,
  );

  return mapResolvedMedia({
    input,
    payload,
    resolver: "internal-resolver",
  });
}
