function extensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = (mimeType || "").trim().toLowerCase();
  if (normalized === "image/png") return ".png";
  if (normalized === "image/jpeg") return ".jpg";
  if (normalized === "image/webp") return ".webp";
  if (normalized === "image/gif") return ".gif";
  if (normalized === "image/bmp") return ".bmp";
  if (normalized === "image/svg+xml") return ".svg";
  if (normalized === "video/mp4") return ".mp4";
  if (normalized === "video/webm") return ".webm";
  if (normalized === "video/quicktime") return ".mov";
  if (normalized === "audio/mpeg") return ".mp3";
  if (normalized === "audio/wav" || normalized === "audio/x-wav") return ".wav";
  if (normalized === "audio/aac") return ".aac";
  if (normalized === "audio/flac") return ".flac";
  if (normalized === "audio/ogg") return ".ogg";
  if (normalized.startsWith("image/")) return ".img";
  if (normalized.startsWith("video/")) return ".mp4";
  if (normalized.startsWith("audio/")) return ".audio";
  return ".bin";
}

export function resolveDownloadFilenameForAsset(input: {
  title?: string | null;
  mimeType?: string | null;
}) {
  const fallback = "omnivideo-asset";
  const base = (input.title || fallback)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const sanitized = base || fallback;
  if (/\.[a-z0-9]{2,5}$/i.test(sanitized)) {
    return sanitized;
  }

  return `${sanitized}${extensionFromMimeType(input.mimeType)}`;
}
