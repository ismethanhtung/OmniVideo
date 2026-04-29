import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    buildDubbedVideoFfmpegArgs,
    muxDubbedVideo,
    runVideoDubbing,
    setVideoDubbingFfmpegSpawnForTest,
} from "./video-dubbing";

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

describe("video dubbing adapter", () => {
    afterEach(() => {
        setVideoDubbingFfmpegSpawnForTest(null);
    });

    it("builds duck-original ffmpeg args for MP4 mux", () => {
        const args = buildDubbedVideoFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            outputPath: "/tmp/out.mp4",
            originalAudioVolume: 0.2,
            voiceVolume: 1,
        });

        expect(args).toContain("-filter_complex");
        expect(args.join(" ")).toContain("[0:a]volume=0.200");
        expect(args.join(" ")).toContain("amix=inputs=2");
        expect(args).toContain("-c:v");
        expect(args).toContain("copy");
        expect(args.at(-1)).toBe("/tmp/out.mp4");
    });

    it("builds voice-only mux args when original audio volume is zero", () => {
        const args = buildDubbedVideoFfmpegArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            outputPath: "/tmp/out.mp4",
            originalAudioVolume: 0,
            voiceVolume: 1,
        });

        expect(args).not.toContain("-filter_complex");
        expect(args).toEqual(
            expect.arrayContaining(["-map", "0:v:0", "-map", "1:a:0"]),
        );
    });

    it("rejects missing source video bytes", async () => {
        await expect(
            runVideoDubbing({
                fileName: "empty.mp4",
                fileSizeBytes: 0,
                fileBytes: new Uint8Array(),
            }),
        ).rejects.toMatchObject({
            code: "VAL_DUBBING_VIDEO_REQUIRED",
        });
    });

    it("maps ffmpeg mux failures to dubbing error code", async () => {
        setVideoDubbingFfmpegSpawnForTest(
            createMockFfmpegSpawn(1, "mux failed") as never,
        );

        await expect(
            muxDubbedVideo({
                videoBytes: new Uint8Array([1, 2, 3]),
                voiceBytes: new Uint8Array([4, 5, 6]),
                fileName: "source.mp4",
                originalAudioVolume: 0.2,
                voiceVolume: 1,
            }),
        ).rejects.toMatchObject({ code: "SYS_DUBBING_MUX_FAILED" });
    });
});
