import { createHash } from "node:crypto";

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

const DEFAULT_MAX_SEGMENTS_PER_CHUNK = 150;
const DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK = 10000;
const LIMITED_PROVIDER_MAX_SEGMENTS_PER_CHUNK = 150;
const LIMITED_PROVIDER_MAX_SOURCE_CHARS_PER_CHUNK = 10000;
const DEFAULT_TRANSLATION_CHUNK_CONCURRENCY = 4;
const DEFAULT_MAX_QUALITY_RETRIES = 2;
const INVALID_JSON_SNIPPET_MAX_CHARS = 220;
const TRANSLATION_PROMPT_VERSION = "transcript-translation-v3-compact-guide";
const TRANSLATION_GUIDE_SOURCE_MAX_CHARS = 32000;
const TRANSLATION_GUIDE_MAX_CHARS = 3500;
const NEARBY_CONTEXT_SEGMENT_COUNT = 8;

function summarizeError(error: unknown) {
    if (error instanceof ChineseTranscriptionError) {
        return {
            name: error.name,
            code: error.code,
            status: error.status,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 4).join("\n"),
        };
    }
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 4).join("\n"),
        };
    }
    return { message: String(error) };
}

function getUrlHost(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return "invalid-url";
    }
}

function segmentRange(segments: AudioTranscriptSegment[]) {
    const first = segments[0];
    const last = segments[segments.length - 1];
    return {
        firstId: first?.id,
        lastId: last?.id,
        start: first?.start,
        end: last?.end,
    };
}

function logTranslationEvent(event: string, data: Record<string, unknown>) {
    console.log("[TranscriptTranslation]", {
        event,
        ...data,
    });
}

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

function numericMapToSegments(value: Record<string, unknown>) {
    const entries = Object.entries(value);
    if (entries.length === 0) return null;
    const mapped = entries.map(([id, text]) => ({
        id: Number(id),
        text: typeof text === "string" ? text : String(text ?? ""),
    }));
    return mapped.every((item) => Number.isFinite(item.id)) ? mapped : null;
}

function tupleArrayToSegments(value: unknown[]) {
    const mapped = value.map((item) => {
        if (!Array.isArray(item) || item.length < 2) return null;
        const id = Number(item[0]);
        return {
            id,
            text: typeof item[1] === "string" ? item[1] : String(item[1] ?? ""),
        };
    });
    if (mapped.some((item) => item === null || !Number.isFinite(item.id))) {
        return null;
    }
    return mapped as Array<{ id: number; text: string }>;
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

function findFencedJsonBlocks(value: string) {
    return Array.from(
        value.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/giu),
        (match) => match[1]?.trim() ?? "",
    ).filter(Boolean);
}

