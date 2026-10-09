import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

export type ZeroTtsSubtitleWord = {
    word: string;
    start: number;
    end: number;
    index: number;
};

export type ZeroTtsRenderSettings = {
    videoVolume?: number; // 0.0 to 1.0 (default 0.15)
    bgmVolume?: number; // 0.0 to 1.0 (default 0.25)
    showCaptions?: boolean; // default true
    captionStyle?: string; // capcut_yellow, clean_yellow, clean_white, etc.
    captionPosition?: "bottom" | "center" | "top"; // default "bottom"
    captionSize?: "sm" | "md" | "lg"; // default "md"
    captionUppercase?: boolean; // default false
    captionNoBorder?: boolean; // default false (or true for clean styles)
    captionNoUnderline?: boolean; // default false (or true for clean styles)
    wordTimeline?: ZeroTtsSubtitleWord[];
    durationSec?: number; // duration of speech audio in seconds
};

export type ZeroTtsRenderInput = {
    video: {
        fileName: string;
        bytes: Uint8Array;
    };
    speech: {
        fileName?: string;
        bytes: Uint8Array;
    };
    music?: {
        fileName?: string;
        source?: string; // e.g. "/musics/1.mp3"
        bytes?: Uint8Array;
    };
    settings?: ZeroTtsRenderSettings;
};

export type ZeroTtsRenderResult = {
    fileName: string;
    bytes: Uint8Array;
    durationSeconds: number;
    fileSizeBytes: number;
};

export class ZeroTtsRenderError extends Error {
    constructor(
        public readonly code:
            | "ZERO_TTS_VIDEO_REQUIRED"
            | "ZERO_TTS_SPEECH_REQUIRED"
            | "ZERO_TTS_RENDER_FAILED",
        message: string,
        public readonly status = 400,
    ) {
        super(message);
        this.name = "ZeroTtsRenderError";
    }
}

/**
 * Format seconds into ASS timestamp format: h:mm:ss.cc (centiseconds)
 */
export function formatAssTimestamp(sec: number): string {
    const totalSec = Math.max(0, Number.isFinite(sec) ? sec : 0);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = Math.floor(totalSec % 60);
    const cs = Math.floor(Math.round((totalSec % 1) * 100));

    const mStr = String(m).padStart(2, "0");
    const sStr = String(s).padStart(2, "0");
    const csStr = String(Math.min(99, cs)).padStart(2, "0");

    return `${h}:${mStr}:${sStr}.${csStr}`;
}

/**
 * Escape file path for use in FFmpeg subtitles filter option
 */
export function escapeFilterPath(filePath: string): string {
    return filePath
        .replaceAll("\\", "\\\\")
        .replaceAll(":", "\\:")
        .replaceAll("'", "\\'")
        .replaceAll(",", "\\,");
}

/**
 * Build Advanced SubStation Alpha (.ass) subtitle file content
 */
