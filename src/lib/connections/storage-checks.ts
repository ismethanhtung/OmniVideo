import type { WithId } from "mongodb";

import type { StorageProviderDocument } from "@/lib/storage-providers/types";

import {
  readGoogleDriveErrorMessage,
  withGoogleDrivePermissionHint,
} from "../storage/google-drive-error";
import { resolveDriveAccessToken } from "../storage/drive-service-account";

export type ConnectionStatus = "ok" | "down" | "skipped";

export type ConnectionCheck = {
  serviceType: "storage";
  serviceKey: string;
  providerId: string;
  providerType: "telegram" | "drive";
  label: string;
  status: ConnectionStatus;
  message: string;
  latencyMs: number;
  checkedAt: string;
};

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
};

function buildBaseCheck(
  account: WithId<StorageProviderDocument>,
): Omit<ConnectionCheck, "status" | "message" | "latencyMs" | "checkedAt"> {
  return {
    serviceType: "storage",
    serviceKey: `${account.providerType}:${account._id.toHexString()}`,
    providerId: account._id.toHexString(),
    providerType: account.providerType as "telegram" | "drive",
    label: account.label,
  };
}

async function checkTelegramAccount(
  account: WithId<StorageProviderDocument>,
): Promise<ConnectionCheck> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const base = buildBaseCheck(account);
  const botToken = account.secrets.botToken?.trim();
  const chatId = account.secrets.chatId?.trim();

  if (!botToken || !chatId) {
    return {
      ...base,
      status: "down",
      message: "Missing botToken or chatId in storage account secrets.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  }

  try {
    const getMeResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`,
      {
        cache: "no-store",
      },
    );
    const getMePayload = (await getMeResponse.json()) as TelegramApiResponse;

    if (!getMeResponse.ok || !getMePayload.ok) {
      return {
        ...base,
        status: "down",
        message: getMePayload.description ?? "Telegram bot token is invalid.",
        latencyMs: Date.now() - startedAt,
        checkedAt,
      };
    }

    const getChatResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChat?chat_id=${encodeURIComponent(chatId)}`,
      {
        cache: "no-store",
      },
    );
    const getChatPayload = (await getChatResponse.json()) as TelegramApiResponse;

    if (!getChatResponse.ok || !getChatPayload.ok) {
      return {
        ...base,
        status: "down",
        message:
          getChatPayload.description ??
          "Telegram bot cannot access the configured chatId.",
        latencyMs: Date.now() - startedAt,
        checkedAt,
      };
    }

    return {
      ...base,
      status: "ok",
      message: "Telegram bot token and chat access are healthy.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      message:
        error instanceof Error
          ? error.message
          : "Telegram connection check failed.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  }
}

async function checkDriveAccount(
  account: WithId<StorageProviderDocument>,
): Promise<ConnectionCheck> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();
  const base = buildBaseCheck(account);
  let accessToken: string | undefined;

  try {
    accessToken = await resolveDriveAccessToken({
      accessToken: account.secrets.accessToken?.trim(),
      driveServiceAccountJson: account.secrets.driveServiceAccountJson?.trim(),
    });
  } catch (error) {
    return {
      ...base,
      status: "down",
      message:
        error instanceof Error
          ? `Drive auth failed: ${error.message}`
          : "Drive auth failed.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  }

  if (!accessToken) {
    return {
      ...base,
      status: "down",
      message: "Missing accessToken or driveServiceAccountJson in secrets.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  }

  try {
    const aboutResponse = await fetch(
      "https://www.googleapis.com/drive/v3/about?fields=user",
      {
        cache: "no-store",
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!aboutResponse.ok) {
      const message = await readGoogleDriveErrorMessage(
        aboutResponse,
        `Google Drive connection failed with status ${aboutResponse.status}.`,
      );
      return {
        ...base,
        status: "down",
        message: withGoogleDrivePermissionHint(message),
        latencyMs: Date.now() - startedAt,
        checkedAt,
      };
    }

    const folderId = account.secrets.folderId?.trim();

    if (folderId) {
      const folderResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,driveId&supportsAllDrives=true`,
        {
          cache: "no-store",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (!folderResponse.ok) {
        const message = await readGoogleDriveErrorMessage(
          folderResponse,
          `Google Drive folder access check failed with status ${folderResponse.status}.`,
        );
        return {
          ...base,
          status: "down",
          message: withGoogleDrivePermissionHint(message),
          latencyMs: Date.now() - startedAt,
          checkedAt,
        };
      }
    }

    return {
      ...base,
      status: "ok",
      message: folderId
        ? "Google Drive token and target folder access are healthy."
        : "Google Drive access token is healthy.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      message:
        error instanceof Error
          ? error.message
          : "Google Drive connection check failed.",
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };
  }
}

export async function checkStorageProviderConnections(
  accounts: Array<WithId<StorageProviderDocument>>,
): Promise<ConnectionCheck[]> {
  const supportedAccounts = accounts.filter(
    (account) =>
      account.providerType === "telegram" || account.providerType === "drive",
  );

  return Promise.all(
    supportedAccounts.map((account) => {
      if (account.providerType === "telegram") {
        return checkTelegramAccount(account);
      }

      return checkDriveAccount(account);
    }),
  );
}
