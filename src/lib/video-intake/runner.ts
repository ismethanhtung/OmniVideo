import type { Db, ObjectId } from "mongodb";

import { getActiveStorageProviderAccountForUpload } from "@/lib/storage-providers/repository";
import { StorageProviderError } from "@/lib/storage-providers/types";

import { resolveMediaUrl } from "./media-resolver";
import { uploadResolvedMedia } from "./storage-adapters";
import {
  attachSourceToRun,
  completeJobRun,
  completeStepRun,
  createAsset,
  createJobRun,
  createSource,
  createStepRun,
  failJobRun,
  failStepRun,
  getIntakeDb,
} from "./repository";
import {
  IntakeError,
  type IntakeInput,
  type IntakeRunResult,
  type ResolvedMedia,
  type StorageProvider,
  type StorageUploadResult,
  type ValidatedIntakeInput,
} from "./types";
import { validateIntakeInput } from "./validation";

async function runTrackedStep<T>({
  db,
  jobRunId,
  nodeId,
  nodeType,
  execute,
}: {
  db: Db;
  jobRunId: ObjectId;
  nodeId: string;
  nodeType: string;
  execute: () => Promise<T> | T;
}): Promise<T> {
  const startedAt = Date.now();
  const stepRunId = await createStepRun({ db, jobRunId, nodeId, nodeType });

  try {
    const result = await execute();
    await completeStepRun({
      db,
      jobRunId,
      stepRunId,
      metrics: { latencyMs: Date.now() - startedAt },
    });
    return result;
  } catch (error) {
    const intakeError = normalizeIntakeError(error);
    await failStepRun({
      db,
      jobRunId,
      stepRunId,
      errorCode: intakeError.errorCode,
      errorDetail: intakeError.message,
    });
    throw intakeError;
  }
}

function normalizeIntakeError(error: unknown): IntakeError {
  if (error instanceof IntakeError) {
    return error;
  }

  if (error instanceof StorageProviderError) {
    return new IntakeError({
      errorCode: error.errorCode,
      message: error.message,
      category: "validation",
      retryable: false,
    });
  }

  return new IntakeError({
    errorCode: "SYS_INTAKE_UNKNOWN",
    message: error instanceof Error ? error.message : "Unknown intake error.",
    category: "system",
    retryable: false,
  });
}

export async function runUrlIntakePipeline(
  rawInput: IntakeInput,
): Promise<IntakeRunResult> {
  const db = await getIntakeDb();
  const jobRunId = await createJobRun({
    db,
    inputSnapshot: {
      sourceUrl: rawInput.sourceUrl,
      storageProvider: rawInput.storageProvider,
      storageProviderAccountId: rawInput.storageProviderAccountId ?? null,
      qualityPreference: rawInput.qualityPreference ?? "best",
      formatSelector: rawInput.formatSelector ?? null,
      tags: rawInput.tags,
      title: rawInput.title ?? null,
    },
  });

  let sourceId: ObjectId | undefined;

  try {
    const input = await runTrackedStep<ValidatedIntakeInput>({
      db,
      jobRunId,
      nodeId: "validate-source-url",
      nodeType: "source.url.validate",
      execute: () => validateIntakeInput(rawInput),
    });

    sourceId = await createSource({ db, input });
    await attachSourceToRun({ db, jobRunId, sourceId });

    const storageAccount = input.storageProviderAccountId
      ? await getActiveStorageProviderAccountForUpload({
          db,
          providerId: input.storageProviderAccountId,
        })
      : null;

    if (storageAccount && storageAccount.providerType !== input.storageProvider) {
      throw new IntakeError({
        errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_MISMATCH",
        message: "storageProvider must match the selected storage account type.",
        category: "validation",
      });
    }

    const uploadProvider = (storageAccount?.providerType ??
      input.storageProvider) as StorageProvider;

    const media = await runTrackedStep<ResolvedMedia>({
      db,
      jobRunId,
      nodeId: "resolve-media-url",
      nodeType: "source.media.resolve",
      execute: () => resolveMediaUrl(input),
    });

    const upload = await runTrackedStep<StorageUploadResult>({
      db,
      jobRunId,
      nodeId: "upload-storage",
      nodeType: "storage.upload",
      execute: () =>
        uploadResolvedMedia({
          provider: uploadProvider,
          media,
          account: storageAccount
            ? {
                accountId: storageAccount._id.toHexString(),
                label: storageAccount.label,
                secrets: storageAccount.secrets,
              }
            : undefined,
        }),
    });

    const assetId = await runTrackedStep<ObjectId>({
      db,
      jobRunId,
      nodeId: "persist-asset-metadata",
      nodeType: "asset.metadata.persist",
      execute: () =>
        createAsset({
          db,
          jobRunId,
          sourceId: sourceId as ObjectId,
          media,
          upload,
        }),
    });

    await completeJobRun({
      db,
      jobRunId,
      sourceId,
      assetId,
      outputSummary: {
        storageProvider: upload.storageProvider,
        storageProviderAccountId: upload.storageProviderAccountId ?? null,
        storageProviderLabel: upload.storageProviderLabel ?? null,
        storagePointer: upload.storagePointer,
        publicUrl: upload.publicUrl ?? null,
      },
    });

    return {
      runId: jobRunId.toHexString(),
      sourceId: sourceId.toHexString(),
      assetId: assetId.toHexString(),
      status: "success",
      storageProvider: upload.storageProvider,
      storageProviderAccountId: upload.storageProviderAccountId,
      storagePointer: upload.storagePointer,
    };
  } catch (error) {
    const intakeError = normalizeIntakeError(error);

    await failJobRun({
      db,
      jobRunId,
      errorCode: intakeError.errorCode,
      errorMessage: intakeError.message,
    });

    return {
      runId: jobRunId.toHexString(),
      sourceId: sourceId?.toHexString(),
      status: "failed",
      storageProvider: rawInput.storageProvider,
      storageProviderAccountId: rawInput.storageProviderAccountId,
      errorCode: intakeError.errorCode,
      errorMessage: intakeError.message,
    };
  }
}
