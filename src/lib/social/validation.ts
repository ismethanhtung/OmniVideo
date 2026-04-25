import { ObjectId } from "mongodb";

import {
  getDefaultFormatsForPlatform,
  getPlatformForPublishType,
} from "./capabilities";
import {
  SocialError,
  type PublishRecordCreateInput,
  type SocialAccountCreateInput,
  type SocialAccountStatus,
  type SocialAuthMode,
  type SocialPlatform,
  type SocialPublishType,
  type SocialSecretMap,
  type ValidatedPublishRecordInput,
  type ValidatedSocialAccountInput,
} from "./types";

const SOCIAL_PLATFORMS = new Set<SocialPlatform>([
  "facebook",
  "tiktok",
  "shopee",
  "youtube",
]);

const ACCOUNT_STATUSES = new Set<SocialAccountStatus>([
  "active",
  "paused",
  "error",
]);

const AUTH_MODES = new Set<SocialAuthMode>([
  "oauth",
  "access_token",
  "api_key",
  "manual",
  "not_configured",
]);

const PUBLISH_TYPES = new Set<SocialPublishType>([
  "facebook_reel",
  "facebook_video",
  "tiktok_video",
  "shopee_video",
  "youtube_short",
  "youtube_video",
]);

const SECRET_KEYS: Array<keyof SocialSecretMap> = [
  "accessToken",
  "refreshToken",
  "appId",
  "appSecret",
  "pageId",
  "shopId",
  "openId",
  "channelId",
  "clientId",
  "clientSecret",
  "connectionJson",
];

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeSecrets(value: unknown): SocialSecretMap {
  if (!value || typeof value !== "object") {
    return {};
  }

  const payload = value as Record<string, unknown>;

  return Object.fromEntries(
    SECRET_KEYS.map((key) => [key, readString(payload[key])]).filter(
      ([, secret]) => Boolean(secret),
    ),
  ) as SocialSecretMap;
}

function normalizeSupportedFormats({
  platform,
  value,
}: {
  platform: SocialPlatform;
  value: unknown;
}): SocialPublishType[] {
  const defaultFormats = getDefaultFormatsForPlatform(platform);
  const requested = readStringArray(value).filter(
    (format): format is SocialPublishType =>
      PUBLISH_TYPES.has(format as SocialPublishType),
  );
  const compatible = requested.filter(
    (format) => getPlatformForPublishType(format) === platform,
  );

  return compatible.length > 0 ? Array.from(new Set(compatible)) : defaultFormats;
}

export function validateSocialAccountCreateInput(
  input: unknown,
): ValidatedSocialAccountInput {
  if (!input || typeof input !== "object") {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const payload = input as Partial<SocialAccountCreateInput>;

  if (
    typeof payload.platform !== "string" ||
    !SOCIAL_PLATFORMS.has(payload.platform)
  ) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_PLATFORM_INVALID",
      message: "platform must be facebook, tiktok, shopee, or youtube.",
    });
  }

  const label = readString(payload.label);

  if (!label) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_LABEL_REQUIRED",
      message: "label is required.",
    });
  }

  const status =
    typeof payload.status === "string" && ACCOUNT_STATUSES.has(payload.status)
      ? payload.status
      : "active";

  const authMode =
    typeof payload.authMode === "string" && AUTH_MODES.has(payload.authMode)
      ? payload.authMode
      : "manual";

  return {
    platform: payload.platform,
    label,
    displayName: readString(payload.displayName) ?? null,
    handle: readString(payload.handle) ?? null,
    accountId: readString(payload.accountId) ?? null,
    status,
    authMode,
    channelTags: readStringArray(payload.channelTags),
    permissionScopes: readStringArray(payload.permissionScopes),
    supportedFormats: normalizeSupportedFormats({
      platform: payload.platform,
      value: payload.supportedFormats,
    }),
    secrets: normalizeSecrets(payload.secrets),
  };
}

export type ValidatedSocialAccountUpdateInput = Partial<
  Omit<ValidatedSocialAccountInput, "platform">
>;

