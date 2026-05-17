import {
  buildFolderAssetTags,
  inferFolderFromTags,
  normalizeAssetFolderName,
} from "@/lib/storage/asset-folder";

import {
  IntakeError,
  type LocalIntakeInput,
  type ValidatedLocalIntakeInput,
} from "./types";

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const SUPPORTED_STORAGE_PROVIDERS = new Set(["telegram", "drive"]);

export function validateLocalIntakeInput(
  payload: unknown,
): ValidatedLocalIntakeInput {
  if (!payload || typeof payload !== "object") {
    throw new IntakeError({
      errorCode: "VAL_LOCAL_INTAKE_BODY_INVALID",
      message: "Local intake payload must be an object.",
      category: "validation",
    });
  }

  const input = payload as Partial<LocalIntakeInput>;
  const storageProvider = input.storageProvider?.trim();

  if (
    typeof storageProvider !== "string" ||
    !SUPPORTED_STORAGE_PROVIDERS.has(storageProvider)
  ) {
    throw new IntakeError({
      errorCode: "VAL_STORAGE_PROVIDER_INVALID",
      message: "storageProvider must be telegram or drive.",
      category: "validation",
    });
  }

  const storageProviderAccountId = input.storageProviderAccountId?.trim();

  if (!storageProviderAccountId) {
    throw new IntakeError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
      message: "storageProviderAccountId is required.",
      category: "validation",
    });
  }

  if (!OBJECT_ID_PATTERN.test(storageProviderAccountId)) {
    throw new IntakeError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_ID_INVALID",
      message: "storageProviderAccountId must be a valid Mongo ObjectId.",
      category: "validation",
    });
  }

  const fileName = input.fileName?.trim();

  if (!fileName) {
    throw new IntakeError({
      errorCode: "VAL_LOCAL_FILE_REQUIRED",
      message: "video file is required.",
      category: "validation",
    });
  }

  if (
    typeof input.fileSizeBytes !== "number" ||
    !Number.isFinite(input.fileSizeBytes) ||
    input.fileSizeBytes <= 0
  ) {
    throw new IntakeError({
      errorCode: "VAL_LOCAL_FILE_SIZE_INVALID",
      message: "fileSizeBytes must be greater than 0.",
      category: "validation",
    });
  }

  if (!(input.fileBytes instanceof Uint8Array) || input.fileBytes.length === 0) {
    throw new IntakeError({
      errorCode: "VAL_LOCAL_FILE_BYTES_INVALID",
      message: "fileBytes must be a non-empty Uint8Array.",
      category: "validation",
    });
  }

  const submittedTags = Array.isArray(input.tags)
    ? input.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
  const folder =
    normalizeAssetFolderName(input.folder) || inferFolderFromTags(submittedTags);

  if (!folder) {
    throw new IntakeError({
      errorCode: "VAL_SOURCE_FOLDER_REQUIRED",
      message: "folder is required.",
      category: "validation",
    });
  }

  const tags = buildFolderAssetTags({
    folder,
    lifecycle: submittedTags.some(
      (tag) => tag.toLocaleLowerCase("vi-VN") === "processed",
    )
      ? "processed"
      : "raw",
    extraTags: submittedTags,
  });

  return {
    storageProvider: storageProvider as "telegram" | "drive",
    storageProviderAccountId,
    folder,
    tags,
    title: input.title?.trim() || undefined,
    description: input.description?.trim() || undefined,
    languageHint: input.languageHint?.trim() || undefined,
    contentIntent: input.contentIntent?.trim() || "other",
    ownershipStatus: input.ownershipStatus?.trim() || "unknown",
    fileName,
    mimeType: input.mimeType?.trim() || undefined,
    fileSizeBytes: input.fileSizeBytes,
    fileBytes: input.fileBytes,
  };
}
