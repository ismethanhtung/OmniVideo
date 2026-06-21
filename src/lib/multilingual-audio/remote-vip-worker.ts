import { randomUUID } from "node:crypto";
import { once } from "node:events";
import {
    request as httpRequest,
    type ClientRequest,
    type IncomingMessage,
} from "node:http";
import { request as httpsRequest } from "node:https";

import {
    ChineseTranscriptionError,
    type TranscriptTranslationResult,
} from "@/lib/multilingual-audio/types";
import type {
    VideoVipVoiceRenderInput,
    VideoVipVoiceRenderResult,
    VideoVipRemoteRenderInput,
    VideoVipRemoteRenderResult,
} from "@/lib/multilingual-audio/video-vip-processing";

export type RemoteVipWorkerOptions = {
    endpoint?: string;
    token?: string;
    fetchImpl?: typeof fetch;
    pollIntervalMs?: number;
    pollTimeoutMs?: number;
    pollNetworkFailureLimit?: number;
    preflightTimeoutMs?: number;
    startRequestTimeoutMs?: number;
    sourceUploadThresholdBytes?: number;
    sourceUploadChunkBytes?: number;
    sourceUploadConcurrency?: number;
    onProgress?: (progress: RemoteVipWorkerProgress) => void | Promise<void>;
};

export type RemoteVipWorkerProgress = {
    phase:
        | "start-upload"
        | "start-upload-progress"
        | "start-upload-complete"
        | "source-stage-upload"
        | "source-stage-upload-progress"
        | "source-stage-upload-complete"
        | "source-stage-fallback"
        | "start-response"
        | "queued"
        | "running"
        | "poll-network-retry"
        | "done"
        | "artifact-download"
        | "artifact-download-complete";
    message?: string;
    jobId?: string;
    status?: RemoteVipWorkerJobResponse["data"] extends infer Data
        ? Data extends { status?: infer Status }
            ? Status
            : string
        : string;
    stage?: string;
    uploadedBytes?: number;
    totalBytes?: number;
    percent?: number;
    requestBytes?: number;
    responseStatus?: number;
    uploadId?: string;
    partIndex?: number;
    partCount?: number;
    artifactId?: string;
    byteLength?: number;
    elapsedMs?: number;
    failureCount?: number;
    failureLimit?: number;
    metrics?: Record<string, number | string | boolean | undefined>;
};

type RemoteVipWorkerPayload = Omit<
    VideoVipRemoteRenderInput,
    "fileBytes" | "voiceAudioBase64" | "stageRunners"
> & {
    executionMode: "render-only";
    translatedSegments: TranscriptTranslationResult["translatedSegments"];
};

type RemoteVipVoiceRenderWorkerPayload = Omit<
    VideoVipVoiceRenderInput,
    "fileBytes" | "stageRunners"
> & {
    executionMode: "voice-render";
};

type RemoteVipWorkerResponseData = (
    | VideoVipRemoteRenderResult
    | VideoVipVoiceRenderResult
) & {
    artifactId?: string;
};

type RemoteVipWorkerJobResponse = {
    ok?: boolean;
    data?: {
        jobId?: string;
        status?: "queued" | "running" | "done" | "failed";
        stage?: string;
        stageStartedAt?: string;
        message?: string;
        metrics?: Record<string, number | string | boolean | undefined>;
        result?: RemoteVipWorkerResponseData;
        error?: string;
        errorCode?: string;
    };
    error?: string;
    errorCode?: string;
};

const DEFAULT_REMOTE_VIP_POLL_INTERVAL_MS = 5000;
const DEFAULT_REMOTE_VIP_POLL_TIMEOUT_MS = 6 * 60 * 60 * 1000;
const DEFAULT_REMOTE_VIP_POLL_NETWORK_FAILURE_LIMIT = 12;
const DEFAULT_REMOTE_VIP_PREFLIGHT_TIMEOUT_MS = 8000;
const DEFAULT_REMOTE_VIP_START_REQUEST_TIMEOUT_MS = 60 * 60 * 1000;
const DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_THRESHOLD_BYTES = 64 * 1024 * 1024;
const DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_CHUNK_BYTES = 24 * 1024 * 1024;
const DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_CONCURRENCY = 4;
const REMOTE_VIP_UPLOAD_CHUNK_BYTES = 1024 * 1024;
const REMOTE_VIP_UPLOAD_PROGRESS_MIN_BYTES = 8 * 1024 * 1024;
const REMOTE_VIP_UPLOAD_PROGRESS_MIN_MS = 2000;

