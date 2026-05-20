import { ObjectId, type Db } from "mongodb";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import type { PublishRecordDocument, SocialAccountDocument } from "./types";

type AssetDocument = {
  _id: ObjectId;
  assetType?: string;
  storageProvider?: string;
  storagePointer?: Record<string, unknown>;
  publicUrl?: string | null;
  providerAssetId?: string | null;
  mimeType?: string | null;
  durationMs?: number | null;
  sizeBytes?: number | null;
  metadata?: {
    title?: string | null;
    width?: number | null;
    height?: number | null;
  };
  createdFrom?: {
    storageProviderAccountId?: string | null;
  };
};

type YouTubeUploadResult = {
  id?: string;
  snippet?: {
    title?: string;
  };
  status?: {
    privacyStatus?: string;
  };
  error?: {
    message?: string;
  };
};

type YouTubeTokenRefreshResult = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

async function readYouTubeError(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => null)) as
    | YouTubeUploadResult
    | null;

  return payload?.error?.message ?? fallback;
}

async function resolveYouTubeUploadAccessToken(account: SocialAccountDocument) {
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

async function resolveThumbnailUploadPayload({
  db,
  record,
}: {
  db: Db;
  record: PublishRecordDocument;
}) {
  if (!record.thumbnailAssetId) {
    return null;
  }

  const thumbnailAssetId =
    record.thumbnailAssetId instanceof ObjectId
      ? record.thumbnailAssetId
      : new ObjectId(record.thumbnailAssetId);

  const thumbnailAsset = await db.collection<AssetDocument>("assets").findOne({
    _id: thumbnailAssetId,
    assetType: "image",
  });

  if (!thumbnailAsset) {
    throw new Error(
      "VAL_PUBLISH_THUMBNAIL_ASSET_NOT_FOUND: Thumbnail asset was not found.",
    );
  }

  const download = await resolveAssetDownload({
    db,
    asset: thumbnailAsset,
    disposition: "inline",
  });
  if (!download.ok) {
    throw new Error(`${download.errorCode}: ${download.error}`);
  }

  const mimeType = (
    download.headers.get("content-type") ??
    thumbnailAsset.mimeType ??
    "image/png"
  )
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!mimeType.startsWith("image/")) {
    throw new Error(
      "VAL_PUBLISH_THUMBNAIL_MIME_TYPE_INVALID: Thumbnail asset must be an image.",
    );
  }

  const bytes = new Uint8Array(await new Response(download.body).arrayBuffer());
  if (bytes.byteLength === 0) {
    throw new Error(
      "VAL_PUBLISH_THUMBNAIL_EMPTY: Thumbnail asset is empty and cannot be uploaded.",
    );
  }
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  );

  return {
    bytes: buffer,
    mimeType,
  };
}

async function uploadYouTubeThumbnail({
  accessToken,
  videoId,
  bytes,
  mimeType,
}: {
  accessToken: string;
  videoId: string;
  bytes: ArrayBuffer;
  mimeType: string;
}) {
  const response = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(
      videoId,
    )}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": mimeType,
        "content-length": String(bytes.byteLength),
      },
      body: bytes,
    },
  );

  if (!response.ok) {
    throw new Error(
      await readYouTubeError(
        response,
        `YouTube thumbnail upload failed with status ${response.status}.`,
      ),
    );
  }
}

function assertYouTubeShortEligibility(asset: AssetDocument) {
  const durationMs = typeof asset.durationMs === "number" ? asset.durationMs : null;
  const width =
    typeof asset.metadata?.width === "number" ? asset.metadata.width : null;
  const height =
    typeof asset.metadata?.height === "number" ? asset.metadata.height : null;

  if (!durationMs || !width || !height) {
    throw new Error(
      "VAL_YOUTUBE_SHORT_METADATA_MISSING: YouTube Shorts require known duration, width, and height metadata before upload.",
    );
  }

  if (durationMs > 180_000) {
    throw new Error(
      "VAL_YOUTUBE_SHORT_DURATION_TOO_LONG: YouTube Shorts must be 3 minutes or less.",
    );
  }

  if (width > height) {
    throw new Error(
      "VAL_YOUTUBE_SHORT_ASPECT_RATIO_INVALID: YouTube Shorts must be square or vertical.",
    );
  }
}

function buildDescription(record: PublishRecordDocument) {
  const description = record.caption?.trim() || "";

  if (record.publishType !== "youtube_short") {
    return description;
  }

  return /(^|\s)#shorts(\s|$)/i.test(description)
    ? description
    : [description, "#Shorts"].filter(Boolean).join("\n\n");
}

export async function uploadVideoToYouTube({
  db,
  asset,
  account,
  record,
}: {
  db: Db;
  asset: AssetDocument;
  account: SocialAccountDocument;
  record: PublishRecordDocument;
}) {
  const accessToken = await resolveYouTubeUploadAccessToken(account);
  const thumbnailPayload = await resolveThumbnailUploadPayload({ db, record });

  if (record.publishType === "youtube_short") {
    assertYouTubeShortEligibility(asset);
  }

  const download = await resolveAssetDownload({
    db,
    asset,
    disposition: "inline",
  });

  if (!download.ok) {
    throw new Error(`${download.errorCode}: ${download.error}`);
  }

  const videoBytes = new Uint8Array(await new Response(download.body).arrayBuffer());
  const mimeType =
    download.headers.get("content-type") ?? asset.mimeType ?? "video/mp4";
  const title =
    record.title?.trim() || asset.metadata?.title?.trim() || "OmniVideo upload";
  const description = buildDescription(record);
  const tags = record.hashtags.length > 0 ? record.hashtags : undefined;
  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: "22",
    },
    status: {
      privacyStatus: record.privacyStatus,
      selfDeclaredMadeForKids: false,
    },
  };

  const sessionResponse = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": mimeType,
        "x-upload-content-length": String(videoBytes.byteLength),
      },
      body: JSON.stringify(metadata),
    },
  );
  const uploadUrl = sessionResponse.headers.get("location");

  if (!sessionResponse.ok || !uploadUrl) {
    throw new Error(
      await readYouTubeError(
        sessionResponse,
        `YouTube upload session failed with status ${sessionResponse.status}.`,
      ),
    );
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "content-type": mimeType,
      "content-length": String(videoBytes.byteLength),
    },
    body: videoBytes,
  });
  const payload = (await uploadResponse.json().catch(() => null)) as
    | YouTubeUploadResult
    | null;

  if (!uploadResponse.ok || !payload?.id) {
    throw new Error(
      payload?.error?.message ??
        `YouTube upload failed with status ${uploadResponse.status}.`,
    );
  }

  if (thumbnailPayload) {
    await uploadYouTubeThumbnail({
      accessToken,
      videoId: payload.id,
      bytes: thumbnailPayload.bytes,
      mimeType: thumbnailPayload.mimeType,
    });
  }

  return {
    platformPostId: payload.id,
    title: payload.snippet?.title ?? title,
    privacyStatus: payload.status?.privacyStatus ?? record.privacyStatus,
  };
}
