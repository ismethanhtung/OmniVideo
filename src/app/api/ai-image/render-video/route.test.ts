import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { generateVoiceFromSegments } from "@/lib/multilingual-audio/piper-tts";

import { POST, setAiImageRenderRouteTestHooks } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/multilingual-audio/piper-tts", () => ({
    generateVoiceFromSegments: vi.fn(),
}));

vi.mock("@/lib/multilingual-audio/audio-extraction", () => ({
    resolveFfmpegPath: vi.fn(() => "ffmpeg"),
}));

const mockedRequireWriteAccess = vi.mocked(requireWriteAccess);
const mockedGenerateVoiceFromSegments = vi.mocked(generateVoiceFromSegments);

describe("AI Image Studio video render route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedRequireWriteAccess.mockReturnValue(null);
        mockedGenerateVoiceFromSegments.mockResolvedValue({
            audioBase64: Buffer.from("voice").toString("base64"),
            mimeType: "audio/wav",
            extension: "wav",
            byteLength: 5,
            durationMs: 10,
            settings: {
                modelPath: "",
                speaker: 0,
                lengthScale: 1,
                noiseScale: 0.667,
                noiseW: 0.8,
                sentenceSilence: 0.2,
            },
            provider: {
                name: "piper",
                mode: "local-cli",
            },
            alignment: [],
            diagnostics: [],
        } as never);
        setAiImageRenderRouteTestHooks({
            runFfmpeg: vi.fn(async () => undefined),
            readOutputFile: vi.fn(async () => Buffer.from("video")),
        });
    });

    it("renders storyboard scenes into a base64 MP4 payload", async () => {
        const formData = new FormData();
        formData.append(
            "scenesJson",
            JSON.stringify([
                {
                    id: 1,
                    time: "00:00 - 00:06",
                    visual: "Street scene",
                    voiceover: "Cô tưởng tình yêu đã nhạt đi.",
                },
                {
                    id: 2,
                    time: "00:06 - 00:18",
                    visual: "Old coat scene",
                    voiceover: "Anh giữ lại chiếc áo khoác cũ.",
                },
            ]),
        );
        formData.append(
            "sceneImage-1",
            new File([Buffer.from("image-1")], "scene-1.jpg", {
                type: "image/jpeg",
            }),
        );
        formData.append(
            "sceneImage-2",
            new File([Buffer.from("image-2")], "scene-2.png", {
                type: "image/png",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/ai-image/render-video", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.mimeType).toBe("video/mp4");
        expect(payload.data.videoBase64).toBe(
            Buffer.from("video").toString("base64"),
        );
        expect(payload.data.sceneCount).toBe(2);
        expect(payload.data.durationSeconds).toBe(18);
        expect(mockedGenerateVoiceFromSegments).toHaveBeenCalledWith(
            expect.objectContaining({
                segments: [
                    {
                        id: 1,
                        start: 0,
                        end: 6,
                        text: "Cô tưởng tình yêu đã nhạt đi.",
                    },
                    {
                        id: 2,
                        start: 6,
                        end: 18,
                        text: "Anh giữ lại chiếc áo khoác cũ.",
                    },
                ],
            }),
        );
    });

    it("rejects render when a scene image is missing", async () => {
        const formData = new FormData();
        formData.append(
            "scenesJson",
            JSON.stringify([
                {
                    id: 1,
                    time: "00:00 - 00:06",
                    voiceover: "Một cảnh thiếu ảnh.",
                },
            ]),
        );

        const response = await POST(
            new Request("http://localhost/api/ai-image/render-video", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.errorCode).toBe("VAL_AI_IMAGE_SCENE_IMAGE_REQUIRED");
        expect(mockedGenerateVoiceFromSegments).not.toHaveBeenCalled();
    });
});