function normalizeParsedTranslationContent(
    parsed: unknown,
): GroqTranslationPayload | null {
    if (Array.isArray(parsed)) {
        return { segments: parsed as GroqTranslationPayload["segments"] };
    }
    if (!isPlainObject(parsed)) return null;
    if (Array.isArray(parsed.t)) {
        const mapped = tupleArrayToSegments(parsed.t);
        if (mapped) return { segments: mapped };
    }
    if (isPlainObject(parsed.t)) {
        const mapped = numericMapToSegments(parsed.t);
        if (mapped) return { segments: mapped };
    }
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
        const mapped = numericMapToSegments(parsed.translations);
        if (mapped) {
            return {
                segments: mapped,
            };
        }
    }
    const topLevelMap = numericMapToSegments(parsed);
    if (topLevelMap) {
        return {
            segments: topLevelMap,
        };
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
        ...findFencedJsonBlocks(content),
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

function transcriptHash(input: {
    segments: AudioTranscriptSegment[];
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
}) {
    const hash = createHash("sha256");
    hash.update(TRANSLATION_PROMPT_VERSION);
    hash.update("\n");
    hash.update(input.sourceLanguage);
    hash.update(">");
    hash.update(input.targetLanguage);
    hash.update("\n");
    hash.update(input.model);
    for (const segment of input.segments) {
        hash.update(`\n${segment.id}:${segment.text}`);
    }
    return hash.digest("hex").slice(0, 32);
}

function supportsPromptCacheKey(input: {
    baseUrl: string;
    providerName: string;
}) {
    const host = getUrlHost(input.baseUrl);
    return (
        /(^|\.)api\.openai\.com$/iu.test(host) ||
        input.providerName.toLowerCase() === "openai"
    );
}

function formatTranscriptLines(segments: AudioTranscriptSegment[]) {
    return segments
        .map((segment) => `${segment.id}:${segment.text.trim()}`)
        .filter((line) => !line.endsWith(":"))
        .join("\n");
}

function compactTranscriptForGuide(segments: AudioTranscriptSegment[]) {
    const full = formatTranscriptLines(segments);
    if (full.length <= TRANSLATION_GUIDE_SOURCE_MAX_CHARS) return full;

    const headBudget = Math.floor(TRANSLATION_GUIDE_SOURCE_MAX_CHARS * 0.4);
    const middleBudget = Math.floor(TRANSLATION_GUIDE_SOURCE_MAX_CHARS * 0.2);
    const tailBudget =
        TRANSLATION_GUIDE_SOURCE_MAX_CHARS - headBudget - middleBudget;
    const midpoint = Math.floor(segments.length / 2);
    const head = compactLinesFromStart(segments, headBudget);
    const middle = compactLinesAround(segments, midpoint, middleBudget);
    const tail = compactLinesFromEnd(segments, tailBudget);
    return [
        head,
        "[...middle transcript omitted for guide budget...]",
        middle,
        "[...tail transcript follows...]",
        tail,
    ]
        .filter(Boolean)
        .join("\n");
}

function compactLinesFromStart(
    segments: AudioTranscriptSegment[],
    maxChars: number,
) {
    const lines: string[] = [];
    let size = 0;
    for (const segment of segments) {
        const line = `${segment.id}:${segment.text.trim()}`;
        if (size > 0 && size + line.length + 1 > maxChars) break;
        lines.push(line);
        size += line.length + 1;
    }
    return lines.join("\n");
}

function compactLinesFromEnd(
    segments: AudioTranscriptSegment[],
    maxChars: number,
) {
    const lines: string[] = [];
    let size = 0;
    for (let index = segments.length - 1; index >= 0; index -= 1) {
        const line = `${segments[index].id}:${segments[index].text.trim()}`;
        if (size > 0 && size + line.length + 1 > maxChars) break;
        lines.unshift(line);
        size += line.length + 1;
    }
    return lines.join("\n");
}

function compactLinesAround(
    segments: AudioTranscriptSegment[],
    centerIndex: number,
    maxChars: number,
) {
    const lines: string[] = [];
    let size = 0;
    let left = Math.max(0, centerIndex);
    let right = left + 1;
    while ((left >= 0 || right < segments.length) && size < maxChars) {
        const next =
            left >= 0
                ? segments[left--]
                : right < segments.length
                  ? segments[right++]
                  : null;
        if (!next) break;
        const line = `${next.id}:${next.text.trim()}`;
        if (size > 0 && size + line.length + 1 > maxChars) break;
        lines.push(line);
        size += line.length + 1;
    }
    return lines
        .sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]))
        .join("\n");
}

function trimTranslationGuide(value: string) {
    const normalized = value.replace(/\s+/gu, " ").trim();
    if (!normalized) {
        return "No stable guide was available; resolve names and pronouns from nearby context.";
    }
    return normalized.length <= TRANSLATION_GUIDE_MAX_CHARS
        ? normalized
        : `${normalized.slice(0, TRANSLATION_GUIDE_MAX_CHARS)}...`;
}

function parseTranslationGuideContent(content: string) {
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
            return trimTranslationGuide(JSON.stringify(JSON.parse(candidate)));
        } catch {
            // Try the next provider output candidate.
        }
    }

    return trimTranslationGuide(content);
}

