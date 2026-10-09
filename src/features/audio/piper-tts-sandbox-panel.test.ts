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

    it("adds a ZeroTTS Voice Lab section supporting voice cloning and synthesis", () => {
        expect(source).toContain("ZeroTTS Voice Lab");
        expect(source).toContain("zeroweight-ai/ZeroTTS");
        expect(source).toContain("Zero-Shot Voice Cloning");
        expect(source).toContain("Voice & Synthesis Settings");
        expect(source).toContain("Voice Mode");
        expect(source).toContain("Preset Voices");
        expect(source).toContain("Clone Voice (Upload)");
        expect(source).toContain("Local Voice Files");
        expect(source).toContain("Upload 10s Sample Voice");
        expect(source).toContain("Audio Sample Preview (10s Voice)");
        expect(source).toContain("Speech Speed");
        expect(source).toContain("Normalize VI Text");
        expect(source).toContain("Synthesize Speech (ZeroTTS)");
        expect(source).toContain("Vietnamese Text Input");
        expect(source).toContain("ZeroTTS Audio Output (48kHz)");
        expect(source).toContain("Download ZeroTTS WAV");
        expect(source).toContain("/api/audio/zerotts");
        expect(source).toContain("/api/audio/zerotts-voices");
    });

    it("adds Background Music selection and synchronized playback to ZeroTTS Voice Lab", () => {
        expect(source).toContain("Background Music (Nhạc nền)");
        expect(source).toContain('<option value="">Không</option>');
        expect(source).toContain("/api/video-processing/background-music");
        expect(source).toContain("zeroTtsBackgroundMusic");
        expect(source).toContain("zeroTtsBgmVolume");
        expect(source).toContain("zeroTtsSpeechAudioRef");
        expect(source).toContain("zeroTtsBgmAudioRef");
        expect(source).toContain("handleZeroTtsSpeechPlay");
        expect(source).toContain("handleZeroTtsSpeechPause");
        expect(source).toContain("handleZeroTtsSpeechSeeked");
        expect(source).toContain("handleZeroTtsSpeechEnded");
        expect(source).toContain("Nhạc nền đang chạy cùng:");
    });

    it("formats ZeroTTS generation duration and displays realtime factor speed metrics", () => {
        expect(source).toContain("Thời gian tạo:");
        expect(source).toContain("x Realtime");
        expect(source).toContain("Thời lượng");
        expect(source).toContain("Tốc độ (RTF)");
        expect(source).toContain("Dung lượng");
    });

    it("defaults ZeroTTS Voice Match Strength (CFG) to 1.0x for 2x faster CPU speed", () => {
        expect(source).toContain('const [zeroTtsCfgScale, setZeroTtsCfgScale] = useState("1.0");');
        expect(source).toContain("Tốc độ gấp đôi (Mặc định)");
        expect(source).toContain("1.0x (Mặc định - nhanh gấp đôi)");
    });

    it("supports synchronized video upload and playback with default 0.15 volume in ZeroTTS Voice Lab", () => {
        expect(source).toContain("Synchronized Video (Video chạy cùng)");
        expect(source).toContain("setZeroTtsVideoVolume");
        expect(source).toContain('"0.15"');
        expect(source).toContain("Video Volume");
        expect(source).toContain("zeroTtsVideoFile");
        expect(source).toContain("zeroTtsVideoUrl");
        expect(source).toContain("zeroTtsVideoRef");
        expect(source).toContain("handleZeroTtsVideoChange");
        expect(source).toContain("handleZeroTtsRemoveVideo");
        expect(source).toContain("handleZeroTtsVideoPlay");
        expect(source).toContain("handleZeroTtsVideoPause");
        expect(source).toContain("handleZeroTtsVideoSeeked");
        expect(source).toContain("Video đang chạy cùng:");
        expect(source).toContain("Mặc định 15% (0.15)");
    });

    it("integrates CapCut-style VIP captions with karaoke word tracking into ZeroTTS Voice Lab video overlay", () => {
        expect(source).toContain("CapCut VIP Captions (Phụ đề Video)");
        expect(source).toContain("zeroTtsShowCaptions");
        expect(source).toContain("zeroTtsCaptionStyle");
        expect(source).toContain("zeroTtsCaptionPosition");
        expect(source).toContain("zeroTtsCaptionSize");
        expect(source).toContain("zeroTtsCaptionUppercase");
        expect(source).toContain("spokenWords");
        expect(source).toContain("activeWordIndex");
        expect(source).toContain("currentWordsChunk");
        expect(source).toContain("capcut_yellow");
        expect(source).toContain("cinematic_white");
        expect(source).toContain("neon_emerald");
        expect(source).toContain("sunset_orange");
        expect(source).toContain("setZeroTtsSpeechCurrentTime");
    });

    it("provides precision 60fps subtitle synchronization with RAF tracking, punctuation pause weighting and lead offset", () => {
        expect(source).toContain("buildPunctuationAwareWordTimeline");
        expect(source).toContain("startPlaybackRaf");
        expect(source).toContain("stopPlaybackRaf");
        expect(source).toContain("speechRafRef");
        expect(source).toContain("lastReportedTimeRef");
        expect(source).toContain("zeroTtsSubtitleLeadMs");
        expect(source).toContain("setZeroTtsSubtitleLeadMs");
        expect(source).toContain("Bù trễ đồng bộ (Sync Lead Offset)");
        expect(source).toContain("Tracking 60fps & bù trễ thị giác 120ms");
    });

    it("provides Video Color Grading & Lighting Studio with presets, live 60fps preview, before-after compare and FFmpeg render", () => {
        expect(source).toContain("Video Color Grading & Lighting Studio");
        expect(source).toContain("Anti-Overexposure & Moody Engine");
        expect(source).toContain("COLOR_GRADE_PRESETS");
        expect(source).toContain("moody_dark");
        expect(source).toContain("anti_overexposure");
        expect(source).toContain("cinematic_vintage");
        expect(source).toContain("film_noir");
        expect(source).toContain("cold_sad");
        expect(source).toContain("cgBrightness");
        expect(source).toContain("cgContrast");
        expect(source).toContain("cgSaturation");
        expect(source).toContain("cgGamma");
        expect(source).toContain("cgVignette");
        expect(source).toContain("cgTemperature");
        expect(source).toContain("cgFilterCss");
        expect(source).toContain("cgCompareMode");
        expect(source).toContain("handleCgRenderExport");
        expect(source).toContain("/api/video-processing/color-grade");
        expect(source).toContain("Xuất Video Hoàn Chỉnh (FFmpeg Render)");
        expect(source).toContain("handleUseZeroTtsVideoForColorGrade");
        expect(source).toContain("✨ Đã chỉnh màu");
        expect(source).toContain("👁️ Video gốc");
        expect(source).not.toContain("onMouseDown={() => setCgCompareMode(true)}");
        expect(source).not.toContain("onMouseUp={() => setCgCompareMode(false)}");
    });

    it("adds borderless and no-underline subtitle styles, checkboxes and live preview support", () => {
        expect(source).toContain("clean_yellow");
        expect(source).toContain("clean_white");
        expect(source).toContain("clean_emerald");
        expect(source).toContain("clean_sunset");
        expect(source).toContain("pure_cinema");
        expect(source).toContain("BỎ VIỀN HỘP");
        expect(source).toContain("BỎ GẠCH CHÂN");
        expect(source).toContain("zeroTtsCaptionNoBorder");
        expect(source).toContain("zeroTtsCaptionNoUnderline");
        expect(source).toContain("isCaptionNoBorder");
        expect(source).toContain("isCaptionNoUnderline");
    });

    it("provides Full Video Render export in ZeroTTS Voice Lab combining video, speech, BGM and subtitles", () => {
        expect(source).toContain("handleZeroTtsRenderVideo");
        expect(source).toContain("isRenderingZeroTtsVideo");
        expect(source).toContain("zeroTtsRenderedVideoUrl");
        expect(source).toContain("zeroTtsRenderedResult");
        expect(source).toContain("/api/video-processing/zerotts-render");
        expect(source).toContain("Xuất Video Hoàn Chỉnh (ZeroTTS Video Render)");
        expect(source).toContain("Video đã xuất hoàn chỉnh");
    });

    it("guards ZeroTTS Voice Lab layout against responsive horizontal overflow", () => {
        expect(source).toContain(
            "lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]",
        );
        expect(source).toContain(
            "min-w-0 space-y-3 border border-main bg-secondary/20 p-4",
        );
        expect(source).toContain("min-w-0 space-y-4");
        expect(source).toContain(
            "flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1",
        );
        expect(source).toContain("flex flex-wrap gap-1");
        expect(source).toContain("sm:grid-cols-3 xl:grid-cols-6");
        expect(source).toContain(
            "flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5",
        );
        expect(source).toContain("flex min-w-0 flex-wrap items-center gap-1.5 font-medium");
        expect(source).toContain("break-all");
    });
});

