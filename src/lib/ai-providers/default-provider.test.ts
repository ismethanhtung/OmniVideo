import { describe, expect, it } from "vitest";

import {
    DEFAULT_GEMINI_TEXT_MODEL,
    DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID,
    isDefaultGeminiTextModel,
    normalizeGeminiModelName,
    resolveDefaultAiProviderId,
} from "./default-provider";

describe("default AI provider selection", () => {
    it("prefers Google AI Studio env as the default provider", () => {
        expect(resolveDefaultAiProviderId([])).toBe(
            DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID,
        );
        expect(
            resolveDefaultAiProviderId([
                {
                    _id: "provider-9router",
                    label: "9router",
                    providerType: "openai-compatible",
                    status: "active",
                },
            ]),
        ).toBe(DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID);
    });

    it("matches Gemini 3.1 Flash Lite with or without models prefix", () => {
        expect(DEFAULT_GEMINI_TEXT_MODEL).toBe(
            "models/gemini-3.1-flash-lite",
        );
        expect(normalizeGeminiModelName(DEFAULT_GEMINI_TEXT_MODEL)).toBe(
            "gemini-3.1-flash-lite",
        );
        expect(isDefaultGeminiTextModel("gemini-3.1-flash-lite")).toBe(true);
    });
});