function buildNearbyContext(input: {
    allSegments: AudioTranscriptSegment[];
    segments: AudioTranscriptSegment[];
}) {
    if (input.allSegments.length === input.segments.length) {
        return "";
    }
    const first = input.segments[0];
    const last = input.segments[input.segments.length - 1];
    const firstIndex = input.allSegments.findIndex(
        (segment) => segment.id === first?.id,
    );
    const lastIndex = input.allSegments.findIndex(
        (segment) => segment.id === last?.id,
    );
    if (firstIndex < 0 || lastIndex < 0) return "";

    const before = input.allSegments
        .slice(Math.max(0, firstIndex - NEARBY_CONTEXT_SEGMENT_COUNT), firstIndex)
        .map((segment) => ({ id: segment.id, text: segment.text }));
    const after = input.allSegments
        .slice(lastIndex + 1, lastIndex + 1 + NEARBY_CONTEXT_SEGMENT_COUNT)
        .map((segment) => ({ id: segment.id, text: segment.text }));
    if (before.length === 0 && after.length === 0) return "";
    return JSON.stringify({ before, after });
}

function buildTranslationPrompt(input: {
    segments: AudioTranscriptSegment[];
    translationGuide: string;
    nearbyContext: string;
    sourceLanguage: string;
    targetLanguage: string;
    retryMode?: boolean;
}) {
    return [
        `Prompt version: ${TRANSLATION_PROMPT_VERSION}.`,
        "Task: translate only the requested transcript segments into natural Vietnamese for voice-over.",
        "Rules: preserve meaning, names, tone, timeline alignment, and segment IDs. Do not merge, split, reorder, or drop segments.",
        "Use the Translation guide as the main continuity source. Use Nearby context only for pronouns, names, relationships, and tone; do not output nearby context unless its IDs appear in Segments.",
        "Pronouns: resolve Chinese 他/她 from names, titles, actions, and guide. Female cues include 她/师妹/师姐/圣女/姑娘/小姐/女子/女修/仙子/美人/绝美. Male cues include 他/师兄/师弟/公子/少年/男子/男修. If unclear, avoid gendered Vietnamese pronouns.",
        "Vietnamese style: concise spoken language that can fit the source timing. Short source lines need short Vietnamese. Avoid explanations and filler.",
        "TTS normalization: spell standalone numbers as Vietnamese words unless codes/measurements; expand units like 50cm -> 50 xen ti mét, 12kg -> 12 ki lô gam, 5ml -> 5 mi li lít; render wasabi -> wa sa bi, isothiocyanate -> ai sô thio xai a nết, myrosinase -> mai rô si nâyz, enzyme/enzym -> en zim.",
        'Production/channel bumper text like "YoYo Television Series Exclusive" should become a short neutral phrase such as "Phim ngắn."',
        "Every value must be Vietnamese. Do not copy Chinese source text unless it is a proper noun/code.",
        input.retryMode
            ? "Retry mode: fix missing/untranslated/CJK-contaminated values. Translate all non-name Chinese text into Vietnamese."
            : "",
        'Return JSON only. Required compact shape: {"t":{"1700":"Cẩn thận!","1701":"Đây là cấm thuật..."}}.',
        `Source language: ${input.sourceLanguage}. Target language: ${input.targetLanguage}.`,
        "Translation guide:",
        input.translationGuide,
        input.nearbyContext ? "Nearby context:" : "",
        input.nearbyContext,
        "Segments:",
        JSON.stringify(
            input.segments.map((segment) => ({
                id: segment.id,
                text: segment.text,
            })),
        ),
    ].join("\n");
}

async function fetchTranslationProvider(input: {
    fetcher: typeof fetch;
    url: string;
    init: RequestInit;
    context: Record<string, unknown>;
}) {
    const startedAt = Date.now();
    try {
        const response = await input.fetcher(input.url, input.init);
        logTranslationEvent("provider-response", {
            ...input.context,
            status: response.status,
            ok: response.ok,
            durationMs: Date.now() - startedAt,
        });
        return response;
    } catch (error) {
        logTranslationEvent("provider-fetch-failed", {
            ...input.context,
            durationMs: Date.now() - startedAt,
            error: summarizeError(error),
        });
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSLATION_FAILED",
            error instanceof Error
                ? `Translation provider network request failed: ${error.message}`
                : "Translation provider network request failed.",
            502,
        );
    }
}

