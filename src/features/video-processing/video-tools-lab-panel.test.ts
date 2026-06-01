import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
    buildSubtitleAssPlacementFromPreview,
    buildSubtitleAssPlacementFromPreviewPercent,
} from "@/lib/video-processing/subtitle-placement";

const SOURCE_PATH = "src/features/video-processing/video-tools-lab-panel.tsx";
const HELPER_SOURCE_PATH =
    "src/lib/video-processing/subtitle-placement.ts";

describe("Video Tools Lab source preview controls", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    const helperSource = readFileSync(HELPER_SOURCE_PATH, "utf8");

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
        expect(source).toContain("Đã lưu setup vào video asset.");
        expect(source).toContain("applyVideoEditSetup(videoEditSetup)");
        expect(source).toContain("/api/storage/assets/save-video-setup");
        expect(source).toContain("!selectedAssetId && !videoFile");
        expect(source).toContain("Đang lưu setup...");
        expect(source).toContain("Saving Setup...");
        expect(source).toContain("saveLocalVideoEditSetup");
        expect(source).toContain("loadLocalVideoEditSetup");
        expect(source).toContain("Đã áp dụng setup local đã lưu cho file này.");
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
        expect(source).toContain("useState(false)");
        expect(source).toContain("Add subtitle box");
        expect(source).toContain("coverBoxesJson");
        expect(source).toContain("coverBoxColor");
        expect(source).toContain("subtitleBackgroundPaddingY");
        expect(source).toContain("Text Overlay");
        expect(source).toContain("Ăn Không Ngồi Rồi");
        expect(source).toContain("textOverlaysJson");
        expect(source).toContain("textOverlayPlayResX");
        expect(source).toContain("getVideoTextFontOption");
    });

    it("keeps preview placement as the source for exported subtitle margins", () => {
        expect(source).toContain("buildSubtitleAssPlacementFromPreview");
        expect(source).toContain("getCurrentSubtitleAssPlacement");
        expect(source).toContain("subtitleAssPlacement.subtitleMarginBottom");
        expect(source).toContain("subtitleAssPlacement.subtitleAlignment");
        expect(source).toContain("getCurrentSubtitlePreviewLineCount");
        expect(source).toContain("subtitleTextRef");
        expect(source).toContain("getCurrentSubtitlePlacementRegion");
        expect(source).toContain("subtitleRegionY");
        expect(helperSource).toContain("buildSubtitlePlacementRegionFromPreview");
        expect(helperSource).toContain("resolveBottomAlignedAssAlignment");
    });

    it("uses compact subtitle defaults and richer font choices with preview styling", () => {
        expect(source).toContain('setSubtitleFontFamily("Bangers")');
        expect(source).toContain("useState(50)");
        expect(source).toContain("useState(8)");
        expect(source).toContain("setSubtitleFontSize(50)");
        expect(source).toContain("setSubtitleBackgroundPaddingY(8)");
        expect(source).toContain("if (!hasBlurEnabled && !hasCoverBoxEnabled)");
        expect(source).toContain("VIDEO_TEXT_FONT_OPTIONS.map");
        expect(source).toContain("Braah One");
        expect(source).toContain("Lobster");
        expect(source).toContain("Mitr");
        expect(source).toContain("Paytone One");
        expect(source).toContain("Agbalumo");
        expect(source).toContain("getVideoTextFontFamily");
    });

    it("derives fallback subtitle margins from the preview region bottom edge", () => {
        const placement = buildSubtitleAssPlacementFromPreview({
            leftPx: 0,
            topPx: 330,
            frameWidth: 747,
            frameHeight: 420,
            boxWidth: 747,
            boxHeight: 30,
            videoWidth: 1920,
            videoHeight: 1080,
            subtitleFontSize: 40,
            subtitleBackgroundPaddingY: 8,
            lineCount: 1,
        });

        expect(placement.subtitleAlignment).toBe(2);
        expect(placement.subtitleMarginBottom).toBe(154);
    });

    it("rebuilds exported ASS placement from saved preview percentages", () => {
        const placement = buildSubtitleAssPlacementFromPreviewPercent({
            leftPercent: 0,
            topPercent: 78.57,
            widthPercent: 100,
            playResX: 1920,
            playResY: 1080,
        });

        expect(placement).toEqual({
            subtitleAlignment: 2,
            subtitleMarginLeft: 0,
            subtitleMarginRight: 0,
            subtitleMarginBottom: 231,
        });
    });
});
