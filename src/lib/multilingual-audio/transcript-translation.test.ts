import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  normalizeVietnameseTtsText,
  normalizeTranslationPayload,
  parseTranslationModelContent,
  translateTranscriptSegments,
  validateTranslationSegments,
} from "./transcript-translation";
import { DEFAULT_TRANSLATION_MODEL } from "./types";

const sourceSegments = [
  { id: 0, start: 0, end: 1.34, text: "寻导人做梦都想不到" },
  { id: 1, start: 1.34, end: 3.72, text: "一个被海关滞留许久的集装箱盲盒" },
];

describe("transcript translation", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.stubEnv("OMNIVIDEO_TRANSLATION_TRANSIENT_RETRY_BASE_MS", "0");
    vi.stubEnv("OMNIVIDEO_TRANSLATION_TRANSIENT_RETRY_MAX_MS", "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("normalizes translation payload while preserving timestamps", () => {
    expect(
      normalizeTranslationPayload(
        {
          segments: [
            {
              id: 0,
              start: 99,
              end: 100,
              sourceText: "ignored source",
              translatedText: "Người dẫn đường không thể ngờ tới",
            },
          ],
        },
        sourceSegments,
      ),
    ).toEqual([
      {
        id: 0,
        start: 99,
        end: 100,
        sourceText: "ignored source",
        translatedText: "Người dẫn đường không thể ngờ tới",
      },
      {
        id: 1,
        start: 1.34,
        end: 3.72,
        sourceText: "一个被海关滞留许久的集装箱盲盒",
        translatedText: "一个被海关滞留许久的集装箱盲盒",
      },
    ]);
  });

  it("rejects empty segments", () => {
    expect(() => validateTranslationSegments([])).toThrow(
      "At least one transcript segment",
    );
  });

  it("normalizes translated text for Vietnamese TTS pronunciation", () => {
    expect(
      normalizeVietnameseTtsText(
        "Thêm wasabi với isothiocyanate, enzym myrosinase, lát cá dài 50cm, nặng 12kg và còn 5ml sốt.",
      ),
    ).toBe(
      "Thêm wa sa bi với ai sô thio xai a nết, en zim mai rô si nâyz, lát cá dài 50 xen ti mét, nặng 12 ki lô gam và còn 5 mi li lít sốt.",
    );

    expect(
      normalizeTranslationPayload(
        {
          segments: [
            {
              id: 0,
              translatedText: "Ăn wasabi với lát cá 50cm.",
            },
          ],
        },
        sourceSegments,
      )[0].translatedText,
    ).toBe("Ăn wa sa bi với lát cá 50 xen ti mét.");
  });

  it("guards Vietnamese TTS text against Pinyin-marked Chinese names", () => {
    expect(
      normalizeVietnameseTtsText(
        "Có phải nghe tin Zhūzhū về, nên lại định bám lấy Xǔ Shí?",
      ),
    ).toBe(
      "Có phải nghe tin Trư Trư về, nên lại định bám lấy Hứa Thời?",
    );

    expect(normalizeVietnameseTtsText("Cô ấy gặp Lǐ hôm qua.")).toBe(
      "Cô ấy gặp người đó hôm qua.",
    );
    expect(normalizeVietnameseTtsText("Cô ấy rất đáng yêu.")).toBe(
      "Cô ấy rất đáng yêu.",
    );
  });

  it("normalizes branding bumper text to a short neutral Vietnamese phrase", () => {
    expect(
      normalizeTranslationPayload(
        {
          segments: [
            {
              id: 0,
              translatedText: "YoYo Television Series Exclusive",
            },
          ],
        },
        [{ id: 0, start: 0, end: 1, text: "YoYo Television Series Exclusive" }],
      )[0].translatedText,
    ).toBe("Phim ngắn.");
  });

  it("parses model JSON when providers wrap it in markdown or prose", () => {
    expect(
      parseTranslationModelContent(
        '```json\n{"segments":[{"id":0,"translatedText":"Xin chào"}]}\n```',
      ),
    ).toEqual({
      segments: [{ id: 0, translatedText: "Xin chào" }],
    });

    expect(
      parseTranslationModelContent(
        'Sure, here is the JSON:\n{"segments":[{"id":1,"translatedText":"Tạm biệt"}]}\nDone.',
      ),
    ).toEqual({
      segments: [{ id: 1, translatedText: "Tạm biệt" }],
    });

    expect(
      parseTranslationModelContent(
        '[{"id":2,"translatedText":"Một mảng segment"}]',
      ),
    ).toEqual({
      segments: [{ id: 2, translatedText: "Một mảng segment" }],
    });

    expect(
      parseTranslationModelContent(
        '{"translations":{"0":"Xin chào","1":"Tạm biệt"}}',
      ),
    ).toEqual({
      segments: [
        { id: 0, text: "Xin chào" },
        { id: 1, text: "Tạm biệt" },
      ],
    });

    expect(
      parseTranslationModelContent('{"t":{"0":"Xin chào","1":"Tạm biệt"}}'),
    ).toEqual({
      segments: [
        { id: 0, text: "Xin chào" },
        { id: 1, text: "Tạm biệt" },
      ],
    });

    expect(
      parseTranslationModelContent(
        '<think></think>```json\n{"t":{"0":"Ngọc Toái","1":"Theo dõi hắn"}}\n```',
      ),
    ).toEqual({
      segments: [
        { id: 0, text: "Ngọc Toái" },
        { id: 1, text: "Theo dõi hắn" },
      ],
    });

    expect(
      parseTranslationModelContent('{"t":[[0,"Xin chào"],[1,"Tạm biệt"]]}'),
    ).toEqual({
      segments: [
        { id: 0, text: "Xin chào" },
        { id: 1, text: "Tạm biệt" },
      ],
    });

    expect(parseTranslationModelContent('{"0":"Xin chào"}')).toEqual({
      segments: [{ id: 0, text: "Xin chào" }],
    });

    expect(() =>
      parseTranslationModelContent("sure, here you go -> not-json-response"),
    ).toThrow(/Raw model content:/);
  });

  it("calls Groq chat completions with JSON mode and default model", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "chat_123",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  t: {
                    0: "Người dẫn đường có nằm mơ cũng không ngờ tới",
                    1: "Một container bí ẩn bị hải quan giữ lại rất lâu",
                  },
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      fetchImpl,
    });

    expect(result.model).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(result.provider.requestId).toBe("chat_123");
    expect(result.chunks).toEqual([{ index: 1, segmentCount: 2 }]);
    expect(result.generationDurationMs).toEqual(expect.any(Number));
    expect(result.translatedSegments[0]).toMatchObject({
      id: 0,
      start: 0,
      end: 1.34,
      translatedText: "Người dẫn đường có nằm mơ cũng không ngờ tới",
    });
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "run-start",
        providerHost: "api.groq.com",
        segmentCount: 2,
        chunkCount: 1,
        concurrency: 4,
      }),
    );
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "provider-request",
        mode: "chunk-json",
        chunkLabel: "1/1",
        firstId: 0,
        lastId: 1,
        requestBytes: expect.any(Number),
        fullTranscriptChars: 24,
      }),
    );
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "provider-body-read",
        mode: "chunk-json",
        chunkLabel: "1/1",
        status: 200,
        requestId: "chat_123",
        responseBytes: expect.any(Number),
        responsePreview: expect.stringContaining("Người dẫn đường"),
      }),
    );
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    const prompt = body.messages[1].content as string;
    expect(body.model).toBe(DEFAULT_TRANSLATION_MODEL);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(prompt).toContain("fit the source timing");
    expect(prompt).toContain("Translation guide:");
    expect(prompt).toContain("Pronouns: resolve Chinese 他/她");
    expect(prompt).toContain("Female cues include");
    expect(prompt).toContain("Male cues include");
    expect(prompt).toContain("avoid gendered Vietnamese pronouns");
    expect(prompt).not.toContain("Full source transcript context (read-only):");
    expect(prompt).toContain("Short source lines need short Vietnamese");
    expect(prompt).toContain("wasabi -> wa sa bi");
    expect(prompt).toContain("50cm -> 50 xen ti mét");
    expect(prompt).toContain("isothiocyanate -> ai sô thio xai a nết");
    expect(prompt).toContain("myrosinase -> mai rô si nâyz");
    expect(prompt).toContain("enzyme/enzym -> en zim");
    expect(prompt).toContain('"t"');
    expect(prompt).not.toContain("durationSeconds");
  });

  it("maps non-transient provider errors", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { message: "bad request" } }),
        { status: 400 },
      );
    });

    await expect(
      translateTranscriptSegments({
        segments: sourceSegments,
        apiKey: "secret",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSLATION_FAILED",
      message: "bad request",
    });
  });

  it("retries transient Gemini high-demand chunk failures before succeeding", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              code: 503,
              message:
                "This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.",
              status: "UNAVAILABLE",
            },
          }),
          { status: 503 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "chat_retry_ok",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    t: {
                      0: "Người dẫn đường có nằm mơ cũng không ngờ tới",
                      1: "Một container bí ẩn bị hải quan giữ lại rất lâu",
                    },
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      );

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
      providerName: "Google AI Studio",
      model: "gemini-3.1-flash-lite",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.translatedSegments).toHaveLength(2);
    expect(result.translatedSegments[0].translatedText).toBe(
      "Người dẫn đường có nằm mơ cũng không ngờ tới",
    );
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "chunk-transient-retry",
        chunkLabel: "1/1",
        attempt: 1,
        maxRetries: 4,
        delayMs: 0,
        error: expect.objectContaining({
          status: 502,
          message: expect.stringContaining("high demand"),
        }),
      }),
    );
  });

  it("fails boundedly when transient provider failures do not recover", async () => {
    vi.stubEnv("OMNIVIDEO_TRANSLATION_TRANSIENT_RETRIES", "2");
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            message: "This model is currently experiencing high demand.",
            status: "UNAVAILABLE",
          },
        }),
        { status: 503 },
      );
    });

    await expect(
      translateTranscriptSegments({
        segments: sourceSegments,
        apiKey: "secret",
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        providerName: "Google AI Studio",
        model: "gemini-3.1-flash-lite",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSLATION_FAILED",
      status: 502,
      message: expect.stringContaining("high demand"),
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("sends prompt cache key and logs cached token usage for OpenAI-native chat requests", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "chat_openai",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  t: {
                    0: "Người dẫn đường không thể ngờ tới",
                    1: "Một container bí ẩn bị giữ lại rất lâu",
                  },
                }),
              },
            },
          ],
          usage: {
            prompt_tokens: 1200,
            completion_tokens: 80,
            total_tokens: 1280,
            prompt_tokens_details: { cached_tokens: 1024 },
          },
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      baseUrl: "https://api.openai.com/v1",
      providerName: "openai",
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.prompt_cache_key).toMatch(/^ov-translation-/);
    expect(result.totalTokensUsed).toBe(1280);
    expect(result.totalCachedPromptTokens).toBe(1024);
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "provider-body-read",
        promptTokens: 1200,
        completionTokens: 80,
        totalTokens: 1280,
        cachedPromptTokens: 1024,
      }),
    );
  });

  it("maps translation provider network failures before response", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(
      translateTranscriptSegments({
        segments: sourceSegments,
        apiKey: "secret",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSLATION_FAILED",
      message: "Translation provider network request failed: fetch failed",
      status: 502,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(console.log).toHaveBeenCalledWith(
      "[TranscriptTranslation]",
      expect.objectContaining({
        event: "provider-fetch-failed",
        mode: "chunk-json",
        chunkLabel: "1/1",
        error: expect.objectContaining({
          message: "fetch failed",
        }),
      }),
    );
  });

  it("splits chunks and recovers when a limited provider returns invalid JSON", async () => {
    let callCount = 0;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      callCount += 1;
      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
      const requestSegments = JSON.parse(
        content.slice(content.indexOf("Segments:\n") + "Segments:\n".length),
      ) as Array<{ id: number; start: number; end: number; text: string }>;

      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            id: "chat_bad",
            choices: [{ message: { content: "Here is JSON: { bad" } }],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          id: `chat_${callCount}`,
          choices: [
            {
              message: {
                content: `\`\`\`json\n${JSON.stringify({
                  segments: requestSegments.map((segment) => ({
                    id: segment.id,
                    start: segment.start,
                    end: segment.end,
                    sourceText: segment.text,
                    translatedText: `Bản dịch ${segment.id}`,
                  })),
                })}\n\`\`\``,
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      baseUrl: "https://openrouter.ai/api/v1",
      providerName: "openrouter",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.provider.name).toBe("openrouter");
    expect(result.translatedSegments.map((segment) => segment.translatedText)).toEqual([
      "Bản dịch 0",
      "Bản dịch 1",
    ]);
  });

  it("keeps short provider chunks near one hundred fifty segments per request without repeating full transcript", async () => {
    const manySegments = Array.from({ length: 151 }, (_, index) => ({
      id: index,
      start: index,
      end: index + 0.5,
      text: `短句${index}`,
    }));
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
      if (content.includes("Transcript:\n")) {
        return new Response(
          JSON.stringify({
            id: "chat_guide",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    characters: {},
                    terms: {},
                    style: "concise Vietnamese voice-over",
                    warnings: ["keep pronouns consistent"],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }
      const requestSegments = JSON.parse(
        content.slice(content.indexOf("Segments:\n") + "Segments:\n".length),
      ) as Array<{ id: number; text: string }>;

      return new Response(
        JSON.stringify({
          id: `chat_${requestSegments[0].id}`,
          choices: [
            {
              message: {
                content: JSON.stringify({
                  segments: requestSegments.map((segment) => ({
                    id: segment.id,
                    translatedText: `Bản dịch ${segment.id}`,
                  })),
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: manySegments,
      apiKey: "secret",
      baseUrl: "https://openrouter.ai/api/v1",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.provider.requestId).toContain("chat_guide");
    expect(result.chunks.map((chunk) => chunk.segmentCount)).toEqual([150, 1]);

    const prompts = fetchImpl.mock.calls.slice(1).map(([, init]) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return body.messages[1].content as string;
    });
    expect(prompts[0]).toContain("短句0");
    expect(prompts[0]).toContain("短句150");
    expect(prompts[1]).not.toContain("短句0");
    expect(prompts[1]).toContain("短句150");

    const requestSegments = prompts.map((prompt) =>
      JSON.parse(prompt.slice(prompt.indexOf("Segments:\n") + "Segments:\n".length)),
    ) as Array<Array<{ id: number; text: string }>>;
    expect(requestSegments[0]).toHaveLength(150);
    expect(requestSegments[1]).toEqual([{ id: 150, text: "短句150" }]);
  });

  it("falls back to plain-text translation for a single segment after invalid JSON retries", async () => {
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      if (callCount <= 2) {
        return new Response(
          JSON.stringify({
            id: `chat_bad_${callCount}`,
            choices: [{ message: { content: "not-json" } }],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          id: "chat_fallback",
          choices: [{ message: { content: "YoYo Television Series Exclusive" } }],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: [{ id: 7, start: 10, end: 11, text: "YoYo Television Series Exclusive" }],
      apiKey: "secret",
      baseUrl: "https://openrouter.ai/api/v1",
      providerName: "9router",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    const [, fallbackInit] = fetchImpl.mock.calls[2];
    const fallbackBody = JSON.parse(fallbackInit.body as string);
    expect(fallbackBody.messages[0].content).toContain(
      "Keep gender pronouns consistent with Chinese context cues.",
    );
    expect(fallbackBody.messages[1].content).toContain(
      "Translation guide:",
    );
    expect(fallbackBody.messages[1].content).toContain(
      "YoYo Television Series Exclusive",
    );
    expect(result.translatedSegments).toEqual([
      {
        id: 7,
        start: 10,
        end: 11,
        sourceText: "YoYo Television Series Exclusive",
        translatedText: "Phim ngắn.",
      },
    ]);
  });

  it("maps single-segment fallback network failures before response", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "chat_bad",
            choices: [{ message: { content: "{ bad json" } }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "chat_bad_retry",
            choices: [{ message: { content: "{ still bad json" } }],
          }),
          { status: 200 },
        ),
      )
      .mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(
      translateTranscriptSegments({
        segments: [sourceSegments[0]],
        apiKey: "secret",
        fetchImpl,
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSLATION_FAILED",
      message: "Translation provider network request failed: fetch failed",
      status: 502,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("splits translation chunks when Groq reports request too large", async () => {
    let callCount = 0;
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      callCount += 1;
      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: {
              message:
                "Request too large for model on tokens per minute (TPM): Limit 8000, Requested 9127",
            },
          }),
          { status: 413 },
        );
      }

      const requestSegments = JSON.parse(
        content.slice(content.indexOf("Segments:\n") + "Segments:\n".length),
      ) as Array<{ id: number; text: string }>;
      const id = requestSegments[0].id;
      const sourceText = id === 0 ? sourceSegments[0].text : sourceSegments[1].text;
      return new Response(
        JSON.stringify({
          id: `chat_${callCount}`,
          choices: [
            {
              message: {
                content: JSON.stringify({
                  segments: [
                    {
                      id,
                      start: id === 0 ? 0 : 1.34,
                      end: id === 0 ? 1.34 : 3.72,
                      sourceText,
                      translatedText:
                        id === 0
                          ? "Người dẫn đường không thể ngờ tới"
                          : "Một container bí ẩn bị giữ lại rất lâu",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.translatedSegments.map((segment) => segment.id)).toEqual([
      0,
      1,
    ]);
    expect(result.translatedSegments[1].translatedText).toBe(
      "Một container bí ẩn bị giữ lại rất lâu",
    );
  });

  it("retries untranslated CJK segments with a smaller request", async () => {
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      return new Response(
        JSON.stringify({
          id: `chat_${callCount}`,
          choices: [
            {
              message: {
                content:
                  callCount === 1
                    ? JSON.stringify({
                        segments: [
                          {
                            id: 0,
                            start: 0,
                            end: 1.34,
                            sourceText: sourceSegments[0].text,
                            translatedText: sourceSegments[0].text,
                          },
                          {
                            id: 1,
                            start: 1.34,
                            end: 3.72,
                            sourceText: sourceSegments[1].text,
                            translatedText:
                              "Một container bí ẩn bị giữ lại rất lâu",
                          },
                        ],
                      })
                    : JSON.stringify({
                        segments: [
                          {
                            id: 0,
                            start: 0,
                            end: 1.34,
                            sourceText: sourceSegments[0].text,
                            translatedText:
                              "Người dẫn đường không thể ngờ tới",
                          },
                        ],
                      }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: sourceSegments,
      apiKey: "secret",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.translatedSegments[0].translatedText).toBe(
      "Người dẫn đường không thể ngờ tới",
    );
    expect(result.translatedSegments[1].translatedText).toBe(
      "Một container bí ẩn bị giữ lại rất lâu",
    );
  });

  it("retries translated segments that still contain CJK text", async () => {
    let callCount = 0;
    const fetchImpl = vi.fn(async () => {
      callCount += 1;
      return new Response(
        JSON.stringify({
          id: `chat_${callCount}`,
          choices: [
            {
              message: {
                content:
                  callCount === 1
                    ? JSON.stringify({
                        segments: [
                          {
                            id: 0,
                            start: 0,
                            end: 1.34,
                            sourceText: "你呆呆地看着闹钟",
                            translatedText:
                              "Bạn nhìn đồng hồ báo thức một cách ngây呆",
                          },
                          {
                            id: 1,
                            start: 1.34,
                            end: 3.72,
                            sourceText: sourceSegments[1].text,
                            translatedText:
                              "Một container bí ẩn bị giữ lại rất lâu",
                          },
                        ],
                      })
                    : JSON.stringify({
                        segments: [
                          {
                            id: 0,
                            start: 0,
                            end: 1.34,
                            sourceText: "你呆呆地看着闹钟",
                            translatedText:
                              "Bạn ngây người nhìn đồng hồ báo thức",
                          },
                        ],
                      }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: [
        { id: 0, start: 0, end: 1.34, text: "你呆呆地看着闹钟" },
        sourceSegments[1],
      ],
      apiKey: "secret",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.translatedSegments[0]).toMatchObject({
      id: 0,
      start: 0,
      end: 1.34,
      translatedText: "Bạn ngây người nhìn đồng hồ báo thức",
    });
    expect(result.translatedSegments[1].translatedText).toBe(
      "Một container bí ẩn bị giữ lại rất lâu",
    );
  });

  it("limits quality retries when provider keeps returning CJK text", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          id: "chat_retry",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  segments: [
                    {
                      id: 0,
                      start: 0,
                      end: 1.34,
                      sourceText: "你呆呆地看着闹钟",
                      translatedText:
                        "Bạn nhìn đồng hồ báo thức một cách ngây呆",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: [{ id: 0, start: 0, end: 1.34, text: "你呆呆地看着闹钟" }],
      apiKey: "secret",
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result.translatedSegments[0].translatedText).toBe(
      "Bạn nhìn đồng hồ báo thức một cách ngây呆",
    );
  });

  it("translates independent chunks concurrently while preserving order", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const manySegments = Array.from({ length: 5 }, (_, index) => ({
      id: index,
      start: index,
      end: index + 0.5,
      text: `${"片段".repeat(1200)} ${index}`,
    }));
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
      if (content.includes("Transcript:\n")) {
        return new Response(
          JSON.stringify({
            id: "chat_guide",
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    characters: {},
                    terms: {},
                    style: "concise Vietnamese voice-over",
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;

      const requestSegments = JSON.parse(
        content.slice(content.indexOf("Segments:\n") + "Segments:\n".length),
      ) as Array<{ id: number; start: number; end: number; text: string }>;

      return new Response(
        JSON.stringify({
          id: `chat_${requestSegments[0].id}`,
          choices: [
            {
              message: {
                content: JSON.stringify({
                  segments: requestSegments.map((segment) => ({
                    id: segment.id,
                    start: segment.start,
                    end: segment.end,
                    sourceText: segment.text,
                    translatedText: `Bản dịch ${segment.id}`,
                  })),
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await translateTranscriptSegments({
      segments: manySegments,
      apiKey: "secret",
      fetchImpl,
    });

    expect(maxInFlight).toBeGreaterThan(1);
    expect(result.translatedSegments.map((segment) => segment.id)).toEqual([
      0,
      1,
      2,
      3,
      4,
    ]);
    expect(result.translatedSegments.map((segment) => segment.translatedText)).toEqual([
      "Bản dịch 0",
      "Bản dịch 1",
      "Bản dịch 2",
      "Bản dịch 3",
      "Bản dịch 4",
    ]);
  });
});
