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

async function resolveViaTaiNhanhVideo(
  input: ValidatedIntakeInput,
): Promise<ResolvedMedia | null> {
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
        url: input.canonicalUrl,
        type: "douyin",
        _token: session.token
      }).toString()
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as TaiNhanhVideoResponse;
    if (!payload.status || !payload.data || !payload.data.video_download_url) {
      return null;
    }

    const downloadMode = (input.formatSelector?.includes("audio") || input.formatSelector?.includes("ba"))
      ? "audio"
      : "auto";

    const directMediaUrl = downloadMode === "audio"
      ? payload.data.music
      : payload.data.video_download_url;

    if (!directMediaUrl) return null;

    return {
      originalUrl: input.canonicalUrl,
      directMediaUrl,
      originPlatform: "douyin",
      title: payload.data.title || "douyin-video",
      requestedQuality: input.qualityPreference ?? "best",
      downloadMode: "direct-url",
      resolver: "cobalt",
      hasAudio: true,
      hasVideo: downloadMode === "auto",
      ext: downloadMode === "audio" ? "mp3" : "mp4",
    };
  } catch (e) {
    console.error("TaiNhanhVideo resolve error:", e);
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
      const data = await resolveViaTaiNhanhVideo(input);
      if (data) return data;
    } catch (e) {
      console.error("Resolve TikTok via TaiNhanhVideo failed, trying TikWM:", e);
    }

    try {
      const tikWmData = await resolveViaTikWm(input);
      if (tikWmData) return tikWmData;
    } catch (e) {
      console.error("Resolve via TikWM failed:", e);
    }
  }

  if (input.originPlatform === "douyin" || input.originPlatform === "youtube" || input.originPlatform === "facebook") {
    try {
      const data = await resolveViaTaiNhanhVideo(input);
      if (data) return data;
    } catch (e) {
      console.error(`Resolve ${input.originPlatform} via TaiNhanhVideo failed:`, e);
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
