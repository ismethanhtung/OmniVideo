import { describe, expect, it, vi } from "vitest";

import { deleteRemoteAssetIfNeeded } from "./asset-delete";

vi.mock("@/lib/config/env", () => ({
  getAppEnv: () => ({ GOOGLE_DRIVE_ACCESS_TOKEN: "env-token" }),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
  getStorageProviderAccountById: vi.fn(),
}));

describe("deleteRemoteAssetIfNeeded", () => {
  it("deletes drive-backed assets using the stored drive file id", async () => {
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
    ).resolves.toEqual({ deletedRemote: true });

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
});
