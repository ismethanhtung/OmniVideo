import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegStaticPath from "ffmpeg-static";

import { ChineseTranscriptionError } from "./types";

function safeExtension(fileName: string) {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "mp4";
    return /^[a-z0-9]+$/.test(extension) ? extension : "mp4";
}

export function buildSpeechReadyFfmpegArgs(
    inputPath: string,
    outputPath: string,
) {
    return [
        "-y",
        "-i",
        inputPath,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-map",
        "0:a:0",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "64k",
        outputPath,
    ];
}

export function getFfmpegCandidates(staticPath = ffmpegStaticPath) {
    return [
        staticPath || "",
        path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
        "ffmpeg",
    ].filter(Boolean);
}

export function resolveFfmpegPath(
    input: {
        staticPath?: string | null;
        fileExists?: (candidate: string) => boolean;
    } = {},
) {
    const fileExists = input.fileExists ?? existsSync;
    const candidates = getFfmpegCandidates(
        input.staticPath ?? ffmpegStaticPath,
    );
    const binaryPath = candidates.find((candidate) => {
        if (candidate === "ffmpeg") return true;
        return fileExists(candidate);
    });

    if (!binaryPath) {
        throw new Error(
            `ffmpeg binary not found. Checked: ${candidates.join(", ")}`,
        );
    }

    return binaryPath;
}

function runFfmpeg(args: string[]) {
    return new Promise<{ stderr: string }>((resolve, reject) => {
        let ffmpegPath: string;
        try {
            ffmpegPath = resolveFfmpegPath();
        } catch (error) {
            reject(error);
            return;
        }

        const child = spawn(ffmpegPath, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";

        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
            if (code === 0) {
                resolve({ stderr });
                return;
            }
            reject(
                new Error(stderr.trim() || `ffmpeg exited with code ${code}`),
            );
        });
    });
}

export function parseFfmpegDurationSeconds(stderr: string) {
    const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/u.exec(stderr);
    if (!match) return undefined;
    const duration =
        Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
    return Number.isFinite(duration) && duration > 0 ? duration : undefined;
}

async function probeAudioDurationSeconds(filePath: string) {
    try {
        const { stderr } = await runFfmpeg([
            "-hide_banner",
            "-i",
            filePath,
            "-f",
            "null",
            "-",
        ]);
        return parseFfmpegDurationSeconds(stderr);
    } catch {
        return undefined;
    }
}

export async function extractSpeechReadyAudio(input: {
    fileName: string;
    fileBytes: Uint8Array;
}) {
    const workDir = path.join(tmpdir(), `omnivideo-audio-${randomUUID()}`);
    const inputPath = path.join(
        workDir,
        `source.${safeExtension(input.fileName)}`,
    );
    const outputPath = path.join(workDir, "speech.mp3");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.fileBytes);
        await runFfmpeg(buildSpeechReadyFfmpegArgs(inputPath, outputPath));
        return {
            audioBytes: await readFile(outputPath),
            durationSeconds: await probeAudioDurationSeconds(outputPath),
        };
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_AUDIO_EXTRACTION_FAILED",
            error instanceof Error
                ? `Audio extraction failed: ${error.message}`
                : "Audio extraction failed.",
            500,
        );
    } finally {
        await rm(workDir, { force: true, recursive: true });
    }
}

export async function extractSpeechReadyWav(input: {
    fileName: string;
    fileBytes: Uint8Array;
}) {
    const result = await extractSpeechReadyAudio(input);
    return result.audioBytes;
}
