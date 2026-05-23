import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { downloadResolvedMediaToTempFile } from "./internal-resolver";
import { uploadResolvedMedia } from "./storage-adapters";
import { shouldFallbackToBinaryUpload } from "./telegram-fallback";

vi.mock("./internal-resolver", () => ({
  downloadResolvedMediaToTempFile: vi.fn(),
}));

const mockedDownloadResolvedMediaToTempFile = vi.mocked(
  downloadResolvedMediaToTempFile,
);

beforeEach(() => {
  vi.restoreAllMocks();
  mockedDownloadResolvedMediaToTempFile.mockReset();
  vi.stubEnv("MONGODB_URI", "mongodb://localhost:27017");
  vi.stubEnv("MONGODB_DB_NAME", "omnivideo_test");
  vi.stubEnv("GOOGLE_DRIVE_ACCESS_TOKEN", "drive-token");
});

describe("telegram fallback signal", () => {
  it("returns true for telegram remote-url fetch errors", () => {
    expect(
      shouldFallbackToBinaryUpload("Bad Request: failed to get HTTP URL content"),
    ).toBe(true);
    expect(
      shouldFallbackToBinaryUpload("Bad Request: wrong type of the web page content"),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(shouldFallbackToBinaryUpload("Unauthorized")).toBe(false);
  });
});

describe("storage upload streaming", () => {
  it("streams direct media response bodies into Google Drive without buffering", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { location: "https://upload.example.com/session" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            "content-type": "video/mp4",
            "content-length": "3",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "drive-file-id",
            name: "uploaded.mp4",
            mimeType: "video/mp4",
            size: "3",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadResolvedMedia({
      provider: "drive",
      media: {
        originalUrl: "https://www.youtube.com/watch?v=demo",
        directMediaUrl: "https://cdn.example.com/demo.mp4",
        originPlatform: "youtube",
        downloadMode: "direct-url",
        mimeType: "video/mp4",
        requestedQuality: "best",
        resolver: "internal-resolver",
      },
    });

    expect(result.providerAssetId).toBe("drive-file-id");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const uploadInit = fetchMock.mock.calls[2][1] as RequestInit & {
      duplex?: string;
    };
    expect(uploadInit.duplex).toBe("half");
    expect(uploadInit.body).toBeInstanceOf(ReadableStream);
    expect(uploadInit.body).not.toBeInstanceOf(Uint8Array);
  });

  it("materializes Bilibili HTML5 direct media before Google Drive upload", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "storage-adapter-test-"));
    const filePath = path.join(tmpDir, "html5.mp4");
    await writeFile(filePath, new Uint8Array([1, 2, 3]));
    const cleanup = vi.fn(async () => {
      await rm(tmpDir, { recursive: true, force: true });
    });
    mockedDownloadResolvedMediaToTempFile.mockResolvedValueOnce({
      filePath,
      filename: "html5.mp4",
      mimeType: "video/mp4",
      sizeBytes: 3,
      cleanup,
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { location: "https://upload.example.com/session" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "drive-file-id",
            name: "uploaded.mp4",
            mimeType: "video/mp4",
            size: "3",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await uploadResolvedMedia({
      provider: "drive",
      media: {
        originalUrl: "https://www.bilibili.com/video/BV1DkdLBNEPA/",
        directMediaUrl: "https://cdn.example.com/bilibili-html5.mp4",
        originPlatform: "bilibili",
        downloadMode: "direct-url",
        formatSelector: "bilibili-html5-64",
        formatId: "bilibili-html5-64",
        resolverProfile: "bilibili-html5:no-cookie",
        mimeType: "video/mp4",
        requestedQuality: "best",
        resolver: "internal-resolver",
      },
    });

    expect(result.storagePointer.uploadMode).toBe("yt-dlp-file-stream");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedDownloadResolvedMediaToTempFile).toHaveBeenCalledWith({
      originalUrl: "https://www.bilibili.com/video/BV1DkdLBNEPA/",
      requestedQuality: "best",
      formatSelector: "bilibili-html5-64",
    });
    const uploadInit = fetchMock.mock.calls[1][1] as RequestInit & {
      duplex?: string;
    };
    const uploadHeaders = uploadInit.headers as Headers;
    expect(uploadInit.duplex).toBe("half");
    expect(uploadInit.body).not.toBeInstanceOf(ReadableStream);
    expect(uploadHeaders.get("content-length")).toBe("3");
    expect(cleanup).toHaveBeenCalled();
  });

  it("maps source fetch throws to STG_SOURCE_FETCH_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 200,
            headers: { location: "https://upload.example.com/session" },
          }),
        )
        .mockRejectedValueOnce(new TypeError("fetch failed")),
    );

    await expect(
      uploadResolvedMedia({
        provider: "drive",
        media: {
          originalUrl: "https://example.com/page",
          directMediaUrl: "https://cdn.example.com/source.mp4",
          originPlatform: "other",
          downloadMode: "direct-url",
          requestedQuality: "best",
          resolver: "internal-resolver",
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "STG_SOURCE_FETCH_FAILED",
      retryable: true,
    });
  });

  it("maps Drive session fetch throws to STG_DRIVE_UPLOAD_NETWORK_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")),
    );

    await expect(
      uploadResolvedMedia({
        provider: "drive",
        media: {
          originalUrl: "https://example.com/page",
          directMediaUrl: "https://cdn.example.com/source.mp4",
          originPlatform: "other",
          downloadMode: "direct-url",
          requestedQuality: "best",
          resolver: "internal-resolver",
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "STG_DRIVE_UPLOAD_NETWORK_FAILED",
      retryable: true,
    });
  });

  it("maps Drive resumable PUT throws to STG_DRIVE_RESUMABLE_PUT_FAILED", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(null, {
            status: 200,
            headers: { location: "https://upload.example.com/session" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(new Uint8Array([1, 2, 3]), {
            status: 200,
            headers: {
              "content-type": "video/mp4",
              "content-length": "3",
            },
          }),
        )
        .mockRejectedValueOnce(new TypeError("fetch failed")),
    );

    await expect(
      uploadResolvedMedia({
        provider: "drive",
        media: {
          originalUrl: "https://example.com/page",
          directMediaUrl: "https://cdn.example.com/source.mp4",
          originPlatform: "other",
          downloadMode: "direct-url",
          requestedQuality: "best",
          resolver: "internal-resolver",
        },
      }),
    ).rejects.toMatchObject({
      errorCode: "STG_DRIVE_RESUMABLE_PUT_FAILED",
      retryable: true,
    });
  });
});
