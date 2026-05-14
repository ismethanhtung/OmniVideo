import { describe, expect, it } from "vitest";

import { buildVideoPreprocessFfmpegArgs } from "./video-preprocess";

describe("video preprocess ffmpeg args", () => {
    it("builds a real slow-down pipeline for 0.5x", () => {
        const args = buildVideoPreprocessFfmpegArgs({
            inputPath: "/tmp/in.mp4",
            outputPath: "/tmp/out.mp4",
            speedFactor: 0.5,
        });

        expect(args).toContain("-filter:v");
        expect(args).toContain("setpts=2*PTS");
        expect(args).toContain("-filter:a");
        expect(args).toContain("atempo=0.5");
        expect(args).toContain("libx264");
        expect(args.at(-1)).toBe("/tmp/out.mp4");
    });
});
