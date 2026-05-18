export const DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL = "9router";
export const DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE = "openai-compatible";

type ProviderLike = {
    _id: string;
    label?: string | null;
    providerType?: string | null;
    status?: string | null;
};

function normalize(value: unknown) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function resolveDefaultAiProviderId<T extends ProviderLike>(
    providers: T[],
) {
    const activeProviders = providers.filter(
        (provider) => normalize(provider.status || "active") === "active",
    );
    const byExact = activeProviders.find(
        (provider) =>
            normalize(provider.providerType) ===
                DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE &&
            normalize(provider.label) === DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL,
    );
    if (byExact?._id) return byExact._id;

    const byLabel = activeProviders.find(
        (provider) =>
            normalize(provider.providerType) ===
                DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE &&
            normalize(provider.label).includes(
                DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL,
            ),
    );
    if (byLabel?._id) return byLabel._id;

    const byType = activeProviders.find(
        (provider) =>
            normalize(provider.providerType) ===
            DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE,
    );
    return byType?._id ?? "";
}
