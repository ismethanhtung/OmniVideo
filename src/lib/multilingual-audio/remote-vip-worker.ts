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
    const formData = createRemoteVipWorkerFormData({
        payload,
        sourceVideoBytes,
        sourceFileName: input.fileName,
        sourceMimeType: input.mimeType,
        voiceAudioBase64,
    });

    return await postRemoteVipWorker<VideoVipRemoteRenderResult>(
        formData,
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
    const formData = createRemoteVipWorkerFormData({
        payload,
        sourceVideoBytes,
        sourceFileName: input.fileName,
        sourceMimeType: input.mimeType,
    });

    return await postRemoteVipWorker<VideoVipVoiceRenderResult>(
        formData,
        options,
    );
}

function createRemoteVipWorkerFormData(input: {
    payload: RemoteVipWorkerPayload | RemoteVipVoiceRenderWorkerPayload;
    sourceVideoBytes: Uint8Array;
    sourceFileName: string;
    sourceMimeType?: string;
    voiceAudioBase64?: string;
}) {
    const formData = new FormData();
    formData.set("payloadJson", JSON.stringify(input.payload));
    formData.set("async", "1");
    formData.set(
        "videoFile",
        new Blob([Buffer.from(input.sourceVideoBytes)], {
            type: input.sourceMimeType ?? "video/mp4",
        }),
        input.sourceFileName || "source.mp4",
    );
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

async function postRemoteVipWorker<Result extends RemoteVipWorkerResponseData>(
    formData: FormData,
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
    const response = await fetchRemoteVipWorker(
        fetchImpl,
        workerUrl,
        {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        },
        "start request",
    );

    const body = (await response.json().catch(() => null)) as
        | (RemoteVipWorkerJobResponse & {
              data?: RemoteVipWorkerResponseData &
                  NonNullable<RemoteVipWorkerJobResponse["data"]>;
          })
        | null;
    if (!response.ok || !body?.ok || !body.data) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            body?.error ??
                `Remote VIP worker failed with HTTP ${response.status}.`,
            response.status >= 400 ? response.status : 500,
        );
    }

    if (body.data.jobId) {
        const result = await pollRemoteVipWorkerJob<Result>({
            endpoint,
            token,
            fetchImpl,
            jobId: body.data.jobId,
            pollIntervalMs: resolvePollIntervalMs(options),
            pollTimeoutMs: resolvePollTimeoutMs(options),
        });
        return await hydrateRemoteVipWorkerResult(result, {
            endpoint,
            token,
            fetchImpl,
        });
    }

    return await hydrateRemoteVipWorkerResult(body.data as Result, {
        endpoint,
        token,
        fetchImpl,
    });
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

async function pollRemoteVipWorkerJob<Result extends RemoteVipWorkerResponseData>(
    input: {
        endpoint: string;
        token: string;
        fetchImpl: typeof fetch;
        jobId: string;
        pollIntervalMs: number;
        pollTimeoutMs: number;
    },
): Promise<Result> {
    const startedAt = Date.now();
    let attempt = 0;
    let lastLoggedStage = "";
    let lastLoggedAt = 0;
    while (Date.now() - startedAt <= input.pollTimeoutMs) {
        if (attempt > 0) {
            await delay(input.pollIntervalMs);
        }
        attempt += 1;
        const workerUrl = `${normalizeEndpoint(input.endpoint)}/api/audio/video-vip-voice-render?jobId=${encodeURIComponent(
            input.jobId,
        )}`;
        const response = await fetchRemoteVipWorker(
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
        if (body.data.status === "running") {
            const stage = body.data.stage ?? "running";
            const shouldLog =
                stage !== lastLoggedStage || Date.now() - lastLoggedAt > 60000;
            if (shouldLog) {
                lastLoggedStage = stage;
                lastLoggedAt = Date.now();
                console.log("[VIP remote worker]", {
                    jobId: input.jobId,
                    status: body.data.status,
                    stage,
                    message: body.data.message,
                    metrics: body.data.metrics,
                    elapsedMs: Date.now() - startedAt,
                });
            }
        }
        if (body.data.status === "done" && body.data.result) {
            console.log("[VIP remote worker]", {
                jobId: input.jobId,
                status: "done",
                elapsedMs: Date.now() - startedAt,
            });
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
    },
): Promise<Result> {
    if (result.artifactId) {
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
        return {
            ...result,
            videoBytes: Buffer.from(await artifactResponse.arrayBuffer()),
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

function delay(ms: number) {
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}
