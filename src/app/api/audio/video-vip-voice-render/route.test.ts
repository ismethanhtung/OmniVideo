import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    runVideoVipRemoteRender,
    runVideoVipVoiceRender,
} from "@/lib/multilingual-audio/video-vip-processing";
import {
    clearWorkspaceServerArtifactsForTest,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

import { GET, POST } from "./route";

vi.mock("@/lib/multilingual-audio/video-vip-processing", () => ({
    renderVipCompositeVideo: vi.fn(),
    runVideoVipRemoteRender: vi.fn(),
    runVideoVipVoiceRender: vi.fn(),
}));

const mockedRunVideoVipRemoteRender = vi.mocked(runVideoVipRemoteRender);
const mockedRunVideoVipVoiceRender = vi.mocked(runVideoVipVoiceRender);

describe("video vip voice/render worker API", () => {
    beforeEach(() => {
        mockedRunVideoVipRemoteRender.mockReset();
        mockedRunVideoVipVoiceRender.mockReset();
        delete process.env.OMNIVIDEO_REMOTE_VIP_TOKEN;
    });

    afterEach(() => {
        clearWorkspaceServerArtifactsForTest();
    });

    it("exposes a lightweight health check", async () => {
        const response = GET(
            new Request("http://localhost/api/audio/video-vip-voice-render"),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            ok: true,
            service: "omnivideo-vip-voice-render",
        });
    });

    it("rejects invalid worker tokens when token is configured", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";

        const response = await POST(
            new Request("http://localhost/api/audio/video-vip-voice-render", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({}),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(401);
        expect(payload).toMatchObject({ ok: false });
        expect(mockedRunVideoVipRemoteRender).not.toHaveBeenCalled();
        expect(mockedRunVideoVipVoiceRender).not.toHaveBeenCalled();
    });

    it("runs render with decoded legacy JSON video and voice bytes and returns an artifact id", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipRemoteRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("done"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 4,
            generationDurationMs: 100,
            stages: {
                finalRenderDurationMs: 40,
            },
            mix: {
                originalAudioVolume: 0,
                voiceVolume: 1,
            },
        });

        const response = await POST(
            new Request("http://localhost/api/audio/video-vip-voice-render", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer secret",
                },
                body: JSON.stringify({
                    fileName: "source.mp4",
                    fileBase64: Buffer.from([1, 2, 3]).toString("base64"),
                    voiceBase64: Buffer.from("voice").toString("base64"),
                    translatedSegments: [
                        {
                            id: 0,
                            start: 0,
                            end: 1,
                            sourceText: "你好",
                            translatedText: "Xin chào",
                        },
                    ],
                    renderPreset: "veryfast",
                }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            ok: true,
            data: {
                fileName: "source-done.mp4",
                artifactId: expect.any(String),
            },
        });
        expect(payload.data.videoBase64).toBeUndefined();
        const artifact = getWorkspaceServerArtifact(payload.data.artifactId);
        expect(artifact?.bytes.toString()).toBe("done");
        expect(mockedRunVideoVipRemoteRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: Buffer.from([1, 2, 3]),
                voiceAudioBase64: Buffer.from("voice").toString("base64"),
                translatedSegments: [
                    {
                        id: 0,
                        start: 0,
                        end: 1,
                        sourceText: "你好",
                        translatedText: "Xin chào",
                    },
                ],
                renderPreset: "veryfast",
                omitVideoBase64: true,
            }),
        );
    });

    it("runs render with multipart video and voice upload without requiring base64 media", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipRemoteRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("multipart-done"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 14,
            generationDurationMs: 100,
            stages: {
                finalRenderDurationMs: 40,
            },
            mix: {
                originalAudioVolume: 0,
                voiceVolume: 1,
            },
        });

        const formData = new FormData();
        formData.set(
            "payloadJson",
            JSON.stringify({
                fileName: "source.mp4",
                translatedSegments: [
                    {
                        id: 0,
                        start: 0,
                        end: 1,
                        sourceText: "你好",
                        translatedText: "Xin chào",
                    },
                ],
            }),
        );
        formData.set(
            "videoFile",
            new File([new Uint8Array([4, 5, 6])], "source.mp4", {
                type: "video/mp4",
            }),
        );
        formData.set(
            "voiceFile",
            new File([Buffer.from("voice")], "voice.wav", {
                type: "audio/wav",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/audio/video-vip-voice-render", {
                method: "POST",
                headers: { Authorization: "Bearer secret" },
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data).toMatchObject({
            artifactId: expect.any(String),
            byteLength: 14,
        });
        expect(payload.data.videoBase64).toBeUndefined();
        expect(mockedRunVideoVipRemoteRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: new Uint8Array([4, 5, 6]),
                voiceAudioBase64: Buffer.from("voice").toString("base64"),
                omitVideoBase64: true,
            }),
        );
    });

    it("starts async worker jobs and exposes completed status by job id", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipRemoteRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("async-done"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 10,
            generationDurationMs: 100,
            stages: {
                finalRenderDurationMs: 40,
            },
            mix: {
                originalAudioVolume: 0,
                voiceVolume: 1,
            },
        });

        const formData = new FormData();
        formData.set("async", "1");
        formData.set(
            "payloadJson",
            JSON.stringify({
                fileName: "source.mp4",
                translatedSegments: [
                    {
                        id: 0,
                        start: 0,
                        end: 1,
                        sourceText: "你好",
                        translatedText: "Xin chào",
                    },
                ],
            }),
        );
        formData.set(
            "videoFile",
            new File([new Uint8Array([4, 5, 6])], "source.mp4", {
                type: "video/mp4",
            }),
        );
        formData.set(
            "voiceFile",
            new File([Buffer.from("voice")], "voice.wav", {
                type: "audio/wav",
            }),
        );

        const startResponse = await POST(
            new Request("http://localhost/api/audio/video-vip-voice-render", {
                method: "POST",
                headers: { Authorization: "Bearer secret" },
                body: formData,
            }),
        );
        const startPayload = await startResponse.json();
        await Promise.resolve();

        expect(startResponse.status).toBe(202);
        expect(startPayload.data).toMatchObject({
            jobId: expect.any(String),
            status: "running",
        });

        const statusResponse = GET(
            new Request(
                `http://localhost/api/audio/video-vip-voice-render?jobId=${startPayload.data.jobId}`,
                {
                    headers: { Authorization: "Bearer secret" },
                },
            ),
        );
        const statusPayload = await statusResponse.json();

        expect(statusResponse.status).toBe(200);
        expect(statusPayload.data).toMatchObject({
            jobId: startPayload.data.jobId,
            status: "done",
            result: {
                artifactId: expect.any(String),
                byteLength: 10,
            },
        });
    });

    it("runs EC2 voice plus render with multipart video and transcript payload", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipVoiceRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("voice-render-done"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 17,
            generationDurationMs: 100,
            voice: {
                mimeType: "audio/wav",
                extension: "wav",
                fileName: "voice.wav",
                byteLength: 8,
                segmentCount: 1,
                generationDurationMs: 40,
                alignment: { mode: "timeline", chunks: 1 },
                settings: { binaryPath: "piper", modelPath: "" },
                provider: { name: "piper", mode: "local-cli" },
            },
            stages: {
                voiceDurationMs: 40,
                finalRenderDurationMs: 50,
            },
            mix: {
                originalAudioVolume: 0,
                voiceVolume: 1,
            },
        });

        const formData = new FormData();
        formData.set(
            "payloadJson",
            JSON.stringify({
                executionMode: "voice-render",
                fileName: "source.mp4",
                transcript: {
                    text: "你好",
                    language: "zh",
                    model: "whisper-large-v3-turbo",
                    segments: [{ id: 0, start: 0, end: 1, text: "你好" }],
                    words: [],
                    source: { fileName: "source.mp4", fileSizeBytes: 3 },
                    audio: {
                        format: "mp3",
                        sampleRate: 16000,
                        channels: 1,
                        bitrateKbps: 64,
                        fileSizeBytes: 3,
                    },
                    steps: [],
                    provider: { name: "groq" },
                },
                translation: {
                    sourceLanguage: "zh",
                    targetLanguage: "vi",
                    model: "test-model",
                    translatedSegments: [
                        {
                            id: 0,
                            start: 0,
                            end: 1,
                            sourceText: "你好",
                            translatedText: "Xin chào",
                        },
                    ],
                    generationDurationMs: 1,
                    chunks: [],
                    provider: { name: "test" },
                },
                ttsSettings: { binaryPath: "piper", modelPath: "" },
            }),
        );
        formData.set(
            "videoFile",
            new File([new Uint8Array([4, 5, 6])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/audio/video-vip-voice-render", {
                method: "POST",
                headers: { Authorization: "Bearer secret" },
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data).toMatchObject({
            artifactId: expect.any(String),
            byteLength: 17,
        });
        expect(mockedRunVideoVipRemoteRender).not.toHaveBeenCalled();
        expect(mockedRunVideoVipVoiceRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: new Uint8Array([4, 5, 6]),
                transcript: expect.objectContaining({ text: "你好" }),
                translation: expect.objectContaining({
                    translatedSegments: [
                        expect.objectContaining({ translatedText: "Xin chào" }),
                    ],
                }),
                ttsSettings: { binaryPath: "piper", modelPath: "" },
                omitVideoBase64: true,
            }),
        );
    });
});
