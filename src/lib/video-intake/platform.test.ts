import { describe, expect, it } from "vitest";

import { detectOriginPlatform, isLikelyDirectMediaUrl, normalizeUrl } from "./platform";

describe("video intake platform helpers", () => {
  it("detects common source platforms", () => {
    expect(detectOriginPlatform("https://www.youtube.com/shorts/abc")).toBe(
      "youtube",
    );
    expect(detectOriginPlatform("https://www.tiktok.com/@user/video/1")).toBe(
      "tiktok",
    );
    expect(detectOriginPlatform("https://www.douyin.com/video/1")).toBe(
      "douyin",
    );
    expect(detectOriginPlatform("https://fb.watch/demo")).toBe("facebook");
  });

  it("detects direct media URLs", () => {
    expect(isLikelyDirectMediaUrl("https://cdn.example.com/video.mp4")).toBe(true);
    expect(detectOriginPlatform("https://cdn.example.com/video.webm")).toBe(
      "direct",
    );
  });

  it("normalizes URL hash without changing query", () => {
    expect(normalizeUrl(" https://example.com/video?id=1#section ")).toBe(
      "https://example.com/video?id=1",
    );
  });
});