export function validateSocialAccountUpdateInput(
  input: unknown,
): ValidatedSocialAccountUpdateInput {
  if (!input || typeof input !== "object") {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const payload = input as Partial<SocialAccountCreateInput>;
  const result: ValidatedSocialAccountUpdateInput = {};

  if (typeof payload.label === "string") {
    const label = payload.label.trim();

    if (!label) {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_ACCOUNT_LABEL_REQUIRED",
        message: "label cannot be empty.",
      });
    }

    result.label = label;
  }

  if (typeof payload.displayName === "string") {
    result.displayName = payload.displayName.trim() || null;
  }

  if (typeof payload.handle === "string") {
    result.handle = payload.handle.trim() || null;
  }

  if (typeof payload.accountId === "string") {
    result.accountId = payload.accountId.trim() || null;
  }

  if (typeof payload.status === "string") {
    if (!ACCOUNT_STATUSES.has(payload.status)) {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_ACCOUNT_STATUS_INVALID",
        message: "status must be active, paused, or error.",
      });
    }

    result.status = payload.status;
  }

  if (typeof payload.authMode === "string") {
    if (!AUTH_MODES.has(payload.authMode)) {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_AUTH_MODE_INVALID",
        message:
          "authMode must be oauth, access_token, api_key, manual, or not_configured.",
      });
    }

    result.authMode = payload.authMode;
  }

  if (Array.isArray(payload.channelTags)) {
    result.channelTags = readStringArray(payload.channelTags);
  }

  if (Array.isArray(payload.permissionScopes)) {
    result.permissionScopes = readStringArray(payload.permissionScopes);
  }

  if (Array.isArray(payload.supportedFormats)) {
    const platform =
      typeof payload.platform === "string" &&
      SOCIAL_PLATFORMS.has(payload.platform)
        ? payload.platform
        : undefined;

    if (!platform) {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_PLATFORM_REQUIRED_FOR_FORMATS",
        message: "platform is required when updating supportedFormats.",
      });
    }

    result.supportedFormats = normalizeSupportedFormats({
      platform,
      value: payload.supportedFormats,
    });
  }

  if (payload.secrets !== undefined) {
    result.secrets = normalizeSecrets(payload.secrets);
  }

  if (Object.keys(result).length === 0) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_UPDATE_EMPTY",
      message: "At least one field is required for update.",
    });
  }

  return result;
}

export function validatePublishRecordCreateInput(
  input: unknown,
): ValidatedPublishRecordInput {
  if (!input || typeof input !== "object") {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_RECORD_BODY_INVALID",
      message: "Request body must be an object.",
    });
  }

  const payload = input as Partial<PublishRecordCreateInput>;
  const assetId = readString(payload.assetId);
  const socialAccountId = readString(payload.socialAccountId);

  if (!assetId || !ObjectId.isValid(assetId)) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_ASSET_ID_INVALID",
      message: "assetId must be a valid Mongo ObjectId.",
    });
  }

  if (!socialAccountId || !ObjectId.isValid(socialAccountId)) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_SOCIAL_ACCOUNT_ID_INVALID",
      message: "socialAccountId must be a valid Mongo ObjectId.",
    });
  }

  if (
    typeof payload.publishType !== "string" ||
    !PUBLISH_TYPES.has(payload.publishType)
  ) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_TYPE_INVALID",
      message: "publishType is not supported.",
    });
  }

  const scheduledAtRaw = readString(payload.scheduledAt);
  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null;

  if (scheduledAtRaw && Number.isNaN(scheduledAt?.getTime())) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_SCHEDULED_AT_INVALID",
      message: "scheduledAt must be a valid ISO date string.",
    });
  }

  return {
    assetId,
    socialAccountId,
    publishType: payload.publishType,
    title: readString(payload.title) ?? null,
    caption: readString(payload.caption) ?? null,
    hashtags: readStringArray(payload.hashtags).slice(0, 30),
    scheduledAt,
  };
}

export function isPublishRecordRetryable({
  status,
  errorCode,
  retryCount,
}: {
  status: string;
  errorCode?: string | null;
  retryCount: number;
}) {
  if (status !== "failed" && status !== "retrying") {
    return false;
  }

  if (retryCount >= 3) {
    return false;
  }

  if (errorCode?.startsWith("AUTH_") || errorCode?.startsWith("VAL_")) {
    return false;
  }

  return true;
}