function normalizeEndpoint(endpoint: string) {
    return endpoint.replace(/\/+$/u, "");
}

function getErrorDetail(error: unknown) {
    if (!(error instanceof Error)) return String(error);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code =
            "code" in cause && typeof cause.code === "string"
                ? ` (${cause.code})`
                : "";
        return `${error.message}: ${cause.message}${code}`;
    }
    if (cause && typeof cause === "object") {
        const record = cause as Record<string, unknown>;
        const message =
            typeof record.message === "string" ? record.message : "";
        const code = typeof record.code === "string" ? ` (${record.code})` : "";
        return message ? `${error.message}: ${message}${code}` : error.message;
    }
    return error.message;
}

async function fetchRemoteVipWorker(
    fetchImpl: typeof fetch,
    url: string,
    init: RequestInit,
    phase: string,
) {
    try {
        return await fetchImpl(url, init);
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Remote VIP worker ${phase} failed for ${url}: ${getErrorDetail(error)}`,
            502,
        );
    }
}

export function resolveRemoteVipWorkerConfig(options: RemoteVipWorkerOptions = {}) {
    const endpoint =
        options.endpoint?.trim() ||
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL?.trim() ||
        "";
    const token =
        options.token?.trim() ||
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN?.trim() ||
        "";

    return { endpoint, token };
}

export async function assertRemoteVipWorkerAvailable(
    options: RemoteVipWorkerOptions = {},
) {
    const { endpoint, token } = resolveRemoteVipWorkerConfig(options);
    if (!endpoint) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            "Remote VIP worker endpoint is not configured.",
            500,
        );
    }

    const fetchImpl = options.fetchImpl ?? fetch;
    const workerUrl = `${normalizeEndpoint(endpoint)}/api/audio/video-vip-voice-render`;
    const response = await fetchRemoteVipWorker(
        fetchImpl,
        workerUrl,
        {
            method: "GET",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: AbortSignal.timeout(resolvePreflightTimeoutMs(options)),
        },
        "preflight health check",
    );
    const body = (await response.json().catch(() => null)) as
        | RemoteVipWorkerJobResponse
        | null;
    if (!response.ok || !body?.ok) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            body?.error ??
                `Remote VIP worker preflight failed with HTTP ${response.status}.`,
            response.status >= 400 ? response.status : 500,
        );
    }
}

export async function runRemoteVideoVipRender(
    input: VideoVipRemoteRenderInput,
    options: RemoteVipWorkerOptions = {},
): Promise<VideoVipRemoteRenderResult> {
    const {
        fileBytes: sourceVideoBytes,
        voiceAudioBase64,
        stageRunners: _stageRunners,
        ...payloadInput
    } = input;
    const payload: RemoteVipWorkerPayload = {
        ...payloadInput,
        executionMode: "render-only",
        omitVideoBase64: true,
    };
    const upload = {
        payload,
        sourceVideoBytes,
        sourceFileName: input.fileName,
        sourceMimeType: input.mimeType,
        voiceAudioBase64,
    };

    return await postRemoteVipWorker<VideoVipRemoteRenderResult>(
        upload,
        options,
    );
}

export async function runRemoteVideoVipVoiceRender(
    input: VideoVipVoiceRenderInput,
    options: RemoteVipWorkerOptions = {},
): Promise<VideoVipVoiceRenderResult> {
    const {
        fileBytes: sourceVideoBytes,
        stageRunners: _stageRunners,
        ...payloadInput
    } = input;
    const payload: RemoteVipVoiceRenderWorkerPayload = {
        ...payloadInput,
        executionMode: "voice-render",
        omitVideoBase64: true,
    };
    const upload = {
        payload,
        sourceVideoBytes,
        sourceFileName: input.fileName,
        sourceMimeType: input.mimeType,
    };

    return await postRemoteVipWorker<VideoVipVoiceRenderResult>(
        upload,
        options,
    );
}

type RemoteVipWorkerUpload = {
    payload: RemoteVipWorkerPayload | RemoteVipVoiceRenderWorkerPayload;
    sourceVideoBytes: Uint8Array;
    sourceFileName: string;
    sourceMimeType?: string;
    voiceAudioBase64?: string;
    sourceUploadId?: string;
};

function createRemoteVipWorkerFormData(input: RemoteVipWorkerUpload) {
    const formData = new FormData();
    formData.set(
        "payloadJson",
        JSON.stringify(
            input.sourceUploadId
                ? { ...input.payload, sourceUploadId: input.sourceUploadId }
                : input.payload,
        ),
    );
    formData.set("async", "1");
    if (!input.sourceUploadId) {
        formData.set(
            "videoFile",
            new Blob([Buffer.from(input.sourceVideoBytes)], {
                type: input.sourceMimeType ?? "video/mp4",
            }),
            input.sourceFileName || "source.mp4",
        );
    }
    if (input.voiceAudioBase64) {
        formData.set(
            "voiceFile",
            new Blob([Buffer.from(input.voiceAudioBase64, "base64")], {
                type: "audio/wav",
            }),
            "voice.wav",
        );
    }
    return formData;
}

type ParsedRemoteVipWorkerResponse = {
    ok: boolean;
    status: number;
    body:
        | (RemoteVipWorkerJobResponse & {
              data?: RemoteVipWorkerResponseData &
                  NonNullable<RemoteVipWorkerJobResponse["data"]>;
          })
        | null;
};

async function postRemoteVipWorker<Result extends RemoteVipWorkerResponseData>(
    upload: RemoteVipWorkerUpload,
    options: RemoteVipWorkerOptions,
): Promise<Result> {
    const { endpoint, token } = resolveRemoteVipWorkerConfig(options);
    if (!endpoint) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            "Remote VIP worker endpoint is not configured.",
            500,
        );
    }

    const fetchImpl = options.fetchImpl ?? fetch;
    const workerUrl = `${normalizeEndpoint(endpoint)}/api/audio/video-vip-voice-render`;
    let effectiveUpload = upload;
    if (!options.fetchImpl && shouldStageSourceUpload(upload, options)) {
        try {
            const staged = await stageRemoteVipWorkerSourceUpload({
                upload,
                workerUrl,
                token,
                options,
            });
            effectiveUpload = {
                ...upload,
                sourceVideoBytes: new Uint8Array(),
                sourceUploadId: staged.uploadId,
            };
        } catch (error) {
            await emitRemoteVipWorkerProgress(options, {
                phase: "source-stage-fallback",
                uploadedBytes: 0,
                totalBytes: upload.sourceVideoBytes.byteLength,
                percent: 0,
                message:
                    error instanceof Error
                        ? `Parallel source staging failed; falling back to single upload: ${error.message}`
                        : "Parallel source staging failed; falling back to single upload.",
            });
        }
    }
    const response = options.fetchImpl
        ? await postRemoteVipWorkerWithFetch({
              upload: effectiveUpload,
              fetchImpl,
              workerUrl,
              token,
          })
        : await postRemoteVipWorkerWithNodeUpload({
              upload: effectiveUpload,
              workerUrl,
              token,
              options,
          });

    const body = response.body;
    if (!response.ok || !body?.ok || !body.data) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            body?.error ??
                `Remote VIP worker failed with HTTP ${response.status}.`,
            response.status >= 400 ? response.status : 500,
        );
    }

    if (body.data.jobId) {
        await emitRemoteVipWorkerProgress(options, {
            phase: "queued",
            jobId: body.data.jobId,
            status: body.data.status ?? "queued",
            stage: body.data.stage,
            message:
                body.data.message ??
                "Remote worker accepted the VIP job; polling for progress.",
            metrics: body.data.metrics,
        });
        const result = await pollRemoteVipWorkerJob<Result>({
            endpoint,
            token,
            fetchImpl,
            jobId: body.data.jobId,
            pollIntervalMs: resolvePollIntervalMs(options),
            pollTimeoutMs: resolvePollTimeoutMs(options),
            pollNetworkFailureLimit: resolvePollNetworkFailureLimit(options),
            onProgress: options.onProgress,
        });
        return await hydrateRemoteVipWorkerResult(result, {
            endpoint,
            token,
            fetchImpl,
            onProgress: options.onProgress,
        });
    }

    await emitRemoteVipWorkerProgress(options, {
        phase: "done",
        status: body.data.status,
        message: "Remote worker returned the VIP result inline.",
    });
    return await hydrateRemoteVipWorkerResult(body.data as Result, {
        endpoint,
        token,
        fetchImpl,
        onProgress: options.onProgress,
    });
}

async function postRemoteVipWorkerWithFetch(input: {
    upload: RemoteVipWorkerUpload;
    fetchImpl: typeof fetch;
    workerUrl: string;
    token: string;
}): Promise<ParsedRemoteVipWorkerResponse> {
    const formData = createRemoteVipWorkerFormData(input.upload);
    const response = await fetchRemoteVipWorker(
        input.fetchImpl,
        input.workerUrl,
        {
            method: "POST",
            headers: {
                ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
            },
            body: formData,
        },
        "start request",
    );

    const body = (await response.json().catch(() => null)) as
        | ParsedRemoteVipWorkerResponse["body"]
        | null;
    return {
        ok: response.ok,
        status: response.status,
        body,
    };
}

function shouldStageSourceUpload(
    upload: RemoteVipWorkerUpload,
    options: RemoteVipWorkerOptions,
) {
    if (upload.sourceUploadId || upload.sourceVideoBytes.byteLength === 0) {
        return false;
    }
    return (
        upload.sourceVideoBytes.byteLength >=
        resolveSourceUploadThresholdBytes(options)
    );
}

async function stageRemoteVipWorkerSourceUpload(input: {
    upload: RemoteVipWorkerUpload;
    workerUrl: string;
    token: string;
    options: RemoteVipWorkerOptions;
}) {
    const uploadId = randomUUID();
    const sourceBytes = Buffer.from(input.upload.sourceVideoBytes);
    const chunkSize = resolveSourceUploadChunkBytes(input.options);
    const concurrency = resolveSourceUploadConcurrency(input.options);
    const partCount = Math.ceil(sourceBytes.byteLength / chunkSize);
    let uploadedBytes = 0;
    let nextPartIndex = 0;

    await emitRemoteVipWorkerProgress(input.options, {
        phase: "source-stage-upload",
        uploadId,
        uploadedBytes: 0,
        totalBytes: sourceBytes.byteLength,
        percent: 0,
        partCount,
        message: "Uploading source video to EC2 in parallel chunks.",
    });

    const uploadNextPart = async () => {
        while (nextPartIndex < partCount) {
            const partIndex = nextPartIndex;
            nextPartIndex += 1;
            const start = partIndex * chunkSize;
            const end = Math.min(start + chunkSize, sourceBytes.byteLength);
            const chunkBytes = sourceBytes.subarray(start, end);
            await postRemoteVipWorkerSourceUploadPart({
                workerUrl: input.workerUrl,
                token: input.token,
                options: input.options,
                uploadId,
                partIndex,
                partCount,
                totalBytes: sourceBytes.byteLength,
                fileName: input.upload.sourceFileName,
                mimeType: input.upload.sourceMimeType ?? "video/mp4",
                chunkBytes,
            });
            uploadedBytes += chunkBytes.byteLength;
            await emitRemoteVipWorkerProgress(input.options, {
                phase: "source-stage-upload-progress",
                uploadId,
                uploadedBytes,
                totalBytes: sourceBytes.byteLength,
                percent: calculatePercent(uploadedBytes, sourceBytes.byteLength),
                partIndex,
                partCount,
                message: "Uploading source video to EC2 in parallel chunks.",
            });
        }
    };

    await Promise.all(
        Array.from(
            { length: Math.min(concurrency, partCount) },
            () => uploadNextPart(),
        ),
    );
    await emitRemoteVipWorkerProgress(input.options, {
        phase: "source-stage-upload-complete",
        uploadId,
        uploadedBytes: sourceBytes.byteLength,
        totalBytes: sourceBytes.byteLength,
        percent: 100,
        partCount,
        message:
            "Source video chunks uploaded to EC2; sending lightweight worker start request.",
    });
    return { uploadId };
}

async function postRemoteVipWorkerSourceUploadPart(input: {
    workerUrl: string;
    token: string;
    options: RemoteVipWorkerOptions;
    uploadId: string;
    partIndex: number;
    partCount: number;
    totalBytes: number;
    fileName: string;
    mimeType: string;
    chunkBytes: Buffer;
}) {
    const formData = new FormData();
    formData.set("sourceUploadId", input.uploadId);
    formData.set("partIndex", String(input.partIndex));
    formData.set("partCount", String(input.partCount));
    formData.set("totalBytes", String(input.totalBytes));
    formData.set("fileName", input.fileName || "source.mp4");
    formData.set("mimeType", input.mimeType || "video/mp4");
    formData.set(
        "chunkFile",
        new Blob([new Uint8Array(input.chunkBytes)], {
            type: "application/octet-stream",
        }),
        `${input.partIndex}.part`,
    );
    const chunkUrl = `${input.workerUrl}?sourceUpload=part`;
    const response = await fetchRemoteVipWorker(
        fetch,
        chunkUrl,
        {
            method: "POST",
            headers: {
                ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
            },
            body: formData,
            signal: AbortSignal.timeout(resolveStartRequestTimeoutMs(input.options)),
        },
        "source upload chunk",
    );
    const body = (await response.json().catch(() => null)) as
        | RemoteVipWorkerJobResponse
        | null;
    if (!response.ok || !body?.ok) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            body?.error ??
                `Remote VIP source upload chunk failed with HTTP ${response.status}.`,
            response.status >= 400 ? response.status : 500,
        );
    }
}

async function postRemoteVipWorkerWithNodeUpload(input: {
    upload: RemoteVipWorkerUpload;
    workerUrl: string;
    token: string;
    options: RemoteVipWorkerOptions;
}): Promise<ParsedRemoteVipWorkerResponse> {
    try {
        return await writeRemoteVipWorkerMultipartRequest(input);
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Remote VIP worker start request failed for ${input.workerUrl}: ${getErrorDetail(error)}`,
            502,
        );
    }
}

