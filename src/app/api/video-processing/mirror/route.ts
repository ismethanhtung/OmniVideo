import { NextResponse } from "next/server";

import {
    MirrorVideoError,
    runMirrorVideo,
} from "@/lib/video-processing/mirror-video";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("videoFile");

        if (!(file instanceof File)) {
            throw new MirrorVideoError(
                "VAL_MIRROR_VIDEO_REQUIRED",
                "videoFile is required.",
                400,
            );
        }

        const result = await runMirrorVideo({
            fileName: file.name || "source.mp4",
            mimeType: file.type || undefined,
            fileSizeBytes: file.size,
            fileBytes: new Uint8Array(await file.arrayBuffer()),
            axis: readFormValue(formData, "axis") || "horizontal",
        });

        return NextResponse.json({ ok: true, data: result });
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
