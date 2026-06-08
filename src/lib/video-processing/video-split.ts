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
            | "VAL_SPLIT_PARTS_INVALID"
            | "SYS_VIDEO_DURATION_PROBE_FAILED"
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
            .replace(/[\\/:*?"<>|]+/g, "-")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120) || "video"
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

function parseDurationFromFfmpegMetadata(stderr: string) {
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes) ||
        !Number.isFinite(seconds)
    ) {
        return null;
    }
    return hours * 3600 + minutes * 60 + seconds;
}

async function probeDurationSeconds(ffmpegPath: string, inputPath: string) {
    const stderr = await new Promise<string>((resolve, reject) => {
        const child = spawn(ffmpegPath, ["-i", inputPath], {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let acc = "";
        child.stderr?.on("data", (chunk) => {
            acc += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", () => resolve(acc));
    });
    const seconds = parseDurationFromFfmpegMetadata(stderr);
    if (!seconds || !Number.isFinite(seconds) || seconds <= 0) {
        throw new VideoSplitError(
            "SYS_VIDEO_DURATION_PROBE_FAILED",
            "Could not determine video duration for split-by-parts mode.",
            500,
        );
    }
    return seconds;
}

export async function runVideoSplit(input: {
    fileName: string;
    fileBytes?: Uint8Array;
    sourceFilePath?: string;
    workDirOverride?: string;
    mode: VideoSplitMode | "parts";
    intervalMinutes?: number;
    headMinutes?: number;
    splitParts?: number;
}) {
    if (
        input.mode !== "interval" &&
        input.mode !== "head" &&
        input.mode !== "parts"
    ) {
        throw new VideoSplitError(
            "VAL_SPLIT_MODE_INVALID",
            "mode must be 'interval', 'parts', or 'head'.",
            400,
        );
    }

    const baseName = sanitizeBaseName(input.fileName);
    const workDir = input.workDirOverride || path.join(tmpdir(), `omnivideo-split-${randomUUID()}`);
    const inputPath = input.sourceFilePath || path.join(workDir, "source.mp4");
    const outputDir = path.join(workDir, "outputs");
    const archivePath = path.join(workDir, `${baseName}.zip`);
    try {
        await mkdir(outputDir, { recursive: true });
        if (!input.sourceFilePath) {
            if (!input.fileBytes || input.fileBytes.byteLength === 0) {
                throw new VideoSplitError(
                    "VAL_VIDEO_REQUIRED",
                    "A source video file is required.",
                    400,
                );
            }
            await writeFile(inputPath, input.fileBytes);
        }

        const ffmpegPath = resolveFfmpegPath();
        if (input.mode === "interval" || input.mode === "parts") {
            const intervalMinutes = Number(input.intervalMinutes ?? 30);
            let intervalSeconds: number;

            if (input.mode === "parts") {
                const splitParts = Number(input.splitParts ?? 2);
                if (
                    !Number.isFinite(splitParts) ||
                    !Number.isInteger(splitParts) ||
                    splitParts < 2 ||
                    splitParts > 60
                ) {
                    throw new VideoSplitError(
                        "VAL_SPLIT_PARTS_INVALID",
                        "splitParts must be an integer between 2 and 60.",
                        400,
                    );
                }
                const durationSeconds = await probeDurationSeconds(
                    ffmpegPath,
                    inputPath,
                );
                intervalSeconds = Math.max(
                    1,
                    Math.floor(durationSeconds / splitParts),
                );
            } else {
                if (!Number.isFinite(intervalMinutes) || intervalMinutes <= 0) {
                    throw new VideoSplitError(
                        "VAL_INTERVAL_MINUTES_INVALID",
                        "intervalMinutes must be > 0.",
                        400,
                    );
                }
                intervalSeconds = Math.round(intervalMinutes * 60);
            }
            const outputPattern = path.join(outputDir, `${baseName}-part-%03d.mp4`);
            await runProcess(
                ffmpegPath,
                buildIntervalSplitArgs({
                    inputPath,
                    outputPattern,
                    intervalSeconds,
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
                `${baseName}-part-001.mp4`,
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
            archiveName: `${baseName}.zip`,
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
