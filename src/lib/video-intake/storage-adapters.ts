import { getAppEnv } from "@/lib/config/env";
import type { StorageProviderSecretMap } from "@/lib/storage-providers/types";

import {
  IntakeError,
  type ResolvedMedia,
  type StorageProvider,
  type StorageUploadResult,
} from "./types";
import { shouldFallbackToBinaryUpload } from "./telegram-fallback";

type StorageUploadAccount = {
  accountId?: string;
  label?: string;
  secrets?: StorageProviderSecretMap;
};

type TelegramResponse = {
  ok: boolean;
  description?: string;
  result?: {
    message_id?: number;
    video?: {
      file_id?: string;
      file_unique_id?: string;
      duration?: number;
      file_name?: string;
      mime_type?: string;
      file_size?: number;
    };
  };
};

function buildSourceFetchHeaders(
  mediaUrl: string,
  requestHeaders?: Record<string, string>,
) {
  const headers = new Headers();

  if (requestHeaders) {
    for (const [key, value] of Object.entries(requestHeaders)) {
      headers.set(key, value);
    }
  }

  if (!headers.has("user-agent")) {
    headers.set(
      "user-agent",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    );
  }

  if (!headers.has("accept")) {
    headers.set("accept", "video/*,*/*;q=0.8");
  }

  if (!headers.has("accept-language")) {
    headers.set("accept-language", "en-US,en;q=0.9,vi;q=0.8");
  }

  if (!headers.has("referer")) {
    headers.set("referer", mediaUrl);
  }

  return headers;
}

async function fetchSourceMedia(
  mediaUrl: string,
  requestHeaders?: Record<string, string>,
) {
  const headers = buildSourceFetchHeaders(mediaUrl, requestHeaders);
  const firstTry = await fetch(mediaUrl, {
    cache: "no-store",
    headers,
  });

  if (firstTry.status !== 401 && firstTry.status !== 403) {
    return firstTry;
  }

  return fetch(mediaUrl, {
    cache: "no-store",
    headers,
  });
}

function normalizeTelegramError(payload: TelegramResponse, fallbackMessage: string) {
  return payload.description ?? fallbackMessage;
}

async function uploadToTelegramByBinary({
  media,
  botToken,
  chatId,
  account,
}: {
  media: ResolvedMedia;
  botToken: string;
  chatId: string;
  account?: StorageUploadAccount;
}): Promise<StorageUploadResult> {
  const mediaResponse = await fetchSourceMedia(
    media.directMediaUrl,
    media.requestHeaders,
  );

  if (!mediaResponse.ok) {
    throw new IntakeError({
      errorCode: "STG_TELEGRAM_SOURCE_STREAM_FAILED",
      message: `Could not open source media URL. Status ${mediaResponse.status}.`,
      category: "dependency",
      retryable: mediaResponse.status >= 500,
    });
  }

  const arrayBuffer = await mediaResponse.arrayBuffer();
  const mimeType =
    mediaResponse.headers.get("content-type") ?? media.mimeType ?? "video/mp4";
  const filename = `${Date.now()}-omnivideo-intake.mp4`;
  const formData = new FormData();
  formData.append("chat_id", chatId);
  formData.append("supports_streaming", "true");
  formData.append(
    "caption",
    media.title ? `OmniVideo intake: ${media.title}` : "OmniVideo intake",
  );
  formData.append("video", new Blob([arrayBuffer], { type: mimeType }), filename);

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendVideo`,
    {
      method: "POST",
      body: formData,
    },
  );
  const payload = (await response.json()) as TelegramResponse;

  if (!response.ok || !payload.ok) {
    throw new IntakeError({
      errorCode: "STG_TELEGRAM_UPLOAD_FAILED",
      message: normalizeTelegramError(payload, "Telegram upload failed."),
      category: "provider",
      retryable: response.status >= 500,
    });
  }

  return {
    storageProvider: "telegram",
    storageProviderAccountId: account?.accountId,
    storageProviderLabel: account?.label,
    providerAssetId: payload.result?.video?.file_id,
    mimeType: payload.result?.video?.mime_type ?? mimeType,
    sizeBytes: payload.result?.video?.file_size ?? media.sizeBytes,
    storagePointer: {
      chatId,
      messageId: payload.result?.message_id,
      fileId: payload.result?.video?.file_id,
      fileUniqueId: payload.result?.video?.file_unique_id,
      uploadMode: "binary",
    },
  };
}

async function uploadToTelegram(
  media: ResolvedMedia,
  account?: StorageUploadAccount,
): Promise<StorageUploadResult> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = getAppEnv();
  const botToken = account?.secrets?.botToken ?? TELEGRAM_BOT_TOKEN;
  const chatId = account?.secrets?.chatId ?? TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new IntakeError({
      errorCode: "STG_TELEGRAM_ENV_MISSING",
      message: "Missing Telegram botToken or chatId.",
      category: "provider",
      retryable: false,
    });
  }

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/sendVideo`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        video: media.directMediaUrl,
        caption: media.title ? `OmniVideo intake: ${media.title}` : "OmniVideo intake",
        supports_streaming: true,
      }),
    },
  );

  const payload = (await response.json()) as TelegramResponse;

  if (!response.ok || !payload.ok) {
    const errorMessage = normalizeTelegramError(payload, "Telegram upload failed.");

    if (shouldFallbackToBinaryUpload(errorMessage)) {
      return uploadToTelegramByBinary({
        media,
        botToken,
        chatId,
        account,
      });
    }

    throw new IntakeError({
      errorCode: "STG_TELEGRAM_UPLOAD_FAILED",
      message: errorMessage,
      category: "provider",
      retryable: response.status >= 500,
    });
  }

  return {
    storageProvider: "telegram",
    storageProviderAccountId: account?.accountId,
    storageProviderLabel: account?.label,
    providerAssetId: payload.result?.video?.file_id,
    mimeType: payload.result?.video?.mime_type ?? media.mimeType,
    sizeBytes: payload.result?.video?.file_size ?? media.sizeBytes,
    storagePointer: {
      chatId,
      messageId: payload.result?.message_id,
      fileId: payload.result?.video?.file_id,
      fileUniqueId: payload.result?.video?.file_unique_id,
      uploadMode: "remote-url",
    },
  };
}

type DriveFileResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  webViewLink?: string;
  size?: string;
};

async function uploadToDrive(
  media: ResolvedMedia,
  account?: StorageUploadAccount,
): Promise<StorageUploadResult> {
  const { GOOGLE_DRIVE_ACCESS_TOKEN, GOOGLE_DRIVE_FOLDER_ID } = getAppEnv();
  const accessToken = account?.secrets?.accessToken ?? GOOGLE_DRIVE_ACCESS_TOKEN;
  const folderId = account?.secrets?.folderId ?? GOOGLE_DRIVE_FOLDER_ID;

  if (!accessToken) {
    throw new IntakeError({
      errorCode: "STG_DRIVE_ENV_MISSING",
      message: "Missing Google Drive accessToken.",
      category: "provider",
      retryable: false,
    });
  }

  const filename = `${Date.now()}-omnivideo-intake.mp4`;
  const metadata = {
    name: filename,
    ...(folderId ? { parents: [folderId] } : {}),
  };

  const sessionResponse = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,webViewLink,size",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json; charset=UTF-8",
        "x-upload-content-type": media.mimeType ?? "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );

  const uploadUrl = sessionResponse.headers.get("location");

  if (!sessionResponse.ok || !uploadUrl) {
    throw new IntakeError({
      errorCode: "STG_DRIVE_SESSION_FAILED",
      message: `Google Drive resumable session failed with status ${sessionResponse.status}.`,
      category: "provider",
      retryable: sessionResponse.status >= 500,
    });
  }

  const mediaResponse = await fetchSourceMedia(
    media.directMediaUrl,
    media.requestHeaders,
  );

  if (!mediaResponse.ok || !mediaResponse.body) {
    throw new IntakeError({
      errorCode: "STG_DRIVE_SOURCE_STREAM_FAILED",
      message: `Could not open source media stream. Status ${mediaResponse.status}.`,
      category: "dependency",
      retryable: mediaResponse.status >= 500,
    });
  }

  const headers = new Headers({
    "content-type":
      mediaResponse.headers.get("content-type") ?? media.mimeType ?? "video/mp4",
  });
  const contentLength = mediaResponse.headers.get("content-length");

  if (contentLength) {
    headers.set("content-length", contentLength);
  }

  const uploadRequest: RequestInit & { duplex: "half" } = {
    method: "PUT",
    headers,
    body: mediaResponse.body,
    duplex: "half",
  };

  const uploadResponse = await fetch(uploadUrl, uploadRequest);

  if (!uploadResponse.ok) {
    throw new IntakeError({
      errorCode: "STG_DRIVE_UPLOAD_FAILED",
      message: `Google Drive upload failed with status ${uploadResponse.status}.`,
      category: "provider",
      retryable: uploadResponse.status >= 500,
    });
  }

  const payload = (await uploadResponse.json()) as DriveFileResponse;

  return {
    storageProvider: "drive",
    storageProviderAccountId: account?.accountId,
    storageProviderLabel: account?.label,
    providerAssetId: payload.id,
    publicUrl: payload.webViewLink,
    mimeType: payload.mimeType ?? media.mimeType,
    sizeBytes: payload.size ? Number(payload.size) : media.sizeBytes,
    storagePointer: {
      fileId: payload.id,
      name: payload.name,
      webViewLink: payload.webViewLink,
    },
  };
}

export async function uploadResolvedMedia({
  provider,
  media,
  account,
}: {
  provider: StorageProvider;
  media: ResolvedMedia;
  account?: StorageUploadAccount;
}): Promise<StorageUploadResult> {
  if (provider === "telegram") {
    return uploadToTelegram(media, account);
  }

  return uploadToDrive(media, account);
}
