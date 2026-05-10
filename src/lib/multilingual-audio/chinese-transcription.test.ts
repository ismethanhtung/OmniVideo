import { afterEach, describe, expect, it, vi } from "vitest";

import { ChineseTranscriptionError } from "./types";

vi.mock("./audio-extraction", () => ({
  extractSpeechReadyAudio: vi.fn(),
}));

vi.mock("./groq-transcription", () => ({
  transcribeWithGroq: vi.fn(),
}));

const { extractSpeechReadyAudio } = await import("./audio-extraction");
const { transcribeWithGroq } = await import("./groq-transcription");
const { runChineseVideoTranscription } = await import("./chinese-transcription");

describe("runChineseVideoTranscription", () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns step trace with extracted audio size on success", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array(2048),
      durationSeconds: 229,
    });
    vi.mocked(transcribeWithGroq).mockResolvedValue({
      text: "hello",
      language: "en",
      requestId: "req_1",
      segments: [{ id: 0, start: 0, end: 1, text: "hello" }],
      words: [],
    });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 240 * 1024 * 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      language: "en",
      includeWordTimestamps: false,
    });

    expect(result.audio).toMatchObject({
      format: "mp3",
      bitrateKbps: 64,
      fileSizeBytes: 2048,
      durationSeconds: 229,
    });
    expect(result.steps.map((step) => step.id)).toEqual([
      "validate",
      "extract-audio",
      "check-upload-size",
      "groq-transcribe",
    ]);
    expect(result.steps[1].metrics).toMatchObject({
      audioSizeBytes: 2048,
      audioSize: "2.00 KB",
      audioDurationSeconds: 229,
    });
    expect(transcribeWithGroq).toHaveBeenCalledWith(
      expect.objectContaining({ audioDurationSeconds: 229 }),
    );
  });

  it("attaches step trace when Groq rejects the extracted audio", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array(4096),
      durationSeconds: 60,
    });
    vi.mocked(transcribeWithGroq).mockRejectedValue(
      new ChineseTranscriptionError(
        "PRV_GROQ_TRANSCRIPTION_FAILED",
        "Request Entity Too Large",
        422,
      ),
    );

    await expect(
      runChineseVideoTranscription({
        fileName: "source.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 240 * 1024 * 1024,
        fileBytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSCRIPTION_FAILED",
      steps: expect.arrayContaining([
        expect.objectContaining({ id: "extract-audio", status: "success" }),
        expect.objectContaining({
          id: "groq-transcribe",
          status: "failed",
          metrics: expect.objectContaining({ audioSizeBytes: 4096 }),
        }),
      ]),
    });
  });
});
