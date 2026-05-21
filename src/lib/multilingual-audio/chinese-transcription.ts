import {
    extractSpeechReadyAudio,
    extractSpeechSegmentAudio,
} from "./audio-extraction";
import { transcribeWithGroq } from "./groq-transcription";
import type { NormalizedGroqTranscription } from "./groq-transcription";
import {
    readGroqApiKey,
    validateGroqAudioPayloadSize,
    validateChineseTranscriptionRequest,
} from "./validation";
import type {
    ChineseTranscriptionRequest,
    ChineseTranscriptionResult,
} from "./types";
import {
    ChineseTranscriptionError,
    type AudioTranscriptSegment,
    type AudioTranscriptWord,
    type AudioTranscriptionStep,
} from "./types";

const MAX_CHINESE_SEGMENT_CHARS = 40;
const MAX_SEGMENT_RETRY_ATTEMPTS = 5;
const HAN_CHARACTER_PATTERN = /\p{Script=Han}/gu;

function formatBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function failWithSteps(error: unknown, steps: AudioTranscriptionStep[]): never {
    if (error instanceof ChineseTranscriptionError) {
        throw new ChineseTranscriptionError(
            error.code,
            error.message,
            error.status,
            steps,
        );
    }
    throw error;
}

function countHanCharacters(text: string) {
    return Array.from(text.matchAll(HAN_CHARACTER_PATTERN)).length;
}

function isOverlongChineseSegment(segment: AudioTranscriptSegment) {
    return countHanCharacters(segment.text) > MAX_CHINESE_SEGMENT_CHARS;
}

function offsetSegments(
    segments: AudioTranscriptSegment[],
    offsetSeconds: number,
) {
    return segments.map((segment) => ({
        ...segment,
        start: segment.start + offsetSeconds,
        end: segment.end + offsetSeconds,
    }));
}

function offsetWords(words: AudioTranscriptWord[], offsetSeconds: number) {
    return words.map((word) => ({
        ...word,
        start: word.start + offsetSeconds,
        end: word.end + offsetSeconds,
    }));
}

function renumberSegments(segments: AudioTranscriptSegment[]) {
    return segments.map((segment, index) => ({
        ...segment,
        id: index,
    }));
}

async function retryOverlongChineseSegments(input: {
    transcript: NormalizedGroqTranscription;
    apiKey: string;
    audioBytes: Uint8Array;
    language: string;
    prompt?: string;
    includeWordTimestamps?: boolean;
}) {
    const suspiciousSegments = input.transcript.segments.filter(
        isOverlongChineseSegment,
    );
    if (suspiciousSegments.length === 0) {
        return {
            transcript: input.transcript,
            suspiciousSegmentCount: 0,
            retryRequestCount: 0,
        };
    }

    const replacements = new Map<
        number,
        {
            segments: AudioTranscriptSegment[];
            words: AudioTranscriptWord[];
            requestId?: string;
        }
    >();
    let retryRequestCount = 0;

    for (const segment of suspiciousSegments) {
        const clip = await extractSpeechSegmentAudio({
            audioBytes: input.audioBytes,
            startSeconds: segment.start,
            endSeconds: segment.end,
        });
        let lastText = segment.text;

        for (let attempt = 1; attempt <= MAX_SEGMENT_RETRY_ATTEMPTS; attempt += 1) {
            retryRequestCount += 1;
            const retryTranscript = await transcribeWithGroq({
                apiKey: input.apiKey,
                audioBytes: clip.audioBytes,
                language: input.language,
                prompt: input.prompt,
                audioDurationSeconds: clip.durationSeconds,
                timestampGranularities: input.includeWordTimestamps
                    ? ["segment", "word"]
                    : ["segment"],
            });
            lastText = retryTranscript.text || lastText;

            if (
                retryTranscript.segments.length > 0 &&
                retryTranscript.segments.every(
                    (candidate) => !isOverlongChineseSegment(candidate),
                )
            ) {
                replacements.set(segment.id, {
                    segments: offsetSegments(
                        retryTranscript.segments,
                        segment.start,
                    ),
                    words: offsetWords(retryTranscript.words, segment.start),
                    requestId: retryTranscript.requestId,
                });
                break;
            }
        }

        if (!replacements.has(segment.id)) {
            throw new ChineseTranscriptionError(
                "PRV_GROQ_SEGMENT_RETRY_EXHAUSTED",
                `Groq segment retry exhausted for segment ${segment.id} (${segment.start.toFixed(3)}s-${segment.end.toFixed(3)}s). Last text has ${countHanCharacters(lastText)} Chinese character(s).`,
                502,
            );
        }
    }

    const replacementWords = Array.from(replacements.values()).flatMap(
        (replacement) => replacement.words,
    );
    const segments = renumberSegments(
        input.transcript.segments.flatMap((segment) => {
            const replacement = replacements.get(segment.id);
            return replacement ? replacement.segments : [segment];
        }),
    );
    const replacedIds = new Set(replacements.keys());
    const words = [
        ...input.transcript.words.filter(
            (word) =>
                !input.transcript.segments.some(
                    (segment) =>
                        replacedIds.has(segment.id) &&
                        word.start >= segment.start &&
                        word.end <= segment.end,
                ),
        ),
        ...replacementWords,
    ].sort((left, right) => left.start - right.start || left.end - right.end);

    return {
        transcript: {
            ...input.transcript,
            text: segments.map((segment) => segment.text).join(""),
            requestId:
                Array.from(replacements.values()).at(-1)?.requestId ??
                input.transcript.requestId,
            segments,
            words,
        },
        suspiciousSegmentCount: suspiciousSegments.length,
        retryRequestCount,
    };
}