async function requestTranslationGuide(input: {
    segments: AudioTranscriptSegment[];
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    promptCacheKey?: string;
}) {
    const url = `${input.baseUrl}/chat/completions`;
    const guideSource = compactTranscriptForGuide(input.segments);
    const bodyPayload: Record<string, unknown> = {
        model: input.model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content:
                    "You create compact translation guides for audiovisual transcript translation. Return JSON only.",
            },
            {
                role: "user",
                content: [
                    `Prompt version: ${TRANSLATION_PROMPT_VERSION}.`,
                    `Source language: ${input.sourceLanguage}. Target language: ${input.targetLanguage}.`,
                    "Analyze this transcript once. Return a compact JSON guide under 1200 words with keys:",
                    '{"characters":{"sourceName":{"gender":"male|female|unknown","viRef":"...","notes":"..."}},"terms":{"sourceTerm":"Vietnamese rendering"},"style":"...","warnings":["..."]}',
                    "Focus on names, gender/pronoun continuity, titles/sects/skills, repeated terms, and tone. Do not translate the full transcript.",
                    "Transcript:",
                    guideSource,
                ].join("\n"),
            },
        ],
    };
    if (input.promptCacheKey) {
        bodyPayload.prompt_cache_key = input.promptCacheKey;
    }
    const requestBody = JSON.stringify(bodyPayload);
    const requestContext = {
        mode: "guide-json",
        providerHost: getUrlHost(url),
        model: input.model,
        segmentCount: input.segments.length,
        requestBytes: Buffer.byteLength(requestBody),
        guideSourceChars: guideSource.length,
        promptCacheKeyEnabled: Boolean(input.promptCacheKey),
    };
    logTranslationEvent("guide-request", requestContext);

    const response = await fetchTranslationProvider({
        fetcher: input.fetcher,
        url,
        context: requestContext,
        init: {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
                "Content-Type": "application/json",
            },
            body: requestBody,
        },
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
            prompt_tokens_details?: { cached_tokens?: number };
        };
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const guide = parseTranslationGuideContent(content);
    logTranslationEvent("guide-body-read", {
        ...requestContext,
        status: response.status,
        requestId: payload.id,
        responseBytes: Buffer.byteLength(rawResponseBody),
        responsePreview: rawResponseBody.slice(0, 500),
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        cachedPromptTokens: payload.usage?.prompt_tokens_details?.cached_tokens,
        guideChars: guide.length,
    });

    if (!response.ok) {
        throw new ChineseTranscriptionError(
            "PRV_GROQ_TRANSLATION_FAILED",
            payload.error?.message ?? "Translation guide request failed.",
            response.status >= 400 && response.status < 500 ? 422 : 502,
        );
    }

    return {
        requestId: payload.id,
        totalTokens: payload.usage?.total_tokens ?? 0,
        cachedPromptTokens:
            payload.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        guide,
    };
}

async function requestTranslationChunk(input: {
    segments: AudioTranscriptSegment[];
    allSegments: AudioTranscriptSegment[];
    translationGuide: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    retryMode?: boolean;
    chunkLabel?: string;
    promptCacheKey?: string;
    fullTranscriptChars: number;
}) {
    const url = `${input.baseUrl}/chat/completions`;
    const nearbyContext = buildNearbyContext({
        allSegments: input.allSegments,
        segments: input.segments,
    });
    const bodyPayload: Record<string, unknown> = {
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
                    translationGuide: input.translationGuide,
                    nearbyContext,
                    sourceLanguage: input.sourceLanguage,
                    targetLanguage: input.targetLanguage,
                    retryMode: input.retryMode,
                }),
            },
        ],
    };
    if (input.promptCacheKey) {
        bodyPayload.prompt_cache_key = input.promptCacheKey;
    }
    const requestBody = JSON.stringify(bodyPayload);

    const requestContext = {
        mode: "chunk-json",
        providerHost: getUrlHost(url),
        model: input.model,
        chunkLabel: input.chunkLabel ?? "chunk",
        retryMode: input.retryMode ?? false,
        segmentCount: input.segments.length,
        ...segmentRange(input.segments),
        requestBytes: Buffer.byteLength(requestBody),
        fullTranscriptChars: input.fullTranscriptChars,
        translationGuideChars: input.translationGuide.length,
        nearbyContextChars: nearbyContext.length,
        promptCacheKeyEnabled: Boolean(input.promptCacheKey),
    };
    logTranslationEvent("provider-request", requestContext);

    const response = await fetchTranslationProvider({
        fetcher: input.fetcher,
        url,
        context: requestContext,
        init: {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
                "Content-Type": "application/json",
            },
            body: requestBody,
        },
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
            prompt_tokens_details?: { cached_tokens?: number };
        };
    };

    logTranslationEvent("provider-body-read", {
        ...requestContext,
        status: response.status,
        requestId: payload.id,
        responseBytes: Buffer.byteLength(rawResponseBody),
        responsePreview: rawResponseBody.slice(0, 500),
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        cachedPromptTokens: payload.usage?.prompt_tokens_details?.cached_tokens,
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
        cachedPromptTokens:
            payload.usage?.prompt_tokens_details?.cached_tokens ?? 0,
        segments: normalizeTranslationPayload(parsed, input.segments),
    };
}

