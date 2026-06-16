import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/audio/piper-tts-sandbox-panel.tsx";

describe("Feature Sandbox panel", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("exposes a generic Replicate model runner", () => {
        expect(source).toContain("Replicate Model Lab");
        expect(source).toContain("prunaai/z-image-turbo");
        expect(source).toContain("/api/replicate/predictions");
        expect(source).toContain("Run Replicate");
        expect(source).toContain("Input JSON");
        expect(source).toContain("Optional file input key");
        expect(source).toContain("Z Image Turbo");
        expect(source).toContain("output_format");
        expect(source).toContain("num_inference_steps");
        expect(source).toContain("guidance_scale");
        expect(source).toContain("output_quality");
    });

    it("keeps raw prediction output and media preview controls", () => {
        expect(source).toContain("Prediction Output");
        expect(source).toContain("Copy JSON");
        expect(source).toContain("collectOutputUrls");
        expect(source).toContain("classifyMediaUrl");
        expect(source).toContain("<audio");
        expect(source).toContain("<video");
    });
});