export function generateAssSubtitleContent(
    timeline: ZeroTtsSubtitleWord[],
    settings: ZeroTtsRenderSettings = {},
    resX = 1280,
    resY = 720,
): string {
    const isCleanStyle =
        settings.captionStyle?.startsWith("clean_") ||
        settings.captionStyle === "pure_cinema";
    const isNoBorder = Boolean(settings.captionNoBorder || isCleanStyle);
    const isNoUnderline = Boolean(settings.captionNoUnderline || isCleanStyle);

    // Font size scaling based on canvas height and captionSize
    const scale = resY / 720;
    const sizeCategory = settings.captionSize ?? "md";
    let baseFontSize = 36;
    if (sizeCategory === "sm") baseFontSize = 28;
    else if (sizeCategory === "lg") baseFontSize = 46;
    const fontSize = Math.max(14, Math.round(baseFontSize * scale));

    // Alignment & Margins (Numeric keypad format: 2=bottom-center, 5=middle-center, 8=top-center)
    const position = settings.captionPosition ?? "bottom";
    let alignment = 2;
    let marginV = Math.round(resY * 0.09);

    if (position === "center") {
        alignment = 5;
        marginV = 0;
    } else if (position === "top") {
        alignment = 8;
        marginV = Math.round(resY * 0.08);
    }

    // Color definitions in ASS &HAABBGGRR& format (BGR order!)
    let activeColor = "&H0000E6FF"; // Default yellow (#FFE600)
    let pastColor = "&H00FFFFFF"; // White
    let upcomingColor = "&H00999999"; // Dim white

    const styleName = settings.captionStyle ?? "capcut_yellow";
    if (styleName === "cinematic_white" || styleName === "clean_white") {
        activeColor = "&H00FFFFFF";
        pastColor = "&H00D0D0D0";
        upcomingColor = "&H00707070";
    } else if (styleName === "neon_emerald" || styleName === "clean_emerald") {
        activeColor = "&H0099D334"; // #34D399 (B: 99, G: D3, R: 34)
        pastColor = "&H00FFFFFF";
        upcomingColor = "&H00808080";
    } else if (
        styleName === "sunset_orange" ||
        styleName === "clean_sunset"
    ) {
        activeColor = "&H003C92FB"; // #FB923C (B: 3C, G: 92, R: FB)
        pastColor = "&H00C5E8FF";
        upcomingColor = "&H00808080";
    }

    // Border and Shadow settings:
    // If isNoBorder: BorderStyle=1, Outline=0, Shadow=1 (clean soft drop shadow, no harsh outline)
    // If not isNoBorder: BorderStyle=1, Outline=2, Shadow=0 (classic defined border outline)
    const outline = isNoBorder ? 0 : 2;
    const shadow = isNoBorder ? 1 : 0;
    const backColor = "&H80000000";

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${fontSize},&H00FFFFFF,&H0000FFFF,&H00000000,${backColor},-1,0,0,0,100,100,0,0,1,${outline},${shadow},${alignment},20,20,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    if (!timeline || timeline.length === 0) {
        return header;
    }

    const windowSize = 6;
    const events: string[] = [];

    for (let i = 0; i < timeline.length; i++) {
        const item = timeline[i];
        if (item.end <= item.start) continue;

        const chunkIndex = Math.floor(i / windowSize);
        const chunkStart = chunkIndex * windowSize;
        const chunkWords = timeline.slice(chunkStart, chunkStart + windowSize);

        const chunkText = chunkWords
            .map((cw) => {
                const wordStr = settings.captionUppercase
                    ? cw.word.toUpperCase()
                    : cw.word;

                if (cw.index === i) {
                    // Active word highlight
                    const underlineTag = isNoUnderline ? "" : "\\u1";
                    return `{\\c${activeColor}&\\b1${underlineTag}\\fscx108\\fscy108}${wordStr}{\\r}`;
                } else if (cw.index < i) {
                    // Past word in chunk
                    return `{\\c${pastColor}&\\b1}${wordStr}{\\r}`;
                } else {
                    // Upcoming word in chunk
                    return `{\\c${upcomingColor}&\\b0}${wordStr}{\\r}`;
                }
            })
            .join(" ");

        const startTs = formatAssTimestamp(item.start);
        const endTs = formatAssTimestamp(item.end);
        events.push(
            `Dialogue: 0,${startTs},${endTs},Default,,0,0,0,,${chunkText}`,
        );
    }

    return header + events.join("\n") + "\n";
}

/**
 * Probe media file to extract resolution, duration, and whether it contains audio.
 */
export async function probeVideoInfo(
    command: string,
    inputPath: string,
): Promise<{
    width: number | null;
    height: number | null;
    duration: number | null;
    hasAudio: boolean;
}> {
    return new Promise((resolve) => {
        const child = spawn(command, ["-hide_banner", "-i", inputPath], {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", () =>
            resolve({
                width: null,
                height: null,
                duration: null,
                hasAudio: false,
            }),
        );
        child.on("close", () => {
            const resMatch =
                /Video:\s.*?\b(\d{2,5})x(\d{2,5})(?:[,\s]|$)/u.exec(stderr);
            const dMatch =
                /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/u.exec(stderr);
            const hasAudio = /Audio:\s/u.test(stderr);

            const width = Number(resMatch?.[1]);
            const height = Number(resMatch?.[2]);
            const duration = dMatch
                ? Number(dMatch[1]) * 3600 +
                  Number(dMatch[2]) * 60 +
                  Number(dMatch[3])
                : null;

            resolve({
                width: Number.isFinite(width) && width > 0 ? width : null,
                height: Number.isFinite(height) && height > 0 ? height : null,
                duration:
                    Number.isFinite(duration) && (duration ?? 0) > 0
                        ? duration
                        : null,
                hasAudio,
            });
        });
    });
}

function runFfmpegProcess(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", reject);
        child.on("close", (code) => {
            if (code === 0) return resolve();
            reject(
                new Error(
                    stderr.trim() || `FFmpeg exited with error code ${code}`,
                ),
            );
        });
    });
}

/**
 * Main rendering function for ZeroTTS Voice Lab
 */
