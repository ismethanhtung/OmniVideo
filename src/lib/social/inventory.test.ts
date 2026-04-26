import { describe, expect, it, vi, afterEach } from "vitest";

import { fetchYouTubeChannelInventory } from "./inventory";
import type { SocialAccountDocument } from "./types";

const youtubeAccount: SocialAccountDocument = {
  platform: "youtube",
  label: "Main YouTube",
  displayName: "Main Channel",
  handle: "@main",
  accountId: "channel-1",
  status: "connected",
  authMode: "oauth",
  channelTags: [],
  permissionScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
  supportedFormats: ["youtube_video", "youtube_short"],
  secrets: { accessToken: "token" },
  lastHealthCheckAt: null,
  lastError: null,
  usage: {
    publishRecordCountApprox: 0,
    lastPlannedAt: null,
  },
  createdAt: new Date("2026-04-26T00:00:00.000Z"),
  updatedAt: new Date("2026-04-26T00:00:00.000Z"),
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("social published content inventory", () => {
  it("fetches YouTube uploads from the channel uploads playlist", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              contentDetails: {
                relatedPlaylists: { uploads: "uploads-playlist" },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              snippet: {
                title: "Short demo",
                description: "#Shorts",
                publishedAt: "2026-04-25T10:00:00.000Z",
                thumbnails: { medium: { url: "https://img.example/1.jpg" } },
              },
              contentDetails: {
                videoId: "video-1",
                videoPublishedAt: "2026-04-25T10:00:00.000Z",
              },
            },
          ],
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const inventory = await fetchYouTubeChannelInventory({
      account: youtubeAccount,
    });

    expect(inventory.status).toBe("ok");
    expect(inventory.videos).toHaveLength(1);
    expect(inventory.videos[0]).toMatchObject({
      platformPostId: "video-1",
      inferredType: "youtube_short",
      url: "https://www.youtube.com/watch?v=video-1",
    });
    expect(fetchMock.mock.calls[1]?.[0].toString()).toContain(
      "playlistId=uploads-playlist",
    );
  });

  it("returns failed status instead of throwing when YouTube inventory cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          { error: { message: "Request had insufficient authentication scopes." } },
          { status: 403 },
        ),
      ),
    );

    const inventory = await fetchYouTubeChannelInventory({
      account: youtubeAccount,
    });

    expect(inventory.status).toBe("failed");
    expect(inventory.message).toContain("insufficient authentication scopes");
    expect(inventory.videos).toEqual([]);
  });
});
