import {
    ChineseTranscriptionError,
    DEFAULT_TRANSLATION_MODEL,
    type AudioTranscriptSegment,
    type TranscriptTranslationResult,
    type TranscriptTranslationSegment,
} from "./types";
import { readGroqApiKey } from "./validation";

const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";

type GroqTranslationPayload = {
    segments?: Array<{
        id?: number;
        start?: number;
        end?: number;
        sourceText?: string;
        translatedText?: string;
        text?: string;
    }>;
};

type GroqTranslationSegment = NonNullable<
    GroqTranslationPayload["segments"]
>[number];

const DEFAULT_MAX_SEGMENTS_PER_CHUNK = 100;
const DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK = 10000;
const LIMITED_PROVIDER_MAX_SEGMENTS_PER_CHUNK = 100;
const LIMITED_PROVIDER_MAX_SOURCE_CHARS_PER_CHUNK = 10000;
const DEFAULT_TRANSLATION_CHUNK_CONCURRENCY = 4;
const DEFAULT_MAX_QUALITY_RETRIES = 2;
const INVALID_JSON_SNIPPET_MAX_CHARS = 220;

function trimForErrorSnippet(value: string) {
    const normalized = value.replace(/\s+/gu, " ").trim();
    if (!normalized) return "(empty)";
    return normalized.length <= INVALID_JSON_SNIPPET_MAX_CHARS
        ? normalized
        : `${normalized.slice(0, INVALID_JSON_SNIPPET_MAX_CHARS)}...`;
}

function numberOrFallback(value: unknown, fallback: number) {
    return typeof value === "number" && Number.isFinite(value)
        ? value
        : fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findBalancedJsonObject(value: string) {
    const start = value.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < value.length; index += 1) {
        const char = value[index];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (char === "\\") {
            escaped = inString;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (inString) continue;
        if (char === "{") depth += 1;
        if (char === "}") {
            depth -= 1;
            if (depth === 0) return value.slice(start, index + 1);
        }
    }

    return null;
}

function normalizeParsedTranslationContent(
    parsed: unknown,
): GroqTranslationPayload | null {
    if (Array.isArray(parsed)) {
        return { segments: parsed as GroqTranslationPayload["segments"] };
    }
    if (!isPlainObject(parsed)) return null;
    if (Array.isArray(parsed.segments)) {
        return parsed as GroqTranslationPayload;
    }
    if (Array.isArray(parsed.translations)) {
        return {
            segments: parsed.translations as GroqTranslationPayload["segments"],
        };
    }
    if (
        isPlainObject(parsed.translations) &&
        Object.keys(parsed.translations).length > 0
    ) {
        const mapped = Object.entries(parsed.translations).map(
            ([id, text]) => ({
                id: Number(id),
                text: typeof text === "string" ? text : String(text ?? ""),
            }),
        );
        if (mapped.every((item) => Number.isFinite(item.id))) {
            return {
                segments: mapped,
            };
        }
    }
    return null;
}

export function parseTranslationModelContent(
    content: string,
): GroqTranslationPayload {
    const candidates = [
        content.trim(),
        content
            .trim()
            .replace(/^```(?:json)?\s*/iu, "")
            .replace(/\s*```$/u, "")
            .trim(),
    ];
    const balancedObject = findBalancedJsonObject(content);
    if (balancedObject) candidates.push(balancedObject);

    for (const candidate of candidates) {
        if (!candidate) continue;
        try {
            const normalized = normalizeParsedTranslationContent(
                JSON.parse(candidate),
            );
            if (normalized) return normalized;
        } catch {
            // Try the next candidate; providers often wrap JSON in prose.
        }
    }

    throw new ChineseTranscriptionError(
        "PRV_GROQ_TRANSLATION_FAILED",
        `Translation returned invalid JSON. Raw model content: ${trimForErrorSnippet(content)}`,
        502,
    );
}

export function validateTranslationSegments(
    segments: AudioTranscriptSegment[],
) {
    if (!Array.isArray(segments) || segments.length === 0) {
        throw new ChineseTranscriptionError(
            "VAL_TRANSLATION_SEGMENTS_REQUIRED",
            "At least one transcript segment is required for translation.",
            400,
        );
    }
}

export function normalizeTranslationPayload(
    payload: GroqTranslationPayload,
    sourceSegments: AudioTranscriptSegment[],
): TranscriptTranslationSegment[] {
    const translatedById = new Map<number, GroqTranslationSegment>();
    for (const segment of payload.segments ?? []) {
        if (typeof segment.id === "number") {
            translatedById.set(segment.id, segment);
        }
    }

    return sourceSegments.map((sourceSegment) => {
        const translated = translatedById.get(sourceSegment.id);
        const translatedText =
            translated?.translatedText ??
            translated?.text ??
            sourceSegment.text;
        const normalizedTtsText = normalizeVietnameseTtsText(translatedText);
        return {
            id: sourceSegment.id,
            start: numberOrFallback(translated?.start, sourceSegment.start),
            end: numberOrFallback(translated?.end, sourceSegment.end),
            sourceText: translated?.sourceText ?? sourceSegment.text,
            translatedText: normalizeBrandingBumperTranslation({
                sourceText: sourceSegment.text,
                translatedText: normalizedTtsText,
            }),
        };
    });
}

function containsCjk(value: string) {
    return /[\u3400-\u9fff\uf900-\ufaff]/u.test(value);
}

export function normalizeVietnameseTtsText(value: string) {
    return value
        .replace(/\bwasabi\b/giu, "wa sa bi")
        .replace(/\bisothiocyanate\b/giu, "ai sô thio xai a nết")
        .replace(/\bmyrosinase\b/giu, "mai rô si nâyz")
        .replace(/\benzyme\b/giu, "en zim")
        .replace(/\benzym\b/giu, "en zim")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*cm\b/giu, "$1 xen ti mét")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*mm\b/giu, "$1 mi li mét")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*km\b/giu, "$1 ki lô mét")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*kg\b/giu, "$1 ki lô gam")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*ml\b/giu, "$1 mi li lít")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*g\b/giu, "$1 gam")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*m\b/giu, "$1 mét")
        .replace(/\b(\d+(?:[.,]\d+)?)\s*l\b/giu, "$1 lít")
        .replace(/(\d+(?:[.,]\d+)?)\s*%/gu, "$1 phần trăm")
        .replace(/\s{2,}/gu, " ")
        .trim();
}

