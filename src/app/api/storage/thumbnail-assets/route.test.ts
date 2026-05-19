import { beforeEach, describe, expect, it, vi } from "vitest";

import { getActiveStorageProviderAccountForUpload, getStorageProvidersDb } from "@/lib/storage-providers/repository";
import {
  createThumbnailAsset,
  deleteThumbnailAssetById,
  getThumbnailAssetById,
  listThumbnailAssets,
  markThumbnailHasProcessedOutput,
} from "@/lib/thumbnails/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";
import { deleteRemoteAssetIfNeeded } from "@/lib/storage/asset-delete";

import { GET, POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
  requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
  getStorageProvidersDb: vi.fn(),
  getActiveStorageProviderAccountForUpload: vi.fn(),
}));

vi.mock("@/lib/thumbnails/repository", () => ({
  listThumbnailAssets: vi.fn(),
  createThumbnailAsset: vi.fn(),
  markThumbnailHasProcessedOutput: vi.fn(),
  getThumbnailAssetById: vi.fn(),
  deleteThumbnailAssetById: vi.fn(),
}));

vi.mock("@/lib/video-intake/storage-adapters", () => ({
  uploadLocalMedia: vi.fn(),
}));

vi.mock("@/lib/storage/asset-delete", () => ({
  deleteRemoteAssetIfNeeded: vi.fn(),
}));

const mockedGetStorageProvidersDb = vi.mocked(getStorageProvidersDb);
const mockedGetActiveStorageProviderAccountForUpload = vi.mocked(
  getActiveStorageProviderAccountForUpload,
);
const mockedListThumbnailAssets = vi.mocked(listThumbnailAssets);
const mockedCreateThumbnailAsset = vi.mocked(createThumbnailAsset);
const mockedMarkThumbnailHasProcessedOutput = vi.mocked(markThumbnailHasProcessedOutput);
const mockedGetThumbnailAssetById = vi.mocked(getThumbnailAssetById);
const mockedDeleteThumbnailAssetById = vi.mocked(deleteThumbnailAssetById);
const mockedUploadLocalMedia = vi.mocked(uploadLocalMedia);
const mockedDeleteRemoteAssetIfNeeded = vi.mocked(deleteRemoteAssetIfNeeded);

describe("thumbnail assets route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetStorageProvidersDb.mockResolvedValue({} as never);
    mockedListThumbnailAssets.mockResolvedValue({
      data: [
        {
          _id: { toString: () => "thumb-1" },
          metadata: { title: "Thumb 1" },
          createdFrom: {},
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
    } as never);
    mockedGetActiveStorageProviderAccountForUpload.mockResolvedValue({
      _id: { toHexString: () => "507f1f77bcf86cd799439011" },
      label: "Drive Main",
      providerType: "drive",
      secrets: {},
    } as never);
    mockedUploadLocalMedia.mockResolvedValue({
      storageProvider: "drive",
      storageProviderAccountId: "507f1f77bcf86cd799439011",
      storageProviderLabel: "Drive Main",
      storagePointer: { fileId: "drive-file-1" },
      providerAssetId: "drive-file-1",
      publicUrl: "https://drive.google.com/file/d/drive-file-1/view",
      mimeType: "image/png",
      sizeBytes: 1200,
    });
    mockedCreateThumbnailAsset.mockResolvedValue({
      _id: { toString: () => "thumb-2" },
      metadata: { title: "Thumb 2" },
    } as never);
    mockedGetThumbnailAssetById.mockResolvedValue({ _id: "old" } as never);
    mockedDeleteRemoteAssetIfNeeded.mockResolvedValue({ deletedRemote: true } as never);
    mockedDeleteThumbnailAssetById.mockResolvedValue({ _id: "old" } as never);
    mockedMarkThumbnailHasProcessedOutput.mockResolvedValue({} as never);
  });

  it("lists image thumbnail assets", async () => {
    const response = await GET(new Request("http://localhost/api/storage/thumbnail-assets?limit=20"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedListThumbnailAssets).toHaveBeenCalledWith({}, expect.any(Object));
    expect(payload.ok).toBe(true);
    expect(payload.data[0]._id).toBe("thumb-1");
  });

  it("uploads and creates thumbnail asset from file input", async () => {
    const formData = new FormData();
    formData.set("storageProviderAccountId", "507f1f77bcf86cd799439011");
    formData.set("title", "Episode 1");
    formData.set("folder", "movies/season-01");
    formData.set("tags", "movie,ep1");
    formData.set("lifecycle", "raw");
    formData.set("thumbnailSetupJson", JSON.stringify({ cropPreset: "1:1" }));
    formData.set(
      "thumbnailFile",
      new File([new Uint8Array([1, 2, 3])], "episode-1.png", {
        type: "image/png",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/storage/thumbnail-assets", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedUploadLocalMedia).toHaveBeenCalled();
    expect(mockedCreateThumbnailAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        db: {},
        input: expect.objectContaining({
          title: "Episode 1",
          folder: "movies/season-01",
        }),
      }),
    );
    expect(mockedCreateThumbnailAsset.mock.calls[0]?.[0].input).not.toHaveProperty(
      "thumbnailSetup",
    );
  });

  it("supports overwrite flow after creating replacement thumbnail", async () => {
    const formData = new FormData();
    formData.set("storageProviderAccountId", "507f1f77bcf86cd799439011");
    formData.set("title", "Episode 1 Updated");
    formData.set("lifecycle", "processed");
    formData.set("sourceAssetId", "source-asset");
    formData.set("overwriteAssetId", "overwrite-asset");
    formData.set(
      "thumbnailFile",
      new File([new Uint8Array([4, 5, 6])], "episode-1-updated.png", {
        type: "image/png",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/storage/thumbnail-assets", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(201);
    expect(mockedMarkThumbnailHasProcessedOutput).toHaveBeenCalledWith({
      db: {},
      sourceAssetId: "source-asset",
    });
    expect(mockedGetThumbnailAssetById).toHaveBeenCalledWith({
      db: {},
      assetId: "overwrite-asset",
    });
    expect(mockedDeleteRemoteAssetIfNeeded).toHaveBeenCalled();
    expect(mockedDeleteThumbnailAssetById).toHaveBeenCalledWith({
      db: {},
      assetId: "overwrite-asset",
    });
  });
});