async function writeRemoteVipWorkerMultipartRequest(input: {
    upload: RemoteVipWorkerUpload;
    workerUrl: string;
    token: string;
    options: RemoteVipWorkerOptions;
}): Promise<ParsedRemoteVipWorkerResponse> {
    const url = new URL(input.workerUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error(`Unsupported remote VIP worker protocol: ${url.protocol}`);
    }

    const boundary = `----omnivideo-vip-${randomUUID()}`;
    const multipart = buildRemoteVipWorkerMultipart(input.upload, boundary);
    const requestFn = url.protocol === "https:" ? httpsRequest : httpRequest;
    const timeoutMs = resolveStartRequestTimeoutMs(input.options);
    const startedAt = Date.now();

    if (!multipart.usesStagedSource) {
        await emitRemoteVipWorkerProgress(input.options, {
            phase: "start-upload",
            uploadedBytes: 0,
            totalBytes: multipart.videoBytes.byteLength,
            percent: 0,
            requestBytes: multipart.contentLength,
            message: "Uploading source video to remote VIP worker.",
        });
    }

    return await new Promise<ParsedRemoteVipWorkerResponse>((resolve, reject) => {
        let settled = false;
        const rejectOnce = (error: unknown) => {
            if (settled) return;
            settled = true;
            reject(error);
        };
        const resolveOnce = (response: ParsedRemoteVipWorkerResponse) => {
            if (settled) return;
            settled = true;
            resolve(response);
        };

        const request = requestFn(
            url,
            {
                method: "POST",
                headers: {
                    ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
                    "Content-Type": `multipart/form-data; boundary=${boundary}`,
                    "Content-Length": String(multipart.contentLength),
                },
            },
            (response) => {
                void readNodeResponse(response)
                    .then((parsed) => {
                        void emitRemoteVipWorkerProgress(input.options, {
                            phase: "start-response",
                            responseStatus: parsed.status,
                            elapsedMs: Date.now() - startedAt,
                            message:
                                "Remote worker responded to the VIP start request.",
                        })
                            .catch(() => undefined)
                            .finally(() => resolveOnce(parsed));
                    })
                    .catch(rejectOnce);
            },
        );

        request.setTimeout(timeoutMs, () => {
            request.destroy(
                new Error(
                    `timed out after ${Math.round(
                        timeoutMs / 1000,
                    )}s while uploading or waiting for response headers`,
                ),
            );
        });
        request.on("error", rejectOnce);

        void writeMultipartBody({
            request,
            multipart,
            options: input.options,
            startedAt,
            emitUploadProgress: !multipart.usesStagedSource,
        }).catch((error) => {
            request.destroy(error instanceof Error ? error : new Error(String(error)));
            rejectOnce(error);
        });
    });
}