const BUMPER_KEYWORDS =
    /\b(television|series|exclusive|production|studio|official|trailer|presents?|entertainment)\b/iu;

function normalizeBrandingBumperTranslation(input: {
    sourceText: string;
    translatedText: string;
}) {
    const source = input.sourceText.trim();
    const translated = input.translatedText.trim();
    if (!source) return translated;
    const latinHeavySource = /^[\p{L}\p{N}\s\-:,.!'"&]+$/u.test(source);
    const sourceHasBumperKeyword = BUMPER_KEYWORDS.test(source);
    const translatedHasBumperKeyword = BUMPER_KEYWORDS.test(translated);

    if (
        (latinHeavySource && sourceHasBumperKeyword) ||
        translatedHasBumperKeyword ||
        /yoyo television series exclusive/iu.test(source)
    ) {
        return "Phim ngắn.";
    }
    return translated;
}

function needsTranslationRetry(segment: TranscriptTranslationSegment) {
    const source = segment.sourceText.trim();
    const translated = segment.translatedText.trim();
    if (!translated) return true;
    if (containsCjk(translated)) return true;
    return containsCjk(source) && translated === source;
}

async function mapWithConcurrency<T, U>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<U>,
) {
    const results: U[] = new Array(items.length);
    let nextIndex = 0;
    const workerCount = Math.min(Math.max(1, concurrency), items.length);

    await Promise.all(
        Array.from({ length: workerCount }, async () => {
            while (nextIndex < items.length) {
                const currentIndex = nextIndex;
                nextIndex += 1;
                results[currentIndex] = await mapper(
                    items[currentIndex],
                    currentIndex,
                );
            }
        }),
    );

    return results;
}

