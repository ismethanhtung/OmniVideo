import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-processing/video-splitter-panel.tsx";

describe("Video Splitter panel", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders split on top and merge below in the same page", () => {
        expect(source).toContain("Split Video");
        expect(source).toContain("Merge Videos");
        expect(source).toContain("Video files (2+)");
        expect(source).toContain("Merge + Download MP4");
        expect(source).toContain('fetch("/api/video-processing/merge"');
    });

    it("previews the local merge queue and supports drag reorder before upload", () => {
        expect(source).toContain("Merge Preview");
        expect(source).toContain("URL.createObjectURL(file)");
        expect(source).toContain("URL.revokeObjectURL(url)");
        expect(source).toContain("onEnded");
        expect(source).toContain("Preview from first");
        expect(source).toContain("draggable");
        expect(source).toContain("onDragStart");
        expect(source).toContain("onDrop");
        expect(source).toContain("moveMergeFile(");
        expect(source).toContain("removeMergeFile(index)");
        expect(source).toContain("for (const file of mergeFiles)");
        expect(source).toContain(
            "does not upload or merge files until you",
        );
    });

    it("shows dimensions and a visual format warning before stream-copy merge", () => {
        expect(source).toContain('video.preload = "metadata"');
        expect(source).toContain("video.onloadedmetadata");
        expect(source).toContain("video.onerror");
        expect(source).toContain("Format Compatibility");
        expect(source).toContain("Matches base format");
        expect(source).toContain("Different from base format");
        expect(source).toContain("Format mismatch: stream-copy merge may");
        expect(source).toContain("Cannot read local video metadata.");
        expect(source).toContain("aspectRatio:");
        expect(source).toContain("border-sky-500");
        expect(source).toContain("border-amber-500");
    });

    it("provides interval and head clip split modes", () => {
        expect(source).toContain("Split mode");
        expect(source).toContain("Chia theo block thời lượng");
        expect(source).toContain("Chia đều theo số phần");
        expect(source).toContain("Chỉ cắt đoạn đầu");
        expect(source).toContain("YouTube Short 9:16");
        expect(source).toContain("30 minutes");
        expect(source).toContain("45 minutes");
        expect(source).toContain("60 minutes");
        expect(source).toContain("3 minutes");
        expect(source).toContain("15 minutes");
        expect(source).toContain("Number of parts");
        expect(source).toContain('formData.set("splitParts"');
    });

    it("calls split API and exposes direct download link", () => {
        expect(source).toContain('fetch("/api/video-processing/split"');
        expect(source).toContain("Split + Download ZIP");
        expect(source).toContain("Download trực tiếp");
        expect(source).toContain("downloadUrl");
    });

    it("renders YouTube Short through the edit API from Video Tools", () => {
        expect(source).toContain("SPLIT_MODE_OPTIONS.map");
        expect(source).toContain('mode === "short"');
        expect(source).toContain('formData.set("responseMode", "binary")');
        expect(source).toContain('formData.set("shortClipEnabled", "true")');
        expect(source).toContain('formData.set("shortClipStart"');
        expect(source).toContain('"shortClipDuration"');
        expect(source).toContain('fetch("/api/video-processing/edit"');
        expect(source).toContain("Render Short + Download MP4");
        expect(source).toContain("[60, 120, 180].map");
    });
});
