import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { buildVideoAssetDocument } from "./asset-metadata";

describe("buildVideoAssetDocument", () => {
  it("maps storage upload result and resolved media into asset metadata", () => {
    const sourceId = new ObjectId();
    const jobRunId = new ObjectId();
    const now = new Date("2026-04-25T00:00:00.000Z");

    const result = buildVideoAssetDocument({
      sourceId,
      jobRunId,
      now,
      media: {
        originalUrl: "https://example.com/page",
        directMediaUrl: "https://cdn.example.com/video.mp4",
        originPlatform: "direct",
        title: "Demo",
        mimeType: "video/mp4",
        sizeBytes: 100,
        resolver: "direct-url",
      },
      upload: {
        storageProvider: "telegram",
        storagePointer: { fileId: "abc" },
        providerAssetId: "abc",
        mimeType: "video/mp4",
        sizeBytes: 100,
      },
    });

    expect(result.assetType).toBe("video");
    expect(result.storageProvider).toBe("telegram");
    expect(result.storagePointer).toEqual({ fileId: "abc" });
    expect(result.metadata.sourceUrl).toBe("https://example.com/page");
    expect(result.metadata.directMediaUrlResolved).toBe(true);
    expect(result.createdFrom).toMatchObject({
      sourceId,
      jobRunId,
      pipelineId: "mvp-url-intake-to-storage",
    });
  });
});
