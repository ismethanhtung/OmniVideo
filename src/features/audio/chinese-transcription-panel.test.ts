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
});
