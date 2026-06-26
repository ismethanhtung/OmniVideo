import type {
    AudioTranscriptSegment,
    AudioTranscriptWord,
    ChineseTranscriptionResult,
} from "./types";

const DEFAULT_RETRY_MAX_CHARS = 18;
const SENTENCE_BREAK_CHARS = new Set([
    "，",
    ",",
    "。",
    ".",
    "！",
    "!",
    "？",
    "?",
    "；",
    ";",
    "：",
    ":",
]);

function visibleLength(value: string) {
    return Array.from(value.replace(/\s+/gu, "")).length;
}

function countHan(value: string) {
    return Array.from(value).filter((char) => /\p{Script=Han}/u.test(char))
        .length;
}

function splitByPunctuation(text: string) {
    const chunks: string[] = [];
    let current = "";
    for (const char of Array.from(text.trim())) {
        current += char;
        if (SENTENCE_BREAK_CHARS.has(char)) {
            const trimmed = current.trim();
            if (trimmed) chunks.push(trimmed);
            current = "";
        }
    }
    const tail = current.trim();
    if (tail) chunks.push(tail);
    return chunks.filter((chunk) => visibleLength(chunk) > 0);
}

function splitByLength(text: string, maxChars: number) {
    const chars = Array.from(text.trim());
    if (chars.length <= maxChars) return [text.trim()];
    const chunks: string[] = [];
    for (let index = 0; index < chars.length; index += maxChars) {
        const chunk = chars.slice(index, index + maxChars).join("").trim();
        if (chunk) chunks.push(chunk);
    }
    return chunks;
}

export function splitTranscriptRetryText(
    text: string,
    maxChars = DEFAULT_RETRY_MAX_CHARS,
) {
    const trimmed = text.trim();
    if (!trimmed) return [];
    const punctuationChunks = splitByPunctuation(trimmed);
    if (punctuationChunks.length > 1) return punctuationChunks;
    if (countHan(trimmed) > maxChars || visibleLength(trimmed) > maxChars * 2) {
        return splitByLength(trimmed, maxChars);
    }
    return [trimmed];
}

function findWordsForSegment(
    words: AudioTranscriptWord[],
    segment: AudioTranscriptSegment,
) {
    return words
        .filter(
            (word) =>
                word.start >= segment.start - 0.15 &&
                word.end <= segment.end + 0.15,
        )
        .sort((a, b) => a.start - b.start);
}

function splitSegmentWithWordTimings(input: {
    segment: AudioTranscriptSegment;
    chunks: string[];
    words: AudioTranscriptWord[];
}) {
    const { segment, chunks, words } = input;
    if (words.length < chunks.length) return null;

    const chunkUnits = chunks.map((chunk) => Math.max(1, visibleLength(chunk)));
    const totalUnits = chunkUnits.reduce((total, count) => total + count, 0);
    const wordUnits = words.map((word) => Math.max(1, visibleLength(word.word)));
    const totalWordUnits = wordUnits.reduce((total, count) => total + count, 0);
    const unitTotal = Math.max(totalUnits, totalWordUnits);
    const segments: AudioTranscriptSegment[] = [];
    let wordIndex = 0;
    let consumedUnits = 0;

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
        const remainingChunks = chunks.length - chunkIndex - 1;
        const startWordIndex = wordIndex;
        consumedUnits += chunkUnits[chunkIndex];
        const targetUnits = (consumedUnits / totalUnits) * unitTotal;
        let currentUnits = wordUnits
            .slice(0, wordIndex)
            .reduce((total, count) => total + count, 0);

        while (
            wordIndex < words.length - remainingChunks &&
            (chunkIndex === chunks.length - 1 || currentUnits < targetUnits)
        ) {
            currentUnits += wordUnits[wordIndex] ?? 1;
            wordIndex += 1;
        }

        const assignedWords = words.slice(startWordIndex, wordIndex);
        const firstWord = assignedWords[0];
        const lastWord = assignedWords[assignedWords.length - 1];
        segments.push({
            id: segment.id,
            start: firstWord?.start ?? segment.start,
            end: lastWord?.end ?? segment.end,
            text: chunks[chunkIndex],
        });
    }

    return segments.every((item) => item.end > item.start) ? segments : null;
}

function splitSegmentProportionally(
    segment: AudioTranscriptSegment,
    chunks: string[],
) {
    const units = chunks.map((chunk) => Math.max(1, visibleLength(chunk)));
    const totalUnits = units.reduce((total, count) => total + count, 0);
    const duration = Math.max(0, segment.end - segment.start);
    let cursor = segment.start;
    return chunks.map((chunk, index) => {
        const isLast = index === chunks.length - 1;
        const chunkDuration = isLast
            ? segment.end - cursor
            : duration * (units[index] / totalUnits);
        const start = cursor;
        const end = isLast ? segment.end : cursor + chunkDuration;
        cursor = end;
        return {
            id: segment.id,
            start,
            end,
            text: chunk,
        };
    });
}

function splitSelectedSegment(input: {
    segment: AudioTranscriptSegment;
    words: AudioTranscriptWord[];
}) {
    const chunks = splitTranscriptRetryText(input.segment.text);
    if (chunks.length <= 1) return [input.segment];
    return (
        splitSegmentWithWordTimings({
            segment: input.segment,
            chunks,
            words: findWordsForSegment(input.words, input.segment),
        }) ?? splitSegmentProportionally(input.segment, chunks)
    );
}

export function buildTranscriptRetryOverride(input: {
    transcript: ChineseTranscriptionResult;
    retrySegmentIds: number[];
}) {
    const retryIds = new Set(
        input.retrySegmentIds.filter((id) => Number.isInteger(id) && id >= 0),
    );
    const outputSegments: AudioTranscriptSegment[] = [];
    const retriedSegmentIds: number[] = [];

    for (const segment of input.transcript.segments) {
        if (!retryIds.has(segment.id)) {
            outputSegments.push(segment);
            continue;
        }
        const splitSegments = splitSelectedSegment({
            segment,
            words: input.transcript.words,
        });
        outputSegments.push(...splitSegments);
        if (splitSegments.length > 1) {
            retriedSegmentIds.push(segment.id);
        }
    }

    const reindexedSegments = outputSegments.map((segment, index) => ({
        ...segment,
        id: index,
    }));

    return {
        transcript: {
            ...input.transcript,
            text: reindexedSegments.map((segment) => segment.text).join("\n"),
            segments: reindexedSegments,
        },
        retriedSegmentIds,
        splitSegmentCount: reindexedSegments.length - input.transcript.segments.length,
        changed: retriedSegmentIds.length > 0,
    };
}
