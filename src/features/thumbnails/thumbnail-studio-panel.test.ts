import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/thumbnails/thumbnail-studio-panel.tsx";

describe("Thumbnail Studio UI shell", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("uses a split library and editor layout with consistent app shell styling", () => {
        expect(source).toContain("xl:grid-cols-[3fr_5fr]");
        expect(source).toContain("xl:grid-cols-[3fr_2fr]");
        expect(source).toContain("Thumbnail Library");
        expect(source).toContain("Text Overlay");
        expect(source).toContain("Crop + Blur");
        expect(source).toContain("aspect-video overflow-hidden border-b border-main bg-zinc-900");
        expect(source).toContain("grid-cols-3 gap-2");
    });

    it("supports import affordances for drag-drop and URL", () => {
        expect(source).toContain("Drag image into this box to import");
        expect(source).toContain("Import from URL");
        expect(source).toContain("handleDropUpload");
        expect(source).toContain("handleImportFromUrl");
    });

    it("keeps lifecycle tags and non-destructive edit defaults visible", () => {
        expect(source).toContain('"raw" | "processed" | "has-processed-output"');
        expect(source).toContain("AssetLifecycleBadges");
        expect(source).toContain("Create variant (default)");
        expect(source).toContain("Overwrite current");
        expect(source).toContain("Toggle lifecycle filter menu");
        expect(source).not.toContain("Active filter:");
    });

    it("includes rename, duplicate/delete controls, and workflow integration", () => {
        expect(source).toContain("Thumbnail name");
        expect(source).toContain("Save");
        expect(source).toContain("Duplicate");
        expect(source).toContain("Reset");
        expect(source).toContain("Delete");
        expect(source).toContain("handleDuplicateSelected");
        expect(source).toContain("handleDeleteSelected");
        expect(source).toContain("handleResetEditor");
        expect(source).not.toContain('aria-label="Duplicate thumbnail"');
        expect(source).not.toContain('aria-label="Delete thumbnail"');
        expect(source).toContain("w-full border text-left overflow-hidden");
        expect(source).not.toContain("w-full border p-2 text-left");
        expect(source).toContain("duplicateThumbnail(");
        expect(source).not.toContain("Updated 12m ago");
        expect(source).not.toContain("Rename freely for better search and pipeline mapping.");
        expect(source).toContain("workflow.thumbnail.select");
        expect(source).toContain("Publish node target");
    });

    it("uses drag-to-position text on preview instead of X/Y sliders", () => {
        expect(source).toContain("Text position: drag directly on preview");
        expect(source).toContain("onPointerDown");
        expect(source).toContain("onPointerMove");
        expect(source).toContain("handleCanvasTextDrag");
        expect(source).not.toContain("Text X position");
        expect(source).not.toContain("Text Y position");
    });
});
