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
    });

    it("makes asset picking searchable by folder metadata", () => {
        expect(source).toContain("matchesVideoAssetSearch");
        expect(source).toContain("Search title, folder, tags...");
    });
});
