import type { ObjectId } from "mongodb";

import type { ResolvedMedia, StorageUploadResult } from "./types";

export function buildVideoAssetDocument({
  jobRunId,
  sourceId,
  media,
  upload,
  now,
  pipelineId = "mvp-url-intake-to-storage",
}: {
  jobRunId: ObjectId;
  sourceId: ObjectId;
  media: ResolvedMedia;
  upload: StorageUploadResult;
  now: Date;
  pipelineId?: string;
}) {
  return {
    assetType: "video",
    status: "ready",
    storageProvider: upload.storageProvider,
    storagePointer: upload.storagePointer,
    publicUrl: upload.publicUrl ?? null,
    providerAssetId: upload.providerAssetId ?? null,
    checksumSha256: null,
    mimeType: upload.mimeType ?? media.mimeType ?? null,
    durationMs: media.durationMs ?? null,
    sizeBytes: upload.sizeBytes ?? media.sizeBytes ?? null,
    metadata: {
      sourceUrl: media.originalUrl,
      directMediaUrlResolved: media.resolver !== "local-file",
      resolver: media.resolver,
      downloadMode: media.downloadMode ?? "direct-url",
      resolverProfile: media.resolverProfile ?? null,
      originPlatform: media.originPlatform,
      title: media.title ?? null,
      description: media.description ?? null,
      vietnameseTitle: null,
      vietnameseDescription: null,
      vietnameseHashtags: [],
      requestedQuality: media.requestedQuality ?? "best",
      formatSelector: media.formatSelector ?? null,
      hasAudio: media.hasAudio ?? null,
      hasVideo: media.hasVideo ?? null,
      actualQuality: media.height ? `${media.height}p` : null,
      formatId: media.formatId ?? null,
      formatNote: media.formatNote ?? null,
      resolution: media.resolution ?? null,
      width: media.width ?? null,
      height: media.height ?? null,
      ext: media.ext ?? null,
      vcodec: media.vcodec ?? null,
      acodec: media.acodec ?? null,
    },
    createdFrom: {
      sourceId,
      jobRunId,
      pipelineId,
      storageProviderAccountId: upload.storageProviderAccountId ?? null,
      storageProviderLabel: upload.storageProviderLabel ?? null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
