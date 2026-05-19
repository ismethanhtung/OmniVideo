import { ObjectId, type Db } from "mongodb";

import {
  buildFolderAssetTags,
  buildRawSourceProcessedOutputTags,
  getAssetFolderName,
  normalizeAssetFolderName,
} from "@/lib/storage/asset-folder";
import type { StorageUploadResult } from "@/lib/video-intake/types";

export type ThumbnailLifecycle = "raw" | "processed";

export type CreateThumbnailAssetInput = {
  title: string;
  folder: string;
  extraTags: string[];
  lifecycle: ThumbnailLifecycle;
  sourceUrl?: string;
  upload: StorageUploadResult;
  pipelineId?: string;
};

export async function listThumbnailAssets(
  db: Db,
  { page = 1, pageSize = 50 }: { page?: number; pageSize?: number } = {},
) {
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const normalizedPageSize = Number.isFinite(pageSize)
    ? Math.min(200, Math.max(1, Math.floor(pageSize)))
    : 50;
  const skip = (normalizedPage - 1) * normalizedPageSize;
  const query = { assetType: "image" as const };

  const [total, data] = await Promise.all([
    db.collection("assets").countDocuments(query),
    db
      .collection("assets")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(normalizedPageSize)
      .project({
        assetType: 1,
        status: 1,
        storageProvider: 1,
        storagePointer: 1,
        publicUrl: 1,
        providerAssetId: 1,
        mimeType: 1,
        sizeBytes: 1,
        metadata: 1,
        createdFrom: 1,
        createdAt: 1,
      })
      .toArray(),
  ]);

  return {
    data,
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
    },
  };
}

export async function createThumbnailAsset({
  db,
  input,
}: {
  db: Db;
  input: CreateThumbnailAssetInput;
}) {
  const now = new Date();
  const folder = normalizeAssetFolderName(input.folder) || "thumbnails";
  const tags = buildFolderAssetTags({
    folder,
    lifecycle: input.lifecycle,
    extraTags: input.extraTags,
  });
  const document = {
    assetType: "image",
    status: "ready",
    storageProvider: input.upload.storageProvider,
    storagePointer: input.upload.storagePointer,
    publicUrl: input.upload.publicUrl ?? null,
    providerAssetId: input.upload.providerAssetId ?? null,
    mimeType: input.upload.mimeType ?? "image/png",
    durationMs: null,
    sizeBytes:
      typeof input.upload.sizeBytes === "number" &&
      Number.isFinite(input.upload.sizeBytes)
        ? Math.max(0, Math.round(input.upload.sizeBytes))
        : null,
    metadata: {
      sourceUrl: input.sourceUrl?.trim() || "thumbnail-studio://manual",
      originPlatform: "other",
      title: input.title.trim() || "Untitled thumbnail",
      description: null,
      folder,
      tags,
      resolver: "thumbnail-studio",
      requestedQuality: "best",
      actualQuality: null,
      formatId: null,
      formatNote: null,
      resolution: null,
      height: null,
      width: null,
      ext: null,
      vcodec: null,
      acodec: null,
    },
    createdFrom: {
      sourceId: null,
      jobRunId: null,
      pipelineId: input.pipelineId?.trim() || "thumbnail-studio",
      storageProviderAccountId: input.upload.storageProviderAccountId ?? null,
      storageProviderLabel: input.upload.storageProviderLabel ?? null,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db.collection("assets").insertOne(document);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function getThumbnailAssetById({
  db,
  assetId,
}: {
  db: Db;
  assetId: string;
}) {
  if (!ObjectId.isValid(assetId)) {
    return null;
  }

  return db.collection("assets").findOne({
    _id: new ObjectId(assetId),
    assetType: "image",
  });
}

export async function deleteThumbnailAssetById({
  db,
  assetId,
}: {
  db: Db;
  assetId: string;
}) {
  if (!ObjectId.isValid(assetId)) {
    return null;
  }

  return db.collection("assets").findOneAndDelete({
    _id: new ObjectId(assetId),
    assetType: "image",
  });
}

export async function updateThumbnailAssetMetadataById({
  db,
  assetId,
  patch,
}: {
  db: Db;
  assetId: string;
  patch: {
    title?: string | null;
    description?: string | null;
    folder?: string | null;
    tags?: string[] | null;
  };
}) {
  if (!ObjectId.isValid(assetId)) {
    return null;
  }

  const setPatch: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (patch.title !== undefined) {
    setPatch["metadata.title"] = patch.title;
  }
  if (patch.description !== undefined) {
    setPatch["metadata.description"] = patch.description;
  }
  if (patch.folder !== undefined) {
    setPatch["metadata.folder"] = patch.folder;
  }
  if (patch.tags !== undefined) {
    setPatch["metadata.tags"] = patch.tags;
  }
  return db.collection("assets").findOneAndUpdate(
    {
      _id: new ObjectId(assetId),
      assetType: "image",
    },
    {
      $set: setPatch,
    },
    { returnDocument: "after" },
  );
}

export async function markThumbnailHasProcessedOutput({
  db,
  sourceAssetId,
}: {
  db: Db;
  sourceAssetId: string;
}) {
  if (!ObjectId.isValid(sourceAssetId)) {
    return null;
  }

  const sourceAsset = await db.collection("assets").findOne({
    _id: new ObjectId(sourceAssetId),
    assetType: "image",
  });

  if (!sourceAsset) {
    return null;
  }

  const existingTags = Array.isArray(sourceAsset.metadata?.tags)
    ? sourceAsset.metadata.tags.filter(
        (entry: unknown): entry is string => typeof entry === "string",
      )
    : [];

  const folder = getAssetFolderName({
    metadata: {
      folder: typeof sourceAsset.metadata?.folder === "string"
        ? sourceAsset.metadata.folder
        : null,
      tags: existingTags,
    },
  }) || "thumbnails";

  const nextTags = buildRawSourceProcessedOutputTags({
    folder,
    existingTags,
  });

  return db.collection("assets").findOneAndUpdate(
    {
      _id: new ObjectId(sourceAssetId),
      assetType: "image",
    },
    {
      $set: {
        "metadata.tags": nextTags,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
}