function buildRemoteVipWorkerMultipart(
    upload: RemoteVipWorkerUpload,
    boundary: string,
) {
    const payloadJson = JSON.stringify(
        upload.sourceUploadId
            ? { ...upload.payload, sourceUploadId: upload.sourceUploadId }
            : upload.payload,
    );
    const videoBytes = Buffer.from(upload.sourceVideoBytes);
    const voiceBytes = upload.voiceAudioBase64
        ? Buffer.from(upload.voiceAudioBase64, "base64")
        : undefined;
    const parts: Array<Buffer | { kind: "video"; bytes: Buffer }> = [
        buildMultipartField(boundary, "payloadJson", payloadJson, {
            contentType: "application/json; charset=utf-8",
        }),
        buildMultipartField(boundary, "async", "1"),
    ];

    if (!upload.sourceUploadId) {
        parts.push(
            buildMultipartFileHeader(boundary, {
                fieldName: "videoFile",
                fileName: upload.sourceFileName || "source.mp4",
                contentType: upload.sourceMimeType ?? "video/mp4",
            }),
            { kind: "video", bytes: videoBytes },
            Buffer.from("\r\n"),
        );
    }

    if (voiceBytes) {
        parts.push(
            buildMultipartFileHeader(boundary, {
                fieldName: "voiceFile",
                fileName: "voice.wav",
                contentType: "audio/wav",
            }),
            voiceBytes,
            Buffer.from("\r\n"),
        );
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    return {
        parts,
        videoBytes,
        usesStagedSource: Boolean(upload.sourceUploadId),
        contentLength: parts.reduce(
            (total, part) =>
                total + ("kind" in part ? part.bytes.byteLength : part.byteLength),
            0,
        ),
    };
}

function buildMultipartField(
    boundary: string,
    name: string,
    value: string,
    options: { contentType?: string } = {},
) {
    const headers = [
        `--${boundary}`,
        `Content-Disposition: form-data; name="${escapeMultipartToken(name)}"`,
    ];
    if (options.contentType) {
        headers.push(`Content-Type: ${options.contentType}`);
    }
    return Buffer.from(`${headers.join("\r\n")}\r\n\r\n${value}\r\n`);
}

function buildMultipartFileHeader(
    boundary: string,
    input: { fieldName: string; fileName: string; contentType: string },
) {
    return Buffer.from(
        [
            `--${boundary}`,
            `Content-Disposition: form-data; name="${escapeMultipartToken(
                input.fieldName,
            )}"; filename="${escapeMultipartToken(input.fileName)}"`,
            `Content-Type: ${input.contentType}`,
            "",
            "",
        ].join("\r\n"),
    );
}

function escapeMultipartToken(value: string) {
    return value.replace(/["\r\n]/gu, "-");
}

async function writeMultipartBody(input: {
    request: ClientRequest;
    multipart: ReturnType<typeof buildRemoteVipWorkerMultipart>;
    options: RemoteVipWorkerOptions;
    startedAt: number;
    emitUploadProgress: boolean;
}) {
    let uploadedVideoBytes = 0;
    let lastProgressBytes = 0;
    let lastProgressAt = 0;
    for (const part of input.multipart.parts) {
        if ("kind" in part) {
            for (
                let offset = 0;
                offset < part.bytes.byteLength;
                offset += REMOTE_VIP_UPLOAD_CHUNK_BYTES
            ) {
                const chunk = part.bytes.subarray(
                    offset,
                    Math.min(offset + REMOTE_VIP_UPLOAD_CHUNK_BYTES, part.bytes.byteLength),
                );
                await writeRequestChunk(input.request, chunk);
                uploadedVideoBytes += chunk.byteLength;
                const now = Date.now();
                const shouldEmit =
                    uploadedVideoBytes === part.bytes.byteLength ||
                    uploadedVideoBytes - lastProgressBytes >=
                        REMOTE_VIP_UPLOAD_PROGRESS_MIN_BYTES ||
                    now - lastProgressAt >= REMOTE_VIP_UPLOAD_PROGRESS_MIN_MS;
                if (input.emitUploadProgress && shouldEmit) {
                    lastProgressBytes = uploadedVideoBytes;
                    lastProgressAt = now;
                    await emitRemoteVipWorkerProgress(input.options, {
                        phase: "start-upload-progress",
                        uploadedBytes: uploadedVideoBytes,
                        totalBytes: part.bytes.byteLength,
                        percent: calculatePercent(
                            uploadedVideoBytes,
                            part.bytes.byteLength,
                        ),
                        requestBytes: input.multipart.contentLength,
                        elapsedMs: Date.now() - input.startedAt,
                        message: "Uploading source video to remote VIP worker.",
                    });
                }
            }
            continue;
        }
        await writeRequestChunk(input.request, part);
    }
    await new Promise<void>((resolve) => input.request.end(resolve));
    if (input.emitUploadProgress) {
        await emitRemoteVipWorkerProgress(input.options, {
            phase: "start-upload-complete",
            uploadedBytes: input.multipart.videoBytes.byteLength,
            totalBytes: input.multipart.videoBytes.byteLength,
            percent: 100,
            requestBytes: input.multipart.contentLength,
            elapsedMs: Date.now() - input.startedAt,
            message:
                "Source video upload finished; waiting for remote worker to accept the job.",
        });
    }
}

async function writeRequestChunk(request: ClientRequest, chunk: Buffer) {
    if (request.write(chunk)) return;
    await once(request, "drain");
}

async function readNodeResponse(
    response: IncomingMessage,
): Promise<ParsedRemoteVipWorkerResponse> {
    const chunks: Buffer[] = [];
    response.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    await once(response, "end");
    const raw = Buffer.concat(chunks).toString("utf8");
    const body = raw
        ? (() => {
              try {
                  return JSON.parse(raw) as ParsedRemoteVipWorkerResponse["body"];
              } catch {
                  return null;
              }
          })()
        : null;
    const status = response.statusCode ?? 0;
    return {
        ok: status >= 200 && status < 300,
        status,
        body,
    };
}

function calculatePercent(uploadedBytes: number, totalBytes: number) {
    if (totalBytes <= 0) return 0;
    return Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
}

function resolvePollIntervalMs(options: RemoteVipWorkerOptions) {
    const configured =
        options.pollIntervalMs ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_POLL_INTERVAL_MS) ||
            DEFAULT_REMOTE_VIP_POLL_INTERVAL_MS);
    return Math.max(0, configured);
}

function resolvePollTimeoutMs(options: RemoteVipWorkerOptions) {
    const configured =
        options.pollTimeoutMs ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_POLL_TIMEOUT_MS) ||
            DEFAULT_REMOTE_VIP_POLL_TIMEOUT_MS);
    return Math.max(1000, configured);
}

