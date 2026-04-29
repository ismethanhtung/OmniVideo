import { describe, expect, it } from "vitest";

import {
    validateAiProviderCreateInput,
    validateAiProviderUpdateInput,
} from "./validation";

describe("validateAiProviderCreateInput", () => {
    const validInput = {
        label: "My Groq",
        providerType: "groq",
        apiKey: "sk-test-key-123",
    };

    it("accepts valid input with defaults", () => {
        const result = validateAiProviderCreateInput(validInput);
        expect(result.label).toBe("My Groq");
        expect(result.providerType).toBe("groq");
        expect(result.apiKey).toBe("sk-test-key-123");
        expect(result.baseUrl).toBe("https://api.groq.com/openai/v1");
        expect(result.status).toBe("active");
        expect(result.priority).toBe(50);
        expect(result.tags).toEqual([]);
        expect(result.rateLimitRpm).toBeNull();
        expect(result.rateLimitTpm).toBeNull();
        expect(result.quotaMonthlyTokens).toBeNull();
    });

    it("uses default base URL for known provider types", () => {
        const groq = validateAiProviderCreateInput({
            ...validInput,
            providerType: "groq",
        });
        expect(groq.baseUrl).toBe("https://api.groq.com/openai/v1");

        const openrouter = validateAiProviderCreateInput({
            ...validInput,
            providerType: "openrouter",
        });
        expect(openrouter.baseUrl).toBe("https://openrouter.ai/api/v1");

        const openai = validateAiProviderCreateInput({
            ...validInput,
            providerType: "openai",
        });
        expect(openai.baseUrl).toBe("https://api.openai.com/v1");
    });

    it("accepts custom baseUrl", () => {
        const result = validateAiProviderCreateInput({
            ...validInput,
            baseUrl: "http://52.77.72.207:20128/v1",
            providerType: "openai-compatible",
        });
        expect(result.baseUrl).toBe("http://52.77.72.207:20128/v1");
    });

    it("strips trailing slashes from baseUrl", () => {
        const result = validateAiProviderCreateInput({
            ...validInput,
            baseUrl: "https://api.groq.com/openai/v1///",
        });
        expect(result.baseUrl).toBe("https://api.groq.com/openai/v1");
    });

    it("rejects null input", () => {
        expect(() => validateAiProviderCreateInput(null)).toThrow(
            "Request body must be an object",
        );
    });

    it("rejects invalid providerType", () => {
        expect(() =>
            validateAiProviderCreateInput({
                ...validInput,
                providerType: "invalid",
            }),
        ).toThrow("providerType must be");
    });

    it("rejects empty label", () => {
        expect(() =>
            validateAiProviderCreateInput({ ...validInput, label: "  " }),
        ).toThrow("label is required");
    });

    it("rejects empty apiKey", () => {
        expect(() =>
            validateAiProviderCreateInput({ ...validInput, apiKey: "" }),
        ).toThrow("apiKey is required");
    });

    it("rejects invalid baseUrl", () => {
        expect(() =>
            validateAiProviderCreateInput({
                ...validInput,
                baseUrl: "not-a-url",
                providerType: "openai-compatible",
            }),
        ).toThrow("baseUrl must be a valid HTTP/HTTPS URL");
    });

    it("accepts rate limits and quota", () => {
        const result = validateAiProviderCreateInput({
            ...validInput,
            rateLimitRpm: 60,
            rateLimitTpm: 100000,
            quotaMonthlyTokens: 5000000,
        });
        expect(result.rateLimitRpm).toBe(60);
        expect(result.rateLimitTpm).toBe(100000);
        expect(result.quotaMonthlyTokens).toBe(5000000);
    });

    it("ignores non-positive rate limits", () => {
        const result = validateAiProviderCreateInput({
            ...validInput,
            rateLimitRpm: -1,
            rateLimitTpm: 0,
        });
        expect(result.rateLimitRpm).toBeNull();
        expect(result.rateLimitTpm).toBeNull();
    });

    it("clamps priority to 0-100", () => {
        expect(
            validateAiProviderCreateInput({ ...validInput, priority: 150 })
                .priority,
        ).toBe(100);
        expect(
            validateAiProviderCreateInput({ ...validInput, priority: -10 })
                .priority,
        ).toBe(0);
    });

    it("filters and trims tags", () => {
        const result = validateAiProviderCreateInput({
            ...validInput,
            tags: [" free ", "", "  fast", 123 as unknown as string],
        });
        expect(result.tags).toEqual(["free", "fast"]);
    });
});

describe("validateAiProviderUpdateInput", () => {
    it("accepts partial update with label", () => {
        const result = validateAiProviderUpdateInput({ label: "Updated" });
        expect(result.label).toBe("Updated");
    });

    it("rejects empty update", () => {
        expect(() => validateAiProviderUpdateInput({})).toThrow(
            "At least one field is required",
        );
    });

    it("rejects null body", () => {
        expect(() => validateAiProviderUpdateInput(null)).toThrow(
            "Request body must be an object",
        );
    });

    it("rejects empty label on update", () => {
        expect(() => validateAiProviderUpdateInput({ label: " " })).toThrow(
            "label cannot be empty",
        );
    });

    it("rejects invalid status", () => {
        expect(() =>
            validateAiProviderUpdateInput({ status: "broken" }),
        ).toThrow("status must be");
    });

    it("validates baseUrl on update", () => {
        expect(() =>
            validateAiProviderUpdateInput({ baseUrl: "not-valid" }),
        ).toThrow("baseUrl must be a valid");
    });

    it("rejects empty apiKey on update", () => {
        expect(() => validateAiProviderUpdateInput({ apiKey: "  " })).toThrow(
            "apiKey cannot be empty",
        );
    });

    it("accepts valid update fields", () => {
        const result = validateAiProviderUpdateInput({
            label: "New Name",
            status: "paused",
            priority: 80,
            baseUrl: "https://new.api.com/v1",
            apiKey: "new-key",
            rateLimitRpm: 30,
        });
        expect(result.label).toBe("New Name");
        expect(result.status).toBe("paused");
        expect(result.priority).toBe(80);
        expect(result.baseUrl).toBe("https://new.api.com/v1");
        expect(result.apiKey).toBe("new-key");
        expect(result.rateLimitRpm).toBe(30);
    });
});
