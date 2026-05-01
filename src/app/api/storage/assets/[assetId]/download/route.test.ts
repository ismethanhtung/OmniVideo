import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";

import { GET } from "./route";

vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));

vi.mock("@/lib/video-intake/repository", () => ({
  getIntakeDb: vi.fn(),
  getVideoAssetById: vi.fn(),
}));

const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);
const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedGetVideoAssetById = vi.mocked(getVideoAssetById);

describe("storage asset download route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedResolveAssetDownload.mockReset();
    mockedGetIntakeDb.mockResolvedValue({} as never);
    mockedGetVideoAssetById.mockResolvedValue({
      _id: "asset-1",
      storageProvider: "drive",
      mimeType: "video/mp4",
    } as never);
  });

  it("proxies partial inline video responses with range headers", async () => {
    mockedResolveAssetDownload.mockResolvedValue({
      ok: true,
      status: 206,
      body: new Blob(["partial-video"], { type: "video/mp4" }).stream(),
      headers: new Headers({
        "content-type": "video/mp4",
        "content-range": "bytes 0-12/100",
        "content-length": "13",
      }),
    });

    const response = await GET(
      new Request(
        "http://localhost/api/storage/assets/asset-1/download?disposition=inline",
        {
          headers: { range: "bytes=0-" },
        },
      ),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 0-12/100");
    expect(await response.text()).toBe("partial-video");
    expect(mockedResolveAssetDownload).toHaveBeenCalledWith({
      db: {},
      asset: expect.objectContaining({ storageProvider: "drive" }),
      disposition: "inline",
      rangeHeader: "bytes=0-",
    });
  });

  it("returns provider download errors without converting them to 500", async () => {
    mockedResolveAssetDownload.mockResolvedValue({
      ok: false,
      status: 502,
      errorCode: "STG_DRIVE_FILE_DOWNLOAD_FAILED",
      error: "Google Drive file download failed with status 500.",
    });

    const response = await GET(
      new Request(
        "http://localhost/api/storage/assets/asset-1/download?disposition=inline",
      ),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "STG_DRIVE_FILE_DOWNLOAD_FAILED",
    });
  });
});
