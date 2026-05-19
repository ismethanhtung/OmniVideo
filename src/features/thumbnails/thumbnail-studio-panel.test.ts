import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/thumbnails/thumbnail-studio-panel.tsx";

describe("Thumbnail Studio UI shell", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("uses a split library and editor layout with consistent app shell styling", () => {
        expect(source).toContain("xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]");
        expect(source).toContain("xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]");
        expect(source).toContain("Thumbnail Library");
        expect(source).toContain("Text Overlay");
        expect(source).toContain("Crop + Blur");
        expect(source).toContain("aspect-video overflow-hidden border-b border-main bg-zinc-900");
        expect(source).toContain("grid-cols-3 gap-2");
        expect(source).toContain("truncate px-1.5 pt-1.5 text-[11px] font-semibold text-main");
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
        expect(source).toContain("const [blurEnabled, setBlurEnabled] = useState(false);");
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
        expect(source).not.toContain("Workflow Output Hook");
        expect(source).not.toContain("workflow.thumbnail.select");
        expect(source).not.toContain("Publish node target");
    });

    it("uses compact multi-item blur/text summaries and drag-to-position text", () => {
        expect(source).toContain("formatBlurRegionSummary");
        expect(source).toContain("formatTextOverlaySummary");
        expect(source).toContain("Add blur region");
        expect(source).toContain("Add text layer");
        expect(source).toContain("min-w-0 max-w-full flex-1 truncate whitespace-nowrap text-left text-[10px]");
        expect(source).toContain("flex w-full max-w-full items-center gap-1 overflow-hidden border px-1.5 py-1");
        expect(source).toContain("Remove blur region #");
        expect(source).toContain("Remove text layer #");
        expect(source).toContain("<X className=\"h-3 w-3\" />");
        expect(source).toContain("startBlurInteraction");
        expect(source).toContain("Resize blur region");
        expect(source).toContain("BLUR_RESIZE_HANDLES");
        expect(source).toContain("border border-main bg-black/40 cursor-move");
        expect(source).not.toContain("border-white/70");
        expect(source).toContain("absolute z-10 bg-transparent");
        expect(source).not.toContain("rounded-full bg-accent");
        expect(source).not.toContain("Remove active blur region");
        expect(source).not.toContain("Remove active text layer");
        expect(source).not.toContain("X %");
        expect(source).not.toContain("Y %");
        expect(source).not.toContain("Width %");
        expect(source).not.toContain("Height %");
        expect(source).not.toContain("Start (s)");
        expect(source).not.toContain("End (s)");
        expect(source).toContain("Text position: drag directly on preview");
        expect(source).toContain("onPointerDown");
        expect(source).toContain("onPointerMove");
        expect(source).toContain("const [textDragState, setTextDragState]");
        expect(source).toContain("offsetXPercent");
        expect(source).toContain("offsetYPercent");
        expect(source).toContain("handleCanvasTextDrag(");
        expect(source).toContain("Drag text overlay on preview #");
        expect(source).not.toContain("Drag blur block to move.");
        expect(source).not.toContain("Text X position");
        expect(source).not.toContain("Text Y position");
    });
});
