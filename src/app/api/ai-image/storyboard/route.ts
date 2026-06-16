import { NextResponse } from "next/server";

import {
    requireOwnerForProviderAccount,
    requireWriteAccess,
} from "@/lib/access-control/route-guards";
import { chatCompletion } from "@/lib/ai-providers/client";
import {
    getAiProviderById,
    getAiProvidersDb,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";

export const runtime = "nodejs";

const DEFAULT_MODEL = "gemini-2.5-pro";
const MAX_CONTEXT_CHARS = 16000;

type StoryboardScene = {
    id: number;
    time: string;
    visual: string;
    voiceover: string;
};

type StoryboardResult = {
    title: string;
    category: string;
    summary: string;
    scenes: StoryboardScene[];
};

function readString(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    return typeof value === "string" ? value.trim() : "";
}

function readNumber(
    payload: Record<string, unknown>,
    key: string,
    fallback: number,
    min: number,
    max: number,
) {
    const parsed = Number(payload[key]);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeBaseUrl(value: string) {
    return value.trim().replace(/\/+$/u, "");
}

function extractJsonText(value: string) {
    const trimmed = value.trim();
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/u);
    if (fenced?.[1]) return fenced[1].trim();

    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
}

function parseStoryboardModelText(value: string): StoryboardResult {
    const payload = JSON.parse(extractJsonText(value)) as {
        title?: unknown;
        category?: unknown;
        summary?: unknown;
        scenes?: Array<{
            id?: unknown;
            time?: unknown;
            visual?: unknown;
            voiceover?: unknown;
        }>;
    };
    const scenes = Array.isArray(payload.scenes)
        ? payload.scenes
              .map((scene, index) => ({
                  id:
                      typeof scene.id === "number" && Number.isFinite(scene.id)
                          ? Math.round(scene.id)
                          : index + 1,
                  time:
                      typeof scene.time === "string"
                          ? scene.time.trim()
                          : "",
                  visual:
                      typeof scene.visual === "string"
                          ? scene.visual.trim()
                          : "",
                  voiceover:
                      typeof scene.voiceover === "string"
                          ? scene.voiceover.trim()
                          : "",
              }))
              .filter((scene) => scene.time && scene.visual && scene.voiceover)
        : [];

    if (scenes.length === 0) {
        throw new Error("Storyboard response did not include valid scenes.");
    }

    return {
        title:
            typeof payload.title === "string" && payload.title.trim()
                ? payload.title.trim()
                : "Untitled storyboard",
        category:
            typeof payload.category === "string" && payload.category.trim()
                ? payload.category.trim()
                : "story",
        summary:
            typeof payload.summary === "string" && payload.summary.trim()
                ? payload.summary.trim()
                : "",
        scenes,
    };
}

function buildStoryboardPrompt(input: {
    category: string;
    ideaPrompt: string;
    improvementPrompt: string;
    targetDurationSec: number;
    sceneCount: number;
    previousStoryboard: string;
}) {
    const previous = input.previousStoryboard
        ? `Existing storyboard to revise:\n${input.previousStoryboard.slice(0, MAX_CONTEXT_CHARS)}`
        : "";
    const improvement = input.improvementPrompt
        ? `User instruction for retry/improvement:\n${input.improvementPrompt}`
        : "";

    return [
        "Bạn là biên kịch video ngắn tiếng Việt cho nội dung cảm xúc, bài học nhân sinh, triết lý sống và câu chuyện đời thường.",
        "Hãy tạo bảng phân cảnh chi tiết để người dùng có thể copy từng cảnh sang ChatGPT/Gemini tạo ảnh, sau đó ghép thành video có voiceover.",
        `Thể loại: ${input.category}`,
        `Độ dài mục tiêu: khoảng ${input.targetDurationSec} giây.`,
        `Số phân cảnh: ${input.sceneCount}.`,
        input.ideaPrompt
            ? `Ý tưởng/chủ đề người dùng đưa:\n${input.ideaPrompt}`
            : "Nếu người dùng chưa đưa ý tưởng cụ thể, hãy tự tạo một câu chuyện có hook mạnh, cao trào rõ, kết luận đáng nhớ.",
        improvement,
        previous,
        "Yêu cầu nội dung:",
        "- Mỗi cảnh phải có time range dạng 00:00 - 00:06.",
        "- Visual phải đủ cụ thể để copy sang công cụ tạo ảnh: nhân vật, cảm xúc, bối cảnh, ánh sáng, hành động, chữ trên màn hình nếu có.",
        "- Voiceover là lời đọc tiếng Việt tự nhiên, giàu cảm xúc, phù hợp thời lượng cảnh.",
        "- Không viết lan man. Không thêm markdown.",
        'Chỉ trả JSON hợp lệ theo schema: {"title":"...","category":"...","summary":"...","scenes":[{"id":1,"time":"00:00 - 00:06","visual":"...","voiceover":"..."}]}',
    ]
        .filter(Boolean)
        .join("\n\n");
}

async function generateWithEnvGemini(input: { model: string; prompt: string }) {
    const apiKey =
        process.env.GEMINI_API_KEY?.trim() ||
        process.env.GOOGLE_API_KEY?.trim() ||
        "";
    if (!apiKey) {
        throw new Error("Google AI Studio API key is missing.");
    }
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: input.prompt }],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                },
            }),
        },
    );
    const payload = (await response.json().catch(() => ({}))) as {
        candidates?: Array<{
            content?: { parts?: Array<{ text?: string }> };
        }>;
        error?: { message?: string };
    };
    if (!response.ok) {
        throw new AiProviderError({
            errorCode: "PRV_AI_STORYBOARD_FAILED",
            message:
                payload.error?.message ??
                `Storyboard generation failed (HTTP ${response.status}).`,
            statusCode:
                response.status >= 400 && response.status < 500 ? 422 : 502,
        });
    }
    return payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

