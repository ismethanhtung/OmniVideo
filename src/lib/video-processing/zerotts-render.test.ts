import { describe, expect, it } from "vitest";

import {
    escapeFilterPath,
    formatAssTimestamp,
    generateAssSubtitleContent,
    renderZeroTtsVideo,
    ZeroTtsRenderError,
    type ZeroTtsSubtitleWord,
} from "./zerotts-render";

describe("ZeroTTS Video Render Engine", () => {
    const sampleTimeline: ZeroTtsSubtitleWord[] = [
        { word: "Xin", start: 0.1, end: 0.4, index: 0 },
        { word: "chào", start: 0.4, end: 0.8, index: 1 },
        { word: "Việt", start: 0.8, end: 1.2, index: 2 },
        { word: "Nam", start: 1.2, end: 1.6, index: 3 },
    ];

    it("formats timestamps into valid ASS h:mm:ss.cc format", () => {
        expect(formatAssTimestamp(0)).toBe("0:00:00.00");
        expect(formatAssTimestamp(1.5)).toBe("0:00:01.50");
        expect(formatAssTimestamp(65.25)).toBe("0:01:05.25");
        expect(formatAssTimestamp(3661.05)).toBe("1:01:01.05");
    });

    it("escapes path characters for FFmpeg filter safety", () => {
        expect(escapeFilterPath("/path/to:file'name,test.ass")).toBe(
            "/path/to\\:file\\'name\\,test.ass",
        );
    });

    it("generates borderless and underline-free ASS subtitles for clean styles", () => {
        const ass = generateAssSubtitleContent(sampleTimeline, {
            captionStyle: "clean_yellow",
            captionPosition: "bottom",
            captionSize: "md",
        });

        expect(ass).toContain("[Script Info]");
        expect(ass).toContain("[V4+ Styles]");
        expect(ass).toContain("[Events]");
        // Outline=0 indicates borderless in ASS style
        expect(ass).toContain(",1,0,1,2,20,20,");
        // Active word should have color but no underline tag \u1
        expect(ass).toContain("\\c&H0000E6FF&\\b1\\fscx108\\fscy108");
        expect(ass).not.toContain("\\u1");
    });

    it("generates minimal white borderless subtitles without underline", () => {
        const ass = generateAssSubtitleContent(sampleTimeline, {
            captionStyle: "clean_white",
            captionPosition: "top",
            captionSize: "lg",
        });

        expect(ass).toContain(",1,0,1,8,20,20,"); // alignment 8 = top center, outline 0 = borderless
        expect(ass).toContain("\\c&H00FFFFFF&\\b1\\fscx108\\fscy108");
        expect(ass).not.toContain("\\u1");
    });

    it("supports explicit captionNoBorder and captionNoUnderline overrides", () => {
        const ass = generateAssSubtitleContent(sampleTimeline, {
            captionStyle: "capcut_yellow",
            captionNoBorder: true,
            captionNoUnderline: true,
        });

        expect(ass).toContain(",1,0,1,2,20,20,"); // Outline=0
        expect(ass).not.toContain("\\u1");
    });

    it("includes underline tags when captionNoUnderline is false for classic styles", () => {
        const ass = generateAssSubtitleContent(sampleTimeline, {
            captionStyle: "capcut_yellow",
            captionNoBorder: false,
            captionNoUnderline: false,
        });

        expect(ass).toContain(",1,2,0,2,20,20,"); // Outline=2
        expect(ass).toContain("\\u1");
    });

    it("throws ZeroTtsRenderError when video bytes are missing", async () => {
        await expect(
            renderZeroTtsVideo({
                video: { fileName: "test.mp4", bytes: new Uint8Array() },
                speech: { fileName: "speech.wav", bytes: new Uint8Array([1, 2, 3]) },
            }),
        ).rejects.toThrow(ZeroTtsRenderError);

        await expect(
            renderZeroTtsVideo({
                video: { fileName: "test.mp4", bytes: new Uint8Array() },
                speech: { fileName: "speech.wav", bytes: new Uint8Array([1, 2, 3]) },
            }),
        ).rejects.toMatchObject({
            code: "ZERO_TTS_VIDEO_REQUIRED",
            status: 400,
        });
    });

    it("throws ZeroTtsRenderError when speech bytes are missing", async () => {
        await expect(
            renderZeroTtsVideo({
                video: { fileName: "test.mp4", bytes: new Uint8Array([1, 2, 3]) },
                speech: { fileName: "speech.wav", bytes: new Uint8Array() },
            }),
        ).rejects.toMatchObject({
            code: "ZERO_TTS_SPEECH_REQUIRED",
            status: 400,
        });
    });
});
