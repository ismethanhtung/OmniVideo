import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

export type VideoComposerRenderSettings = {
    originalAudioVolume?: number;
    musicVolume?: number;
    speed?: number;
    vintageFilm?: boolean;
    textOverlay?: {
        text?: string;
        fontFamily?: string;
        fontSize?: number;
        textPosition?: { x?: number; y?: number };
    };
};

export class VideoComposerRenderError extends Error {
    constructor(
        public readonly code:
            | "COMPOSER_VIDEO_REQUIRED"
            | "COMPOSER_RENDER_FAILED",
        message: string,
        public readonly status = 400,
    ) {
        super(message);
        this.name = "VideoComposerRenderError";
    }
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
        ? Math.min(max, Math.max(min, parsed))
        : fallback;
}

function escapeDrawtext(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/:/g, "\\:")
        .replace(/\n/g, "\\n");
}

function outputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "video-composer";
    return `${base.replace(/[^a-zA-Z0-9._-]+/g, "-")}-composer.mp4`;
}

const PREVIEW_CANVAS_HEIGHT = 504;
const UNICODE_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

function resolveUnicodeFontFile() {
    return UNICODE_FONT_CANDIDATES.find((filePath) => existsSync(filePath));
}

async function runProcess(command: string, args: string[]) {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) return resolve();
            reject(new Error(stderr.trim() || `ffmpeg exited with ${code}`));
        });
    });
}

async function probeVideoHeight(command: string, inputPath: string) {
    return await new Promise<number | null>((resolve) => {
        const child = spawn(command, ["-hide_banner", "-i", inputPath], {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", () => resolve(null));
        child.on("close", () => {
            const match = /Video:\s.*?\d{2,5}x(\d{2,5})(?:[,\s]|$)/u.exec(
                stderr,
            );
            const height = Number(match?.[1]);
            resolve(Number.isFinite(height) && height > 0 ? height : null);
        });
    });
}

export async function renderVideoComposerProject(input: {
    clips: Array<{ fileName: string; bytes: Uint8Array }>;
    music?: { fileName: string; bytes: Uint8Array };
    settings: VideoComposerRenderSettings;
}) {
    if (!input.clips.length) {
        throw new VideoComposerRenderError(
            "COMPOSER_VIDEO_REQUIRED",
            "Add at least one video clip before rendering.",
            400,
        );
    }

    const workDir = path.join(tmpdir(), `omnivideo-composer-${randomUUID()}`);
    const renderedPath = path.join(workDir, "composer-output.mp4");
    try {
        await mkdir(workDir, { recursive: true });
        const clipPaths = await Promise.all(
            input.clips.map(async (clip, index) => {
                const filePath = path.join(
                    workDir,
                    `clip-${String(index + 1).padStart(3, "0")}.mp4`,
                );
                await writeFile(filePath, clip.bytes);
                return filePath;
            }),
        );
        const concatListPath = path.join(workDir, "clips.txt");
        await writeFile(
            concatListPath,
            `${clipPaths
                .map((filePath) => `file '${filePath.replace(/'/g, "'\\''")}'`)
                .join("\n")}\n`,
            "utf8",
        );

        const ffmpegPath = resolveFfmpegPath();
        const sourceHeight =
            (await probeVideoHeight(ffmpegPath, clipPaths[0])) ?? 1080;

        const speed = clamp(input.settings.speed, 0.5, 2, 1);
        const originalVolume = clamp(
            input.settings.originalAudioVolume,
            0,
            100,
            100,
        );
        const musicVolume = clamp(input.settings.musicVolume, 0, 100, 30);
        const videoFilters = [`setpts=PTS/${speed}`];
        if (input.settings.vintageFilm) {
            videoFilters.push(
                "eq=saturation=0.78:contrast=1.12:brightness=-0.04",
                "noise=alls=5:allf=t+u",
                "vignette=angle=PI/5",
            );
        }
        const text = input.settings.textOverlay?.text?.trim();
        if (text) {
            const previewFontSize = clamp(
                input.settings.textOverlay?.fontSize,
                4,
                240,
                48,
            );
            const fontSize = Math.max(
                4,
                Math.round(
                    previewFontSize * (sourceHeight / PREVIEW_CANVAS_HEIGHT),
                ),
            );
            const x = clamp(
                input.settings.textOverlay?.textPosition?.x,
                4,
                96,
                50,
            );
            const y = clamp(
                input.settings.textOverlay?.textPosition?.y,
                4,
                96,
                78,
            );
            const unicodeFontFile = resolveUnicodeFontFile();
            const fontOption = unicodeFontFile
                ? `fontfile='${escapeDrawtext(unicodeFontFile)}'`
                : "font='Arial Unicode MS'";
            videoFilters.push(
                `drawtext=${fontOption}:text='${escapeDrawtext(text)}':fontcolor=white:fontsize=${fontSize}:borderw=2:bordercolor=black:x=w*${x / 100}-text_w/2:y=h*${y / 100}-text_h/2`,
            );
        }

        const args = [
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concatListPath,
        ];
        let musicPath = "";
        if (input.music) {
            musicPath = path.join(workDir, "music-track");
            await writeFile(musicPath, input.music.bytes);
            args.push("-stream_loop", "-1", "-i", musicPath);
        }

        args.push("-map", "0:v:0", "-vf", videoFilters.join(","));
        if (musicPath) {
            if (originalVolume > 0) {
                args.push(
                    "-filter_complex",
                    `[0:a]atempo=${speed},volume=${originalVolume / 100}[source];[1:a]volume=${musicVolume / 100}[music];[source][music]amix=inputs=2:duration=first:dropout_transition=2[mixed]`,
                    "-map",
                    "[mixed]",
                );
            } else {
                args.push("-map", "1:a:0", "-filter:a", `volume=${musicVolume / 100}`);
            }
        } else if (originalVolume > 0) {
            args.push(
                "-map",
                "0:a?",
                "-filter:a",
                `atempo=${speed},volume=${originalVolume / 100}`,
            );
        } else {
            args.push("-an");
        }
        args.push(
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "0",
            "-c:a",
            "aac",
            "-b:a",
            "320k",
            "-shortest",
            renderedPath,
        );
        await runProcess(ffmpegPath, args);
        return {
            fileName: outputName(input.clips[0].fileName),
            bytes: await readFile(renderedPath),
        };
    } catch (error) {
        if (error instanceof VideoComposerRenderError) throw error;
        throw new VideoComposerRenderError(
            "COMPOSER_RENDER_FAILED",
            error instanceof Error ? error.message : "Composer render failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true }).catch(
            () => undefined,
        );
    }
}
