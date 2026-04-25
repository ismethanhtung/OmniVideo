import type { ObjectId } from "mongodb";

import type { ResolvedMedia, StorageUploadResult } from "./types";

export function buildVideoAssetDocument({
  jobRunId,
  sourceId,
  media,
  upload,
  now,
}: {
  jobRunId: ObjectId;
  sourceId: ObjectId;
  media: ResolvedMedia;
  upload: StorageUploadResult;
  now: Date;
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
      directMediaUrlResolved: true,
      resolver: media.resolver,
      originPlatform: media.originPlatform,
      title: media.title ?? null,
      requestedQuality: media.requestedQuality ?? "best",
    },
    createdFrom: {
      sourceId,
      jobRunId,
      pipelineId: "mvp-url-intake-to-storage",
      storageProviderAccountId: upload.storageProviderAccountId ?? null,
      storageProviderLabel: upload.storageProviderLabel ?? null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
