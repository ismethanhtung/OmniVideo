import { AiProviderError, type AiProviderModel } from "./types";

type ProviderConnectionInfo = {
    baseUrl: string;
    apiKey: string;
};

type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};

type ChatCompletionRequest = {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    response_format?: { type: string };
};

type ChatCompletionResponse = {
    id: string;
    choices: Array<{
        message: { role: string; content: string };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
};

type OpenAiModelsResponse = {
    data?: Array<{
        id: string;
        object?: string;
        owned_by?: string;
        created?: number;
    }>;
    error?: { message?: string };
};

export async function fetchProviderModels(
    provider: ProviderConnectionInfo,
    fetchImpl: typeof fetch = fetch,
): Promise<AiProviderModel[]> {
    const url = `${provider.baseUrl}/models`;

    const response = await fetchImpl(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
        },
    });

    const payload = (await response
        .json()
        .catch(() => ({}))) as OpenAiModelsResponse;

    if (!response.ok) {
        throw new AiProviderError({
            errorCode: "PRV_AI_MODELS_FETCH_FAILED",
            message:
                payload.error?.message ??
                `Failed to fetch models (HTTP ${response.status}).`,
            statusCode: 502,
        });
    }

    if (!Array.isArray(payload.data)) {
        return [];
    }

    return payload.data
        .filter((m) => typeof m.id === "string")
        .map((m) => ({
            id: m.id,
            name: m.id,
            owned_by: m.owned_by,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
}

export async function chatCompletion(
    provider: ProviderConnectionInfo,
    request: ChatCompletionRequest,
    fetchImpl: typeof fetch = fetch,
): Promise<ChatCompletionResponse> {
    const url = `${provider.baseUrl}/chat/completions`;

    const response = await fetchImpl(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            response_format: request.response_format,
        }),
    });

    const payload = (await response.json().catch(() => ({}))) as
        | ChatCompletionResponse
        | { error?: { message?: string } };

    if (!response.ok) {
        const errorMessage =
            "error" in payload && payload.error?.message
                ? payload.error.message
                : `Chat completion failed (HTTP ${response.status}).`;

        throw new AiProviderError({
            errorCode: "PRV_AI_CHAT_COMPLETION_FAILED",
            message: errorMessage,
            statusCode:
                response.status >= 400 && response.status < 500 ? 422 : 502,
        });
    }

    return payload as ChatCompletionResponse;
}

export async function testProviderConnection(
    provider: ProviderConnectionInfo,
    fetchImpl: typeof fetch = fetch,
): Promise<{
    ok: boolean;
    modelCount: number;
    latencyMs: number;
    error?: string;
}> {
    const start = Date.now();

    try {
        const models = await fetchProviderModels(provider, fetchImpl);
        return {
            ok: true,
            modelCount: models.length,
            latencyMs: Date.now() - start,
        };
    } catch (error) {
        return {
            ok: false,
            modelCount: 0,
            latencyMs: Date.now() - start,
            error:
                error instanceof Error
                    ? error.message
                    : "Connection test failed.",
        };
    }
}
