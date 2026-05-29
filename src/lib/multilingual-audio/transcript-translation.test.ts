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
                  segments: [
                    {
                      id: 0,
                      start: 0,
                      end: 1.34,
                      sourceText: "寻导人做梦都想不到",
                      translatedText:
                        "Người dẫn đường có nằm mơ cũng không ngờ tới",
                    },
                    {
                      id: 1,
                      start: 1.34,
                      end: 3.72,
                      sourceText: "一个被海关滞留许久的集装箱盲盒",
                      translatedText:
                        "Một container bí ẩn bị hải quan giữ lại rất lâu",
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
    expect(body.model).toBe("cx/gpt-5.5");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(prompt).toContain("fits the segment duration");
    expect(prompt).toContain("infer a small cast/gender map");
    expect(prompt).toContain("do not translate 他 mechanically");
    expect(prompt).toContain("Female cues:");
    expect(prompt).toContain("Male cues:");
    expect(prompt).toContain("prefer a neutral Vietnamese wording");
    expect(prompt).toContain("Never insert pronouns inside another word");
    expect(prompt).toContain("Full source transcript context (read-only):");
    expect(prompt).toContain("Do not translate or output this whole context");
    expect(prompt).toContain("寻导人做梦都想不到一个被海关滞留许久的集装箱盲盒");
    expect(prompt).toContain("Do not force Vietnamese to match the source character count exactly");
    expect(prompt).toContain("short Chinese segments need short Vietnamese");
    expect(prompt).toContain("20 -> hai mươi");
    expect(prompt).toContain("wasabi -> wa sa bi");
    expect(prompt).toContain("50cm -> 50 xen ti mét");
    expect(prompt).toContain("isothiocyanate -> ai sô thio xai a nết");
    expect(prompt).toContain("myrosinase -> mai rô si nâyz");
    expect(prompt).toContain("enzyme/enzym -> en zim");
    expect(prompt).toContain('"translations"');
    expect(prompt).not.toContain("durationSeconds");
  });

  it("maps Groq provider errors", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: { message: "rate limit" } }),
        { status: 429 },
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
      message: "rate limit",
    });
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
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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

  it("keeps short provider chunks near one hundred segments per request", async () => {
    const manySegments = Array.from({ length: 101 }, (_, index) => ({
      id: index,
      start: index,
      end: index + 0.5,
      text: `短句${index}`,
    }));
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
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

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result.chunks.map((chunk) => chunk.segmentCount)).toEqual([100, 1]);

    const prompts = fetchImpl.mock.calls.map(([, init]) => {
      const body = JSON.parse((init as RequestInit).body as string);
      return body.messages[1].content as string;
    });
    expect(prompts[0]).toContain("短句0");
    expect(prompts[0]).toContain("短句100");
    expect(prompts[1]).toContain("短句0");
    expect(prompts[1]).toContain("短句100");

    const requestSegments = prompts.map((prompt) =>
      JSON.parse(prompt.slice(prompt.indexOf("Segments:\n") + "Segments:\n".length)),
    ) as Array<Array<{ id: number; text: string }>>;
    expect(requestSegments[0]).toHaveLength(100);
    expect(requestSegments[1]).toEqual([{ id: 100, text: "短句100" }]);
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
      "Full source transcript context (read-only):",
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
    expect(fetchImpl).toHaveBeenCalledTimes(2);
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
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 0));
      inFlight -= 1;

      const body = JSON.parse(init.body as string);
      const content = body.messages[1].content as string;
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