async function requestSingleSegmentPlainTextFallback(input: {
    segment: AudioTranscriptSegment;
    allSegments: AudioTranscriptSegment[];
    translationGuide: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    promptCacheKey?: string;
    fullTranscriptChars: number;
}) {
    const url = `${input.baseUrl}/chat/completions`;
    const nearbyContext = buildNearbyContext({
        allSegments: input.allSegments,
        segments: [input.segment],
    });
    const bodyPayload: Record<string, unknown> = {
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
                    "Translation guide:",
                    input.translationGuide,
                    nearbyContext ? "Nearby context:" : "",
                    nearbyContext,
                    "Translate this one transcript segment into concise natural Vietnamese for TTS.",
                    `Source text: ${input.segment.text}`,
                ].join("\n"),
            },
        ],
    };
    if (input.promptCacheKey) {
        bodyPayload.prompt_cache_key = input.promptCacheKey;
    }
    const requestBody = JSON.stringify(bodyPayload);
    const requestContext = {
        mode: "single-fallback",
        providerHost: getUrlHost(url),
        model: input.model,
        segmentId: input.segment.id,
        start: input.segment.start,
        end: input.segment.end,
        requestBytes: Buffer.byteLength(requestBody),
        fullTranscriptChars: input.fullTranscriptChars,
        translationGuideChars: input.translationGuide.length,
        nearbyContextChars: nearbyContext.length,
        promptCacheKeyEnabled: Boolean(input.promptCacheKey),
    };
    logTranslationEvent("provider-request", requestContext);

    const response = await fetchTranslationProvider({
        fetcher: input.fetcher,
        url,
        context: requestContext,
        init: {
            method: "POST",
            headers: {
                Authorization: `Bearer ${input.apiKey}`,
                "Content-Type": "application/json",
            },
            body: requestBody,
        },
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
            prompt_tokens_details?: { cached_tokens?: number };
        };
    };

    logTranslationEvent("provider-body-read", {
        ...requestContext,
        status: response.status,
        requestId: payload.id,
        responseBytes: Buffer.byteLength(rawResponseBody),
        responsePreview: rawResponseBody.slice(0, 500),
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        cachedPromptTokens: payload.usage?.prompt_tokens_details?.cached_tokens,
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
        cachedPromptTokens:
            payload.usage?.prompt_tokens_details?.cached_tokens ?? 0,
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
    allSegments: AudioTranscriptSegment[];
    translationGuide: string;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    apiKey: string;
    baseUrl: string;
    fetcher: typeof fetch;
    retryMode?: boolean;
    qualityRetryDepth?: number;
    plainTextFallbackTried?: boolean;
    chunkLabel?: string;
    promptCacheKey?: string;
    fullTranscriptChars: number;
}): Promise<{
    requestIds: string[];
    totalTokens: number;
    cachedPromptTokens: number;
    segments: TranscriptTranslationSegment[];
    chunkCount: number;
}> {
    try {
        logTranslationEvent("chunk-start", {
            chunkLabel: input.chunkLabel ?? "chunk",
            retryMode: input.retryMode ?? false,
            qualityRetryDepth: input.qualityRetryDepth ?? 0,
            segmentCount: input.segments.length,
            ...segmentRange(input.segments),
        });
        const result = await requestTranslationChunk(input);
        const unresolved = result.segments.filter(needsTranslationRetry);
        logTranslationEvent("chunk-response-normalized", {
            chunkLabel: input.chunkLabel ?? "chunk",
            segmentCount: input.segments.length,
            translatedCount: result.segments.length,
            unresolvedCount: unresolved.length,
            requestId: result.requestId,
            totalTokens: result.totalTokens,
            cachedPromptTokens: result.cachedPromptTokens,
        });

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
                chunkLabel: `${input.chunkLabel ?? "chunk"}.quality-retry`,
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
                cachedPromptTokens:
                    result.cachedPromptTokens + retry.cachedPromptTokens,
                segments: result.segments.map(
                    (segment) => retryById.get(segment.id) ?? segment,
                ),
                chunkCount: 1 + retry.chunkCount,
            };
        }

        return {
            requestIds: result.requestId ? [result.requestId] : [],
            totalTokens: result.totalTokens,
            cachedPromptTokens: result.cachedPromptTokens,
            segments: result.segments,
            chunkCount: 1,
        };
    } catch (error) {
        if (
            (isRequestTooLargeError(error) || isInvalidJsonError(error)) &&
            input.segments.length > 1
        ) {
            logTranslationEvent("chunk-split-retry", {
                chunkLabel: input.chunkLabel ?? "chunk",
                segmentCount: input.segments.length,
                reason: summarizeError(error),
            });
            const midpoint = Math.ceil(input.segments.length / 2);
            const [left, right] = await Promise.all([
                translateChunkAdaptive({
                    ...input,
                    segments: input.segments.slice(0, midpoint),
                    chunkLabel: `${input.chunkLabel ?? "chunk"}.left`,
                }),
                translateChunkAdaptive({
                    ...input,
                    segments: input.segments.slice(midpoint),
                    chunkLabel: `${input.chunkLabel ?? "chunk"}.right`,
                }),
            ]);
            return {
                requestIds: [...left.requestIds, ...right.requestIds],
                totalTokens: left.totalTokens + right.totalTokens,
                cachedPromptTokens:
                    left.cachedPromptTokens + right.cachedPromptTokens,
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
                chunkLabel: `${input.chunkLabel ?? "chunk"}.json-retry`,
            });
        }
        if (
            isInvalidJsonError(error) &&
            input.segments.length === 1 &&
            !input.plainTextFallbackTried
        ) {
            logTranslationEvent("single-fallback-start", {
                chunkLabel: input.chunkLabel ?? "chunk",
                segmentId: input.segments[0].id,
                reason: summarizeError(error),
            });
            const fallback = await requestSingleSegmentPlainTextFallback({
                segment: input.segments[0],
                allSegments: input.allSegments,
                translationGuide: input.translationGuide,
                sourceLanguage: input.sourceLanguage,
                targetLanguage: input.targetLanguage,
                model: input.model,
                apiKey: input.apiKey,
                baseUrl: input.baseUrl,
                fetcher: input.fetcher,
                promptCacheKey: input.promptCacheKey,
                fullTranscriptChars: input.fullTranscriptChars,
            });
            return {
                requestIds: fallback.requestId ? [fallback.requestId] : [],
                totalTokens: fallback.totalTokens,
                cachedPromptTokens: fallback.cachedPromptTokens,
                segments: [fallback.segment],
                chunkCount: 1,
            };
        }
        logTranslationEvent("chunk-failed", {
            chunkLabel: input.chunkLabel ?? "chunk",
            segmentCount: input.segments.length,
            ...segmentRange(input.segments),
            error: summarizeError(error),
        });
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
}): Promise<
    TranscriptTranslationResult & {
        totalTokensUsed: number;
        totalCachedPromptTokens: number;
    }
