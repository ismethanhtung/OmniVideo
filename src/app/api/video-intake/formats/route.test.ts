import { beforeEach, describe, expect, it, vi } from "vitest";

import { listMediaFormatsInternal } from "@/lib/video-intake/internal-resolver";

import { POST } from "./route";

vi.mock("@/lib/video-intake/internal-resolver", () => ({
  listMediaFormatsInternal: vi.fn(),
}));

const mockedListMediaFormatsInternal = vi.mocked(listMediaFormatsInternal);

describe("video intake formats API", () => {
  beforeEach(() => {
    mockedListMediaFormatsInternal.mockReset();
  });

  it("rejects missing sourceUrl", async () => {
    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errorCode).toBe("VAL_SOURCE_URL_REQUIRED");
    expect(mockedListMediaFormatsInternal).not.toHaveBeenCalled();
  });

  it("returns full yt-dlp format summaries", async () => {
    mockedListMediaFormatsInternal.mockResolvedValueOnce({
      sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
      title: "Demo",
      originPlatform: "bilibili",
      recommendedFormatSelector: "bv*+ba/b",
      formats: [
        {
          formatId: "30280",
          ext: "m4a",
          resolution: "audio only",
          acodec: "mp4a.40.2",
          vcodec: "none",
          hasAudio: true,
          hasVideo: false,
        },
        {
          formatId: "30080",
          ext: "mp4",
          resolution: "1920x1080",
          acodec: "none",
          vcodec: "avc1",
          hasAudio: false,
          hasVideo: true,
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
          qualityPreference: "best",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.recommendedFormatSelector).toBe("bv*+ba/b");
    expect(payload.data.formats).toHaveLength(2);
    expect(mockedListMediaFormatsInternal).toHaveBeenCalledWith(
      "https://www.bilibili.com/video/BV1W2oSBWEYw/",
      "best",
    );
  });
});
