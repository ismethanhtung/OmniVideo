import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    buildSubtitleAssContent,
    buildVideoEditFfmpegArgs,
    runVideoEditPipeline,
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
                "-c:a",
                "copy",
            ]),
        );
        const filter = args[args.indexOf("-filter_complex") + 1];
        expect(filter).toContain("crop=w=iw*0.8:h=ih*0.18");
        expect(filter).toContain("boxblur=22:1");
        expect(filter).toContain("enable='between(t,1,5)'");
        expect(filter).toContain("ass='/tmp/subtitles.ass'");
        expect(args).toEqual(expect.arrayContaining(["-crf", "18"]));
        expect(args.at(-1)).toBe("/tmp/out.mp4");
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
        expect(ass).toContain("Dong 1\\NDong 2");
        expect(ass).toContain("WrapStyle: 0");
        expect(ass).toContain("Style: Default,Arial,64");
        expect(ass).toContain(",60,60,280,1");
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

        expect(ass).toContain("Style: Default,Tahoma,72");
        expect(ass).toContain(",60,60,220,1");
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
                subtitleOverlay: true,
                segmentCount: 1,
            },
        });
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
