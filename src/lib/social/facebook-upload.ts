import type { Db } from "mongodb";

import { resolveAssetDownload } from "@/lib/storage/asset-download";

import {
  type FacebookApiError,
  readFacebookError,
  resolveFacebookPageContext,
} from "./facebook-auth";
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

type FacebookApiResponse = {
  id?: string;
  success?: boolean;
  video_id?: string;
  upload_url?: string;
  error?: FacebookApiError;
};

export type FacebookPublishResult = {
  status: "published" | "queued";
  platformPostId: string | null;
  videoId: string;
  detail: string;
};

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";
const GRAPH_VIDEO_BASE = "https://graph-video.facebook.com/v20.0";

function buildFacebookDescription(record: PublishRecordDocument) {
  const parts = [
    record.caption?.trim(),
    record.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "),
  ].filter(Boolean);

  return parts.join("\n\n");
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function buildFacebookVideoUrl({
  publishType,
  pageId,
  videoId,
}: {
  publishType: PublishRecordDocument["publishType"];
  pageId: string;
  videoId: string;
}) {
  if (publishType === "facebook_reel") {
    return `https://www.facebook.com/reel/${encodeURIComponent(videoId)}`;
  }

  return `https://www.facebook.com/${encodeURIComponent(pageId)}/videos/${encodeURIComponent(videoId)}`;
}

async function uploadFacebookPageVideo({
  pageId,
  pageAccessToken,
  videoBytes,
  mimeType,
  record,
  asset,
}: {
  pageId: string;
  pageAccessToken: string;
  videoBytes: Uint8Array;
  mimeType: string;
  record: PublishRecordDocument;
  asset: AssetDocument;
}): Promise<FacebookPublishResult> {
  const form = new FormData();
  const title =
    record.title?.trim() || asset.metadata?.title?.trim() || "OmniVideo upload";

  form.set("access_token", pageAccessToken);
  form.set("title", title);
  form.set("description", buildFacebookDescription(record));
  form.set("published", "true");
  form.set(
    "source",
    new Blob([copyToArrayBuffer(videoBytes)], { type: mimeType }),
    "video.mp4",
  );

  const response = await fetch(
    `${GRAPH_VIDEO_BASE}/${encodeURIComponent(pageId)}/videos`,
    {
      method: "POST",
      body: form,
    },
  );
  const payload = (await response.json().catch(() => null)) as
    | FacebookApiResponse
    | null;
  const videoId = payload?.id?.trim();

  if (!response.ok || payload?.error || !videoId) {
    throw new Error(
      `PRV_FACEBOOK_VIDEO_UPLOAD_FAILED: ${readFacebookError(
        payload,
        `status ${response.status}`,
      )}`,
    );
  }

  return {
    status: "published",
    videoId,
    platformPostId: buildFacebookVideoUrl({
      publishType: record.publishType,
      pageId,
      videoId,
    }),
    detail: "Facebook Page video published.",
  };
}

async function uploadFacebookReel({
  pageId,
  pageAccessToken,
  videoBytes,
  mimeType,
  record,
}: {
  pageId: string;
  pageAccessToken: string;
  videoBytes: Uint8Array;
  mimeType: string;
  record: PublishRecordDocument;
}): Promise<FacebookPublishResult> {
  const startUrl = new URL(`${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/video_reels`);
  startUrl.searchParams.set("upload_phase", "start");
  startUrl.searchParams.set("access_token", pageAccessToken);

  const startResponse = await fetch(startUrl.toString(), { method: "POST" });
  const startPayload = (await startResponse.json().catch(() => null)) as
    | FacebookApiResponse
    | null;
  const videoId = startPayload?.video_id?.trim() || startPayload?.id?.trim();
  const uploadUrl = startPayload?.upload_url?.trim();

  if (!startResponse.ok || startPayload?.error || !videoId || !uploadUrl) {
    throw new Error(
      `PRV_FACEBOOK_REEL_START_FAILED: ${readFacebookError(
        startPayload,
        `status ${startResponse.status}`,
      )}`,
    );
  }

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      authorization: `OAuth ${pageAccessToken}`,
      "content-type": mimeType,
      "content-length": String(videoBytes.byteLength),
      file_offset: "0",
    },
    body: copyToArrayBuffer(videoBytes),
  });
  const uploadPayload = (await uploadResponse.json().catch(() => null)) as
    | FacebookApiResponse
    | null;

  if (!uploadResponse.ok || uploadPayload?.error) {
    throw new Error(
      `PRV_FACEBOOK_REEL_UPLOAD_FAILED: ${readFacebookError(
        uploadPayload,
        `status ${uploadResponse.status}`,
      )}`,
    );
  }

  const finishUrl = new URL(`${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/video_reels`);
  finishUrl.searchParams.set("upload_phase", "finish");
  finishUrl.searchParams.set("video_id", videoId);
  finishUrl.searchParams.set("video_state", "PUBLISHED");
  finishUrl.searchParams.set("description", buildFacebookDescription(record));
  finishUrl.searchParams.set("access_token", pageAccessToken);

  const finishResponse = await fetch(finishUrl.toString(), { method: "POST" });
  const finishPayload = (await finishResponse.json().catch(() => null)) as
    | FacebookApiResponse
    | null;

  if (!finishResponse.ok || finishPayload?.error || finishPayload?.success === false) {
    throw new Error(
      `PRV_FACEBOOK_REEL_FINISH_FAILED: ${readFacebookError(
        finishPayload,
        `status ${finishResponse.status}`,
      )}`,
    );
  }

  return {
    status: "published",
    videoId,
    platformPostId: buildFacebookVideoUrl({
      publishType: record.publishType,
      pageId,
      videoId,
    }),
    detail: "Facebook Reel published.",
  };
}

export async function uploadVideoToFacebook({
  db,
  asset,
  account,
  record,
}: {
  db: Db;
  asset: AssetDocument;
  account: SocialAccountDocument;
  record: PublishRecordDocument;
}): Promise<FacebookPublishResult> {
  if (record.publishType !== "facebook_video" && record.publishType !== "facebook_reel") {
    throw new Error("VAL_FACEBOOK_PUBLISH_TYPE_INVALID");
  }

  const pageContext = await resolveFacebookPageContext(
    account,
    record.facebookPageId ?? undefined,
  );
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

  if (record.publishType === "facebook_reel") {
    return uploadFacebookReel({
      pageId: pageContext.pageId,
      pageAccessToken: pageContext.pageAccessToken,
      videoBytes,
      mimeType,
      record,
    });
  }

  return uploadFacebookPageVideo({
    pageId: pageContext.pageId,
    pageAccessToken: pageContext.pageAccessToken,
    videoBytes,
    mimeType,
    record,
    asset,
  });
}
