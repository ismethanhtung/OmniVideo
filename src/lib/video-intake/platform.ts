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
