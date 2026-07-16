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
    /** Dissolve video + audio to black over the last 1.5 s. */
    fadeOut?: boolean;
    /**
     * "video" (default) — video determines output length; music loops if
     *   shorter and is cut if longer.
     * "music" — output ends at whichever track finishes first so that
     *   video and music always end together with no silent tail or black tail.
     */
    durationMode?: "video" | "music";
    textOverlay?: {
        text?: string;
        fontFamily?: string;
        fontSize?: number;
        textPosition?: { x?: number; y?: number };
    };
    clipTrims?: Array<{ startTime?: number; endTime?: number | null }>;
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

/**
 * Escape a single line of text for use in an FFmpeg drawtext filter value.
 * Callers must split multi-line text into individual lines before calling this
 * — we intentionally do NOT escape newlines here, since multiline is handled
 * by producing one drawtext filter per line in buildDrawtextFilters.
 */
function escapeDrawtextLine(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/:/g, "\\:");
}

function outputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "video-composer";
    return `${base.replace(/[^a-zA-Z0-9._-]+/g, "-")}-composer.mp4`;
}

const PREVIEW_CANVAS_HEIGHT = 504;
/** Duration of the fade-out dissolve in seconds. */
const FADE_OUT_DURATION = 1.5;

// ---------------------------------------------------------------------------
// Font resolution
// ---------------------------------------------------------------------------

const FONT_CACHE_DIR = path.join(tmpdir(), "omnivideo-font-cache");

/**
 * Known system font paths per family, checked before attempting a download.
 * The cache path for each Google Font is also included so a single find
 * covers both system installs and previously-downloaded files.
 */
const SYSTEM_FONT_MAP: Record<string, string[]> = {
    Arial: [
        "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/usr/share/fonts/truetype/msttcorefonts/Arial.ttf",
        "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
    ],
    Bangers: [path.join(FONT_CACHE_DIR, "Bangers.ttf")],
    Lobster: [path.join(FONT_CACHE_DIR, "Lobster.ttf")],
};

/** Unicode-safe fallback fonts used when the requested font cannot be found. */
const UNICODE_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
];

function resolveUnicodeFontFile() {
    return UNICODE_FONT_CANDIDATES.find((filePath) => existsSync(filePath));
}

/**
 * Resolve a font family name to an on-disk TTF path.
 * 1. Check SYSTEM_FONT_MAP candidates (includes the cached download path).
 * 2. Download from Google Fonts CSS2 API with `display=block`, using a
 *    Python user-agent.  This causes Google to return a `format('truetype')`
 *    `src:` URL pointing directly to a `.ttf` file — no CSS-proxy, no woff2.
 *    The file is cached in FONT_CACHE_DIR for reuse on subsequent renders.
 * 3. Returns null if neither strategy succeeds (caller falls back to the
 *    Unicode system font or omits `fontfile` entirely).
 *
 * NOTE: The Google Fonts CSS v1 API + IE6 User-Agent now returns EOT, which
 * FFmpeg cannot use.  The CSS v2 API + `display=block` + Python UA reliably
 * returns a plain `.ttf` URL that downloads as `font/ttf`.
 */
