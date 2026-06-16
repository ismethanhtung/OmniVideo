import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import { generateVoiceFromSegments } from "@/lib/multilingual-audio/piper-tts";
import {
    ChineseTranscriptionError,
    DEFAULT_PIPER_TTS_SETTINGS,
    type VoiceGenerationSegment,
} from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

type StoryboardSceneInput = {
    id: number;
    time: string;
    visual?: string;
    voiceover: string;
};

type TimedScene = StoryboardSceneInput & {
    start: number;
    end: number;
    duration: number;
};

type RenderRouteTestHooks = {
    runFfmpeg?: (args: string[]) => Promise<void>;
    readOutputFile?: (filePath: string) => Promise<Buffer>;
};

let testHooks: RenderRouteTestHooks = {};

export function setAiImageRenderRouteTestHooks(hooks: RenderRouteTestHooks) {
    testHooks = hooks;
}

export async function POST(request: Request) {
    const startedAt = Date.now();
    let workingDir: string | null = null;

    try {
        const writeDenied = requireWriteAccess(request);
        if (writeDenied) return writeDenied;

        const formData = await request.formData();
        const scenes = parseScenes(String(formData.get("scenesJson") ?? ""));
        const timedScenes = normalizeSceneTiming(scenes);

        workingDir = path.join(
            tmpdir(),
            `omnivideo-ai-image-render-${randomUUID()}`,
        );
        await mkdir(workingDir, { recursive: true });

        const imagePaths = await writeSceneImages({
            formData,
            scenes: timedScenes,
            workingDir,
        });
        const voice = await generateVoiceFromSegments({
            segments: timedScenes.map(
                (scene): VoiceGenerationSegment => ({
                    id: scene.id,
                    start: scene.start,
                    end: scene.end,
                    text: scene.voiceover,
                }),
            ),
            settings: {
                ...DEFAULT_PIPER_TTS_SETTINGS,
                preserveTimestampGaps: true,
                alignmentMode: "balanced",
            },
        });

        const voicePath = path.join(workingDir, "voice.wav");
        await writeFile(voicePath, Buffer.from(voice.audioBase64, "base64"));

        const segmentPaths = await renderSceneSegments({
            imagePaths,
            scenes: timedScenes,
            workingDir,
        });
        const silentVideoPath = path.join(workingDir, "silent.mp4");
        await concatVideoSegments(segmentPaths, silentVideoPath, workingDir);

        const subtitlePath = path.join(workingDir, "subtitles.srt");
        await writeFile(subtitlePath, createSrt(timedScenes), "utf8");

        const outputPath = path.join(workingDir, "storyboard-video.mp4");
        await muxVoiceAndSubtitles({
            silentVideoPath,
            voicePath,
            subtitlePath,
            outputPath,
        });

        const outputBuffer = await readRenderedOutput(outputPath);

        return NextResponse.json({
            ok: true,
            data: {
                videoBase64: outputBuffer.toString("base64"),
                mimeType: "video/mp4",
                fileName: "ai-image-storyboard-video.mp4",
                byteLength: outputBuffer.byteLength,
                durationSeconds: timedScenes[timedScenes.length - 1]?.end ?? 0,
                sceneCount: timedScenes.length,
                generationDurationMs: Date.now() - startedAt,
            },
        });
    } catch (error) {
        if (error instanceof ChineseTranscriptionError) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: error.code,
                    error: error.message,
                },
                { status: error.status },
            );
        }

        const status = error instanceof RenderValidationError ? 400 : 500;
        return NextResponse.json(
            {
                ok: false,
                errorCode:
                    error instanceof RenderValidationError
                        ? error.code
                        : "SYS_AI_IMAGE_VIDEO_RENDER_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "AI Image Studio video render failed.",
            },
            { status },
        );
    } finally {
        if (workingDir) {
            await rm(workingDir, { recursive: true, force: true }).catch(
                () => undefined,
            );
        }
    }
}

class RenderValidationError extends Error {
    constructor(
        public readonly code:
            | "VAL_AI_IMAGE_SCENES_REQUIRED"
            | "VAL_AI_IMAGE_SCENE_IMAGE_REQUIRED",
        message: string,
    ) {
        super(message);
        this.name = "RenderValidationError";
    }
}

function parseScenes(raw: string): StoryboardSceneInput[] {
    if (!raw.trim()) {
        throw new RenderValidationError(
            "VAL_AI_IMAGE_SCENES_REQUIRED",
            "Storyboard scenes are required.",
        );
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new RenderValidationError(
            "VAL_AI_IMAGE_SCENES_REQUIRED",
            "Storyboard scenes are required.",
        );
    }

    return parsed.map((scene, index) => {
        const candidate = scene as Partial<StoryboardSceneInput>;
        const id = Number(candidate.id ?? index + 1);
        return {
            id: Number.isFinite(id) ? id : index + 1,
            time: String(candidate.time ?? ""),
            visual: String(candidate.visual ?? ""),
            voiceover: String(candidate.voiceover ?? "").trim(),
        };
    });
}

function normalizeSceneTiming(scenes: StoryboardSceneInput[]): TimedScene[] {
    let cursor = 0;
    return scenes.map((scene) => {
        const range = parseTimeRange(scene.time);
        const start = range?.start ?? cursor;
        const fallbackDuration = Math.max(4, Math.min(14, scene.voiceover.length / 11));
        const end =
            range && range.end > start
                ? range.end
                : start + fallbackDuration;
        const normalized: TimedScene = {
            ...scene,
            start,
            end,
            duration: Math.max(0.5, end - start),
        };
        cursor = normalized.end;
        return normalized;
    });
}

