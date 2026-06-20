import { afterEach, describe, expect, it, vi } from "vitest";

import {
    createAiProviderRateLimit,
    getAiProviderRateLimitIntervalMs,
    resetAiProviderRateLimitBucketsForTest,
    waitForAiProviderRateLimit,
} from "./rate-limit";

describe("AI provider RPM limiter", () => {
    afterEach(() => {
        resetAiProviderRateLimitBucketsForTest();
    });

    it("skips throttling when RPM is not configured", () => {
        expect(
            createAiProviderRateLimit({
                providerId: "provider-1",
                rpm: null,
            }),
        ).toBeUndefined();
        expect(getAiProviderRateLimitIntervalMs(null)).toBeNull();
    });

    it("spaces requests using configured RPM with a small safety margin", async () => {
        let now = 0;
        const waits: number[] = [];
        const sleep = vi.fn(async (ms: number) => {
            waits.push(ms);
            now += ms;
        });
        const rateLimit = {
            key: "ai-provider:provider-1",
            rpm: 14,
            now: () => now,
            sleep,
        };

        await waitForAiProviderRateLimit(rateLimit);
        await waitForAiProviderRateLimit(rateLimit);

        expect(getAiProviderRateLimitIntervalMs(14)).toBe(4500);
        expect(waits).toEqual([4500]);
    });
});
