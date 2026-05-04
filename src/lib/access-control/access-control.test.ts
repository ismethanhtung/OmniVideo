import { afterEach, describe, expect, it, vi } from "vitest";

import {
  OWNER_TOKEN_COOKIE,
  checkDemoRateLimit,
  getAppAccessState,
  isViewModeAccessError,
  isOwnerRequest,
  resetDemoRateLimitForTests,
} from "./access-control";

function request(headers?: HeadersInit) {
  return new Request("http://localhost/api/test", { headers });
}

describe("access control", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetDemoRateLimitForTests();
  });

  it("defaults to owner mode and allows writes", () => {
    const state = getAppAccessState(request());

    expect(state.mode).toBe("owner");
    expect(state.isOwner).toBe(true);
    expect(state.writesAllowed).toBe(true);
  });

  it("detects owner token from header or cookie in public demo mode", () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");
    vi.stubEnv("OMNIVIDEO_OWNER_TOKEN", "secret");

    expect(
      isOwnerRequest(request({ "x-omnivideo-owner-token": "secret" })),
    ).toBe(true);
    expect(
      isOwnerRequest(
        request({ cookie: `${OWNER_TOKEN_COOKIE}=${encodeURIComponent("secret")}` }),
      ),
    ).toBe(true);
    expect(isOwnerRequest(request({ "x-omnivideo-owner-token": "bad" }))).toBe(
      false,
    );
  });

  it("rate limits public demo feature calls by client ip", () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");
    vi.stubEnv("OMNIVIDEO_DEMO_AI_RATE_LIMIT", "2");
    vi.stubEnv("OMNIVIDEO_DEMO_AI_RATE_LIMIT_WINDOW_SECONDS", "60");

    const demoRequest = request({ "x-forwarded-for": "203.0.113.1" });

    expect(
      checkDemoRateLimit({ request: demoRequest, feature: "voice-generation" })
        .ok,
    ).toBe(true);
    expect(
      checkDemoRateLimit({ request: demoRequest, feature: "voice-generation" })
        .ok,
    ).toBe(true);
    expect(
      checkDemoRateLimit({ request: demoRequest, feature: "voice-generation" })
        .ok,
    ).toBe(false);
  });

  it("detects View Mode access errors by code or message", () => {
    expect(isViewModeAccessError({ errorCode: "DEMO_WRITE_DISABLED" })).toBe(
      true,
    );
    expect(
      isViewModeAccessError({
        error: "Some features are disabled in View Mode.",
      }),
    ).toBe(true);
    expect(isViewModeAccessError({ errorCode: "SYS_OTHER" })).toBe(false);
  });
});
