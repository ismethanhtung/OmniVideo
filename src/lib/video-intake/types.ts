import type { ObjectId } from "mongodb";

export type OriginPlatform =
  | "youtube"
  | "tiktok"
  | "douyin"
  | "facebook"
  | "instagram"
  | "bilibili"
  | "direct"
  | "other";

export type StorageProvider = "telegram" | "drive";
export type IntakeQualityPreference =
  | "best"
  | "1080p"
  | "720p"
  | "480p"
  | "360p";

export type IntakeRunStatus = "queued" | "running" | "failed" | "success";

export type IntakeInput = {
  sourceUrl: string;
  storageProvider: StorageProvider;
  storageProviderAccountId?: string;
  tags: string[];
  qualityPreference?: IntakeQualityPreference;
  title?: string;
  languageHint?: string;
  contentIntent?: string;
  ownershipStatus?: string;
};

export type ValidatedIntakeInput = IntakeInput & {
  canonicalUrl: string;
  originPlatform: OriginPlatform;
};

export type ResolvedMedia = {
  originalUrl: string;
  directMediaUrl: string;
  originPlatform: OriginPlatform;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  requestedQuality?: IntakeQualityPreference;
  requestHeaders?: Record<string, string>;
  resolver: "direct-url" | "external-resolver" | "internal-resolver";
};

export type StorageUploadResult = {
  storageProvider: StorageProvider;
  storageProviderAccountId?: string;
  storageProviderLabel?: string;
  storagePointer: Record<string, unknown>;
  publicUrl?: string;
  providerAssetId?: string;
  mimeType?: string;
  sizeBytes?: number;
};

export type IntakeRunResult = {
  runId: string;
  sourceId?: string;
  assetId?: string;
  status: IntakeRunStatus;
  storageProvider: StorageProvider;
  storageProviderAccountId?: string;
  storagePointer?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

export type StepContext = {
  jobRunId: ObjectId;
  nodeId: string;
  nodeType: string;
};

export class IntakeError extends Error {
  readonly errorCode: string;

  readonly category: "validation" | "dependency" | "provider" | "system";

  readonly retryable: boolean;

  constructor({
    errorCode,
    message,
    category,
    retryable = false,
  }: {
    errorCode: string;
    message: string;
    category: IntakeError["category"];
    retryable?: boolean;
  }) {
    super(message);
    this.name = "IntakeError";
    this.errorCode = errorCode;
    this.category = category;
    this.retryable = retryable;
  }
}
