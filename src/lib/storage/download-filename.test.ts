import { describe, expect, it } from "vitest";

import { resolveDownloadFilenameForAsset } from "./download-filename";

describe("resolveDownloadFilenameForAsset", () => {
  it("uses image extension for thumbnail mime types", () => {
    expect(
      resolveDownloadFilenameForAsset({
        title: "thumb-asset",
        mimeType: "image/png",
      }),
    ).toBe("thumb-asset.png");
  });

  it("keeps existing extension when title already has one", () => {
    expect(
      resolveDownloadFilenameForAsset({
        title: "thumb-asset.jpeg",
        mimeType: "image/png",
      }),
    ).toBe("thumb-asset.jpeg");
  });

  it("falls back to mp4 for unknown video subtypes", () => {
    expect(
      resolveDownloadFilenameForAsset({
        title: "vip-output",
        mimeType: "video/unknown",
      }),
    ).toBe("vip-output.mp4");
  });
});
