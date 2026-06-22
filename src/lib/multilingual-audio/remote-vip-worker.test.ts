import { EventEmitter } from "node:events";

import { describe, expect, it, vi } from "vitest";

import {
    assertRemoteVipWorkerAvailable,
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

    it("uses Node multipart upload with progress for default remote start requests", async () => {
        const requestBodies: Buffer[] = [];
        const requestMock = vi.fn((_url, _options, onResponse) => {
            const chunks: Buffer[] = [];
            const request = new EventEmitter() as EventEmitter & {
                setTimeout: (timeoutMs: number, callback: () => void) => typeof request;
                write: (chunk: Buffer) => boolean;
                end: (callback?: () => void) => typeof request;
                destroy: (error?: Error) => typeof request;
            };
            request.setTimeout = vi.fn(() => request);
            request.write = vi.fn((chunk: Buffer) => {
                chunks.push(Buffer.from(chunk));
                return true;
            });
            request.end = vi.fn((callback?: () => void) => {
                requestBodies.push(Buffer.concat(chunks));
                callback?.();
                const response = new EventEmitter() as EventEmitter & {
                    statusCode?: number;
                };
                response.statusCode = 200;
                onResponse(response);
                queueMicrotask(() => {
                    response.emit(
                        "data",
                        Buffer.from(
                            JSON.stringify({
                                ok: true,
                                data: {
                                    videoBase64:
                                        Buffer.from("node-video").toString("base64"),
                                    mimeType: "video/mp4",
                                    extension: "mp4",
                                    fileName: "source-done.mp4",
                                    byteLength: 10,
                                    generationDurationMs: 100,
                                    stages: {
                                        finalRenderDurationMs: 40,
                                    },
                                    mix: { originalAudioVolume: 0, voiceVolume: 1 },
                                },
                            }),
                        ),
                    );
                    response.emit("end");
                });
                return request;
            });
            request.destroy = vi.fn((error?: Error) => {
                if (error) request.emit("error", error);
                return request;
            });
            return request;
        });
        vi.doMock("node:http", async () => {
            const actual = await vi.importActual<typeof import("node:http")>(
                "node:http",
            );
            return {
                ...actual,
                request: requestMock,
            };
        });
        vi.resetModules();
        const { runRemoteVideoVipRender: runWithNodeUpload } = await import(
            "./remote-vip-worker"
        );
        const progress: Array<{ phase: string; percent?: number }> = [];

        try {
            const result = await runWithNodeUpload(baseInput, {
                endpoint: "http://worker.example",
                token: "secret",
                onProgress: (event) => {
                    progress.push({
                        phase: event.phase,
                        percent: event.percent,
                    });
                },
            });

            expect(result.videoBytes?.toString()).toBe("node-video");
            expect(requestMock).toHaveBeenCalledTimes(1);
            expect(requestBodies).toHaveLength(1);
            const body = requestBodies[0];
            expect(body.toString("utf8")).toContain('name="payloadJson"');
            expect(body.toString("utf8")).toContain(
                '"executionMode":"render-only"',
            );
            expect(body.toString("utf8")).toContain('name="videoFile"');
            expect(body.indexOf(Buffer.from([1, 2, 3]))).toBeGreaterThanOrEqual(
                0,
            );
            expect(progress.map((event) => event.phase)).toEqual(
                expect.arrayContaining([
                    "start-upload",
                    "start-upload-progress",
                    "start-upload-complete",
                    "start-response",
                    "done",
                ]),
            );
            expect(progress.some((event) => event.percent === 100)).toBe(true);
        } finally {
            vi.doUnmock("node:http");
            vi.resetModules();
        }
    });

    it("falls back to native FormData when worker cannot parse Node multipart", async () => {
        const requestMock = vi.fn((_url, _options, onResponse) => {
            const request = new EventEmitter() as EventEmitter & {
                setTimeout: (timeoutMs: number, callback: () => void) => typeof request;
                write: (chunk: Buffer) => boolean;
                end: (callback?: () => void) => typeof request;
                destroy: (error?: Error) => typeof request;
            };
            request.setTimeout = vi.fn(() => request);
            request.write = vi.fn(() => true);
            request.end = vi.fn((callback?: () => void) => {
                callback?.();
                const response = new EventEmitter() as EventEmitter & {
                    statusCode?: number;
                };
                response.statusCode = 500;
                onResponse(response);
                queueMicrotask(() => {
                    response.emit(
                        "data",
                        Buffer.from(
                            JSON.stringify({
                                ok: false,
                                errorCode: "SYS_DUBBING_MUX_FAILED",
                                error: "Failed to parse body as FormData.",
                            }),
                        ),
                    );
                    response.emit("end");
                });
                return request;
            });
            request.destroy = vi.fn((error?: Error) => {
                if (error) request.emit("error", error);
                return request;
            });
            return request;
        });
        const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
            Response.json({
                ok: true,
                data: {
                    videoBase64: Buffer.from("fetch-fallback-video").toString(
                        "base64",
                    ),
                    mimeType: "video/mp4",
                    extension: "mp4",
                    fileName: "source-done.mp4",
                    byteLength: 20,
                    generationDurationMs: 100,
                    stages: {
                        finalRenderDurationMs: 40,
                    },
                    mix: { originalAudioVolume: 0, voiceVolume: 1 },
                },
            }),
        );
        vi.stubGlobal("fetch", fetchMock);
        vi.doMock("node:http", async () => {
            const actual = await vi.importActual<typeof import("node:http")>(
                "node:http",
            );
            return {
                ...actual,
                request: requestMock,
            };
        });
        vi.resetModules();
        const { runRemoteVideoVipRender: runWithNodeUpload } = await import(
            "./remote-vip-worker"
        );
        const progress: string[] = [];

        try {
            const result = await runWithNodeUpload(baseInput, {
                endpoint: "http://worker.example",
                token: "secret",
                onProgress: (event) => {
                    progress.push(event.phase);
                },
            });

            expect(result.videoBytes?.toString()).toBe("fetch-fallback-video");
            expect(requestMock).toHaveBeenCalledTimes(1);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [, init] = fetchMock.mock.calls[0];
            expect(init?.body).toBeInstanceOf(FormData);
            expect(progress).toEqual(
                expect.arrayContaining([
                    "start-upload",
                    "start-response",
                    "start-upload-fallback",
                    "done",
                ]),
            );
        } finally {
            vi.doUnmock("node:http");
            vi.resetModules();
            vi.unstubAllGlobals();
        }
    });

    it("stages large source videos as parallel chunks before a lightweight start request", async () => {
        const requestBodies: Buffer[] = [];
        const requestMock = vi.fn((_url, _options, onResponse) => {
            const chunks: Buffer[] = [];
            const request = new EventEmitter() as EventEmitter & {
                setTimeout: (timeoutMs: number, callback: () => void) => typeof request;
                write: (chunk: Buffer) => boolean;
                end: (callback?: () => void) => typeof request;
                destroy: (error?: Error) => typeof request;
            };
            request.setTimeout = vi.fn(() => request);
            request.write = vi.fn((chunk: Buffer) => {
                chunks.push(Buffer.from(chunk));
                return true;
            });
            request.end = vi.fn((callback?: () => void) => {
                requestBodies.push(Buffer.concat(chunks));
                callback?.();
                const response = new EventEmitter() as EventEmitter & {
                    statusCode?: number;
                };
                response.statusCode = 200;
                onResponse(response);
                queueMicrotask(() => {
                    response.emit(
                        "data",
                        Buffer.from(
                            JSON.stringify({
                                ok: true,
                                data: {
                                    videoBase64:
                                        Buffer.from("staged-video").toString("base64"),
                                    mimeType: "video/mp4",
                                    extension: "mp4",
                                    fileName: "source-done.mp4",
                                    byteLength: 12,
                                    generationDurationMs: 100,
                                    stages: {
                                        finalRenderDurationMs: 40,
                                    },
                                    mix: { originalAudioVolume: 0, voiceVolume: 1 },
                                },
                            }),
                        ),
                    );
                    response.emit("end");
                });
                return request;
            });
            request.destroy = vi.fn((error?: Error) => {
                if (error) request.emit("error", error);
                return request;
            });
            return request;
        });
        const stagedParts: Array<{ uploadId: string; partIndex: string }> = [];
        const chunkFetch = vi.fn(async (_url: string | URL, init?: RequestInit) => {
            const formData = init?.body as FormData;
            stagedParts.push({
                uploadId: String(formData.get("sourceUploadId")),
                partIndex: String(formData.get("partIndex")),
            });
            return Response.json({ ok: true, data: { received: true } });
        });
        vi.stubGlobal("fetch", chunkFetch);
        vi.doMock("node:http", async () => {
            const actual = await vi.importActual<typeof import("node:http")>(
                "node:http",
            );
            return {
                ...actual,
                request: requestMock,
            };
        });
        vi.resetModules();
        const { runRemoteVideoVipRender: runWithNodeUpload } = await import(
            "./remote-vip-worker"
        );
        const progress: string[] = [];

        try {
            const largeInput = {
                ...baseInput,
                fileSizeBytes: 3 * 1024 * 1024 + 1,
                fileBytes: new Uint8Array(3 * 1024 * 1024 + 1).fill(7),
            };
            const result = await runWithNodeUpload(largeInput, {
                endpoint: "http://worker.example",
                token: "secret",
                sourceUploadThresholdBytes: 1,
                sourceUploadChunkBytes: 1024 * 1024,
                sourceUploadConcurrency: 2,
                onProgress: (event) => {
                    progress.push(event.phase);
                },
            });

            expect(result.videoBytes?.toString()).toBe("staged-video");
            expect(chunkFetch).toHaveBeenCalledTimes(4);
            expect(new Set(stagedParts.map((part) => part.uploadId)).size).toBe(1);
            expect(stagedParts.map((part) => part.partIndex).sort()).toEqual([
                "0",
                "1",
                "2",
                "3",
            ]);
            const startBody = requestBodies[0].toString("utf8");
            expect(startBody).toContain("sourceUploadId");
            expect(startBody).not.toContain('name="videoFile"');
            expect(progress).toEqual(
                expect.arrayContaining([
                    "source-stage-upload",
                    "source-stage-upload-progress",
                    "source-stage-upload-complete",
                    "start-response",
                    "done",
                ]),
            );
        } finally {
            vi.doUnmock("node:http");
            vi.resetModules();
            vi.unstubAllGlobals();
        }
    });

    it("falls back to single start upload when chunk staging is unsupported", async () => {
        const requestBodies: Buffer[] = [];
        const requestMock = vi.fn((_url, _options, onResponse) => {
            const chunks: Buffer[] = [];
            const request = new EventEmitter() as EventEmitter & {
                setTimeout: (timeoutMs: number, callback: () => void) => typeof request;
                write: (chunk: Buffer) => boolean;
                end: (callback?: () => void) => typeof request;
                destroy: (error?: Error) => typeof request;
            };
            request.setTimeout = vi.fn(() => request);
            request.write = vi.fn((chunk: Buffer) => {
                chunks.push(Buffer.from(chunk));
                return true;
            });
            request.end = vi.fn((callback?: () => void) => {
                requestBodies.push(Buffer.concat(chunks));
                callback?.();
                const response = new EventEmitter() as EventEmitter & {
                    statusCode?: number;
                };
                response.statusCode = 200;
                onResponse(response);
                queueMicrotask(() => {
                    response.emit(
                        "data",
                        Buffer.from(
                            JSON.stringify({
                                ok: true,
                                data: {
                                    videoBase64:
                                        Buffer.from("fallback-video").toString("base64"),
                                    mimeType: "video/mp4",
                                    extension: "mp4",
                                    fileName: "source-done.mp4",
                                    byteLength: 14,
                                    generationDurationMs: 100,
                                    stages: {
                                        finalRenderDurationMs: 40,
                                    },
                                    mix: { originalAudioVolume: 0, voiceVolume: 1 },
                                },
                            }),
                        ),
                    );
                    response.emit("end");
                });
                return request;
            });
            request.destroy = vi.fn((error?: Error) => {
                if (error) request.emit("error", error);
                return request;
            });
            return request;
        });
        vi.stubGlobal(
            "fetch",
            vi.fn(async () =>
                Response.json(
                    { ok: false, error: "payloadJson is required" },
                    { status: 400 },
                ),
            ),
        );
        vi.doMock("node:http", async () => {
            const actual = await vi.importActual<typeof import("node:http")>(
                "node:http",
            );
            return {
                ...actual,
                request: requestMock,
            };
        });
        vi.resetModules();
        const { runRemoteVideoVipRender: runWithNodeUpload } = await import(
            "./remote-vip-worker"
        );
        const progress: string[] = [];

        try {
            const result = await runWithNodeUpload(baseInput, {
                endpoint: "http://worker.example",
                token: "secret",
                sourceUploadThresholdBytes: 1,
                onProgress: (event) => {
                    progress.push(event.phase);
                },
            });

            expect(result.videoBytes?.toString()).toBe("fallback-video");
            expect(requestBodies[0].toString("utf8")).toContain('name="videoFile"');
            expect(progress).toEqual(
                expect.arrayContaining([
                    "source-stage-fallback",
                    "start-upload",
                    "start-upload-complete",
                    "done",
                ]),
            );
        } finally {
            vi.doUnmock("node:http");
            vi.resetModules();
            vi.unstubAllGlobals();
        }
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

    it("maps worker start network failures to endpoint-specific VIP errors", async () => {
        const cause = new Error("connect ECONNREFUSED 16.163.29.17:8787") as Error & {
            code?: string;
        };
        cause.code = "ECONNREFUSED";
        const error = new TypeError("fetch failed") as TypeError & {
            cause?: Error;
        };
        error.cause = cause;
        const fetchImpl = vi.fn<typeof fetch>().mockRejectedValueOnce(error);

        await expect(
            runRemoteVideoVipRender(baseInput, {
                endpoint: "http://16.163.29.17:8787",
                fetchImpl,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            status: 502,
            message:
                "Remote VIP worker start request failed for http://16.163.29.17:8787/api/audio/video-vip-voice-render: fetch failed: connect ECONNREFUSED 16.163.29.17:8787 (ECONNREFUSED)",
        });
    });

    it("maps worker poll network failures to endpoint-specific VIP errors", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json(
                    {
                        ok: true,
                        data: {
                            jobId: "job-network",
                            status: "running",
                        },
                    },
                    { status: 202 },
                ),
            )
            .mockRejectedValueOnce(new TypeError("fetch failed"));

        await expect(
            runRemoteVideoVipRender(baseInput, {
                endpoint: "http://worker.example",
                fetchImpl,
                pollIntervalMs: 0,
                pollNetworkFailureLimit: 0,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            status: 502,
            message:
                "Remote VIP worker job poll failed for http://worker.example/api/audio/video-vip-voice-render?jobId=job-network: fetch failed",
        });
    });

    it("retries transient worker poll network failures before returning a completed job", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json(
                    {
                        ok: true,
                        data: {
                            jobId: "job-retry",
                            status: "running",
                        },
                    },
                    { status: 202 },
                ),
            )
            .mockRejectedValueOnce(new TypeError("fetch failed"))
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        status: "done",
                        result: {
                            artifactId: "artifact-retry",
                            mimeType: "video/mp4",
                            extension: "mp4",
                            fileName: "source-done.mp4",
                            byteLength: 12,
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
                new Response(Buffer.from("retry-video"), {
                    status: 200,
                    headers: { "Content-Type": "video/mp4" },
                }),
            );

        const result = await runRemoteVideoVipRender(baseInput, {
            endpoint: "http://worker.example",
            fetchImpl,
            pollIntervalMs: 0,
            pollNetworkFailureLimit: 2,
        });

        expect(result.videoBytes?.toString()).toBe("retry-video");
        expect(fetchImpl).toHaveBeenCalledTimes(4);
    });

    it("checks worker health before expensive remote VIP stages", async () => {
        const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(
            Response.json({
                ok: true,
                service: "omnivideo-vip-voice-render",
                data: { jobs: [] },
            }),
        );

        await expect(
            assertRemoteVipWorkerAvailable({
                endpoint: "http://worker.example/",
                token: "secret",
                fetchImpl,
            }),
        ).resolves.toBeUndefined();

        expect(fetchImpl).toHaveBeenCalledWith(
            "http://worker.example/api/audio/video-vip-voice-render",
            expect.objectContaining({
                method: "GET",
                headers: { Authorization: "Bearer secret" },
            }),
        );
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

    it("maps remote artifact download network failures to endpoint-specific VIP errors", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    ok: true,
                    data: {
                        artifactId: "artifact-network",
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
            .mockRejectedValueOnce(new TypeError("fetch failed"));

        await expect(
            runRemoteVideoVipRender(baseInput, {
                endpoint: "http://worker.example",
                fetchImpl,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            status: 502,
            message:
                "Remote VIP worker artifact download failed for http://worker.example/api/workspace/artifacts/artifact-network/download: fetch failed",
        });
    });
});
