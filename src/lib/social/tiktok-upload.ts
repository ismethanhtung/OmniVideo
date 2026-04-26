import type { Db } from "mongodb";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import type { PublishRecordDocument, SocialAccountDocument } from "./types";

type AssetDocument = {
  _id: unknown;
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

type TikTokApiError = {
  code?: string;
  message?: string;
  log_id?: string;
};

type TikTokCreatorInfoResponse = {
  data?: {
    creator_username?: string;
    creator_nickname?: string;
    privacy_level_options?: string[];
    comment_disabled?: boolean;
    duet_disabled?: boolean;
    stitch_disabled?: boolean;
    max_video_post_duration_sec?: number;
  };
  error?: TikTokApiError;
};

type TikTokVideoInitResponse = {
  data?: {
    publish_id?: string;
    upload_url?: string;
  };
  error?: TikTokApiError;
};

type TikTokStatusFetchResponse = {
  data?: {
    status?: string;
    fail_reason?: string;
    publicaly_available_post_id?: Array<string | number>;
    publicly_available_post_id?: Array<string | number>;
  };
  error?: TikTokApiError;
};

type TikTokTokenRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
};

export type TikTokPublishResult = {
  status: "published" | "queued";
  publishId: string;
  platformPostId: string | null;
  detail: string;
};

const TIKTOK_API_BASE = "https://open.tiktokapis.com";
const DEFAULT_CHUNK_SIZE_BYTES = 10 * 1024 * 1024;
const MIN_CHUNK_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_CHUNK_SIZE_BYTES = 64 * 1024 * 1024;
const POLL_DELAY_MS = process.env.NODE_ENV === "test" ? 1 : 2000;

function readTikTokErrorMessage(payload: { error?: TikTokApiError } | null) {
  const code = payload?.error?.code?.trim();
  const message = payload?.error?.message?.trim();

  if (!code && !message) {
    return null;
  }

  return `${code ?? "error"}: ${message ?? "TikTok API request failed."}`;
}

function choosePrivacyLevel(options: string[]) {
  if (options.includes("SELF_ONLY")) {
    return "SELF_ONLY";
  }

  if (options.includes("MUTUAL_FOLLOW_FRIENDS")) {
    return "MUTUAL_FOLLOW_FRIENDS";
  }

  if (options.length > 0) {
    return options[0];
  }

  return "SELF_ONLY";
}

function buildTikTokPostUrl({
  creatorUsername,
  postId,
}: {
  creatorUsername: string | undefined;
  postId: string | null;
}) {
  if (!postId) {
    return null;
  }

  if (creatorUsername) {
    return `https://www.tiktok.com/@${creatorUsername}/video/${postId}`;
  }

  return postId;
}

function pickChunkSize(totalBytes: number) {
  if (totalBytes <= MIN_CHUNK_SIZE_BYTES) {
    return totalBytes;
  }

  return Math.min(
    Math.max(DEFAULT_CHUNK_SIZE_BYTES, MIN_CHUNK_SIZE_BYTES),
    Math.min(MAX_CHUNK_SIZE_BYTES, totalBytes),
  );
}

async function resolveTikTokUploadAccessToken(account: SocialAccountDocument) {
  const accessToken = account.secrets.accessToken?.trim();
  const refreshToken = account.secrets.refreshToken?.trim();
  const clientKey = process.env.TIKTOK_CLIENT_KEY?.trim();
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET?.trim();

  if (refreshToken && clientKey && clientSecret) {
    const response = await fetch(`${TIKTOK_API_BASE}/v2/oauth/token/`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    const payload = (await response.json().catch(() => null)) as
      | TikTokTokenRefreshResponse
      | null;

    if (!response.ok || !payload?.access_token) {
      throw new Error(
        payload?.error_description ??
          payload?.error ??
          `AUTH_TIKTOK_REFRESH_FAILED: status ${response.status}`,
      );
    }

    return payload.access_token;
  }

  if (!accessToken) {
    throw new Error("AUTH_TIKTOK_ACCESS_TOKEN_MISSING");
  }

  return accessToken;
}

async function queryTikTokCreatorInfo(accessToken: string) {
  const response = await fetch(
    `${TIKTOK_API_BASE}/v2/post/publish/creator_info/query/`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({}),
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | TikTokCreatorInfoResponse
    | null;
  const apiError = readTikTokErrorMessage(payload);

  if (!response.ok || (payload?.error?.code && payload.error.code !== "ok")) {
    throw new Error(
      `PRV_TIKTOK_CREATOR_INFO_FAILED: ${
        apiError ?? `status ${response.status}`
      }`,
    );
  }

  return payload?.data ?? {};
}

async function initTikTokDirectPost({
  accessToken,
  title,
  videoSize,
  chunkSize,
  totalChunkCount,
  creatorInfo,
}: {
  accessToken: string;
  title: string;
  videoSize: number;
  chunkSize: number;
  totalChunkCount: number;
  creatorInfo: Awaited<ReturnType<typeof queryTikTokCreatorInfo>>;
}) {
  const response = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: choosePrivacyLevel(creatorInfo.privacy_level_options ?? []),
        disable_comment: Boolean(creatorInfo.comment_disabled),
        disable_duet: Boolean(creatorInfo.duet_disabled),
        disable_stitch: Boolean(creatorInfo.stitch_disabled),
      },
      source_info: {
        source: "FILE_UPLOAD",
        video_size: videoSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunkCount,
      },
    }),
  });
  const payload = (await response.json().catch(() => null)) as
    | TikTokVideoInitResponse
    | null;
  const apiError = readTikTokErrorMessage(payload);

  if (!response.ok || (payload?.error?.code && payload.error.code !== "ok")) {
    throw new Error(
      `PRV_TIKTOK_INIT_FAILED: ${apiError ?? `status ${response.status}`}`,
    );
  }

  const publishId = payload?.data?.publish_id?.trim();
  const uploadUrl = payload?.data?.upload_url?.trim();

  if (!publishId || !uploadUrl) {
    throw new Error("PRV_TIKTOK_INIT_FAILED: missing publish_id or upload_url.");
  }

  return {
    publishId,
    uploadUrl,
  };
}