function resolvePollNetworkFailureLimit(options: RemoteVipWorkerOptions) {
    const configured =
        options.pollNetworkFailureLimit ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_POLL_NETWORK_FAILURE_LIMIT) ||
            DEFAULT_REMOTE_VIP_POLL_NETWORK_FAILURE_LIMIT);
    return Math.max(0, Math.round(configured));
}

function resolvePreflightTimeoutMs(options: RemoteVipWorkerOptions) {
    const configured =
        options.preflightTimeoutMs ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_PREFLIGHT_TIMEOUT_MS) ||
            DEFAULT_REMOTE_VIP_PREFLIGHT_TIMEOUT_MS);
    return Math.max(1000, Math.round(configured));
}

function resolveStartRequestTimeoutMs(options: RemoteVipWorkerOptions) {
    const configured =
        options.startRequestTimeoutMs ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_START_REQUEST_TIMEOUT_MS) ||
            DEFAULT_REMOTE_VIP_START_REQUEST_TIMEOUT_MS);
    return Math.max(30_000, Math.round(configured));
}

function resolveSourceUploadThresholdBytes(options: RemoteVipWorkerOptions) {
    const configured =
        options.sourceUploadThresholdBytes ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_SOURCE_UPLOAD_THRESHOLD_BYTES) ||
            DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_THRESHOLD_BYTES);
    return Math.max(0, Math.round(configured));
}

