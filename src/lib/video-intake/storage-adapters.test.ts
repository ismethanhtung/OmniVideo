import { beforeEach, describe, expect, it, vi } from "vitest";

import { uploadResolvedMedia } from "./storage-adapters";
import { shouldFallbackToBinaryUpload } from "./telegram-fallback";

beforeEach(() => {
  vi.restoreAllMocks();
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
});