async function uploadToTikTokByChunks({
  uploadUrl,
  videoBytes,
  mimeType,
}: {
  uploadUrl: string;
  videoBytes: Uint8Array;
  mimeType: string;
}) {
  const totalBytes = videoBytes.byteLength;
  const chunkSize = pickChunkSize(totalBytes);
  let offset = 0;

  while (offset < totalBytes) {
    const endExclusive = Math.min(offset + chunkSize, totalBytes);
    const chunk = videoBytes.slice(offset, endExclusive);
    const firstByte = offset;
    const lastByte = endExclusive - 1;
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "content-type": mimeType,
        "content-length": String(chunk.byteLength),
        "content-range": `bytes ${firstByte}-${lastByte}/${totalBytes}`,
      },
      body: chunk,
    });

    if (!response.ok) {
      throw new Error(
        `PRV_TIKTOK_UPLOAD_FAILED: TikTok upload chunk failed with status ${response.status}.`,
      );
    }

    offset = endExclusive;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchTikTokPublishStatus({
  accessToken,
  publishId,
}: {
  accessToken: string;
  publishId: string;
}) {
  const response = await fetch(`${TIKTOK_API_BASE}/v2/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({ publish_id: publishId }),
  });
  const payload = (await response.json().catch(() => null)) as
    | TikTokStatusFetchResponse
    | null;
  const apiError = readTikTokErrorMessage(payload);

  if (!response.ok || (payload?.error?.code && payload.error.code !== "ok")) {
    throw new Error(
      `PRV_TIKTOK_STATUS_FETCH_FAILED: ${
        apiError ?? `status ${response.status}`
      }`,
    );
  }

  return payload?.data ?? {};
}

export async function uploadVideoToTikTok({
  db,
  asset,
  account,
  record,
}: {
  db: Db;
  asset: AssetDocument;
  account: SocialAccountDocument;
  record: PublishRecordDocument;
}): Promise<TikTokPublishResult> {
  void db;

  if (record.publishType !== "tiktok_video") {
    throw new Error("VAL_TIKTOK_PUBLISH_TYPE_INVALID");
  }

  const accessToken = await resolveTikTokUploadAccessToken(account);
  const creatorInfo = await queryTikTokCreatorInfo(accessToken);

  const maxDurationSec = creatorInfo.max_video_post_duration_sec;
  if (
    typeof maxDurationSec === "number" &&
    typeof asset.durationMs === "number" &&
    asset.durationMs > maxDurationSec * 1000
  ) {
    throw new Error(
      `VAL_TIKTOK_VIDEO_DURATION_TOO_LONG: max=${maxDurationSec}s, actual=${Math.ceil(
        asset.durationMs / 1000,
      )}s.`,
    );
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
    record.caption?.trim() ||
    record.title?.trim() ||
    asset.metadata?.title?.trim() ||
    "Posted via OmniVideo";
  const chunkSize = pickChunkSize(videoBytes.byteLength);
  const totalChunkCount = Math.ceil(videoBytes.byteLength / chunkSize);
  const initResult = await initTikTokDirectPost({
    accessToken,
    title,
    videoSize: videoBytes.byteLength,
    chunkSize,
    totalChunkCount,
    creatorInfo,
  });

  await uploadToTikTokByChunks({
    uploadUrl: initResult.uploadUrl,
    videoBytes,
    mimeType,
  });

  const maxPollAttempts = 3;

  for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
    const statusData = await fetchTikTokPublishStatus({
      accessToken,
      publishId: initResult.publishId,
    });
    const publishStatus = statusData.status ?? "UNKNOWN";
    const failReason = statusData.fail_reason?.trim();

    if (publishStatus === "FAILED") {
      throw new Error(
        `PRV_TIKTOK_PUBLISH_FAILED: ${failReason ?? "TikTok returned FAILED status."}`,
      );
    }

    if (publishStatus === "PUBLISH_COMPLETE") {
      const postIds =
        statusData.publicaly_available_post_id ??
        statusData.publicly_available_post_id ??
        [];
      const publicPostId =
        postIds.length > 0 ? String(postIds[0]).trim() || null : null;
      const platformPostId = buildTikTokPostUrl({
        creatorUsername: creatorInfo.creator_username,
        postId: publicPostId,
      });

      return {
        status: "published",
        publishId: initResult.publishId,
        platformPostId,
        detail: publicPostId
          ? "TikTok direct post completed."
          : "TikTok post completed but no public post id is available yet.",
      };
    }

    if (attempt < maxPollAttempts - 1) {
      await delay(POLL_DELAY_MS);
    }
  }

  return {
    status: "queued",
    publishId: initResult.publishId,
    platformPostId: null,
    detail:
      "TikTok accepted upload and is still processing/moderating. Use publish_id to track status.",
  };
}
