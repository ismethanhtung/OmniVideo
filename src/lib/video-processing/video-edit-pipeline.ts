import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
    access,
    copyFile,
    mkdir,
    readFile,
    readdir,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import type { TranscriptTranslationSegment } from "@/lib/multilingual-audio/types";

type FfmpegSpawn = typeof spawn;

let videoEditFfmpegSpawnForTest: FfmpegSpawn | null = null;
let videoEditReadFileForTest: ((filePath: string) => Promise<Buffer>) | null =
    null;
const BUNDLED_SUBTITLE_FONT_FILES: Record<string, string> = {
    Bangers: path.join(
        process.cwd(),
        "public",
        "fonts",
        "Bangers-Regular.ttf",
    ),
    Lobster: path.join(
        process.cwd(),
        "public",
        "fonts",
        "Lobster-Regular.ttf",
    ),
};

const FALLBACK_BUNDLED_SUBTITLE_FONT_FILES: Record<string, string> = {
    Lobster: path.join(
        process.cwd(),
        "src",
        "assets",
        "fonts",
        "Lobster-Regular.ttf",
    ),
};

export type SubtitleDisplayMode =
    | "standard"
    | "word-reveal"
    | "karaoke"
    | "triple-word-highlight";

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

export type VideoEditTimedRegion = {
    region: VideoEditRegionPercent;
    timeline: VideoEditTimelineSeconds;
};

export type VideoEditTextOverlay = {
    text: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: number;
    textColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    backgroundEnabled?: boolean;
    backgroundColor?: string;
    backgroundOpacity?: number;
    x?: number;
    y?: number;
    start?: number;
    end?: number;
};

export type VideoEditShortClip = {
    enabled: boolean;
    start?: number;
    duration?: number;
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
    coverBoxes?: {
        enabled: boolean;
        color?: string;
        opacity?: number;
        region?: VideoEditRegionPercent;
        timeline?: VideoEditTimelineSeconds;
        regions?: Array<
            VideoEditTimedRegion & {
                color?: string;
                opacity?: number;
            }
        >;
    };
    subtitles?: {
        enabled: boolean;
        segments: TranscriptTranslationSegment[];
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
            backgroundPaddingY?: number;
            placementRegion?: VideoEditRegionPercent;
            playResX?: number;
            playResY?: number;
            subtitleMode?: SubtitleDisplayMode;
        };
    };
    textOverlays?: {
        enabled: boolean;
        overlays: VideoEditTextOverlay[];
        playResX?: number;
        playResY?: number;
    };
    shortClip?: VideoEditShortClip;
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
        coverBox: boolean;
        subtitleOverlay: boolean;
        segmentCount: number;
        textOverlay: boolean;
        textOverlayCount: number;
        youtubeShort: boolean;
        shortClipDurationSeconds?: number;
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
            | "VAL_VIDEO_EDIT_TEXT_OVERLAY_REQUIRED"
            | "VAL_VIDEO_EDIT_SHORT_CLIP_INVALID"
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
    const coverBoxesEnabled = input.coverBoxes?.enabled === true;
    const subtitlesEnabled = input.subtitles?.enabled === true;
    const textOverlaysEnabled = input.textOverlays?.enabled === true;
    const shortClipEnabled = input.shortClip?.enabled === true;

    if (
        !mirror &&
        !blurEnabled &&
        !coverBoxesEnabled &&
        !subtitlesEnabled &&
        !textOverlaysEnabled &&
        !shortClipEnabled
    ) {
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

    if (coverBoxesEnabled && normalizeCoverBoxes(input.coverBoxes).length === 0) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_REGION_INVALID",
            "Cover box region must be valid percentages inside the output frame.",
            400,
        );
    }

    if (subtitlesEnabled && !input.subtitles?.segments.length) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED",
            "Subtitle overlay requires at least one translated segment.",
            400,
        );
    }

    if (
        textOverlaysEnabled &&
        normalizeTextOverlays(input.textOverlays).length === 0
    ) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_TEXT_OVERLAY_REQUIRED",
            "Text overlay requires at least one non-empty text layer.",
            400,
        );
    }

    if (shortClipEnabled && !normalizeShortClip(input.shortClip)) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_SHORT_CLIP_INVALID",
            "YouTube Short clip start and duration must be valid positive seconds.",
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

type NormalizedCoverBox = {
    region: VideoEditRegionPercent;
    timeline: VideoEditTimelineSeconds;
    color: string;
    opacity: number;
};