function splitSegmentsForTranslation(
    segments: AudioTranscriptSegment[],
    maxSegments = DEFAULT_MAX_SEGMENTS_PER_CHUNK,
    maxChars = DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK,
) {
    const chunks: AudioTranscriptSegment[][] = [];
    let current: AudioTranscriptSegment[] = [];
    let currentChars = 0;

    for (const segment of segments) {
        const nextChars = segment.text.length;
        if (
            current.length > 0 &&
            (current.length >= maxSegments ||
                currentChars + nextChars > maxChars)
        ) {
            chunks.push(current);
            current = [];
            currentChars = 0;
        }
        current.push(segment);
        currentChars += nextChars;
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

function buildTranslationPrompt(input: {
    segments: AudioTranscriptSegment[];
    fullTranscriptContext: string;
    sourceLanguage: string;
    targetLanguage: string;
    retryMode?: boolean;
}) {
    return [
        "Translate the transcript segments into natural Vietnamese while preserving meaning, context, names, and continuity across segments.",
        "Before translating, infer a small cast/gender map from the whole chunk, then apply that map consistently to every segment.",
        "Chinese pronouns are context-sensitive: do not translate 他 mechanically as 'hắn/anh ấy' when the current referent is female. Resolve the referent from the nearest named character, titles, actions, and surrounding segments.",
        "Female cues: 她, 师妹, 师姐, 圣女, 姑娘, 小姐, 女子, 女修, 仙子, 美人, 绝美, 师尊 if the context describes a female master. Use Vietnamese female references such as 'nàng' or 'cô ấy' consistently.",
        "Male cues: 他, 师兄, 师弟, 公子, 少年, 男子, 男修. Use Vietnamese male references such as 'hắn', 'anh ấy', or 'chàng' only when the referent is clearly male.",
        "When a name/title establishes gender in one segment, keep that gender for later pronouns that refer to the same person, even if later Chinese uses 他 ambiguously.",
        "If gender is ambiguous, prefer a neutral Vietnamese wording that avoids gendered pronouns instead of guessing.",
        "Never insert pronouns inside another word; pronouns must remain separate Vietnamese words only when they are actually needed.",
        "Keep each segment aligned to its original timing. Do not merge, split, reorder, or drop segments.",
        "This translation will be synthesized as Vietnamese voice-over. Prefer concise spoken Vietnamese that fits the segment duration at a natural speaking pace.",
        "Do not force Vietnamese to match the source character count exactly; Chinese and Vietnamese have different written length and spoken duration. Use source length only as a compression signal: short Chinese segments need short Vietnamese, long Chinese segments can use fuller wording if timing allows.",
        "For very short segments, use the shortest natural equivalent. Avoid explanatory additions, filler words, and verbose literal phrasing that would force the TTS to speak too fast.",
        "If a literal translation is too long for the duration, compress the wording while preserving the core meaning and tone.",
        "Normalize standalone Arabic numerals into spoken Vietnamese words in translatedText (example: 20 -> hai mươi, 125 -> một trăm hai mươi lăm). Keep numbers as digits only for codes/IDs/measurements where spelling out is unnatural.",
        "Make translatedText friendly for Vietnamese TTS pronunciation. Spell foreign food/brand-like terms phonetically when they are likely to be misread (example: wasabi -> wa sa bi). Expand compact measurement abbreviations into spoken Vietnamese units while preserving the number when useful (examples: 50cm -> 50 xen ti mét, 12kg -> 12 ki lô gam, 5ml -> 5 mi li lít).",
        "For scientific/biochemical terms that sound unnatural if read as raw English, use a Vietnamese phonetic rendering (examples: isothiocyanate -> ai sô thio xai a nết, myrosinase -> mai rô si nâyz, enzyme/enzym -> en zim).",
        'If a segment is only a production/channel bumper (example: "YoYo Television Series Exclusive"), rewrite it to a short neutral phrase like "Phim ngắn." instead of literal branding copy.',
        "Every translatedText must be in the target language. Do not copy the source text unless it is a proper noun, code, or number.",
        input.retryMode
            ? "This is a retry for segments that were missing or left untranslated. Be extra strict: translate all non-name Chinese text into Vietnamese."
            : "",
        'Return JSON only. Do not wrap it in markdown. Do not add explanations before or after JSON. The first character must be "{" and the last character must be "}".',
        'Required shape: {"translations":[{"id":0,"text":"..."}]}. You may use key "translatedText" instead of "text".',
        `Source language: ${input.sourceLanguage}. Target language: ${input.targetLanguage}.`,
        "Full source transcript context (read-only):",
        "Use this only to resolve continuity, names, referents, relationships, and tone across the entire transcript. Do not translate or output this whole context. Return translations only for the requested Segments below.",
        input.fullTranscriptContext,
        "Segments:",
        JSON.stringify(
            input.segments.map((segment) => ({
                id: segment.id,
                text: segment.text,
            })),
        ),
    ].join("\n");
}

async function requestTranslationChunk(input: {
    segments: AudioTranscriptSegment[];
    fullTranscriptContext: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    retryMode?: boolean;
}) {
    const url = `${input.baseUrl}/chat/completions`;
    const requestBody = JSON.stringify({
        model: input.model,
        temperature: input.retryMode ? 0.1 : 0.2,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content:
                    "You are a senior audiovisual translator. Preserve timestamps exactly and output valid JSON only.",
            },
            {
                role: "user",
                content: buildTranslationPrompt({
                    segments: input.segments,
                    fullTranscriptContext: input.fullTranscriptContext,
                    sourceLanguage: input.sourceLanguage,
                    targetLanguage: input.targetLanguage,
                    retryMode: input.retryMode,
                }),
            },
        ],
    });

    console.log("[AudioTranscript Translation] provider request", {
        mode: "chunk-json",
        url,
        segmentIds: input.segments.map((segment) => segment.id),
        retryMode: input.retryMode ?? false,
        body: requestBody,
    });

    const response = await input.fetcher(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json",
        },
        body: requestBody,
    });

    const rawResponseBody = await response.text();
    const payload = (() => {
        try {
            return JSON.parse(rawResponseBody || "{}");
        } catch {
            return {};
        }
    })() as {
        id?: string;
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
        };
    };

    console.log("[AudioTranscript Translation] provider response", {
        mode: "chunk-json",
        url,
        segmentIds: input.segments.map((segment) => segment.id),
        retryMode: input.retryMode ?? false,
        status: response.status,
        requestId: payload.id,
        body: rawResponseBody,
    });

    if (!response.ok) {
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSLATION_FAILED",
            payload.error?.message ?? "Translation request failed.",
            response.status >= 400 && response.status < 500 ? 422 : 502,
        );
    }

    const content = payload.choices?.[0]?.message?.content ?? "";
    const parsed = parseTranslationModelContent(content);

    return {
        requestId: payload.id,
        totalTokens: payload.usage?.total_tokens ?? 0,
        segments: normalizeTranslationPayload(parsed, input.segments),
    };
}

