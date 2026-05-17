import type { Db, ObjectId } from "mongodb";

import { getActiveStorageProviderAccountForUpload } from "@/lib/storage-providers/repository";
import { StorageProviderError } from "@/lib/storage-providers/types";

import { validateLocalIntakeInput } from "./local-validation";
import { LOCAL_INTAKE_PIPELINE_DEFINITION } from "./pipeline-definition";
import {
  attachSourceToRun,
  completeJobRun,
  completeStepRun,
  createAsset,
  createFileSource,
  createJobRun,
  createStepRun,
  failJobRun,
  failStepRun,
  getIntakeDb,
} from "./repository";
import { uploadLocalMedia } from "./storage-adapters";
import {
  IntakeError,
  type IntakeRunResult,
  type LocalIntakeInput,
  type ResolvedMedia,
  type StorageProvider,
  type StorageUploadResult,
  type ValidatedLocalIntakeInput,
} from "./types";

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
    errorCode: "SYS_LOCAL_INTAKE_UNKNOWN",
    message: error instanceof Error ? error.message : "Unknown local intake error.",
    category: "system",
    retryable: false,
  });
}

function buildLocalSourceUrl(filename: string) {
  return `local-file://${encodeURIComponent(filename)}`;
}

export async function runLocalFileIntakePipeline(
  rawInput: LocalIntakeInput,
): Promise<IntakeRunResult> {
  const db = await getIntakeDb();
  const jobRunId = await createJobRun({
    db,
    pipelineId: "mvp-local-intake-to-storage",
    pipelineSnapshot: LOCAL_INTAKE_PIPELINE_DEFINITION,
    inputSnapshot: {
      sourceType: "file",
      fileName: rawInput.fileName,
      mimeType: rawInput.mimeType ?? null,
      fileSizeBytes: rawInput.fileSizeBytes,
      storageProvider: rawInput.storageProvider,
      storageProviderAccountId: rawInput.storageProviderAccountId,
      folder: rawInput.folder ?? null,
      tags: rawInput.tags,
      title: rawInput.title ?? null,
      description: rawInput.description ?? null,
    },
  });

  let sourceId: ObjectId | undefined;

  try {
    const input = await runTrackedStep<ValidatedLocalIntakeInput>({
      db,
      jobRunId,
      nodeId: "validate-local-file",
      nodeType: "source.file.validate",
      execute: () => validateLocalIntakeInput(rawInput),
    });

    sourceId = await createFileSource({ db, input });
    await attachSourceToRun({ db, jobRunId, sourceId });

    const storageAccount = await getActiveStorageProviderAccountForUpload({
      db,
      providerId: input.storageProviderAccountId,
    });

    if (storageAccount.providerType !== input.storageProvider) {
      throw new IntakeError({
        errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_MISMATCH",
        message: "storageProvider must match the selected storage account type.",
        category: "validation",
      });
    }

    const uploadProvider = storageAccount.providerType as StorageProvider;
    const localSourceUrl = buildLocalSourceUrl(input.fileName);
    const media: ResolvedMedia = {
      originalUrl: localSourceUrl,
      directMediaUrl: localSourceUrl,
      originPlatform: "other",
      title: input.title ?? input.fileName,
      description: input.description,
      mimeType: input.mimeType,
      sizeBytes: input.fileSizeBytes,
      requestedQuality: "best",
      resolver: "local-file",
    };

    const upload = await runTrackedStep<StorageUploadResult>({
      db,
      jobRunId,
      nodeId: "upload-storage",
      nodeType: "storage.upload",
      execute: () =>
        uploadLocalMedia({
          provider: uploadProvider,
          file: {
            filename: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.fileSizeBytes,
            bytes: input.fileBytes,
            title: input.title ?? input.fileName,
          },
          account: {
            accountId: storageAccount._id.toHexString(),
            label: storageAccount.label,
            secrets: storageAccount.secrets,
          },
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
          folder: input.folder,
          tags: input.tags,
          pipelineId: "mvp-local-intake-to-storage",
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
        sourceType: "file",
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