type NormalizedTextOverlay = Required<
    Pick<
        VideoEditTextOverlay,
        | "text"
        | "fontFamily"
        | "fontSize"
        | "fontWeight"
        | "textColor"
        | "strokeColor"
        | "strokeWidth"
        | "backgroundEnabled"
        | "backgroundColor"
        | "backgroundOpacity"
        | "x"
        | "y"
        | "start"
        | "end"
    >
>;

type NormalizedShortClip = {
    start: number;
    duration: number;
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

function normalizeShortClip(
    shortClip: VideoEditInput["shortClip"] | undefined,
): NormalizedShortClip | null {
    if (!shortClip?.enabled) return null;
    const start = Number(shortClip.start ?? 0);
    const duration = Number(shortClip.duration ?? 60);
    if (
        !Number.isFinite(start) ||
        !Number.isFinite(duration) ||
        start < 0 ||
        duration <= 0
    ) {
        return null;
    }
    return {
        start,
        duration,
    };
}

function normalizeHexColor(value: string | undefined, fallback = "#000000") {
    const normalized = (value || fallback).trim();
    const candidate = normalized.startsWith("#")
        ? normalized
        : `#${normalized}`;
    return /^#[0-9a-fA-F]{6}$/u.test(candidate) ? candidate : fallback;
}

function normalizeOpacityPercent(value: number | undefined, fallback = 65) {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(100, Math.max(0, Math.round(value ?? fallback)));
}

function normalizeCoverBoxes(
    coverBoxes: VideoEditInput["coverBoxes"] | undefined,
): NormalizedCoverBox[] {
    if (!coverBoxes?.enabled) return [];
    const defaultColor = normalizeHexColor(coverBoxes.color, "#000000");
    const defaultOpacity = normalizeOpacityPercent(coverBoxes.opacity, 65);
    const output: NormalizedCoverBox[] = [];

    if (Array.isArray(coverBoxes.regions)) {
        for (const item of coverBoxes.regions) {
            if (!isValidRegion(item.region) || !isValidTimeline(item.timeline)) {
                continue;
            }
            output.push({
                region: item.region,
                timeline: item.timeline,
                color: normalizeHexColor(item.color, defaultColor),
                opacity: normalizeOpacityPercent(item.opacity, defaultOpacity),
            });
        }
    }

    if (
        output.length === 0 &&
        isValidRegion(coverBoxes.region) &&
        isValidTimeline(coverBoxes.timeline)
    ) {
        output.push({
            region: coverBoxes.region as VideoEditRegionPercent,
            timeline: coverBoxes.timeline as VideoEditTimelineSeconds,
            color: defaultColor,
            opacity: defaultOpacity,
        });
    }

    return output;
}

function normalizeTextOverlays(
    textOverlays: VideoEditInput["textOverlays"] | undefined,
): NormalizedTextOverlay[] {
    if (!textOverlays?.enabled || !Array.isArray(textOverlays.overlays)) {
        return [];
    }

    return textOverlays.overlays
        .map((overlay): NormalizedTextOverlay | null => {
            const text = (overlay.text || "").trim();
            const start = Number.isFinite(overlay.start)
                ? Math.max(0, Number(overlay.start))
                : 0;
            const end = Number.isFinite(overlay.end)
                ? Math.max(0, Number(overlay.end))
                : 36000;
            if (!text || end <= start) return null;

            return {
                text,
                fontFamily: (overlay.fontFamily || "Arial")
                    .replace(/,/g, "")
                    .trim(),
                fontSize: Number.isFinite(overlay.fontSize)
                    ? Math.min(
                          180,
                          Math.max(12, Math.round(overlay.fontSize ?? 48)),
                      )
                    : 48,
                fontWeight: Number.isFinite(overlay.fontWeight)
                    ? Math.min(
                          900,
                          Math.max(100, Math.round(overlay.fontWeight ?? 800)),
                      )
                    : 800,
                textColor: normalizeHexColor(overlay.textColor, "#FFFFFF"),
                strokeColor: normalizeHexColor(overlay.strokeColor, "#111827"),
                strokeWidth: Number.isFinite(overlay.strokeWidth)
                    ? Math.min(
                          20,
                          Math.max(0, Math.round(overlay.strokeWidth ?? 3)),
                      )
                    : 3,
                backgroundEnabled: overlay.backgroundEnabled === true,
                backgroundColor: normalizeHexColor(
                    overlay.backgroundColor,
                    "#000000",
                ),
                backgroundOpacity: normalizeOpacityPercent(
                    overlay.backgroundOpacity,
                    65,
                ),
                x: Number.isFinite(overlay.x)
                    ? Math.min(100, Math.max(0, Number(overlay.x)))
                    : 86,
                y: Number.isFinite(overlay.y)
                    ? Math.min(100, Math.max(0, Number(overlay.y)))
                    : 10,
                start,
                end,
            };
        })
        .filter((overlay): overlay is NormalizedTextOverlay => overlay !== null);
}

function escapeAssText(text: string) {
    return text
        .replace(/\r?\n/g, "\\N")
        .replace(/\{/g, "\\{")
        .replace(/\}/g, "\\}");
}

function normalizeSubtitleTextForAss(text: string) {
    return text
        .split(/\r?\n/gu)
        .map((line) => line.replace(/\s+/gu, " ").trim())
        .filter((line) => line.length > 0)
        .join("\n");
}

function addAssLineGap(input: {
    escapedText: string;
    fontSize: number;
}) {
    if (!input.escapedText.includes("\\N")) return input.escapedText;
    const gapFontSize = Math.max(4, Math.round(input.fontSize * 0.18));
    return input.escapedText.replace(
        /\\N/gu,
        `\\N{\\fs${gapFontSize}}\\h\\N{\\fs${input.fontSize}}`,
    );
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

function calculateWordWeights(words: string[]): number[] {
    return words.map((word) => {
        const clean = word.trim();
        if (!clean) return 1.0;

        let weight = 1.0;
        // Strip punctuation for character length count
        const charCount = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").length;
        weight += Math.min(1.5, charCount * 0.15);

        // Adjust for punctuation pauses
        if (/[.!?:;]$/u.test(clean) || clean.endsWith(".") || clean.endsWith("?") || clean.endsWith("!")) {
            weight += 2.5;
        } else if (/,$/u.test(clean) || clean.endsWith(",") || clean.endsWith("-")) {
            weight += 1.2;
        }
        return weight;
    });
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
        backgroundPaddingY?: number;
        placementRegion?: VideoEditRegionPercent;
        playResX?: number;
        playResY?: number;
        subtitleMode?: SubtitleDisplayMode;
        textColor?: string;
    },
) {
    const subtitleFontFamily = (style?.fontFamily || "Bangers")
        .replace(/,/g, "")
        .trim();
    const subtitleFontSize = Number.isFinite(style?.fontSize)
        ? Math.min(160, Math.max(20, Math.round(style?.fontSize ?? 80)))
        : 80;
    const subtitleMarginBottom = Number.isFinite(style?.marginBottom)
        ? Math.min(520, Math.max(0, Math.round(style?.marginBottom ?? 380)))
        : 380;
    const subtitleMarginLeft = Number.isFinite(style?.marginLeft)
        ? Math.min(520, Math.max(0, Math.round(style?.marginLeft ?? 60)))
        : 60;
    const subtitleMarginRight = Number.isFinite(style?.marginRight)
        ? Math.min(520, Math.max(0, Math.round(style?.marginRight ?? 60)))
        : 60;
    const subtitleAlignment = Number.isFinite(style?.alignment)
        ? Math.min(9, Math.max(1, Math.round(style?.alignment ?? 2)))
        : 2;
    const textColor = (style?.textColor || "#FFFFCC").trim();
    const backgroundEnabled = style?.backgroundEnabled !== false;
    const backgroundOpacity = Number.isFinite(style?.backgroundOpacity)
        ? Math.min(100, Math.max(0, Math.round(style?.backgroundOpacity ?? 0)))
        : 0;
    const backgroundColor = (style?.backgroundColor || "#000000").trim();
    const backgroundAssColor = hexToAssColor(backgroundColor, backgroundOpacity);
    const backgroundPaddingY = Number.isFinite(style?.backgroundPaddingY)
        ? Math.min(24, Math.max(0, Math.round(style?.backgroundPaddingY ?? 2)))
        : 2;
    const borderStyle = backgroundEnabled ? 3 : 1;
    const playResX = Number.isFinite(style?.playResX)
        ? Math.max(360, Math.round(style?.playResX ?? 1920))
        : 1920;
    const playResY = Number.isFinite(style?.playResY)
        ? Math.max(360, Math.round(style?.playResY ?? 1080))
        : 1080;
    const placementRegion =
        style?.placementRegion &&
        Number.isFinite(style.placementRegion.x) &&
        Number.isFinite(style.placementRegion.y) &&
        Number.isFinite(style.placementRegion.width) &&
        Number.isFinite(style.placementRegion.height)
            ? {
                  x: Math.min(100, Math.max(0, style.placementRegion.x)),
                  y: Math.min(100, Math.max(0, style.placementRegion.y)),
                  width: Math.min(
                      100,
                      Math.max(0.5, style.placementRegion.width),
                  ),
                  height: Math.min(
                      100,
                      Math.max(0.5, style.placementRegion.height),
                  ),
              }
            : null;
    const positionedAssPrefix = placementRegion
        ? `{\\an5\\pos(${Math.round(
              ((placementRegion.x + placementRegion.width / 2) / 100) *
                  playResX,
          )},${Math.round(
              ((placementRegion.y + placementRegion.height / 2) / 100) *
                  playResY,
          )})}`
        : "";
    const effectiveSubtitleAlignment = placementRegion ? 5 : subtitleAlignment;
    const effectiveSubtitleMarginLeft = placementRegion
        ? 0
        : subtitleMarginLeft;
    const effectiveSubtitleMarginRight = placementRegion
        ? 0
        : subtitleMarginRight;
    const effectiveSubtitleMarginBottom = placementRegion
        ? 0
        : subtitleMarginBottom;
    const subtitleMode = style?.subtitleMode || "standard";
    const isTripleWordHighlight = subtitleMode === "triple-word-highlight";
    const textAssColor = hexToAssColor(
        isTripleWordHighlight ? "#FFFFCC" : textColor,
        100,
    );
    const secondaryTextAssColor = hexToAssColor("#FF0000", 100);
    const defaultTextOverrideColor = hexToAssOverrideColor("#FFFFCC");
    const activeTextOverrideColor = hexToAssOverrideColor(textColor);
    const normalizedSegments: Array<{
        start: string;
        end: string;
        text: string;
        backgroundText?: string;
    }> = [];

    for (const segment of segments) {
        if (
            !Number.isFinite(segment.start) ||
            !Number.isFinite(segment.end) ||
            segment.end <= segment.start ||
            !segment.translatedText.trim()
        ) {
            continue;
        }

        const rawText = normalizeSubtitleTextForAss(
            segment.translatedText.toLocaleUpperCase("vi-VN"),
        );
        const words = rawText.split(/\s+/gu).filter((w) => w.length > 0);

        if (words.length === 0) {
            continue;
        }

        const segmentSpeechEnd = segment.speechEnd;
        const hasSpeechEnd = typeof segmentSpeechEnd === "number" && segmentSpeechEnd > segment.start;
        const effectiveEnd = hasSpeechEnd ? segmentSpeechEnd : segment.end;
        const segmentEnd = effectiveEnd;

        if (subtitleMode === "word-reveal" && words.length > 1) {
            const duration = effectiveEnd - segment.start;
            const weights = calculateWordWeights(words);
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);

            let currentStart = segment.start;
            for (let i = 0; i < words.length; i++) {
                const wDuration = duration * (weights[i] / totalWeight);
                const wStart = currentStart;
                const wEnd = i === words.length - 1 ? segmentEnd : wStart + wDuration;
                const wordText = words[i];

                normalizedSegments.push({
                    start: formatAssTimestamp(wStart),
                    end: formatAssTimestamp(wEnd),
                    text: addAssLineGap({
                        escapedText: escapeAssText(wordText),
                        fontSize: subtitleFontSize,
                    }),
                });
                currentStart = wStart + wDuration;
            }
        } else if (subtitleMode === "karaoke" && words.length > 1) {
            const activeDurationCs = Math.round((effectiveEnd - segment.start) * 100);
            const weights = calculateWordWeights(words);
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);

            const wordDurationsCs = words.map((_, idx) => {
                return Math.round(activeDurationCs * (weights[idx] / totalWeight));
            });

            const sumCs = wordDurationsCs.reduce((sum, d) => sum + d, 0);
            const diff = activeDurationCs - sumCs;
            if (diff !== 0 && wordDurationsCs.length > 0) {
                let maxIdx = 0;
                for (let i = 1; i < wordDurationsCs.length; i++) {
                    if (wordDurationsCs[i] > wordDurationsCs[maxIdx]) {
                        maxIdx = i;
                    }
                }
                wordDurationsCs[maxIdx] = Math.max(1, wordDurationsCs[maxIdx] + diff);
            }

            const karaokeTextParts = words.map((w, idx) => `{\\k${wordDurationsCs[idx]}}${escapeAssText(w)}`);

            const totalSegmentCs = Math.round((segmentEnd - segment.start) * 100);
            const remainingCs = totalSegmentCs - activeDurationCs;
            if (remainingCs > 0) {
                karaokeTextParts.push(`{\\k${remainingCs}}`);
            }

            const karaokeText = karaokeTextParts.join(" ");

            normalizedSegments.push({
                start: formatAssTimestamp(segment.start),
                end: formatAssTimestamp(segmentEnd),
                text: addAssLineGap({
                    escapedText: karaokeText,
                    fontSize: subtitleFontSize,
                }),
            });
        } else if (
            subtitleMode === "triple-word-highlight" &&
            words.length > 1
        ) {
            const duration = effectiveEnd - segment.start;
            const weights = calculateWordWeights(words);
            const totalWeight = weights.reduce((sum, w) => sum + w, 0);
            const wordDurations = words.map(
                (_, idx) => duration * (weights[idx] / totalWeight),
            );

            let currentStart = segment.start;
            for (let wordIndex = 0; wordIndex < words.length; wordIndex += 1) {
                const wordStartSeconds = currentStart;
                const wordEndSeconds =
                    wordIndex === words.length - 1
                        ? segmentEnd
                        : wordStartSeconds + wordDurations[wordIndex];
                const windowStart = Math.floor(wordIndex / 3) * 3;
                const windowWords = words.slice(windowStart, windowStart + 3);
                const windowText = windowWords
                    .map((word, idx) => {
                        const absoluteIndex = windowStart + idx;
                        const escapedWord = escapeAssText(word);
                        if (absoluteIndex !== wordIndex) {
                            return escapedWord;
                        }
                        return `{\\c${activeTextOverrideColor}}${escapedWord}{\\c${defaultTextOverrideColor}}`;
                    })
                    .join(" ");
                const backgroundWindowText = windowWords
                    .map((word) => escapeAssText(word))
                    .join(" ");

                normalizedSegments.push({
                    start: formatAssTimestamp(wordStartSeconds),
                    end: formatAssTimestamp(wordEndSeconds),
                    text: addAssLineGap({
                        escapedText: windowText,
                        fontSize: subtitleFontSize,
                    }),
                    backgroundText: addAssLineGap({
                        escapedText: backgroundWindowText,
                        fontSize: subtitleFontSize,
                    }),
                });
                currentStart = wordEndSeconds;
            }
        } else {
            // standard mode or single word segment
            normalizedSegments.push({
                start: formatAssTimestamp(segment.start),
                end: formatAssTimestamp(segmentEnd),
                text: addAssLineGap({
                    escapedText: escapeAssText(rawText),
                    fontSize: subtitleFontSize,
                }),
            });
        }
    }

    if (normalizedSegments.length === 0) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_SUBTITLES_REQUIRED",
            "Subtitle overlay requires valid translated segments with timestamps.",
            400,
        );
    }

    const styleLines: string[] = [];
    const eventLines: string[] = [];

    if (backgroundEnabled) {
        // Layer 1: opaque box only (transparent glyph), Layer 2: visible text with black outline.
        styleLines.push(
            `Style: BackgroundBox,${subtitleFontFamily || "Bangers"},${subtitleFontSize},&HFF000000,&H000000FF,${backgroundAssColor},${backgroundAssColor},-1,0,0,0,100,100,0,0,3,${backgroundPaddingY},0,${effectiveSubtitleAlignment},${effectiveSubtitleMarginLeft},${effectiveSubtitleMarginRight},${effectiveSubtitleMarginBottom},1`,
            `Style: ForegroundText,${subtitleFontFamily || "Bangers"},${subtitleFontSize},${textAssColor},${secondaryTextAssColor},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,2,0,${effectiveSubtitleAlignment},${effectiveSubtitleMarginLeft},${effectiveSubtitleMarginRight},${effectiveSubtitleMarginBottom},1`,
        );
        for (const segment of normalizedSegments) {
            eventLines.push(
                `Dialogue: 0,${segment.start},${segment.end},BackgroundBox,,0,0,0,,${positionedAssPrefix}${segment.backgroundText ?? segment.text}`,
                `Dialogue: 1,${segment.start},${segment.end},ForegroundText,,0,0,0,,${positionedAssPrefix}${segment.text}`,
            );
        }
    } else {
        styleLines.push(
            `Style: Default,${subtitleFontFamily || "Bangers"},${subtitleFontSize},${textAssColor},${secondaryTextAssColor},&H00000000,&H00000000,-1,0,0,0,100,100,0,0,${borderStyle},2,0,${effectiveSubtitleAlignment},${effectiveSubtitleMarginLeft},${effectiveSubtitleMarginRight},${effectiveSubtitleMarginBottom},1`,
        );
        for (const segment of normalizedSegments) {
            eventLines.push(
                `Dialogue: 0,${segment.start},${segment.end},Default,,0,0,0,,${positionedAssPrefix}${segment.text}`,
            );
        }
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
        ...styleLines,
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ...eventLines,
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

function hexToAssOverrideColor(hex: string) {
    const normalized = hex.replace(/^#/u, "");
    const safe =
        normalized.length === 6 && /^[0-9a-fA-F]{6}$/u.test(normalized)
            ? normalized
            : "000000";
    const rr = safe.slice(0, 2);
    const gg = safe.slice(2, 4);
    const bb = safe.slice(4, 6);
    return `&H${bb}${gg}${rr}&`;
}

export function buildTextOverlayAssContent(
    textOverlays: VideoEditTextOverlay[],
    style?: {
        playResX?: number;
        playResY?: number;
    },
) {
    const playResX = Number.isFinite(style?.playResX)
        ? Math.max(360, Math.round(style?.playResX ?? 1920))
        : 1920;
    const playResY = Number.isFinite(style?.playResY)
        ? Math.max(360, Math.round(style?.playResY ?? 1080))
        : 1080;
    const normalizedOverlays = normalizeTextOverlays({
        enabled: true,
        overlays: textOverlays,
    });

    if (normalizedOverlays.length === 0) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_TEXT_OVERLAY_REQUIRED",
            "Text overlay requires at least one non-empty text layer.",
            400,
        );
    }

    const styleLines = normalizedOverlays.map((overlay, index) => {
        const borderStyle = overlay.backgroundEnabled ? 3 : 1;
        const bold = overlay.fontWeight >= 600 ? -1 : 0;
        return `Style: TextOverlay${index},${overlay.fontFamily || "Arial"},${overlay.fontSize},${hexToAssColor(
            overlay.textColor,
            100,
        )},&H000000FF,${hexToAssColor(
            overlay.strokeColor,
            100,
        )},${hexToAssColor(
            overlay.backgroundColor,
            overlay.backgroundOpacity,
        )},${bold},0,0,0,100,100,0,0,${borderStyle},${overlay.strokeWidth},0,5,0,0,0,1`;
    });
    const eventLines = normalizedOverlays.map((overlay, index) => {
        const x = Math.round((overlay.x / 100) * playResX);
        const y = Math.round((overlay.y / 100) * playResY);
        return `Dialogue: ${20 + index},${formatAssTimestamp(
            overlay.start,
        )},${formatAssTimestamp(
            overlay.end,
        )},TextOverlay${index},,0,0,0,,{\\an5\\pos(${x},${y})}${escapeAssText(
            overlay.text,
        )}`;
    });

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
        ...styleLines,
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
        ...eventLines,
        "",
    ].join("\n");
}

