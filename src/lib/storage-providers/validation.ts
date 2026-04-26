import {
  StorageProviderError,
  type StorageProviderCreateInput,
  type StorageProviderStatus,
  type StorageProviderSecretMap,
  type StorageProviderType,
  type ValidatedStorageProviderInput,
} from "./types";

const PROVIDER_TYPES = new Set<StorageProviderType>([
  "telegram",
  "drive",
  "s3",
  "local",
  "other",
]);

const PROVIDER_STATUSES = new Set<StorageProviderStatus>([
  "active",
  "paused",
  "error",
]);

const REQUIRED_SECRET_FIELDS: Record<StorageProviderType, string[]> = {
  telegram: ["botToken", "chatId"],
  drive: [],
  s3: ["endpoint", "bucket", "accessKeyId", "secretAccessKey"],
  local: ["basePath"],
  other: ["connectionJson"],
};

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function normalizeSecrets(value: unknown): StorageProviderSecretMap {
  if (!value || typeof value !== "object") {
    return {};
  }

  const payload = value as Record<string, unknown>;

  return {
    botToken: readString(payload.botToken),
    chatId: readString(payload.chatId),
    accessToken: readString(payload.accessToken),
    refreshToken: readString(payload.refreshToken),
    folderId: readString(payload.folderId),
    endpoint: readString(payload.endpoint),
    bucket: readString(payload.bucket),
    region: readString(payload.region),
    accessKeyId: readString(payload.accessKeyId),
    secretAccessKey: readString(payload.secretAccessKey),
    basePath: readString(payload.basePath),
    connectionJson: readString(payload.connectionJson),
  };
}

export function validateStorageProviderCreateInput(
  input: unknown,
): ValidatedStorageProviderInput {
  if (!input || typeof input !== "object") {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const payload = input as Partial<StorageProviderCreateInput>;

  if (
    typeof payload.providerType !== "string" ||
    !PROVIDER_TYPES.has(payload.providerType)
  ) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_TYPE_INVALID",
      message: "providerType must be telegram, drive, s3, local, or other.",
    });
  }

  const label = readString(payload.label);

  if (!label) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_LABEL_REQUIRED",
      message: "label is required.",
    });
  }

  const status =
    typeof payload.status === "string" && PROVIDER_STATUSES.has(payload.status)
      ? payload.status
      : "active";

  const priority =
    typeof payload.priority === "number" && Number.isFinite(payload.priority)
      ? Math.max(0, Math.min(100, Math.round(payload.priority)))
      : 50;

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  const secrets = normalizeSecrets(payload.secrets);
  const missingFields = REQUIRED_SECRET_FIELDS[payload.providerType].filter(
    (field) => !secrets[field as keyof StorageProviderSecretMap],
  );

  if (
    payload.providerType === "drive" &&
    !secrets.accessToken
  ) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_SECRET_REQUIRED",
      message: "Missing required secret fields: accessToken.",
    });
  }

  if (missingFields.length > 0) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_SECRET_REQUIRED",
      message: `Missing required secret fields: ${missingFields.join(", ")}.`,
    });
  }

  return {
    providerType: payload.providerType,
    label,
    description: readString(payload.description) ?? null,
    status,
    priority,
    tags,
    secrets,
  };
}

export function validateStorageProviderStatus(input: unknown): StorageProviderStatus {
  if (!input || typeof input !== "object") {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_STATUS_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const status = (input as { status?: unknown }).status;

  if (
    typeof status !== "string" ||
    !PROVIDER_STATUSES.has(status as StorageProviderStatus)
  ) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_STATUS_INVALID",
      message: "status must be active, paused, or error.",
    });
  }

  return status as StorageProviderStatus;
}

export type ValidatedStorageProviderUpdateInput = {
  label?: string;
  description?: string | null;
  status?: StorageProviderStatus;
  priority?: number;
  tags?: string[];
  secrets?: StorageProviderSecretMap;
};

export function validateStorageProviderUpdateInput(
  input: unknown,
): ValidatedStorageProviderUpdateInput {
  if (!input || typeof input !== "object") {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const payload = input as Partial<StorageProviderCreateInput>;
  const result: ValidatedStorageProviderUpdateInput = {};

  if (typeof payload.label === "string") {
    const label = payload.label.trim();

    if (!label) {
      throw new StorageProviderError({
        errorCode: "VAL_STORAGE_PROVIDER_LABEL_REQUIRED",
        message: "label cannot be empty.",
      });
    }

    result.label = label;
  }

  if (typeof payload.description === "string") {
    result.description = payload.description.trim() || null;
  }

  if (typeof payload.status === "string") {
    if (!PROVIDER_STATUSES.has(payload.status)) {
      throw new StorageProviderError({
        errorCode: "VAL_STORAGE_PROVIDER_STATUS_INVALID",
        message: "status must be active, paused, or error.",
      });
    }

    result.status = payload.status;
  }

  if (typeof payload.priority === "number" && Number.isFinite(payload.priority)) {
    result.priority = Math.max(0, Math.min(100, Math.round(payload.priority)));
  }

  if (Array.isArray(payload.tags)) {
    result.tags = payload.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  if (payload.secrets !== undefined) {
    result.secrets = normalizeSecrets(payload.secrets);
  }

  if (Object.keys(result).length === 0) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_UPDATE_EMPTY",
      message:
        "At least one field is required for update (label, description, status, priority, tags, secrets).",
    });
  }

  return result;
}
