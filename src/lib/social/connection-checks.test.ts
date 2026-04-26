import { ObjectId } from "mongodb";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SocialAccountDocument } from "./types";
import { checkSocialAccountConnections } from "./connection-checks";

afterEach(() => {
  vi.restoreAllMocks();
});

function buildAccount(overrides: Partial<SocialAccountDocument>) {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    _id: new ObjectId(),
    platform: overrides.platform ?? "tiktok",
    label: overrides.label ?? "TikTok main",
    displayName: overrides.displayName ?? null,
    handle: overrides.handle ?? null,
    accountId: overrides.accountId ?? null,
    status: overrides.status ?? "needs_auth",
    authMode: overrides.authMode ?? "manual",
    channelTags: overrides.channelTags ?? [],
    permissionScopes: overrides.permissionScopes ?? [],
    supportedFormats: overrides.supportedFormats ?? ["tiktok_video"],
    secrets: overrides.secrets ?? {},
    lastHealthCheckAt: overrides.lastHealthCheckAt ?? null,
    lastError: overrides.lastError ?? null,
    usage: overrides.usage ?? {
      publishRecordCountApprox: 0,
      lastPlannedAt: null,
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe("checkSocialAccountConnections", () => {
  it("returns down for accounts that have not completed OAuth", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        authMode: "manual",
        secrets: {},
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("AUTH_SOCIAL_NOT_CONNECTED");
  });

  it("returns down for credential-based account without secrets", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        authMode: "oauth",
        status: "connected",
        secrets: {},
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("AUTH_SOCIAL_SECRET_MISSING");
  });

  it("checks a connected TikTok account via creator_info/query", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: {
            creator_username: "omni_creator",
          },
          error: {
            code: "ok",
            message: "",
          },
        }),
        { status: 200 },
      ),
    );

    const checks = await checkSocialAccountConnections([
      buildAccount({
        platform: "tiktok",
        authMode: "oauth",
        status: "connected",
        supportedFormats: ["tiktok_video"],
        permissionScopes: ["video.publish", "video.upload"],
        secrets: {
          accessToken: "token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("@omni_creator");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("checks a connected YouTube account against the channel endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          scope: "https://www.googleapis.com/auth/youtube.upload",
          expires_in: 3000,
        }),
        {
        status: 200,
        },
      ),
    );

    const checks = await checkSocialAccountConnections([
      buildAccount({
        platform: "youtube",
        authMode: "oauth",
        status: "connected",
        supportedFormats: ["youtube_short", "youtube_video"],
        secrets: {
          accessToken: "token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("youtube.upload scope");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=token",
      { cache: "no-store" },
    );
  });

  it("returns down when connected YouTube token is missing upload scope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          scope: "https://www.googleapis.com/auth/youtube.readonly",
        }),
        { status: 200 },
      ),
    );

    const checks = await checkSocialAccountConnections([
      buildAccount({
        platform: "youtube",
        authMode: "oauth",
        status: "connected",
        supportedFormats: ["youtube_short", "youtube_video"],
        secrets: {
          accessToken: "token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("AUTH_YOUTUBE_SCOPE_MISSING");
  });

  it("returns skipped for connected platforms without a concrete checker yet", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        platform: "facebook",
        authMode: "oauth",
        status: "connected",
        supportedFormats: ["facebook_reel"],
        secrets: {
          accessToken: "token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("skipped");
    expect(checks[0].message).toContain("deferred");
  });
});
