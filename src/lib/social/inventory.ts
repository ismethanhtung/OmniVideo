import type { Db, WithId } from "mongodb";

import type {
  PublishRecordDocument,
  SocialAccountDocument,
  SocialPlatform,
  SocialPublishType,
} from "./types";

const SOCIAL_ACCOUNTS_COLLECTION = "social_accounts";
const PUBLISH_RECORDS_COLLECTION = "publish_records";

type AssetSnapshot = {
  title?: string | null;
  storageProvider?: string | null;
  providerAssetId?: string | null;
};

export type SocialInventoryPublishRecord = {
  _id: string;
  assetId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  publishType: SocialPublishType;
  status: PublishRecordDocument["status"];
  title: string | null;
  platformPostId: string | null;
  privacyStatus: PublishRecordDocument["privacyStatus"];
  publishedAt: Date | null;
  scheduledAt: Date | null;
  createdAt: Date;
  asset: AssetSnapshot;
};

export type YouTubeRemoteVideo = {
  platformPostId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  url: string;
  inferredType: "youtube_short" | "youtube_video" | "unknown";
};

export type YouTubeInventoryStatus = {
  status: "ok" | "skipped" | "failed";
  message: string;
  fetchedAt: string;
  videos: YouTubeRemoteVideo[];
};

export type SocialAccountInventory = {
  accountId: string;
  platform: SocialPlatform;
  label: string;
  displayName: string | null;
  handle: string | null;
  status: SocialAccountDocument["status"];
  localRecords: SocialInventoryPublishRecord[];
  youtubeRemote: YouTubeInventoryStatus | null;
};

export type AssetPublishingInventory = {
  assetId: string;
  title: string | null;
  storageProvider: string | null;
  providerAssetId: string | null;
  platforms: Array<{
    platform: SocialPlatform;
    accountId: string;
    accountLabel: string;
    publishType: SocialPublishType;
    status: PublishRecordDocument["status"];
    platformPostId: string | null;
    publishedAt: Date | null;
  }>;
};

type YouTubeTokenRefreshResult = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type YouTubeChannelPayload = {
  items?: Array<{
    snippet?: { title?: string; customUrl?: string };
    contentDetails?: {
      relatedPlaylists?: {
        uploads?: string;
      };
    };
  }>;
  error?: { message?: string };
};

type YouTubePlaylistItemsPayload = {
  items?: Array<{
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      thumbnails?: {
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      videoId?: string;
      videoPublishedAt?: string;
    };
  }>;
  error?: { message?: string };
};

async function resolveYouTubeInventoryAccessToken(account: SocialAccountDocument) {
  const accessToken = account.secrets.accessToken?.trim();
  const refreshToken = account.secrets.refreshToken?.trim();
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();

  if (refreshToken && clientId && clientSecret) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | YouTubeTokenRefreshResult
      | null;

    if (!response.ok || !payload?.access_token) {
      throw new Error(
        payload?.error_description ??
          payload?.error ??
          `AUTH_YOUTUBE_REFRESH_FAILED: status ${response.status}`,
      );
    }

    return payload.access_token;
  }

  if (!accessToken) {
    throw new Error("AUTH_YOUTUBE_ACCESS_TOKEN_MISSING");
  }

  return accessToken;
}

async function readYouTubeJson<T>(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as T | null;

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload === "object" && "error" in payload
        ? (payload as { error?: { message?: string } }).error?.message
        : null;
    throw new Error(errorMessage ?? fallback);
  }

  return payload;
}

function inferYouTubePublishType(
  title: string,
  description: string,
): YouTubeRemoteVideo["inferredType"] {
  return /(^|\s)#shorts(\s|$)/i.test(`${title} ${description}`)
    ? "youtube_short"
    : "unknown";
}

