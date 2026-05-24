import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { getSplitDownloadEntry } from "@/lib/video-processing/split-download-store";

export const runtime = "nodejs";

function buildContentDisposition(fileName: string) {
    const asciiFallback =
        fileName
            .normalize("NFKD")
            .replace(/[^\x20-\x7E]/g, "")
            .replace(/["\\]/g, "_")
            .replace(/\s+/g, " ")
            .trim() || "video-split.zip";
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ downloadId: string }> },
) {
    const { downloadId } = await context.params;
    const entry = await getSplitDownloadEntry(downloadId);
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

    try {
        await access(entry.filePath);
    } catch {
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

    return new NextResponse(Readable.toWeb(nodeStream) as ReadableStream, {
        status: 200,
        headers: {
            "content-type": entry.mimeType,
            "cache-control": "no-store",
            "content-disposition": buildContentDisposition(entry.fileName),
        },
    });
}
