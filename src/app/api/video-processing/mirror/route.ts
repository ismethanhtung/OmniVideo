import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import {
    MirrorVideoError,
    runMirrorVideo,
} from "@/lib/video-processing/mirror-video";
import {
    buildWorkspaceMediaPayload,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function readWorkspaceArtifactVideo(artifactId: string) {
    const artifact = getWorkspaceServerArtifact(artifactId);
    if (!artifact || artifact.kind !== "video") {
        throw new MirrorVideoError(
            "VAL_MIRROR_VIDEO_REQUIRED",
            "Workspace video artifact was not found or has expired.",
            404,
        );
    }

    return {
        fileName: artifact.fileName,
        mimeType: artifact.mimeType,
        fileBytes: new Uint8Array(artifact.bytes),
        fileSizeBytes: artifact.byteLength,
    };
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-mirror");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const artifactId = readFormValue(formData, "artifactId").trim();

        if (!(file instanceof File) && !artifactId) {
            throw new MirrorVideoError(
                "VAL_MIRROR_VIDEO_REQUIRED",
                "videoFile or artifactId is required.",
                400,
            );
        }

        const source =
            file instanceof File
                ? {
                      fileName: file.name || "source.mp4",
                      mimeType: file.type || undefined,
                      fileSizeBytes: file.size,
                      fileBytes: new Uint8Array(await file.arrayBuffer()),
                  }
                : readWorkspaceArtifactVideo(artifactId);

        const result = await runMirrorVideo({
            ...source,
            axis: readFormValue(formData, "axis") || "horizontal",
        });

        const mediaPayload = buildWorkspaceMediaPayload({
            bytes: Buffer.from(result.videoBase64 ?? "", "base64"),
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
                    "videoBase64" in mediaPayload
                        ? mediaPayload.videoBase64
                        : undefined,
            },
        });
    } catch (error) {
        if (error instanceof MirrorVideoError) {
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
                errorCode: "SYS_MIRROR_VIDEO_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Mirror Video API failed.",
            },
            { status: 500 },
        );
    }
}
