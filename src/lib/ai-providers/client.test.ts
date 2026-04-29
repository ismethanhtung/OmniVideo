import { describe, expect, it, vi } from "vitest";

import {
    chatCompletion,
    fetchProviderModels,
    testProviderConnection,
} from "./client";

const provider = {
    baseUrl: "https://api.example.com/v1",
    apiKey: "sk-test-key",
};

describe("fetchProviderModels", () => {
    it("returns sorted model list from OpenAI-compatible response", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        data: [
                            {
                                id: "gpt-4",
                                object: "model",
                                owned_by: "openai",
                            },
                            {
                                id: "claude-3",
                                object: "model",
                                owned_by: "anthropic",
                            },
                            {
                                id: "llama-3",
                                object: "model",
                                owned_by: "meta",
                            },
                        ],
                    }),
                    { status: 200 },
                ),
        );

        const models = await fetchProviderModels(provider, fetchImpl);

        expect(models).toEqual([
            { id: "claude-3", name: "claude-3", owned_by: "anthropic" },
            { id: "gpt-4", name: "gpt-4", owned_by: "openai" },
            { id: "llama-3", name: "llama-3", owned_by: "meta" },
        ]);

        expect(fetchImpl).toHaveBeenCalledWith(
            "https://api.example.com/v1/models",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({
                    Authorization: "Bearer sk-test-key",
                }),
            }),
        );
    });

    it("returns empty array when data is not an array", async () => {
        const fetchImpl = vi.fn(
            async () => new Response(JSON.stringify({}), { status: 200 }),
        );

        const models = await fetchProviderModels(provider, fetchImpl);
        expect(models).toEqual([]);
    });

    it("throws on non-OK response", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({ error: { message: "Unauthorized" } }),
                    { status: 401 },
                ),
        );

        await expect(
            fetchProviderModels(provider, fetchImpl),
        ).rejects.toMatchObject({
            errorCode: "PRV_AI_MODELS_FETCH_FAILED",
            message: "Unauthorized",
        });
    });
});

describe("chatCompletion", () => {
    it("sends a chat completion request and returns response", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        id: "chatcmpl-123",
                        choices: [
                            {
                                message: {
                                    role: "assistant",
                                    content: "Hello!",
                                },
                                finish_reason: "stop",
                            },
                        ],
                        usage: {
                            prompt_tokens: 10,
                            completion_tokens: 5,
                            total_tokens: 15,
                        },
                    }),
                    { status: 200 },
                ),
        );

        const result = await chatCompletion(
            provider,
            {
                model: "gpt-4",
                messages: [{ role: "user", content: "Hi" }],
                temperature: 0.5,
            },
            fetchImpl,
        );

        expect(result.id).toBe("chatcmpl-123");
        expect(result.choices[0].message.content).toBe("Hello!");
        expect(result.usage?.total_tokens).toBe(15);

        const [url, init] = fetchImpl.mock.calls[0];
        expect(url).toBe("https://api.example.com/v1/chat/completions");
        const body = JSON.parse(init.body as string);
        expect(body.model).toBe("gpt-4");
        expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
    });

    it("throws on error response", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({ error: { message: "Model not found" } }),
                    { status: 404 },
                ),
        );

        await expect(
            chatCompletion(
                provider,
                {
                    model: "nonexistent",
                    messages: [{ role: "user", content: "Hi" }],
                },
                fetchImpl,
            ),
        ).rejects.toMatchObject({
            errorCode: "PRV_AI_CHAT_COMPLETION_FAILED",
            message: "Model not found",
        });
    });
});

describe("testProviderConnection", () => {
    it("returns ok=true with model count on success", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({
                        data: [
                            { id: "model-1", object: "model" },
                            { id: "model-2", object: "model" },
                        ],
                    }),
                    { status: 200 },
                ),
        );

        const result = await testProviderConnection(provider, fetchImpl);
        expect(result.ok).toBe(true);
        expect(result.modelCount).toBe(2);
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("returns ok=false with error on failure", async () => {
        const fetchImpl = vi.fn(
            async () =>
                new Response(
                    JSON.stringify({ error: { message: "Bad key" } }),
                    { status: 401 },
                ),
        );

        const result = await testProviderConnection(provider, fetchImpl);
        expect(result.ok).toBe(false);
        expect(result.error).toBe("Bad key");
        expect(result.modelCount).toBe(0);
    });
});
