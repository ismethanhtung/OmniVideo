import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getStorageProvidersDb } from "@/lib/storage-providers/repository";
import { getThumbnailAssetById } from "@/lib/thumbnails/repository";

import { GET } from "./route";

vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
  getStorageProvidersDb: vi.fn(),
}));

vi.mock("@/lib/thumbnails/repository", () => ({
  getThumbnailAssetById: vi.fn(),
}));

const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);
const mockedGetStorageProvidersDb = vi.mocked(getStorageProvidersDb);
const mockedGetThumbnailAssetById = vi.mocked(getThumbnailAssetById);

describe("thumbnail asset download route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedResolveAssetDownload.mockReset();
    mockedGetStorageProvidersDb.mockResolvedValue({} as never);
    mockedGetThumbnailAssetById.mockResolvedValue({
      _id: "thumb-1",
      storageProvider: "drive",
      mimeType: "image/png",
    } as never);
  });

  it("proxies inline image download", async () => {
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 200,
      body: new Blob(["image-bytes"], { type: "image/png" }).stream(),
      headers: new Headers({
        "content-type": "image/png",
        "content-length": "11",
      }),
    });

    const response = await GET(
      new Request(
        "http://localhost/api/storage/thumbnail-assets/thumb-1/download?disposition=inline",
      ),
      { params: Promise.resolve({ assetId: "thumb-1" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("image-bytes");
    expect(mockedResolveAssetDownload).toHaveBeenCalledWith({
      db: {},
      asset: expect.objectContaining({ storageProvider: "drive" }),
      disposition: "inline",
      rangeHeader: null,
    });
  });
});
