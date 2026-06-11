import {
    ChineseTranscriptionError,
    type AudioTimestampGranularity,
    type AudioTranscriptSegment,
    type AudioTranscriptWord,
} from "./types";

type GroqVerboseTranscription = {
    text?: string;
    language?: string;
    segments?: Array<{
        id?: number;
        start?: number;
        end?: number;
        text?: string;
    }>;
    words?: Array<{
        word?: string;
        start?: number;
        end?: number;
    }>;
    x_groq?: {
        id?: string;
    };
};

export type NormalizedGroqTranscription = {
    text: string;
    language: string;
    segments: AudioTranscriptSegment[];
    words: AudioTranscriptWord[];
    requestId?: string;
};

type GroqTranscriptionNormalizationOptions = {
    audioDurationSeconds?: number;
};

function numberOrZero(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function boundedDuration(value: number | undefined) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? value
        : undefined;
}

function clampTimestampToDuration(
    value: number,
    audioDurationSeconds: number | undefined,
) {
    const timestamp = numberOrZero(value);
    if (audioDurationSeconds === undefined) return timestamp;
    return Math.min(timestamp, audioDurationSeconds);
}

export function normalizeGroqTranscription(
    payload: GroqVerboseTranscription,
    fallbackLanguage = "zh",
    options: GroqTranscriptionNormalizationOptions = {},
): NormalizedGroqTranscription {
    const audioDurationSeconds = boundedDuration(options.audioDurationSeconds);
    return {
        text: payload.text ?? "",
        language: payload.language ?? fallbackLanguage,
        requestId: payload.x_groq?.id,
        segments: (payload.segments ?? [])
            .map((segment, index) => {
                const start = clampTimestampToDuration(
                    numberOrZero(segment.start),
                    audioDurationSeconds,
                );
                const end = clampTimestampToDuration(
                    numberOrZero(segment.end),
                    audioDurationSeconds,
                );
                return {
                    id: typeof segment.id === "number" ? segment.id : index,
                    start,
                    end: Math.max(start, end),
                    text: segment.text ?? "",
                };
            })
            .filter(
                (segment) =>
                    audioDurationSeconds === undefined ||
                    segment.start < audioDurationSeconds,
            ),
        words: (payload.words ?? [])
            .map((word) => {
                const start = clampTimestampToDuration(
                    numberOrZero(word.start),
                    audioDurationSeconds,
                );
                const end = clampTimestampToDuration(
                    numberOrZero(word.end),
                    audioDurationSeconds,
                );
                return {
                    word: word.word ?? "",
                    start,
                    end: Math.max(start, end),
                };
            })
            .filter(
                (word) =>
                    word.end > word.start &&
                    (audioDurationSeconds === undefined ||
                        word.start < audioDurationSeconds),
            ),
    };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function transcribeWithGroq(input: {
    apiKey: string;
    audioBytes: Uint8Array;
    language: string;
    prompt?: string;
    timestampGranularities: AudioTimestampGranularity[];
    audioDurationSeconds?: number;
    fetchImpl?: typeof fetch;
}) {
    const fetcher = input.fetchImpl ?? fetch;
    const formData = new FormData();
    formData.set("model", "whisper-large-v3-turbo");
    formData.set("language", input.language);
    formData.set("response_format", "verbose_json");
    formData.set("temperature", "0");
    if (input.prompt?.trim()) {
        formData.set("prompt", input.prompt.trim());
    }
    for (const granularity of input.timestampGranularities) {
        formData.append("timestamp_granularities[]", granularity);
    }
    const audioBuffer = input.audioBytes.buffer.slice(
        input.audioBytes.byteOffset,
        input.audioBytes.byteOffset + input.audioBytes.byteLength,
    ) as ArrayBuffer;
    formData.set(
        "file",
        new Blob([audioBuffer], { type: "audio/mpeg" }),
        "speech.mp3",
    );

    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        let response: Response;
        try {
            response = await fetcher(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${input.apiKey}`,
                    },
                    body: formData,
                },
            );
        } catch (error) {
            if (attempt >= maxAttempts) {
                throw new ChineseTranscriptionError(
                    "PRV_GROQ_TRANSCRIPTION_FAILED",
                    error instanceof Error
                        ? `Groq transcription network request failed: ${error.message}`
                        : "Groq transcription network request failed.",
                    502,
                );
            }
            const sleepMs = attempt * 1000;
            console.warn(`[Groq transcription network error] ${error instanceof Error ? error.message : String(error)}. Retrying in ${sleepMs}ms... (attempt ${attempt}/${maxAttempts})`);
            await sleep(sleepMs);
            continue;
        }

        const payload = (await response.json().catch(() => ({}))) as
            | GroqVerboseTranscription
            | { error?: { message?: string } };

        if (!response.ok) {
            const status = response.status;
            const message =
                "error" in payload && payload.error?.message
                    ? payload.error.message
                    : "Groq transcription request failed.";

            if (status === 429 && attempt < maxAttempts) {
                let delaySeconds = 3;
                const match = message.match(/try again in (\d+(?:\.\d+)?)s/i);
                if (match && match[1]) {
                    delaySeconds = parseFloat(match[1]);
                }
                const sleepMs = Math.ceil(delaySeconds * 1000) + 500;
                console.warn(`[Groq rate limit 429] ${message}. Retrying in ${sleepMs}ms... (attempt ${attempt}/${maxAttempts})`);
                await sleep(sleepMs);
                continue;
            }

            throw new ChineseTranscriptionError(
                "PRV_GROQ_TRANSCRIPTION_FAILED",
                message,
                status >= 400 && status < 500 ? 422 : 502,
            );
        }

        return normalizeGroqTranscription(
            payload as GroqVerboseTranscription,
            input.language,
            { audioDurationSeconds: input.audioDurationSeconds },
        );
    }

    throw new ChineseTranscriptionError(
        "PRV_GROQ_TRANSCRIPTION_FAILED",
        "Groq transcription request failed after maximum retry attempts.",
        502,
    );
}
