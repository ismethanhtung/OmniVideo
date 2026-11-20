import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/audio/zerotts-voice-lab-panel.tsx";

describe("ZeroTTS Voice Lab panel", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

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
        expect(source).toContain("Synchronized Video (thêm Video?)");
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
        expect(source).toContain("15% giữ âm thanh video gốc nhỏ nhẹ.");
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
        expect(source).toContain("golden_hour");
        expect(source).toContain("teal_orange");
        expect(source).toContain("clean_commercial");
        expect(source).toContain("cyberpunk_neon");
        expect(source).toContain("sepia_nostalgia");
        expect(source).toContain("vivid_pop");
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
        expect(source).toContain("handleUseZeroTtsVideoForColorGrade");
        expect(source).toContain("✨ Đã chỉnh màu");
        expect(source).toContain("👁️ Video gốc");
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
            "lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]",
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

    it("frames Voice, Background Music and Synchronized Video into separate cards and adds color presets to the video", () => {
        expect(source).toContain(
            "border border-main bg-secondary/20 p-4 space-y-3",
        );
        expect(source).toContain(
            '<div className="border border-main bg-secondary/20 p-4">',
        );
        expect(source).toContain(
            "flex items-center gap-1.5 border-b border-main pb-2",
        );
        expect(source).toContain("Video Color Grade (Màu sắc video)");
        expect(source).toContain("zeroTtsColorPreset");
        expect(source).toContain("setZeroTtsColorPreset");
        expect(source).toContain("zeroTtsColorPresetData");
        expect(source).toContain("zeroTtsColorGrade");
        expect(source).toContain("zeroTtsVideoFilterCss");
        expect(source).toContain("buildColorGradeCssFilter");
        expect(source).toContain("colorGrade: zeroTtsColorGrade");
        expect(source).toContain("filter: zeroTtsVideoFilterCss");
    });
});
