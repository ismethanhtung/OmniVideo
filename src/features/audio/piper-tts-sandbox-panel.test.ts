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
        expect(source).toContain("Inspect Schema");
        expect(source).toContain("Schema Inputs");
        expect(source).toContain("suggestedFileKeys");
        expect(source).toContain("Z Image Turbo");
        expect(source).toContain("output_format");
        expect(source).toContain("num_inference_steps");
        expect(source).toContain("guidance_scale");
        expect(source).toContain("output_quality");
    });

    it("adds reference and consistency prompt tooling for text-only image models", () => {
        expect(source).toContain("Reference & Consistency");
        expect(source).toContain("Style lock");
        expect(source).toContain("Character lock");
        expect(source).toContain("Continuity lock");
        expect(source).toContain("Build Prompt");
        expect(source).toContain("applyConsistentPrompt");
    });

    it("keeps raw prediction output and media preview controls", () => {
        expect(source).toContain("Prediction Output");
        expect(source).toContain("Copy JSON");
        expect(source).toContain("collectOutputUrls");
        expect(source).toContain("classifyMediaUrl");
        expect(source).toContain("<audio");
        expect(source).toContain("<video");
    });

    it("lets the transcript lab choose provider and transcription model", () => {
        expect(source).toContain("Transcript Retry Lab");
        expect(source).toContain("Upload video/audio");
        expect(source).toContain("Video Asset");
        expect(source).toContain("AI Provider");
        expect(source).toContain("Groq env (GROQ_API_KEY)");
        expect(source).toContain("Transcription model");
        expect(source).toContain("DEFAULT_TRANSCRIPTION_MODEL");
        expect(source).toContain("selectedTranscriptionProviderId");
        expect(source).toContain(
            'formData.append("providerId", selectedTranscriptionProviderId)',
        );
        expect(source).toContain(
            'formData.append("model", transcriptionModel.trim())',
        );
        expect(source).toContain(
            "`/api/ai-providers/${selectedTranscriptionProviderId}/models`",
        );
    });

    it("discovers and selects complete local Piper model pairs", () => {
        expect(source).toContain('fetch("/api/audio/piper-models"');
        expect(source).toContain("Local voice model");
        expect(source).toContain("No complete Piper model pairs found");
        expect(source).toContain("setModelPath(model.modelPath)");
        expect(source).toContain("setConfigPath(model.configPath)");
        expect(source).toContain(
            "Choosing a voice fills both model and config paths.",
        );
    });

    it("adds a Fast Media Extractor section to the panel", () => {
        expect(source).toContain("Fast Media Extractor");
        expect(source).toContain("Extractor Settings");
        expect(source).toContain("Media Link");
        expect(source).toContain("Custom File Title (Optional)");
        expect(source).toContain("Target Type");
        expect(source).toContain("Video + Audio");
        expect(source).toContain("Audio Only (Voice extract)");
        expect(source).toContain("extractorTarget");
        expect(source).toContain("extractorQuality");
        expect(source).toContain("runAnalyze");
        expect(source).toContain("runDownload");
        expect(source).toContain("/api/video-intake/formats");
        expect(source).toContain("/api/video-intake/resolve-file");
        expect(source).toContain("Metadata & Formats");
        expect(source).toContain("COBALT_API_URL");
        expect(source).toContain("cobalt.tools");
        expect(source).toContain("GitHub Cobalt");
    });

    it("provides a navigation banner linking to the dedicated ZeroTTS Voice Lab page", () => {
        expect(source).toContain("ZeroTTS Voice Lab");
        expect(source).toContain("Trang Riêng Biệt");
        expect(source).toContain("/zerotts-voice-lab");
        expect(source).toContain("Mở ZeroTTS Voice Lab");
    });

    it("provides Video Color Grading & Lighting Studio with presets, live 60fps preview, before-after compare and FFmpeg render", () => {
        expect(source).toContain("Video Color Grading & Lighting Studio");
        expect(source).toContain("Anti-Overexposure & Moody Engine");
        expect(source).toContain("COLOR_GRADE_PRESETS");
        expect(source).toContain("cgBrightness");
        expect(source).toContain("cgContrast");
        expect(source).toContain("cgSaturation");
        expect(source).toContain("cgGamma");
        expect(source).toContain("cgVignette");
        expect(source).toContain("cgTemperature");
        expect(source).toContain("cgHue");
        expect(source).toContain("cgVibrance");
        expect(source).toContain("cgSepia");
        expect(source).toContain("cgTint");
        expect(source).toContain("Sắc thái màu (Hue Shift)");
        expect(source).toContain("Rực màu tự nhiên (Vibrance)");
        expect(source).toContain("Phim cổ Sepia (Sepia Tone)");
        expect(source).toContain("Ám màu Xanh–Hồng (Tint)");
        expect(source).toContain("cgFilterCss");
        expect(source).toContain("cgCompareMode");
        expect(source).toContain("handleCgRenderExport");
        expect(source).toContain("/api/video-processing/color-grade");
        expect(source).toContain("Xuất Video Hoàn Chỉnh (FFmpeg Render)");
        expect(source).toContain("✨ Đã chỉnh màu");
        expect(source).toContain("👁️ Video gốc");
        expect(source).not.toContain("onMouseDown={() => setCgCompareMode(true)}");
        expect(source).not.toContain("onMouseUp={() => setCgCompareMode(false)}");
    });
});

