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

  it("extracts URL from mixed sharing texts", () => {
    const douyinShareText = "4.84 dnD:/ N@j.pQ :6pm 10/10 太喜欢这种感觉了，摇曳的树影被路灯拉长，像一封未写完의信。 # 晚风很温柔 # 治愈系 # 林间小道 # 人间观察计划 # 路의尽头终会有温柔의光  https://v.douyin.com/lirNlzgcO34/ 复制此链接，打开Dou音搜索，直接观看视频！";
    expect(normalizeUrl(douyinShareText)).toBe("https://v.douyin.com/lirNlzgcO34/");

    const tiktokShareText = "Check this out: https://vt.tiktok.com/ZS12345/ raw text";
    expect(normalizeUrl(tiktokShareText)).toBe("https://vt.tiktok.com/ZS12345/");
  });
});
