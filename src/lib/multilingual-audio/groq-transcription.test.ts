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
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(
      "https://api.groq.com/openai/v1/audio/transcriptions",
    );
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

  it("uses selected OpenAI-compatible transcription model and base URL", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          text: "hello",
          language: "en",
          segments: [{ start: 0, end: 1, text: "hello" }],
          words: [],
        }),
        { status: 200 },
      );
    });

    await transcribeWithGroq({
      apiKey: "provider-secret",
      baseUrl: "https://speech.example.com/v1/",
      model: "custom-whisper-large",
      providerName: "Custom Speech",
      audioBytes: new Uint8Array([1, 2, 3]),
      language: "en",
      timestampGranularities: ["segment"],
      fetchImpl,
    });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://speech.example.com/v1/audio/transcriptions");
    expect(init.headers).toEqual({ Authorization: "Bearer provider-secret" });
    expect((init.body as FormData).get("model")).toBe("custom-whisper-large");
  });

  it("routes Google AI Studio Gemini transcription through native generateContent audio", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      text: "大家好",
                      language: "zh",
                      segments: [
                        { id: 0, start: 0, end: 1.5, text: "大家好" },
                      ],
                      words: [{ word: "大家", start: 0, end: 0.8 }],
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await transcribeWithGroq({
      apiKey: "gemini-key",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      model: "models/gemini-3.1-flash-lite",
      providerName: "Google AI Studio",
      audioBytes: new Uint8Array([1, 2, 3]),
      language: "zh",
      timestampGranularities: ["segment", "word"],
      audioDurationSeconds: 3,
      fetchImpl,
    });

    expect(result.segments).toEqual([
      { id: 0, start: 0, end: 1.5, text: "大家好" },
    ]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain(
      "models/gemini-3.1-flash-lite:generateContent",
    );
    expect(String(url)).not.toContain("/audio/transcriptions");
    const body = JSON.parse(String(init.body)) as {
      contents: Array<{ parts: Array<{ inlineData?: { data?: string }; text?: string }> }>;
      generationConfig: { responseMimeType: string };
    };
    expect(body.contents[0].parts[0].inlineData?.data).toBe("AQID");
    expect(body.contents[0].parts[1].text).toContain(
      "Include word-level timestamps",
    );
    expect(body.generationConfig.responseMimeType).toBe("application/json");
  });

  it("maps Groq provider errors to a stable error", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { message: "quota exceeded" } }),
        { status: 400 },
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

  it("maps Groq network fetch failures to provider transcription error", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    const promise = transcribeWithGroq({
      apiKey: "secret",
      audioBytes: new Uint8Array([1]),
      language: "zh",
      timestampGranularities: ["segment"],
      fetchImpl,
    });

    const expectPromise = expect(promise).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSCRIPTION_FAILED",
      status: 502,
      message: "groq transcription network request failed: fetch failed",
    });

    await vi.runAllTimersAsync();
    await expectPromise;
    vi.useRealTimers();
  });

  it("retries on HTTP 429 rate limit errors with parsed delay", async () => {
    vi.useFakeTimers();
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      if (callCount < 3) {
        return new Response(
          JSON.stringify({
            error: { message: "Rate limit reached. Please try again in 2s." },
          }),
          { status: 429 },
        );
      }
      return new Response(
        JSON.stringify({
          text: "Hello",
          language: "zh",
          segments: [],
          words: [],
        }),
        { status: 200 },
      );
    });

    const promise = transcribeWithGroq({
      apiKey: "secret",
      audioBytes: new Uint8Array([1]),
      language: "zh",
      timestampGranularities: ["segment"],
      fetchImpl,
    });

    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result.text).toBe("Hello");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it("throws after exhausting all retries on HTTP 429", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: { message: "Rate limit reached. Please try again in 1s." },
        }),
        { status: 429 },
      );
    });

    const promise = transcribeWithGroq({
      apiKey: "secret",
      audioBytes: new Uint8Array([1]),
      language: "zh",
      timestampGranularities: ["segment"],
      fetchImpl,
    });

    const expectPromise = expect(promise).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSCRIPTION_FAILED",
      message: "Rate limit reached. Please try again in 1s.",
    });

    await vi.runAllTimersAsync();
    await expectPromise;
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    vi.useRealTimers();
  });
});
