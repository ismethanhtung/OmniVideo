import {
  ChineseTranscriptionError,
  DEFAULT_TRANSLATION_MODEL,
  type TranscriptTranslationSegment,
  type VietnameseVideoMetadataResult,
} from "./types";
import { readGroqApiKey } from "./validation";

const DEFAULT_GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const DEFAULT_MODEL = DEFAULT_TRANSLATION_MODEL;
export const PREFERRED_VI_METADATA_TAGS = [
  "review phim",
  "review full",
  "truyện ngắn",
  "hoạt hình",
  "review truyện",
  "tóm tắt truyện",
  "tóm tắt phim",
  "hoạt hình trung quốc",
] as const;

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_#-]+/g, " ")
    .toLowerCase();
}

function hasAnySignal(text: string, signals: string[]) {
  return signals.some((signal) => text.includes(signal));
}

function appendUniqueTags(existing: string[], additions: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of [...existing, ...additions]) {
    const normalizedTag = tag.replace(/^#+/, "").trim();
    if (!normalizedTag) continue;
    const dedupeKey = normalizeSearchText(normalizedTag);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    result.push(normalizedTag);
  }

  return result.slice(0, 15);
}

export function inferPreferredVietnameseMetadataTags(input: {
  sourceTitle?: string;
  sourceDescription?: string;
  generatedTitle?: string;
  generatedDescription?: string;
  hashtags?: string[];
  translatedSegments?: TranscriptTranslationSegment[];
}) {
  const searchable = normalizeSearchText(
    [
      input.sourceTitle,
      input.sourceDescription,
      input.generatedTitle,
      input.generatedDescription,
      ...(input.hashtags ?? []),
      ...(input.translatedSegments ?? [])
        .map((segment) => segment.translatedText)
        .slice(0, 24),
    ]
      .filter((entry): entry is string => typeof entry === "string")
      .join(" "),
  );

  const hasReview = hasAnySignal(searchable, [
    "review",
    "recap",
    "tom tat",
    "ke lai",
    "giai thich",
  ]);
  const hasFull = hasAnySignal(searchable, [
    "review full",
    "full",
    "tron bo",
    "truyen full",
    "phim full",
  ]);
  const hasMovie = hasAnySignal(searchable, [
    "phim",
    "movie",
    "dien anh",
    "drama",
    "series",
  ]);
  const hasStory = hasAnySignal(searchable, [
    "truyen",
    "novel",
    "tieu thuyet",
    "ngon tinh",
    "sung ton",
    "suton",
    "mat van thu",
    "co trang",
    "xuyen khong",
    "truyen tranh",
    "manhua",
  ]);
  const hasShortStory = hasAnySignal(searchable, [
    "truyen ngan",
    "short story",
  ]);
  const hasAnimation = hasAnySignal(searchable, [
    "hoat hinh",
    "donghua",
    "anime",
    "cartoon",
    "animation",
  ]);
  const hasChina = hasAnySignal(searchable, [
    "trung quoc",
    "chinese",
    "china",
    "hoa ngu",
    "donghua",
    "co trang",
    "ngon tinh",
    "xuyen khong",
  ]);

  const preferredTags: string[] = [];

  if (hasMovie && hasReview) {
    preferredTags.push("review phim", "tóm tắt phim");
  }
  if (hasFull && (hasReview || hasMovie || hasStory)) {
    preferredTags.push("review full");
  }
  if (hasShortStory) {
    preferredTags.push("truyện ngắn");
  }
  if (hasStory && hasReview) {
    preferredTags.push("review truyện", "tóm tắt truyện");
  }
  if (hasAnimation) {
    preferredTags.push("hoạt hình");
    if (hasChina) {
      preferredTags.push("hoạt hình trung quốc");
    }
  }

  return preferredTags;
}

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
            `Preferred tags to include when content matches: ${PREFERRED_VI_METADATA_TAGS.join(", ")}.`,
            "If the content is a film review/recap/summary, include review phim and/or tóm tắt phim. If it is a story/novel/comic review or summary, include review truyện and/or tóm tắt truyện. If it is short-story content, include truyện ngắn. If it is animation/donghua/cartoon, include hoạt hình and add hoạt hình trung quốc when it is Chinese animation. If the content is a full review/recap, include review full.",
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
  const preferredTags = inferPreferredVietnameseMetadataTags({
    sourceTitle: input.sourceTitle,
    sourceDescription: input.sourceDescription,
    generatedTitle: title,
    generatedDescription: description,
    hashtags,
    translatedSegments: input.translatedSegments,
  });

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
    hashtags: appendUniqueTags(hashtags, preferredTags),
    model,
    provider: {
      name: input.providerName ?? "groq",
      requestId: payload.id,
    },
  };
}
