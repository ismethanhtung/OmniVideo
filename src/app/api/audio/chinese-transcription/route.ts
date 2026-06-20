import { NextResponse } from "next/server";

import {
    applyDemoRateLimit,
    requireOwnerForProviderAccount,
} from "@/lib/access-control/route-guards";
import { runChineseVideoTranscription } from "@/lib/multilingual-audio/chinese-transcription";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function readNumberFormValue(formData: FormData, key: string) {
    const raw = readFormValue(formData, key).trim();
    if (!raw) return undefined;
    const value = Number(raw);
    return Number.isFinite(value) ? value : undefined;
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "audio-transcription");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const assetId = readFormValue(formData, "assetId").trim();
        const providerId = readFormValue(formData, "providerId").trim();
        const model = readFormValue(formData, "model").trim();
        const providerAccessDenied = requireOwnerForProviderAccount(
            request,
            providerId || undefined,
        );
        if (providerAccessDenied) return providerAccessDenied;

        let source:
            | {
                  fileName: string;
                  mimeType?: string;
                  fileSizeBytes: number;
                  fileBytes: Uint8Array;
              }
            | undefined;

        if (file instanceof File) {
            source = {
                fileName: file.name || "source.mp4",
                mimeType: file.type || undefined,
                fileSizeBytes: file.size,
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
                mimeType:
                    download.headers.get("content-type") ??
                    asset.mimeType ??
                    "video/mp4",
                fileSizeBytes: arrayBuffer.byteLength,
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

        let providerConfig:
            | {
                  transcriptionApiKey: string;
                  transcriptionBaseUrl: string;
                  transcriptionProviderName: string;
              }
            | undefined;
        if (providerId) {
            const { getAiProviderById, getAiProvidersDb } = await import(
                "@/lib/ai-providers/repository"
            );
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            providerConfig = {
                transcriptionApiKey: provider.apiKey,
                transcriptionBaseUrl: provider.baseUrl,
                transcriptionProviderName: provider.label,
            };
        }

        const result = await runChineseVideoTranscription({
            fileName: source.fileName,
            mimeType: source.mimeType,
            fileSizeBytes: source.fileSizeBytes,
            fileBytes: source.fileBytes,
            language: readFormValue(formData, "language") || "zh",
            prompt: readFormValue(formData, "prompt") || undefined,
            transcriptionModel: model || undefined,
            ...providerConfig,
            includeWordTimestamps:
                readFormValue(formData, "includeWordTimestamps") === "true",
            videoSpeedFactor: readNumberFormValue(formData, "videoSpeedFactor"),
            retryPromptHardConstraint:
                readFormValue(formData, "retryPromptHardConstraint") === "true",
        });

        return NextResponse.json({ ok: true, data: result });
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
                errorCode: "PRV_GROQ_TRANSCRIPTION_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Audio transcription API failed.",
            },
            { status: 500 },
        );
    }
}
