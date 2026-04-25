export type StorageProviderType = "telegram" | "drive" | "s3" | "local" | "other";

export type StorageProviderStatus = "active" | "paused" | "error";

export type StorageProviderSecretMap = {
  botToken?: string;
  chatId?: string;
  accessToken?: string;
  folderId?: string;
  endpoint?: string;
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  basePath?: string;
  connectionJson?: string;
};

export type StorageProviderCreateInput = {
  providerType: StorageProviderType;
  label: string;
  description?: string;
  status?: StorageProviderStatus;
  priority?: number;
  tags?: string[];
  secrets?: StorageProviderSecretMap;
};

export type ValidatedStorageProviderInput = {
  providerType: StorageProviderType;
  label: string;
  description: string | null;
  status: StorageProviderStatus;
  priority: number;
  tags: string[];
  secrets: StorageProviderSecretMap;
};

export type StorageProviderDocument = ValidatedStorageProviderInput & {
  usage: {
    assetCountApprox: number;
    lastUsedAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type SanitizedStorageProvider = Omit<StorageProviderDocument, "secrets"> & {
  _id: string;
  secretSummary: Record<string, { configured: boolean; preview: string | null }>;
};

export class StorageProviderError extends Error {
  readonly errorCode: string;

  readonly statusCode: number;

  constructor({
    errorCode,
    message,
    statusCode = 400,
  }: {
    errorCode: string;
    message: string;
    statusCode?: number;
  }) {
    super(message);
    this.name = "StorageProviderError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}
