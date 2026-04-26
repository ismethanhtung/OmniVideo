export type StatusTone = "success" | "warning" | "error" | "info" | "neutral";

export const STATUS_TONE_BADGE_CLASSES: Record<StatusTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  neutral: "border-main bg-main text-muted",
};

export const STATUS_TONE_TEXT_CLASSES: Record<StatusTone, string> = {
  success: "text-emerald-700",
  warning: "text-amber-700",
  error: "text-rose-700",
  info: "text-sky-700",
  neutral: "text-muted",
};

export function normalizeStatusLabel(status: string) {
  return status.replace(/_/g, " ");
}

export function getStatusTone(status: string): StatusTone {
  const normalized = status.trim().toLowerCase();

  if (
    normalized === "published" ||
    normalized === "connected" ||
    normalized === "ready" ||
    normalized === "success" ||
    normalized === "ok"
  ) {
    return "success";
  }

  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "canceled" ||
    normalized === "down"
  ) {
    return "error";
  }

  if (
    normalized === "planned" ||
    normalized === "queued" ||
    normalized === "retrying" ||
    normalized === "needs_auth" ||
    normalized === "processing" ||
    normalized === "paused"
  ) {
    return "warning";
  }

  if (normalized === "loading" || normalized === "running" || normalized === "checking") {
    return "info";
  }

  return "neutral";
}
