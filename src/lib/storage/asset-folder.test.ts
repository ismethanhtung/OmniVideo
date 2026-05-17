import { describe, expect, it } from "vitest";

import {
  buildFolderAssetTags,
  getAssetFolderName,
  inferFolderFromTags,
  matchesVideoAssetSearch,
  normalizeAssetFolderName,
} from "./asset-folder";

describe("asset folder helpers", () => {
  it("normalizes user-entered folder names", () => {
    expect(normalizeAssetFolderName("  kiến thức   sức khoẻ  ")).toBe(
      "kiến thức sức khoẻ",
    );
  });

  it("builds de-duplicated raw and processed tags around the folder", () => {
    expect(
      buildFolderAssetTags({
        folder: "kiến thức sức khoẻ",
        lifecycle: "processed",
        extraTags: ["processed", "Kiến thức sức khoẻ"],
      }),
    ).toEqual(["kiến thức sức khoẻ", "processed"]);
  });

  it("infers legacy folder names from non-lifecycle tags", () => {
    expect(inferFolderFromTags(["processed", "du lịch", "raw"])).toBe(
      "du lịch",
    );
    expect(getAssetFolderName({ metadata: { tags: ["raw", "food"] } })).toBe(
      "food",
    );
  });

  it("matches folder searches accent-insensitively", () => {
    const asset = {
      _id: "asset-1",
      metadata: {
        title: "Video 01",
        folder: "kiến thức sức khoẻ",
        tags: ["kiến thức sức khoẻ", "raw"],
        sourceUrl: "https://example.com/video",
      },
    };

    expect(matchesVideoAssetSearch(asset, "kiến thức")).toBe(true);
    expect(matchesVideoAssetSearch(asset, "kien thuc")).toBe(true);
    expect(matchesVideoAssetSearch(asset, "du lich")).toBe(false);
  });
});
