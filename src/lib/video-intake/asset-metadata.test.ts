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
        requestedQuality: "720p",
        height: 720,
        width: 1280,
        resolution: "1280x720",
        formatId: "22",
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
    expect(result.metadata.requestedQuality).toBe("720p");
    expect(result.metadata.actualQuality).toBe("720p");
    expect(result.metadata.formatId).toBe("22");
    expect(result.createdFrom).toMatchObject({
      sourceId,
      jobRunId,
      pipelineId: "mvp-url-intake-to-storage",
    });
  });

  it("marks local-file resolver as non-direct-media and allows custom pipeline id", () => {
    const sourceId = new ObjectId();
    const jobRunId = new ObjectId();
    const now = new Date("2026-04-25T00:00:00.000Z");

    const result = buildVideoAssetDocument({
      sourceId,
      jobRunId,
      now,
      pipelineId: "mvp-local-intake-to-storage",
      media: {
        originalUrl: "local-file://demo.mp4",
        directMediaUrl: "local-file://demo.mp4",
        originPlatform: "other",
        title: "demo.mp4",
        mimeType: "video/mp4",
        sizeBytes: 200,
        resolver: "local-file",
      },
      upload: {
        storageProvider: "drive",
        storagePointer: { fileId: "drive-1" },
        providerAssetId: "drive-1",
        mimeType: "video/mp4",
        sizeBytes: 200,
      },
    });

    expect(result.metadata.sourceUrl).toBe("local-file://demo.mp4");
    expect(result.metadata.directMediaUrlResolved).toBe(false);
    expect(result.createdFrom.pipelineId).toBe("mvp-local-intake-to-storage");
  });
});
