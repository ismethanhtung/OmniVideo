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
});
