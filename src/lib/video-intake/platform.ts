import type { OriginPlatform } from "./types";

const DIRECT_VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm", ".m4v", ".mkv"];

export function normalizeUrl(rawUrl: string): string {
  let value = rawUrl.trim();

  if (!value) {
    throw new Error("URL is required.");
  }

  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = value.match(urlRegex);
  if (match) {
    value = match[0];
  }

  const url = new URL(value);
  url.hash = "";

  return url.toString();
}

export function detectOriginPlatform(rawUrl: string): OriginPlatform {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (isLikelyDirectMediaUrl(rawUrl)) {
    return "direct";
  }

  if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) {
    return "youtube";
  }

  if (hostname.endsWith("tiktok.com")) {
    return "tiktok";
  }

  if (hostname.endsWith("douyin.com")) {
    return "douyin";
  }

  if (hostname.endsWith("facebook.com") || hostname === "fb.watch") {
    return "facebook";
  }

  if (hostname.endsWith("instagram.com")) {
    return "instagram";
  }

  if (hostname.endsWith("bilibili.com")) {
    return "bilibili";
  }

  return "other";
}

export function isLikelyDirectMediaUrl(rawUrl: string): boolean {
  const url = new URL(rawUrl);
  const pathname = url.pathname.toLowerCase();

  return DIRECT_VIDEO_EXTENSIONS.some((extension) => pathname.endsWith(extension));
}

export async function resolveShortLinks(initialUrl: string, maxRedirects = 5): Promise<string> {
  let url = initialUrl;
  for (let i = 0; i < maxRedirects; i++) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      
      const isShortLink = 
        hostname === "v.douyin.com" || 
        hostname === "vm.tiktok.com" || 
        hostname === "vt.tiktok.com" || 
        hostname === "youtu.be" || 
        hostname === "fb.watch";

      if (!isShortLink) {
        break;
      }

      const response = await fetch(url, {
        method: "HEAD",
        redirect: "manual",
      });
      const location = response.headers.get("location");
      if (!location) {
        break;
      }
      url = new URL(location, url).toString();
    } catch (e) {
      console.error(`Follow redirect failed at step ${i} for ${url}:`, e);
      break;
    }
  }
  return url;
}
