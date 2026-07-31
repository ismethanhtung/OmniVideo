import { describe, expect, it } from "vitest";

import { IntakeError } from "./types";
import { validateIntakeInput } from "./validation";

describe("validateIntakeInput", () => {
  it("returns normalized metadata for valid input", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.youtube.com/shorts/demo#x",
      storageProvider: "telegram",
      folder: "kiến thức sức khoẻ",
      tags: [],
      title: "Demo",
      description: " Desc ",
    });

    expect(result.canonicalUrl).toBe("https://www.youtube.com/shorts/demo");
    expect(result.originPlatform).toBe("youtube");
    expect(result.folder).toBe("kiến thức sức khoẻ");
    expect(result.tags).toEqual(["kiến thức sức khoẻ", "raw"]);
    expect(result.contentIntent).toBe("other");
    expect(result.description).toBe("Desc");
    expect(result.ownershipStatus).toBe("unknown");
    expect(result.qualityPreference).toBe("best");
  });

  it("handles mixed sharing texts containing URLs", () => {
    const result = validateIntakeInput({
      sourceUrl: "4.84 dnD:/ N@j.pQ :6pm 10/10 太喜欢这种感觉了，摇曳的树影被路灯拉长，像一封未写完의信。 # 晚风很温柔 # 治愈系 # 林间小道 # 人间观察计划 # 路의尽头终会有温柔의光  https://v.douyin.com/lirNlzgcO34/ 复制此链接，打开Dou音搜索，直接观看视频！",
      storageProvider: "telegram",
      folder: "kiến thức sức khoẻ",
      tags: [],
    });

    expect(result.canonicalUrl).toBe("https://v.douyin.com/lirNlzgcO34/");
    expect(result.originPlatform).toBe("douyin");
  });

  it("rejects invalid URL", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "not-a-url",
        storageProvider: "telegram",
        folder: "kiến thức sức khoẻ",
        tags: [],
      }),
    ).toThrow(IntakeError);
  });

  it("requires a source folder", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://example.com/video.mp4",
        storageProvider: "telegram",
        tags: [],
      }),
    ).toThrow("folder is required");
  });

  it("rejects unsupported storage providers", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://example.com/video.mp4",
        storageProvider: "local",
        folder: "kiến thức sức khoẻ",
        tags: [],
      }),
    ).toThrow("storageProvider must be telegram or drive");
  });

  it("keeps storage provider account id when provided", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://cdn.example.com/video.mp4",
      storageProvider: "telegram",
      storageProviderAccountId: "507f1f77bcf86cd799439011",
      folder: "kiến thức sức khoẻ",
      tags: [],
    });

    expect(result.storageProviderAccountId).toBe("507f1f77bcf86cd799439011");
  });

  it("rejects malformed storage provider account ids", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://cdn.example.com/video.mp4",
        storageProvider: "telegram",
        storageProviderAccountId: "telegram-main",
        folder: "kiến thức sức khoẻ",
        tags: [],
      }),
    ).toThrow("storageProviderAccountId must be a valid Mongo ObjectId");
  });

  it("accepts supported quality preference values", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.youtube.com/watch?v=demo",
      storageProvider: "telegram",
      folder: "kiến thức sức khoẻ",
      tags: [],
      qualityPreference: "720p",
    });

    expect(result.qualityPreference).toBe("720p");
  });

  it("accepts a single-line yt-dlp format selector", () => {
    const result = validateIntakeInput({
      sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
      storageProvider: "drive",
      folder: "kiến thức sức khoẻ",
      tags: [],
      formatSelector: "30080+30280",
    });

    expect(result.formatSelector).toBe("30080+30280");
  });

  it("rejects multiline yt-dlp format selectors", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
        storageProvider: "drive",
        folder: "kiến thức sức khoẻ",
        tags: [],
        formatSelector: "30080+30280\n--cookies-from-browser chrome",
      }),
    ).toThrow("formatSelector must be a single-line yt-dlp format selector");
  });

  it("rejects invalid quality preference values", () => {
    expect(() =>
      validateIntakeInput({
        sourceUrl: "https://www.youtube.com/watch?v=demo",
        storageProvider: "telegram",
        folder: "kiến thức sức khoẻ",
        tags: [],
        qualityPreference: "4k",
      }),
    ).toThrow("qualityPreference must be one of best, 1080p, 720p, 480p, 360p.");
  });
});