function escapeFfmpegFilterPath(filePath: string) {
    return filePath.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function resolveGoogleFontMediaPathsForFamily(fontFamily: string) {
    const chunkDirs = [
        path.join(process.cwd(), ".next-dev", "static", "chunks"),
        path.join(process.cwd(), ".next", "static", "chunks"),
    ];
    const resolvedPaths = new Set<string>();

    for (const chunkDir of chunkDirs) {
        let entries: string[] = [];
        try {
            entries = await readdir(chunkDir);
        } catch {
            continue;
        }
        for (const entry of entries) {
            if (
                !entry.includes("internal_font_google") ||
                !entry.endsWith(".single.css")
            ) {
                continue;
            }
            const cssPath = path.join(chunkDir, entry);
            let css = "";
            try {
                css = await readFile(cssPath, "utf8");
            } catch {
                continue;
            }
            const familyPattern = new RegExp(
                `font-family:\\s*${escapeRegExp(fontFamily)};`,
                "u",
            );
            if (!familyPattern.test(css)) continue;

            const mediaPathMatches = css.matchAll(
                /url\("\.\.\/media\/([^"]+)"\)/gu,
            );
            for (const match of mediaPathMatches) {
                const mediaFile = match[1];
                if (!mediaFile) continue;
                const mediaPath = path.join(
                    chunkDir,
                    "..",
                    "media",
                    mediaFile,
                );
                resolvedPaths.add(path.resolve(mediaPath));
            }
        }
    }

    return Array.from(resolvedPaths);
}

