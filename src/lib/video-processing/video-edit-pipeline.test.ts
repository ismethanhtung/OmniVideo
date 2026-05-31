import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    buildSubtitleAssContent,
    buildTextOverlayAssContent,
    buildVideoEditFfmpegArgs,
    runVideoEditPipeline,
    runVideoEditPipelineFromPath,
    setVideoEditFfmpegSpawnForTest,
    setVideoEditReadFileForTest,
    validateVideoEditInput,
} from "./video-edit-pipeline";

function createMockFfmpegSpawn(exitCode = 0, stderr = "") {
    return vi.fn(() => {
        const child = new EventEmitter() as EventEmitter & {
            stderr: PassThrough;
        };
        child.stderr = new PassThrough();
        setTimeout(() => {
            if (stderr) child.stderr.write(stderr);
            child.emit("close", exitCode);
        }, 0);
        return child;
    });
}

const translatedSegments = [
    {
        id: 1,
        start: 0.5,
        end: 2.75,
        sourceText: "ni hao",
        translatedText: "Xin chao",
    },
];

describe("video edit pipeline", () => {
    afterEach(() => {
        setVideoEditFfmpegSpawnForTest(null);
        setVideoEditReadFileForTest(null);
    });

    it("builds ffmpeg args for mirror, partial blur and ASS subtitle overlay", () => {
        const args = buildVideoEditFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            outputPath: "/tmp/out.mp4",
            mirror: true,
            blur: {
                enabled: true,
                region: { x: 10, y: 76, width: 80, height: 18 },
                timeline: { start: 1, end: 5 },
                strength: 22,
            },
            subtitleAssPath: "/tmp/subtitles.ass",
        });

        expect(args).toEqual(
            expect.arrayContaining([
                "-filter_complex",
                expect.stringContaining("hflip"),
                "-map",
                "[v2]",
                "-map",
                "0:a?",
                "-c:v",
                "libx264",
                "-preset",
                "superfast",
                "-c:a",
                "copy",
            ]),
        );
        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain("crop=w=iw*0.8:h=ih*0.18");
        expect(filter).toContain("boxblur=luma_radius=min(22\\,min(w\\,h)/2-1)");
        expect(filter).toContain("enable='between(t,1,5)'");
        expect(filter).toContain("ass='/tmp/subtitles.ass'");
        expect(args).toEqual(expect.arrayContaining(["-crf", "22"]));
        expect(args.at(-1)).toBe("/tmp/out.mp4");
    });

    it("passes fontsdir to ASS filters when bundled subtitle fonts are available", () => {
        const args = buildVideoEditFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            outputPath: "/tmp/out.mp4",
            mirror: false,
            subtitleAssPath: "/tmp/subtitles.ass",
            subtitleFontsDir: "/tmp/sub-fonts",
            textOverlayAssPath: "/tmp/text-overlays.ass",
        });
        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain(
            "ass='/tmp/subtitles.ass':fontsdir='/tmp/sub-fonts'",
        );
        expect(filter).toContain(
            "ass='/tmp/text-overlays.ass':fontsdir='/tmp/sub-fonts'",
        );
    });

    it("generates ASS subtitles from translated segments", () => {
        const ass = buildSubtitleAssContent([
            {
                id: 7,
                start: 62.12,
                end: 64.5,
                sourceText: "source",
                translatedText: "Dong 1\nDong 2",
            },
        ]);

        expect(ass).toContain("Dialogue: 0,0:01:02.12,0:01:04.50");
        expect(ass).toContain("DONG 1\\N{\\fs7}\\h\\N{\\fs40}DONG 2");
        expect(ass).toContain("WrapStyle: 0");
        expect(ass).toContain("Style: BackgroundBox,Bangers,40");
        expect(ass).toContain("Style: ForegroundText,Bangers,40");
        expect(ass).toContain(",60,60,150,1");
    });

    it("keeps long one-line subtitle text on a single ASS line", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 8,
                    start: 0,
                    end: 4,
                    sourceText: "source",
                    translatedText:
                        "Khi ay con noi muon cam kiem theo gio cham toi troi dat gio ta hoi lai chi ay con do khong",
                },
            ],
            { fontSize: 55, marginLeft: 60, marginRight: 60, playResX: 1920 },
        );

        expect(ass).toContain("Dialogue: 0,0:00:00.00,0:00:04.00");
        expect(ass).toContain(
            "KHI AY CON NOI MUON CAM KIEM THEO GIO CHAM TOI TROI DAT GIO TA HOI LAI CHI AY CON DO KHONG",
        );
        expect(ass).not.toContain("\\N");
    });

    it("keeps a single subtitle line when text is below 80% viewport width", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 81,
                    start: 0,
                    end: 4,
                    sourceText: "source",
                    translatedText:
                        "Hom nay ta se thu no cho toi xem da den luc chua nao",
                },
            ],
            {
                fontSize: 40,
                marginLeft: 520,
                marginRight: 520,
                playResX: 1920,
            },
        );

        expect(ass).toContain(
            "HOM NAY TA SE THU NO CHO TOI XEM DA DEN LUC CHUA NAO",
        );
        expect(ass).not.toContain("\\N");
    });

    it("does not auto-wrap from stale margins when placement region is present", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 9,
                    start: 0,
                    end: 4,
                    sourceText: "source",
                    translatedText: "Nguoi co muon bai ta lam su phu khong?",
                },
            ],
            {
                fontSize: 35,
                marginLeft: 670,
                marginRight: 672,
                placementRegion: { x: 0, y: 80, width: 100, height: 15 },
                playResX: 1920,
                playResY: 1080,
            },
        );

        expect(ass).not.toContain("\\N");
        expect(ass).toContain("NGUOI CO MUON BAI TA LAM SU PHU KHONG?");
    });

    it("adds a controlled ASS spacer between wrapped subtitle lines", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 10,
                    start: 0,
                    end: 4,
                    sourceText: "source",
                    translatedText: "Dong 1\nDong 2",
                },
            ],
            { fontSize: 35 },
        );

        expect(ass).toContain("DONG 1\\N{\\fs6}\\h\\N{\\fs35}DONG 2");
    });

    it("builds ffmpeg filter with multiple blur regions", () => {
        const args = buildVideoEditFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            outputPath: "/tmp/out.mp4",
            mirror: false,
            blur: {
                enabled: true,
                regions: [
                    {
                        region: { x: 0, y: 80, width: 100, height: 12 },
                        timeline: { start: 0, end: 5 },
                        strength: 25,
                    },
                    {
                        region: { x: 70, y: 0, width: 30, height: 20 },
                        timeline: { start: 5, end: 10 },
                        strength: 30,
                    },
                ],
            },
            subtitleAssPath: "/tmp/subtitles.ass",
        });
        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain("between(t,0,5)");
        expect(filter).toContain("between(t,5,10)");
        expect(filter).toContain("boxblur=luma_radius=min(25\\,min(w\\,h)/2-1)");
        expect(filter).toContain(
            "boxblur=luma_radius=min(30\\,min(w\\,h)/2-1)",
        );
    });

    it("builds lightweight cover box filters without boxblur", () => {
        const args = buildVideoEditFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            outputPath: "/tmp/out.mp4",
            mirror: false,
            coverBoxes: {
                enabled: true,
                color: "#000000",
                opacity: 70,
                regions: [
                    {
                        region: { x: 0, y: 82, width: 100, height: 14 },
                        timeline: { start: 0, end: 36000 },
                    },
                ],
            },
        });

        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain("drawbox=x=iw*0:y=ih*0.82");
        expect(filter).toContain("w=iw*1:h=ih*0.14");
        expect(filter).toContain("color=0x000000@0.7:t=fill");
        expect(filter).toContain("enable='between(t,0,36000)'");
        expect(filter).not.toContain("boxblur");
    });

    it("generates ASS text overlay with positioned Vietnamese channel text", () => {
        const ass = buildTextOverlayAssContent(
            [
                {
                    text: "Ăn Không Ngồi Rồi",
                    fontFamily: "Baloo 2",
                    fontSize: 52,
                    fontWeight: 800,
                    textColor: "#ffffff",
                    strokeColor: "#111827",
                    strokeWidth: 3,
                    x: 82,
                    y: 10,
                    start: 0,
                    end: 12,
                },
            ],
            { playResX: 1920, playResY: 1080 },
        );

        expect(ass).toContain("Style: TextOverlay0,Baloo 2,52");
        expect(ass).toContain("{\\an5\\pos(1574,108)}Ăn Không Ngồi Rồi");
        expect(ass).toContain("Dialogue: 20,0:00:00.00,0:00:12.00");
    });

    it("applies custom subtitle style overrides", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 1,
                    start: 0,
                    end: 1,
                    sourceText: "src",
                    translatedText: "txt",
                },
            ],
            { fontFamily: "Tahoma", fontSize: 72, marginBottom: 220 },
        );

        expect(ass).toContain("Style: BackgroundBox,Tahoma,72");
        expect(ass).toContain("Style: ForegroundText,Tahoma,72");
        expect(ass).toContain(",60,60,220,1");
    });

    it("applies configured subtitle background color in ASS style", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 1,
                    start: 0,
                    end: 1,
                    sourceText: "src",
                    translatedText: "txt",
                },
            ],
            {
                backgroundEnabled: true,
                backgroundColor: "#FFFFFF",
                backgroundOpacity: 100,
            },
        );

        expect(ass).toContain("Style: BackgroundBox");
        expect(ass).toContain("&H00FFFFFF,&H00FFFFFF,-1,0,0,0,100,100,0,0,3,2,0");
        expect(ass).toContain("Style: ForegroundText");
        expect(ass).toContain("&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2");
    });

    it("applies configured subtitle background padding Y independently from font size", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 1,
                    start: 0,
                    end: 1,
                    sourceText: "src",
                    translatedText: "txt",
                },
            ],
            {
                fontSize: 42,
                backgroundEnabled: true,
                backgroundPaddingY: 12,
            },
        );

        expect(ass).toContain("Style: BackgroundBox,Bangers,42");
        expect(ass).toContain(",3,12,0,2,60,60,150,1");
        expect(ass).toContain("Style: ForegroundText,Bangers,42");
    });

    it("positions subtitles by video percent region when provided", () => {
        const ass = buildSubtitleAssContent(
            [
                {
                    id: 1,
                    start: 0,
                    end: 1,
                    sourceText: "src",
                    translatedText: "txt",
                },
            ],
            {
                playResX: 1920,
                playResY: 1080,
                placementRegion: { x: 0, y: 80, width: 100, height: 15 },
            },
        );

        expect(ass).toContain(",5,0,0,0,1");
        expect(ass).toContain("{\\an5\\pos(960,945)}TXT");
    });

    it("rejects partial blur without translated subtitle overlay", () => {
        expect(() =>
            validateVideoEditInput({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                blur: {
                    enabled: true,
                    region: { x: 0, y: 80, width: 100, height: 15 },
                    timeline: { start: 0, end: 10 },
                    strength: 18,
                },
            }),
        ).toThrow(/must be paired/);
    });

    it("rejects invalid blur region percentages", () => {
        expect(() =>
            validateVideoEditInput({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                blur: {
                    enabled: true,
                    region: { x: 70, y: 80, width: 40, height: 15 },
                    timeline: { start: 0, end: 10 },
                    strength: 18,
                },
                subtitles: { enabled: true, segments: translatedSegments },
            }),
        ).toThrow(/valid percentages/);
    });

    it("allows cover box and text overlay without enabling blur", () => {
        expect(() =>
            validateVideoEditInput({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                coverBoxes: {
                    enabled: true,
                    color: "#000000",
                    opacity: 65,
                    region: { x: 0, y: 82, width: 100, height: 14 },
                    timeline: { start: 0, end: 36000 },
                },
                textOverlays: {
                    enabled: true,
                    overlays: [{ text: "Ăn Không Ngồi Rồi" }],
                },
            }),
        ).not.toThrow();
    });

    it("runs ffmpeg and returns base64 output metadata", async () => {
        setVideoEditFfmpegSpawnForTest(createMockFfmpegSpawn(0) as never);
        setVideoEditReadFileForTest(
            vi.fn(async () => Buffer.from("edited-video")),
        );

        const result = await runVideoEditPipeline({
            fileName: "source clip.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            mirror: true,
            blur: {
                enabled: true,
                region: { x: 0, y: 80, width: 100, height: 15 },
                timeline: { start: 0, end: 10 },
                strength: 18,
            },
            subtitles: { enabled: true, segments: translatedSegments },
        });

        expect(result).toMatchObject({
            videoBase64: Buffer.from("edited-video").toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-clip-edit.mp4",
            byteLength: 12,
            transform: {
                mirror: true,
                partialBlur: true,
                coverBox: false,
                subtitleOverlay: true,
                segmentCount: 1,
                textOverlay: false,
                textOverlayCount: 0,
            },
        });
    });

    it("runs ffmpeg from an existing input path without base64 encoding", async () => {
        setVideoEditFfmpegSpawnForTest(createMockFfmpegSpawn(0) as never);
        setVideoEditReadFileForTest(
            vi.fn(async () => Buffer.from("edited-video")),
        );

        const result = await runVideoEditPipelineFromPath({
            fileName: "source clip.mp4",
            fileSizeBytes: 3,
            inputPath: "/tmp/source clip.mp4",
            mirror: true,
            subtitles: { enabled: true, segments: translatedSegments },
        });

        expect(result).toMatchObject({
            videoBytes: Buffer.from("edited-video"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-clip-edit.mp4",
            byteLength: 12,
            transform: {
                mirror: true,
                partialBlur: false,
                coverBox: false,
                subtitleOverlay: true,
                segmentCount: 1,
                textOverlay: false,
                textOverlayCount: 0,
            },
        });
    });

    it("uses bundled Lobster TTF for ffmpeg ASS rendering", async () => {
        const spawnMock = createMockFfmpegSpawn(0);
        setVideoEditFfmpegSpawnForTest(spawnMock as never);
        setVideoEditReadFileForTest(
            vi.fn(async () => Buffer.from("edited-video")),
        );

        await runVideoEditPipelineFromPath({
            fileName: "source clip.mp4",
            fileSizeBytes: 3,
            inputPath: "/tmp/source clip.mp4",
            subtitles: {
                enabled: true,
                segments: translatedSegments,
                style: { fontFamily: "Lobster" },
            },
        });

        const args = spawnMock.mock.calls[0]?.[1] as string[];
        expect(Array.isArray(args)).toBe(true);
        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain("fontsdir=");
    });

    it("maps ffmpeg failures to video edit error code", async () => {
        setVideoEditFfmpegSpawnForTest(
            createMockFfmpegSpawn(1, "edit failed") as never,
        );

        await expect(
            runVideoEditPipeline({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                mirror: true,
            }),
        ).rejects.toMatchObject({ code: "SYS_VIDEO_EDIT_FAILED" });
    });
});
