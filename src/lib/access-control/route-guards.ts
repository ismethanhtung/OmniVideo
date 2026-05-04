import { NextResponse } from "next/server";

import {
  checkDemoRateLimit,
  getAppAccessState,
  type DemoFeature,
} from "./access-control";

export function requireWriteAccess(request: Request): NextResponse | null {
  const access = getAppAccessState(request);

  if (access.writesAllowed) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      errorCode: "DEMO_WRITE_DISABLED",
      error: "This public demo is read-only for data-changing actions.",
    },
    { status: 403 },
  );
}

export function requireOwnerForProviderAccount(
  request: Request,
  providerId?: string,
): NextResponse | null {
  if (!providerId?.trim()) {
    return null;
  }

  const access = getAppAccessState(request);
  if (!access.isPublicDemo || access.isOwner) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      errorCode: "DEMO_PROVIDER_ACCOUNT_DISABLED",
      error: "Public demo requests cannot use saved provider accounts.",
    },
    { status: 403 },
  );
}

export function applyDemoRateLimit(
  request: Request,
  feature: DemoFeature,
): NextResponse | null {
  const access = getAppAccessState(request);

  if (!access.isPublicDemo || access.isOwner) {
    return null;
  }

  const result = checkDemoRateLimit({ request, feature });
  if (result.ok) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      errorCode: "DEMO_RATE_LIMITED",
      error: "Public demo rate limit exceeded. Try again later.",
      rateLimit: {
        limit: result.limit,
        remaining: result.remaining,
        resetAt: new Date(result.resetAt).toISOString(),
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(
          Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1),
        ),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
