import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/audio/chinese-transcription-panel.tsx";

describe("Audio Transcript asset picker preview", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("adds preview action per asset and lazy inline video load", () => {
    expect(source).toContain("Preview");
    expect(source).toContain("? \"Hide\"");
    expect(source).toContain("/api/storage/assets/${asset._id}/download?disposition=inline");
    expect(source).toContain("preload=\"metadata\"");
    expect(source).toContain("<video");
    expect(source).toContain("matchesVideoAssetSearch");
    expect(source).toContain("Search title, folder, tags...");
    expect(source).toContain("AssetLifecycleBadges");
  });

  it("keeps heavy transcript panels collapsed by default", () => {
    expect(source).toContain("useState(true)");
    expect(source).toContain("function StepTracePanel");
    expect(source).toContain("const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(true)");
    expect(source).toContain("const [isWordsCollapsed, setIsWordsCollapsed] = useState(true)");
  });

  it("uses strict timestamp sync for Audio Transcript voice generation", () => {
    expect(source).toContain('["Audio Transcript mode", "strict timestamp sync"]');
    expect(source).toContain('alignmentMode: "strict"');
    expect(source).toContain("voiceChunk.speedFactor");
    expect(source).toContain("scheduledStartSeconds");
    expect(source).toContain("Missing");
    expect(source).toContain("generated voice");
    expect(source).toContain("activeVoiceSegmentId");
    expect(source).toContain("segmentsScrollRef");
    expect(source).toContain("scrollTo");
  });

  it("renders a professional generated voice timeline workbench", () => {
    expect(source).toContain("Audio Timeline Workbench");
    expect(source).toContain("voiceTimelineFilter");
    expect(source).toContain("voiceTimelineZoom");
    expect(source).toContain("voiceTimelineWorkbench");
    expect(source).toContain("selectedVoiceChunkId");
    expect(source).toContain("sourceSegmentId");
    expect(source).toContain("Timeline issues");
    expect(source).toContain("No chunks match this filter.");
  });

  it("guards Dub preview playback and source load errors", () => {
    expect(source).toContain("formatMediaPlaybackError");
    expect(source).toContain("NotSupportedError");
    expect(source).toContain("dubPreviewError");
    expect(source).toContain("setDubPreviewError(formatMediaPlaybackError(playError))");
    expect(source).toContain("Dub preview không load được source video hiện tại.");
    expect(source).toContain("Dub preview không load được generated voice audio.");
    expect(source).not.toContain("Promise.all([video.play(), audio.play()])");
  });

  it("shows repaired voice timing diagnostics for suspicious timestamps", () => {
    expect(source).toContain("buildWordAwareVoiceSegmentsWithDiagnostics");
    expect(source).toContain("voiceTimingDiagnostics");
    expect(source).toContain("voiceTimingDiagnosticsBySegmentId");
    expect(source).toContain("Timing");
    expect(source).toContain("repaired");
  });

  it("supports optional video preprocess speed control for Audio Transcript 2", () => {
    expect(source).toContain("enableVideoPreprocess");
    expect(source).toContain("enableVideoPreprocess = true");
    expect(source).toContain("defaultVideoSpeedFactor = 0.7");
    expect(source).toContain("Video Preprocess");
    expect(source).toContain("Enable preprocess");
    expect(source).toContain("useVideoPreprocess");
    expect(source).not.toContain("disabled={isRunning || !useVideoPreprocess}");
    expect(source).toContain("Video speed");
    expect(source).toContain("<option value={0.7}>0.7x</option>");
    expect(source).toContain("<option value={0.8}>0.8x</option>");
    expect(source).toContain('formData.set("videoSpeedFactor"');
    expect(source).toContain("video.playbackRate = dubPreviewPlaybackRate");
    expect(source).toContain("Source preview speed:");
    expect(source).toContain("/api/audio/video-preprocess");
    expect(source).toContain("Prepare source");
    expect(source).toContain("Preparing processed source video...");
    expect(source).toContain("Processing summary");
    expect(source).toContain("Processed video size:");
    expect(source).toContain("Extract audio time:");
    expect(source).toContain("Transcribe time:");
    expect(source).toContain("Translate time:");
    expect(source).toContain("Voice generation time:");
    expect(source).toContain("Metadata generation time");
    expect(source).toContain("Total time:");
    expect(source).toContain("Completed timed steps:");
  });

  it("isolates the heavy segments subtree from preprocess-only toggles", () => {
    expect(source).toContain("const TranscriptSegmentsPanel = memo");
    expect(source).toContain("onTranslatedTextChange");
    expect(source).toContain("const translationById = useMemo");
    expect(source).toContain("const voiceWarningSegments = useMemo");
  });
});
