import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    requireOwnerForProviderAccount,
    requireWriteAccess,
} from "@/lib/access-control/route-guards";
import { DEFAULT_GEMINI_TEXT_MODEL } from "@/lib/ai-providers/default-provider";
import { chatCompletion } from "@/lib/ai-providers/client";
import {
    getAiProviderById,
    getAiProvidersDb,
} from "@/lib/ai-providers/repository";

import { POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
    requireOwnerForProviderAccount: vi.fn(() => null),
}));

vi.mock("@/lib/ai-providers/client", () => ({
    chatCompletion: vi.fn(),
}));

vi.mock("@/lib/ai-providers/repository", () => ({
    getAiProvidersDb: vi.fn(),
    getAiProviderById: vi.fn(),
}));

const mockedRequireWriteAccess = vi.mocked(requireWriteAccess);
const mockedRequireOwnerForProviderAccount = vi.mocked(
    requireOwnerForProviderAccount,
);
const mockedChatCompletion = vi.mocked(chatCompletion);
const mockedGetAiProvidersDb = vi.mocked(getAiProvidersDb);
const mockedGetAiProviderById = vi.mocked(getAiProviderById);

const storyboardJson = {
    title: "Chiếc áo khoác cũ",
    category: "Bài học nhân sinh",
    summary: "Tình yêu lâu năm thể hiện bằng sự che chở âm thầm.",
    scenes: [
        {
            id: 1,
            time: "00:00 - 00:06",
            visual: "Cô gái nhìn cặp đôi trẻ trên phố rồi thở dài.",
            voiceover: "Cô tưởng tình yêu của mình đã nhạt đi.",
        },
        {
            id: 2,
            time: "00:06 - 00:18",
            visual: "Cô định vứt chiếc áo khoác cũ, chồng nhặt lại.",
            voiceover: "Anh chỉ nói áo còn tốt, vứt đi phí lắm.",
        },
    ],
};

describe("AI Image storyboard route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mockedRequireWriteAccess.mockReturnValue(null);
        mockedRequireOwnerForProviderAccount.mockReturnValue(null);
        mockedGetAiProvidersDb.mockResolvedValue({} as never);
        mockedGetAiProviderById.mockResolvedValue({
            label: "ChiaseGPU",
            baseUrl: "https://llm.chiasegpu.vn/v1",
            apiKey: "provider-key",
        } as never);
    });

    it("generates storyboard with configured AI provider", async () => {
        mockedChatCompletion.mockResolvedValue({
            id: "chatcmpl-1",
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: JSON.stringify(storyboardJson),
                    },
                    finish_reason: "stop",
                },
            ],
            usage: {
                prompt_tokens: 10,
                completion_tokens: 20,
                total_tokens: 30,
            },
        });

        const response = await POST(
            new Request("http://localhost/api/ai-image/storyboard", {
                method: "POST",
                body: JSON.stringify({
                    category: "Bài học nhân sinh",
                    ideaPrompt: "Tình yêu lâu năm",
                    providerId: "provider-1",
                    model: "gpt-5.5",
                    targetDurationSec: 60,
                    sceneCount: 5,
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.title).toBe("Chiếc áo khoác cũ");
        expect(payload.data.scenes).toHaveLength(2);
        expect(mockedGetAiProviderById).toHaveBeenCalledWith({
            db: {},
            providerId: "provider-1",
        });
        expect(mockedChatCompletion).toHaveBeenCalledWith(
            {
                baseUrl: "https://llm.chiasegpu.vn/v1",
                apiKey: "provider-key",
            },
            expect.objectContaining({
                model: "gpt-5.5",
                response_format: { type: "json_object" },
            }),
        );
    });

    it("supports env Gemini storyboard generation", async () => {
        vi.stubEnv("GEMINI_API_KEY", "gemini-key");
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        candidates: [
                            {
                                content: {
                                    parts: [
                                        {
                                            text: JSON.stringify(
                                                storyboardJson,
                                            ),
                                        },
                                    ],
                                },
                            },
                        ],
                    }),
                    { status: 200 },
                ),
            ),
        );

        const response = await POST(
            new Request("http://localhost/api/ai-image/storyboard", {
                method: "POST",
                body: JSON.stringify({
                    providerId: "env-gemini",
                    model: DEFAULT_GEMINI_TEXT_MODEL,
                    category: "Triết lý sống",
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.providerId).toBe("env-gemini");
        expect(payload.data.model).toBe(DEFAULT_GEMINI_TEXT_MODEL);
        expect(payload.data.scenes[0].visual).toContain("Cô gái");
        expect(vi.mocked(fetch).mock.calls[0][0]).toEqual(
            expect.stringContaining("models/gemini-3.1-flash-lite"),
        );
        expect(mockedRequireOwnerForProviderAccount).toHaveBeenCalledWith(
            expect.any(Request),
            undefined,
        );
    });

    it("rejects model responses without valid scenes", async () => {
        mockedChatCompletion.mockResolvedValue({
            id: "chatcmpl-2",
            choices: [
                {
                    message: {
                        role: "assistant",
                        content: JSON.stringify({ title: "Bad", scenes: [] }),
                    },
                    finish_reason: "stop",
                },
            ],
        });

        const response = await POST(
            new Request("http://localhost/api/ai-image/storyboard", {
                method: "POST",
                body: JSON.stringify({
                    providerId: "provider-1",
                    model: "gpt-5.5",
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(500);
        expect(payload.errorCode).toBe("SYS_AI_STORYBOARD_FAILED");
        expect(payload.error).toContain("valid scenes");
    });
});