> {
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
    const promptCacheKey = supportsPromptCacheKey({ baseUrl, providerName })
        ? `ov-translation-${transcriptHash({
              segments: input.segments,
              sourceLanguage,
              targetLanguage,
              model,
          })}`
        : undefined;
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
    logTranslationEvent("run-start", {
        providerName,
        providerHost: getUrlHost(baseUrl),
        model,
        sourceLanguage,
        targetLanguage,
        segmentCount: input.segments.length,
        chunkCount: chunks.length,
        concurrency: DEFAULT_TRANSLATION_CHUNK_CONCURRENCY,
        fullTranscriptChars: fullTranscriptContext.length,
        promptVersion: TRANSLATION_PROMPT_VERSION,
        promptCacheKeyEnabled: Boolean(promptCacheKey),
        maxSegmentsPerChunk: isGroqCompatibleDefault
            ? DEFAULT_MAX_SEGMENTS_PER_CHUNK
            : LIMITED_PROVIDER_MAX_SEGMENTS_PER_CHUNK,
        maxCharsPerChunk: isGroqCompatibleDefault
            ? DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK
            : LIMITED_PROVIDER_MAX_SOURCE_CHARS_PER_CHUNK,
    });
    let translationGuide =
        "No separate guide was needed; resolve continuity from the requested segments and nearby context.";
    let guideRequestId: string | undefined;
    let guideTokensUsed = 0;
    let guideCachedPromptTokens = 0;
    if (chunks.length > 1) {
        try {
            const guideResult = await requestTranslationGuide({
                segments: input.segments,
                sourceLanguage,
                targetLanguage,
                model,
                apiKey,
                baseUrl,
                fetcher,
                promptCacheKey,
            });
            translationGuide = guideResult.guide;
            guideRequestId = guideResult.requestId;
            guideTokensUsed = guideResult.totalTokens;
            guideCachedPromptTokens = guideResult.cachedPromptTokens;
            logTranslationEvent("guide-success", {
                providerName,
                providerHost: getUrlHost(baseUrl),
                model,
                requestId: guideRequestId,
                guideChars: translationGuide.length,
                totalTokens: guideTokensUsed,
                cachedPromptTokens: guideCachedPromptTokens,
            });
        } catch (error) {
            logTranslationEvent("guide-fallback", {
                providerName,
                providerHost: getUrlHost(baseUrl),
                model,
                error: summarizeError(error),
            });
            translationGuide =
                "Guide preflight failed. Translate with local chunk context; keep names/pronouns consistent when evidence is available.";
        }
    }
    const translatedChunks = await mapWithConcurrency(
        chunks,
        DEFAULT_TRANSLATION_CHUNK_CONCURRENCY,
        (chunk, index) =>
            translateChunkAdaptive({
                segments: chunk,
                allSegments: input.segments,
                translationGuide,
                sourceLanguage,
                targetLanguage,
                model,
                apiKey,
                baseUrl,
                fetcher,
                chunkLabel: `${index + 1}/${chunks.length}`,
                promptCacheKey,
                fullTranscriptChars: fullTranscriptContext.length,
            }),
    );
    const requestIds = [
        ...(guideRequestId ? [guideRequestId] : []),
        ...translatedChunks.flatMap((chunk) => chunk.requestIds),
    ];
    const totalTokensUsed =
        guideTokensUsed +
        translatedChunks.reduce(
            (sum, chunk) => sum + chunk.totalTokens,
            0,
        );
    const totalCachedPromptTokens =
        guideCachedPromptTokens +
        translatedChunks.reduce(
            (sum, chunk) => sum + chunk.cachedPromptTokens,
            0,
        );
    logTranslationEvent("run-success", {
        providerName,
        providerHost: getUrlHost(baseUrl),
        model,
        segmentCount: input.segments.length,
        translatedCount: translatedChunks.reduce(
            (sum, chunk) => sum + chunk.segments.length,
            0,
        ),
        chunkCount: chunks.length,
        actualRequestCount: translatedChunks.reduce(
            (sum, chunk) => sum + chunk.chunkCount,
            chunks.length > 1 ? 1 : 0,
        ),
        totalTokensUsed,
        totalCachedPromptTokens,
        durationMs: Date.now() - startedAt,
    });

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
        totalCachedPromptTokens,
    };
}
