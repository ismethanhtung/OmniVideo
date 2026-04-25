import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import type { PublishRecordDocument, SocialAccountDocument } from "./types";
import { uploadVideoToYouTube } from "./youtube-upload";

vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));

const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);

function makeAccount(
  secrets: SocialAccountDocument["secrets"] = { accessToken: "youtube-token" },
): SocialAccountDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    platform: "youtube",
    label: "YT",
    displayName: "YouTube",
    handle: null,
    accountId: "channel-1",
    status: "connected",
    authMode: "oauth",
    channelTags: [],
    permissionScopes: ["https://www.googleapis.com/auth/youtube.upload"],
    supportedFormats: ["youtube_video", "youtube_short"],
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
    platform: "youtube",
    publishType: "youtube_video",
    publishMode: "publish_now",
    privacyStatus: "private",
    status: "queued",
    title: "Demo upload",
    caption: "Demo caption",
    hashtags: ["demo", "shorts"],
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

describe("youtube upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockedResolveAssetDownload.mockReset();
  });

  it("uploads a video with YouTube resumable upload", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            location: "https://upload.youtube.test/session-1",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "yt-video-1",
          snippet: { title: "Demo upload" },
          status: { privacyStatus: "private" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToYouTube({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        mimeType: "video/mp4",
        metadata: { title: "Asset title" },
      },
      account: makeAccount(),
      record: makeRecord(),
    });

    expect(result).toEqual({
      platformPostId: "yt-video-1",
      title: "Demo upload",
      privacyStatus: "private",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer youtube-token",
          "x-upload-content-type": "video/mp4",
        }),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({
      status: {
        privacyStatus: "private",
      },
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "https://upload.youtube.test/session-1",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "content-type": "video/mp4",
        }),
      }),
    );
  });

  it("uses requested privacy and adds Shorts metadata hint for eligible Shorts", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            location: "https://upload.youtube.test/session-short",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "yt-short-1",
          snippet: { title: "Demo upload" },
          status: { privacyStatus: "public" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToYouTube({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        durationMs: 45_000,
        mimeType: "video/mp4",
        metadata: {
          width: 1080,
          height: 1920,
        },
      },
      account: makeAccount(),
      record: {
        ...makeRecord(),
        publishType: "youtube_short",
        privacyStatus: "public",
        caption: "Short caption",
      },
    });
    const metadata = JSON.parse(fetchMock.mock.calls[0][1].body as string);

    expect(result.privacyStatus).toBe("public");
    expect(metadata.status.privacyStatus).toBe("public");
    expect(metadata.snippet.description).toContain("#Shorts");
  });

  it("rejects YouTube Shorts upload when the video is horizontal", async () => {
    await expect(
      uploadVideoToYouTube({
        db: {} as never,
        asset: {
          _id: new ObjectId("507f1f77bcf86cd799439011"),
          storageProvider: "drive",
          durationMs: 60_000,
          metadata: {
            width: 1920,
            height: 1080,
          },
        },
        account: makeAccount(),
        record: {
          ...makeRecord(),
          publishType: "youtube_short",
        },
      }),
    ).rejects.toThrow("VAL_YOUTUBE_SHORT_ASPECT_RATIO_INVALID");
    expect(mockedResolveAssetDownload).not.toHaveBeenCalled();
  });

  it("fails before download when the account has no access token", async () => {
    await expect(
      uploadVideoToYouTube({
        db: {} as never,
        asset: {
          _id: new ObjectId("507f1f77bcf86cd799439011"),
          storageProvider: "drive",
        },
        account: makeAccount({}),
        record: makeRecord(),
      }),
    ).rejects.toThrow("AUTH_YOUTUBE_ACCESS_TOKEN_MISSING");
    expect(mockedResolveAssetDownload).not.toHaveBeenCalled();
  });

  it("refreshes the OAuth access token before upload when refresh credentials exist", async () => {
    vi.stubEnv("YOUTUBE_CLIENT_ID", "client-id");
    vi.stubEnv("YOUTUBE_CLIENT_SECRET", "client-secret");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "fresh-token",
        }),
      )
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            location: "https://upload.youtube.test/session-2",
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "yt-video-2",
          snippet: { title: "Demo upload" },
          status: { privacyStatus: "private" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToYouTube({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
        mimeType: "video/mp4",
      },
      account: makeAccount({
        accessToken: "old-token",
        refreshToken: "refresh-token",
      }),
      record: makeRecord(),
    });

    expect(result.platformPostId).toBe("yt-video-2");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://oauth2.googleapis.com/token",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer fresh-token",
        }),
      }),
    );
  });
});
