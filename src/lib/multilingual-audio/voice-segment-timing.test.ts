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
});
