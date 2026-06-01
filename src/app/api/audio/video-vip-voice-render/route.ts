import { NextResponse } from "next/server";

import {
    type ChineseTranscriptionResult,
    ChineseTranscriptionError,
    type TranscriptTranslationResult,
    type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";
import {
    runVideoVipRemoteRender,
    runVideoVipVoiceRender,
    type VideoVipRemoteRenderInput,
    type VideoVipVoiceRenderInput,
} from "@/lib/multilingual-audio/video-vip-processing";
import { buildWorkspaceMediaPayload } from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

function readBearerToken(request: Request) {
    const header = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/iu.exec(header);
    return match?.[1]?.trim() ?? "";
}

function requireWorkerToken(request: Request) {
    const expected = process.env.OMNIVIDEO_REMOTE_VIP_TOKEN?.trim();
    if (!expected) return null;
    const received = readBearerToken(request);
    if (received === expected) return null;
    return NextResponse.json(
        {
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: "Remote VIP worker token is invalid.",
        },
        { status: 401 },
    );
}

function parseBase64Bytes(fileBase64: unknown, message: string) {
    if (typeof fileBase64 !== "string" || !fileBase64.trim()) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            message,
            400,
        );
    }
    return Buffer.from(fileBase64, "base64");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function parseWorkerPayload(request: Request) {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const payloadJson = formData.get("payloadJson");
        const file = formData.get("videoFile");
        const voiceFile = formData.get("voiceFile");
        if (typeof payloadJson !== "string" || !payloadJson.trim()) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "payloadJson is required for remote VIP voice/render.",
                400,
            );
        }
        if (!(file instanceof File)) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "videoFile is required for remote VIP voice/render.",
                400,
            );
        }
        const payload = JSON.parse(payloadJson) as Record<string, unknown>;
        const executionMode = normalizeWorkerExecutionMode(payload.executionMode);
        if (executionMode === "render-only" && !(voiceFile instanceof File)) {
            throw new ChineseTranscriptionError(
                "VAL_TTS_SEGMENTS_REQUIRED",
                "voiceFile is required for remote VIP render.",
                400,
            );
        }
        return {
            payload,
            fileBytes: new Uint8Array(await file.arrayBuffer()),
            voiceBytes:
                voiceFile instanceof File
                    ? new Uint8Array(await voiceFile.arrayBuffer())
                    : undefined,
            fileName: file.name || undefined,
            mimeType: file.type || undefined,
        };
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const executionMode = normalizeWorkerExecutionMode(payload.executionMode);
    return {
        payload,
        fileBytes: parseBase64Bytes(
            payload.fileBase64,
            "fileBase64 is required for remote VIP voice/render.",
        ),
        voiceBytes:
            executionMode === "render-only"
                ? parseBase64Bytes(
                      payload.voiceBase64,
                      "voiceBase64 is required for remote VIP render.",
                  )
                : undefined,
        fileName: undefined,
        mimeType: undefined,
    };
}

function normalizeWorkerExecutionMode(value: unknown) {
    return value === "voice-render" ? "voice-render" : "render-only";
}

function readTranslatedSegments(payload: Record<string, unknown>) {
    const translatedSegments = Array.isArray(payload.translatedSegments)
        ? (payload.translatedSegments as TranscriptTranslationResult["translatedSegments"])
        : isRecord(payload.translation) &&
            Array.isArray(payload.translation.translatedSegments)
          ? (payload.translation
                .translatedSegments as TranscriptTranslationResult["translatedSegments"])
          : null;
    if (!translatedSegments) {
        throw new ChineseTranscriptionError(
            "VAL_TRANSLATION_SEGMENTS_REQUIRED",
            "translatedSegments are required for remote VIP render.",
            400,
        );
    }
    return translatedSegments;
}

function readTranscript(payload: Record<string, unknown>) {
    if (!isRecord(payload.transcript)) {
        throw new ChineseTranscriptionError(
            "VAL_TTS_SEGMENTS_REQUIRED",
            "transcript is required for remote VIP voice/render.",
            400,
        );
    }
    return payload.transcript as ChineseTranscriptionResult;
}

function readTranslation(payload: Record<string, unknown>) {
    if (
        isRecord(payload.translation) &&
        Array.isArray(payload.translation.translatedSegments)
    ) {
        return payload.translation as TranscriptTranslationResult;
    }
    const translatedSegments = readTranslatedSegments(payload);
    return {
        sourceLanguage:
            typeof payload.sourceLanguage === "string"
                ? payload.sourceLanguage
                : "zh",
        targetLanguage:
            typeof payload.targetLanguage === "string"
                ? payload.targetLanguage
                : "vi",
        model:
            typeof payload.model === "string"
                ? payload.model
                : "remote-worker",
        translatedSegments,
        generationDurationMs: 0,
        chunks: [],
        provider: { name: "remote-worker" },
    } satisfies TranscriptTranslationResult;
}

