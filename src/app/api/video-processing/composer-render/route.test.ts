import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/app/api/video-processing/composer-render/route.ts";

describe("Video Composer render API", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("accepts ordered clips, optional music, and returns an MP4 attachment", () => {
        expect(source).toContain('.getAll("videoFiles")');
        expect(source).toContain('formData.get("musicFile")');
        expect(source).toContain("renderVideoComposerProject");
        expect(source).toContain('"Content-Type": "video/mp4"');
        expect(source).toContain("Content-Disposition");
    });
});
