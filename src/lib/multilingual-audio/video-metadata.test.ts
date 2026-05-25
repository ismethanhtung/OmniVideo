import { describe, expect, it, vi } from "vitest";

import {
  generateVietnameseVideoMetadata,
  inferPreferredVietnameseMetadataTags,
  PREFERRED_VI_METADATA_TAGS,
} from "./video-metadata";

describe("Vietnamese video metadata preferred tags", () => {
  it("infers review and summary tags for Chinese story animation content", () => {
    const result = inferPreferredVietnameseMetadataTags({
      sourceTitle: "Review full hoạt hình Trung Quốc cổ trang",
      sourceDescription: "Tóm tắt truyện ngôn tình xuyên không",
      hashtags: ["ngontinh", "co_trang", "xuyenkhong", "truyentranh"],
      translatedSegments: [
        {
          id: 1,
          start: 0,
          end: 10,
          sourceText: "demo",
          translatedText:
            "Đây là phần review truyện full và tóm tắt phim hoạt hình Trung Quốc.",
        },
      ],
    });

    expect(result).toEqual(
      expect.arrayContaining([
        "review phim",
        "review full",
        "hoạt hình",
        "review truyện",
        "tóm tắt truyện",
        "tóm tắt phim",
        "hoạt hình trung quốc",
      ]),
    );
  });

  it("does not add preferred tags without matching content type signals", () => {
    expect(
      inferPreferredVietnameseMetadataTags({
        sourceTitle: "Mẹo nấu ăn gia đình",
        sourceDescription: "Tóm tắt các bước chuẩn bị bữa tối",
        hashtags: ["amthuc", "giadinh"],
      }),
    ).toEqual([]);
  });

  it("prompts for preferred tags and appends inferred tags to provider output", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "chatcmpl-demo",
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Review full cổ trang",
                  description: "Tóm tắt phim hoạt hình Trung Quốc.",
                  hashtags: ["ngontinh", "co_trang"],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await generateVietnameseVideoMetadata({
      apiKey: "test-key",
      fetcher,
      sourceTitle: "Review full hoạt hình Trung Quốc",
      translatedSegments: [
        {
          id: 1,
          start: 0,
          end: 8,
          sourceText: "demo",
          translatedText: "Tóm tắt phim hoạt hình Trung Quốc cổ trang.",
        },
      ],
    });
    const requestBody = JSON.parse(
      fetcher.mock.calls[0][1]?.body as string,
    ) as {
      messages: Array<{ role: string; content: string }>;
    };
    const userPrompt = requestBody.messages.find(
      (message) => message.role === "user",
    )?.content;

    for (const tag of PREFERRED_VI_METADATA_TAGS) {
      expect(userPrompt).toContain(tag);
    }
    expect(result.hashtags).toEqual(
      expect.arrayContaining(["ngontinh", "co_trang", "review full", "hoạt hình trung quốc"]),
    );
  });

  it("maps metadata network failures to provider error code", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      generateVietnameseVideoMetadata({
        apiKey: "test-key",
        fetcher,
        translatedSegments: [
          {
            id: 1,
            start: 0,
            end: 1,
            sourceText: "demo",
            translatedText: "xin chao",
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "PRV_GROQ_TRANSLATION_FAILED",
      message: expect.stringContaining("fetch failed"),
    });
  });
});
