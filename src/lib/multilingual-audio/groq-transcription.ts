import {
    waitForAiProviderRateLimit,
    type AiProviderRateLimit,
} from "@/lib/ai-providers/rate-limit";

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

type GeminiGenerateContentPayload = {
    candidates?: Array<{
        content?: {
            parts?: Array<{
                text?: string;
            }>;
        };
    }>;
    error?: {
        message?: string;
    };
};

export type NormalizedGroqTranscription = {
    text: string;
    language: string;
    segments: AudioTranscriptSegment[];
    words: AudioTranscriptWord[];
    requestId?: string;
};

export const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";
export const DEFAULT_TRANSCRIPTION_BASE_URL =
    "https://api.groq.com/openai/v1";
export const DEFAULT_TRANSCRIPTION_PROVIDER_NAME = "groq";

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

function extractJsonText(value: string) {
    const trimmed = value.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/u);
    if (fenced?.[1]) return fenced[1].trim();
    return trimmed;
}

function extractGeminiText(payload: GeminiGenerateContentPayload) {
    return (payload.candidates ?? [])
        .flatMap((candidate) => candidate.content?.parts ?? [])
        .map((part) => part.text ?? "")
        .join("\n")
        .trim();
}

function normalizeGeminiModelName(model: string) {
    return model.trim().replace(/^models\//u, "");
}

function isGeminiTranscriptionTarget(input: {
    baseUrl?: string;
    model?: string;
    providerName?: string;
}) {
    const baseUrl = input.baseUrl ?? "";
    const model = input.model ?? "";
    const providerName = input.providerName ?? "";
    return (
        /generativelanguage\.googleapis\.com/iu.test(baseUrl) ||
        /\bgemini\b/iu.test(model) ||
        /google ai studio|gemini/iu.test(providerName)
    );
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

async function transcribeWithGemini(input: {
    apiKey: string;
    model: string;
    providerName: string;
    audioBytes: Uint8Array;
    language: string;
    prompt?: string;
    timestampGranularities: AudioTimestampGranularity[];
    audioDurationSeconds?: number;
    rateLimit?: AiProviderRateLimit;
    fetchImpl: typeof fetch;
}) {
    const modelName = normalizeGeminiModelName(input.model);
    const audioBase64 = Buffer.from(input.audioBytes).toString("base64");
    const includeWords = input.timestampGranularities.includes("word");
    const guide = [
        `Transcribe this audio. Language hint: ${input.language}.`,
        "Return only valid JSON. Do not include markdown.",
        "Use seconds as numbers for all timestamps.",
        "Schema:",
        `{"text":"full transcript","language":"${input.language}","segments":[{"id":0,"start":0,"end":1.2,"text":"..."}],"words":[{"word":"...","start":0,"end":0.4}]}`,
        includeWords
            ? "Include word-level timestamps in words when possible."
            : "Return an empty words array unless word timestamps are confidently available.",
        input.audioDurationSeconds
            ? `Audio duration is about ${input.audioDurationSeconds.toFixed(3)} seconds. Do not emit timestamps after this duration.`
            : "",
        input.prompt?.trim() ? `User prompt/context:\n${input.prompt.trim()}` : "",
    ]
        .filter(Boolean)
        .join("\n");

    await waitForAiProviderRateLimit(input.rateLimit);
    const response = await input.fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${encodeURIComponent(input.apiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                inlineData: {
                                    mimeType: "audio/mpeg",
                                    data: audioBase64,
                                },
                            },
                            { text: guide },
                        ],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0,
                },
            }),
        },
    );

    const raw = await response.text();
    const payload = JSON.parse(raw || "{}") as GeminiGenerateContentPayload;
    if (!response.ok) {
        throw new ChineseTranscriptionError(
            "PRV_TRANSCRIPTION_FAILED",
            payload.error?.message ??
                `${input.providerName} transcription request failed.`,
            response.status >= 400 && response.status < 500 ? 422 : 502,
        );
    }

    const text = extractGeminiText(payload);
    if (!text) {
        throw new ChineseTranscriptionError(
            "PRV_TRANSCRIPTION_FAILED",
            `${input.providerName} transcription response did not include text.`,
            502,
        );
    }

    let parsed: GroqVerboseTranscription;
    try {
        parsed = JSON.parse(extractJsonText(text)) as GroqVerboseTranscription;
    } catch {
        throw new ChineseTranscriptionError(
            "PRV_TRANSCRIPTION_FAILED",
            `${input.providerName} transcription response was not valid JSON.`,
            502,
        );
    }

    return normalizeGroqTranscription(parsed, input.language, {
        audioDurationSeconds: input.audioDurationSeconds,
    });
}

export async function transcribeWithGroq(input: {
    apiKey: string;
    baseUrl?: string;
    model?: string;
    providerName?: string;
    audioBytes: Uint8Array;
    language: string;
    prompt?: string;
    timestampGranularities: AudioTimestampGranularity[];
    audioDurationSeconds?: number;
    rateLimit?: AiProviderRateLimit;
    fetchImpl?: typeof fetch;
}) {
    const fetcher = input.fetchImpl ?? fetch;
    const model = input.model?.trim() || DEFAULT_TRANSCRIPTION_MODEL;
    const baseUrl =
        input.baseUrl?.trim().replace(/\/+$/u, "") ||
        DEFAULT_TRANSCRIPTION_BASE_URL;
    const providerName =
        input.providerName?.trim() || DEFAULT_TRANSCRIPTION_PROVIDER_NAME;
    if (isGeminiTranscriptionTarget({ baseUrl, model, providerName })) {
        return transcribeWithGemini({
            apiKey: input.apiKey,
            model,
            providerName,
            audioBytes: input.audioBytes,
            language: input.language,
            prompt: input.prompt,
            timestampGranularities: input.timestampGranularities,
            audioDurationSeconds: input.audioDurationSeconds,
            rateLimit: input.rateLimit,
            fetchImpl: fetcher,
        });
    }
    const formData = new FormData();
    formData.set("model", model);
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
            await waitForAiProviderRateLimit(input.rateLimit);
            response = await fetcher(
                `${baseUrl}/audio/transcriptions`,
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
                        ? `${providerName} transcription network request failed: ${error.message}`
                        : `${providerName} transcription network request failed.`,
                    502,
                );
            }
            const sleepMs = attempt * 1000;
            console.warn(`[${providerName} transcription network error] ${error instanceof Error ? error.message : String(error)}. Retrying in ${sleepMs}ms... (attempt ${attempt}/${maxAttempts})`);
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
                    : `${providerName} transcription request failed.`;

            if (status === 429 && attempt < maxAttempts) {
                let delaySeconds = 3;
                const match = message.match(/try again in (\d+(?:\.\d+)?)s/i);
                if (match && match[1]) {
                    delaySeconds = parseFloat(match[1]);
                }
                const sleepMs = Math.ceil(delaySeconds * 1000) + 500;
                console.warn(`[${providerName} rate limit 429] ${message}. Retrying in ${sleepMs}ms... (attempt ${attempt}/${maxAttempts})`);
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
        `${providerName} transcription request failed after maximum retry attempts.`,
        502,
    );
}
