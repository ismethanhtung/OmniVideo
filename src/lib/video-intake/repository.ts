import { ObjectId, type Db } from "mongodb";

import { getMongoDb } from "@/lib/db/mongodb";

import { buildVideoAssetDocument } from "./asset-metadata";
import { URL_INTAKE_PIPELINE_DEFINITION } from "./pipeline-definition";
import type {
  IntakeRunStatus,
  ResolvedMedia,
  StorageUploadResult,
  ValidatedLocalIntakeInput,
  ValidatedIntakeInput,
} from "./types";

export async function getIntakeDb(): Promise<Db> {
  return getMongoDb();
}

export async function createSource({
  db,
  input,
}: {
  db: Db;
  input: ValidatedIntakeInput;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("sources").insertOne({
    sourceType: "url",
    url: input.canonicalUrl,
    canonicalLink: input.canonicalUrl,
    originPlatform: input.originPlatform,
    title: input.title ?? null,
    description: input.description ?? null,
    tags: input.tags,
    languageHint: input.languageHint ?? null,
    contentIntent: input.contentIntent ?? "other",
    ownershipStatus: input.ownershipStatus ?? "unknown",
    ingestedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId;
}

export async function createFileSource({
  db,
  input,
}: {
  db: Db;
  input: ValidatedLocalIntakeInput;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("sources").insertOne({
    sourceType: "file",
    url: null,
    canonicalLink: null,
    originPlatform: "other",
    title: input.title ?? input.fileName,
    description: input.description ?? null,
    tags: input.tags,
    languageHint: input.languageHint ?? null,
    contentIntent: input.contentIntent,
    ownershipStatus: input.ownershipStatus,
    fileMetadata: {
      fileName: input.fileName,
      mimeType: input.mimeType ?? null,
      sizeBytes: input.fileSizeBytes,
    },
    ingestedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId;
}

export async function createJobRun({
  db,
  inputSnapshot,
  pipelineId = "mvp-url-intake-to-storage",
  pipelineSnapshot = URL_INTAKE_PIPELINE_DEFINITION,
}: {
  db: Db;
  inputSnapshot: Record<string, unknown>;
  pipelineId?: string;
  pipelineSnapshot?: Record<string, unknown>;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("job_runs").insertOne({
    pipelineId,
    pipelineSnapshot,
    triggerType: "manual",
    status: "running" satisfies IntakeRunStatus,
    sourceRefs: [],
    inputSnapshot,
    outputSummary: null,
    startedAt: now,
    endedAt: null,
    durationMs: null,
    createdAt: now,
    updatedAt: now,
  });

  await createRunEvent({
    db,
    jobRunId: result.insertedId,
    eventType: "started",
    level: "info",
    payload: {
      pipeline:
        typeof pipelineSnapshot["name"] === "string"
          ? (pipelineSnapshot["name"] as string)
          : pipelineId,
    },
  });

  return result.insertedId;
}

export async function attachSourceToRun({
  db,
  jobRunId,
  sourceId,
}: {
  db: Db;
  jobRunId: ObjectId;
  sourceId: ObjectId;
}) {
  await db.collection("job_runs").updateOne(
    { _id: jobRunId },
    {
      $set: { updatedAt: new Date() },
      $addToSet: { sourceRefs: sourceId },
    },
  );
}

export async function createStepRun({
  db,
  jobRunId,
  nodeId,
  nodeType,
}: {
  db: Db;
  jobRunId: ObjectId;
  nodeId: string;
  nodeType: string;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("step_runs").insertOne({
    jobRunId,
    nodeId,
    nodeType,
    attempt: 1,
    status: "running",
    errorCode: null,
    errorDetail: null,
    metrics: null,
    startedAt: now,
    endedAt: null,
  });

  await createRunEvent({
    db,
    jobRunId,
    stepRunId: result.insertedId,
    eventType: "started",
    level: "info",
    payload: { nodeId, nodeType },
  });

  return result.insertedId;
}

export async function completeStepRun({
  db,
  jobRunId,
  stepRunId,
  metrics,
  payload,
}: {
  db: Db;
  jobRunId: ObjectId;
  stepRunId: ObjectId;
  metrics?: Record<string, unknown>;
  payload?: Record<string, unknown>;
}) {
  const now = new Date();

  await db.collection("step_runs").updateOne(
    { _id: stepRunId },
    {
      $set: {
        status: "success",
        metrics: metrics ?? null,
        endedAt: now,
      },
    },
  );

  await createRunEvent({
    db,
    jobRunId,
    stepRunId,
    eventType: "completed",
    level: "info",
    payload: payload ?? {},
  });
}

export async function failStepRun({
  db,
  jobRunId,
  stepRunId,
  errorCode,
  errorDetail,
}: {
  db: Db;
  jobRunId: ObjectId;
  stepRunId: ObjectId;
  errorCode: string;
  errorDetail: string;
}) {
  const now = new Date();

  await db.collection("step_runs").updateOne(
    { _id: stepRunId },
    {
      $set: {
        status: "failed",
        errorCode,
        errorDetail,
        endedAt: now,
      },
    },
  );

  await createRunEvent({
    db,
    jobRunId,
    stepRunId,
    eventType: "failed",
    level: "error",
    payload: { errorCode, errorDetail },
  });
}

export async function createAsset({
  db,
  jobRunId,
  sourceId,
  media,
  upload,
  pipelineId,
}: {
  db: Db;
  jobRunId: ObjectId;
  sourceId: ObjectId;
  media: ResolvedMedia;
  upload: StorageUploadResult;
  pipelineId?: string;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("assets").insertOne(
    buildVideoAssetDocument({
      jobRunId,
      sourceId,
      media,
      upload,
      now,
      pipelineId,
    }),
  );

  return result.insertedId;
}

export async function completeJobRun({
  db,
  jobRunId,
  sourceId,
  assetId,
  outputSummary,
}: {
  db: Db;
  jobRunId: ObjectId;
  sourceId: ObjectId;
  assetId: ObjectId;
  outputSummary: Record<string, unknown>;
}) {
  const now = new Date();
  const run = await db.collection("job_runs").findOne<{ startedAt?: Date }>({
    _id: jobRunId,
  });
  const durationMs = run?.startedAt
    ? now.getTime() - new Date(run.startedAt).getTime()
    : null;

  await db.collection("job_runs").updateOne(
    { _id: jobRunId },
    {
      $set: {
        status: "success",
        sourceRefs: [sourceId],
        outputSummary: {
          ...outputSummary,
          assetId,
        },
        endedAt: now,
        durationMs,
        updatedAt: now,
      },
    },
  );

  await createRunEvent({
    db,
    jobRunId,
    eventType: "completed",
    level: "info",
    payload: { assetId },
  });
}

export async function failJobRun({
  db,
  jobRunId,
  errorCode,
  errorMessage,
}: {
  db: Db;
  jobRunId: ObjectId;
  errorCode: string;
  errorMessage: string;
}) {
  const now = new Date();
  const run = await db.collection("job_runs").findOne<{ startedAt?: Date }>({
    _id: jobRunId,
  });
  const durationMs = run?.startedAt
    ? now.getTime() - new Date(run.startedAt).getTime()
    : null;

  await db.collection("job_runs").updateOne(
    { _id: jobRunId },
    {
      $set: {
        status: "failed",
        outputSummary: {
          errorCode,
          errorMessage,
        },
        endedAt: now,
        durationMs,
        updatedAt: now,
      },
    },
  );

  await createRunEvent({
    db,
    jobRunId,
    eventType: "failed",
    level: "error",
    payload: { errorCode, errorMessage },
  });
}

export async function createRunEvent({
  db,
  jobRunId,
  stepRunId,
  eventType,
  level,
  payload,
}: {
  db: Db;
  jobRunId: ObjectId;
  stepRunId?: ObjectId;
  eventType: "created" | "started" | "retry" | "failed" | "completed" | "warning";
  level: "info" | "warn" | "error";
  payload: Record<string, unknown>;
}) {
  await db.collection("run_events").insertOne({
    jobRunId,
    stepRunId: stepRunId ?? null,
    eventType,
    level,
    payload,
    timestamp: new Date(),
  });
}

export async function listVideoAssets(
  db: Db,
  { page = 1, pageSize = 25 }: { page?: number; pageSize?: number } = {},
) {
  const normalizedPage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const normalizedPageSize = Number.isFinite(pageSize)
    ? Math.min(100, Math.max(1, Math.floor(pageSize)))
    : 25;
  const skip = (normalizedPage - 1) * normalizedPageSize;
  const query = { assetType: "video" as const };

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
        durationMs: 1,
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

export type ManualVideoAssetInput = {
  title: string;
  sourceUrl?: string;
  storageProvider: "telegram" | "drive";
  providerAssetId?: string;
  publicUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  storageProviderLabel?: string;
};

export async function createManualVideoAsset({
  db,
  input,
}: {
  db: Db;
  input: ManualVideoAssetInput;
}) {
  const now = new Date();
  const storagePointer: Record<string, unknown> = {};

  if (input.providerAssetId?.trim()) {
    storagePointer.fileId = input.providerAssetId.trim();
  }

  if (input.publicUrl?.trim()) {
    storagePointer.webViewLink = input.publicUrl.trim();
  }

  const document = {
    assetType: "video",
    status: "ready",
    storageProvider: input.storageProvider,
    storagePointer,
    publicUrl: input.publicUrl?.trim() || null,
    providerAssetId: input.providerAssetId?.trim() || null,
    mimeType: input.mimeType?.trim() || "video/mp4",
    durationMs:
      typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
        ? Math.max(0, Math.round(input.durationMs))
        : null,
    sizeBytes:
      typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
        ? Math.max(0, Math.round(input.sizeBytes))
        : null,
    metadata: {
      sourceUrl: input.sourceUrl?.trim() || "manual://storage-library",
      originPlatform: "other",
      title: input.title.trim(),
      resolver: "manual-entry",
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
      pipelineId: "manual-storage-library-entry",
      storageProviderAccountId: null,
      storageProviderLabel: input.storageProviderLabel?.trim() || null,
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

export async function getVideoAssetById({
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
    assetType: "video",
  });
}

export async function deleteVideoAssetById({
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
    assetType: "video",
  });
}

export async function updateVideoAssetMetadataById({
  db,
  assetId,
  patch,
}: {
  db: Db;
  assetId: string;
  patch: {
    title?: string | null;
    description?: string | null;
    vietnameseTitle?: string | null;
    vietnameseDescription?: string | null;
    vietnameseHashtags?: string[] | null;
    videoEditSetup?: Record<string, unknown> | null;
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
  if (patch.vietnameseTitle !== undefined) {
    setPatch["metadata.vietnameseTitle"] = patch.vietnameseTitle;
  }
  if (patch.vietnameseDescription !== undefined) {
    setPatch["metadata.vietnameseDescription"] = patch.vietnameseDescription;
  }
  if (patch.vietnameseHashtags !== undefined) {
    setPatch["metadata.vietnameseHashtags"] = patch.vietnameseHashtags;
  }
  if (patch.videoEditSetup !== undefined) {
    setPatch["metadata.videoEditSetup"] = patch.videoEditSetup;
  }

  return db.collection("assets").findOneAndUpdate(
    {
      _id: new ObjectId(assetId),
      assetType: "video",
    },
    {
      $set: setPatch,
    },
    { returnDocument: "after" },
  );
}

export async function listIntakeJobRuns({
  db,
  page,
  pageSize,
  pipeline,
}: {
  db: Db;
  page: number;
  pageSize: number;
  pipeline?: "url" | "local" | "all";
}) {
  let query:
    | { pipelineId: string }
    | {
        pipelineId: {
          $in: string[];
        };
      };
  const pipelineFilter = pipeline ?? "url";

  if (pipelineFilter === "local") {
    query = { pipelineId: "mvp-local-intake-to-storage" };
  } else if (pipelineFilter === "all") {
    query = {
      pipelineId: {
        $in: ["mvp-url-intake-to-storage", "mvp-local-intake-to-storage"],
      },
    };
  } else {
    query = { pipelineId: "mvp-url-intake-to-storage" };
  }
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    db
      .collection("job_runs")
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .project({
        pipelineId: 1,
        status: 1,
        inputSnapshot: 1,
        outputSummary: 1,
        sourceRefs: 1,
        startedAt: 1,
        endedAt: 1,
        durationMs: 1,
        createdAt: 1,
        updatedAt: 1,
      })
      .toArray(),
    db.collection("job_runs").countDocuments(query),
  ]);
  const assetIds = items
    .map((item) => item.outputSummary?.assetId)
    .filter((assetId): assetId is ObjectId => assetId instanceof ObjectId);
  const assets =
    assetIds.length > 0
      ? await db
          .collection("assets")
          .find({ _id: { $in: assetIds }, assetType: "video" })
          .project({
            status: 1,
            storageProvider: 1,
            storagePointer: 1,
            publicUrl: 1,
            providerAssetId: 1,
            mimeType: 1,
            sizeBytes: 1,
            durationMs: 1,
            metadata: 1,
            createdFrom: 1,
            createdAt: 1,
          })
          .toArray()
      : [];
  const assetsById = new Map(
    assets.map((asset) => [asset._id.toString(), asset]),
  );
  const enrichedItems = items.map((item) => {
    const assetId = item.outputSummary?.assetId;
    const asset =
      assetId instanceof ObjectId ? assetsById.get(assetId.toString()) : null;

    return asset
      ? {
          ...item,
          assetSummary: asset,
        }
      : item;
  });

  return {
    items: enrichedItems,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function deleteFailedUrlIntakeJobRuns({ db }: { db: Db }) {
  const failedRuns = await db
    .collection("job_runs")
    .find({
      pipelineId: "mvp-url-intake-to-storage",
      status: "failed",
    })
    .project({ _id: 1 })
    .toArray();
  const runIds = failedRuns.map((run) => run._id);

  if (runIds.length === 0) {
    return {
      deletedRuns: 0,
      deletedStepRuns: 0,
      deletedRunEvents: 0,
    };
  }

  const [stepResult, eventResult, runResult] = await Promise.all([
    db.collection("step_runs").deleteMany({ jobRunId: { $in: runIds } }),
    db.collection("run_events").deleteMany({ jobRunId: { $in: runIds } }),
    db.collection("job_runs").deleteMany({ _id: { $in: runIds } }),
  ]);

  return {
    deletedRuns: runResult.deletedCount,
    deletedStepRuns: stepResult.deletedCount,
    deletedRunEvents: eventResult.deletedCount,
  };
}

export async function deleteUrlIntakeJobRunById({
  db,
  runId,
}: {
  db: Db;
  runId: string;
}) {
  if (!ObjectId.isValid(runId)) {
    return {
      ok: false as const,
      reason: "invalid-id" as const,
    };
  }

  const objectId = new ObjectId(runId);
  const run = await db.collection("job_runs").findOne({
    _id: objectId,
  });

  if (!run) {
    return {
      ok: false as const,
      reason: "not-found" as const,
    };
  }

  const [stepResult, eventResult, runResult] = await Promise.all([
    db.collection("step_runs").deleteMany({ jobRunId: objectId }),
    db.collection("run_events").deleteMany({ jobRunId: objectId }),
    db.collection("job_runs").deleteOne({ _id: objectId }),
  ]);

  return {
    ok: true as const,
    deletedRuns: runResult.deletedCount,
    deletedStepRuns: stepResult.deletedCount,
    deletedRunEvents: eventResult.deletedCount,
  };
}

export async function getIntakeRunDetail({
  db,
  runId,
}: {
  db: Db;
  runId: string;
}) {
  if (!ObjectId.isValid(runId)) {
    return null;
  }

  const jobRunId = new ObjectId(runId);
  const [run, stepRuns] = await Promise.all([
    db.collection("job_runs").findOne({ _id: jobRunId }),
    db
      .collection("step_runs")
      .find({ jobRunId })
      .sort({ startedAt: 1, nodeId: 1 })
      .toArray(),
  ]);

  if (!run) {
    return null;
  }

  return {
    run,
    stepRuns,
  };
}
