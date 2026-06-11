import { NextResponse } from "next/server";
import { applyDemoRateLimit, requireOwnerForProviderAccount } from "@/lib/access-control/route-guards";
import {
    uploadVideoToGemini,
    pollGeminiFileStatus,
    generateGeminiNarrationScript,
} from "@/lib/multilingual-audio/video-narrator";
import {
    ChineseTranscriptionError,
    type ChineseTranscriptionResult,
    type TranscriptTranslationResult,
} from "@/lib/multilingual-audio/types";
import { runVideoVipVoiceRender } from "@/lib/multilingual-audio/video-vip-processing";
import { runRemoteVideoVipVoiceRender } from "@/lib/multilingual-audio/remote-vip-worker";
import { buildWorkspaceMediaPayload } from "@/lib/workspace/server-artifacts";
import type { SubtitleDisplayMode } from "@/lib/video-processing/video-edit-pipeline";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function readOptionalNumber(formData: FormData, key: string) {
    const value = readFormValue(formData, key);
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function readOptionalBoolean(formData: FormData, key: string) {
    const value = readFormValue(formData, key);
    if (!value.trim()) return undefined;
    return value === "true";
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-narrator");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const assetId = readFormValue(formData, "assetId").trim();
        const providerId = readFormValue(formData, "providerId").trim();
        const model = readFormValue(formData, "model").trim() || "gemini-1.5-flash";
        const prompt = readFormValue(formData, "prompt").trim();

        // Check if this is a render request
        const segmentsJson = readFormValue(formData, "segmentsJson").trim();

        const guardProviderId = (providerId && providerId !== "env-gemini") ? providerId : undefined;
        const providerAccessDenied = requireOwnerForProviderAccount(request, guardProviderId);
        if (providerAccessDenied) return providerAccessDenied;

        let source: {
            fileName: string;
            sourceTitle?: string;
            mimeType: string;
            fileBytes: Uint8Array;
        } | undefined;

        if (file instanceof File) {
            source = {
                fileName: file.name || "source.mp4",
                sourceTitle: file.name ? file.name.replace(/\.[^.]+$/u, "") : undefined,
                mimeType: file.type || "video/mp4",
                fileBytes: new Uint8Array(await file.arrayBuffer()),
            };
        } else if (assetId) {
            const { getIntakeDb, getVideoAssetById } = await import(
                "@/lib/video-intake/repository"
            );
            const { resolveAssetDownload } = await import(
                "@/lib/storage/asset-download"
            );
            const db = await getIntakeDb();
            const asset = await getVideoAssetById({ db, assetId });
            if (!asset) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "VAL_AUDIO_FILE_REQUIRED",
                        error: "Storage asset was not found.",
                    },
                    { status: 404 },
                );
            }

            const download = await resolveAssetDownload({
                db,
                asset,
                disposition: "attachment",
            });
            if (!download.ok) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "VAL_AUDIO_FILE_REQUIRED",
                        error: download.error,
                    },
                    { status: download.status },
                );
            }

            const arrayBuffer = await new Response(download.body).arrayBuffer();
            source = {
                fileName: `${asset.metadata?.title ?? assetId}.mp4`,
                sourceTitle: asset.metadata?.title || undefined,
                mimeType: download.headers.get("content-type") || asset.mimeType || "video/mp4",
                fileBytes: new Uint8Array(arrayBuffer),
            };
        }

        if (!source) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_AUDIO_FILE_REQUIRED",
                    error: "videoFile or assetId is required.",
                },
                { status: 400 },
            );
        }

        // --- RENDER FLOW ---
        if (segmentsJson) {
            const segments = JSON.parse(segmentsJson) as Array<{
                id: number;
                start: number;
                end: number;
                text: string;
            }>;

            const requestedExecutionMode =
                readFormValue(formData, "executionMode").trim() || "local";
            const remoteEndpoint = readFormValue(formData, "remoteEndpoint").trim();
            const remoteToken = readFormValue(formData, "remoteToken").trim();

            const originalAudioVolume = readOptionalNumber(formData, "originalAudioVolume");
            const voiceVolume = readOptionalNumber(formData, "voiceVolume");
            const videoSpeedFactor = readOptionalNumber(formData, "videoSpeedFactor") ?? 1.0;
            const subtitleMode =
                readFormValue(formData, "subtitleMode").trim() || "standard";
            const executionMode =
                subtitleMode === "triple-word-highlight"
                    ? "local"
                    : requestedExecutionMode;
            const subtitleFontFamily = readFormValue(formData, "subtitleFontFamily").trim() || "Bangers";
            const subtitleFontSize = readOptionalNumber(formData, "subtitleFontSize") ?? 40;
            const subtitleTextColor = readFormValue(formData, "subtitleTextColor").trim() || "#FFFFCC";
            const subtitleMarginBottom = readOptionalNumber(formData, "subtitleMarginBottom") ?? 150;
            const subtitleMarginLeft = readOptionalNumber(formData, "subtitleMarginLeft") ?? 60;
            const subtitleMarginRight = readOptionalNumber(formData, "subtitleMarginRight") ?? 60;
            const subtitleAlignment = readOptionalNumber(formData, "subtitleAlignment") ?? 2;
            const subtitleBackgroundEnabled =
                readOptionalBoolean(formData, "subtitleBackgroundEnabled") ?? true;
            const subtitleBackgroundColor =
                readFormValue(formData, "subtitleBackgroundColor").trim() || "#000000";
            const subtitleBackgroundOpacity =
                readOptionalNumber(formData, "subtitleBackgroundOpacity") ?? 0;
            const subtitleBackgroundPaddingY =
                readOptionalNumber(formData, "subtitleBackgroundPaddingY") ?? 2;

            const ttsSettings = {
                binaryPath: readFormValue(formData, "ttsBinaryPath") || undefined,
                modelPath: readFormValue(formData, "ttsModelPath") || undefined,
                configPath: readFormValue(formData, "ttsConfigPath") || undefined,
                speaker: readOptionalNumber(formData, "ttsSpeaker"),
                lengthScale: readOptionalNumber(formData, "ttsLengthScale"),
                noiseScale: readOptionalNumber(formData, "ttsNoiseScale"),
                noiseW: readOptionalNumber(formData, "ttsNoiseW"),
                sentenceSilence: readOptionalNumber(formData, "ttsSentenceSilence"),
                preserveTimestampGaps: readOptionalBoolean(formData, "ttsPreserveTimestampGaps") ?? true,
                alignmentMode: "strict" as const,
            };

            // Build faked transcript & translation
            const transcript: ChineseTranscriptionResult = {
                text: segments.map((s) => s.text).join(""),
                language: "vi",
                model: "whisper-large-v3-turbo" as const,
                segments: segments.map((s) => ({
                    id: s.id,
                    start: s.start,
                    end: s.end,
                    text: s.text,
                })),
                words: [], // Empty words array forces timing logic to fall back to translatedSegments timestamps!
                source: {
                    fileName: source.fileName,
                    mimeType: source.mimeType,
                    fileSizeBytes: source.fileBytes.byteLength,
                },
                audio: {
                    format: "mp3" as const,
                    sampleRate: 16000,
                    channels: 1,
                    bitrateKbps: 64,
                    fileSizeBytes: 0,
                },
                steps: [],
                provider: {
                    name: "groq" as const,
                },
            };

            const translation: TranscriptTranslationResult = {
                sourceLanguage: "vi",
                targetLanguage: "vi",
                model: "google/gemini-1.5-flash",
                translatedSegments: segments.map((s) => ({
                    id: s.id,
                    start: s.start,
                    end: s.end,
                    sourceText: s.text,
                    translatedText: s.text,
                })),
                generationDurationMs: 0,
                chunks: [],
                provider: {
                    name: "gemini",
                },
            };

            const renderInput = {
                fileName: source.fileName,
                sourceTitle: source.sourceTitle,
                mimeType: source.mimeType,
                fileSizeBytes: source.fileBytes.byteLength,
                fileBytes: source.fileBytes,
                originalAudioVolume,
                voiceVolume,
                videoSpeedFactor,
                transcript,
                translation,
                ttsSettings,
                subtitleStyle: {
                    subtitleMode: subtitleMode as SubtitleDisplayMode,
                    fontFamily: subtitleFontFamily,
                    fontSize: subtitleFontSize,
                    textColor: subtitleTextColor,
                    marginBottom: subtitleMarginBottom,
                    marginLeft: subtitleMarginLeft,
                    marginRight: subtitleMarginRight,
                    alignment: subtitleAlignment,
                    backgroundEnabled: subtitleBackgroundEnabled,
                    backgroundColor: subtitleBackgroundColor,
                    backgroundOpacity: subtitleBackgroundOpacity,
                    backgroundPaddingY: subtitleBackgroundPaddingY,
                },
                omitVideoBase64: true,
            };

            let renderResult;
            if (executionMode === "remote") {
                if (!remoteEndpoint) {
                    throw new Error("Remote EC2 endpoint is not configured in Server settings.");
                }
                renderResult = await runRemoteVideoVipVoiceRender(renderInput, {
                    endpoint: remoteEndpoint,
                    token: remoteToken || undefined,
                });
            } else {
                renderResult = await runVideoVipVoiceRender(renderInput);
            }

            const mediaPayload = buildWorkspaceMediaPayload({
                bytes: renderResult.videoBytes ?? Buffer.from(renderResult.videoBase64 ?? "", "base64"),
                fileName: renderResult.fileName,
                mimeType: renderResult.mimeType,
                kind: "video",
                base64Field: "videoBase64",
            });

            return NextResponse.json({
                ok: true,
                data: {
                    ...renderResult,
                    ...mediaPayload,
                    videoBase64: "videoBase64" in mediaPayload ? mediaPayload.videoBase64 : undefined,
                    videoBytes: undefined,
                },
            });
        }

        // --- SCRIPT GENERATION FLOW ---
        // Resolve Gemini API key
        let apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";

        if (providerId && providerId !== "env-gemini") {
            const { getAiProviderById, getAiProvidersDb } = await import(
                "@/lib/ai-providers/repository"
            );
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            if (provider.apiKey) {
                apiKey = provider.apiKey;
            }
        }

        if (!apiKey) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "CFG_GROQ_API_KEY_MISSING",
                    error: "Google AI Studio API key is missing. Please configure it under AI Providers or set GEMINI_API_KEY in .env.",
                },
                { status: 400 },
            );
        }

        const uploadResult = await uploadVideoToGemini(
            source.fileBytes,
            source.mimeType,
            apiKey,
        );

        await pollGeminiFileStatus(uploadResult.fileName, apiKey);

        const segments = await generateGeminiNarrationScript({
            fileUri: uploadResult.fileUri,
            mimeType: source.mimeType,
            apiKey,
            model,
            customPrompt: prompt || undefined,
        });

        return NextResponse.json({
            ok: true,
            data: {
                segments,
                model,
                provider: {
                    name: "gemini",
                    fileUri: uploadResult.fileUri,
                },
            },
        });
    } catch (error) {
        if (error instanceof ChineseTranscriptionError) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: error.code,
                    error: error.message,
                },
                { status: error.status },
            );
        }

        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_DUBBING_MUX_FAILED",
                error: error instanceof Error ? error.message : "Video narrator request failed.",
            },
            { status: 500 },
        );
    }
}
