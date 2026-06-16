import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { imageGeneration } from "@/lib/ai-providers/client";
import {
    getAiProviderById,
    getAiProvidersDb,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "stabilityai/stable-diffusion-xl-base-1.0";
const MAX_PROMPT_LENGTH = 4000;
const DEFAULT_HUGGINGFACE_TIMEOUT_MS = 120000;
const HUGGINGFACE_ENDPOINTS = [
    "https://router.huggingface.co/hf-inference/models",
    "https://api-inference.huggingface.co/models",
];

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function readString(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === "string" ? value.trim() : "";
}

function normalizeBaseUrl(value: string) {
    return value.trim().replace(/\/+$/u, "");
}

function toDataUrl(bytes: Buffer, mimeType: string) {
    return `data:${mimeType};base64,${bytes.toString("base64")}`;
}

function b64JsonToDataUrl(value: string) {
    const dataUrlMatch = value.match(/^data:([^;]+);base64,(.+)$/u);
    if (dataUrlMatch) {
        return {
            imageDataUrl: value,
            mimeType: dataUrlMatch[1] || "image/png",
            byteLength: Buffer.from(dataUrlMatch[2] || "", "base64").byteLength,
        };
    }
    return {
        imageDataUrl: `data:image/png;base64,${value}`,
        mimeType: "image/png",
        byteLength: Buffer.from(value, "base64").byteLength,
    };
}

async function imageUrlToDataUrl(url: string) {
    const response = await fetch(url, {
        signal: AbortSignal.timeout(DEFAULT_HUGGINGFACE_TIMEOUT_MS),
    });
    if (!response.ok) {
        throw new Error(`Failed to download generated image URL (HTTP ${response.status}).`);
    }
    const mimeType =
        response.headers.get("content-type")?.split(";")[0] || "image/png";
    const bytes = Buffer.from(await response.arrayBuffer());
    return {
        imageDataUrl: toDataUrl(bytes, mimeType),
        mimeType,
        byteLength: bytes.byteLength,
    };
}

function encodeModelPath(model: string) {
    return model
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
}

async function parseJsonMaybe(text: string) {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return null;
    }
}

function extractProviderError(payload: unknown, fallback: string) {
    if (!payload || typeof payload !== "object") return fallback;
    const candidate = payload as {
        error?: unknown;
        estimated_time?: unknown;
        warnings?: unknown;
    };
    const parts: string[] = [];
    if (typeof candidate.error === "string") {
        parts.push(candidate.error);
    }
    if (typeof candidate.estimated_time === "number") {
        parts.push(`Estimated wait: ${Math.ceil(candidate.estimated_time)}s.`);
    }
    if (Array.isArray(candidate.warnings) && candidate.warnings.length > 0) {
        parts.push(candidate.warnings.map(String).join(" "));
    }
    return parts.join(" ") || fallback;
}

function getErrorCauseMessage(error: unknown) {
    if (!(error instanceof Error)) return "";
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code =
            "code" in cause && typeof cause.code === "string"
                ? ` (${cause.code})`
                : "";
        return `: ${cause.message}${code}`;
    }
    if (cause && typeof cause === "object") {
        const record = cause as Record<string, unknown>;
        if (typeof record.message === "string") {
            const code =
                typeof record.code === "string" ? ` (${record.code})` : "";
            return `: ${record.message}${code}`;
        }
    }
    return "";
}

function formatNetworkFailure(error: unknown, timeoutMs: number) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
        return `Hugging Face image request timed out after ${timeoutMs}ms.`;
    }
    if (error instanceof Error) {
        return `Hugging Face image network request failed: ${error.message}${getErrorCauseMessage(error)}`;
    }
    return "Hugging Face image network request failed.";
}

