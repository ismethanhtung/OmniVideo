type StorageAssetLike = {
  storageProvider?: string | null;
  publicUrl?: string | null;
  storagePointer?: Record<string, unknown> | null;
};

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function toNumberValue(value: unknown) {
  return typeof value === "number" ? value : null;
}

function telegramMessageUrl(pointer?: Record<string, unknown> | null) {
  if (!pointer) {
    return null;
  }

  const chatId = toStringValue(pointer.chatId);
  const messageId = toNumberValue(pointer.messageId);

  if (!chatId || !messageId) {
    return null;
  }

  if (chatId.startsWith("@")) {
    return `https://t.me/${chatId.slice(1)}/${messageId}`;
  }

  if (chatId.startsWith("-100")) {
    return `https://t.me/c/${chatId.slice(4)}/${messageId}`;
  }

  return null;
}

export function buildStorageLocationUrl(asset: StorageAssetLike) {
  if (asset.publicUrl) {
    return asset.publicUrl;
  }

  const pointer = asset.storagePointer ?? null;
  const webViewLink = toStringValue(pointer?.webViewLink);
  if (webViewLink) {
    return webViewLink;
  }

  if (asset.storageProvider === "telegram") {
    return telegramMessageUrl(pointer);
  }

  return null;
}