export function GET() {
    return NextResponse.json({
        ok: true,
        service: "omnivideo-vip-voice-render",
    });
}

export async function POST(request: Request) {
    const denied = requireWorkerToken(request);
    if (denied) return denied;

    try {
        const { payload, fileBytes, voiceBytes, fileName, mimeType } =
            await parseWorkerPayload(request);
        const executionMode = normalizeWorkerExecutionMode(payload.executionMode);

        const baseInput = {
            fileName:
                typeof payload.fileName === "string" && payload.fileName.trim()
                    ? payload.fileName
                    : fileName ?? "source.mp4",
            sourceTitle:
                typeof payload.sourceTitle === "string"
                    ? payload.sourceTitle
                    : undefined,
            mimeType:
                typeof payload.mimeType === "string"
                    ? payload.mimeType
                    : mimeType,
            fileSizeBytes:
                typeof payload.fileSizeBytes === "number"
                    ? payload.fileSizeBytes
                    : fileBytes.byteLength,
            fileBytes,
            originalAudioVolume:
                typeof payload.originalAudioVolume === "number"
                    ? payload.originalAudioVolume
                    : undefined,
            voiceVolume:
                typeof payload.voiceVolume === "number"
                    ? payload.voiceVolume
                    : undefined,
            videoSpeedFactor:
                typeof payload.videoSpeedFactor === "number"
                    ? payload.videoSpeedFactor
                    : undefined,
            renderPreset:
                payload.renderPreset === "veryfast" ||
                payload.renderPreset === "superfast"
                    ? payload.renderPreset
                    : undefined,
            mirrorEnabled:
                typeof payload.mirrorEnabled === "boolean"
                    ? payload.mirrorEnabled
                    : undefined,
            blur: isRecord(payload.blur)
                ? (payload.blur as VideoVipRemoteRenderInput["blur"])
                : undefined,
            coverBoxes: isRecord(payload.coverBoxes)
                ? (payload.coverBoxes as VideoVipRemoteRenderInput["coverBoxes"])
                : undefined,
            subtitleStyle: isRecord(payload.subtitleStyle)
                ? (payload.subtitleStyle as VideoVipRemoteRenderInput["subtitleStyle"])
                : undefined,
            textOverlays: isRecord(payload.textOverlays)
                ? (payload.textOverlays as VideoVipRemoteRenderInput["textOverlays"])
                : undefined,
            omitVideoBase64: true,
        };

        const result =
            executionMode === "voice-render"
                ? await runVideoVipVoiceRender({
                      ...(baseInput as Omit<
                          VideoVipVoiceRenderInput,
                          "transcript" | "translation"
                      >),
                      transcript: readTranscript(payload),
                      translation: readTranslation(payload),
                      ttsSettings: isRecord(payload.ttsSettings)
                          ? (payload.ttsSettings as Partial<VoiceGenerationSettings>)
                          : undefined,
                  })
                : await runVideoVipRemoteRender({
                      ...(baseInput as Omit<
                          VideoVipRemoteRenderInput,
                          "voiceAudioBase64" | "translatedSegments"
                      >),
                      voiceAudioBase64: Buffer.from(voiceBytes ?? []).toString(
                          "base64",
                      ),
                      translatedSegments: readTranslatedSegments(payload),
                  });
        const videoBytes = result.videoBytes ?? Buffer.from(
            result.videoBase64 ?? "",
            "base64",
        );
        const mediaPayload = buildWorkspaceMediaPayload({
            bytes: videoBytes,
            fileName: result.fileName,
            mimeType: result.mimeType,
            kind: "video",
            base64Field: "videoBase64",
            inlineLimitBytes: 0,
        });

        return NextResponse.json({
            ok: true,
            data: {
                ...result,
                ...mediaPayload,
                videoBytes: undefined,
                videoBase64:
                    "videoBase64" in mediaPayload
                        ? mediaPayload.videoBase64
                        : undefined,
            },
        });
    } catch (error) {
        if (error instanceof ChineseTranscriptionError) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: error.code,
                    error: error.message,
                    steps: error.steps,
                },
                { status: error.status },
            );
        }

        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_DUBBING_MUX_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Remote VIP voice/render API failed.",
            },
            { status: 500 },
        );
    }
}
