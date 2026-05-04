export const OWNER_TOKEN_COOKIE = "omnivideo_owner_token";
export const VIEW_MODE_LOCKED_NOTE =
  "Some features are disabled in View Mode.";
export const VIEW_MODE_WRITE_DISABLED_MESSAGE = `This public demo is read-only for data-changing actions. ${VIEW_MODE_LOCKED_NOTE}`;
export const VIEW_MODE_PROVIDER_ACCOUNT_DISABLED_MESSAGE = `Public demo requests cannot use saved provider accounts. ${VIEW_MODE_LOCKED_NOTE}`;
export const VIEW_MODE_RATE_LIMITED_MESSAGE = `Public demo rate limit exceeded. Try again later. ${VIEW_MODE_LOCKED_NOTE}`;

const VIEW_MODE_ERROR_CODES = new Set([
  "DEMO_WRITE_DISABLED",
  "DEMO_PROVIDER_ACCOUNT_DISABLED",
  "DEMO_RATE_LIMITED",
]);

export function isViewModeAccessError(value?: {
  errorCode?: string;
  error?: string;
} | null): boolean {
  if (!value) return false;
  return (
    (value.errorCode ? VIEW_MODE_ERROR_CODES.has(value.errorCode) : false) ||
    Boolean(value.error?.includes("View Mode"))
  );
}

export type AppMode = "owner" | "public-demo";

export type AppAccessState = {
  mode: AppMode;
  isPublicDemo: boolean;
  isOwner: boolean;
  writesAllowed: boolean;
  demoAiRateLimit: {
    limit: number;
    windowMs: number;
  };
};

export type DemoFeature =
  | "audio-transcription"
  | "transcript-translation"
  | "voice-generation"
  | "piper-tts"
  | "video-dubbing"
  | "video-metadata"
  | "video-mirror"
  | "video-edit";

export type RateLimitResult =
  | {
      ok: true;
      limit: number;
      remaining: number;
      resetAt: number;
    }
  | {
      ok: false;
      limit: number;
      remaining: 0;
      resetAt: number;
    };

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const DEFAULT_DEMO_RATE_LIMIT = 5;
const DEFAULT_DEMO_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const rateLimitBuckets = new Map<string, RateLimitBucket>();

export function getAppMode(): AppMode {
  return process.env.OMNIVIDEO_APP_MODE === "public-demo"
    ? "public-demo"
    : "owner";
}

export function getOwnerToken() {
  return process.env.OMNIVIDEO_OWNER_TOKEN?.trim() || undefined;
}

export function getDemoRateLimitConfig() {
  const parsedLimit = Number(process.env.OMNIVIDEO_DEMO_AI_RATE_LIMIT ?? "");
  const parsedWindowSeconds = Number(
    process.env.OMNIVIDEO_DEMO_AI_RATE_LIMIT_WINDOW_SECONDS ?? "",
  );

  return {
    limit:
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.floor(parsedLimit)
        : DEFAULT_DEMO_RATE_LIMIT,
    windowMs:
      Number.isFinite(parsedWindowSeconds) && parsedWindowSeconds > 0
        ? Math.floor(parsedWindowSeconds * 1000)
        : DEFAULT_DEMO_RATE_LIMIT_WINDOW_MS,
  };
}

function parseCookies(cookieHeader: string | null) {
  const cookies = new Map<string, string>();

  if (!cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (!rawName) continue;
    cookies.set(rawName, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}

export function isOwnerRequest(request: Request): boolean {
  const mode = getAppMode();

  if (mode === "owner") {
    return true;
  }

  const ownerToken = getOwnerToken();
  if (!ownerToken) {
    return false;
  }

  const headerToken = request.headers.get("x-omnivideo-owner-token")?.trim();
  if (headerToken && headerToken === ownerToken) {
    return true;
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  return cookies.get(OWNER_TOKEN_COOKIE) === ownerToken;
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  );
}

export function getAppAccessState(request: Request): AppAccessState {
  const mode = getAppMode();
  const isOwner = isOwnerRequest(request);
  const demoAiRateLimit = getDemoRateLimitConfig();

  return {
    mode,
    isPublicDemo: mode === "public-demo",
    isOwner,
    writesAllowed: mode !== "public-demo" || isOwner,
    demoAiRateLimit,
  };
}

export function checkDemoRateLimit({
  request,
  feature,
  now = Date.now(),
}: {
  request: Request;
  feature: DemoFeature;
  now?: number;
}): RateLimitResult {
  const { limit, windowMs } = getDemoRateLimitConfig();
  const clientIp = getClientIp(request);
  const key = `${feature}:${clientIp}`;
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    rateLimitBuckets.set(key, { count: 1, resetAt });
    return {
      ok: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt,
    };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: existing.resetAt,
  };
}

export function resetDemoRateLimitForTests() {
  rateLimitBuckets.clear();
}