async function requestSingleSegmentPlainTextFallback(input: {
    segment: AudioTranscriptSegment;
    fullTranscriptContext: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
}) {
    const url = `${input.baseUrl}/chat/completions`;
    const requestBody = JSON.stringify({
        model: input.model,
        temperature: 0.15,
        messages: [
            {
                role: "system",
                content:
                    "You are a translator. Return only Vietnamese translated text with no explanations or markdown. Keep gender pronouns consistent with Chinese context cues.",
            },
            {
                role: "user",
                content: [
                    `Source language: ${input.sourceLanguage}. Target language: ${input.targetLanguage}.`,
                    "Full source transcript context (read-only):",
                    "Use this only to resolve continuity, names, referents, relationships, and tone. Return only the translation for the single target segment below.",
                    input.fullTranscriptContext,
                    "Translate this one transcript segment into concise natural Vietnamese for TTS.",
                    `Source text: ${input.segment.text}`,
                ].join("\n"),
            },
        ],
    });
    console.log("[AudioTranscript Translation] provider request", {
        mode: "single-fallback",
        url,
        segmentIds: [input.segment.id],
        body: requestBody,
    });

    const response = await input.fetcher(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.apiKey}`,
            "Content-Type": "application/json",
        },
        body: requestBody,
    });

    const rawResponseBody = await response.text();
    const payload = (() => {
        try {
            return JSON.parse(rawResponseBody || "{}");
        } catch {
            return {};
        }
    })() as {
        id?: string;
        error?: { message?: string };
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { total_tokens?: number };
    };

    console.log("[AudioTranscript Translation] provider response", {
        mode: "single-fallback",
        url,
        segmentIds: [input.segment.id],
        status: response.status,
        requestId: payload.id,
        body: rawResponseBody,
    });
    if (!response.ok) {
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSLATION_FAILED",
            payload.error?.message ?? "Translation request failed.",
            response.status >= 400 && response.status < 500 ? 422 : 502,
        );
    }
    const rawText = payload.choices?.[0]?.message?.content?.trim() ?? "";
    if (!rawText) {
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSLATION_FAILED",
            "Fallback translation returned empty text.",
            502,
        );
    }

    const translatedText = normalizeBrandingBumperTranslation({
        sourceText: input.segment.text,
        translatedText: normalizeVietnameseTtsText(rawText),
    });
    return {
        requestId: payload.id,
        totalTokens: payload.usage?.total_tokens ?? 0,
        segment: {
            id: input.segment.id,
            start: input.segment.start,
            end: input.segment.end,
            sourceText: input.segment.text,
            translatedText,
        } satisfies TranscriptTranslationSegment,
    };
}

function isRequestTooLargeError(error: unknown) {
    return (
        error instanceof ChineseTranscriptionError &&
        /request too large|tokens per minute|TPM|reduce your message size/i.test(
            error.message,
        )
    );
}

function isInvalidJsonError(error: unknown) {
    return (
        error instanceof ChineseTranscriptionError &&
        error.code === "PRV_GROQ_TRANSLATION_FAILED" &&
        /invalid JSON/i.test(error.message)
    );
}

async function translateChunkAdaptive(input: {
    segments: AudioTranscriptSegment[];
    fullTranscriptContext: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    retryMode?: boolean;
    qualityRetryDepth?: number;
    plainTextFallbackTried?: boolean;
}): Promise<{
    requestIds: string[];
    totalTokens: number;
    segments: TranscriptTranslationSegment[];
    chunkCount: number;
}> {
    try {
        const result = await requestTranslationChunk(input);
        const unresolved = result.segments.filter(needsTranslationRetry);

        if (
            unresolved.length > 0 &&
            (input.qualityRetryDepth ?? 0) < DEFAULT_MAX_QUALITY_RETRIES
        ) {
            const unresolvedIds = new Set(
                unresolved.map((segment) => segment.id),
            );
            const unresolvedSource = input.segments.filter((segment) =>
                unresolvedIds.has(segment.id),
            );
            const retry = await translateChunkAdaptive({
                ...input,
                segments: unresolvedSource,
                retryMode: true,
                qualityRetryDepth: (input.qualityRetryDepth ?? 0) + 1,
            });
            const retryById = new Map(
                retry.segments.map((segment) => [segment.id, segment]),
            );
            return {
                requestIds: [
                    ...(result.requestId ? [result.requestId] : []),
                    ...retry.requestIds,
                ],
                totalTokens: result.totalTokens + retry.totalTokens,
                segments: result.segments.map(
                    (segment) => retryById.get(segment.id) ?? segment,
                ),
                chunkCount: 1 + retry.chunkCount,
            };
        }

        return {
            requestIds: result.requestId ? [result.requestId] : [],
            totalTokens: result.totalTokens,
            segments: result.segments,
            chunkCount: 1,
        };
    } catch (error) {
        if (
            (isRequestTooLargeError(error) || isInvalidJsonError(error)) &&
            input.segments.length > 1
        ) {
            const midpoint = Math.ceil(input.segments.length / 2);
            const [left, right] = await Promise.all([
                translateChunkAdaptive({
                    ...input,
                    segments: input.segments.slice(0, midpoint),
                }),
                translateChunkAdaptive({
                    ...input,
                    segments: input.segments.slice(midpoint),
                }),
            ]);
            return {
                requestIds: [...left.requestIds, ...right.requestIds],
                totalTokens: left.totalTokens + right.totalTokens,
                segments: [...left.segments, ...right.segments],
                chunkCount: left.chunkCount + right.chunkCount,
            };
        }
        if (
            isInvalidJsonError(error) &&
            input.segments.length === 1 &&
            !input.retryMode &&
            (input.qualityRetryDepth ?? 0) < DEFAULT_MAX_QUALITY_RETRIES
        ) {
            return translateChunkAdaptive({
                ...input,
                retryMode: true,
                qualityRetryDepth: (input.qualityRetryDepth ?? 0) + 1,
            });
        }
        if (
            isInvalidJsonError(error) &&
            input.segments.length === 1 &&
            !input.plainTextFallbackTried
        ) {
            const fallback = await requestSingleSegmentPlainTextFallback({
                segment: input.segments[0],
                fullTranscriptContext: input.fullTranscriptContext,
                sourceLanguage: input.sourceLanguage,
                targetLanguage: input.targetLanguage,
                model: input.model,
                apiKey: input.apiKey,
                baseUrl: input.baseUrl,
                fetcher: input.fetcher,
            });
            return {
                requestIds: fallback.requestId ? [fallback.requestId] : [],
                totalTokens: fallback.totalTokens,
                segments: [fallback.segment],
                chunkCount: 1,
            };
        }
        throw error;
    }
}

export async function translateTranscriptSegments(input: {
    segments: AudioTranscriptSegment[];
    sourceLanguage?: string;
    targetLanguage?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    providerName?: string;
    fetchImpl?: typeof fetch;
}): Promise<TranscriptTranslationResult & { totalTokensUsed: number }> {
    const startedAt = Date.now();
    validateTranslationSegments(input.segments);

    const apiKey = input.apiKey ?? readGroqApiKey();
    const baseUrl = input.baseUrl?.trim() || DEFAULT_GROQ_BASE_URL;
    const model = input.model?.trim() || DEFAULT_TRANSLATION_MODEL;
    const providerName = input.providerName?.trim() || "groq";
    const sourceLanguage = input.sourceLanguage?.trim() || "zh";
    const targetLanguage = input.targetLanguage?.trim() || "vi";
    const fetcher = input.fetchImpl ?? fetch;
    const fullTranscriptContext = input.segments
        .map((segment) => segment.text.trim())
        .filter(Boolean)
        .join("");
    const isGroqCompatibleDefault = /api\.groq\.com/i.test(baseUrl);
    const chunks = splitSegmentsForTranslation(
        input.segments,
        isGroqCompatibleDefault
            ? DEFAULT_MAX_SEGMENTS_PER_CHUNK
            : LIMITED_PROVIDER_MAX_SEGMENTS_PER_CHUNK,
        isGroqCompatibleDefault
            ? DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK
            : LIMITED_PROVIDER_MAX_SOURCE_CHARS_PER_CHUNK,
    );
    const translatedChunks = await mapWithConcurrency(
        chunks,
        DEFAULT_TRANSLATION_CHUNK_CONCURRENCY,
        (chunk) =>
            translateChunkAdaptive({
                segments: chunk,
                fullTranscriptContext,
                sourceLanguage,
                targetLanguage,
                model,
                apiKey,
                baseUrl,
                fetcher,
            }),
    );
    const requestIds = translatedChunks.flatMap((chunk) => chunk.requestIds);
    const totalTokensUsed = translatedChunks.reduce(
        (sum, chunk) => sum + chunk.totalTokens,
        0,
    );

    return {
        sourceLanguage,
        targetLanguage,
        model,
        translatedSegments: translatedChunks.flatMap((chunk) => chunk.segments),
        generationDurationMs: Date.now() - startedAt,
        chunks: translatedChunks.map((chunk, index) => ({
            index: index + 1,
            segmentCount: chunk.segments.length,
        })),
        provider: {
            name: providerName,
            requestId: requestIds.join(",") || undefined,
        },
        totalTokensUsed,
    };
}