export async function fetchYouTubeChannelInventory({
  account,
  maxResults = 25,
}: {
  account: SocialAccountDocument;
  maxResults?: number;
}): Promise<YouTubeInventoryStatus> {
  const fetchedAt = new Date().toISOString();

  if (account.platform !== "youtube" || account.status !== "connected") {
    return {
      status: "skipped",
      message: "YouTube inventory only runs for connected YouTube accounts.",
      fetchedAt,
      videos: [],
    };
  }

  try {
    const accessToken = await resolveYouTubeInventoryAccessToken(account);
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "snippet,contentDetails");
    channelUrl.searchParams.set("mine", "true");

    const channelResponse = await fetch(channelUrl.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const channelPayload = await readYouTubeJson<YouTubeChannelPayload>(
      channelResponse,
      `PRV_YOUTUBE_INVENTORY_FAILED: channel request failed with status ${channelResponse.status}.`,
    );
    const uploadsPlaylistId =
      channelPayload?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      throw new Error("PRV_YOUTUBE_UPLOADS_PLAYLIST_MISSING");
    }

    const playlistUrl = new URL(
      "https://www.googleapis.com/youtube/v3/playlistItems",
    );
    playlistUrl.searchParams.set("part", "snippet,contentDetails");
    playlistUrl.searchParams.set("playlistId", uploadsPlaylistId);
    playlistUrl.searchParams.set("maxResults", String(Math.min(50, maxResults)));

    const playlistResponse = await fetch(playlistUrl.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const playlistPayload = await readYouTubeJson<YouTubePlaylistItemsPayload>(
      playlistResponse,
      `PRV_YOUTUBE_INVENTORY_FAILED: playlist request failed with status ${playlistResponse.status}.`,
    );
    const videos =
      playlistPayload?.items?.flatMap((item) => {
        const videoId = item.contentDetails?.videoId;

        if (!videoId) {
          return [];
        }

        const title = item.snippet?.title ?? "Untitled YouTube video";
        const description = item.snippet?.description ?? "";

        return [
          {
            platformPostId: videoId,
            title,
            description,
            publishedAt:
              item.contentDetails?.videoPublishedAt ??
              item.snippet?.publishedAt ??
              null,
            thumbnailUrl:
              item.snippet?.thumbnails?.medium?.url ??
              item.snippet?.thumbnails?.default?.url ??
              null,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            inferredType: inferYouTubePublishType(title, description),
          },
        ];
      }) ?? [];

    return {
      status: "ok",
      message: `Fetched ${videos.length} YouTube uploads from channel.`,
      fetchedAt,
      videos,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "PRV_YOUTUBE_INVENTORY_FAILED";

    return {
      status: "failed",
      message,
      fetchedAt,
      videos: [],
    };
  }
}

function serializeRecord(record: WithId<PublishRecordDocument> & { asset?: AssetSnapshot }) {
  return {
    _id: record._id.toHexString(),
    assetId: record.assetId.toHexString(),
    socialAccountId: record.socialAccountId.toHexString(),
    platform: record.platform,
    publishType: record.publishType,
    status: record.status,
    title: record.title,
    platformPostId: record.platformPostId,
    privacyStatus: record.privacyStatus,
    publishedAt: record.publishedAt,
    scheduledAt: record.scheduledAt,
    createdAt: record.createdAt,
    asset: record.asset ?? {},
  };
}

export async function listSocialPublishedContentInventory(db: Db) {
  const [accounts, records] = await Promise.all([
    db
      .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
      .find({})
      .sort({ platform: 1, label: 1 })
      .toArray(),
    db
      .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
      .aggregate<WithId<PublishRecordDocument> & { asset?: AssetSnapshot }>([
        { $sort: { createdAt: -1 } },
        {
          $lookup: {
            from: "assets",
            localField: "assetId",
            foreignField: "_id",
            as: "asset",
          },
        },
        {
          $project: {
            assetId: 1,
            socialAccountId: 1,
            platform: 1,
            publishType: 1,
            status: 1,
            title: 1,
            platformPostId: 1,
            privacyStatus: 1,
            publishedAt: 1,
            scheduledAt: 1,
            createdAt: 1,
            asset: {
              $let: {
                vars: { asset: { $arrayElemAt: ["$asset", 0] } },
                in: {
                  title: "$$asset.metadata.title",
                  storageProvider: "$$asset.storageProvider",
                  providerAssetId: "$$asset.providerAssetId",
                },
              },
            },
          },
        },
      ])
      .toArray(),
  ]);

  const recordsByAccount = new Map<string, SocialInventoryPublishRecord[]>();
  const assetsById = new Map<string, AssetPublishingInventory>();
  const accountLabelById = new Map(
    accounts.map((account) => [account._id.toHexString(), account.label]),
  );

  for (const record of records) {
    const serialized = serializeRecord(record);
    const existing = recordsByAccount.get(serialized.socialAccountId) ?? [];
    existing.push(serialized);
    recordsByAccount.set(serialized.socialAccountId, existing);

    const asset = assetsById.get(serialized.assetId) ?? {
      assetId: serialized.assetId,
      title: serialized.asset.title ?? serialized.title,
      storageProvider: serialized.asset.storageProvider ?? null,
      providerAssetId: serialized.asset.providerAssetId ?? null,
      platforms: [],
    };
    asset.platforms.push({
      platform: serialized.platform,
      accountId: serialized.socialAccountId,
      accountLabel:
        accountLabelById.get(serialized.socialAccountId) ??
        serialized.socialAccountId,
      publishType: serialized.publishType,
      status: serialized.status,
      platformPostId: serialized.platformPostId,
      publishedAt: serialized.publishedAt,
    });
    assetsById.set(serialized.assetId, asset);
  }

  const accountInventories = await Promise.all(
    accounts.map(async (account) => ({
      accountId: account._id.toHexString(),
      platform: account.platform,
      label: account.label,
      displayName: account.displayName,
      handle: account.handle,
      status: account.status,
      localRecords: recordsByAccount.get(account._id.toHexString()) ?? [],
      youtubeRemote:
        account.platform === "youtube"
          ? await fetchYouTubeChannelInventory({ account })
          : null,
    })),
  );

  return {
    accounts: accountInventories,
    assets: Array.from(assetsById.values()).sort(
      (left, right) => right.platforms.length - left.platforms.length,
    ),
  };
}
