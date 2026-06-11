import { afterEach, describe, expect, it, vi } from "vitest";

import { ChineseTranscriptionError } from "./types";

vi.mock("./audio-extraction", () => ({
  extractSpeechReadyAudio: vi.fn(),
  extractSpeechSegmentAudio: vi.fn(),
}));

vi.mock("./groq-transcription", () => ({
  transcribeWithGroq: vi.fn(),
}));

const { extractSpeechReadyAudio, extractSpeechSegmentAudio } = await import(
  "./audio-extraction"
);
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
      videoSpeedFactor: 0.6,
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
      videoSpeedFactor: 0.6,
    });
    expect(result.steps[2].metrics).toMatchObject({
      chunkingEnabled: false,
      directUploadTargetBytes: 24 * 1024 * 1024,
    });
    expect(extractSpeechReadyAudio).toHaveBeenCalledWith(
      expect.objectContaining({ speedFactor: 0.6 }),
    );
    expect(transcribeWithGroq).toHaveBeenCalledWith(
      expect.objectContaining({ audioDurationSeconds: 229 }),
    );
  });

  it("chunks Groq transcription when extracted audio exceeds direct upload target", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array(30 * 1024 * 1024),
      durationSeconds: 120,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([4, 5, 6]),
      durationSeconds: 98,
    });
    vi.mocked(transcribeWithGroq)
      .mockResolvedValueOnce({
        text: "xin chao 1",
        language: "vi",
        requestId: "req_chunk_1",
        segments: [{ id: 0, start: 1.5, end: 4.2, text: "xin chao 1" }],
        words: [{ word: "xin", start: 1.5, end: 1.8 }],
      })
      .mockResolvedValueOnce({
        text: "xin chao 2",
        language: "vi",
        requestId: "req_chunk_2",
        segments: [{ id: 0, start: 1.5, end: 4.2, text: "xin chao 2" }],
        words: [{ word: "chao", start: 1.9, end: 2.4 }],
      });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 320 * 1024 * 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      language: "vi",
      includeWordTimestamps: true,
    });

    expect(extractSpeechSegmentAudio).toHaveBeenCalledTimes(2);
    expect(transcribeWithGroq).toHaveBeenCalledTimes(2);
    expect(result.steps[2].metrics).toMatchObject({
      chunkingEnabled: true,
      directUploadTargetBytes: 24 * 1024 * 1024,
    });
    expect(result.steps[3].metrics).toMatchObject({
      chunkCount: 2,
    });
    expect(result.segments.length).toBeGreaterThanOrEqual(2);
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

  it("clips and retries overlong Chinese segments until Groq returns shorter segments", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const longText =
      "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应哈哈";
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 400,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 12.922,
    });
    vi.mocked(transcribeWithGroq)
      .mockResolvedValueOnce({
        text: `短句${longText}结尾`,
        language: "zh",
        requestId: "req_initial",
        segments: [
          { id: 0, start: 362.804, end: 365.164, text: "短句" },
          { id: 1, start: 365.164, end: 378.086, text: longText },
          { id: 2, start: 378.306, end: 382.886, text: "结尾" },
        ],
        words: [
          { word: "短句", start: 362.804, end: 365.164 },
          { word: longText, start: 365.164, end: 378.086 },
          { word: "结尾", start: 378.306, end: 382.886 },
        ],
      })
      .mockResolvedValueOnce({
        text: "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应哈哈",
        language: "zh",
        requestId: "req_retry_1",
        segments: [{ id: 0, start: 0, end: 12.922, text: longText }],
        words: [],
      })
      .mockResolvedValueOnce({
        text: "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧",
        language: "zh",
        requestId: "req_retry_2",
        segments: [
          { id: 0, start: 0, end: 5.2, text: "你此时的嘴角比AK还要难压没问题" },
          {
            id: 1,
            start: 5.2,
            end: 12.922,
            text: "以后学姐的头发就交给学弟我来守护吧",
          },
        ],
        words: [{ word: "以后", start: 5.2, end: 5.6 }],
      });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 240 * 1024 * 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      language: "zh",
      includeWordTimestamps: true,
    });

    expect(extractSpeechSegmentAudio).toHaveBeenCalledWith({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      startSeconds: 365.164,
      endSeconds: 378.086,
    });
    expect(transcribeWithGroq).toHaveBeenCalledTimes(3);
    expect(result.segments).toEqual([
      { id: 0, start: 362.804, end: 365.164, text: "短句" },
      {
        id: 1,
        start: 365.164,
        end: 370.364,
        text: "你此时的嘴角比AK还要难压没问题",
      },
      {
        id: 2,
        start: 370.364,
        end: 378.086,
        text: "以后学姐的头发就交给学弟我来守护吧",
      },
      { id: 3, start: 378.306, end: 382.886, text: "结尾" },
    ]);
    expect(result.words).toContainEqual({
      word: "以后",
      start: 370.364,
      end: 370.764,
    });
    expect(result.steps.at(-1)?.metrics).toMatchObject({
      suspiciousSegmentsRetried: 1,
      segmentRetryRequests: 2,
    });
    expect(result.provider.requestId).toBe("req_retry_2");
  });

  it("fails after five retries when a Chinese segment remains overlong", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const longText =
      "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应哈哈";
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 400,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 12.922,
    });
    vi.mocked(transcribeWithGroq).mockResolvedValue({
      text: longText,
      language: "zh",
      requestId: "req_long",
      segments: [{ id: 1, start: 365.164, end: 378.086, text: longText }],
      words: [],
    });

    await expect(
      runChineseVideoTranscription({
        fileName: "source.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 240 * 1024 * 1024,
        fileBytes: new Uint8Array([1, 2, 3]),
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_SEGMENT_RETRY_EXHAUSTED",
      message: expect.stringContaining("segment 1"),
      steps: expect.arrayContaining([
        expect.objectContaining({
          id: "groq-transcribe",
          status: "failed",
        }),
      ]),
    });
    expect(transcribeWithGroq).toHaveBeenCalledTimes(6);
  });

  it("splits segment programmatically in best-effort mode when retries are exhausted", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const longText =
      "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应哈哈";
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 400,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 12.922,
    });
    vi.mocked(transcribeWithGroq).mockResolvedValue({
      text: longText,
      language: "zh",
      requestId: "req_long",
      segments: [{ id: 1, start: 365.164, end: 378.086, text: longText }],
      words: [],
    });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 240 * 1024 * 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      overlongSegmentRetryMode: "best-effort",
    });

    expect(result.segments).toEqual([
      {
        id: 0,
        start: 365.164,
        end: 365.164 + 12.922 * (40 / 42),
        text: "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应",
      },
      {
        id: 1,
        start: 365.164 + 12.922 * (40 / 42),
        end: 378.086,
        text: "哈哈",
      },
    ]);
    expect(result.steps.at(-1)?.status).toBe("success");
    expect(result.steps.at(-1)?.metrics).toMatchObject({
      suspiciousSegmentsRetried: 1,
      segmentRetryRequests: 5,
      exhaustedSegmentRetries: 1,
      overlongSegmentRetryMode: "best-effort",
    });
    expect(transcribeWithGroq).toHaveBeenCalledTimes(6);
  });

  it("appends hard-constraint prompt on segment retry when enabled", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const longText =
      "你此时的嘴角比AK还要难压没问题以后学姐的头发就交给学弟我来守护吧苏清雪强忍的的效应哈哈";
    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 120,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 8,
    });
    vi.mocked(transcribeWithGroq)
      .mockResolvedValueOnce({
        text: longText,
        language: "zh",
        requestId: "req_initial",
        segments: [{ id: 0, start: 10, end: 18, text: longText }],
        words: [],
      })
      .mockResolvedValueOnce({
        text: "短句一短句二",
        language: "zh",
        requestId: "req_retry",
        segments: [
          { id: 0, start: 0, end: 4, text: "短句一" },
          { id: 1, start: 4, end: 8, text: "短句二" },
        ],
        words: [],
      });

    await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      prompt: "Keep proper names unchanged.",
      retryPromptHardConstraint: true,
    });

    expect(transcribeWithGroq).toHaveBeenCalledTimes(2);
    expect(vi.mocked(transcribeWithGroq).mock.calls[1]?.[0].prompt).toContain(
      "Output short segments only.",
    );
    expect(vi.mocked(transcribeWithGroq).mock.calls[1]?.[0].prompt).toContain(
      "Keep proper names unchanged.",
    );
  });

  it("splits segment using word timestamps in best-effort mode when retries are exhausted", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const part1 = "一二三四五六七八九十一二三四五六七八九十，";
    const part2 = "一二三四五六七八九十一二三四五六七八九十一二三四五";
    const fullText = part1 + part2;

    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 400,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 8,
    });
    vi.mocked(transcribeWithGroq).mockResolvedValue({
      text: fullText,
      language: "zh",
      requestId: "req_long",
      segments: [{ id: 1, start: 10, end: 18, text: fullText }],
      words: [
        { word: "一二三四五六七八九十", start: 10, end: 12 },
        { word: "一二三四五六七八九十，", start: 12, end: 14 },
        { word: "一二三四五六七八九十", start: 14.5, end: 16.5 },
        { word: "一二三四五", start: 16.5, end: 18 },
      ],
    });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 240 * 1024 * 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      overlongSegmentRetryMode: "best-effort",
      includeWordTimestamps: true,
    });

    expect(result.segments).toEqual([
      {
        id: 0,
        start: 10,
        end: 14.25,
        text: part1,
      },
      {
        id: 1,
        start: 14.25,
        end: 18,
        text: part2,
      },
    ]);
  });

  it("prefers splitting at punctuation over arbitrary limits", async () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    const part1 = "一二三四五六七八九十，"; // 11 chars
    const part2 = "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十"; // 40 chars
    const fullText = part1 + part2;

    vi.mocked(extractSpeechReadyAudio).mockResolvedValue({
      audioBytes: new Uint8Array([1, 2, 3, 4]),
      durationSeconds: 100,
    });
    vi.mocked(extractSpeechSegmentAudio).mockResolvedValue({
      audioBytes: new Uint8Array([9, 9]),
      durationSeconds: 8,
    });
    vi.mocked(transcribeWithGroq).mockResolvedValue({
      text: fullText,
      language: "zh",
      requestId: "req_punctuation_split",
      segments: [{ id: 1, start: 10, end: 18, text: fullText }],
      words: [
        { word: "一二三四五六七八九十，", start: 10, end: 12 },
        { word: "一二三四五六七八九十", start: 12, end: 13.5 },
        { word: "一二三四五六七八九十", start: 13.5, end: 15 },
        { word: "一二三四五六七八九十", start: 15, end: 16.5 },
        { word: "一二三四五六七八九十", start: 16.5, end: 18 },
      ],
    });

    const result = await runChineseVideoTranscription({
      fileName: "source.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 1024,
      fileBytes: new Uint8Array([1, 2, 3]),
      overlongSegmentRetryMode: "best-effort",
      includeWordTimestamps: true,
    });

    expect(result.segments).toEqual([
      {
        id: 0,
        start: 10,
        end: 12,
        text: "一二三四五六七八九十，",
      },
      {
        id: 1,
        start: 12,
        end: 18,
        text: "一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十一二三四五六七八九十",
      },
    ]);
  });
});
