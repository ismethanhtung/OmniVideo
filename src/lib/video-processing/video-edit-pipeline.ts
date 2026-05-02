import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import type { TranscriptTranslationSegment } from "@/lib/multilingual-audio/types";

type FfmpegSpawn = typeof spawn;

let videoEditFfmpegSpawnForTest: FfmpegSpawn | null = null;
let videoEditReadFileForTest: ((filePath: string) => Promise<Buffer>) | null =
    null;

export type VideoEditRegionPercent = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type VideoEditTimelineSeconds = {
    start: number;
    end: number;
};

export type VideoEditInput = {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
    fileBytes?: Uint8Array;
    mirror?: boolean;
    blur?: {
        enabled: boolean;
        region?: VideoEditRegionPercent;
        timeline?: VideoEditTimelineSeconds;
        strength?: number;
        regions?: Array<{
            region: VideoEditRegionPercent;
            timeline: VideoEditTimelineSeconds;
            strength: number;
        }>;
    };
    subtitles?: {
        enabled: boolean;
        segments: TranscriptTranslationSegment[];
        style?: {
            fontFamily?: string;
            fontSize?: number;
            marginBottom?: number;
        };
    };
};

export type VideoEditMetadata = {
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    transform: {
        mirror: boolean;
        partialBlur: boolean;
        subtitleOverlay: boolean;
        segmentCount: number;
    };
};

export type VideoEditBufferResult = VideoEditMetadata & {
    videoBytes: Buffer;
};

export type VideoEditResult = VideoEditMetadata & {
    videoBase64: string;
};

export class VideoEditError extends Error {
    constructor(
        public readonly code:
            | "VAL_VIDEO_EDIT_VIDEO_REQUIRED"
            | "VAL_VIDEO_EDIT_NO_TRANSFORM"
            | "VAL_VIDEO_EDIT_REGION_INVALID"
            | "VAL_VIDEO_EDIT_TIMELINE_INVALID"
            | "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED"
            | "SYS_VIDEO_EDIT_FAILED",
        message: string,
        public readonly status = 400,
    ) {
        super(message);
        this.name = "VideoEditError";
    }
}

export function setVideoEditFfmpegSpawnForTest(spawnImpl: FfmpegSpawn | null) {
    videoEditFfmpegSpawnForTest = spawnImpl;
}

export function setVideoEditReadFileForTest(
    readFileImpl: ((filePath: string) => Promise<Buffer>) | null,
) {
    videoEditReadFileForTest = readFileImpl;
}

function sanitizeOutputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "omnivideo-video";
    return `${
        base
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 90) || "omnivideo-video"
    }-edit.mp4`;
}

function isFiniteNumber(value: number) {
    return typeof value === "number" && Number.isFinite(value);
}

function normalizeBoolean(value: boolean | undefined) {
    return value === true;
}

export function validateVideoEditInput(input: VideoEditInput) {
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
            "A source video file is required for video edit processing.",
            400,
        );
    }

    const mirror = normalizeBoolean(input.mirror);
    const blurEnabled = input.blur?.enabled === true;
    const subtitlesEnabled = input.subtitles?.enabled === true;

    if (!mirror && !blurEnabled && !subtitlesEnabled) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_NO_TRANSFORM",
            "At least one video edit transform is required.",
            400,
        );
    }

    if (blurEnabled) {
        const blurRegions = normalizeBlurRegions(input.blur);
        if (blurRegions.length === 0) {
            throw new VideoEditError(
                "VAL_VIDEO_EDIT_REGION_INVALID",
                "Partial blur region must be valid percentages inside the output frame.",
                400,
            );
        }

        if (!subtitlesEnabled || !input.subtitles?.segments.length) {
            throw new VideoEditError(
                "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED",
                "Partial blur must be paired with Vietnamese subtitle overlay segments.",
                400,
            );
        }
    }

    if (subtitlesEnabled && !input.subtitles?.segments.length) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED",
            "Subtitle overlay requires at least one translated segment.",
            400,
        );
    }
}

function validateVideoEditTransforms(input: Omit<VideoEditInput, "fileBytes">) {
    validateVideoEditInput({
        ...input,
        fileBytes: new Uint8Array([1]),
    });
}

function roundFilterNumber(value: number) {
    return Number(value.toFixed(4)).toString();
}

function normalizeBlurStrength(value: number) {
    if (!Number.isFinite(value)) return 18;
    return Math.min(60, Math.max(1, Math.round(value)));
}

