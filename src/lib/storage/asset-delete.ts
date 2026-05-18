import { getAppEnv } from "@/lib/config/env";
import { getStorageProviderAccountById } from "@/lib/storage-providers/repository";
import { readGoogleDriveErrorMessage, withGoogleDrivePermissionHint } from "./google-drive-error";
import { resolveDriveRuntimeAccessToken } from "./drive-token";

import type { Db } from "mongodb";

export type DeletableStoredAsset = {
  storageProvider?: string;
  storagePointer?: Record<string, unknown>;
  providerAssetId?: string | null;
  createdFrom?: {
    storageProviderAccountId?: string | null;
  };
};

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function deleteRemoteAssetIfNeeded({
  db,
  asset,
  fetchImpl = fetch,
}: {
  db: Db;
  asset: DeletableStoredAsset;
  fetchImpl?: typeof fetch;
}) {
  if (asset.storageProvider !== "drive") {
    return { deletedRemote: false as const };
  }

  const providerId = stringValue(asset.createdFrom?.storageProviderAccountId);
  const provider = providerId
    ? await getStorageProviderAccountById({ db, providerId })
    : null;
  const accessToken = await resolveDriveRuntimeAccessToken({
    accessToken:
      provider?.secrets.accessToken?.trim() ??
      getAppEnv().GOOGLE_DRIVE_ACCESS_TOKEN?.trim(),
    refreshToken: provider?.secrets.refreshToken?.trim(),
    fetchImpl,
  });
  const fileId =
    stringValue(asset.storagePointer?.fileId) ||
    stringValue(asset.providerAssetId);

  if (!accessToken || !fileId) {
    throw new Error("Google Drive fileId or access token is missing for this asset.");
  }

  const response = await fetchImpl(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`,
    {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const message = await readGoogleDriveErrorMessage(
      response,
      `Google Drive file delete failed with status ${response.status}.`,
    );
    throw new Error(withGoogleDrivePermissionHint(message));
  }

  return { deletedRemote: true as const };
}