function resolveSourceUploadChunkBytes(options: RemoteVipWorkerOptions) {
    const configured =
        options.sourceUploadChunkBytes ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_SOURCE_UPLOAD_CHUNK_BYTES) ||
            DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_CHUNK_BYTES);
    return Math.max(1024 * 1024, Math.round(configured));
}

function resolveSourceUploadConcurrency(options: RemoteVipWorkerOptions) {
    const configured =
        options.sourceUploadConcurrency ??
        (Number(process.env.OMNIVIDEO_REMOTE_VIP_SOURCE_UPLOAD_CONCURRENCY) ||
            DEFAULT_REMOTE_VIP_SOURCE_UPLOAD_CONCURRENCY);
    return Math.max(1, Math.min(12, Math.round(configured)));
}

async function pollRemoteVipWorkerJob<Result extends RemoteVipWorkerResponseData>(
    input: {
        endpoint: string;
        token: string;
        fetchImpl: typeof fetch;
        jobId: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
        pollNetworkFailureLimit: number;
        onProgress?: RemoteVipWorkerOptions["onProgress"];
    },
): Promise<Result> {
    const startedAt = Date.now();
    let attempt = 0;
    let lastLoggedStage = "";
    let lastLoggedAt = 0;
    let pollNetworkFailures = 0;
    while (Date.now() - startedAt <= input.pollTimeoutMs) {
        if (attempt > 0) {
            await delay(input.pollIntervalMs);
        }
        attempt += 1;
        const workerUrl = `${normalizeEndpoint(input.endpoint)}/api/audio/video-vip-voice-render?jobId=${encodeURIComponent(
            input.jobId,
        )}`;
        let response: Response;
        try {
            response = await fetchRemoteVipWorker(
                input.fetchImpl,
                workerUrl,
                {
                    method: "GET",
                    headers: {
                        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
                    },
                },
                "job poll",
            );
            pollNetworkFailures = 0;
        } catch (error) {
            pollNetworkFailures += 1;
            if (pollNetworkFailures > input.pollNetworkFailureLimit) {
                throw error;
            }
            await emitRemoteVipWorkerProgress(
                { onProgress: input.onProgress },
                {
                    phase: "poll-network-retry",
                    jobId: input.jobId,
                    status: "running",
                    failureCount: pollNetworkFailures,
                    failureLimit: input.pollNetworkFailureLimit,
                    message: error instanceof Error ? error.message : String(error),
                    elapsedMs: Date.now() - startedAt,
                },
            );
            continue;
        }
        const body = (await response.json().catch(() => null)) as
            | RemoteVipWorkerJobResponse
            | null;
        if (!response.ok || !body?.ok || !body.data) {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                body?.error ??
                    `Remote VIP worker job poll failed with HTTP ${response.status}.`,
                response.status >= 400 ? response.status : 500,
            );
        }
        if (body.data.status === "failed") {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                body.data.error ?? "Remote VIP worker job failed.",
                500,
            );
        }
        if (body.data.status === "queued" || body.data.status === "running") {
            const stage = body.data.stage ?? "running";
            const shouldLog =
                `${body.data.status}:${stage}` !== lastLoggedStage ||
                Date.now() - lastLoggedAt > 60000;
            if (shouldLog) {
                lastLoggedStage = `${body.data.status}:${stage}`;
                lastLoggedAt = Date.now();
                await emitRemoteVipWorkerProgress(
                    { onProgress: input.onProgress },
                    {
                        phase: body.data.status,
                        jobId: input.jobId,
                        status: body.data.status,
                        stage,
                        message: body.data.message,
                        metrics: body.data.metrics,
                        elapsedMs: Date.now() - startedAt,
                    },
                );
            }
        }
        if (body.data.status === "done" && body.data.result) {
            await emitRemoteVipWorkerProgress(
                { onProgress: input.onProgress },
                {
                    phase: "done",
                    jobId: input.jobId,
                    status: "done",
                    elapsedMs: Date.now() - startedAt,
                    message: "Remote worker completed the VIP job.",
                },
            );
            return body.data.result as Result;
        }
    }

    throw new ChineseTranscriptionError(
        "SYS_DUBBING_MUX_FAILED",
        "Remote VIP worker job timed out while waiting for completion.",
        504,
    );
}

