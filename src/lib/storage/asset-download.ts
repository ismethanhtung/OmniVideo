import { getAppEnv } from "@/lib/config/env";
import { getStorageProviderAccountById } from "@/lib/storage-providers/repository";
import type { StorageProviderDocument } from "@/lib/storage-providers/types";
import {
  buildTelegramTooBigDownloadMessage,
  isTelegramBotDownloadTooBig,
  isTelegramGetFileTooBigError,
} from "@/lib/storage/telegram-download";
import { resolveDriveAccessToken } from "./drive-service-account";
import {
  readGoogleDriveErrorMessage,
  withGoogleDrivePermissionHint,
} from "./google-drive-error";

import type { Db, WithId } from "mongodb";

type StoredAssetDocument = {
  _id: unknown;
  storageProvider?: string;
  storagePointer?: Record<string, unknown>;
  publicUrl?: string | null;
  providerAssetId?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  metadata?: {
    title?: string | null;
  };
  createdFrom?: {
    storageProviderAccountId?: string | null;
  };
};

type TelegramFileResponse = {
  ok: boolean;
  description?: string;
  result?: {
    file_path?: string;
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeFilename(value: string | null | undefined) {
  const fallback = "omnivideo-asset";
  const base = (value || fallback)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return `${base || fallback}.mp4`;
}

async function getProviderForAsset({
  db,
  asset,
}: {
  db: Db;
  asset: StoredAssetDocument;
}): Promise<WithId<StorageProviderDocument> | null> {
  const providerId = stringValue(asset.createdFrom?.storageProviderAccountId);

  if (!providerId) {
    return null;
  }

  return getStorageProviderAccountById({ db, providerId });
}

async function resolveTelegramDownload({
  db,
  asset,
  rangeHeader,
}: {
  db: Db;
  asset: StoredAssetDocument;
  rangeHeader?: string | null;
}) {
  const provider = await getProviderForAsset({ db, asset });
  const botToken = provider?.secrets.botToken ?? getAppEnv().TELEGRAM_BOT_TOKEN;
  const fileId =
    stringValue(asset.storagePointer?.fileId) || stringValue(asset.providerAssetId);

  if (!botToken || !fileId) {
    return {
      ok: false as const,
      status: 422,
      errorCode: "STG_TELEGRAM_DOWNLOAD_NOT_AVAILABLE",
      error: "Telegram fileId or bot token is missing for this asset.",
    };
  }

  if (isTelegramBotDownloadTooBig(asset.sizeBytes)) {
    return {
      ok: false as const,
      status: 422,
      errorCode: "STG_TELEGRAM_FILE_TOO_BIG_FOR_BOT_DOWNLOAD",
      error: buildTelegramTooBigDownloadMessage(asset.sizeBytes),
    };
  }

  const metadataResponse = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
    { cache: "no-store" },
  );
  const metadata = (await metadataResponse.json()) as TelegramFileResponse;

  if (!metadataResponse.ok || !metadata.ok || !metadata.result?.file_path) {
    const tooBig = isTelegramGetFileTooBigError(metadata.description);
    return {
      ok: false as const,
      status: metadataResponse.status || 502,
      errorCode: tooBig
        ? "STG_TELEGRAM_FILE_TOO_BIG_FOR_BOT_DOWNLOAD"
        : "STG_TELEGRAM_GET_FILE_FAILED",
      error: tooBig
        ? buildTelegramTooBigDownloadMessage(asset.sizeBytes)
        : (metadata.description ?? "Telegram getFile failed."),
    };
  }

  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${botToken}/${metadata.result.file_path}`,
    {
      cache: "no-store",
      headers: rangeHeader ? { range: rangeHeader } : undefined,
    },
  );

  if (!fileResponse.ok || !fileResponse.body) {
    return {
      ok: false as const,
      status: fileResponse.status || 502,
      errorCode: "STG_TELEGRAM_FILE_DOWNLOAD_FAILED",
      error: `Telegram file download failed with status ${fileResponse.status}.`,
    };
  }

  return {
    ok: true as const,
    response: fileResponse,
  };
}

async function resolveDriveDownload({
  db,
  asset,
  rangeHeader,
}: {
  db: Db;
  asset: StoredAssetDocument;
  rangeHeader?: string | null;
}) {
  const provider = await getProviderForAsset({ db, asset });
  const accessToken = await resolveDriveAccessToken({
    accessToken: provider?.secrets.accessToken ?? getAppEnv().GOOGLE_DRIVE_ACCESS_TOKEN,
    driveServiceAccountJson: provider?.secrets.driveServiceAccountJson,
  });
  const fileId =
    stringValue(asset.storagePointer?.fileId) || stringValue(asset.providerAssetId);

  if (!accessToken || !fileId) {
    return {
      ok: false as const,
      status: 422,
      errorCode: "STG_DRIVE_DOWNLOAD_NOT_AVAILABLE",
      error: "Google Drive fileId or access token is missing for this asset.",
    };
  }

  const fileResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      cache: "no-store",
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(rangeHeader ? { range: rangeHeader } : {}),
      },
    },
  );

  if (!fileResponse.ok || !fileResponse.body) {
    const message = await readGoogleDriveErrorMessage(
      fileResponse,
      `Google Drive file download failed with status ${fileResponse.status}.`,
    );
    return {
      ok: false as const,
      status: fileResponse.status || 502,
      errorCode: "STG_DRIVE_FILE_DOWNLOAD_FAILED",
      error: withGoogleDrivePermissionHint(message),
    };
  }

  return {
    ok: true as const,
    response: fileResponse,
  };
}

export async function resolveAssetDownload({
  db,
  asset,
  disposition = "attachment",
  rangeHeader,
}: {
  db: Db;
  asset: StoredAssetDocument;
  disposition?: "attachment" | "inline";
  rangeHeader?: string | null;
}) {
  const result =
    asset.storageProvider === "telegram"
      ? await resolveTelegramDownload({ db, asset, rangeHeader })
      : await resolveDriveDownload({ db, asset, rangeHeader });

  if (!result.ok) {
    return result;
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    result.response.headers.get("content-type") ?? asset.mimeType ?? "video/mp4",
  );
  headers.set(
    "content-disposition",
    `${disposition}; filename="${safeFilename(asset.metadata?.title)}"`,
  );

  const contentLength = result.response.headers.get("content-length");
  if (contentLength) {
    headers.set("content-length", contentLength);
  }

  const contentRange = result.response.headers.get("content-range");
  if (contentRange) {
    headers.set("content-range", contentRange);
  }

  const acceptRanges = result.response.headers.get("accept-ranges");
  if (acceptRanges) {
    headers.set("accept-ranges", acceptRanges);
  }

  return {
    ok: true as const,
    status: result.response.status,
    body: result.response.body,
    headers,
  };
}
