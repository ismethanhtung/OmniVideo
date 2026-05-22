import { NextResponse } from "next/server";

import {
    applyDemoRateLimit,
    requireOwnerForProviderAccount,
} from "@/lib/access-control/route-guards";
import { resolveAssetDownload } from "@/lib/storage/asset-download";
import {
    type VoiceGenerationSettings,
    ChineseTranscriptionError,
} from "@/lib/multilingual-audio/types";
import { runVideoVipProcessing } from "@/lib/multilingual-audio/video-vip-processing";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";
import {
    buildWorkspaceMediaPayload,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

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

function readOptionalAlignmentMode(formData: FormData) {
    const value = readFormValue(formData, "ttsAlignmentMode").trim();
    return value === "strict" || value === "balanced" ? value : undefined;
}

function readSetupNumber(
    setup: Record<string, unknown> | null | undefined,
    key: string,
) {
    const value = setup?.[key];
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function readSetupString(
    setup: Record<string, unknown> | null | undefined,
    key: string,
) {
    const value = setup?.[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSetupBoolean(
    setup: Record<string, unknown> | null | undefined,
    key: string,
) {
    const value = setup?.[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return undefined;
}

function readFormNumberWithSetupFallback(input: {
    formData: FormData;
    key: string;
    defaultValue: number;
    setup?: Record<string, unknown> | null;
}) {
    const formValue = readOptionalNumber(input.formData, input.key);
    const setupValue = readSetupNumber(input.setup, input.key);
    if (formValue !== undefined && formValue !== input.defaultValue) {
        return formValue;
    }
    if (setupValue !== undefined) return setupValue;
    return formValue ?? input.defaultValue;
}

function readFormStringWithSetupFallback(input: {
    formData: FormData;
    key: string;
    defaultValue: string;
    setup?: Record<string, unknown> | null;
}) {
    const formValue = readFormValue(input.formData, input.key).trim();
    const setupValue = readSetupString(input.setup, input.key);
    if (formValue && formValue !== input.defaultValue) return formValue;
    return setupValue ?? (formValue || input.defaultValue);
}

function readFormBooleanWithSetupFallback(input: {
    formData: FormData;
    key: string;
    defaultValue: boolean;
    setup?: Record<string, unknown> | null;
}) {
    const formValue = readOptionalBoolean(input.formData, input.key);
    const setupValue = readSetupBoolean(input.setup, input.key);
    if (formValue !== undefined && formValue !== input.defaultValue) {
        return formValue;
    }
    return setupValue ?? formValue ?? input.defaultValue;
}

function readBlurConfig(
    formData: FormData,
    sourceVideoEditSetup?: Record<string, unknown> | null,
) {
    const blurRegionsJson = readFormValue(formData, "blurRegionsJson").trim();
    if (blurRegionsJson) {
        try {
            const parsed = JSON.parse(blurRegionsJson) as Array<{
                x: number;
                y: number;
                width: number;
                height: number;
                start: number;
                end: number;
                strength: number;
            }>;
            if (Array.isArray(parsed) && parsed.length > 0) {
                return {
                    enabled: true,
                    regions: parsed
                        .map((item) => ({
                            region: {
                                x: Number(item.x),
                                y: Number(item.y),
                                width: Number(item.width),
                                height: Number(item.height),
                            },
                            timeline: {
                                start: Number(item.start),
                                end: Number(item.end),
                            },
                            strength: Number(item.strength),
                        }))
                        .filter(
                            (item) =>
                                Number.isFinite(item.region.x) &&
                                Number.isFinite(item.region.y) &&
                                Number.isFinite(item.region.width) &&
                                Number.isFinite(item.region.height) &&
                                Number.isFinite(item.timeline.start) &&
                                Number.isFinite(item.timeline.end) &&
                                Number.isFinite(item.strength),
                        ),
                };
            }
        } catch {
            // fallback to single region fields
        }
    }

    const setupBlurRegions = Array.isArray(sourceVideoEditSetup?.blurRegions)
        ? sourceVideoEditSetup.blurRegions
        : [];
    if (setupBlurRegions.length > 0) {
        return {
            enabled: true,
            regions: setupBlurRegions
                .map((item) => {
                    const candidate =
                        typeof item === "object" && item !== null
                            ? (item as Record<string, unknown>)
                            : null;
                    const region =
                        candidate &&
                        typeof candidate.region === "object" &&
                        candidate.region !== null
                            ? (candidate.region as Record<string, unknown>)
                            : candidate;
                    const timeline =
                        candidate &&
                        typeof candidate.timeline === "object" &&
                        candidate.timeline !== null
                            ? (candidate.timeline as Record<string, unknown>)
                            : candidate;
                    return {
                        region: {
                            x: Number(region?.x),
                            y: Number(region?.y),
                            width: Number(region?.width),
                            height: Number(region?.height),
                        },
                        timeline: {
                            start: Number(timeline?.start),
                            end: Number(timeline?.end),
                        },
                        strength: Number(candidate?.strength),
                    };
                })
                .filter(
                    (item) =>
                        Number.isFinite(item.region.x) &&
                        Number.isFinite(item.region.y) &&
                        Number.isFinite(item.region.width) &&
                        Number.isFinite(item.region.height) &&
                        Number.isFinite(item.timeline.start) &&
                        Number.isFinite(item.timeline.end) &&
                        Number.isFinite(item.strength),
                ),
        };
    }

    return {
        enabled: true,
        region: {
            x: readOptionalNumber(formData, "regionX") ?? 0,
            y: readOptionalNumber(formData, "regionY") ?? 84,
            width: readOptionalNumber(formData, "regionWidth") ?? 100,
            height: readOptionalNumber(formData, "regionHeight") ?? 16,
        },
        timeline: {
            start: readOptionalNumber(formData, "timelineStart") ?? 0,
            end: readOptionalNumber(formData, "timelineEnd") ?? 36000,
        },
        strength: readOptionalNumber(formData, "blurStrength") ?? 50,
    };
}

async function readStorageAssetVideo(assetId: string) {
    const db = await getIntakeDb();
    const asset = await getVideoAssetById({ db, assetId });

    if (!asset) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "Storage asset was not found.",
            404,
        );
    }

    const download = await resolveAssetDownload({
        db,
        asset,
        disposition: "attachment",
    });

    if (!download.ok) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            download.error,
            download.status,
        );
    }

    const arrayBuffer = await new Response(download.body).arrayBuffer();
    return {
        fileName: `${asset.metadata?.title ?? assetId}.mp4`,
        mimeType: download.headers.get("content-type") ?? asset.mimeType ?? "video/mp4",
        fileBytes: new Uint8Array(arrayBuffer),
        sourceVideoEditSetup:
            asset.metadata?.videoEditSetup &&
            typeof asset.metadata.videoEditSetup === "object"
                ? (asset.metadata.videoEditSetup as Record<string, unknown>)
                : null,
    };
}

function readWorkspaceArtifactVideo(artifactId: string) {
    const artifact = getWorkspaceServerArtifact(artifactId);
    if (!artifact || artifact.kind !== "video") {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "Workspace video artifact was not found or has expired.",
            404,
        );
    }

    return {
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        fileBytes: new Uint8Array(artifact.bytes),
        sourceVideoEditSetup: null,
    };
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-vip-processing");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const assetId = readFormValue(formData, "assetId").trim();
        const artifactId = readFormValue(formData, "artifactId").trim();
        const providerId = readFormValue(formData, "providerId").trim();
        const metadataProviderId = readFormValue(formData, "metadataProviderId").trim();
        const useSourceAssetVideoEditSetup =
            readOptionalBoolean(formData, "useSourceAssetVideoEditSetup") ===
            true;

        const providerAccessDenied = requireOwnerForProviderAccount(
            request,
            providerId || metadataProviderId,
        );
        if (providerAccessDenied) return providerAccessDenied;

        let source:
            | {
                  fileName: string;
                  mimeType?: string;
                  fileBytes: Uint8Array;
                  sourceVideoEditSetup?: Record<string, unknown> | null;
              }
            | undefined;

        if (file instanceof File) {
            source = {
                fileName: file.name || "source.mp4",
                mimeType: file.type || undefined,
                fileBytes: new Uint8Array(await file.arrayBuffer()),
                sourceVideoEditSetup: null,
            };
        } else if (artifactId) {
            source = readWorkspaceArtifactVideo(artifactId);
        } else if (assetId) {
            source = await readStorageAssetVideo(assetId);
        }

        if (!source) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "videoFile or assetId is required.",
                400,
            );
        }

        let apiKey: string | undefined;
        let baseUrl: string | undefined;
        let providerName: string | undefined;

        if (providerId) {
            const { getAiProviderById, getAiProvidersDb } = await import(
                "@/lib/ai-providers/repository"
            );
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            apiKey = provider.apiKey;
            baseUrl = provider.baseUrl;
            providerName = provider.label;
        }

        let metadataApiKey: string | undefined;
        let metadataBaseUrl: string | undefined;
        let metadataProviderName: string | undefined;

        if (metadataProviderId) {
            const { getAiProviderById, getAiProvidersDb } = await import(
                "@/lib/ai-providers/repository"
            );
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, metadataProviderId });
            metadataApiKey = provider.apiKey;
            metadataBaseUrl = provider.baseUrl;
            metadataProviderName = provider.label;
        }

        const ttsSettings: Partial<VoiceGenerationSettings> = {
            binaryPath: readFormValue(formData, "ttsBinaryPath") || undefined,
            modelPath: readFormValue(formData, "ttsModelPath") || undefined,
            configPath: readFormValue(formData, "ttsConfigPath") || undefined,
            speaker: readOptionalNumber(formData, "ttsSpeaker"),
            lengthScale: readOptionalNumber(formData, "ttsLengthScale"),
            noiseScale: readOptionalNumber(formData, "ttsNoiseScale"),
            noiseW: readOptionalNumber(formData, "ttsNoiseW"),
            sentenceSilence: readOptionalNumber(formData, "ttsSentenceSilence"),
            preserveTimestampGaps: readOptionalBoolean(
                formData,
                "ttsPreserveTimestampGaps",
            ),
            alignmentMode: readOptionalAlignmentMode(formData),
        };

        const sourceSetupForRender = useSourceAssetVideoEditSetup
            ? source.sourceVideoEditSetup
            : undefined;
        const result = await runVideoVipProcessing({
            fileName: source.fileName,
            mimeType: source.mimeType,
            fileSizeBytes: source.fileBytes.byteLength,
            fileBytes: source.fileBytes,
            language: readFormValue(formData, "language") || "zh",
            sourceLanguage: readFormValue(formData, "sourceLanguage") || undefined,
            targetLanguage: readFormValue(formData, "targetLanguage") || "vi",
            model: readFormValue(formData, "model") || undefined,
            metadataModel: readFormValue(formData, "metadataModel") || undefined,
            apiKey,
            baseUrl,
            providerName,
            metadataApiKey,
            metadataBaseUrl,
            metadataProviderName,
            ttsSettings,
            originalAudioVolume: readOptionalNumber(formData, "originalAudioVolume"),
            voiceVolume: readOptionalNumber(formData, "voiceVolume"),
            videoSpeedFactor: readOptionalNumber(formData, "videoSpeedFactor"),
            mirrorEnabled:
                readOptionalBoolean(formData, "mirrorEnabled") ?? true,
            blur: readBlurConfig(
                formData,
                sourceSetupForRender,
            ),
            subtitleStyle: {
                fontFamily: readFormStringWithSetupFallback({
                    formData,
                    key: "subtitleFontFamily",
                    defaultValue: "Arial",
                    setup: sourceSetupForRender,
                }),
                fontSize: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleFontSize",
                    defaultValue: 55,
                    setup: sourceSetupForRender,
                }),
                marginBottom: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleMarginBottom",
                    defaultValue: 150,
                    setup: sourceSetupForRender,
                }),
                marginLeft: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleMarginLeft",
                    defaultValue: 60,
                    setup: sourceSetupForRender,
                }),
                marginRight: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleMarginRight",
                    defaultValue: 60,
                    setup: sourceSetupForRender,
                }),
                alignment: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleAlignment",
                    defaultValue: 2,
                    setup: sourceSetupForRender,
                }),
                backgroundEnabled:
                    readFormBooleanWithSetupFallback({
                        formData,
                        key: "subtitleBackgroundEnabled",
                        defaultValue: true,
                        setup: sourceSetupForRender,
                    }),
                backgroundColor: readFormStringWithSetupFallback({
                    formData,
                    key: "subtitleBackgroundColor",
                    defaultValue: "#000000",
                    setup: sourceSetupForRender,
                }),
                backgroundOpacity: readFormNumberWithSetupFallback({
                    formData,
                    key: "subtitleBackgroundOpacity",
                    defaultValue: 65,
                    setup: sourceSetupForRender,
                }),
            },
            omitVideoBase64: true,
        });

        const mediaPayload = buildWorkspaceMediaPayload({
            bytes: result.videoBytes ?? Buffer.from(result.videoBase64 ?? "", "base64"),
            fileName: result.fileName,
            mimeType: result.mimeType,
            kind: "video",
            base64Field: "videoBase64",
        });

        return NextResponse.json({
            ok: true,
            data: {
                ...result,
                ...mediaPayload,
                videoBase64:
                    "videoBase64" in mediaPayload ? mediaPayload.videoBase64 : undefined,
                videoBytes: undefined,
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
                        : "Video VIP processing API failed.",
            },
            { status: 500 },
        );
    }
}
