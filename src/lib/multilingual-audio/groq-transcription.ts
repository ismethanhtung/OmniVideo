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

function numberOrZero(value: unknown) {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeGroqTranscription(
    payload: GroqVerboseTranscription,
    fallbackLanguage = "zh",
): NormalizedGroqTranscription {
    return {
        text: payload.text ?? "",
        language: payload.language ?? fallbackLanguage,
        requestId: payload.x_groq?.id,
        segments: (payload.segments ?? []).map((segment, index) => ({
            id: typeof segment.id === "number" ? segment.id : index,
            start: numberOrZero(segment.start),
            end: numberOrZero(segment.end),
            text: segment.text ?? "",
        })),
        words: (payload.words ?? []).map((word) => ({
            word: word.word ?? "",
            start: numberOrZero(word.start),
            end: numberOrZero(word.end),
        })),
    };
}

export async function transcribeWithGroq(input: {
    apiKey: string;
    audioBytes: Uint8Array;
    language: string;
    prompt?: string;
    timestampGranularities: AudioTimestampGranularity[];
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

    const response = await fetcher(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
            },
            body: formData,
        },
    );
    const payload = (await response.json().catch(() => ({}))) as
        | GroqVerboseTranscription
        | { error?: { message?: string } };

    if (!response.ok) {
        const message =
            "error" in payload && payload.error?.message
                ? payload.error.message
                : "Groq transcription request failed.";
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSCRIPTION_FAILED",
            message,
            response.status >= 400 && response.status < 500 ? 422 : 502,
        );
    }

    return normalizeGroqTranscription(
        payload as GroqVerboseTranscription,
        input.language,
    );
}
