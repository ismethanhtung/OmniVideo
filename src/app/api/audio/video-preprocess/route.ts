import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";
import { preprocessVideoSpeed } from "@/lib/multilingual-audio/video-preprocess";
import {
    buildWorkspaceMediaPayload,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

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

function readArtifactVideo(artifactId: string) {
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
    };
}

export async function POST(request: Request) {
    try {
        const startedAt = Date.now();
        const rateLimited = applyDemoRateLimit(request, "video-dubbing");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const assetId = readFormValue(formData, "assetId").trim();
        const artifactId = readFormValue(formData, "artifactId").trim();

        let source:
            | {
                  fileName: string;
                  mimeType?: string;
                  fileBytes: Uint8Array;
              }
            | undefined;

        if (file instanceof File) {
            source = {
                fileName: file.name || "source.mp4",
                mimeType: file.type || undefined,
                fileBytes: new Uint8Array(await file.arrayBuffer()),
            };
        } else if (artifactId) {
            source = readArtifactVideo(artifactId);
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
            source = {
                fileName: `${asset.metadata?.title ?? assetId}.mp4`,
                mimeType:
                    download.headers.get("content-type") ??
                    asset.mimeType ??
                    "video/mp4",
                fileBytes: new Uint8Array(arrayBuffer),
            };
        }

        if (!source) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "videoFile or assetId is required.",
                400,
            );
        }

        const speedFactor = readNumberFormValue(formData, "videoSpeedFactor") ?? 1;
        const output = await preprocessVideoSpeed({
            fileName: source.fileName,
            fileBytes: source.fileBytes,
            speedFactor,
        });

        const mediaPayload = buildWorkspaceMediaPayload({
            bytes: output.fileBytes,
            fileName: output.fileName,
            mimeType: "video/mp4",
            kind: "video",
            base64Field: "videoBase64",
        });

        return NextResponse.json({
            ok: true,
            data: {
                speedFactor: output.speedFactor,
                generationDurationMs: Date.now() - startedAt,
                ...mediaPayload,
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
                error:
                    error instanceof Error ? error.message : "Video preprocess API failed.",
            },
            { status: 500 },
        );
    }
}
