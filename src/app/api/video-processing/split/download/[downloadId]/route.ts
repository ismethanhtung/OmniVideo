import { createReadStream } from "node:fs";
import { rm } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { takeSplitDownloadEntry } from "@/lib/video-processing/split-download-store";

export const runtime = "nodejs";

function buildContentDisposition(fileName: string) {
    const sanitized = fileName.replace(/["\\]/g, "_");
    return `attachment; filename="${sanitized}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ downloadId: string }> },
) {
    const { downloadId } = await context.params;
    const entry = await takeSplitDownloadEntry(downloadId);
    if (!entry) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "VAL_SPLIT_DOWNLOAD_NOT_FOUND",
                error: "Split download is not available or has expired.",
            },
            { status: 404 },
        );
    }

    const nodeStream = createReadStream(entry.filePath);
    nodeStream.on("close", () => {
        void rm(entry.filePath, { force: true });
    });
    nodeStream.on("error", () => {
        void rm(entry.filePath, { force: true });
    });

    return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 200,
        headers: {
            "content-type": entry.mimeType,
            "cache-control": "no-store",
            "content-disposition": buildContentDisposition(entry.fileName),
        },
    });
}

