import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/ai-image/ai-image-studio-panel.tsx";

describe("AI Image Studio storyboard planner", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("keeps the Audio Transcript-style bordered page shell", () => {
        expect(source).toContain('className="border border-main bg-main"');
        expect(source).toContain("border-b border-main bg-secondary/45");
        expect(source).toContain("xl:grid-cols-[380px_minmax(0,1fr)]");
        expect(source).toContain('className="grid shrink-0 grid-cols-3 gap-2 text-[10px] text-muted"');
        expect(source).toContain('label="Storyboard"');
        expect(source).toContain('label="Images"');
        expect(source).toContain('label="Render"');
    });

    it("matches Audio Transcript compact fields and light accent actions", () => {
        expect(source).toContain("const FIELD_CLASS");
        expect(source).toContain("px-2 py-1.5 text-[11px] text-main");
        expect(source).toContain("const TEXTAREA_CLASS");
        expect(source).toContain("placeholder:text-muted/60");
        expect(source).toContain("const PRIMARY_ACTION_CLASS");
        expect(source).toContain(
            "border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent",
        );
        expect(source).not.toContain("border border-accent bg-accent");
        expect(source).not.toContain("text-inverse");
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
        expect(source).toContain("referenceImageInputRef");
        expect(source).toContain("referenceImageInputRef.current?.click()");
        expect(source).toContain("useState(DEFAULT_GEMINI_TEXT_MODEL)");
        expect(source).toContain("Style");
        expect(source).toContain("Video Assembly");
        expect(source).toContain("/api/ai-image/render-video");
        expect(source).toContain("Render Video");
        expect(source).toContain("Download Video");
        expect(source).toContain("Voice TTS");
        expect(source).toContain("Subtitles");
    });
});
