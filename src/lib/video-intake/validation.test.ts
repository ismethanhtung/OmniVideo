import { describe, expect, it } from "vitest";

import { IntakeError } from "./types";
import { validateIntakeInput } from "./validation";

describe("validateIntakeInput", () => {
  it("returns normalized metadata for valid input", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.youtube.com/shorts/demo#x",
      storageProvider: "telegram",
      tags: ["intake", "raw"],
      title: "Demo",
      description: " Desc ",
    });

    expect(result.canonicalUrl).toBe("https://www.youtube.com/shorts/demo");
    expect(result.originPlatform).toBe("youtube");
    expect(result.tags).toEqual(["intake", "raw"]);
    expect(result.contentIntent).toBe("other");
    expect(result.description).toBe("Desc");
    expect(result.ownershipStatus).toBe("unknown");
    expect(result.qualityPreference).toBe("best");
  });

  it("rejects invalid URL", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "not-a-url",
        storageProvider: "telegram",
        tags: ["intake", "raw"],
      }),
    ).toThrow(IntakeError);
  });

  it("requires at least 2 source tags for traceability", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://example.com/video.mp4",
        storageProvider: "telegram",
        tags: ["raw"],
      }),
    ).toThrow("At least 2 tags are required");
  });

  it("rejects unsupported storage providers", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://example.com/video.mp4",
        storageProvider: "local",
        tags: ["intake", "raw"],
      }),
    ).toThrow("storageProvider must be telegram or drive");
  });

  it("keeps storage provider account id when provided", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://cdn.example.com/video.mp4",
      storageProvider: "telegram",
      storageProviderAccountId: "507f1f77bcf86cd799439011",
      tags: ["intake", "raw"],
    });

    expect(result.storageProviderAccountId).toBe("507f1f77bcf86cd799439011");
  });

  it("rejects malformed storage provider account ids", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://cdn.example.com/video.mp4",
        storageProvider: "telegram",
        storageProviderAccountId: "telegram-main",
        tags: ["intake", "raw"],
      }),
    ).toThrow("storageProviderAccountId must be a valid Mongo ObjectId");
  });

  it("accepts supported quality preference values", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.youtube.com/watch?v=demo",
      storageProvider: "telegram",
      tags: ["intake", "raw"],
      qualityPreference: "720p",
    });

    expect(result.qualityPreference).toBe("720p");
  });

  it("accepts a single-line yt-dlp format selector", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
      storageProvider: "drive",
      tags: ["intake", "raw"],
      formatSelector: "30080+30280",
    });

    expect(result.formatSelector).toBe("30080+30280");
  });

  it("rejects multiline yt-dlp format selectors", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
        storageProvider: "drive",
        tags: ["intake", "raw"],
        formatSelector: "30080+30280\n--cookies-from-browser chrome",
      }),
    ).toThrow("formatSelector must be a single-line yt-dlp format selector");
  });

  it("rejects invalid quality preference values", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://www.youtube.com/watch?v=demo",
        storageProvider: "telegram",
        tags: ["intake", "raw"],
        qualityPreference: "4k",
      }),
    ).toThrow("qualityPreference must be one of best, 1080p, 720p, 480p, 360p.");
  });
});
