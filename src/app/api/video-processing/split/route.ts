import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { putSplitDownloadEntry } from "@/lib/video-processing/split-download-store";
import {
    VideoSplitError,
    type VideoSplitMode,
    runVideoSplit,
} from "@/lib/video-processing/video-split";

export const runtime = "nodejs";

function readStringField(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-tools");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        if (!(file instanceof File)) {
            throw new VideoSplitError(
                "VAL_VIDEO_REQUIRED",
                "videoFile is required.",
                400,
            );
        }

        const modeRaw = readStringField(formData, "mode");
        const mode: VideoSplitMode = modeRaw === "head" ? "head" : "interval";
        const intervalMinutes = Number(readStringField(formData, "intervalMinutes"));
        const headMinutes = Number(readStringField(formData, "headMinutes"));

        const output = await runVideoSplit({
            fileName: file.name || "source.mp4",
            fileBytes: new Uint8Array(await file.arrayBuffer()),
            mode,
            intervalMinutes: Number.isFinite(intervalMinutes)
                ? intervalMinutes
                : undefined,
            headMinutes: Number.isFinite(headMinutes) ? headMinutes : undefined,
        });

        const download = await putSplitDownloadEntry({
            filePath: output.archivePath,
            fileName: output.archiveName,
            mimeType: "application/zip",
        });

        return NextResponse.json({
            ok: true,
            data: {
                mode: output.mode,
                outputCount: output.outputCount,
                archiveName: output.archiveName,
                downloadId: download.id,
                downloadUrl: `/api/video-processing/split/download/${download.id}`,
            },
        });
    } catch (error) {
        if (error instanceof VideoSplitError) {
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
                errorCode: "SYS_VIDEO_SPLIT_FAILED",
                error:
                    error instanceof Error ? error.message : "Video split failed.",
            },
            { status: 500 },
        );
    }
}