type NormalizedBlurRegion = {
    region: VideoEditRegionPercent;
    timeline: VideoEditTimelineSeconds;
    strength: number;
};

function isValidRegion(region: VideoEditRegionPercent | undefined) {
    if (!region) return false;
    return (
        isFiniteNumber(region.x) &&
        isFiniteNumber(region.y) &&
        isFiniteNumber(region.width) &&
        isFiniteNumber(region.height) &&
        region.x >= 0 &&
        region.y >= 0 &&
        region.width > 0 &&
        region.height > 0 &&
        region.x + region.width <= 100 &&
        region.y + region.height <= 100
    );
}

function isValidTimeline(timeline: VideoEditTimelineSeconds | undefined) {
    if (!timeline) return false;
    return (
        isFiniteNumber(timeline.start) &&
        isFiniteNumber(timeline.end) &&
        timeline.start >= 0 &&
        timeline.end > timeline.start
    );
}

function normalizeBlurRegions(
    blur: VideoEditInput["blur"] | undefined,
): NormalizedBlurRegion[] {
    if (!blur?.enabled) return [];
    const output: NormalizedBlurRegion[] = [];
    if (Array.isArray(blur.regions)) {
        for (const item of blur.regions) {
            if (!isValidRegion(item.region) || !isValidTimeline(item.timeline)) {
                continue;
            }
            output.push({
                region: item.region,
                timeline: item.timeline,
                strength: normalizeBlurStrength(item.strength),
            });
        }
    }
    if (
        output.length === 0 &&
        isValidRegion(blur.region) &&
        isValidTimeline(blur.timeline)
    ) {
        output.push({
            region: blur.region as VideoEditRegionPercent,
            timeline: blur.timeline as VideoEditTimelineSeconds,
            strength: normalizeBlurStrength(blur.strength ?? 18),
        });
    }
    return output;
}

function escapeAssText(text: string) {
    return text
        .replace(/\r?\n/g, "\\N")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}");
}