export async function POST(request: Request) {
    try {
        const writeDenied = requireWriteAccess(request);
        if (writeDenied) return writeDenied;

        const payload = (await request.json()) as Record<string, unknown>;
        const prompt = readString(payload, "prompt");
        const negativePrompt = readString(payload, "negativePrompt");
        const model = readString(payload, "model") || DEFAULT_MODEL;
        const providerId = readString(payload, "providerId");
        const token =
            readString(payload, "token") ||
            process.env.HUGGINGFACE_API_TOKEN?.trim() ||
            process.env.HF_TOKEN?.trim() ||
            "";
        const width = clampNumber(payload.width, 1024, 256, 1536);
        const height = clampNumber(payload.height, 576, 256, 1536);
        const steps = clampNumber(payload.steps, 28, 1, 80);
        const guidanceScale = clampNumber(payload.guidanceScale, 7, 1, 20);
        const seed =
            payload.seed === null || payload.seed === undefined || payload.seed === ""
                ? undefined
                : clampNumber(payload.seed, 0, 0, 2147483647);

        if (!prompt) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_PROMPT_REQUIRED",
                    error: "Prompt is required.",
                },
                { status: 400 },
            );
        }
        if (prompt.length > MAX_PROMPT_LENGTH) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_PROMPT_TOO_LONG",
                    error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer.`,
                },
                { status: 400 },
            );
        }

        if (providerId) {
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            const providerPayload = await imageGeneration(
                {
                    baseUrl: normalizeBaseUrl(provider.baseUrl),
                    apiKey: provider.apiKey,
                },
                {
                    model,
                    prompt,
                    negativePrompt,
                    size: `${width}x${height}`,
                    steps,
                    guidanceScale,
                    seed: seed ?? null,
                },
            );
            const image = providerPayload.data?.[0];
            if (!image?.b64_json && !image?.url) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "PRV_AI_IMAGE_EMPTY",
                        error: "AI provider did not return an image.",
                    },
                    { status: 502 },
                );
            }
            const imageData = image.b64_json
                ? b64JsonToDataUrl(image.b64_json)
                : await imageUrlToDataUrl(image.url!);
            return NextResponse.json({
                ok: true,
                data: {
                    ...imageData,
                    model,
                    providerId,
                    prompt,
                    negativePrompt,
                    revisedPrompt: image.revised_prompt ?? null,
                    settings: {
                        width,
                        height,
                        steps,
                        guidanceScale,
                        seed: seed ?? null,
                    },
                },
            });
        }

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            Accept: "image/png,image/jpeg,application/json",
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const requestBody = JSON.stringify({
            inputs: prompt,
            parameters: {
                negative_prompt: negativePrompt || undefined,
                width,
                height,
                num_inference_steps: steps,
                guidance_scale: guidanceScale,
                seed,
            },
            options: {
                wait_for_model: true,
                use_cache: false,
            },
        });
        let response: Response | null = null;
        const networkFailures: string[] = [];
        for (const endpoint of HUGGINGFACE_ENDPOINTS) {
            try {
                response = await fetch(
                    `${endpoint}/${encodeModelPath(model)}`,
                    {
                        method: "POST",
                        headers,
                        signal: AbortSignal.timeout(
                            DEFAULT_HUGGINGFACE_TIMEOUT_MS,
                        ),
                        body: requestBody,
                    },
                );
                break;
            } catch (fetchError) {
                networkFailures.push(
                    `${endpoint}: ${formatNetworkFailure(
                        fetchError,
                        DEFAULT_HUGGINGFACE_TIMEOUT_MS,
                    )}`,
                );
            }
        }
        if (!response) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "PRV_HUGGINGFACE_NETWORK_FAILED",
                    error: networkFailures.join(" | "),
                },
                { status: 502 },
            );
        }

        const contentType =
            response.headers.get("content-type")?.toLowerCase() || "";
        if (contentType.includes("application/json")) {
            const text = await response.text();
            const providerPayload = await parseJsonMaybe(text);
            if (!response.ok) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "PRV_HUGGINGFACE_IMAGE_FAILED",
                        error: extractProviderError(
                            providerPayload,
                            "Hugging Face image generation failed.",
                        ),
                    },
                    { status: response.status >= 500 ? 502 : 422 },
                );
            }
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "PRV_HUGGINGFACE_IMAGE_EMPTY",
                    error: "Hugging Face returned JSON instead of an image.",
                    providerPayload,
                },
                { status: 502 },
            );
        }

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "PRV_HUGGINGFACE_IMAGE_FAILED",
                    error: text || "Hugging Face image generation failed.",
                },
                { status: response.status >= 500 ? 502 : 422 },
            );
        }

        const imageBytes = Buffer.from(await response.arrayBuffer());
        const mimeType = contentType.startsWith("image/")
            ? contentType.split(";")[0]
            : "image/png";

        return NextResponse.json({
            ok: true,
            data: {
                imageDataUrl: toDataUrl(imageBytes, mimeType),
                mimeType,
                byteLength: imageBytes.byteLength,
                model,
                prompt,
                negativePrompt,
                settings: {
                    width,
                    height,
                    steps,
                    guidanceScale,
                    seed: seed ?? null,
                },
            },
        });
    } catch (error) {
        if (error instanceof AiProviderError) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: error.errorCode,
                    error: error.message,
                },
                { status: error.statusCode },
            );
        }
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_HUGGINGFACE_IMAGE_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Hugging Face image generation failed.",
            },
            { status: 500 },
        );
    }
}