export async function POST(request: Request) {
    try {
        const writeDenied = requireWriteAccess(request);
        if (writeDenied) return writeDenied;

        const payload = (await request.json()) as Record<string, unknown>;
        const category = readString(payload, "category") || "Bài học nhân sinh";
        const ideaPrompt = readString(payload, "ideaPrompt");
        const improvementPrompt = readString(payload, "improvementPrompt");
        const previousStoryboard = readString(payload, "previousStoryboard");
        const providerId = readString(payload, "providerId") || "env-gemini";
        const model = readString(payload, "model") || DEFAULT_MODEL;
        const targetDurationSec = readNumber(
            payload,
            "targetDurationSec",
            60,
            20,
            240,
        );
        const sceneCount = readNumber(payload, "sceneCount", 5, 3, 12);

        const providerAccessDenied = requireOwnerForProviderAccount(
            request,
            providerId === "env-gemini" ? undefined : providerId,
        );
        if (providerAccessDenied) return providerAccessDenied;

        const prompt = buildStoryboardPrompt({
            category,
            ideaPrompt,
            improvementPrompt,
            targetDurationSec,
            sceneCount,
            previousStoryboard,
        });

        let modelText = "";
        if (providerId === "env-gemini") {
            modelText = await generateWithEnvGemini({ model, prompt });
        } else {
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            const response = await chatCompletion(
                {
                    baseUrl: normalizeBaseUrl(provider.baseUrl),
                    apiKey: provider.apiKey,
                },
                {
                    model,
                    temperature: 0.75,
                    response_format: { type: "json_object" },
                    messages: [
                        {
                            role: "system",
                            content:
                                "Return valid JSON only. Do not include markdown.",
                        },
                        { role: "user", content: prompt },
                    ],
                },
            );
            modelText = response.choices?.[0]?.message?.content ?? "";
        }

        const storyboard = parseStoryboardModelText(modelText);
        return NextResponse.json({
            ok: true,
            data: {
                ...storyboard,
                providerId,
                model,
                targetDurationSec,
                sceneCount: storyboard.scenes.length,
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
                errorCode: "SYS_AI_STORYBOARD_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Storyboard generation failed.",
            },
            { status: 500 },
        );
    }
}
