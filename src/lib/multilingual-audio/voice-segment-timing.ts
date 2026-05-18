import type {
    AudioTranscriptWord,
    TranscriptTranslationSegment,
    VoiceSegmentTimingDiagnostic,
    VoiceGenerationSegment,
} from "./types";

const WORD_OVERLAP_EPSILON_SECONDS = 0.001;
const WORD_CLUSTER_GAP_SECONDS = 0.35;
const MAX_REASONABLE_WORD_DURATION_SECONDS = 2.5;
const MAX_REASONABLE_SECONDS_PER_SOURCE_CHAR = 0.9;
const ESTIMATED_SECONDS_PER_SOURCE_CHAR = 0.28;
const MIN_REPAIRED_SEGMENT_SECONDS = 0.45;
const MAX_REPAIRED_SEGMENT_SECONDS = 2.4;

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

function countSpeechCharacters(text: string) {
    return Array.from(text.replace(/\s+/gu, "")).filter((char) =>
        /[\p{L}\p{N}]/u.test(char),
    ).length;
}

function estimateSourceSpeechDurationSeconds(text: string) {
    const characterCount = countSpeechCharacters(text);
    if (characterCount === 0) return MIN_REPAIRED_SEGMENT_SECONDS;
    return Math.min(
        MAX_REPAIRED_SEGMENT_SECONDS,
        Math.max(
            MIN_REPAIRED_SEGMENT_SECONDS,
            characterCount * ESTIMATED_SECONDS_PER_SOURCE_CHAR,
        ),
    );
}

function isSuspiciousWordTimestamp(word: AudioTranscriptWord) {
    const durationSeconds = word.end - word.start;
    if (durationSeconds <= MAX_REASONABLE_WORD_DURATION_SECONDS) return false;
    const characterCount = Math.max(1, countSpeechCharacters(word.word));
    return (
        durationSeconds >
        characterCount * MAX_REASONABLE_SECONDS_PER_SOURCE_CHAR
    );
}

function repairSuspiciousSegmentTiming(input: {
    segment: TranscriptTranslationSegment;
    words: AudioTranscriptWord[];
}) {
    const suspiciousWords = input.words.filter(isSuspiciousWordTimestamp);
    if (suspiciousWords.length === 0) {
        return {
            words: input.words,
            diagnostic: null,
        };
    }

    const reliableWords = input.words.filter(
        (word) => !isSuspiciousWordTimestamp(word),
    );
    if (reliableWords.length > 0) {
        const firstReliableWord = reliableWords[0];
        const lastReliableWord = reliableWords[reliableWords.length - 1];
        return {
            words: reliableWords,
            diagnostic: {
                segmentId: input.segment.id,
                code: "SUSPICIOUS_WORD_TIMESTAMP_REPAIRED",
                severity: "warning",
                message:
                    "Ignored suspiciously long word timestamp and anchored voice to reliable source words.",
                originalStart: input.segment.start,
                originalEnd: input.segment.end,
                repairedStart: Math.max(input.segment.start, firstReliableWord.start),
                repairedEnd: Math.max(firstReliableWord.start, lastReliableWord.end),
                suspiciousWords: suspiciousWords.map((word) => ({
                    word: word.word,
                    start: word.start,
                    end: word.end,
                    durationSeconds: word.end - word.start,
                })),
            } satisfies VoiceSegmentTimingDiagnostic,
        };
    }

    const estimatedDurationSeconds = estimateSourceSpeechDurationSeconds(
        input.segment.sourceText || input.segment.translatedText,
    );
    const repairedStart = Math.max(
        input.segment.start,
        input.segment.end - estimatedDurationSeconds,
    );
    const repairedEnd = Math.max(repairedStart, input.segment.end);
    return {
        words: [
            {
                word: input.segment.sourceText,
                start: repairedStart,
                end: repairedEnd,
            },
        ],
        diagnostic: {
            segmentId: input.segment.id,
            code: "SUSPICIOUS_WORD_TIMESTAMP_REPAIRED",
            severity: "warning",
            message:
                "Estimated voice timing because all source word timestamps looked suspicious.",
            originalStart: input.segment.start,
            originalEnd: input.segment.end,
            repairedStart,
            repairedEnd,
            suspiciousWords: suspiciousWords.map((word) => ({
                word: word.word,
                start: word.start,
                end: word.end,
                durationSeconds: word.end - word.start,
            })),
        } satisfies VoiceSegmentTimingDiagnostic,
    };
}

function buildSplitVoiceSegments(input: {
    segment: TranscriptTranslationSegment;
    words: AudioTranscriptWord[];
}) {
    const textChunks = splitTranslatedTextForVoice(input.segment.translatedText);
    const wordClusters = clusterWordsByPause(input.words);
    if (textChunks.length < 2 || wordClusters.length < 2) return null;
    // Only split when translation structure and source timing evidence line up
    // one-to-one. If they disagree, grouping extra text into a later cluster can
    // create long dead air followed by rushed speech inside one parent segment.
    if (textChunks.length !== wordClusters.length) return null;

    return textChunks.map((text, index): VoiceGenerationSegment => {
        const cluster = wordClusters[index];
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
    return buildWordAwareVoiceSegmentsWithDiagnostics(input).segments;
}

export function buildWordAwareVoiceSegmentsWithDiagnostics(input: {
    translatedSegments: TranscriptTranslationSegment[];
    words: AudioTranscriptWord[];
}): {
    segments: VoiceGenerationSegment[];
    diagnostics: VoiceSegmentTimingDiagnostic[];
} {
    const diagnostics: VoiceSegmentTimingDiagnostic[] = [];
    const segments = input.translatedSegments.flatMap((segment) => {
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

        const repaired = repairSuspiciousSegmentTiming({
            segment,
            words: segmentWords,
        });
        if (repaired.diagnostic) {
            diagnostics.push(repaired.diagnostic);
        }
        const timingWords = repaired.words;

        const splitSegments = buildSplitVoiceSegments({
            segment,
            words: timingWords,
        });
        if (splitSegments) return splitSegments;

        const firstWord = timingWords[0];
        const lastWord = timingWords[timingWords.length - 1];
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

    return { segments, diagnostics };
}
