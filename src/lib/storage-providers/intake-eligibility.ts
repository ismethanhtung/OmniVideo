import {
  StorageProviderError,
  type StorageProviderDocument,
} from "./types";

const INTAKE_UPLOAD_PROVIDER_TYPES = new Set(["telegram", "drive"]);

export function assertStorageProviderCanUploadForIntake(
  provider: Pick<StorageProviderDocument, "providerType" | "status">,
) {
  if (provider.status !== "active") {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_NOT_ACTIVE",
      message: "Storage provider account must be active before intake upload.",
    });
  }

  if (!INTAKE_UPLOAD_PROVIDER_TYPES.has(provider.providerType)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_UNSUPPORTED_FOR_INTAKE",
      message: "Video Intake currently supports Telegram and Google Drive accounts.",
    });
  }
}
