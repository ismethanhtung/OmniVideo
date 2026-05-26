import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

import { resolveFfmpegPath } from "./audio-extraction";
import { ChineseTranscriptionError } from "./types";

function safeExtension(fileName: string) {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "mp4";
    return /^[a-z0-9]+$/.test(extension) ? extension : "mp4";
}

function buildAtempoFilters(speedFactor: number) {
    if (!Number.isFinite(speedFactor) || Math.abs(speedFactor - 1) < 0.0001) {
        return [] as string[];
    }

    const filters: string[] = [];
    let remaining = speedFactor;
    while (remaining < 0.5) {
        filters.push("atempo=0.5");
        remaining /= 0.5;
    }
    while (remaining > 2) {
        filters.push("atempo=2");
        remaining /= 2;
    }
    if (Math.abs(remaining - 1) >= 0.0001) {
        filters.push(`atempo=${remaining.toFixed(4).replace(/\.?0+$/u, "")}`);
    }

    return filters;
}

export function buildVideoPreprocessFfmpegArgs(input: {
    inputPath: string;
    outputPath: string;
    speedFactor: number;
}) {
    const speed = Number.isFinite(input.speedFactor) ? input.speedFactor : 1;
    const clampedSpeed = Math.min(2, Math.max(0.5, speed));
    const videoFilter = `setpts=${(1 / clampedSpeed).toFixed(6).replace(/\.?0+$/u, "")}*PTS`;
    const audioFilters = buildAtempoFilters(clampedSpeed);

    return [
        "-y",
        "-i",
        input.inputPath,
        "-filter:v",
        videoFilter,
        ...(audioFilters.length ? ["-filter:a", audioFilters.join(",")] : []),
        "-map",
        "0:v:0",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "superfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-movflags",
        "+faststart",
        input.outputPath,
    ];
}

async function runFfmpeg(args: string[]) {
    const ffmpegPath = resolveFfmpegPath();
    await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpegPath, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
        });
    });
}

export async function preprocessVideoSpeed(input: {
    fileName: string;
    fileBytes: Uint8Array;
    speedFactor: number;
}) {
    const speed = Number.isFinite(input.speedFactor) ? input.speedFactor : 1;
    const clampedSpeed = Math.min(2, Math.max(0.5, speed));
    if (Math.abs(clampedSpeed - 1) < 0.0001) {
        return {
            fileBytes: Buffer.from(input.fileBytes),
            fileName: input.fileName,
            speedFactor: clampedSpeed,
        };
    }

    const workDir = path.join(tmpdir(), `omnivideo-video-preprocess-${randomUUID()}`);
    const inputPath = path.join(workDir, `source.${safeExtension(input.fileName)}`);
    const outputPath = path.join(workDir, "preprocessed.mp4");
    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.fileBytes);
        await runFfmpeg(
            buildVideoPreprocessFfmpegArgs({
                inputPath,
                outputPath,
                speedFactor: clampedSpeed,
            }),
        );
        return {
            fileBytes: await readFile(outputPath),
            fileName: input.fileName.replace(/\.[^.]+$/u, "") + `-${clampedSpeed}x.mp4`,
            speedFactor: clampedSpeed,
        };
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            error instanceof Error
                ? `Video preprocess failed: ${error.message}`
                : "Video preprocess failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