export async function runChineseVideoTranscription(
    input: ChineseTranscriptionRequest,
): Promise<ChineseTranscriptionResult> {
    const steps: AudioTranscriptionStep[] = [];
    const now = () => Date.now();
    try {
        const startedAt = now();
        validateChineseTranscriptionRequest(input);
        steps.push({
            id: "validate",
            label: "Validate source",
            status: "success",
            detail: "Source file accepted.",
            metrics: {
                fileName: input.fileName,
                mimeType: input.mimeType ?? "unknown",
                sourceSize: formatBytes(input.fileSizeBytes),
                stepDurationMs: now() - startedAt,
            },
        });
    } catch (error) {
        steps.push({
            id: "validate",
            label: "Validate source",
            status: "failed",
            detail:
                error instanceof Error ? error.message : "Validation failed.",
        });
        failWithSteps(error, steps);
    }

    let apiKey: string;
    try {
        apiKey = readGroqApiKey();
    } catch (error) {
        failWithSteps(error, steps);
    }

    const language = input.language?.trim() || "zh";
    let audioBytes: Uint8Array;
    let audioDurationSeconds: number | undefined;
    try {
        const startedAt = now();
        const audio = await extractSpeechReadyAudio({
            fileName: input.fileName,
            fileBytes: input.fileBytes,
            speedFactor: input.videoSpeedFactor,
        });
        audioBytes = audio.audioBytes;
        audioDurationSeconds = audio.durationSeconds;
        steps.push({
            id: "extract-audio",
            label: "Extract audio",
            status: "success",
            detail: "Extracted compressed speech-ready audio.",
            metrics: {
                format: "mp3",
                sampleRate: 16000,
                channels: 1,
                bitrateKbps: 64,
                audioSizeBytes: audioBytes.byteLength,
                audioSize: formatBytes(audioBytes.byteLength),
                ...(audioDurationSeconds
                    ? { audioDurationSeconds }
                    : {}),
                ...(input.videoSpeedFactor &&
                Math.abs(input.videoSpeedFactor - 1) > 0.0001
                    ? { videoSpeedFactor: input.videoSpeedFactor }
                    : {}),
                stepDurationMs: now() - startedAt,
            },
        });
    } catch (error) {
        steps.push({
            id: "extract-audio",
            label: "Extract audio",
            status: "failed",
            detail:
                error instanceof Error
                    ? error.message
                    : "Audio extraction failed.",
        });
        failWithSteps(error, steps);
    }

    try {
        const startedAt = now();
        validateGroqAudioPayloadSize(audioBytes);
        steps.push({
            id: "check-upload-size",
            label: "Check Groq upload size",
            status: "success",
            detail: "Extracted audio is within Groq upload limit.",
            metrics: {
                audioSizeBytes: audioBytes.byteLength,
                audioSize: formatBytes(audioBytes.byteLength),
                stepDurationMs: now() - startedAt,
            },
        });
    } catch (error) {
        steps.push({
            id: "check-upload-size",
            label: "Check Groq upload size",
            status: "failed",
            detail:
                error instanceof Error
                    ? error.message
                    : "Audio upload is too large.",
            metrics: {
                audioSizeBytes: audioBytes.byteLength,
                audioSize: formatBytes(audioBytes.byteLength),
            },
        });
        failWithSteps(error, steps);
    }

    let transcript;
    try {
        const startedAt = now();
        transcript = await transcribeWithGroq({
            apiKey,
            audioBytes,
            language,
            prompt: input.prompt,
            audioDurationSeconds,
            timestampGranularities: input.includeWordTimestamps
                ? ["segment", "word"]
                : ["segment"],
        });
        const retryResult = await retryOverlongChineseSegments({
            transcript,
            apiKey,
            audioBytes,
            language,
            prompt: input.prompt,
            includeWordTimestamps: input.includeWordTimestamps,
        });
        transcript = retryResult.transcript;
        steps.push({
            id: "groq-transcribe",
            label: "Groq transcription",
            status: "success",
            detail: `Received ${transcript.segments.length} segment(s) and ${transcript.words.length} word(s).`,
            metrics: {
                model: "whisper-large-v3-turbo",
                language: transcript.language,
                segments: transcript.segments.length,
                words: transcript.words.length,
                suspiciousSegmentsRetried:
                    retryResult.suspiciousSegmentCount,
                segmentRetryRequests: retryResult.retryRequestCount,
                ...(audioDurationSeconds
                    ? { audioDurationSeconds }
                    : {}),
                stepDurationMs: now() - startedAt,
            },
        });
    } catch (error) {
        steps.push({
            id: "groq-transcribe",
            label: "Groq transcription",
            status: "failed",
            detail:
                error instanceof Error
                    ? error.message
                    : "Groq transcription failed.",
            metrics: {
                audioSizeBytes: audioBytes.byteLength,
                audioSize: formatBytes(audioBytes.byteLength),
            },
        });
        failWithSteps(error, steps);
    }

    return {
        text: transcript.text,
        language: transcript.language,
        model: "whisper-large-v3-turbo",
        segments: transcript.segments,
        words: transcript.words,
        source: {
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileSizeBytes: input.fileSizeBytes,
        },
        audio: {
            format: "mp3",
            sampleRate: 16000,
            channels: 1,
            bitrateKbps: 64,
            fileSizeBytes: audioBytes.byteLength,
            durationSeconds: audioDurationSeconds,
            audioPreviewBase64: Buffer.from(audioBytes).toString("base64"),
        },
        steps,
        provider: {
            name: "groq",
            requestId: transcript.requestId,
        },
    };
}
