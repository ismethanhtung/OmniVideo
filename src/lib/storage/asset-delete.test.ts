import { describe, expect, it, vi } from "vitest";

import { deleteRemoteAssetIfNeeded } from "./asset-delete";
import { resolveDriveRuntimeAccessToken } from "./drive-token";

vi.mock("@/lib/config/env", () => ({
  getAppEnv: () => ({ GOOGLE_DRIVE_ACCESS_TOKEN: "env-token" }),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
  getStorageProviderAccountById: vi.fn(),
}));
vi.mock("./drive-token", () => ({
  resolveDriveRuntimeAccessToken: vi.fn(),
}));

const mockedResolveDriveRuntimeAccessToken = vi.mocked(
  resolveDriveRuntimeAccessToken,
);

describe("deleteRemoteAssetIfNeeded", () => {
  it("deletes drive-backed assets using the stored drive file id", async () => {
    mockedResolveDriveRuntimeAccessToken.mockResolvedValue("env-token");
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    await expect(
      deleteRemoteAssetIfNeeded({
        db: {} as never,
        asset: {
          storageProvider: "drive",
          storagePointer: { fileId: "drive-file-1" },
        },
        fetchImpl: fetchImpl as never,
      }),
    ).resolves.toEqual({
      deletedRemote: true,
      skippedMissingRemote: false,
      skippedReason: null,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://www.googleapis.com/drive/v3/files/drive-file-1?supportsAllDrives=true",
      {
        method: "DELETE",
        headers: { authorization: "Bearer env-token" },
      },
    );
  });

  it("skips non-drive assets", async () => {
    const fetchImpl = vi.fn();

    await expect(
      deleteRemoteAssetIfNeeded({
        db: {} as never,
        asset: { storageProvider: "telegram" },
        fetchImpl: fetchImpl as never,
      }),
    ).resolves.toEqual({ deletedRemote: false });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("treats 404 missing drive file as an idempotent delete", async () => {
    mockedResolveDriveRuntimeAccessToken.mockResolvedValue("env-token");
    const fetchImpl = vi.fn(async () => new Response(null, { status: 404 }));

    await expect(
      deleteRemoteAssetIfNeeded({
        db: {} as never,
        asset: {
          storageProvider: "drive",
          storagePointer: { fileId: "drive-file-missing" },
        },
        fetchImpl: fetchImpl as never,
      }),
    ).resolves.toEqual({
      deletedRemote: false,
      skippedMissingRemote: true,
      skippedReason: "not-found",
    });
  });

  it("skips remote delete when drive file id is missing", async () => {
    mockedResolveDriveRuntimeAccessToken.mockResolvedValue("env-token");

    await expect(
      deleteRemoteAssetIfNeeded({
        db: {} as never,
        asset: {
          storageProvider: "drive",
        },
      }),
    ).resolves.toEqual({
      deletedRemote: false,
      skippedMissingRemote: true,
      skippedReason: "missing-file-id",
    });
  });

  it("skips remote delete when drive access token is missing", async () => {
    mockedResolveDriveRuntimeAccessToken.mockResolvedValue(null);

    await expect(
      deleteRemoteAssetIfNeeded({
        db: {} as never,
        asset: {
          storageProvider: "drive",
          storagePointer: { fileId: "drive-file-1" },
        },
      }),
    ).resolves.toEqual({
      deletedRemote: false,
      skippedMissingRemote: true,
      skippedReason: "missing-access-token",
    });
  });
});
