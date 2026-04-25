export const TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES = 20 * 1024 * 1024;

function formatMiB(value: number) {
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function isTelegramGetFileTooBigError(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  return message.toLowerCase().includes("file is too big");
}

export function isTelegramBotDownloadTooBig(sizeBytes?: number | null) {
  return typeof sizeBytes === "number" && sizeBytes > TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES;
}

export function buildTelegramTooBigDownloadMessage(sizeBytes?: number | null) {
  const limitLabel = formatMiB(TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES);

  if (!sizeBytes || sizeBytes <= 0) {
    return `Telegram Bot API cannot download files larger than ${limitLabel}.`;
  }

  return `Telegram Bot API cannot download files larger than ${limitLabel}. This asset is ${formatMiB(sizeBytes)}.`;
}

export function getTelegramDownloadBlockedReason({
  storageProvider,
  sizeBytes,
}: {
  storageProvider?: string;
  sizeBytes?: number | null;
}) {
  if (storageProvider !== "telegram") {
    return null;
  }

  if (!isTelegramBotDownloadTooBig(sizeBytes)) {
    return null;
  }

  return buildTelegramTooBigDownloadMessage(sizeBytes);
}
