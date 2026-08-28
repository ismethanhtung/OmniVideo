import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/config/env", () => ({
  getAppEnv: vi.fn(() => ({
    COBALT_API_URL: "https://api.cobalt.tools",
    COBALT_API_KEY: "mock-key",
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

  it("rejects unsupported platforms when COBALT_API_URL is missing", async () => {
    const { getAppEnv } = await import("@/lib/config/env");
    vi.mocked(getAppEnv).mockReturnValueOnce({
      MONGODB_URI: "",
      MONGODB_DB_NAME: "",
    });

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.bilibili.com/video/BV12345/",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.errorCode).toBe("COBALT_URL_MISSING");
  });

  it("uses Cobalt API when COBALT_API_URL is configured for other platforms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          status: "success",
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

  it("uses TaiNhanhVideo API when sourceUrl is Douyin", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: {
          getSetCookie: () => ["XSRF-TOKEN=mock-cookie; path=/"],
        },
        text: async () => '<html><meta name="csrf-token" content="mock-token"></html>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: true,
          message: "success",
          data: {
            video_download_url: "https://api.douyin.wtf/download/file",
            title: "douyin-video-test",
          },
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

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
    expect(payload.data.resolverProfile).toBe("tainhanhvideo");
    expect(payload.data.formats).toHaveLength(2);
    expect(payload.data.formats[0].formatId).toBe("douyin-video-hd");
  });

  it("uses TikWM API when sourceUrl is TikTok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          code: 0,
          msg: "success",
          data: {
            id: "12345",
            title: "tiktok-video-test",
            play: "https://www.tikwm.com/video/123",
            music: "https://www.tikwm.com/music/123",
          },
        }),
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/video-intake/formats", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceUrl: "https://www.tiktok.com/@user/video/12345",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.title).toBe("tiktok-video-test");
    expect(payload.data.resolverProfile).toBe("tikwm");
    expect(payload.data.formats).toHaveLength(2);
    expect(payload.data.formats[0].formatId).toBe("tikwm-video");
  });
});
