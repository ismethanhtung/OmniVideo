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

function normalizeEndpoint(endpoint: string) {
    return endpoint.replace(/\/+$/u, "");
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
    const response = await fetchImpl(
        `${normalizeEndpoint(endpoint)}/api/audio/video-vip-voice-render`,
        {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        },
    );

    const body = (await response.json().catch(() => null)) as
        | {
              ok?: boolean;
              data?: RemoteVipWorkerResponseData;
              error?: string;
              errorCode?: string;
          }
        | null;
    if (!response.ok || !body?.ok || !body.data) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            body?.error ??
                `Remote VIP worker failed with HTTP ${response.status}.`,
            response.status >= 400 ? response.status : 500,
        );
    }

    if (body.data.artifactId) {
        const artifactResponse = await fetchImpl(
            `${normalizeEndpoint(endpoint)}/api/workspace/artifacts/${encodeURIComponent(
                body.data.artifactId,
            )}/download`,
            {
                method: "GET",
                headers: {
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            },
        );
        if (!artifactResponse.ok) {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                `Remote VIP worker artifact download failed with HTTP ${artifactResponse.status}.`,
                artifactResponse.status >= 400 ? artifactResponse.status : 500,
            );
        }
        return {
            ...body.data,
            videoBytes: Buffer.from(await artifactResponse.arrayBuffer()),
        } as Result;
    }

    return {
        ...body.data,
        videoBytes: body.data.videoBase64
            ? Buffer.from(body.data.videoBase64, "base64")
            : body.data.videoBytes
              ? Buffer.from(body.data.videoBytes)
              : undefined,
    } as Result;
}
