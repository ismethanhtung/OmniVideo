import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    buildMirrorVideoFfmpegArgs,
    normalizeMirrorAxis,
    runMirrorVideo,
    setMirrorVideoFfmpegSpawnForTest,
    setMirrorVideoReadFileForTest,
} from "./mirror-video";

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

describe("mirror video adapter", () => {
    afterEach(() => {
        setMirrorVideoFfmpegSpawnForTest(null);
        setMirrorVideoReadFileForTest(null);
    });

    it("builds horizontal hflip ffmpeg args with optional audio mapping", () => {
        const args = buildMirrorVideoFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            outputPath: "/tmp/out.mp4",
            axis: "horizontal",
        });

        expect(args).toEqual(
            expect.arrayContaining([
                "-vf",
                "hflip",
                "-map",
                "0:v:0",
                "-map",
                "0:a?",
                "-c:v",
                "libx264",
                "-c:a",
                "copy",
                "-movflags",
                "+faststart",
            ]),
        );
        expect(args.at(-1)).toBe("/tmp/out.mp4");
    });

    it("normalizes default horizontal axis and rejects unsupported axes", () => {
        expect(normalizeMirrorAxis(undefined)).toBe("horizontal");
        expect(normalizeMirrorAxis(" horizontal ")).toBe("horizontal");
        expect(() => normalizeMirrorAxis("vertical")).toThrow(
            /only supports axis=horizontal/,
        );
    });

    it("mirrors video bytes and returns base64 output metadata", async () => {
        setMirrorVideoFfmpegSpawnForTest(createMockFfmpegSpawn(0) as never);
        setMirrorVideoReadFileForTest(
            vi.fn(async () => Buffer.from("mirrored-video")),
        );

        const result = await runMirrorVideo({
            fileName: "source clip.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            axis: "horizontal",
        });

        expect(result).toMatchObject({
            videoBase64: Buffer.from("mirrored-video").toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-clip-mirror.mp4",
            byteLength: 14,
            transform: { axis: "horizontal", filter: "hflip" },
        });
    });

    it("maps ffmpeg failures to mirror error code", async () => {
        setMirrorVideoFfmpegSpawnForTest(
            createMockFfmpegSpawn(1, "mirror failed") as never,
        );

        await expect(
            runMirrorVideo({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
            }),
        ).rejects.toMatchObject({ code: "SYS_MIRROR_VIDEO_FAILED" });
    });
});