function parseTimeRange(value: string) {
    const [rawStart, rawEnd] = value.split(/\s*[-–—]\s*/u);
    if (!rawStart || !rawEnd) return null;
    const start = parseTimestamp(rawStart);
    const end = parseTimestamp(rawEnd);
    if (start === null || end === null) return null;
    return { start, end };
}

function parseTimestamp(value: string) {
    const parts = value
        .trim()
        .split(":")
        .map((part) => Number(part.replace(",", ".")));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 1) return parts[0];
    return null;
}

async function writeSceneImages(input: {
    formData: FormData;
    scenes: TimedScene[];
    workingDir: string;
}) {
    const paths: string[] = [];
    for (const scene of input.scenes) {
        const entry = input.formData.get(`sceneImage-${scene.id}`);
        if (!(entry instanceof Blob)) {
            throw new RenderValidationError(
                "VAL_AI_IMAGE_SCENE_IMAGE_REQUIRED",
                `Scene #${scene.id} image is required.`,
            );
        }

        const extension = imageExtension(entry.type);
        const imagePath = path.join(
            input.workingDir,
            `scene-${scene.id}${extension}`,
        );
        await writeFile(imagePath, Buffer.from(await entry.arrayBuffer()));
        paths.push(imagePath);
    }
    return paths;
}

function imageExtension(mimeType: string) {
    if (mimeType.includes("png")) return ".png";
    if (mimeType.includes("webp")) return ".webp";
    if (mimeType.includes("gif")) return ".gif";
    return ".jpg";
}

async function renderSceneSegments(input: {
    imagePaths: string[];
    scenes: TimedScene[];
    workingDir: string;
}) {
    const segmentPaths: string[] = [];
    for (const [index, scene] of input.scenes.entries()) {
        const segmentPath = path.join(input.workingDir, `segment-${index}.mp4`);
        await runFfmpeg([
            "-y",
            "-loop",
            "1",
            "-t",
            formatSeconds(scene.duration),
            "-i",
            input.imagePaths[index],
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,format=yuv420p",
            "-r",
            "30",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            segmentPath,
        ]);
        segmentPaths.push(segmentPath);
    }
    return segmentPaths;
}

async function concatVideoSegments(
    segmentPaths: string[],
    outputPath: string,
    workingDir: string,
) {
    const concatPath = path.join(workingDir, "concat.txt");
    await writeFile(
        concatPath,
        segmentPaths
            .map((segmentPath) => `file '${escapeConcatPath(segmentPath)}'`)
            .join("\n"),
        "utf8",
    );
    await runFfmpeg([
        "-y",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        concatPath,
        "-c",
        "copy",
        outputPath,
    ]);
}

async function muxVoiceAndSubtitles(input: {
    silentVideoPath: string;
    voicePath: string;
    subtitlePath: string;
    outputPath: string;
}) {
    await runFfmpeg([
        "-y",
        "-i",
        input.silentVideoPath,
        "-i",
        input.voicePath,
        "-vf",
        `subtitles='${escapeFilterPath(input.subtitlePath)}':force_style='Fontsize=18,PrimaryColour=&H00FFFFFF&,OutlineColour=&H00000000&,BorderStyle=1,Outline=2,Shadow=0,Alignment=2,MarginV=150'`,
        "-map",
        "0:v:0",
        "-map",
        "1:a:0",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "160k",
        "-shortest",
        input.outputPath,
    ]);
}

function createSrt(scenes: TimedScene[]) {
    return scenes
        .map((scene, index) =>
            [
                String(index + 1),
                `${formatSrtTimestamp(scene.start)} --> ${formatSrtTimestamp(
                    scene.end,
                )}`,
                scene.voiceover || " ",
            ].join("\n"),
        )
        .join("\n\n");
}

function formatSrtTimestamp(seconds: number) {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const wholeSeconds = Math.floor(safeSeconds % 60);
    const milliseconds = Math.round((safeSeconds - Math.floor(safeSeconds)) * 1000);
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(wholeSeconds)},${String(
        milliseconds,
    ).padStart(3, "0")}`;
}

function pad2(value: number) {
    return String(value).padStart(2, "0");
}

function formatSeconds(value: number) {
    return Math.max(0.5, value).toFixed(3);
}

function escapeConcatPath(filePath: string) {
    return filePath.replaceAll("'", "'\\''");
}

function escapeFilterPath(filePath: string) {
    return filePath
        .replaceAll("\\", "\\\\")
        .replaceAll(":", "\\:")
        .replaceAll("'", "\\'")
        .replaceAll(",", "\\,");
}

function runFfmpeg(args: string[]) {
    if (testHooks.runFfmpeg) return testHooks.runFfmpeg(args);

    return new Promise<void>((resolve, reject) => {
        const child = spawn(resolveFfmpegPath(), args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            reject(
                new Error(stderr.trim() || `ffmpeg exited with code ${code}`),
            );
        });
    });
}

function readRenderedOutput(filePath: string) {
    return testHooks.readOutputFile?.(filePath) ?? readFile(filePath);
}
