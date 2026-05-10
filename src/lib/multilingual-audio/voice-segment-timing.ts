import type {
    AudioTranscriptWord,
    TranscriptTranslationSegment,
    VoiceGenerationSegment,
} from "./types";

const WORD_OVERLAP_EPSILON_SECONDS = 0.001;
const WORD_CLUSTER_GAP_SECONDS = 0.35;

function isFiniteTimestamp(value: number) {
    return Number.isFinite(value) && value >= 0;
}

function wordOverlapsSegment(
    word: AudioTranscriptWord,
    segment: TranscriptTranslationSegment,
) {
    if (!isFiniteTimestamp(word.start) || !isFiniteTimestamp(word.end)) {
        return false;
    }
    return (
        word.end > segment.start + WORD_OVERLAP_EPSILON_SECONDS &&
        word.start < segment.end - WORD_OVERLAP_EPSILON_SECONDS
    );
}

export function findWordsForTranslatedSegment(input: {
    segment: TranscriptTranslationSegment;
    words: AudioTranscriptWord[];
}) {
    return input.words
        .filter((word) => wordOverlapsSegment(word, input.segment))
        .sort((left, right) => left.start - right.start || left.end - right.end);
}

function splitTranslatedTextForVoice(text: string): string[] {
    const normalized = text.replace(/\s+/gu, " ").trim();
    if (!normalized) return [];

    const firstCommaMatch = /[,，]/u.exec(normalized);
    const firstCommaIndex = firstCommaMatch?.index ?? -1;
    if (
        firstCommaIndex > 0 &&
        firstCommaIndex <= 16 &&
        /[.!?。！？]/u.test(normalized.slice(firstCommaIndex + 1))
    ) {
        const firstChunk = normalized.slice(0, firstCommaIndex).trim();
        const rest = normalized.slice(firstCommaIndex + 1).trim();
        return [
            firstChunk,
            ...splitTranslatedTextForVoice(rest),
        ].filter(Boolean);
    }

    return (
        normalized.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu) ?? [
            normalized,
        ]
    )
        .map((chunk) => chunk.trim())
        .filter(Boolean);
}

function clusterWordsByPause(words: AudioTranscriptWord[]) {
    const clusters: AudioTranscriptWord[][] = [];
    for (const word of words) {
        const current = clusters[clusters.length - 1];
        const previous = current?.[current.length - 1];
        if (
            !current ||
            (previous && word.start - previous.end >= WORD_CLUSTER_GAP_SECONDS)
        ) {
            clusters.push([word]);
            continue;
        }
        current.push(word);
    }
    return clusters;
}

function distributeItems<T>(items: T[], targetCount: number) {
    return Array.from({ length: targetCount }, (_, index) => {
        const start = Math.floor((index * items.length) / targetCount);
        const end = Math.floor(((index + 1) * items.length) / targetCount);
        return items.slice(start, Math.max(start + 1, end));
    });
}

function buildSplitVoiceSegments(input: {
    segment: TranscriptTranslationSegment;
    words: AudioTranscriptWord[];
}) {
    const textChunks = splitTranslatedTextForVoice(input.segment.translatedText);
    const wordClusters = clusterWordsByPause(input.words);
    if (textChunks.length < 2 || wordClusters.length < 2) return null;

    const chunkCount = Math.min(textChunks.length, wordClusters.length);
    const groupedTextChunks = distributeItems(textChunks, chunkCount).map(
        (chunks) => chunks.join(" "),
    );
    const groupedWordClusters = distributeItems(wordClusters, chunkCount).map(
        (clusters) => clusters.flat(),
    );

    return groupedTextChunks.map((text, index): VoiceGenerationSegment => {
        const cluster = groupedWordClusters[index];
        const firstWord = cluster[0];
        const lastWord = cluster[cluster.length - 1];
        return {
            id: input.segment.id * 1000 + index,
            sourceSegmentId: input.segment.id,
            start: Math.max(input.segment.start, firstWord.start),
            end: Math.max(firstWord.start, lastWord.end),
            text,
        };
    });
}

export function buildWordAwareVoiceSegments(input: {
    translatedSegments: TranscriptTranslationSegment[];
    words: AudioTranscriptWord[];
}): VoiceGenerationSegment[] {
    return input.translatedSegments.flatMap((segment) => {
        const segmentWords = findWordsForTranslatedSegment({
            segment,
            words: input.words,
        });

        if (segmentWords.length === 0) {
            return {
                id: segment.id,
                start: segment.start,
                end: segment.end,
                text: segment.translatedText,
            };
        }

        const splitSegments = buildSplitVoiceSegments({
            segment,
            words: segmentWords,
        });
        if (splitSegments) return splitSegments;

        const firstWord = segmentWords[0];
        const lastWord = segmentWords[segmentWords.length - 1];
        const speechStart = Math.max(segment.start, firstWord.start);
        const speechEnd = Math.max(
            lastWord.end,
            segment.end > speechStart ? segment.end : speechStart,
        );

        return {
            id: segment.id,
            start: speechStart,
            end: speechEnd,
            text: segment.translatedText,
        };
    });
}
