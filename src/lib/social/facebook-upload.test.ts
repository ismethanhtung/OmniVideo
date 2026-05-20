import { ObjectId } from "mongodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import type { PublishRecordDocument, SocialAccountDocument } from "./types";
import { uploadVideoToFacebook } from "./facebook-upload";

vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));

const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);

function makeAccount(
  secrets: SocialAccountDocument["secrets"] = {
    accessToken: "user-token",
    pageId: "page-1",
  },
): SocialAccountDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    platform: "facebook",
    label: "Facebook",
    displayName: "Facebook Page",
    handle: null,
    accountId: "page-1",
    status: "connected",
    authMode: "oauth",
    channelTags: [],
    permissionScopes: [
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
    ],
    supportedFormats: ["facebook_video", "facebook_reel"],
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

function makeRecord(
  publishType: PublishRecordDocument["publishType"] = "facebook_video",
): PublishRecordDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    assetId: new ObjectId("507f1f77bcf86cd799439011"),
    socialAccountId: new ObjectId("507f1f77bcf86cd799439012"),
    platform: "facebook",
    publishType,
    thumbnailAssetId: null,
    facebookPageId: "page-1",
    publishMode: "publish_now",
    privacyStatus: "private",
    status: "queued",
    title: "Demo upload",
    caption: "Demo caption",
    hashtags: ["demo"],
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

describe("facebook upload", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedResolveAssetDownload.mockReset();
  });

  it("uploads a Facebook Page video with page access token resolution", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "page-1",
              name: "Omni Page",
              access_token: "page-token",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: "fb-video-1",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToFacebook({
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

    expect(result.status).toBe("published");
    expect(result.videoId).toBe("fb-video-1");
    expect(result.platformPostId).toBe("https://www.facebook.com/page-1/videos/fb-video-1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://graph.facebook.com/v20.0/me/accounts?fields=id%2Cname%2Caccess_token&access_token=user-token",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://graph-video.facebook.com/v20.0/page-1/videos",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("publishes a Facebook Reel through start, upload, and finish phases", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          video_id: "reel-1",
          upload_url: "https://rupload.facebook.com/video-upload/reel-1",
        }),
      )
      .mockResolvedValueOnce(Response.json({ success: true }))
      .mockResolvedValueOnce(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const result = await uploadVideoToFacebook({
      db: {} as never,
      asset: {
        _id: new ObjectId("507f1f77bcf86cd799439011"),
        storageProvider: "drive",
      },
      account: makeAccount({
        pageId: "page-1",
        pageAccessToken: "page-token",
      }),
      record: makeRecord("facebook_reel"),
    });

    expect(result.status).toBe("published");
    expect(result.platformPostId).toBe("https://www.facebook.com/reel/reel-1");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://rupload.facebook.com/video-upload/reel-1",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "OAuth page-token",
          file_offset: "0",
        }),
      }),
    );
  });

  it("fails before download when multiple Pages exist and pageId is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "page-1",
              name: "Page 1",
              access_token: "page-token-1",
            },
            {
              id: "page-2",
              name: "Page 2",
              access_token: "page-token-2",
            },
          ],
        }),
      ),
    );

    await expect(
      uploadVideoToFacebook({
        db: {} as never,
        asset: {
          _id: new ObjectId("507f1f77bcf86cd799439011"),
          storageProvider: "drive",
        },
        account: {
          ...makeAccount({ accessToken: "token" }),
          accountId: null,
          secrets: {
            accessToken: "token",
          },
        },
        record: {
          ...makeRecord(),
          facebookPageId: "",
        },
      }),
    ).rejects.toThrow("AUTH_FACEBOOK_PAGE_ID_REQUIRED");
    expect(mockedResolveAssetDownload).not.toHaveBeenCalled();
  });

  it("surfaces provider errors from video upload", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        Response.json({
          data: [
            {
              id: "page-1",
              name: "Omni Page",
              access_token: "page-token",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json(
          {
            error: {
              message: "Missing permission",
              type: "OAuthException",
              code: 200,
            },
          },
          { status: 403 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["video-bytes"], { type: "video/mp4" }).stream(),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    await expect(
      uploadVideoToFacebook({
        db: {} as never,
        asset: {
          _id: new ObjectId("507f1f77bcf86cd799439011"),
          storageProvider: "drive",
        },
        account: makeAccount(),
        record: makeRecord(),
      }),
    ).rejects.toThrow("PRV_FACEBOOK_VIDEO_UPLOAD_FAILED");
  });
});
