import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-processing/video-tools-lab-panel.tsx";

describe("Video Tools Lab source preview controls", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("keeps original preview playback controls outside the blur frame", () => {
        const previewStart = source.indexOf("Original Preview");
        const outputStart = source.indexOf("Edited Output");
        const originalPreviewSource = source.slice(previewStart, outputStart);

        expect(originalPreviewSource).toContain("<SourcePreviewControls");
        expect(originalPreviewSource).toContain("onTogglePlay");
        expect(originalPreviewSource).toContain("onSeek");
        expect(originalPreviewSource).not.toContain("controls");
    });

    it("keeps edited output native controls unchanged", () => {
        const outputStart = source.indexOf("Edited Output");
        const editedOutputSource = source.slice(outputStart);

        expect(editedOutputSource).toContain("<video");
        expect(editedOutputSource).toContain("controls");
    });

    it("shows and immediately reapplies saved setup for selected assets", () => {
        expect(source).toContain("hasSavedVideoEditSetup");
        expect(source).toContain("Saved setup");
        expect(source).toContain("applyVideoEditSetup(videoEditSetup)");
        expect(source).toContain("/api/storage/assets/save-video-setup");
        expect(source).toContain("!selectedAssetId && !videoFile");
        expect(source).toContain("Đang lưu setup...");
        expect(source).toContain("Saving Setup...");
        expect(source).toContain("saveLocalVideoEditSetup");
        expect(source).toContain("Workspace upload đúng file này");
    });

    it("makes asset picking searchable by folder metadata", () => {
        expect(source).toContain("matchesVideoAssetSearch");
        expect(source).toContain("Search title, folder, tags...");
        expect(source).toContain("AssetLifecycleBadges");
    });

    it("adds no-blur cover box and text overlay controls to the edit request", () => {
        expect(source).toContain("coverBoxEnabled");
        expect(source).toContain("Cover subtitle box");
        expect(source).toContain("Add subtitle box");
        expect(source).toContain("coverBoxesJson");
        expect(source).toContain("coverBoxColor");
        expect(source).toContain("Text Overlay");
        expect(source).toContain("Ăn Không Ngồi Rồi");
        expect(source).toContain("textOverlaysJson");
        expect(source).toContain("textOverlayPlayResX");
        expect(source).toContain("getVideoTextFontOption");
    });
});
