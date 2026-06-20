export const DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID = "env-gemini";
export const DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_LABEL = "Google AI Studio";
export const DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_TYPE = "gemini";
export const DEFAULT_GEMINI_TEXT_MODEL = "models/gemini-3.1-flash-lite";
export const GOOGLE_AI_STUDIO_OPENAI_BASE_URL =
    "https://generativelanguage.googleapis.com/v1beta/openai";

type ProviderLike = {
    _id: string;
    label?: string | null;
    providerType?: string | null;
    status?: string | null;
    baseUrl?: string | null;
};

function normalize(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveDefaultAiProviderId<T extends ProviderLike>(
    providers: T[],
) {
    const configuredGoogleProvider = providers.find((provider) => {
        if (normalize(provider.status) && normalize(provider.status) !== "active") {
            return false;
        }
        const label = normalize(provider.label);
        const baseUrl = normalize(provider.baseUrl);
        return (
            label.includes("google ai studio") ||
            label.includes("gemini") ||
            baseUrl.includes("generativelanguage.googleapis.com")
        );
    });

    return configuredGoogleProvider?._id ?? DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID;
}

export function isGoogleAiStudioProviderId(providerId: string | undefined) {
    return normalize(providerId) === DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID;
}

export function readGoogleAiStudioApiKey() {
    return (
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim() ||
        ""
    );
}

export function normalizeGeminiModelName(model: string) {
    return model.trim().replace(/^models\//u, "");
}

export function isDefaultGeminiTextModel(model: string | undefined) {
    return (
        normalizeGeminiModelName(model ?? "") ===
        normalizeGeminiModelName(DEFAULT_GEMINI_TEXT_MODEL)
    );
}
