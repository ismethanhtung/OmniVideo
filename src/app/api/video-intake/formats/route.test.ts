import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppEnv } from "@/lib/config/env";
import { POST } from "./route";

vi.mock("@/lib/config/env", () => ({
  getAppEnv: vi.fn(() => ({
    MONGODB_URI: "mongodb://localhost:27017",
    MONGODB_DB_NAME: "test",
    COBALT_API_URL: "",
  })),
}));

describe("video intake formats API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
  });

  it("rejects when COBALT_API_URL is missing", async () => {
    const mockedGetAppEnv = vi.mocked(getAppEnv);
    mockedGetAppEnv.mockReturnValue({
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB_NAME: "test",
      COBALT_API_URL: "",
    });

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.youtube.com/watch?v=demo",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errorCode).toBe("COBALT_URL_MISSING");
  });

  it("uses Cobalt API when COBALT_API_URL is configured and response is successful", async () => {
    const mockedGetAppEnv = vi.mocked(getAppEnv);
    mockedGetAppEnv.mockReturnValue({
      MONGODB_URI: "mongodb://localhost:27017",
      MONGODB_DB_NAME: "test",
      COBALT_API_URL: "https://api.cobalt.tools",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "tunnel",
          url: "https://api.cobalt.tools/download/file",
          filename: "cobalt-video-file.mp4",
        }),
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.youtube.com/watch?v=demo",
          qualityPreference: "best",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.title).toBe("cobalt-video-file.mp4");
    expect(payload.data.resolverProfile).toBe("cobalt");
    expect(payload.data.formats).toHaveLength(2);
    expect(payload.data.formats[0].formatId).toBe("cobalt-video");
  });

  it("uses Douyin.wtf API when sourceUrl is Douyin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
          video_data: {
            desc: "douyin-video-test",
            nwm_video_url_HQ: "https://api.douyin.wtf/download/file",
            music_url: "https://api.douyin.wtf/download/music",
          },
        }),
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.douyin.com/video/7650434462522030705",
          qualityPreference: "best",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.title).toBe("douyin-video-test");
    expect(payload.data.resolverProfile).toBe("douyin_wtf");
    expect(payload.data.formats).toHaveLength(2);
    expect(payload.data.formats[0].formatId).toBe("douyin-video-hq");
  });
});
