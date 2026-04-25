import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import type { SocialAccountDocument } from "./types";
import { checkSocialAccountConnections } from "./connection-checks";

function buildAccount(overrides: Partial<SocialAccountDocument>) {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    _id: new ObjectId(),
    platform: overrides.platform ?? "tiktok",
    label: overrides.label ?? "TikTok main",
    displayName: overrides.displayName ?? null,
    handle: overrides.handle ?? null,
    accountId: overrides.accountId ?? null,
    status: overrides.status ?? "active",
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
  it("skips manual social accounts because real publish is deferred", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        authMode: "manual",
        secrets: {},
      }),
    ]);

    expect(checks[0].status).toBe("skipped");
    expect(checks[0].message).toContain("tracked manually");
  });

  it("returns down for credential-based account without secrets", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        authMode: "oauth",
        secrets: {},
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("AUTH_SOCIAL_SECRET_MISSING");
  });

  it("returns ok when credential metadata exists", async () => {
    const checks = await checkSocialAccountConnections([
      buildAccount({
        authMode: "access_token",
        secrets: {
          accessToken: "token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("Real API health check is deferred");
  });
});
