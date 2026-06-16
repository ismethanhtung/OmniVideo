import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/ai-image/ai-image-studio-panel.tsx";

describe("AI Image Studio storyboard planner", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("keeps the Audio Transcript-style bordered page shell", () => {
        expect(source).toContain('className="border border-main bg-main"');
        expect(source).toContain("border-b border-main bg-secondary/45");
        expect(source).toContain("xl:grid-cols-[380px_minmax(0,1fr)]");
    });

    it("exposes storyboard generation controls instead of image API controls", () => {
        expect(source).toContain("Script Generator");
        expect(source).toContain("Category");
        expect(source).toContain("Idea / improve prompt");
        expect(source).toContain("Retry instruction");
        expect(source).toContain("/api/ai-image/storyboard");
        expect(source).not.toContain("HF token");
        expect(source).not.toContain("Negative prompt");
    });

    it("renders copy controls and image upload for each scene", () => {
        expect(source).toContain("Hình ảnh gợi ý (Visual)");
        expect(source).toContain("Lời thoại (Voiceover)");
        expect(source).toContain("Copy Visual");
        expect(source).toContain("Copy Voice");
        expect(source).toContain("Copy Scene");
        expect(source).toContain("Upload Image");
    });

    it("includes reference image bank and video assembly render controls", () => {
        expect(source).toContain("Reference Image Bank");
        expect(source).toContain("Style");
        expect(source).toContain("Video Assembly");
        expect(source).toContain("/api/ai-image/render-video");
        expect(source).toContain("Render Video");
        expect(source).toContain("Download Video");
        expect(source).toContain("Voice TTS");
        expect(source).toContain("Subtitles");
    });
});
