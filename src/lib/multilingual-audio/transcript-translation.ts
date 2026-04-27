import {
  ChineseTranscriptionError,
  DEFAULT_TRANSLATION_MODEL,
  type AudioTranscriptSegment,
  type TranscriptTranslationResult,
  type TranscriptTranslationSegment,
} from "./types";
import { readGroqApiKey } from "./validation";

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

type GroqTranslationSegment = NonNullable<GroqTranslationPayload["segments"]>[number];

const DEFAULT_MAX_SEGMENTS_PER_CHUNK = 40;
const DEFAULT_MAX_SOURCE_CHARS_PER_CHUNK = 2200;

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function validateTranslationSegments(segments: AudioTranscriptSegment[]) {
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
    return {
      id: sourceSegment.id,
      start: numberOrFallback(translated?.start, sourceSegment.start),
      end: numberOrFallback(translated?.end, sourceSegment.end),
      sourceText: translated?.sourceText ?? sourceSegment.text,
      translatedText:
        translated?.translatedText ?? translated?.text ?? sourceSegment.text,
    };
  });
}

function containsCjk(value: string) {
  return /[\u3400-\u9fff]/u.test(value);
}

function needsTranslationRetry(segment: TranscriptTranslationSegment) {
  const source = segment.sourceText.trim();
  const translated = segment.translatedText.trim();
  if (!translated) return true;
  return containsCjk(source) && translated === source;
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
      (current.length >= maxSegments || currentChars + nextChars > maxChars)
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
  sourceLanguage: string;
  targetLanguage: string;
  retryMode?: boolean;
}) {
  return [
    "Translate the transcript segments into natural Vietnamese while preserving meaning, context, names, and continuity across segments.",
    "Keep each segment aligned to its original timing. Do not merge, split, reorder, or drop segments.",
    "Every translatedText must be in the target language. Do not copy the source text unless it is a proper noun, code, or number.",
    input.retryMode
      ? "This is a retry for segments that were missing or left untranslated. Be extra strict: translate all non-name Chinese text into Vietnamese."
      : "",
    "Return JSON only with this shape: {\"segments\":[{\"id\":0,\"start\":0,\"end\":1.23,\"sourceText\":\"...\",\"translatedText\":\"...\"}]}",
    `Source language: ${input.sourceLanguage}. Target language: ${input.targetLanguage}.`,
    "Segments:",
    JSON.stringify(
      input.segments.map((segment) => ({
        id: segment.id,
        start: segment.start,
        end: segment.end,
        text: segment.text,
      })),
    ),
  ].join("\n");
}

async function requestTranslationChunk(input: {
  segments: AudioTranscriptSegment[];
  sourceLanguage: string;
  targetLanguage: string;
  model: string;
  apiKey: string;
  fetcher: typeof fetch;
  retryMode?: boolean;
}) {
  const response = await input.fetcher(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
              sourceLanguage: input.sourceLanguage,
              targetLanguage: input.targetLanguage,
              retryMode: input.retryMode,
            }),
          },
        ],
      }),
    },
  );

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new ChineseTranscriptionError(
      "PRV_GROQ_TRANSLATION_FAILED",
      payload.error?.message ?? "Groq translation request failed.",
      response.status >= 400 && response.status < 500 ? 422 : 502,
    );
  }

  const content = payload.choices?.[0]?.message?.content ?? "";
  let parsed: GroqTranslationPayload;
  try {
    parsed = JSON.parse(content) as GroqTranslationPayload;
  } catch {
    throw new ChineseTranscriptionError(
      "PRV_GROQ_TRANSLATION_FAILED",
      "Groq translation returned invalid JSON.",
      502,
    );
  }

  return {
    requestId: payload.id,
    segments: normalizeTranslationPayload(parsed, input.segments),
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

async function translateChunkAdaptive(input: {
  segments: AudioTranscriptSegment[];
  sourceLanguage: string;
  targetLanguage: string;
  model: string;
  apiKey: string;
  fetcher: typeof fetch;
  retryMode?: boolean;
}): Promise<{
  requestIds: string[];
  segments: TranscriptTranslationSegment[];
  chunkCount: number;
}> {
  try {
    const result = await requestTranslationChunk(input);
    const unresolved = result.segments.filter(needsTranslationRetry);

    if (unresolved.length > 0 && input.segments.length > 1) {
      const unresolvedIds = new Set(unresolved.map((segment) => segment.id));
      const unresolvedSource = input.segments.filter((segment) =>
        unresolvedIds.has(segment.id),
      );
      const retry = await translateChunkAdaptive({
        ...input,
        segments: unresolvedSource,
        retryMode: true,
      });
      const retryById = new Map(
        retry.segments.map((segment) => [segment.id, segment]),
      );
      return {
        requestIds: [
          ...(result.requestId ? [result.requestId] : []),
          ...retry.requestIds,
        ],
        segments: result.segments.map(
          (segment) => retryById.get(segment.id) ?? segment,
        ),
        chunkCount: 1 + retry.chunkCount,
      };
    }

    return {
      requestIds: result.requestId ? [result.requestId] : [],
      segments: result.segments,
      chunkCount: 1,
    };
  } catch (error) {
    if (isRequestTooLargeError(error) && input.segments.length > 1) {
      const midpoint = Math.ceil(input.segments.length / 2);
      const left = await translateChunkAdaptive({
        ...input,
        segments: input.segments.slice(0, midpoint),
      });
      const right = await translateChunkAdaptive({
        ...input,
        segments: input.segments.slice(midpoint),
      });
      return {
        requestIds: [...left.requestIds, ...right.requestIds],
        segments: [...left.segments, ...right.segments],
        chunkCount: left.chunkCount + right.chunkCount,
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
  fetchImpl?: typeof fetch;
}): Promise<TranscriptTranslationResult> {
  validateTranslationSegments(input.segments);

  const apiKey = input.apiKey ?? readGroqApiKey();
  const model = input.model?.trim() || DEFAULT_TRANSLATION_MODEL;
  const sourceLanguage = input.sourceLanguage?.trim() || "zh";
  const targetLanguage = input.targetLanguage?.trim() || "vi";
  const fetcher = input.fetchImpl ?? fetch;
  const chunks = splitSegmentsForTranslation(input.segments);
  const translatedChunks = [];
  for (const chunk of chunks) {
    translatedChunks.push(
      await translateChunkAdaptive({
        segments: chunk,
        sourceLanguage,
        targetLanguage,
        model,
        apiKey,
        fetcher,
      }),
    );
  }
  const requestIds = translatedChunks.flatMap((chunk) => chunk.requestIds);

  return {
    sourceLanguage,
    targetLanguage,
    model,
    translatedSegments: translatedChunks.flatMap((chunk) => chunk.segments),
    chunks: translatedChunks.map((chunk, index) => ({
      index: index + 1,
      segmentCount: chunk.segments.length,
    })),
    provider: {
      name: "groq",
      requestId: requestIds.join(",") || undefined,
    },
  };
}