export async function renderZeroTtsVideo(
    input: ZeroTtsRenderInput,
): Promise<ZeroTtsRenderResult> {
    if (!input.video || !input.video.bytes || input.video.bytes.length === 0) {
        throw new ZeroTtsRenderError(
            "ZERO_TTS_VIDEO_REQUIRED",
            "Vui lòng tải lên video để tiến hành render.",
            400,
        );
    }
    if (
        !input.speech ||
        !input.speech.bytes ||
        input.speech.bytes.length === 0
    ) {
        throw new ZeroTtsRenderError(
            "ZERO_TTS_SPEECH_REQUIRED",
            "Vui lòng tạo giọng đọc ZeroTTS trước khi render video.",
            400,
        );
    }

    const runId = randomUUID();
    const workDir = path.join(tmpdir(), `zerotts-render-${runId}`);
    await mkdir(workDir, { recursive: true });

    try {
        const ffmpegPath = resolveFfmpegPath();
        const videoExt =
            input.video.fileName.split(".").pop()?.toLowerCase() || "mp4";
        const videoPath = path.join(workDir, `source-video.${videoExt}`);
        const speechPath = path.join(workDir, "speech.wav");
        const outputPath = path.join(workDir, "rendered-output.mp4");

        await writeFile(videoPath, input.video.bytes);
        await writeFile(speechPath, input.speech.bytes);

        // Probe source video & speech audio
        const [videoInfo, speechInfo] = await Promise.all([
            probeVideoInfo(ffmpegPath, videoPath),
            probeVideoInfo(ffmpegPath, speechPath),
        ]);

        const resX = videoInfo.width ?? 1280;
        const resY = videoInfo.height ?? 720;
        const speechDuration =
            input.settings?.durationSec ??
            speechInfo.duration ??
            videoInfo.duration ??
            5.0;
        const outputDuration = Math.max(0.5, speechDuration);

        // Resolve Background Music
        let musicPath: string | null = null;
        if (input.music?.bytes && input.music.bytes.length > 0) {
            musicPath = path.join(workDir, "bgm.mp3");
            await writeFile(musicPath, input.music.bytes);
        } else if (input.music?.source) {
            const cleanSource = input.music.source.replace(/^\//u, "");
            const localCandidate = path.join(process.cwd(), "public", cleanSource);
            if (existsSync(localCandidate)) {
                musicPath = localCandidate;
            }
        }

        // Subtitles setup
        const showCaptions = input.settings?.showCaptions !== false;
        const wordTimeline = input.settings?.wordTimeline ?? [];
        let assPath: string | null = null;

        if (showCaptions && wordTimeline.length > 0) {
            const assContent = generateAssSubtitleContent(
                wordTimeline,
                input.settings,
                resX,
                resY,
            );
            assPath = path.join(workDir, "subtitles.ass");
            await writeFile(assPath, assContent, "utf8");
        }

        // Build FFmpeg command arguments
        const args: string[] = ["-y"];

        // Input 0: Video (looping so it covers entire speech duration if short)
        args.push("-stream_loop", "-1", "-i", videoPath);

        // Input 1: Speech audio (primary voice)
        args.push("-i", speechPath);

        // Input 2: Background music (if present)
        if (musicPath) {
            args.push("-stream_loop", "-1", "-i", musicPath);
        }

        // Construct filter_complex
        const filterComplexParts: string[] = [];

        // 1. Video filter
        if (assPath) {
            filterComplexParts.push(
                `[0:v]subtitles='${escapeFilterPath(assPath)}'[vout]`,
            );
        } else {
            filterComplexParts.push("[0:v]null[vout]");
        }

        // 2. Audio filters
        const videoVol = Math.max(
            0,
            Math.min(1, input.settings?.videoVolume ?? 0.15),
        );
        const bgmVol = Math.max(
            0,
            Math.min(1, input.settings?.bgmVolume ?? 0.25),
        );
        const padDur = (outputDuration + 2).toFixed(1);

        if (videoInfo.hasAudio && videoVol > 0) {
            if (musicPath && bgmVol > 0) {
                filterComplexParts.push(
                    `[0:a]volume=${videoVol.toFixed(3)}[va];` +
                        `[1:a]volume=1.0[sa];` +
                        `[2:a]volume=${bgmVol.toFixed(3)},apad=pad_dur=${padDur}[ma];` +
                        `[va][sa][ma]amix=inputs=3:duration=first:dropout_transition=2[aout]`,
                );
            } else {
                filterComplexParts.push(
                    `[0:a]volume=${videoVol.toFixed(3)}[va];` +
                        `[1:a]volume=1.0[sa];` +
                        `[va][sa]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
                );
            }
        } else {
            if (musicPath && bgmVol > 0) {
                filterComplexParts.push(
                    `[1:a]volume=1.0[sa];` +
                        `[2:a]volume=${bgmVol.toFixed(3)},apad=pad_dur=${padDur}[ma];` +
                        `[sa][ma]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
                );
            } else {
                filterComplexParts.push("[1:a]volume=1.0[aout]");
            }
        }

        args.push(
            "-filter_complex",
            filterComplexParts.join(";"),
            "-map",
            "[vout]",
            "-map",
            "[aout]",
            "-t",
            outputDuration.toFixed(3),
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            outputPath,
        );

        await runFfmpegProcess(ffmpegPath, args);

        const renderedBytes = await readFile(outputPath);
        const baseName =
            input.video.fileName.replace(/\.[^.]+$/u, "") || "zerotts-video";
        const finalFileName = `${baseName}-with-voice.mp4`;

        return {
            fileName: finalFileName,
            bytes: new Uint8Array(renderedBytes),
            durationSeconds: outputDuration,
            fileSizeBytes: renderedBytes.byteLength,
        };
    } catch (error) {
        if (error instanceof ZeroTtsRenderError) throw error;
        throw new ZeroTtsRenderError(
            "ZERO_TTS_RENDER_FAILED",
            error instanceof Error
                ? error.message
                : "Không thể render video ZeroTTS.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true }).catch(
            () => undefined,
        );
    }
}
