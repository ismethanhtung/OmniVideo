import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteRemoteAssetIfNeeded } from "@/lib/storage/asset-delete";
import { getStorageProvidersDb } from "@/lib/storage-providers/repository";
import {
  deleteThumbnailAssetById,
  getThumbnailAssetById,
  updateThumbnailAssetMetadataById,
} from "@/lib/thumbnails/repository";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
  requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/storage/asset-delete", () => ({
  deleteRemoteAssetIfNeeded: vi.fn(),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
  getStorageProvidersDb: vi.fn(),
}));

vi.mock("@/lib/thumbnails/repository", () => ({
  getThumbnailAssetById: vi.fn(),
  deleteThumbnailAssetById: vi.fn(),
  updateThumbnailAssetMetadataById: vi.fn(),
}));

const mockedDeleteRemoteAssetIfNeeded = vi.mocked(deleteRemoteAssetIfNeeded);
const mockedGetStorageProvidersDb = vi.mocked(getStorageProvidersDb);
const mockedGetThumbnailAssetById = vi.mocked(getThumbnailAssetById);
const mockedDeleteThumbnailAssetById = vi.mocked(deleteThumbnailAssetById);
const mockedUpdateThumbnailAssetMetadataById = vi.mocked(updateThumbnailAssetMetadataById);

describe("thumbnail asset item route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStorageProvidersDb.mockResolvedValue({} as never);
    mockedGetThumbnailAssetById.mockResolvedValue({ _id: "thumb-1" } as never);
    mockedDeleteThumbnailAssetById.mockResolvedValue({
      _id: { toString: () => "thumb-1" },
    } as never);
    mockedDeleteRemoteAssetIfNeeded.mockResolvedValue({ deletedRemote: true } as never);
    mockedUpdateThumbnailAssetMetadataById.mockResolvedValue({
      _id: { toString: () => "thumb-1" },
      metadata: { tags: ["movies", "processed"] },
    } as never);
  });

  it("deletes remote file before deleting thumbnail asset", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/storage/thumbnail-assets/thumb-1", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ assetId: "thumb-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedDeleteRemoteAssetIfNeeded).toHaveBeenCalled();
    expect(mockedDeleteThumbnailAssetById).toHaveBeenCalledWith({
      db: {},
      assetId: "thumb-1",
    });
  });

  it("patches title/folder/tags metadata", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/storage/thumbnail-assets/thumb-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          metadata: {
            title: "New thumb",
            folder: "movies/season-01",
            lifecycle: "processed",
            tags: ["movie", "hero"],
          },
        }),
      }),
      { params: Promise.resolve({ assetId: "thumb-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateThumbnailAssetMetadataById).toHaveBeenCalledWith(
      expect.objectContaining({
        db: {},
        assetId: "thumb-1",
        patch: expect.objectContaining({
          title: "New thumb",
          folder: "movies/season-01",
          tags: expect.arrayContaining(["processed", "movie", "hero"]),
        }),
      }),
    );
  });
});