async function hydrateRemoteVipWorkerResult<Result extends RemoteVipWorkerResponseData>(
    result: Result,
    input: {
        endpoint: string;
        token: string;
        fetchImpl: typeof fetch;
        onProgress?: RemoteVipWorkerOptions["onProgress"];
    },
): Promise<Result> {
    if (result.artifactId) {
        await emitRemoteVipWorkerProgress(
            { onProgress: input.onProgress },
            {
                phase: "artifact-download",
                artifactId: result.artifactId,
                message: "Downloading rendered artifact from remote worker.",
            },
        );
        const artifactUrl = `${normalizeEndpoint(input.endpoint)}/api/workspace/artifacts/${encodeURIComponent(
            result.artifactId,
        )}/download`;
        const artifactResponse = await fetchRemoteVipWorker(
            input.fetchImpl,
            artifactUrl,
            {
                method: "GET",
                headers: {
                    ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
                },
            },
            "artifact download",
        );
        if (!artifactResponse.ok) {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                `Remote VIP worker artifact download failed with HTTP ${artifactResponse.status}.`,
                artifactResponse.status >= 400 ? artifactResponse.status : 500,
            );
        }
        const videoBytes = Buffer.from(await artifactResponse.arrayBuffer());
        await emitRemoteVipWorkerProgress(
            { onProgress: input.onProgress },
            {
                phase: "artifact-download-complete",
                artifactId: result.artifactId,
                byteLength: videoBytes.byteLength,
                message: "Rendered artifact downloaded from remote worker.",
            },
        );
        return {
            ...result,
            videoBytes,
        } as Result;
    }

    return {
        ...result,
        videoBytes: result.videoBase64
            ? Buffer.from(result.videoBase64, "base64")
            : result.videoBytes
              ? Buffer.from(result.videoBytes)
              : undefined,
    } as Result;
}

async function emitRemoteVipWorkerProgress(
    options: Pick<RemoteVipWorkerOptions, "onProgress">,
    progress: RemoteVipWorkerProgress,
) {
    console.log("[VIP remote worker]", progress);
    await options.onProgress?.(progress);
}

function delay(ms: number) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}
