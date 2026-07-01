import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    runVideoVipRemoteRender,
    runVideoVipVoiceRender,
} from "@/lib/multilingual-audio/video-vip-processing";
import {
    clearWorkspaceServerArtifactsForTest,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

import { DELETE, GET, POST, maxDuration } from "./route";

vi.mock("node:child_process", () => ({
    execFileSync: vi.fn(() => ""),
}));

vi.mock("@/lib/multilingual-audio/video-vip-processing", () => ({
    renderVipCompositeVideo: vi.fn(),
    runVideoVipRemoteRender: vi.fn(),
    runVideoVipVoiceRender: vi.fn(),
}));

const mockedExecFileSync = vi.mocked(execFileSync);
const mockedRunVideoVipRemoteRender = vi.mocked(runVideoVipRemoteRender);
const mockedRunVideoVipVoiceRender = vi.mocked(runVideoVipVoiceRender);

describe("video vip voice/render worker API", () => {
    beforeEach(() => {
        mockedExecFileSync.mockReset();
        mockedExecFileSync.mockReturnValue("");
        mockedRunVideoVipRemoteRender.mockReset();
        mockedRunVideoVipVoiceRender.mockReset();
        vi.stubGlobal(
            "fetch",
            vi.fn(async () => new Response("", { status: 404 })),
        );
        delete process.env.OMNIVIDEO_REMOTE_VIP_TOKEN;
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        clearWorkspaceServerArtifactsForTest();
    });

    it("declares a long Vercel max duration for worker jobs", () => {
        expect(maxDuration).toBe(300);
    });

    it("exposes a lightweight health check", async () => {
        const response = await GET(
            new Request("http://localhost/api/audio/video-vip-voice-render"),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            ok: true,
            service: "omnivideo-vip-voice-render",
            capabilities: {
                sourceChunkUpload: true,
                sourceUploadReference: true,
            },
            data: {
                jobs: [],
                activeProcesses: [],
                systemProcesses: expect.any(Array),
                ec2: null,
                top: null,
            },
        });
    });

    it("omits heavyweight completed job results from general health status", async () => {
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
        const formData = new FormData();
        formData.set(
            "payloadJson",
            JSON.stringify({
                executionMode: "render-only",
                fileName: "source.mp4",
                translatedSegments: [],
            }),
        );
        formData.set("async", "1");
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
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
        await vi.waitFor(async () => {
            const jobResponse = await GET(
                new Request(
                    `http://localhost/api/audio/video-vip-voice-render?jobId=${startPayload.data.jobId}`,
                    { headers: { Authorization: "Bearer secret" } },
                ),
            );
            const jobPayload = await jobResponse.json();
            expect(jobPayload.data.status).toBe("done");
        });

        const response = await GET(
            new Request("http://localhost/api/audio/video-vip-voice-render"),
        );
        const payload = await response.json();

        expect(payload.data.jobs[0].result).toBeUndefined();
        expect(payload.data.jobs[0].resultSummary).toMatchObject({
            fileName: "source-done.mp4",
            byteLength: 4,
            artifactId: expect.any(String),
        });
    });

    it("exposes EC2 metadata and top snapshot when available", async () => {
        const fetchMock = vi.fn(async (url: string | URL) => {
            const value = String(url);
            if (value.endsWith("/latest/api/token")) {
                return new Response("token");
            }
            if (value.endsWith("/meta-data/instance-id")) {
                return new Response("i-1234567890");
            }
            if (value.endsWith("/meta-data/instance-type")) {
                return new Response("c8g.xlarge");
            }
            if (value.endsWith("/meta-data/public-ipv4")) {
                return new Response("1.2.3.4");
            }
            if (value.endsWith("/meta-data/local-ipv4")) {
                return new Response("10.0.0.12");
            }
            if (value.endsWith("/dynamic/instance-identity/document")) {
                return Response.json({
                    region: "ap-east-1",
                    availabilityZone: "ap-east-1a",
                });
            }
            return new Response("", { status: 404 });
        });
        vi.stubGlobal("fetch", fetchMock);
        mockedExecFileSync.mockImplementation((command, args) => {
            if (command === "top") {
                expect(args).toEqual(["-b", "-n", "1", "-w", "160"]);
                return Buffer.from(
                    "top - 10:00:00 up 1 min, 1 user, load average: 3.00, 2.00, 1.00\n%Cpu(s): 95.0 us, 5.0 sy\n",
                );
            }
            return Buffer.from("");
        });

        const response = await GET(
            new Request("http://localhost/api/audio/video-vip-voice-render"),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.ec2).toMatchObject({
            instanceId: "i-1234567890",
            instanceType: "c8g.xlarge",
            region: "ap-east-1",
            availabilityZone: "ap-east-1a",
            publicIp: "1.2.3.4",
            privateIp: "10.0.0.12",
        });
        expect(payload.data.top.lines).toEqual([
            "top - 10:00:00 up 1 min, 1 user, load average: 3.00, 2.00, 1.00",
            "%Cpu(s): 95.0 us, 5.0 sy",
        ]);
    });

    it("keeps default Piper model URLs in the EC2 launcher while allowing env override", () => {
        const source = readFileSync("omnivideo-vip-spot.sh", "utf8");

        expect(source).toContain(
            'DEFAULT_PIPER_MODEL_URL="https://drive.google.com/file/d/1F9rYPsYJ4--fEQ6A7Tv0Wxy1IVvHqzhb/view?usp=sharing"',
        );
        expect(source).toContain(
            'DEFAULT_PIPER_MODEL_CONFIG_URL="https://drive.google.com/file/d/1qDZm60pX3-n6ODYixbTmL_VeAndVtMML/view?usp=sharing"',
        );
        expect(source).toContain(
            'PIPER_MODEL_URL="${PIPER_MODEL_URL:-$DEFAULT_PIPER_MODEL_URL}"',
        );
        expect(source).toContain(
            'PIPER_MODEL_CONFIG_URL="${PIPER_MODEL_CONFIG_URL:-$DEFAULT_PIPER_MODEL_CONFIG_URL}"',
        );
    });

    it("classifies final VIP ffmpeg render processes from system ffmpeg", async () => {
        mockedExecFileSync.mockReturnValue(
            Buffer.from(
                "23211 02:30 100.0 0.8 /usr/bin/ffmpeg -y -i /tmp/omnivideo-vip-abc/source.mp4 -filter_complex [vout] /tmp/omnivideo-vip-abc/vip.mp4\n",
            ),
        );

        const response = await GET(
            new Request("http://localhost/api/audio/video-vip-voice-render"),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.systemProcesses).toEqual([
            expect.objectContaining({
                pid: 23211,
                kind: "ffmpeg",
                cpuPercent: 100,
                memoryPercent: 0.8,
                command: expect.stringContaining("omnivideo-vip-abc"),
            }),
        ]);
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
                backgroundMusic: {
                    enabled: true,
                    volume: 0.2,
                    tracks: [
                        {
                            source: "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3",
                            label: "Across the Rivers of Asia",
                            startSeconds: 0,
                            volume: 1,
                            repeat: true,
                        },
                    ],
                },
                translatedSegments: [
                    {
                        id: 0,
                        start: 0,
                        end: 1,
                        sourceText: "你好",
                        translatedText: "Xin chào",
                    },
                ],
                originalAudioSourceMode: "vocals",
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
        formData.set(
            "originalAudioStemFile",
            new File([Buffer.from("vocals")], "vocals.wav", {
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
                originalAudioSourceMode: "vocals",
                originalAudioStem: expect.objectContaining({
                    byteLength: 6,
                    fileName: "vocals.wav",
                }),
                backgroundMusic: expect.objectContaining({
                    enabled: true,
                    volume: 0.2,
                    tracks: [
                        expect.objectContaining({
                            source: "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3",
                            repeat: true,
                        }),
                    ],
                }),
                omitVideoBase64: true,
            }),
        );
    });

    it("runs render from staged source upload chunks", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipRemoteRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("staged-done"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 11,
            generationDurationMs: 100,
            stages: {
                finalRenderDurationMs: 40,
            },
            mix: {
                originalAudioVolume: 0,
                voiceVolume: 1,
            },
        });

        const uploadId = "11111111-1111-4111-8111-111111111111";
        for (const [partIndex, bytes] of [
            [0, new Uint8Array([1, 2])],
            [1, new Uint8Array([3, 4])],
        ] as const) {
            const chunkForm = new FormData();
            chunkForm.set("sourceUploadId", uploadId);
            chunkForm.set("partIndex", String(partIndex));
            chunkForm.set("partCount", "2");
            chunkForm.set("totalBytes", "4");
            chunkForm.set("fileName", "source.mp4");
            chunkForm.set("mimeType", "video/mp4");
            chunkForm.set(
                "chunkFile",
                new File([bytes], `${partIndex}.part`, {
                    type: "application/octet-stream",
                }),
            );
            const chunkResponse = await POST(
                new Request(
                    "http://localhost/api/audio/video-vip-voice-render?sourceUpload=part",
                    {
                        method: "POST",
                        headers: { Authorization: "Bearer secret" },
                        body: chunkForm,
                    },
                ),
            );
            expect(chunkResponse.status).toBe(200);
        }

        const formData = new FormData();
        formData.set(
            "payloadJson",
            JSON.stringify({
                sourceUploadId: uploadId,
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
            byteLength: 11,
        });
        expect(mockedRunVideoVipRemoteRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: new Uint8Array([1, 2, 3, 4]),
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

        const statusResponse = await GET(
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

    it("cancels async worker jobs", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        mockedRunVideoVipRemoteRender.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    setTimeout(() => {
                        resolve({
                            videoBytes: Buffer.from("late-done"),
                            mimeType: "video/mp4",
                            extension: "mp4",
                            fileName: "source-done.mp4",
                            byteLength: 9,
                            generationDurationMs: 100,
                            stages: { finalRenderDurationMs: 40 },
                            mix: { originalAudioVolume: 0, voiceVolume: 1 },
                        });
                    }, 20);
                }),
        );

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

        const cancelResponse = DELETE(
            new Request(
                `http://localhost/api/audio/video-vip-voice-render?jobId=${startPayload.data.jobId}`,
                {
                    method: "DELETE",
                    headers: { Authorization: "Bearer secret" },
                },
            ),
        );
        const cancelPayload = await cancelResponse.json();

        expect(cancelResponse.status).toBe(200);
        expect(cancelPayload.data).toMatchObject({
            cancelledJobs: [startPayload.data.jobId],
            killedProcesses: [],
            killedSystemProcesses: expect.any(Array),
        });

        const statusResponse = await GET(
            new Request(
                `http://localhost/api/audio/video-vip-voice-render?jobId=${startPayload.data.jobId}`,
                {
                    headers: { Authorization: "Bearer secret" },
                },
            ),
        );
        const statusPayload = await statusResponse.json();
        expect(statusPayload.data).toMatchObject({
            status: "failed",
            error: "Remote VIP worker job was cancelled.",
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
