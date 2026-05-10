import { extractSpeechReadyAudio } from "./audio-extraction";
import { transcribeWithGroq } from "./groq-transcription";
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
    type AudioTranscriptionStep,
} from "./types";

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

export async function runChineseVideoTranscription(
    input: ChineseTranscriptionRequest,
): Promise<ChineseTranscriptionResult> {
    const steps: AudioTranscriptionStep[] = [];
    try {
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
        const audio = await extractSpeechReadyAudio({
            fileName: input.fileName,
            fileBytes: input.fileBytes,
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
        validateGroqAudioPayloadSize(audioBytes);
        steps.push({
            id: "check-upload-size",
            label: "Check Groq upload size",
            status: "success",
            detail: "Extracted audio is within Groq upload limit.",
            metrics: {
                audioSizeBytes: audioBytes.byteLength,
                audioSize: formatBytes(audioBytes.byteLength),
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
                ...(audioDurationSeconds
                    ? { audioDurationSeconds }
                    : {}),
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
