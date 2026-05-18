import { describe, expect, it } from "vitest";

import {
    buildWordAwareVoiceSegments,
    buildWordAwareVoiceSegmentsWithDiagnostics,
} from "./voice-segment-timing";

describe("word-aware voice segment timing", () => {
    it("moves a delayed single-word segment voice onset to the source word timestamp", () => {
        expect(
            buildWordAwareVoiceSegments({
                translatedSegments: [
                    {
                        id: 8,
                        start: 7.76,
                        end: 8.7,
                        sourceText: "守护世界和平",
                        translatedText: "Bảo vệ hòa bình thế giới.",
                    },
                    {
                        id: 9,
                        start: 8.7,
                        end: 10,
                        sourceText: "啊",
                        translatedText: "Á!",
                    },
                    {
                        id: 10,
                        start: 10,
                        end: 10.7,
                        sourceText: "",
                        translatedText: "",
                    },
                ],
                words: [
                    { word: "守护", start: 7.76, end: 8.05 },
                    { word: "世界", start: 8.05, end: 8.35 },
                    { word: "和平", start: 8.35, end: 8.6 },
                    { word: "啊", start: 9.76, end: 9.96 },
                ],
            }),
        ).toEqual([
            {
                id: 8,
                start: 7.76,
                end: 8.7,
                text: "Bảo vệ hòa bình thế giới.",
            },
            {
                id: 9,
                start: 9.76,
                end: 10,
                text: "Á!",
            },
            {
                id: 10,
                start: 10,
                end: 10.7,
                text: "",
            },
        ]);
    });

    it("falls back to segment timing when word timestamps are unavailable", () => {
        expect(
            buildWordAwareVoiceSegments({
                translatedSegments: [
                    {
                        id: 1,
                        start: 1,
                        end: 2,
                        sourceText: "missing words",
                        translatedText: "Không có word timing.",
                    },
                ],
                words: [],
            }),
        ).toEqual([
            {
                id: 1,
                start: 1,
                end: 2,
                text: "Không có word timing.",
            },
        ]);
    });

    it("splits merged multi-sentence segments across source word timing gaps", () => {
        expect(
            buildWordAwareVoiceSegments({
                translatedSegments: [
                    {
                        id: 112,
                        start: 315.724,
                        end: 324.626,
                        sourceText: "喵喵老君要见你了为什么他并没有在找我吧",
                        translatedText:
                            "Meo meo, Lão Quân muốn gặp anh rồi. Sao lại vậy, ông ấy đâu có tìm tôi?",
                    },
                ],
                words: [
                    { word: "喵喵", start: 316.044, end: 316.42 },
                    { word: "老君", start: 317.15, end: 317.52 },
                    { word: "要", start: 317.52, end: 317.7 },
                    { word: "见", start: 317.7, end: 317.9 },
                    { word: "你", start: 317.9, end: 318.1 },
                    { word: "了", start: 318.1, end: 318.28 },
                    { word: "为什么", start: 319.05, end: 319.5 },
                    { word: "他", start: 319.5, end: 319.65 },
                    { word: "并没有", start: 319.65, end: 320.1 },
                    { word: "在", start: 320.1, end: 320.24 },
                    { word: "找", start: 320.24, end: 320.4 },
                    { word: "我", start: 320.4, end: 320.55 },
                    { word: "吧", start: 320.55, end: 320.7 },
                ],
            }),
        ).toEqual([
            {
                id: 112000,
                sourceSegmentId: 112,
                start: 316.044,
                end: 316.42,
                text: "Meo meo",
            },
            {
                id: 112001,
                sourceSegmentId: 112,
                start: 317.15,
                end: 318.28,
                text: "Lão Quân muốn gặp anh rồi.",
            },
            {
                id: 112002,
                sourceSegmentId: 112,
                start: 319.05,
                end: 320.7,
                text: "Sao lại vậy, ông ấy đâu có tìm tôi?",
            },
        ]);
    });

    it("keeps one continuous voice segment when sentence chunks outnumber source timing clusters", () => {
        expect(
            buildWordAwareVoiceSegments({
                translatedSegments: [
                    {
                        id: 66,
                        start: 181.702,
                        end: 193.773,
                        sourceText:
                            "今年没刷牙了吧你没关系此时你们需要的是备制充牙器轻轻一冲啊不是轻轻一冲口腔杂物全搞定温和不刺激",
                        translatedText:
                            "Cả năm không đánh răng hả? Không sao, lúc này thứ các bạn cần là máy tăm nước Beizhi. Xịt nhẹ một cái—à không, chỉ một cái là sạch hết cặn bẩn khoang miệng, dịu nhẹ không kích ứng.",
                    },
                ],
                words: [
                    { word: "今年", start: 181.702, end: 182.15 },
                    { word: "没刷牙", start: 182.15, end: 182.72 },
                    { word: "了吧", start: 182.72, end: 183.08 },
                    { word: "你没关系", start: 188.4, end: 189.08 },
                    { word: "此时", start: 189.08, end: 189.34 },
                    { word: "你们需要的是", start: 189.34, end: 190.22 },
                    { word: "备制充牙器", start: 190.22, end: 191.04 },
                    { word: "轻轻一冲", start: 191.04, end: 191.58 },
                    { word: "口腔杂物全搞定", start: 191.58, end: 192.52 },
                    { word: "温和不刺激", start: 192.52, end: 193.2 },
                ],
            }),
        ).toEqual([
            {
                id: 66,
                start: 181.702,
                end: 193.773,
                text: "Cả năm không đánh răng hả? Không sao, lúc này thứ các bạn cần là máy tăm nước Beizhi. Xịt nhẹ một cái—à không, chỉ một cái là sạch hết cặn bẩn khoang miệng, dịu nhẹ không kích ứng.",
            },
        ]);
    });

    it("repairs a short segment when Groq returns a hallucinated long first-word timestamp", () => {
        const result = buildWordAwareVoiceSegmentsWithDiagnostics({
            translatedSegments: [
                {
                    id: 7,
                    start: 60,
                    end: 86.18,
                    sourceText: "这位公子",
                    translatedText: "Công tử này",
                },
                {
                    id: 8,
                    start: 86.18,
                    end: 88.06,
                    sourceText: "吃饭还是住店呀",
                    translatedText: "Dùng bữa hay trọ quán ạ?",
                },
            ],
            words: [
                { word: "这", start: 60, end: 80 },
                { word: "位", start: 80.05, end: 80.22 },
                { word: "公子", start: 80.22, end: 80.74 },
                { word: "吃饭", start: 86.18, end: 86.58 },
                { word: "还是", start: 86.58, end: 86.96 },
                { word: "住店", start: 86.96, end: 87.35 },
                { word: "呀", start: 87.35, end: 87.52 },
            ],
        });

        expect(result.segments[0]).toEqual({
            id: 7,
            start: 80.05,
            end: 86.18,
            text: "Công tử này",
        });
        expect(result.segments[1]).toEqual({
            id: 8,
            start: 86.18,
            end: 88.06,
            text: "Dùng bữa hay trọ quán ạ?",
        });
        expect(result.diagnostics).toEqual([
            expect.objectContaining({
                segmentId: 7,
                code: "SUSPICIOUS_WORD_TIMESTAMP_REPAIRED",
                originalStart: 60,
                repairedStart: 80.05,
                suspiciousWords: [
                    {
                        word: "这",
                        start: 60,
                        end: 80,
                        durationSeconds: 20,
                    },
                ],
            }),
        ]);
    });

    it("estimates timing near segment end when all word timestamps are suspicious", () => {
        const result = buildWordAwareVoiceSegmentsWithDiagnostics({
            translatedSegments: [
                {
                    id: 12,
                    start: 60,
                    end: 86,
                    sourceText: "这",
                    translatedText: "Này",
                },
            ],
            words: [{ word: "这", start: 60, end: 86 }],
        });

        expect(result.segments).toEqual([
            {
                id: 12,
                start: 85.55,
                end: 86,
                text: "Này",
            },
        ]);
        expect(result.diagnostics).toHaveLength(1);
    });
});
