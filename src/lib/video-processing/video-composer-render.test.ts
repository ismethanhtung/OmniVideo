import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/lib/video-processing/video-composer-render.ts";

describe("Video Composer render runtime", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("creates one ffmpeg render with speed, music, vintage and text filters", () => {
        expect(source).toContain('"concat"');
        expect(source).toContain("setpts=PTS/${speed}");
        expect(source).toContain("atempo=${speed}");
        expect(source).toContain("amix=inputs=2");
        expect(source).toContain("noise=alls=5");
        expect(source).toContain("drawtext=");
        expect(source).toContain("libx264");
        expect(source).toContain('"-crf"');
        expect(source).toContain('"0"');
        expect(source).toContain('"-b:a"');
        expect(source).toContain('"320k"');
    });

    it("uses Unicode-safe scaled text with preview-matching center anchors", () => {
        expect(source).toContain("UNICODE_FONT_CANDIDATES");
        expect(source).toContain("Arial Unicode.ttf");
        expect(source).toContain("resolveUnicodeFontFile");
        expect(source).toContain("PREVIEW_CANVAS_HEIGHT");
        expect(source).toContain("probeVideoHeight");
        expect(source).toContain("replace(/\\n/g, \"\\\\n\")");
        expect(source).toContain("x=w*${x / 100}-text_w/2");
        expect(source).toContain("y=h*${y / 100}-text_h/2");
    });

    it("requires a clip and removes temporary render files", () => {
        expect(source).toContain("COMPOSER_VIDEO_REQUIRED");
        expect(source).toContain("Add at least one video clip");
        expect(source).toContain("await rm(workDir");
    });
});
