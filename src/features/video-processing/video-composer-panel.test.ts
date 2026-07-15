import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-processing/video-composer-panel.tsx";

describe("Video Composer panel", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("provides a local multi-clip preview workbench", () => {
        expect(source).toContain("Video Composer");
        expect(source).toContain("Add video clips");
        expect(source).toContain("Timeline · drag to reorder");
        expect(source).toContain("URL.createObjectURL(clip.file)");
        expect(source).toContain("URL.revokeObjectURL(url)");
        expect(source).toContain("moveClip(");
    });

    it("includes requested audio, vintage, text, and explicit project save controls", () => {
        expect(source).toContain("Upload music");
        expect(source).toContain("Original audio");
        expect(source).toContain("Retro / Vintage Film Effect");
        expect(source).toContain("Text Overlay");
        expect(source).toContain("Save Project + Download MP4");
        expect(source).toContain('fetch("/api/video-processing/composer-render"');
        expect(source).toContain('formData.append("videoFiles", clip.file)');
        expect(source).toContain('formData.set("musicFile", musicFile)');
        expect(source).toContain("X-OmniVideo-File-Name");
    });

    it("synchronizes music and exposes the CapCut-style editing controls", () => {
        expect(source).toContain("syncMusicToPreview");
        expect(source).toContain("onPlay={(event) => syncMusicToPreview");
        expect(source).toContain("onPause={() => musicRef.current?.pause()}");
        expect(source).toContain("Video speed");
        expect(source).toContain('min={4}');
        expect(source).toContain("onPointerDown");
        expect(source).toContain("updateTextPosition");
        expect(source).toContain("fine film scratches");
        expect(source).toContain("Music</div>");
        expect(source).toContain("synced preview");
        expect(source).toContain("playheadPercent");
    });

    it("captures video metadata before scheduling the duration state update", () => {
        expect(source).toContain("const video = event.currentTarget");
        expect(source).toContain("const duration = video.duration");
        expect(source).toContain("[activeClip.id]: duration");
        expect(source).not.toContain("[activeClip.id]: event.currentTarget.duration");
    });
});