function formatAssTimestamp(seconds: number) {
    const safeSeconds = Math.max(0, seconds);
    const centiseconds = Math.round(safeSeconds * 100);
    const cs = centiseconds % 100;
    const totalSeconds = Math.floor(centiseconds / 100);
    const ss = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mm = totalMinutes % 60;
    const hh = Math.floor(totalMinutes / 60);
    return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(
        2,
        "0",
    )}.${String(cs).padStart(2, "0")}`;
}

export function buildSubtitleAssContent(
    segments: TranscriptTranslationSegment[],
    style?: {
        fontFamily?: string;
        fontSize?: number;
        marginBottom?: number;
        marginLeft?: number;
        marginRight?: number;
        alignment?: number;
        backgroundColor?: string;
        backgroundOpacity?: number;
        backgroundEnabled?: boolean;
        playResX?: number;
        playResY?: number;
    },
) {
    const subtitleFontFamily = (style?.fontFamily || "Arial")
        .replace(/,/g, "")
        .trim();
    const subtitleFontSize = Number.isFinite(style?.fontSize)
        ? Math.min(160, Math.max(20, Math.round(style?.fontSize ?? 100)))
        : 100;
    const subtitleMarginBottom = Number.isFinite(style?.marginBottom)
        ? Math.min(520, Math.max(20, Math.round(style?.marginBottom ?? 150)))
        : 150;
    const subtitleMarginLeft = Number.isFinite(style?.marginLeft)
        ? Math.min(520, Math.max(0, Math.round(style?.marginLeft ?? 60)))
        : 60;
    const subtitleMarginRight = Number.isFinite(style?.marginRight)
        ? Math.min(520, Math.max(0, Math.round(style?.marginRight ?? 60)))
        : 60;
    const subtitleAlignment = Number.isFinite(style?.alignment)
        ? Math.min(9, Math.max(1, Math.round(style?.alignment ?? 2)))
        : 2;
    const backgroundEnabled = style?.backgroundEnabled !== false;
    const backgroundOpacity = Number.isFinite(style?.backgroundOpacity)
        ? Math.min(100, Math.max(0, Math.round(style?.backgroundOpacity ?? 65)))
        : 65;
    const backgroundColor = (style?.backgroundColor || "#000000").trim();
    const backgroundAssColor = hexToAssColor(backgroundColor, backgroundOpacity);
    const borderStyle = backgroundEnabled ? 3 : 1;
    const playResX = Number.isFinite(style?.playResX)
        ? Math.max(360, Math.round(style?.playResX ?? 1920))
        : 1920;
    const playResY = Number.isFinite(style?.playResY)
        ? Math.max(360, Math.round(style?.playResY ?? 1080))
        : 1080;
    const events = segments
        .filter(
            (segment) =>
                Number.isFinite(segment.start) &&
                Number.isFinite(segment.end) &&
                segment.end > segment.start &&
                segment.translatedText.trim().length > 0,
        )
        .map(
            (segment) =>
                `Dialogue: 0,${formatAssTimestamp(segment.start)},${formatAssTimestamp(
                    segment.end,
                )},Default,,0,0,0,,${escapeAssText(
                    segment.translatedText.trim(),
                )}`,
        );

    if (events.length === 0) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED",
            "Subtitle overlay requires valid translated segments with timestamps.",
            400,
        );
    }

    return [
        "[Script Info]",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        `PlayResX: ${playResX}`,
        `PlayResY: ${playResY}`,
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        `Style: Default,${subtitleFontFamily || "Arial"},${subtitleFontSize},&H00FFFFFF,&H000000FF,&H00111111,${backgroundAssColor},-1,0,0,0,100,100,0,0,${borderStyle},2,0,${subtitleAlignment},${subtitleMarginLeft},${subtitleMarginRight},${subtitleMarginBottom},1`,
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ...events,
        "",
    ].join("\n");
}

function hexToAssColor(hex: string, opacityPercent: number) {
    const normalized = hex.replace(/^#/u, "");
    const safe =
        normalized.length === 6 && /^[0-9a-fA-F]{6}$/u.test(normalized)
            ? normalized
            : "000000";
    const rr = safe.slice(0, 2);
    const gg = safe.slice(2, 4);
    const bb = safe.slice(4, 6);
    const alpha = Math.round((100 - opacityPercent) * 2.55)
        .toString(16)
        .padStart(2, "0")
        .toUpperCase();
    return `&H${alpha}${bb}${gg}${rr}`;
}

function escapeFfmpegFilterPath(filePath: string) {
    return filePath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function buildVideoEditFilter(input: {
    mirror: boolean;
    blur?: {
        enabled: boolean;
        region?: VideoEditRegionPercent;
        timeline?: VideoEditTimelineSeconds;
        strength?: number;
        regions?: Array<{
            region: VideoEditRegionPercent;
            timeline: VideoEditTimelineSeconds;
            strength: number;
        }>;
    };
    subtitleAssPath?: string;
}) {
    const filters: string[] = [];
    let currentLabel = "0:v";
    let step = 0;

    const blurRegions = normalizeBlurRegions(input.blur);
    if (blurRegions.length > 0) {
        for (const blurRegion of blurRegions) {
            const region = blurRegion.region;
            const timeline = blurRegion.timeline;
            const strength = blurRegion.strength;
            const splitBase = `base${step}`;
            const splitCrop = `crop${step}`;
            const blurLabel = `blur${step}`;
            const nextLabel = `v${step++}`;
            const x = roundFilterNumber(region.x / 100);
            const y = roundFilterNumber(region.y / 100);
            const width = roundFilterNumber(region.width / 100);
            const height = roundFilterNumber(region.height / 100);
            const adaptiveLumaRadius = `min(${strength}\\,min(w\\,h)/2-1)`;
            const adaptiveChromaRadius = `min(${strength}\\,min(cw\\,ch)/2-1)`;

            filters.push(
                `[${currentLabel}]split[${splitBase}][${splitCrop}]`,
                `[${splitCrop}]crop=w=iw*${width}:h=ih*${height}:x=iw*${x}:y=ih*${y},boxblur=luma_radius=${adaptiveLumaRadius}:luma_power=1:chroma_radius=${adaptiveChromaRadius}:chroma_power=1[${blurLabel}]`,
                `[${splitBase}][${blurLabel}]overlay=x=main_w*${x}:y=main_h*${y}:enable='between(t,${roundFilterNumber(
                    timeline.start,
                )},${roundFilterNumber(timeline.end)})'[${nextLabel}]`,
            );
            currentLabel = nextLabel;
        }
    }

    if (input.mirror) {
        const nextLabel = `v${step++}`;
        filters.push(`[${currentLabel}]hflip[${nextLabel}]`);
        currentLabel = nextLabel;
    }

    if (input.subtitleAssPath) {
        const nextLabel = `v${step++}`;
        filters.push(
            `[${currentLabel}]ass='${escapeFfmpegFilterPath(
                input.subtitleAssPath,
            )}'[${nextLabel}]`,
        );
        currentLabel = nextLabel;
    }

    return {
        filter: filters.join(";"),
        outputLabel: currentLabel,
    };
}