async function resolveFont(fontName: string): Promise<string | null> {
    const candidates = SYSTEM_FONT_MAP[fontName] ?? [];
    const found = candidates.find((p) => existsSync(p));
    if (found) return found;

    const cachePath = path.join(FONT_CACHE_DIR, `${fontName}.ttf`);
    if (existsSync(cachePath)) return cachePath;

    try {
        await mkdir(FONT_CACHE_DIR, { recursive: true });

        // CSS2 API with display=block + Python UA → returns format('truetype') src
        const cssRes = await fetch(
            `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName.replace(/ /g, "+"))}&display=block`,
            {
                headers: {
                    // Python UA triggers TTF format in Google Fonts CSS2 API response
                    "User-Agent": "Python-urllib/3.11",
                },
            },
        );
        if (!cssRes.ok) return null;
        const css = await cssRes.text();

        // The CSS2 response contains: src: url(https://...ttf) format('truetype')
        const ttfMatch = /url\((https?:\/\/[^)]+\.ttf)\)/i.exec(css);
        if (!ttfMatch?.[1]) return null;

        const fontRes = await fetch(ttfMatch[1]);
        if (!fontRes.ok) return null;

        const bytes = new Uint8Array(await fontRes.arrayBuffer());
        // Sanity check: a valid TTF file starts with 0x00010000 or 'true'/'OTTO'
        if (bytes.length < 1024) return null;

        await writeFile(cachePath, bytes);
        return cachePath;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// FFmpeg helpers
// ---------------------------------------------------------------------------

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

/**
 * Probe a media file and return its video stream height and total duration.
 * Both values may be null if the file cannot be probed or lacks the stream.
 */
async function probeVideoInfo(
    command: string,
    inputPath: string,
): Promise<{ height: number | null; duration: number | null }> {
    return new Promise((resolve) => {
        const child = spawn(command, ["-hide_banner", "-i", inputPath], {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", () => resolve({ height: null, duration: null }));
        child.on("close", () => {
            const hMatch =
                /Video:\s.*?\d{2,5}x(\d{2,5})(?:[,\s]|$)/u.exec(stderr);
            const dMatch =
                /Duration:\s*(\d+):(\d+):(\d+\.?\d*)/u.exec(stderr);
            const height = Number(hMatch?.[1]);
            const duration = dMatch
                ? Number(dMatch[1]) * 3600 +
                  Number(dMatch[2]) * 60 +
                  Number(dMatch[3])
                : null;
            resolve({
                height:
                    Number.isFinite(height) && height > 0 ? height : null,
                duration: (() => {
                    const d = duration === null ? NaN : duration;
                    return Number.isFinite(d) && d > 0 ? d : null;
                })(),
            });
        });
    });
}

// ---------------------------------------------------------------------------
// Drawtext filter builder
// ---------------------------------------------------------------------------

/**
 * Build one FFmpeg drawtext filter string per text line, producing a
 * vertically-centred multi-line block anchored at (x%, y%) of the frame.
 *
 * Each line receives:
 * - A border stroke (borderw=2) matching the CSS outline in the preview
 * - A drop-shadow (shadowx/y=2, shadowcolor=black@0.8) matching the CSS
 *   text-shadow: 2px 2px 0 #000 from the preview
 * - The resolved font file path (or a font name fallback for system fonts)
 */
function buildDrawtextFilters(params: {
    text: string;
    fontPath: string | undefined | null;
    fontName: string;
    fontSize: number;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
}): string[] {
    const { text, fontPath, fontName, fontSize, x, y } = params;
    const lines = text.split("\n");
    const lineHeight = Math.round(fontSize * 1.3);
    const totalBlockPx = lines.length * lineHeight;

    const fontOption = fontPath
        ? `fontfile='${escapeDrawtextLine(fontPath)}'`
        : `font='${escapeDrawtextLine(fontName)}'`;

    return lines.map((line, i) => {
        const safe = escapeDrawtextLine(line.trim() || " ");
        // Centre the entire block at y%, then offset each line downward
        const yExpr = `(h*${(y / 100).toFixed(4)}-${Math.round(totalBlockPx / 2)}+${i * lineHeight})`;
        return (
            `drawtext=${fontOption}:text='${safe}'` +
            `:fontcolor=white:fontsize=${fontSize}` +
            `:borderw=2:bordercolor=black` +
            // Use hex ARGB for shadow color — the 'black@0.8' alpha shorthand is
            // not reliably parsed by all FFmpeg builds (especially vendored ones).
            // 0x000000CC = black at ~80 % opacity, matching CSS text-shadow: 2px 2px 0 #000
            `:shadowx=2:shadowy=2:shadowcolor=0x000000CC` +
            `:x=w*${(x / 100).toFixed(4)}-text_w/2` +
            `:y=${yExpr}`
        );
    });
}

// ---------------------------------------------------------------------------
// Main render function
// ---------------------------------------------------------------------------

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
        const clipTrims = input.settings.clipTrims ?? [];
        const concatLines = clipPaths.map((filePath, index) => {
            const trim = clipTrims[index];
            const lines = [`file '${filePath.replace(/'/g, "'\\''")}'`];
            if (trim) {
                if (typeof trim.startTime === "number" && trim.startTime > 0) {
                    lines.push(`inpoint ${trim.startTime.toFixed(3)}`);
                }
                if (typeof trim.endTime === "number" && trim.endTime > 0) {
                    lines.push(`outpoint ${trim.endTime.toFixed(3)}`);
                }
            }
            return lines.join("\n");
        });

        const concatListPath = path.join(workDir, "clips.txt");
        await writeFile(
            concatListPath,
            `${concatLines.join("\n")}\n`,
            "utf8",
        );

        const ffmpegPath = resolveFfmpegPath();

        const speed = clamp(input.settings.speed, 0.5, 2, 1);
        const originalVolume = clamp(
            input.settings.originalAudioVolume,
            0,
            100,
            100,
        );
        const musicVolume = clamp(input.settings.musicVolume, 0, 100, 30);
        const durationMode = input.settings.durationMode ?? "video";
        const wantFadeOut = input.settings.fadeOut === true;

        const text = input.settings.textOverlay?.text?.trim();
        const fontFamily = input.settings.textOverlay?.fontFamily ?? "Arial";

        // Probe all clips in parallel with font resolution so setup is fast
        const [clipInfos, resolvedFontPath] = await Promise.all([
            Promise.all(clipPaths.map((p) => probeVideoInfo(ffmpegPath, p))),
            text ? resolveFont(fontFamily) : Promise.resolve(null),
        ]);

        const sourceHeight = clipInfos[0]?.height ?? 1080;

        // Total raw video duration (before speed adjustment, respecting clipTrims)
        const totalRawSeconds = clipInfos.reduce(
            (sum, info, index) => {
                const trim = clipTrims[index];
                const rawDur = info.duration ?? 0;
                const start = (trim && typeof trim.startTime === "number") ? trim.startTime : 0;
                const end = (trim && typeof trim.endTime === "number" && trim.endTime > 0) ? trim.endTime : rawDur;
                const dur = Math.max(0, end - start);
                return sum + dur;
            },
            0,
        );
        // Actual output video duration after applying playback speed
        const totalVideoSeconds = totalRawSeconds / speed;

        // ----------------------------------------------------------------
        // Build video filter chain
        // ----------------------------------------------------------------
        const videoFilters: string[] = [`setpts=PTS/${speed}`];

        if (input.settings.vintageFilm) {
            videoFilters.push(
                "eq=saturation=0.78:contrast=1.12:brightness=-0.04",
                "noise=alls=5:allf=t+u",
                "vignette=angle=PI/5",
            );
        }

        if (text) {
            const previewFontSize = clamp(
                input.settings.textOverlay?.fontSize,
                4,
                240,
                48,
            );
            const scaledFontSize = Math.max(
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

            // Prefer resolved Google Font -> Unicode system font -> no fontfile
            const fontPath =
                resolvedFontPath ?? resolveUnicodeFontFile() ?? undefined;

            const drawtextFilters = buildDrawtextFilters({
                text,
                fontPath,
                fontName: fontFamily,
                fontSize: scaledFontSize,
                x,
                y,
            });
            videoFilters.push(...drawtextFilters);
        }

        // Fade-out: append to the video filter chain
        const fadeStart = totalVideoSeconds - FADE_OUT_DURATION;
        if (wantFadeOut && fadeStart > 0) {
            videoFilters.push(
                `fade=t=out:st=${fadeStart.toFixed(3)}:d=${FADE_OUT_DURATION}`,
            );
        }

        // Audio fade suffix appended after the last audio filter (amix or volume)
        const afadeSuffix =
            wantFadeOut && fadeStart > 0
                ? `,afade=t=out:st=${fadeStart.toFixed(3)}:d=${FADE_OUT_DURATION}`
                : "";

        // ----------------------------------------------------------------
        // Assemble FFmpeg arguments
        // ----------------------------------------------------------------
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
        // Music duration is needed when durationMode=="music" to determine cutoff.
        // In "video" mode: output always runs for the full (speed-adjusted) video length.
        // In "music" mode: output stops at whichever track (video or music) ends first.
        let musicDuration: number | null = null;

        if (input.music) {
            musicPath = path.join(workDir, "music-track");
            await writeFile(musicPath, input.music.bytes);

            // In "video" mode we loop the music so it always covers the video length.
            // In "music" mode we do NOT loop: output stops at min(video, music).
            if (durationMode === "video") {
                args.push("-stream_loop", "-1", "-i", musicPath);
            } else {
                args.push("-i", musicPath);
                // Probe so we can compute the exact output duration.
                const info = await probeVideoInfo(ffmpegPath, musicPath);
                musicDuration = info.duration;
            }
        }

        // Deterministic output duration — used with explicit -t instead of -shortest.
        //
        // WHY NOT -shortest?
        // With filter_complex, FFmpeg's -shortest is unreliable: if input 0 (the
        // concatenated video clips) has an audio stream [0:a] that is NOT connected
        // to any filter (e.g. when originalVolume=0), FFmpeg may trigger -shortest
        // against that dangling stream's duration rather than the mapped output
        // streams, silently cutting the music early (reproducing the 17-18 s bug).
        //
        // By computing outputDuration ourselves and using -t, duration control is
        // independent of any internal FFmpeg stream-length heuristics.
        const outputDuration: number =
            musicPath && durationMode === "music" && musicDuration !== null
                ? Math.min(totalVideoSeconds, musicDuration)
                : totalVideoSeconds;

        // Extra padding headroom added to music audio filters.
        // apad ensures the music/silence always covers the full outputDuration even
        // if the raw source is slightly shorter due to codec delay or rounding.
        // (stream_loop on the music input guarantees looping in "video" mode, but
        // apad acts as a safety net for the last fraction of a second.)
        const audioPad = `apad=pad_dur=${(outputDuration + 5).toFixed(1)}`;

        // When mixing audio with filter_complex, video filters must also be
        // included in the same filter_complex graph -- FFmpeg forbids combining
        // -vf with -filter_complex on the same output.
        const vfChain = videoFilters.join(",");
        if (musicPath) {
            if (originalVolume > 0) {
                // Both original audio (speed-shifted) and music are mixed.
                // apad on music ensures it covers the full outputDuration even if
                // the raw music track ends slightly before the output end.
                args.push(
                    "-filter_complex",
                    `[0:v]${vfChain}[v];` +
                    `[0:a]atempo=${speed},volume=${originalVolume / 100}[source];` +
                    `[1:a]volume=${musicVolume / 100},${audioPad}[music];` +
                    `[source][music]amix=inputs=2:duration=first:dropout_transition=2${afadeSuffix}[mixed]`,
                    "-map", "[v]",
                    "-map", "[mixed]",
                );
            } else {
                // Original audio muted.
                // Route music through filter_complex AND add apad so the music
                // audio output is guaranteed to cover the full outputDuration.
                // Using explicit -t (below) instead of -shortest removes the risk
                // of early termination from the dangling [0:a] input stream.
                args.push(
                    "-filter_complex",
                    `[0:v]${vfChain}[v];` +
                    `[1:a]volume=${musicVolume / 100},${audioPad}${afadeSuffix}[mixed]`,
                    "-map", "[v]",
                    "-map", "[mixed]",
                );
            }
        } else if (originalVolume > 0) {
            // No music: safe to use -vf for video and -filter:a for audio.
            args.push(
                "-map", "0:v:0",
                "-vf", vfChain,
                "-map", "0:a?",
                "-filter:a", `atempo=${speed},volume=${originalVolume / 100}${afadeSuffix}`,
            );
        } else {
            args.push("-map", "0:v:0", "-vf", vfChain, "-an");
        }

        args.push(
            "-c:v", "libx264",
            "-preset", "medium",
            // CRF 23 = standard quality (~10x smaller than lossless CRF 0).
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
        );

        if (musicPath) {
            // Explicit -t replaces -shortest for all music cases.
            // -shortest is unreliable with filter_complex when input 0 has an
            // unconnected audio stream that may end before the mapped outputs.
            if (outputDuration > 0) {
                args.push("-t", outputDuration.toFixed(3));
            }
        } else {
            // No music: -shortest is safe here (both video and audio come from
            // the same concat demuxer, so they always end together).
            args.push("-shortest");
        }

        args.push(renderedPath);

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
