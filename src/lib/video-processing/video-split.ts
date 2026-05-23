import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

export type VideoSplitMode = "interval" | "head";

export class VideoSplitError extends Error {
    constructor(
        public readonly code:
            | "VAL_VIDEO_REQUIRED"
            | "VAL_SPLIT_MODE_INVALID"
            | "VAL_INTERVAL_MINUTES_INVALID"
            | "VAL_HEAD_MINUTES_INVALID"
            | "SYS_VIDEO_SPLIT_FAILED",
        message: string,
        public readonly status = 400,
    ) {
        super(message);
        this.name = "VideoSplitError";
    }
}

function sanitizeBaseName(fileName: string) {
    const raw = fileName.replace(/\.[^.]+$/u, "");
    return (
        raw
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "split-video"
    );
}

async function runProcess(
    command: string,
    args: string[],
    options?: { cwd?: string },
) {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "ignore", "pipe"],
            cwd: options?.cwd,
        });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
        });
    });
}

function buildIntervalSplitArgs(input: {
    inputPath: string;
    outputPattern: string;
    intervalSeconds: number;
}) {
    return [
        "-y",
        "-i",
        input.inputPath,
        "-map",
        "0",
        "-c",
        "copy",
        "-f",
        "segment",
        "-segment_time",
        String(input.intervalSeconds),
        "-reset_timestamps",
        "1",
        input.outputPattern,
    ];
}

function buildHeadClipArgs(input: {
    inputPath: string;
    outputPath: string;
    headSeconds: number;
}) {
    return [
        "-y",
        "-i",
        input.inputPath,
        "-t",
        String(input.headSeconds),
        "-map",
        "0",
        "-c",
        "copy",
        input.outputPath,
    ];
}

export async function runVideoSplit(input: {
    fileName: string;
    fileBytes: Uint8Array;
    mode: VideoSplitMode;
    intervalMinutes?: number;
    headMinutes?: number;
}) {
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new VideoSplitError(
            "VAL_VIDEO_REQUIRED",
            "A source video file is required.",
            400,
        );
    }
    if (input.mode !== "interval" && input.mode !== "head") {
        throw new VideoSplitError(
            "VAL_SPLIT_MODE_INVALID",
            "mode must be 'interval' or 'head'.",
            400,
        );
    }

    const baseName = sanitizeBaseName(input.fileName);
    const workDir = path.join(tmpdir(), `omnivideo-split-${randomUUID()}`);
    const inputPath = path.join(workDir, "source.mp4");
    const outputDir = path.join(workDir, "outputs");
    const archivePath = path.join(workDir, `${baseName}-split.zip`);
    try {
        await mkdir(outputDir, { recursive: true });
        await writeFile(inputPath, input.fileBytes);

        const ffmpegPath = resolveFfmpegPath();
        if (input.mode === "interval") {
            const intervalMinutes = Number(input.intervalMinutes ?? 30);
            if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
                throw new VideoSplitError(
                    "VAL_INTERVAL_MINUTES_INVALID",
                    "intervalMinutes must be > 0.",
                    400,
                );
            }
            const outputPattern = path.join(outputDir, `${baseName}-part-%03d.mp4`);
            await runProcess(
                ffmpegPath,
                buildIntervalSplitArgs({
                    inputPath,
                    outputPattern,
                    intervalSeconds: Math.round(intervalMinutes * 60),
                }),
            );
        } else {
            const headMinutes = Number(input.headMinutes ?? 15);
            if (!Number.isFinite(headMinutes) || headMinutes <= 0) {
                throw new VideoSplitError(
                    "VAL_HEAD_MINUTES_INVALID",
                    "headMinutes must be > 0.",
                    400,
                );
            }
            const outputPath = path.join(
                outputDir,
                `${baseName}-head-${Math.round(headMinutes)}m.mp4`,
            );
            await runProcess(
                ffmpegPath,
                buildHeadClipArgs({
                    inputPath,
                    outputPath,
                    headSeconds: Math.round(headMinutes * 60),
                }),
            );
        }

        const entries = (await readdir(outputDir))
            .filter((name) => name.toLowerCase().endsWith(".mp4"))
            .sort();
        if (entries.length === 0) {
            throw new VideoSplitError(
                "SYS_VIDEO_SPLIT_FAILED",
                "No split output was generated.",
                500,
            );
        }

        await runProcess("zip", ["-q", "-0", archivePath, ...entries], {
            cwd: outputDir,
        });

        return {
            archivePath,
            archiveName: `${baseName}-split.zip`,
            mode: input.mode,
            outputCount: entries.length,
            cleanup: async () => {
                await rm(workDir, { recursive: true, force: true });
            },
        };
    } catch (error) {
        await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
        if (error instanceof VideoSplitError) throw error;
        throw new VideoSplitError(
            "SYS_VIDEO_SPLIT_FAILED",
            error instanceof Error ? error.message : "Video split failed.",
            500,
        );
    }
}
