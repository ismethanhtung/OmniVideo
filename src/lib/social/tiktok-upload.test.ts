import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import type { PublishRecordDocument, SocialAccountDocument } from "./types";
import { uploadVideoToTikTok } from "./tiktok-upload";

vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));

const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);

function makeAccount(
  secrets: SocialAccountDocument["secrets"] = { accessToken: "tiktok-token" },
): SocialAccountDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    platform: "tiktok",
    label: "TikTok",
    displayName: "TikTok",
    handle: null,
    accountId: "open-id-1",
    status: "connected",
    authMode: "oauth",
    channelTags: [],
    permissionScopes: ["video.upload", "video.publish"],
    supportedFormats: ["tiktok_video"],
    secrets,
    lastHealthCheckAt: null,
    lastError: null,
    usage: {
      publishRecordCountApprox: 0,
      lastPlannedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

function makeRecord(): PublishRecordDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    assetId: new ObjectId("507f1f77bcf86cd799439011"),
    socialAccountId: new ObjectId("507f1f77bcf86cd799439012"),
    platform: "tiktok",
    publishType: "tiktok_video",
    publishMode: "publish_now",
    privacyStatus: "private",
    status: "queued",
    title: "Demo title",
    caption: "Demo caption #test",
    hashtags: ["test"],
    scheduledAt: now,
    publishedAt: null,
    platformPostId: null,
    retryCount: 0,
    errorCode: null,
    errorDetail: null,
    createdAt: now,
    updatedAt: now,
  };
}

describe("tiktok upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockedResolveAssetDownload.mockReset();
  });

  it("publishes video and returns public post URL when status is complete", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            creator_username: "omni",
            privacy_level_options: ["SELF_ONLY", "PUBLIC_TO_EVERYONE"],
            comment_disabled: false,
            duet_disabled: false,
            stitch_disabled: false,
            max_video_post_duration_sec: 600,
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            publish_id: "pub-1",
            upload_url: "https://open-upload.tiktokapis.com/upload/1",
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          data: {
            status: "PUBLISH_COMPLETE",
            publicaly_available_post_id: ["1234567890123"],
          },
          error: { code: "ok", message: "" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToTikTok({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        durationMs: 55_000,
        metadata: { title: "Asset title" },
      },
      account: makeAccount(),
      record: makeRecord(),
    });

    expect(result.status).toBe("published");
    expect(result.publishId).toBe("pub-1");
    expect(result.platformPostId).toBe("https://www.tiktok.com/@omni/video/1234567890123");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns queued when TikTok is still processing", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            creator_username: "omni",
            privacy_level_options: ["SELF_ONLY"],
            max_video_post_duration_sec: 600,
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            publish_id: "pub-2",
            upload_url: "https://open-upload.tiktokapis.com/upload/2",
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          data: { status: "PROCESSING_UPLOAD" },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { status: "PROCESSING_UPLOAD" },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: { status: "PROCESSING_UPLOAD" },
          error: { code: "ok", message: "" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToTikTok({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        durationMs: 55_000,
      },
      account: makeAccount(),
      record: makeRecord(),
    });

    expect(result.status).toBe("queued");
    expect(result.publishId).toBe("pub-2");
    expect(result.platformPostId).toBeNull();
  });

  it("throws publish failed error when TikTok returns FAILED status", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            creator_username: "omni",
            privacy_level_options: ["SELF_ONLY"],
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            publish_id: "pub-3",
            upload_url: "https://open-upload.tiktokapis.com/upload/3",
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          data: {
            status: "FAILED",
            fail_reason: "spam_risk",
          },
          error: { code: "ok", message: "" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    await expect(
      uploadVideoToTikTok({
        db: {} as never,
        asset: {
          _id: new ObjectId("507f1f77bcf86cd799439011"),
          storageProvider: "drive",
          durationMs: 55_000,
        },
        account: makeAccount(),
        record: makeRecord(),
      }),
    ).rejects.toThrow("PRV_TIKTOK_PUBLISH_FAILED");
  });

  it("refreshes TikTok access token when refresh token and client credentials exist", async () => {
    vi.stubEnv("TIKTOK_CLIENT_KEY", "client-key");
    vi.stubEnv("TIKTOK_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "fresh-token",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            creator_username: "omni",
            privacy_level_options: ["SELF_ONLY"],
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            publish_id: "pub-4",
            upload_url: "https://open-upload.tiktokapis.com/upload/4",
          },
          error: { code: "ok", message: "" },
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        Response.json({
          data: {
            status: "PUBLISH_COMPLETE",
          },
          error: { code: "ok", message: "" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    await uploadVideoToTikTok({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        durationMs: 55_000,
      },
      account: makeAccount({ refreshToken: "refresh-token" }),
      record: makeRecord(),
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://open.tiktokapis.com/v2/oauth/token/",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });
});
