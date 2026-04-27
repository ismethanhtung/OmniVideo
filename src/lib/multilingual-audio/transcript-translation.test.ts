import { afterEach, describe, expect, it, vi } from "vitest";

import {
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
    expect(result.translatedSegments[0]).toMatchObject({
      id: 0,
      start: 0,
      end: 1.34,
      translatedText: "Người dẫn đường có nằm mơ cũng không ngờ tới",
    });
    const [, init] = fetchImpl.mock.calls[0];
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("llama-3.1-8b-instant");
    expect(body.response_format).toEqual({ type: "json_object" });
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
});
