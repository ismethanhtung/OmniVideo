import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
    getAiProviderById,
    getAiProvidersDb,
} from "@/lib/ai-providers/repository";

import { POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/ai-providers/repository", () => ({
    getAiProvidersDb: vi.fn(),
    getAiProviderById: vi.fn(),
}));

const mockedRequireWriteAccess = vi.mocked(requireWriteAccess);
const mockedGetAiProvidersDb = vi.mocked(getAiProvidersDb);
const mockedGetAiProviderById = vi.mocked(getAiProviderById);

describe("Hugging Face image generation route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mockedRequireWriteAccess.mockReturnValue(null);
        mockedGetAiProvidersDb.mockResolvedValue({} as never);
        mockedGetAiProviderById.mockResolvedValue({
            baseUrl: "https://llm.chiasegpu.vn/v1",
            apiKey: "provider-key",
        } as never);
    });

    it("rejects missing prompt", async () => {
        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({ prompt: "" }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.errorCode).toBe("VAL_PROMPT_REQUIRED");
    });

    it("returns a data URL when Hugging Face responds with image bytes", async () => {
        vi.stubEnv("HUGGINGFACE_API_TOKEN", "server-token");
        const imageBytes = Buffer.from([1, 2, 3, 4]);
        const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body ?? "{}")) as {
                inputs?: string;
                parameters?: {
                    width?: number;
                    height?: number;
                    num_inference_steps?: number;
                    guidance_scale?: number;
                    seed?: number;
                };
                options?: { wait_for_model?: boolean };
            };
            expect(init?.headers).toMatchObject({
                Authorization: "Bearer server-token",
            });
            expect(body.inputs).toBe("moon palace frame");
            expect(body.parameters).toMatchObject({
                width: 1024,
                height: 576,
                num_inference_steps: 24,
                guidance_scale: 8,
                seed: 42,
            });
            expect(body.options?.wait_for_model).toBe(true);
            return new Response(imageBytes, {
                status: 200,
                headers: { "content-type": "image/png" },
            });
        });
        vi.stubGlobal("fetch", fetchMock);

        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({
                    prompt: "moon palace frame",
                    model: "test/model",
                    width: 1024,
                    height: 576,
                    steps: 24,
                    guidanceScale: 8,
                    seed: 42,
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.imageDataUrl).toBe(
            `data:image/png;base64,${imageBytes.toString("base64")}`,
        );
        expect(payload.data.model).toBe("test/model");
        expect(fetchMock).toHaveBeenCalledWith(
            "https://router.huggingface.co/hf-inference/models/test/model",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("maps Hugging Face JSON errors to provider failures", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        error: "Model is loading",
                        estimated_time: 12.2,
                    }),
                    {
                        status: 503,
                        headers: { "content-type": "application/json" },
                    },
                ),
            ),
        );

        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({ prompt: "frame" }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(502);
        expect(payload.errorCode).toBe("PRV_HUGGINGFACE_IMAGE_FAILED");
        expect(payload.error).toContain("Model is loading");
        expect(payload.error).toContain("Estimated wait: 13s.");
    });

    it("generates images with configured OpenAI-compatible AI providers", async () => {
        const imageBytes = Buffer.from([9, 10, 11, 12]);
        const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body ?? "{}")) as {
                model?: string;
                prompt?: string;
                size?: string;
                response_format?: string;
                steps?: number;
                guidance_scale?: number;
                seed?: number;
            };
            expect(url).toBe("https://llm.chiasegpu.vn/v1/images/generations");
            expect(init?.headers).toMatchObject({
                Authorization: "Bearer provider-key",
            });
            expect(body).toMatchObject({
                model: "chiasegpu-image-model",
                size: "1024x576",
                response_format: "b64_json",
                steps: 24,
                guidance_scale: 8,
                seed: 42,
            });
            expect(body.prompt).toContain("moon palace frame");
            expect(body.prompt).toContain("Negative prompt: blurry");
            return new Response(
                JSON.stringify({
                    data: [{ b64_json: imageBytes.toString("base64") }],
                }),
                { status: 200, headers: { "content-type": "application/json" } },
            );
        });
        vi.stubGlobal("fetch", fetchMock);

        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({
                    providerId: "provider-1",
                    prompt: "moon palace frame",
                    negativePrompt: "blurry",
                    model: "chiasegpu-image-model",
                    width: 1024,
                    height: 576,
                    steps: 24,
                    guidanceScale: 8,
                    seed: 42,
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.providerId).toBe("provider-1");
        expect(payload.data.imageDataUrl).toBe(
            `data:image/png;base64,${imageBytes.toString("base64")}`,
        );
        expect(mockedGetAiProviderById).toHaveBeenCalledWith({
            db: {},
            providerId: "provider-1",
        });
    });

    it("falls back to the legacy endpoint after a router network failure", async () => {
        const cause = new Error("getaddrinfo ENOTFOUND router.huggingface.co") as Error & {
            code?: string;
        };
        cause.code = "ENOTFOUND";
        const fetchError = new TypeError("fetch failed") as TypeError & {
            cause?: Error;
        };
        fetchError.cause = cause;
        const imageBytes = Buffer.from([5, 6, 7, 8]);
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(fetchError)
            .mockResolvedValueOnce(
                new Response(imageBytes, {
                    status: 200,
                    headers: { "content-type": "image/png" },
                }),
            );
        vi.stubGlobal("fetch", fetchMock);

        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({ prompt: "frame", model: "test/model" }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.imageDataUrl).toBe(
            `data:image/png;base64,${imageBytes.toString("base64")}`,
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://router.huggingface.co/hf-inference/models/test/model",
            expect.any(Object),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "https://api-inference.huggingface.co/models/test/model",
            expect.any(Object),
        );
    });

    it("maps Hugging Face fetch failures to provider network errors", async () => {
        const cause = new Error("getaddrinfo ENOTFOUND api-inference.huggingface.co") as Error & {
            code?: string;
        };
        cause.code = "ENOTFOUND";
        const fetchError = new TypeError("fetch failed") as TypeError & {
            cause?: Error;
        };
        fetchError.cause = cause;
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => {
                throw fetchError;
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/ai-image/huggingface-generate", {
                method: "POST",
                body: JSON.stringify({ prompt: "frame" }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(502);
        expect(payload.errorCode).toBe("PRV_HUGGINGFACE_NETWORK_FAILED");
        expect(payload.error).toContain(
            "Hugging Face image network request failed: fetch failed",
        );
        expect(payload.error).toContain("ENOTFOUND");
        expect(payload.error).toContain("router.huggingface.co");
        expect(payload.error).toContain("api-inference.huggingface.co");
    });
});
