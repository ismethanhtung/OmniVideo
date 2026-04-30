import { describe, expect, it } from "vitest";

import {
  INTERNAL_RESOLVER_RUNTIME_MISSING_MESSAGE,
  cleanInternalResolverErrorMessage,
  normalizeExtractorUrl,
  parseInternalResolverStdout,
} from "./internal-resolver";

describe("internal resolver parser", () => {
  it("parses valid resolver stdout", () => {
    const result = parseInternalResolverStdout(
      JSON.stringify({
        directMediaUrl: "https://cdn.example.com/video.mp4",
        title: "Demo",
        durationMs: 1234,
        formatId: "18",
        height: 360,
        width: 640,
        resolution: "640x360",
        requestHeaders: {
          "User-Agent": "yt-dlp-test",
        },
      }),
    );

    expect(result.directMediaUrl).toBe("https://cdn.example.com/video.mp4");
    expect(result.title).toBe("Demo");
    expect(result.durationMs).toBe(1234);
    expect(result.formatId).toBe("18");
    expect(result.height).toBe(360);
    expect(result.resolution).toBe("640x360");
    expect(result.requestHeaders).toEqual({
      "User-Agent": "yt-dlp-test",
    });
  });

  it("rejects payloads without directMediaUrl", () => {
    expect(() => parseInternalResolverStdout("{}")).toThrow(
      "Internal resolver did not return directMediaUrl.",
    );
  });

  it("normalizes douyin modal URLs for extractor support", () => {
    expect(
      normalizeExtractorUrl(
        "https://www.douyin.com/jingxuan?modal_id=7631973489948133044",
      ),
    ).toBe("https://www.douyin.com/video/7631973489948133044");
  });

  it("cleans resolver runtime warnings and adds cookie guidance", () => {
    expect(
      cleanInternalResolverErrorMessage(
        "Deprecated Feature: Support for Python version 3.9 has been deprecated\nERROR: [Douyin] 123: Fresh cookies (not necessarily logged in) are needed",
      ),
    ).toBe(
      "ERROR: [Douyin] 123: Fresh cookies (not necessarily logged in) are needed Automatic browser-cookie fallback was attempted. Configure VIDEO_RESOLVER_COOKIES_HEADER (raw cookie/header text), VIDEO_RESOLVER_COOKIES_FILE, or VIDEO_RESOLVER_COOKIES_FROM_BROWSER for deterministic extraction on this platform.",
    );
  });

  it("points missing runtime errors to the repo-local setup command", () => {
    expect(INTERNAL_RESOLVER_RUNTIME_MISSING_MESSAGE).toContain(
      "npm run setup:resolver",
    );
    expect(INTERNAL_RESOLVER_RUNTIME_MISSING_MESSAGE).toContain(".vendor/python");
  });
});
