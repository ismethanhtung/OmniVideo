import { describe, expect, it } from "vitest";

import { parseInternalResolverStdout } from "./internal-resolver";

describe("internal resolver parser", () => {
  it("parses valid resolver stdout", () => {
    const result = parseInternalResolverStdout(
      JSON.stringify({
        directMediaUrl: "https://cdn.example.com/video.mp4",
        title: "Demo",
        durationMs: 1234,
        requestHeaders: {
          "User-Agent": "yt-dlp-test",
        },
      }),
    );

    expect(result.directMediaUrl).toBe("https://cdn.example.com/video.mp4");
    expect(result.title).toBe("Demo");
    expect(result.durationMs).toBe(1234);
    expect(result.requestHeaders).toEqual({
      "User-Agent": "yt-dlp-test",
    });
  });

  it("rejects payloads without directMediaUrl", () => {
    expect(() => parseInternalResolverStdout("{}")).toThrow(
      "Internal resolver did not return directMediaUrl.",
    );
  });
});
