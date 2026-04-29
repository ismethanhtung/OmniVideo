import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

type FfmpegSpawn = typeof spawn;

let mirrorFfmpegSpawnForTest: FfmpegSpawn | null = null;
let mirrorReadFileForTest: ((filePath: string) => Promise<Buffer>) | null = null;

export type MirrorVideoAxis = "horizontal";

export type MirrorVideoInput = {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
    fileBytes: Uint8Array;
    axis?: string;
};

export type MirrorVideoResult = {
    videoBase64: string;
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    transform: {
        axis: MirrorVideoAxis;
        filter: "hflip";
    };
};

export class MirrorVideoError extends Error {
    constructor(
        public readonly code:
            | "VAL_MIRROR_VIDEO_REQUIRED"
            | "VAL_MIRROR_AXIS_UNSUPPORTED"
            | "SYS_MIRROR_VIDEO_FAILED",
        message: string,
        public readonly status = 400,
    ) {
        super(message);
        this.name = "MirrorVideoError";
    }
}

export function setMirrorVideoFfmpegSpawnForTest(spawnImpl: FfmpegSpawn | null) {
    mirrorFfmpegSpawnForTest = spawnImpl;
}

export function setMirrorVideoReadFileForTest(
    readFileImpl: ((filePath: string) => Promise<Buffer>) | null,
) {
    mirrorReadFileForTest = readFileImpl;
}

function sanitizeOutputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "omnivideo-video";
    return `${base
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 90) || "omnivideo-video"}-mirror.mp4`;
}

export function normalizeMirrorAxis(axis: string | undefined): MirrorVideoAxis {
    const normalized = (axis ?? "horizontal").trim().toLowerCase();
    if (normalized === "horizontal") return "horizontal";
    throw new MirrorVideoError(
        "VAL_MIRROR_AXIS_UNSUPPORTED",
        "Mirror Video MVP only supports axis=horizontal.",
        400,
    );
}

export function buildMirrorVideoFfmpegArgs(input: {
    videoPath: string;
    outputPath: string;
    axis: MirrorVideoAxis;
}) {
    return [
        "-y",
        "-i",
        input.videoPath,
        "-vf",
        input.axis === "horizontal" ? "hflip" : "hflip",
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "18",
        "-c:a",
        "copy",
        "-movflags",
        "+faststart",
        input.outputPath,
    ];
}

async function runFfmpeg(args: string[]) {
    const ffmpegPath = resolveFfmpegPath();
    const spawnImpl = mirrorFfmpegSpawnForTest ?? spawn;

    await new Promise<void>((resolve, reject) => {
        const child = spawnImpl(ffmpegPath, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
        });
    });
}

export async function runMirrorVideo(
    input: MirrorVideoInput,
): Promise<MirrorVideoResult> {
    const startedAt = Date.now();
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new MirrorVideoError(
            "VAL_MIRROR_VIDEO_REQUIRED",
            "A source video file is required for mirror processing.",
            400,
        );
    }

    const axis = normalizeMirrorAxis(input.axis);
    const workDir = path.join(tmpdir(), `omnivideo-mirror-${randomUUID()}`);
    const inputPath = path.join(workDir, input.fileName || "source.mp4");
    const outputPath = path.join(workDir, "mirrored.mp4");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.fileBytes);
        await runFfmpeg(
            buildMirrorVideoFfmpegArgs({
                videoPath: inputPath,
                outputPath,
                axis,
            }),
        );
        const outputBytes = mirrorReadFileForTest
            ? await mirrorReadFileForTest(outputPath)
            : await readFile(outputPath);

        return {
            videoBase64: outputBytes.toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: sanitizeOutputName(input.fileName),
            byteLength: outputBytes.byteLength,
            generationDurationMs: Date.now() - startedAt,
            transform: {
                axis,
                filter: "hflip",
            },
        };
    } catch (error) {
        if (error instanceof MirrorVideoError) throw error;
        throw new MirrorVideoError(
            "SYS_MIRROR_VIDEO_FAILED",
            error instanceof Error ? error.message : "Mirror Video failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
