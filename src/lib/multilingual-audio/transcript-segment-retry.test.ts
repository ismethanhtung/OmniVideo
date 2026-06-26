import { describe, expect, it } from "vitest";

import { buildTranscriptRetryOverride, splitTranscriptRetryText } from "./transcript-segment-retry";
import type { ChineseTranscriptionResult } from "./types";

const baseTranscript: ChineseTranscriptionResult = {
    text: "开头\n说实话,看到你这么不着调,我也怀疑过你是不是我捡来的。\n结尾",
    language: "zh",
    model: "test-model",
    segments: [
        { id: 0, start: 0, end: 1, text: "开头" },
        {
            id: 150,
            start: 364,
            end: 374,
            text: "说实话,看到你这么不着调,我也怀疑过你是不是我捡来的。",
        },
        { id: 151, start: 374, end: 375, text: "结尾" },
    ],
    words: [
        { word: "说实话", start: 364.1, end: 365 },
        { word: "看到你这么不着调", start: 368, end: 370 },
        { word: "我也怀疑过你是不是我捡来的", start: 371.5, end: 373.6 },
    ],
    source: {
        fileName: "source.mp4",
        fileSizeBytes: 100,
    },
    audio: {
        format: "mp3",
        sampleRate: 16000,
        channels: 1,
        bitrateKbps: 64,
        fileSizeBytes: 100,
    },
    steps: [],
};

describe("transcript segment retry helper", () => {
    it("splits selected merged segments by source punctuation", () => {
        expect(
            splitTranscriptRetryText(
                "说实话,看到你这么不着调,我也怀疑过你是不是我捡来的。",
            ),
        ).toEqual([
            "说实话,",
            "看到你这么不着调,",
            "我也怀疑过你是不是我捡来的。",
        ]);
    });

    it("builds a transcript override with reindexed split segments", () => {
        const result = buildTranscriptRetryOverride({
            transcript: baseTranscript,
            retrySegmentIds: [150],
        });

        expect(result.changed).toBe(true);
        expect(result.retriedSegmentIds).toEqual([150]);
        expect(result.splitSegmentCount).toBe(2);
        expect(result.transcript.segments).toEqual([
            { id: 0, start: 0, end: 1, text: "开头" },
            { id: 1, start: 364.1, end: 365, text: "说实话," },
            {
                id: 2,
                start: 368,
                end: 370,
                text: "看到你这么不着调,",
            },
            {
                id: 3,
                start: 371.5,
                end: 373.6,
                text: "我也怀疑过你是不是我捡来的。",
            },
            { id: 4, start: 374, end: 375, text: "结尾" },
        ]);
    });

    it("reports unchanged when selected segments cannot be split", () => {
        const result = buildTranscriptRetryOverride({
            transcript: baseTranscript,
            retrySegmentIds: [0],
        });

        expect(result.changed).toBe(false);
        expect(result.transcript.segments).toHaveLength(3);
    });
});
