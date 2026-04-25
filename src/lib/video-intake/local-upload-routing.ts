import { TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES } from "../storage/telegram-download";

type UploadProviderType = "telegram" | "drive";

export type UploadProviderAccountOption = {
  _id: string;
  providerType: UploadProviderType;
  label: string;
  priority: number;
  status: "active" | "paused" | "error";
};

export function needsDriveConfirmationForLargeLocalFile({
  fileSizeBytes,
  selectedProviderType,
}: {
  fileSizeBytes: number;
  selectedProviderType: UploadProviderType;
}) {
  return (
    selectedProviderType === "telegram" &&
    fileSizeBytes > TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES
  );
}

export function pickBestDriveFallbackAccount(
  accounts: UploadProviderAccountOption[],
) {
  const driveAccounts = accounts
    .filter((account) => account.status === "active")
    .filter((account) => account.providerType === "drive")
    .sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));

  return driveAccounts[0] ?? null;
}
