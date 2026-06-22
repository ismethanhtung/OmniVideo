import { NextResponse } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";

import {
    VIDEO_BACKGROUND_MUSIC_LIBRARY,
    isSafePublicMusicSource,
} from "@/lib/video-processing/background-music";

export const runtime = "nodejs";

const SUPPORTED_MUSIC_EXTENSIONS = new Set([
    ".aac",
    ".flac",
    ".m4a",
    ".mp3",
    ".ogg",
    ".wav",
]);

function titleFromFileName(fileName: string) {
    return fileName
        .replace(/\.[^.]+$/u, "")
        .replace(/[_-]+/gu, " ")
        .replace(/\s+/gu, " ")
        .trim()
        .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

export async function GET() {
    try {
        const musicDir = path.join(process.cwd(), "public", "musics");
        const entries = await readdir(musicDir, { withFileTypes: true }).catch(
            () => [],
        );
        const files = entries
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name)
            .filter((fileName) =>
                SUPPORTED_MUSIC_EXTENSIONS.has(
                    path.extname(fileName).toLowerCase(),
                ),
            )
            .map((fileName) => ({
                source: `/musics/${fileName}`,
                label: titleFromFileName(fileName),
            }))
            .filter((item) => isSafePublicMusicSource(item.source))
            .sort((a, b) => a.label.localeCompare(b.label));

        const data =
            files.length > 0
                ? files
                : VIDEO_BACKGROUND_MUSIC_LIBRARY.map((item) => ({ ...item }));
        return NextResponse.json({
            ok: true,
            data,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_BACKGROUND_MUSIC_LIST_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Background music list failed.",
            },
            { status: 500 },
        );
    }
}
