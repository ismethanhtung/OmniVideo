import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  deleteVideoAssetById,
  deleteIntakeJobRunsByAssetId,
  getIntakeDb,
  getVideoAssetById,
  updateVideoAssetMetadataById,
} from "@/lib/video-intake/repository";
import { deleteRemoteAssetIfNeeded } from "@/lib/storage/asset-delete";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
  requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/video-intake/repository", () => ({
  deleteVideoAssetById: vi.fn(),
  deleteIntakeJobRunsByAssetId: vi.fn(),
  getVideoAssetById: vi.fn(),
  getIntakeDb: vi.fn(),
  updateVideoAssetMetadataById: vi.fn(),
}));
vi.mock("@/lib/storage/asset-delete", () => ({
  deleteRemoteAssetIfNeeded: vi.fn(),
}));

const mockedDeleteVideoAssetById = vi.mocked(deleteVideoAssetById);
const mockedDeleteIntakeJobRunsByAssetId = vi.mocked(deleteIntakeJobRunsByAssetId);
const mockedGetVideoAssetById = vi.mocked(getVideoAssetById);
const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedUpdateVideoAssetMetadataById = vi.mocked(updateVideoAssetMetadataById);
const mockedDeleteRemoteAssetIfNeeded = vi.mocked(deleteRemoteAssetIfNeeded);

describe("storage asset patch route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetIntakeDb.mockResolvedValue({} as never);
    mockedGetVideoAssetById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
      storageProvider: "drive",
    } as never);
    mockedDeleteVideoAssetById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
    } as never);
    mockedDeleteIntakeJobRunsByAssetId.mockResolvedValue({
      deletedRuns: 1,
      deletedStepRuns: 2,
      deletedRunEvents: 3,
    } as never);
    mockedDeleteRemoteAssetIfNeeded.mockResolvedValue({
      deletedRemote: true,
      skippedMissingRemote: false,
    } as never);
    mockedUpdateVideoAssetMetadataById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
      metadata: { tags: ["raw", "has-processed-output"] },
    } as never);
  });

  it("sanitizes and forwards metadata tag updates", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/storage/assets/asset-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            tags: [" raw ", "has-processed-output", "raw", ""],
          },
        }),
      }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateVideoAssetMetadataById).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
      patch: expect.objectContaining({
        tags: ["raw", "has-processed-output"],
      }),
    });
  });
});

describe("storage asset delete route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetIntakeDb.mockResolvedValue({} as never);
    mockedGetVideoAssetById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
      storageProvider: "drive",
    } as never);
    mockedDeleteVideoAssetById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
    } as never);
    mockedDeleteIntakeJobRunsByAssetId.mockResolvedValue({
      deletedRuns: 1,
      deletedStepRuns: 2,
      deletedRunEvents: 3,
    } as never);
    mockedDeleteRemoteAssetIfNeeded.mockResolvedValue({
      deletedRemote: true,
      skippedMissingRemote: false,
    } as never);
  });

  it("deletes remote drive storage before deleting the local asset", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/storage/assets/asset-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedDeleteRemoteAssetIfNeeded).toHaveBeenCalled();
    expect(mockedDeleteVideoAssetById).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
    });
    expect(mockedDeleteIntakeJobRunsByAssetId).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
    });
    expect(
      mockedDeleteRemoteAssetIfNeeded.mock.invocationCallOrder[0],
    ).toBeLessThan(mockedDeleteVideoAssetById.mock.invocationCallOrder[0]);
  });

  it("keeps the local asset when remote deletion fails", async () => {
    mockedDeleteRemoteAssetIfNeeded.mockRejectedValueOnce(
      new Error("Drive delete failed."),
    );

    const response = await DELETE(
      new Request("http://localhost/api/storage/assets/asset-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(500);
    expect(mockedDeleteVideoAssetById).not.toHaveBeenCalled();
  });

  it("continues local deletion when drive file is already missing remotely", async () => {
    mockedDeleteRemoteAssetIfNeeded.mockResolvedValueOnce({
      deletedRemote: false,
      skippedMissingRemote: true,
    } as never);

    const response = await DELETE(
      new Request("http://localhost/api/storage/assets/asset-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedDeleteVideoAssetById).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
    });
    expect(mockedDeleteIntakeJobRunsByAssetId).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
    });
  });
});
