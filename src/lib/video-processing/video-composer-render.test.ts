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
        // CRF 23 = standard quality (was lossless CRF 0 which caused ~340 MB output)
        expect(source).toContain('"-crf"');
        expect(source).toContain('"23"');
        expect(source).toContain('"-b:a"');
        expect(source).toContain('"192k"');
    });

    it("does not mix -vf with -filter_complex (causes QuickTime-incompatible output)", () => {
        // When music is present the video filter chain must live inside
        // filter_complex via a [0:v]....[v] label — using both -vf AND
        // -filter_complex simultaneously is illegal in FFmpeg and produces
        // corrupt / non-playable files.
        expect(source).toContain("[0:v]");
        expect(source).toContain('[v]"');
        // faststart makes the file streamable / playable in QuickTime
        expect(source).toContain('"+faststart"');
    });

    it("resolves fonts, produces multi-line drawtext with shadow matching the preview", () => {
        // Font resolution: Google Fonts CSS2 + Python UA → returns real .ttf URLs (not EOT)
        expect(source).toContain("FONT_CACHE_DIR");
        expect(source).toContain("SYSTEM_FONT_MAP");
        expect(source).toContain("resolveFont");
        expect(source).toContain("fontfile='");
        expect(source).toContain("css2?family=");
        expect(source).toContain("Python-urllib");
        // Multiline: text is split per line, one drawtext filter each
        expect(source).toContain('text.split("\\n")');
        expect(source).toContain("buildDrawtextFilters");
        // Shadow uses hex ARGB (0x000000CC) for broad FFmpeg compatibility
        // (the 'black@0.8' alpha shorthand is not reliable in all builds)
        expect(source).toContain("shadowx=2:shadowy=2:shadowcolor=0x000000CC");
        // Anchoring uses toFixed(4) for consistent sub-pixel accuracy
        expect(source).toContain("-text_w/2");
        // y uses a lineHeight-based pixel offset for multiline centering (not text_h/2)
        expect(source).toContain("lineHeight");
        expect(source).toContain("totalBlockPx");
    });

    it("uses setpts-only for slow motion (no minterpolate) — identical to player at 0.75x", () => {
        // minterpolate was removed: synthesised frames via motion estimation always
        // introduce artifacts (ghosting, loè) that are visually worse than simply
        // holding original frames longer — which is exactly what a player does at 0.75x.
        // setpts=PTS/${speed} gives each frame a stretched PTS; the encoder writes them
        // with those timestamps and the player displays each frame for the correct
        // extended duration.
        expect(source).toContain("setpts=PTS/${speed}");
        expect(source).not.toContain("minterpolate");
    });

    it("uses Unicode-safe scaled text with preview-matching center anchors", () => {
        expect(source).toContain("UNICODE_FONT_CANDIDATES");
        expect(source).toContain("Arial Unicode.ttf");
        expect(source).toContain("resolveUnicodeFontFile");
        expect(source).toContain("PREVIEW_CANVAS_HEIGHT");
        // probeVideoInfo replaces the old probeVideoHeight and also returns duration
        expect(source).toContain("probeVideoInfo");
    });

    it("fades out video and audio at the end when fadeOut is enabled", () => {
        expect(source).toContain("FADE_OUT_DURATION");
        expect(source).toContain("fade=t=out:");
        expect(source).toContain("afade=t=out:");
        expect(source).toContain("fadeStart");
        expect(source).toContain("wantFadeOut");
    });

    it("syncs duration: music loops in video mode, no loop in music mode", () => {
        expect(source).toContain('durationMode === "video"');
        // Video mode: music stream loops indefinitely, -shortest cuts at video end
        expect(source).toContain('"-stream_loop", "-1"');
        // Music mode: no stream_loop flag; -shortest stops at the shorter track
        expect(source).toContain('durationMode ?? "video"');
    });

    it("routes muted-original audio through filter_complex to avoid -shortest timing bug", () => {
        // The fundamental fix: use explicit -t (calculated from probed durations)
        // instead of -shortest when music is present. -shortest with filter_complex
        // can trigger against the dangling [0:a] input stream duration.
        expect(source).toContain("outputDuration");
        expect(source).toContain('args.push("-t"');
        // apad ensures music audio always covers the full outputDuration
        expect(source).toContain("apad=pad_dur=");
        // music still routed through filter_complex for consistent timing
        expect(source).toContain("[1:a]volume=");
        expect(source).toContain("[mixed]");
    });

    it("requires a clip and removes temporary render files", () => {
        expect(source).toContain("COMPOSER_VIDEO_REQUIRED");
        expect(source).toContain("Add at least one video clip");
        expect(source).toContain("await rm(workDir");
    });

    it("respects clipTrims, writing inpoint/outpoint and computing trimmed raw seconds", () => {
        expect(source).toContain("clipTrims =");
        expect(source).toContain("inpoint ");
        expect(source).toContain("outpoint ");
        expect(source).toContain("respecting clipTrims");
    });
});
