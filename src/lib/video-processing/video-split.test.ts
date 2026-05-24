import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/lib/video-processing/video-split.ts";

describe("video split runtime", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("uses original base name for archive and part names", () => {
        expect(source).toContain("const archivePath = path.join(workDir, `${baseName}.zip`);");
        expect(source).toContain("archiveName: `${baseName}.zip`");
        expect(source).toContain("`${baseName}-part-%03d.mp4`");
        expect(source).toContain("`${baseName}-part-001.mp4`");
        expect(source).not.toContain("`${baseName}-split.zip`");
        expect(source).not.toContain("`${baseName}-head-");
    });

    it("supports split-by-parts mode with duration probe", () => {
        expect(source).toContain("mode: VideoSplitMode | \"parts\"");
        expect(source).toContain("input.mode === \"parts\"");
        expect(source).toContain("probeDurationSeconds(");
        expect(source).toContain("splitParts must be an integer between 2 and 60.");
    });
});

