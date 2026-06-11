import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/social/publish-records-panel.tsx";

describe("Publish Records View Mode errors", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders failed status and form messages in red", () => {
        expect(source).toContain('const statusFailed = status === "failed";');
        expect(source).toContain('statusFailed ? "text-rose-700" : "text-muted"');
        expect(source).toContain(
            'statusFailed\n                                        ? "font-semibold text-rose-700"',
        );
    });

    it("makes video assets searchable by folder metadata", () => {
        expect(source).toContain("matchesVideoAssetSearch");
        expect(source).toContain("Search title, folder, tags...");
        expect(source).toContain("AssetLifecycleBadges");
    });

    it("shows generated metadata fields in records and detail", () => {
        expect(source).toContain('<th className="px-4 py-2 font-semibold">');
        expect(source).toContain("selectedRecord.title || \"-\"");
        expect(source).toContain("selectedRecord.hashtags.join(\", \") || \"-\"");
        expect(source).toContain("selectedRecord.caption || \"-\"");
        expect(source).toContain('label="Title"');
        expect(source).toContain('label="Caption"');
    });

    it("loads and submits thumbnail assets from the publish form", () => {
        expect(source).toContain("StoredThumbnailAsset");
        expect(source).toContain("/api/storage/thumbnail-assets?limit=100");
        expect(source).toContain("thumbnailAssetId:");
        expect(source).toContain("selectedThumbnail");
        expect(source).toContain("Search thumbnail title, folder, tags...");
        expect(source).toContain(
            "/api/storage/thumbnail-assets/${selectedThumbnail._id}/download?disposition=inline",
        );
    });
});
