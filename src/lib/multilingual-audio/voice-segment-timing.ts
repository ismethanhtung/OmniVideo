import type {
    AudioTranscriptWord,
    TranscriptTranslationSegment,
    VoiceGenerationSegment,
} from "./types";

const WORD_OVERLAP_EPSILON_SECONDS = 0.001;

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

export function buildWordAwareVoiceSegments(input: {
    translatedSegments: TranscriptTranslationSegment[];
    words: AudioTranscriptWord[];
}): VoiceGenerationSegment[] {
    return input.translatedSegments.map((segment) => {
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
