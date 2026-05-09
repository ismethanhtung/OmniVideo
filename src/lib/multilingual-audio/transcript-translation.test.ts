import { afterEach, describe, expect, it, vi } from "vitest";

import {
  normalizeVietnameseTtsText,
  normalizeTranslationPayload,
  translateTranscriptSegments,
  validateTranslationSegments,
} from "./transcript-translation";
import { DEFAULT_TRANSLATION_MODEL } from "./types";

const sourceSegments = [
  { id: 0, start: 0, end: 1.34, text: "寻导人做梦都想不到" },
  { id: 1, start: 1.34, end: 3.72, text: "一个被海关滞留许久的集装箱盲盒" },
];

describe("transcript translation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
        "Thêm wasabi lên miếng cá dài 50cm, nặng 12kg và còn 5ml sốt.",
      ),
    ).toBe(
      "Thêm wa sa bi lên miếng cá dài 50 xen ti mét, nặng 12 ki lô gam và còn 5 mi li lít sốt.",
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
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    const prompt = body.messages[1].content as string;
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(prompt).toContain("fits the segment duration");
    expect(prompt).toContain("Do not force Vietnamese to match the source character count exactly");
    expect(prompt).toContain("short Chinese segments need short Vietnamese");
    expect(prompt).toContain("20 -> hai mươi");
    expect(prompt).toContain("wasabi -> wa sa bi");
    expect(prompt).toContain("50cm -> 50 xen ti mét");
    expect(prompt).toContain("durationSeconds");
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

      const id = content.includes(sourceSegments[1].text) ? 1 : 0;
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
