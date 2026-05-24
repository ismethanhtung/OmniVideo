import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-processing/video-splitter-panel.tsx";

describe("Video Splitter panel", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("provides interval and head clip split modes", () => {
        expect(source).toContain("Split mode");
        expect(source).toContain("Chia theo block thời lượng");
        expect(source).toContain("Chia đều theo số phần");
        expect(source).toContain("Chỉ cắt đoạn đầu");
        expect(source).toContain("30 minutes");
        expect(source).toContain("45 minutes");
        expect(source).toContain("60 minutes");
        expect(source).toContain("15 minutes");
        expect(source).toContain("Number of parts");
        expect(source).toContain('formData.set("splitParts"');
    });

    it("calls split API and exposes direct download link", () => {
        expect(source).toContain('fetch("/api/video-processing/split"');
        expect(source).toContain("Split + Download ZIP");
        expect(source).toContain("Download trực tiếp");
        expect(source).toContain("downloadUrl");
    });
});
