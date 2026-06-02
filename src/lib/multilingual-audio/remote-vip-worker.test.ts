import { describe, expect, it, vi } from "vitest";

import {
    runRemoteVideoVipRender,
    runRemoteVideoVipVoiceRender,
} from "./remote-vip-worker";

const baseInput = {
    fileName: "source.mp4",
    mimeType: "video/mp4",
    fileSizeBytes: 3,
    fileBytes: new Uint8Array([1, 2, 3]),
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
};

describe("remote VIP worker client", () => {
    it("uploads source video as multipart and downloads rendered artifact bytes", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        artifactId: "artifact-1",
                        mimeType: "video/mp4",
                        extension: "mp4",
                        fileName: "source-done.mp4",
                        byteLength: 12,
                        generationDurationMs: 100,
                        voice: {
                            mimeType: "audio/wav",
                            extension: "wav",
                            fileName: "voice.wav",
                            byteLength: 10,
                            segmentCount: 1,
                            generationDurationMs: 50,
                            alignment: { mode: "timeline", chunks: 1 },
                            settings: { binaryPath: "piper", modelPath: "" },
                            provider: { name: "piper", mode: "local-cli" },
                        },
                        stages: {
                            voiceDurationMs: 50,
                            finalRenderDurationMs: 40,
                        },
                        mix: { originalAudioVolume: 0, voiceVolume: 1 },
                    },
                }),
            )
            .mockResolvedValueOnce(
                new Response(Buffer.from("remote-video"), {
                    status: 200,
                    headers: { "Content-Type": "video/mp4" },
                }),
            );

        const result = await runRemoteVideoVipRender(baseInput, {
            endpoint: "http://worker.example/",
            token: "secret",
            fetchImpl,
        });

        expect(fetchImpl).toHaveBeenCalledTimes(2);
        const [postUrl, postInit] = fetchImpl.mock.calls[0];
        expect(postUrl).toBe(
            "http://worker.example/api/audio/video-vip-voice-render",
        );
        expect(postInit?.headers).toMatchObject({
            Authorization: "Bearer secret",
        });
        expect(postInit?.body).toBeInstanceOf(FormData);

        const formData = postInit?.body as FormData;
        expect(formData.get("async")).toBe("1");
        const payloadJson = formData.get("payloadJson");
        expect(typeof payloadJson).toBe("string");
        expect(payloadJson).not.toContain("fileBase64");
        expect(payloadJson).not.toContain("fileBytes");
        expect(payloadJson).not.toContain("voiceAudioBase64");
        expect(JSON.parse(payloadJson as string)).toMatchObject({
            executionMode: "render-only",
        });
        const videoFile = formData.get("videoFile") as File;
        expect(videoFile.name).toBe("source.mp4");
        expect(Array.from(new Uint8Array(await videoFile.arrayBuffer()))).toEqual([
            1, 2, 3,
        ]);
        const voiceFile = formData.get("voiceFile") as File;
        expect(voiceFile.name).toBe("voice.wav");
        expect(await voiceFile.text()).toBe("voice");

        expect(fetchImpl.mock.calls[1][0]).toBe(
            "http://worker.example/api/workspace/artifacts/artifact-1/download",
        );
        expect(result.videoBytes?.toString()).toBe("remote-video");
        expect(result.fileName).toBe("source-done.mp4");
    });

    it("polls async worker jobs before downloading rendered artifact bytes", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json(
                    {
                        ok: true,
                        data: {
                            jobId: "job-1",
                            status: "running",
                        },
                    },
                    { status: 202 },
                ),
            )
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        jobId: "job-1",
                        status: "running",
                    },
                }),
            )
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        jobId: "job-1",
                        status: "done",
                        result: {
                            artifactId: "artifact-async",
                            mimeType: "video/mp4",
                            extension: "mp4",
                            fileName: "source-done.mp4",
                            byteLength: 18,
                            generationDurationMs: 100,
                            stages: {
                                finalRenderDurationMs: 40,
                            },
                            mix: { originalAudioVolume: 0, voiceVolume: 1 },
                        },
                    },
                }),
            )
            .mockResolvedValueOnce(
                new Response(Buffer.from("async-remote-video"), {
                    status: 200,
                    headers: { "Content-Type": "video/mp4" },
                }),
            );

        const result = await runRemoteVideoVipRender(baseInput, {
            endpoint: "http://worker.example/",
            token: "secret",
            fetchImpl,
            pollIntervalMs: 0,
        });

        expect(fetchImpl).toHaveBeenCalledTimes(4);
        expect(fetchImpl.mock.calls[1][0]).toBe(
            "http://worker.example/api/audio/video-vip-voice-render?jobId=job-1",
        );
        expect(fetchImpl.mock.calls[2][0]).toBe(
            "http://worker.example/api/audio/video-vip-voice-render?jobId=job-1",
        );
        expect(fetchImpl.mock.calls[3][0]).toBe(
            "http://worker.example/api/workspace/artifacts/artifact-async/download",
        );
        expect(result.videoBytes?.toString()).toBe("async-remote-video");
    });

    it("maps async worker job failures to VIP mux errors", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json(
                    {
                        ok: true,
                        data: {
                            jobId: "job-failed",
                            status: "running",
                        },
                    },
                    { status: 202 },
                ),
            )
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        jobId: "job-failed",
                        status: "failed",
                        error: "piper failed",
                    },
                }),
            );

        await expect(
            runRemoteVideoVipRender(baseInput, {
                endpoint: "http://worker.example",
                fetchImpl,
                pollIntervalMs: 0,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            message: "piper failed",
        });
    });

    it("uploads source video and transcript payload for EC2 voice plus render", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        artifactId: "artifact-voice-render",
                        mimeType: "video/mp4",
                        extension: "mp4",
                        fileName: "source-done.mp4",
                        byteLength: 12,
                        generationDurationMs: 100,
                        voice: {
                            mimeType: "audio/wav",
                            extension: "wav",
                            fileName: "voice.wav",
                            byteLength: 10,
                            segmentCount: 1,
                            generationDurationMs: 50,
                            alignment: { mode: "timeline", chunks: 1 },
                            settings: { binaryPath: "piper", modelPath: "" },
                            provider: { name: "piper", mode: "local-cli" },
                        },
                        stages: {
                            voiceDurationMs: 50,
                            finalRenderDurationMs: 40,
                        },
                        mix: { originalAudioVolume: 0, voiceVolume: 1 },
                    },
                }),
            )
            .mockResolvedValueOnce(
                new Response(Buffer.from("voice-render-video"), {
                    status: 200,
                    headers: { "Content-Type": "video/mp4" },
                }),
            );

        const result = await runRemoteVideoVipVoiceRender(
            {
                fileName: "source.mp4",
                mimeType: "video/mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
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
                    translatedSegments: baseInput.translatedSegments,
                    generationDurationMs: 1,
                    chunks: [],
                    provider: { name: "test" },
                },
                ttsSettings: { binaryPath: "piper", modelPath: "" },
            },
            {
                endpoint: "http://worker.example/",
                token: "secret",
                fetchImpl,
            },
        );

        const [, postInit] = fetchImpl.mock.calls[0];
        const formData = postInit?.body as FormData;
        const payloadJson = formData.get("payloadJson");
        expect(JSON.parse(payloadJson as string)).toMatchObject({
            executionMode: "voice-render",
            transcript: { text: "你好" },
            translation: {
                translatedSegments: [
                    expect.objectContaining({ translatedText: "Xin chào" }),
                ],
            },
            ttsSettings: { binaryPath: "piper", modelPath: "" },
        });
        expect(formData.get("voiceFile")).toBeNull();
        expect(result.videoBytes?.toString()).toBe("voice-render-video");
        expect(result.voice.byteLength).toBe(10);
    });

    it("maps remote artifact download failures to VIP mux errors", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        artifactId: "missing",
                        mimeType: "video/mp4",
                        extension: "mp4",
                        fileName: "source-done.mp4",
                        byteLength: 12,
                        generationDurationMs: 100,
                        voice: {
                            mimeType: "audio/wav",
                            extension: "wav",
                            fileName: "voice.wav",
                            byteLength: 10,
                            segmentCount: 1,
                            generationDurationMs: 50,
                            alignment: { mode: "timeline", chunks: 1 },
                            settings: { binaryPath: "piper", modelPath: "" },
                            provider: { name: "piper", mode: "local-cli" },
                        },
                        stages: {
                            voiceDurationMs: 50,
                            finalRenderDurationMs: 40,
                        },
                        mix: { originalAudioVolume: 0, voiceVolume: 1 },
                    },
                }),
            )
            .mockResolvedValueOnce(
                Response.json({ ok: false, error: "missing" }, { status: 404 }),
            );

        await expect(
            runRemoteVideoVipRender(baseInput, {
                endpoint: "http://worker.example",
                fetchImpl,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            status: 404,
        });
    });
});
