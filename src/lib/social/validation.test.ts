import { describe, expect, it } from "vitest";

import { SOCIAL_PLATFORM_CAPABILITIES, getPlatformForPublishType } from "./capabilities";
import { sanitizeSocialAccountDocument } from "./sanitize";
import { isPublishRecordRetryable, validatePublishRecordCreateInput, validateSocialAccountCreateInput, validateSocialAccountUpdateInput } from "./validation";

describe("social validation", () => {
  it("accepts a supported social account and defaults compatible formats", () => {
    const result = validateSocialAccountCreateInput({
      platform: "youtube",
      label: "Main YouTube",
      displayName: "Omni Channel",
      channelTags: ["shorts", "primary"],
      permissionScopes: ["youtube.upload"],
      secrets: {
        accessToken: "youtube-token",
      },
    });

    expect(result.platform).toBe("youtube");
    expect(result.supportedFormats).toEqual(["youtube_short", "youtube_video"]);
    expect(result.channelTags).toEqual(["shorts", "primary"]);
    expect(result.secrets.accessToken).toBe("youtube-token");
  });

  it("rejects unsupported platform", () => {
    expect(() =>
      validateSocialAccountCreateInput({
        platform: "instagram",
        label: "IG",
      }),
    ).toThrow("platform must be facebook, tiktok, shopee, or youtube");
  });

  it("filters supported formats to the selected platform", () => {
    const result = validateSocialAccountCreateInput({
      platform: "facebook",
      label: "Facebook Page",
      supportedFormats: ["facebook_reel", "youtube_video"],
    });

    expect(result.supportedFormats).toEqual(["facebook_reel"]);
  });

  it("does not expose raw social account secrets when sanitized", () => {
    const now = new Date("2026-04-26T00:00:00.000Z");
    const result = sanitizeSocialAccountDocument({
      _id: {
        toHexString: () => "507f1f77bcf86cd799439099",
      } as never,
      platform: "tiktok",
      label: "TikTok main",
      displayName: null,
      handle: "@omni",
      accountId: null,
      status: "connected",
      authMode: "access_token",
      channelTags: [],
      permissionScopes: [],
      supportedFormats: ["tiktok_video"],
      secrets: {
        accessToken: "super-secret-token",
      },
      lastHealthCheckAt: null,
      lastError: null,
      usage: {
        publishRecordCountApprox: 0,
        lastPlannedAt: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    expect("secrets" in result).toBe(false);
    expect(result.secretSummary.accessToken).toEqual({
      configured: true,
      preview: "sup...ken",
    });
  });

  it("requires platform when updating supported formats", () => {
    expect(() =>
      validateSocialAccountUpdateInput({
        supportedFormats: ["youtube_short"],
      }),
    ).toThrow("platform is required when updating supportedFormats");
  });

  it("validates publish record input and schedule", () => {
    const result = validatePublishRecordCreateInput({
      assetId: "507f1f77bcf86cd799439011",
      socialAccountId: "507f1f77bcf86cd799439012",
      publishType: "tiktok_video",
      title: "Demo",
      hashtags: ["one", "two"],
      scheduledAt: "2026-04-26T12:00:00.000Z",
    });

    expect(result.publishType).toBe("tiktok_video");
    expect(result.publishMode).toBe("schedule");
    expect(result.scheduledAt?.toISOString()).toBe("2026-04-26T12:00:00.000Z");
  });

  it("requires facebookPageId for facebook publish types", () => {
    expect(() =>
      validatePublishRecordCreateInput({
        assetId: "507f1f77bcf86cd799439011",
        socialAccountId: "507f1f77bcf86cd799439012",
        publishType: "facebook_reel",
        publishNow: true,
      }),
    ).toThrow("facebookPageId is required for Facebook publish types");
  });

  it("marks publish-now records with immediate schedule intent", () => {
    const result = validatePublishRecordCreateInput({
      assetId: "507f1f77bcf86cd799439011",
      socialAccountId: "507f1f77bcf86cd799439012",
      publishType: "youtube_short",
      publishNow: true,
    });

    expect(result.publishMode).toBe("publish_now");
    expect(result.privacyStatus).toBe("private");
    expect(result.scheduledAt).toBeInstanceOf(Date);
  });

  it("accepts publish record privacy status", () => {
    const result = validatePublishRecordCreateInput({
      assetId: "507f1f77bcf86cd799439011",
      socialAccountId: "507f1f77bcf86cd799439012",
      publishType: "youtube_video",
      publishNow: true,
      privacyStatus: "unlisted",
    });

    expect(result.privacyStatus).toBe("unlisted");
  });

  it("rejects invalid publish record asset id", () => {
    expect(() =>
      validatePublishRecordCreateInput({
        assetId: "bad",
        socialAccountId: "507f1f77bcf86cd799439012",
        publishType: "tiktok_video",
      }),
    ).toThrow("assetId must be a valid Mongo ObjectId");
  });

  it("maps every capability publish type to a platform", () => {
    for (const capability of SOCIAL_PLATFORM_CAPABILITIES) {
      for (const format of capability.formats) {
        expect(getPlatformForPublishType(format.publishType)).toBe(
          capability.platform,
        );
      }
    }
  });

  it("keeps auth and validation failures non-retryable", () => {
    expect(
      isPublishRecordRetryable({
        status: "failed",
        errorCode: "AUTH_TOKEN_EXPIRED",
        retryCount: 0,
      }),
    ).toBe(false);
    expect(
      isPublishRecordRetryable({
        status: "failed",
        errorCode: "NET_TIMEOUT",
        retryCount: 2,
      }),
    ).toBe(true);
    expect(
      isPublishRecordRetryable({
        status: "failed",
        errorCode: "NET_TIMEOUT",
        retryCount: 3,
      }),
    ).toBe(false);
  });
});
