import { ObjectId, type Db } from "mongodb";

import { getMongoDb } from "@/lib/db/mongodb";

import { buildVideoAssetDocument } from "./asset-metadata";
import { URL_INTAKE_PIPELINE_DEFINITION } from "./pipeline-definition";
import type {
  IntakeRunStatus,
  ResolvedMedia,
  StorageUploadResult,
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

export async function createJobRun({
  db,
  inputSnapshot,
}: {
  db: Db;
  inputSnapshot: Record<string, unknown>;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("job_runs").insertOne({
    pipelineId: "mvp-url-intake-to-storage",
    pipelineSnapshot: URL_INTAKE_PIPELINE_DEFINITION,
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
    payload: { pipeline: URL_INTAKE_PIPELINE_DEFINITION.name },
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
}: {
  db: Db;
  jobRunId: ObjectId;
  sourceId: ObjectId;
  media: ResolvedMedia;
  upload: StorageUploadResult;
}): Promise<ObjectId> {
  const now = new Date();
  const result = await db.collection("assets").insertOne(
    buildVideoAssetDocument({
      jobRunId,
      sourceId,
      media,
      upload,
      now,
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

export async function listVideoAssets(db: Db, limit = 25) {
  return db
    .collection("assets")
    .find({ assetType: "video" })
    .sort({ createdAt: -1 })
    .limit(limit)
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
    .toArray();
}

export async function listIntakeJobRuns({
  db,
  page,
  pageSize,
}: {
  db: Db;
  page: number;
  pageSize: number;
}) {
  const query = { pipelineId: "mvp-url-intake-to-storage" };
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

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
