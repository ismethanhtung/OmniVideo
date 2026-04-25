import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config/env", () => ({
  getAppEnv: vi.fn(),
}));

vi.mock("./internal-resolver", () => ({
  resolveMediaUrlInternal: vi.fn(),
}));

vi.mock("./platform", () => ({
  isLikelyDirectMediaUrl: vi.fn(),
}));

import { getAppEnv } from "@/lib/config/env";

import { resolveMediaUrlInternal } from "./internal-resolver";
import { resolveMediaUrl } from "./media-resolver";
import { isLikelyDirectMediaUrl } from "./platform";

const getAppEnvMock = vi.mocked(getAppEnv);
const resolveMediaUrlInternalMock = vi.mocked(resolveMediaUrlInternal);
const isLikelyDirectMediaUrlMock = vi.mocked(isLikelyDirectMediaUrl);

describe("resolveMediaUrl", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    isLikelyDirectMediaUrlMock.mockReturnValue(false);
    getAppEnvMock.mockReturnValue({
      MONGODB_URI: "",
      MONGODB_DB_NAME: "",
      TELEGRAM_BOT_TOKEN: "",
      TELEGRAM_CHAT_ID: "",
      VIDEO_RESOLVER_ENDPOINT: "",
      GOOGLE_DRIVE_ACCESS_TOKEN: "",
      GOOGLE_DRIVE_FOLDER_ID: "",
    });
  });

  it("keeps requestHeaders from internal resolver payload", async () => {
    resolveMediaUrlInternalMock.mockResolvedValue({
      directMediaUrl: "https://cdn.example.com/video.mp4",
      requestHeaders: {
        "User-Agent": "yt-dlp-test",
        Referer: "https://www.youtube.com/watch?v=demo",
      },
      title: "Demo",
    });

    const result = await resolveMediaUrl({
      sourceUrl: "https://www.youtube.com/watch?v=demo",
      canonicalUrl: "https://www.youtube.com/watch?v=demo",
      storageProvider: "telegram",
      tags: ["intake", "raw"],
      originPlatform: "youtube",
    });

    expect(result.requestHeaders).toEqual({
      "User-Agent": "yt-dlp-test",
      Referer: "https://www.youtube.com/watch?v=demo",
    });
    expect(result.resolver).toBe("internal-resolver");
    expect(resolveMediaUrlInternalMock).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=demo",
      "best",
    );
  });
});
