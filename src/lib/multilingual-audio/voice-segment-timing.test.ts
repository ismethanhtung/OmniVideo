import { describe, expect, it } from "vitest";

import { buildWordAwareVoiceSegments } from "./voice-segment-timing";

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
});