async function prepareSubtitleFontsDir(input: {
    workDir: string;
    subtitleFontFamily?: string;
    textOverlayFontFamilies?: string[];
}) {
    const fontFamilies = new Set<string>();
    if (input.subtitleFontFamily && input.subtitleFontFamily.trim()) {
        fontFamilies.add(input.subtitleFontFamily.trim());
    }
    for (const family of input.textOverlayFontFamilies ?? []) {
        if (family && family.trim()) {
            fontFamilies.add(family.trim());
        }
    }
    if (fontFamilies.size === 0) return undefined;

    const fontFiles = new Set<string>();
    const resolvedBundledFamilies = new Set<string>();
    for (const family of fontFamilies) {
        const bundledPath = BUNDLED_SUBTITLE_FONT_FILES[family];
        if (bundledPath) {
            try {
                await access(bundledPath);
                fontFiles.add(bundledPath);
                resolvedBundledFamilies.add(family);
                continue;
            } catch {
                // Continue to fallback/local discovery.
            }
        }
        const fallbackBundledPath = FALLBACK_BUNDLED_SUBTITLE_FONT_FILES[family];
        if (fallbackBundledPath) {
            try {
                await access(fallbackBundledPath);
                fontFiles.add(fallbackBundledPath);
                resolvedBundledFamilies.add(family);
                continue;
            } catch {
                // Continue to dynamic font discovery.
            }
        }
    }
    for (const family of fontFamilies) {
        if (resolvedBundledFamilies.has(family)) {
            // Prefer bundled TTF to avoid libass failures on woff2.
            continue;
        }
        const mediaPaths = await resolveGoogleFontMediaPathsForFamily(family);
        for (const mediaPath of mediaPaths) {
            fontFiles.add(mediaPath);
        }
    }
    if (fontFiles.size === 0) return undefined;

    const fontsDir = path.join(input.workDir, "fonts");
    await mkdir(fontsDir, { recursive: true });
    let copiedFontCount = 0;
    for (const fontFile of fontFiles) {
        const target = path.join(fontsDir, path.basename(fontFile));
        try {
            await copyFile(fontFile, target);
            copiedFontCount += 1;
        } catch {
            // ignore invalid/missing file
        }
    }
    if (copiedFontCount === 0) return undefined;
    return fontsDir;
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
    coverBoxes?: VideoEditInput["coverBoxes"];
    subtitleAssPath?: string;
    subtitleFontsDir?: string;
    textOverlayAssPath?: string;
    shortClip?: VideoEditShortClip;
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

    const coverBoxes = normalizeCoverBoxes(input.coverBoxes);
    if (coverBoxes.length > 0) {
        for (const coverBox of coverBoxes) {
            const nextLabel = `v${step++}`;
            const x = roundFilterNumber(coverBox.region.x / 100);
            const y = roundFilterNumber(coverBox.region.y / 100);
            const width = roundFilterNumber(coverBox.region.width / 100);
            const height = roundFilterNumber(coverBox.region.height / 100);
            const color = coverBox.color.replace(/^#/u, "0x");
            const opacity = roundFilterNumber(coverBox.opacity / 100);

            filters.push(
                `[${currentLabel}]drawbox=x=iw*${x}:y=ih*${y}:w=iw*${width}:h=ih*${height}:color=${color}@${opacity}:t=fill:enable='between(t,${roundFilterNumber(
                    coverBox.timeline.start,
                )},${roundFilterNumber(coverBox.timeline.end)})'[${nextLabel}]`,
            );
            currentLabel = nextLabel;
        }
    }

    if (input.mirror) {
        const nextLabel = `v${step++}`;
        filters.push(`[${currentLabel}]hflip[${nextLabel}]`);
        currentLabel = nextLabel;
    }

    const shortClip = normalizeShortClip(input.shortClip);
    if (shortClip) {
        const nextLabel = `v${step++}`;
        const cropWidth = "min(iw\\,ih*9/16)";
        const cropHeight = "min(ih\\,iw*16/9)";
        filters.push(
            `[${currentLabel}]crop=w='${cropWidth}':h='${cropHeight}':x='(iw-${cropWidth})/2':y='(ih-${cropHeight})/2',scale=1080:1920,setsar=1[${nextLabel}]`,
        );
        currentLabel = nextLabel;
    }

    if (input.subtitleAssPath) {
        const nextLabel = `v${step++}`;
        filters.push(
            `[${currentLabel}]ass='${escapeFfmpegFilterPath(
                input.subtitleAssPath,
            )}'${
                input.subtitleFontsDir
                    ? `:fontsdir='${escapeFfmpegFilterPath(input.subtitleFontsDir)}'`
                    : ""
            }[${nextLabel}]`,
        );
        currentLabel = nextLabel;
    }

    if (input.textOverlayAssPath) {
        const nextLabel = `v${step++}`;
        filters.push(
            `[${currentLabel}]ass='${escapeFfmpegFilterPath(
                input.textOverlayAssPath,
            )}'${
                input.subtitleFontsDir
                    ? `:fontsdir='${escapeFfmpegFilterPath(input.subtitleFontsDir)}'`
                    : ""
            }[${nextLabel}]`,
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
    coverBoxes?: VideoEditInput["coverBoxes"];
    subtitleAssPath?: string;
    subtitleFontsDir?: string;
    textOverlayAssPath?: string;
    shortClip?: VideoEditShortClip;
}) {
    const { filter, outputLabel } = buildVideoEditFilter(input);
    const shortClip = normalizeShortClip(input.shortClip);

    if (!filter) {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_NO_TRANSFORM",
            "At least one video edit transform is required.",
            400,
        );
    }

    return [
        "-y",
        ...(shortClip && shortClip.start > 0
            ? ["-ss", roundFilterNumber(shortClip.start)]
            : []),
        "-i",
        input.videoPath,
        ...(shortClip ? ["-t", roundFilterNumber(shortClip.duration)] : []),
        "-filter_complex",
        filter,
        "-map",
        `[${outputLabel}]`,
        "-map",
        "0:a?",
        "-c:v",
        "libx264",
        "-preset",
        "superfast",
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
    const normalizedCoverBoxes = normalizeCoverBoxes(input.coverBoxes);
    const coverBoxes =
        normalizedCoverBoxes.length > 0 ? input.coverBoxes : undefined;
    const shortClip = normalizeShortClip(input.shortClip);
    const subtitleSegments =
        input.subtitles?.enabled === true ? input.subtitles.segments : [];
    const normalizedTextOverlays = normalizeTextOverlays(input.textOverlays);
    const textOverlayFontFamilies =
        input.textOverlays?.enabled === true
            ? input.textOverlays.overlays.map((item) => item.fontFamily || "")
            : [];
    const workDir = path.join(tmpdir(), `omnivideo-edit-${randomUUID()}`);
    const outputPath = path.join(workDir, "edited.mp4");
    const assPath =
        subtitleSegments.length > 0 ? path.join(workDir, "subtitles.ass") : "";
    const textOverlayAssPath =
        normalizedTextOverlays.length > 0
            ? path.join(workDir, "text-overlays.ass")
            : "";
    const subtitleFontsDir = await prepareSubtitleFontsDir({
        workDir,
        subtitleFontFamily: input.subtitles?.style?.fontFamily,
        textOverlayFontFamilies,
    });

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
        if (textOverlayAssPath && input.textOverlays?.enabled === true) {
            await writeFile(
                textOverlayAssPath,
                buildTextOverlayAssContent(input.textOverlays.overlays, {
                    playResX: input.textOverlays.playResX,
                    playResY: input.textOverlays.playResY,
                }),
            );
        }

        await runFfmpeg(
            buildVideoEditFfmpegArgs({
                videoPath: input.inputPath,
                outputPath,
                mirror,
                blur,
                coverBoxes,
                subtitleAssPath: assPath || undefined,
                subtitleFontsDir,
                textOverlayAssPath: textOverlayAssPath || undefined,
                shortClip: input.shortClip,
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
                coverBox: normalizedCoverBoxes.length > 0,
                subtitleOverlay: subtitleSegments.length > 0,
                segmentCount: subtitleSegments.length,
                textOverlay: normalizedTextOverlays.length > 0,
                textOverlayCount: normalizedTextOverlays.length,
                youtubeShort: Boolean(shortClip),
                ...(shortClip
                    ? { shortClipDurationSeconds: shortClip.duration }
                    : {}),
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
