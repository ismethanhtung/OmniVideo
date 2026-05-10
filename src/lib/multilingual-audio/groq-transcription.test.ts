import { describe, expect, it, vi } from "vitest";

import {
  normalizeGroqTranscription,
  transcribeWithGroq,
} from "./groq-transcription";

describe("Groq transcription adapter", () => {
  it("normalizes verbose_json text, segments, words and request id", () => {
    expect(
      normalizeGroqTranscription({
        text: "你好世界",
        language: "zh",
        x_groq: { id: "req_123" },
        segments: [{ id: 7, start: 1.2, end: 2.4, text: "你好" }],
        words: [{ word: "你好", start: 1.2, end: 1.8 }],
      }),
    ).toEqual({
      text: "你好世界",
      language: "zh",
      requestId: "req_123",
      segments: [{ id: 7, start: 1.2, end: 2.4, text: "你好" }],
      words: [{ word: "你好", start: 1.2, end: 1.8 }],
    });
  });

  it("clamps impossible Groq timestamps to the extracted audio duration", () => {
    expect(
      normalizeGroqTranscription(
        {
          text: "谢谢大家",
          language: "zh",
          segments: [
            { id: 118, start: 227.67, end: 257.65, text: "谢谢大家" },
          ],
          words: [
            { word: "谢谢", start: 227.67, end: 254.01001 },
            { word: "大家", start: 254.01001, end: 256.21 },
          ],
        },
        "zh",
        { audioDurationSeconds: 229 },
      ),
    ).toMatchObject({
      segments: [{ id: 118, start: 227.67, end: 229, text: "谢谢大家" }],
      words: [{ word: "谢谢", start: 227.67, end: 229 }],
    });
  });

  it("posts Groq transcription request with verbose timestamps", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          text: "大家好",
          language: "zh",
          segments: [{ start: 0, end: 1.5, text: "大家好" }],
          words: [{ word: "大家", start: 0, end: 0.8 }],
          x_groq: { id: "req_ok" },
        }),
        { status: 200 },
      );
    });

    const result = await transcribeWithGroq({
      apiKey: "secret",
      audioBytes: new Uint8Array([1, 2, 3]),
      language: "zh",
      prompt: "短视频",
      timestampGranularities: ["segment", "word"],
      audioDurationSeconds: 3,
      fetchImpl,
    });

    expect(result.text).toBe("大家好");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0];
    expect(init.headers).toEqual({ Authorization: "Bearer secret" });
    const body = init.body as FormData;
    expect(body.get("model")).toBe("whisper-large-v3-turbo");
    expect(body.get("language")).toBe("zh");
    expect(body.get("response_format")).toBe("verbose_json");
    expect((body.get("file") as File).name).toBe("speech.mp3");
    expect(body.getAll("timestamp_granularities[]")).toEqual([
      "segment",
      "word",
    ]);
  });

  it("maps Groq provider errors to a stable error", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { message: "quota exceeded" } }),
        { status: 429 },
      );
    });

    await expect(
      transcribeWithGroq({
        apiKey: "secret",
        audioBytes: new Uint8Array([1]),
        language: "zh",
        timestampGranularities: ["segment"],
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSCRIPTION_FAILED",
      message: "quota exceeded",
    });
  });
});