export function buildVideoEditFfmpegArgs(input: {
    videoPath: string;
    outputPath: string;
    mirror: boolean;
    blur?: {
        enabled: boolean;
        region?: VideoEditRegionPercent;
        timeline?: VideoEditTimelineSeconds;
        strength?: number;
        regions?: Array<{
            region: VideoEditRegionPercent;
            timeline: VideoEditTimelineSeconds;
            strength: number;
        }>;
    };
    subtitleAssPath?: string;
}) {
    const { filter, outputLabel } = buildVideoEditFilter(input);

    if (!filter) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_NO_TRANSFORM",
            "At least one video edit transform is required.",
            400,
        );
    }

    return [
        "-y",
        "-i",
        input.videoPath,
        "-filter_complex",
        filter,
        "-map",
        `[${outputLabel}]`,
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "22",
        "-c:a",
        "copy",
        "-movflags",
        "+faststart",
        input.outputPath,
    ];
}

async function runFfmpeg(args: string[]) {
    const ffmpegPath = resolveFfmpegPath();
    const spawnImpl = videoEditFfmpegSpawnForTest ?? spawn;

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
            reject(
                new Error(stderr.trim() || `ffmpeg exited with code ${code}`),
            );
        });
    });
}

export async function runVideoEditPipeline(
    input: VideoEditInput,
): Promise<VideoEditResult> {
    validateVideoEditInput(input);
    if (!input.fileBytes) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
            "A source video file is required for video edit processing.",
            400,
        );
    }

    const workDir = path.join(tmpdir(), `omnivideo-edit-${randomUUID()}`);
    const inputPath = path.join(workDir, input.fileName || "source.mp4");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.fileBytes);
        const result = await runVideoEditPipelineFromPath({
            ...input,
            inputPath,
        });
        return {
            ...result,
            videoBase64: result.videoBytes.toString("base64"),
        };
    } catch (error) {
        if (error instanceof VideoEditError) throw error;
        throw new VideoEditError(
            "SYS_VIDEO_EDIT_FAILED",
            error instanceof Error ? error.message : "Video edit failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export async function runVideoEditPipelineFromPath(
    input: Omit<VideoEditInput, "fileBytes"> & { inputPath: string },
): Promise<VideoEditBufferResult> {
    const startedAt = Date.now();
    validateVideoEditTransforms(input);

    const mirror = input.mirror === true;
    const blur = input.blur?.enabled ? input.blur : undefined;
    const subtitleSegments =
        input.subtitles?.enabled === true ? input.subtitles.segments : [];
    const workDir = path.join(tmpdir(), `omnivideo-edit-${randomUUID()}`);
    const outputPath = path.join(workDir, "edited.mp4");
    const assPath =
        subtitleSegments.length > 0 ? path.join(workDir, "subtitles.ass") : "";

    try {
        await mkdir(workDir, { recursive: true });
        if (assPath) {
            await writeFile(
                assPath,
                buildSubtitleAssContent(
                    subtitleSegments,
                    input.subtitles?.style,
                ),
            );
        }

        await runFfmpeg(
            buildVideoEditFfmpegArgs({
                videoPath: input.inputPath,
                outputPath,
                mirror,
                blur,
                subtitleAssPath: assPath || undefined,
            }),
        );

        const outputBytes = videoEditReadFileForTest
            ? await videoEditReadFileForTest(outputPath)
            : await readFile(outputPath);

        return {
            videoBytes: outputBytes,
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: sanitizeOutputName(input.fileName),
            byteLength: outputBytes.byteLength,
            generationDurationMs: Date.now() - startedAt,
            transform: {
                mirror,
                partialBlur: Boolean(blur),
                subtitleOverlay: subtitleSegments.length > 0,
                segmentCount: subtitleSegments.length,
            },
        };
    } catch (error) {
        if (error instanceof VideoEditError) throw error;
        throw new VideoEditError(
            "SYS_VIDEO_EDIT_FAILED",
            error instanceof Error ? error.message : "Video edit failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}
