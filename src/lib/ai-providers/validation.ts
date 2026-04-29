import {
    AiProviderError,
    type AiProviderCreateInput,
    type AiProviderStatus,
    type AiProviderType,
    type ValidatedAiProviderInput,
} from "./types";

const PROVIDER_TYPES = new Set<AiProviderType>([
    "groq",
    "openrouter",
    "openai",
    "anthropic",
    "openai-compatible",
]);

const PROVIDER_STATUSES = new Set<AiProviderStatus>([
    "active",
    "paused",
    "error",
]);

const DEFAULT_BASE_URLS: Partial<Record<AiProviderType, string>> = {
    groq: "https://api.groq.com/openai/v1",
    openrouter: "https://openrouter.ai/api/v1",
    openai: "https://api.openai.com/v1",
    anthropic: "https://api.anthropic.com/v1",
};

function readString(value: unknown): string | undefined {
    return typeof value === "string" ? value.trim() : undefined;
}

function readPositiveNumberOrNull(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return null;
    }
    return Math.round(value);
}

function isValidUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export function validateAiProviderCreateInput(
    input: unknown,
): ValidatedAiProviderInput {
    if (!input || typeof input !== "object") {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_BODY_INVALID",
            message: "Request body must be an object.",
        });
    }

    const payload = input as Partial<AiProviderCreateInput>;

    if (
        typeof payload.providerType !== "string" ||
        !PROVIDER_TYPES.has(payload.providerType)
    ) {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_TYPE_INVALID",
            message:
                "providerType must be groq, openrouter, openai, anthropic, or openai-compatible.",
        });
    }

    const label = readString(payload.label);
    if (!label) {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_LABEL_REQUIRED",
            message: "label is required.",
        });
    }

    const apiKey = readString(payload.apiKey);
    if (!apiKey) {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_API_KEY_REQUIRED",
            message: "apiKey is required.",
        });
    }

    const rawBaseUrl = readString(payload.baseUrl);
    const baseUrl = rawBaseUrl || DEFAULT_BASE_URLS[payload.providerType] || "";

    if (!baseUrl || !isValidUrl(baseUrl)) {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_BASE_URL_INVALID",
            message: "baseUrl must be a valid HTTP/HTTPS URL.",
        });
    }

    const status =
        typeof payload.status === "string" &&
        PROVIDER_STATUSES.has(payload.status)
            ? payload.status
            : "active";

    const priority =
        typeof payload.priority === "number" &&
        Number.isFinite(payload.priority)
            ? Math.max(0, Math.min(100, Math.round(payload.priority)))
            : 50;

    const tags = Array.isArray(payload.tags)
        ? payload.tags
              .filter((tag): tag is string => typeof tag === "string")
              .map((tag) => tag.trim())
              .filter(Boolean)
        : [];

    return {
        label,
        providerType: payload.providerType,
        baseUrl: baseUrl.replace(/\/+$/, ""),
        apiKey,
        description: readString(payload.description) ?? null,
        status,
        priority,
        tags,
        rateLimitRpm: readPositiveNumberOrNull(payload.rateLimitRpm),
        rateLimitTpm: readPositiveNumberOrNull(payload.rateLimitTpm),
        quotaMonthlyTokens: readPositiveNumberOrNull(
            payload.quotaMonthlyTokens,
        ),
    };
}

export type ValidatedAiProviderUpdateInput = {
    label?: string;
    description?: string | null;
    status?: AiProviderStatus;
    priority?: number;
    tags?: string[];
    baseUrl?: string;
    apiKey?: string;
    rateLimitRpm?: number | null;
    rateLimitTpm?: number | null;
    quotaMonthlyTokens?: number | null;
};

export function validateAiProviderUpdateInput(
    input: unknown,
): ValidatedAiProviderUpdateInput {
    if (!input || typeof input !== "object") {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_BODY_INVALID",
            message: "Request body must be an object.",
        });
    }

    const payload = input as Partial<AiProviderCreateInput>;
    const result: ValidatedAiProviderUpdateInput = {};

    if (typeof payload.label === "string") {
        const label = payload.label.trim();
        if (!label) {
            throw new AiProviderError({
                errorCode: "VAL_AI_PROVIDER_LABEL_REQUIRED",
                message: "label cannot be empty.",
            });
        }
        result.label = label;
    }

    if (typeof payload.description === "string") {
        result.description = payload.description.trim() || null;
    }

    if (typeof payload.status === "string") {
        if (!PROVIDER_STATUSES.has(payload.status)) {
            throw new AiProviderError({
                errorCode: "VAL_AI_PROVIDER_STATUS_INVALID",
                message: "status must be active, paused, or error.",
            });
        }
        result.status = payload.status;
    }

    if (
        typeof payload.priority === "number" &&
        Number.isFinite(payload.priority)
    ) {
        result.priority = Math.max(
            0,
            Math.min(100, Math.round(payload.priority)),
        );
    }

    if (Array.isArray(payload.tags)) {
        result.tags = payload.tags
            .filter((tag): tag is string => typeof tag === "string")
            .map((tag) => tag.trim())
            .filter(Boolean);
    }

    if (typeof payload.baseUrl === "string") {
        const baseUrl = payload.baseUrl.trim();
        if (!isValidUrl(baseUrl)) {
            throw new AiProviderError({
                errorCode: "VAL_AI_PROVIDER_BASE_URL_INVALID",
                message: "baseUrl must be a valid HTTP/HTTPS URL.",
            });
        }
        result.baseUrl = baseUrl.replace(/\/+$/, "");
    }

    if (typeof payload.apiKey === "string") {
        const apiKey = payload.apiKey.trim();
        if (!apiKey) {
            throw new AiProviderError({
                errorCode: "VAL_AI_PROVIDER_API_KEY_REQUIRED",
                message: "apiKey cannot be empty.",
            });
        }
        result.apiKey = apiKey;
    }

    if (payload.rateLimitRpm !== undefined) {
        result.rateLimitRpm = readPositiveNumberOrNull(payload.rateLimitRpm);
    }

    if (payload.rateLimitTpm !== undefined) {
        result.rateLimitTpm = readPositiveNumberOrNull(payload.rateLimitTpm);
    }

    if (payload.quotaMonthlyTokens !== undefined) {
        result.quotaMonthlyTokens = readPositiveNumberOrNull(
            payload.quotaMonthlyTokens,
        );
    }

    if (Object.keys(result).length === 0) {
        throw new AiProviderError({
            errorCode: "VAL_AI_PROVIDER_UPDATE_EMPTY",
            message: "At least one field is required for update.",
        });
    }

    return result;
}
