import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { putSplitDownloadEntry } from "@/lib/video-processing/split-download-store";
import { VideoSplitError, runVideoSplit } from "@/lib/video-processing/video-split";
import { parseMultipartStream } from "@/lib/video-processing/multipart-parser";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const workDir = path.join(tmpdir(), `omnivideo-split-${randomUUID()}`);
    try {
        const rateLimited = applyDemoRateLimit(request, "video-tools");
        if (rateLimited) return rateLimited;

        const parsed = await parseMultipartStream(request, workDir);
        if (!parsed.filePath) {
            throw new VideoSplitError(
                "VAL_VIDEO_REQUIRED",
                "videoFile is required.",
                400,
            );
        }

        const modeRaw = (parsed.fields.mode || "").trim();
        const mode = modeRaw === "head" ? "head" : modeRaw === "parts" ? "parts" : "interval";
        const intervalMinutes = Number((parsed.fields.intervalMinutes || "").trim());
        const headMinutes = Number((parsed.fields.headMinutes || "").trim());
        const splitParts = Number((parsed.fields.splitParts || "").trim());

        const output = await runVideoSplit({
            fileName: parsed.fileName || "source.mp4",
            sourceFilePath: parsed.filePath,
            workDirOverride: workDir,
            mode,
            intervalMinutes: Number.isFinite(intervalMinutes)
                ? intervalMinutes
                : undefined,
            headMinutes: Number.isFinite(headMinutes) ? headMinutes : undefined,
            splitParts: Number.isFinite(splitParts) ? splitParts : undefined,
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
