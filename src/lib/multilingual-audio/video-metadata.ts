import { ChineseTranscriptionError, type TranscriptTranslationSegment, type VietnameseVideoMetadataResult } from "./types";
import { readGroqApiKey } from "./validation";

const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = "llama-3.1-8b-instant";

export async function generateVietnameseVideoMetadata(input: {
  translatedSegments: TranscriptTranslationSegment[];
  sourceTitle?: string;
  sourceDescription?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  providerName?: string;
  fetcher?: typeof fetch;
}): Promise<VietnameseVideoMetadataResult> {
  if (!Array.isArray(input.translatedSegments) || input.translatedSegments.length === 0) {
    throw new ChineseTranscriptionError(
      "VAL_TRANSLATION_SEGMENTS_REQUIRED",
      "At least one translated segment is required to generate metadata.",
      400,
    );
  }

  const apiKey = input.apiKey ?? readGroqApiKey();
  const baseUrl = input.baseUrl ?? DEFAULT_GROQ_BASE_URL;
  const model = input.model?.trim() || DEFAULT_MODEL;
  const fetcher = input.fetcher ?? fetch;

  const response = await fetcher(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate concise Vietnamese social video metadata. Return JSON only.",
        },
        {
          role: "user",
          content: [
            "Generate Vietnamese metadata for social publishing.",
            'Output JSON: {"title":"...","description":"...","hashtags":["tag1","tag2"]}.',
            "Rules: keep title <= 100 chars, description <= 500 chars, hashtags 5-12 items, no # symbol in array items.",
            `Source title: ${input.sourceTitle ?? ""}`,
            `Source description: ${input.sourceDescription ?? ""}`,
            `Translated segments: ${JSON.stringify(input.translatedSegments.map((s) => s.translatedText).slice(0, 24))}`,
          ].join("\n"),
        },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new ChineseTranscriptionError(
      "PRV_GROQ_TRANSLATION_FAILED",
      payload.error?.message ?? "Metadata generation request failed.",
      response.status >= 400 && response.status < 500 ? 422 : 502,
    );
  }

  const raw = payload.choices?.[0]?.message?.content ?? "{}";
  let parsed: { title?: unknown; description?: unknown; hashtags?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ChineseTranscriptionError(
      "PRV_GROQ_TRANSLATION_FAILED",
      "Metadata generation returned invalid JSON.",
      502,
    );
  }

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const description = typeof parsed.description === "string" ? parsed.description.trim() : "";
  const hashtags = Array.isArray(parsed.hashtags)
    ? parsed.hashtags
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.replace(/^#+/, "").trim())
        .filter(Boolean)
        .slice(0, 15)
    : [];

  if (!title || !description) {
    throw new ChineseTranscriptionError(
      "PRV_GROQ_TRANSLATION_FAILED",
      "Metadata generation returned empty title/description.",
      502,
    );
  }

  return {
    title,
    description,
    hashtags,
    model,
    provider: {
      name: input.providerName ?? "groq",
      requestId: payload.id,
    },
  };
}
