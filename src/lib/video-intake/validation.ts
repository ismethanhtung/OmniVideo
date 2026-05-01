import { detectOriginPlatform, normalizeUrl } from "./platform";
import {
  IntakeError,
  type IntakeInput,
  type IntakeQualityPreference,
  type ValidatedIntakeInput,
} from "./types";

const SUPPORTED_STORAGE_PROVIDERS = new Set(["telegram", "drive"]);
const SUPPORTED_QUALITY_PREFERENCES = new Set([
  "best",
  "1080p",
  "720p",
  "480p",
  "360p",
]);
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;
const FORMAT_SELECTOR_MAX_LENGTH = 240;

export function validateIntakeInput(input: unknown): ValidatedIntakeInput {
  if (!input || typeof input !== "object") {
    throw new IntakeError({
      errorCode: "VAL_INTAKE_BODY_INVALID",
      message: "Request body must be an object.",
      category: "validation",
    });
  }

  const payload = input as Partial<IntakeInput>;

  if (typeof payload.sourceUrl !== "string") {
    throw new IntakeError({
      errorCode: "VAL_SOURCE_URL_REQUIRED",
      message: "sourceUrl is required.",
      category: "validation",
    });
  }

  let canonicalUrl: string;

  try {
    canonicalUrl = normalizeUrl(payload.sourceUrl);
  } catch {
    throw new IntakeError({
      errorCode: "VAL_SOURCE_URL_INVALID",
      message: "sourceUrl must be a valid URL.",
      category: "validation",
    });
  }

  if (
    typeof payload.storageProvider !== "string" ||
    !SUPPORTED_STORAGE_PROVIDERS.has(payload.storageProvider)
  ) {
    throw new IntakeError({
      errorCode: "VAL_STORAGE_PROVIDER_INVALID",
      message: "storageProvider must be telegram or drive.",
      category: "validation",
    });
  }

  const tags = Array.isArray(payload.tags)
    ? payload.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];

  if (tags.length < 2) {
    throw new IntakeError({
      errorCode: "VAL_SOURCE_TAGS_REQUIRED",
      message: "At least 2 tags are required for source traceability.",
      category: "validation",
    });
  }

  const storageProviderAccountId = payload.storageProviderAccountId?.trim();

  if (
    storageProviderAccountId &&
    !OBJECT_ID_PATTERN.test(storageProviderAccountId)
  ) {
    throw new IntakeError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_ID_INVALID",
      message: "storageProviderAccountId must be a valid Mongo ObjectId.",
      category: "validation",
    });
  }

  const qualityPreferenceRaw = payload.qualityPreference?.trim();
  const qualityPreference = (qualityPreferenceRaw?.length
    ? qualityPreferenceRaw
    : "best") as IntakeQualityPreference;

  if (!SUPPORTED_QUALITY_PREFERENCES.has(qualityPreference)) {
    throw new IntakeError({
      errorCode: "VAL_QUALITY_PREFERENCE_INVALID",
      message:
        "qualityPreference must be one of best, 1080p, 720p, 480p, 360p.",
      category: "validation",
    });
  }

  const formatSelector = payload.formatSelector?.trim();

  if (
    formatSelector &&
    (formatSelector.length > FORMAT_SELECTOR_MAX_LENGTH ||
      /[\r\n\u0000-\u001f]/u.test(formatSelector))
  ) {
    throw new IntakeError({
      errorCode: "VAL_FORMAT_SELECTOR_INVALID",
      message:
        "formatSelector must be a single-line yt-dlp format selector under 240 characters.",
      category: "validation",
    });
  }

  return {
    sourceUrl: payload.sourceUrl,
    canonicalUrl,
    originPlatform: detectOriginPlatform(canonicalUrl),
    storageProvider: payload.storageProvider,
    storageProviderAccountId,
    tags,
    qualityPreference,
    formatSelector: formatSelector || undefined,
    title: payload.title?.trim() || undefined,
    description: payload.description?.trim() || undefined,
    languageHint: payload.languageHint?.trim() || undefined,
    contentIntent: payload.contentIntent?.trim() || "other",
    ownershipStatus: payload.ownershipStatus?.trim() || "unknown",
  };
}
