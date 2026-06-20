export type AiProviderRateLimit = {
    key: string;
    rpm?: number | null;
    providerName?: string;
    feature?: string;
    now?: () => number;
    sleep?: (ms: number) => Promise<void>;
};

type RateLimitBucket = {
    nextAvailableAt: number;
};

const RATE_LIMIT_SAFETY_MULTIPLIER = 1.05;
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function normalizeRpm(value: number | null | undefined) {
    return typeof value === "number" && Number.isFinite(value) && value > 0
        ? Math.floor(value)
        : null;
}

const defaultSleep = (ms: number) =>
    new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });

export function getAiProviderRateLimitIntervalMs(
    rpm: number | null | undefined,
) {
    const normalizedRpm = normalizeRpm(rpm);
    if (!normalizedRpm) return null;
    return Math.max(
        1,
        Math.ceil((60_000 / normalizedRpm) * RATE_LIMIT_SAFETY_MULTIPLIER),
    );
}

export function createAiProviderRateLimit(input: {
    providerId: string;
    providerName?: string;
    rpm?: number | null;
    feature?: string;
}): AiProviderRateLimit | undefined {
    const normalizedRpm = normalizeRpm(input.rpm);
    const providerId = input.providerId.trim();
    if (!providerId || !normalizedRpm) return undefined;
    return {
        key: `ai-provider:${providerId}`,
        rpm: normalizedRpm,
        providerName: input.providerName,
        feature: input.feature,
    };
}

export async function waitForAiProviderRateLimit(
    rateLimit: AiProviderRateLimit | undefined,
) {
    if (!rateLimit?.key.trim()) {
        return { limited: false, waitedMs: 0, intervalMs: 0 };
    }

    const intervalMs = getAiProviderRateLimitIntervalMs(rateLimit.rpm);
    if (!intervalMs) {
        return { limited: false, waitedMs: 0, intervalMs: 0 };
    }

    const now = rateLimit.now ?? Date.now;
    const sleep = rateLimit.sleep ?? defaultSleep;
    const current = now();
    const bucket = rateLimitBuckets.get(rateLimit.key);
    const scheduledAt = Math.max(
        current,
        bucket?.nextAvailableAt ?? current,
    );
    const waitedMs = Math.max(0, scheduledAt - current);

    rateLimitBuckets.set(rateLimit.key, {
        nextAvailableAt: scheduledAt + intervalMs,
    });

    if (waitedMs > 0) {
        await sleep(waitedMs);
    }

    return { limited: true, waitedMs, intervalMs };
}

export function resetAiProviderRateLimitBucketsForTest() {
    rateLimitBuckets.clear();
}
