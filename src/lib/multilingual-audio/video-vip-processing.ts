import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import { runChineseVideoTranscription } from "@/lib/multilingual-audio/chinese-transcription";
import { generateVoiceFromSegments } from "@/lib/multilingual-audio/piper-tts";
import { translateTranscriptSegments } from "@/lib/multilingual-audio/transcript-translation";
import {
    ChineseTranscriptionError,
    type ChineseTranscriptionResult,
    DEFAULT_PIPER_TTS_SETTINGS,
    DEFAULT_TRANSLATION_MODEL,
    type TranscriptTranslationResult,
    type VietnameseVideoMetadataResult,
    type VoiceGenerationResult,
    type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";
import { buildVideoDubbingVoiceSegments } from "@/lib/multilingual-audio/video-dubbing";
import { generateVietnameseVideoMetadata } from "@/lib/multilingual-audio/video-metadata";
import {
    buildSubtitleAssContent,
    buildTextOverlayAssContent,
    type VideoEditInput,
} from "@/lib/video-processing/video-edit-pipeline";

type VipSubtitleStyle = NonNullable<
    Parameters<typeof buildSubtitleAssContent>[1]
>;

type VipStageName =
    | "transcript"
    | "translation"
    | "voice"
    | "render"
    | "metadata";
type VipTranslationMode = "ai" | "import";
type VipRenderPreset = "superfast" | "veryfast";

type VipCheckpointState = {
    fingerprint: string;
    transcript?: ChineseTranscriptionResult;
    translation?: TranscriptTranslationResult;
    voice?: VoiceGenerationResult;
    renderedVideo?: {
        fileName: string;
        mimeType: "video/mp4";
        extension: "mp4";
        byteLength: number;
    };
    metadata?: VietnameseVideoMetadataResult;
    durations?: Partial<VideoVipProcessingResult["stages"]>;
    updatedAt: string;
};

type VipCheckpointFailureInfo = {
    key: string;
    failedStage: VipStageName;
    reusedStages: VipStageName[];
    savedStages: VipStageName[];
    reusableStages: VipStageName[];
};

class VipCheckpointError extends ChineseTranscriptionError {
    readonly manualTranslationPrompt?: unknown;

    constructor(
        error: ChineseTranscriptionError,
        public readonly checkpoint?: VipCheckpointFailureInfo,
    ) {
        super(error.code, error.message, error.status, error.steps);
        this.name = "VipCheckpointError";
        if (
            error &&
            typeof error === "object" &&
            "manualTranslationPrompt" in error
        ) {
            this.manualTranslationPrompt = (
                error as { manualTranslationPrompt?: unknown }
            ).manualTranslationPrompt;
        }
    }
}

type VipStageRunners = {
    transcribe: typeof runChineseVideoTranscription;
    translate: typeof translateTranscriptSegments;
    generateVoice: typeof generateVoiceFromSegments;
    render: typeof renderVipCompositeVideo;
    generateMetadata: typeof generateVietnameseVideoMetadata;
};

export type VideoVipProcessingInput = {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
    fileBytes: Uint8Array;
    language?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    model?: string;
    metadataModel?: string;
    apiKey?: string;
    baseUrl?: string;
    providerName?: string;
    ttsSettings?: Partial<VoiceGenerationSettings>;
    originalAudioVolume?: number;
    voiceVolume?: number;
    videoSpeedFactor?: number;
    renderPreset?: VipRenderPreset;
    mirrorEnabled?: boolean;
    blur?: VideoEditInput["blur"];
    coverBoxes?: VideoEditInput["coverBoxes"];
    subtitleStyle?: VipSubtitleStyle;
    textOverlays?: VideoEditInput["textOverlays"];
    sourceTitle?: string;
    sourceDescription?: string;
    translationMode?: VipTranslationMode;
    importedTranslationLines?: string[];
    metadataApiKey?: string;
    metadataBaseUrl?: string;
    metadataProviderName?: string;
    omitVideoBase64?: boolean;
    checkpointKey?: string;
    checkpointDir?: string;
    stageRunners?: Partial<VipStageRunners>;
};

export type VideoVipProcessingResult = {
    videoBase64?: string;
    videoBytes?: Buffer;
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    transcript: Awaited<ReturnType<typeof runChineseVideoTranscription>>;
    translation: TranscriptTranslationResult;
    voice: {
        mimeType: string;
        extension: string;
        fileName: string;
        byteLength: number;
        segmentCount: number;
        generationDurationMs: number;
        alignment: Awaited<ReturnType<typeof generateVoiceFromSegments>>["alignment"];
        settings: Awaited<ReturnType<typeof generateVoiceFromSegments>>["settings"];
        provider: Awaited<ReturnType<typeof generateVoiceFromSegments>>["provider"];
    };
    metadata: VietnameseVideoMetadataResult;
    stages: {
        preprocessDurationMs: number;
        transcriptionDurationMs: number;
        translationDurationMs: number;
        voiceDurationMs: number;
        muxDurationMs: number;
        finalRenderDurationMs: number;
        metadataDurationMs: number;
    };
    checkpoint?: {
        key: string;
        reusedStages: VipStageName[];
        savedStages: VipStageName[];
    };
};

function normalizeVolume(value: number | undefined, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(2, Math.max(0, value));
}

function normalizeRenderPreset(
    value: string | undefined,
): VipRenderPreset {
    return value === "veryfast" ? "veryfast" : "superfast";
}

function sanitizeOutputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "omnivideo-vip";
    return `${
        base
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 90) || "omnivideo-vip"
    }-vip.mp4`;
}

function hashText(value: string) {
    return createHash("sha256").update(value).digest("hex");
}

function normalizeCheckpointKey(value: string | undefined) {
    const trimmed = value?.trim();
    if (!trimmed) return null;
    return hashText(trimmed);
}

function buildVipCheckpointFingerprint(input: VideoVipProcessingInput) {
    return hashText(
        JSON.stringify({
            fileName: input.fileName,
            fileSizeBytes: input.fileSizeBytes,
            language: input.language,
            sourceLanguage: input.sourceLanguage,
            targetLanguage: input.targetLanguage,
            model: input.model,
            metadataModel: input.metadataModel,
            providerName: input.providerName,
            metadataProviderName: input.metadataProviderName,
            ttsSettings: input.ttsSettings,
            originalAudioVolume: input.originalAudioVolume,
            voiceVolume: input.voiceVolume,
            videoSpeedFactor: input.videoSpeedFactor,
            renderPreset: normalizeRenderPreset(input.renderPreset),
            mirrorEnabled: input.mirrorEnabled,
            blur: input.blur,
            coverBoxes: input.coverBoxes,
            subtitleStyle: input.subtitleStyle,
            textOverlays: input.textOverlays,
            sourceTitle: input.sourceTitle,
            sourceDescription: input.sourceDescription,
            translationMode: input.translationMode ?? "ai",
            importedTranslationLinesHash:
                input.translationMode === "import" &&
                Array.isArray(input.importedTranslationLines)
                    ? hashText(input.importedTranslationLines.join("\n"))
                    : undefined,
        }),
    );
}

function buildImportedTranslationResult(input: {
    transcript: ChineseTranscriptionResult;
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    importedLines?: string[];
}) {
    const importedLines = input.importedLines ?? [];
    if (importedLines.length === 0) {
        const error = new ChineseTranscriptionError(
            "VAL_TRANSLATION_IMPORT_REQUIRED",
            "Imported translation is required after transcript stage.",
            409,
        );
        (
            error as ChineseTranscriptionError & {
                manualTranslationPrompt?: {
                    transcript: ChineseTranscriptionResult;
                    sourceLines: string[];
                    expectedSegmentCount: number;
                    actualSegmentCount: number;
                };
            }
        ).manualTranslationPrompt = {
            transcript: input.transcript,
            sourceLines: input.transcript.segments.map((segment) => segment.text),
            expectedSegmentCount: input.transcript.segments.length,
            actualSegmentCount: importedLines.length,
        };
        throw error;
    }
    if (importedLines.length !== input.transcript.segments.length) {
        const error = new ChineseTranscriptionError(
            "VAL_TRANSLATION_SEGMENT_COUNT_MISMATCH",
            `Imported translation line count ${importedLines.length} does not match transcript segment count ${input.transcript.segments.length}.`,
            422,
        );
        (
            error as ChineseTranscriptionError & {
                manualTranslationPrompt?: {
                    transcript: ChineseTranscriptionResult;
                    sourceLines: string[];
                    expectedSegmentCount: number;
                    actualSegmentCount: number;
                };
            }
        ).manualTranslationPrompt = {
            transcript: input.transcript,
            sourceLines: input.transcript.segments.map((segment) => segment.text),
            expectedSegmentCount: input.transcript.segments.length,
            actualSegmentCount: importedLines.length,
        };
        throw error;
    }

    return {
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage,
        model: input.model,
        translatedSegments: input.transcript.segments.map((segment, index) => ({
            id: segment.id,
            start: segment.start,
            end: segment.end,
            sourceText: segment.text,
            translatedText: importedLines[index] ?? "",
        })),
        generationDurationMs: 0,
        chunks: [
            {
                index: 0,
                segmentCount: importedLines.length,
            },
        ],
        provider: {
            name: "manual-import",
            requestId: undefined,
        },
    } satisfies TranscriptTranslationResult;
}

function resolveVipCheckpointPaths(input: VideoVipProcessingInput) {
    const key = normalizeCheckpointKey(input.checkpointKey);
    if (!key) return null;
    const rootDir =
        input.checkpointDir ??
        path.join(tmpdir(), "omnivideo-vip-stage-checkpoints");
    const dir = path.join(rootDir, key);
    return {
        key,
        dir,
        jsonPath: path.join(dir, "checkpoint.json"),
        videoPath: path.join(dir, "rendered.mp4"),
    };
}

async function readVipCheckpoint(input: VideoVipProcessingInput) {
    const paths = resolveVipCheckpointPaths(input);
    if (!paths) return { paths: null, state: null };

    try {
        const raw = await readFile(paths.jsonPath, "utf8");
        const parsed = JSON.parse(raw) as VipCheckpointState;
        if (parsed.fingerprint !== buildVipCheckpointFingerprint(input)) {
            return { paths, state: null };
        }
        return { paths, state: parsed };
    } catch {
        return { paths, state: null };
    }
}

async function writeVipCheckpoint(input: {
    paths: NonNullable<ReturnType<typeof resolveVipCheckpointPaths>>;
    state: VipCheckpointState;
}) {
    await mkdir(input.paths.dir, { recursive: true });
    await writeFile(
        input.paths.jsonPath,
        JSON.stringify(
            { ...input.state, updatedAt: new Date().toISOString() },
            null,
            2,
        ),
    );
}

function buildEmptyCheckpointState(input: VideoVipProcessingInput): VipCheckpointState {
    return {
        fingerprint: buildVipCheckpointFingerprint(input),
        durations: {},
        updatedAt: new Date().toISOString(),
    };
}

function uniqueStages(stages: VipStageName[]) {
    return Array.from(new Set(stages));
}

function summarizeVipError(error: unknown) {
    if (error instanceof ChineseTranscriptionError) {
        return {
            name: error.name,
            code: error.code,
            status: error.status,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 4).join("\n"),
        };
    }
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack?.split("\n").slice(0, 4).join("\n"),
        };
    }
    return { message: String(error) };
}

function getVipProviderHost(baseUrl: string | undefined) {
    if (!baseUrl) return "default";
    try {
        return new URL(baseUrl).host;
    } catch {
        return "invalid-url";
    }
}

function logVipEvent(
    runId: string,
    event: string,
    data: Record<string, unknown> = {},
) {
    console.log("[VIP]", {
        runId,
        event,
        ...data,
    });
}

function getReusableCheckpointStages(state: VipCheckpointState) {
    const stages: VipStageName[] = [];
    if (state.transcript) stages.push("transcript");
    if (state.translation) stages.push("translation");
    if (state.voice) stages.push("voice");
    if (state.renderedVideo) stages.push("render");
    if (state.metadata) stages.push("metadata");
    return stages;
}

function buildVipCheckpointFailureInfo(input: {
    paths: NonNullable<ReturnType<typeof resolveVipCheckpointPaths>> | null;
    state: VipCheckpointState;
    reusedStages: VipStageName[];
    savedStages: VipStageName[];
    failedStage: VipStageName;
}): VipCheckpointFailureInfo | undefined {
    if (!input.paths) return undefined;
    return {
        key: input.paths.key,
        failedStage: input.failedStage,
        reusedStages: uniqueStages(input.reusedStages),
        savedStages: uniqueStages(input.savedStages),
        reusableStages: getReusableCheckpointStages(input.state),
    };
}

function toVipCheckpointError(input: {
    error: unknown;
    paths: NonNullable<ReturnType<typeof resolveVipCheckpointPaths>> | null;
    state: VipCheckpointState;
    reusedStages: VipStageName[];
    savedStages: VipStageName[];
    failedStage: VipStageName;
}) {
    const checkpoint = buildVipCheckpointFailureInfo(input);
    if (input.error instanceof ChineseTranscriptionError) {
        return new VipCheckpointError(input.error, checkpoint);
    }
    const error = new ChineseTranscriptionError(
        "SYS_DUBBING_MUX_FAILED",
        input.error instanceof Error
            ? input.error.message
            : "VIP processing stage failed.",
        500,
    );
    return new VipCheckpointError(error, checkpoint);
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

function normalizeBlurRegions(
    blur: VideoEditInput["blur"] | undefined,
): Array<{
    region: { x: number; y: number; width: number; height: number };
    timeline: { start: number; end: number };
    strength: number;
}> {
    if (!blur?.enabled) return [];

    const regions = Array.isArray(blur.regions)
        ? blur.regions
        : blur.region && blur.timeline
          ? [
                {
                    region: blur.region,
                    timeline: blur.timeline,
                    strength: blur.strength ?? 50,
                },
            ]
          : [];

    return regions.filter((item) => {
        const { region, timeline, strength } = item;
        return (
            Number.isFinite(region.x) &&
            Number.isFinite(region.y) &&
            Number.isFinite(region.width) &&
            Number.isFinite(region.height) &&
            Number.isFinite(timeline.start) &&
            Number.isFinite(timeline.end) &&
            Number.isFinite(strength)
        );
    });
}

function normalizeCoverBoxes(
    coverBoxes: VideoEditInput["coverBoxes"] | undefined,
): Array<{
    region: { x: number; y: number; width: number; height: number };
    timeline: { start: number; end: number };
    color: string;
    opacity: number;
}> {
    if (!coverBoxes?.enabled) return [];
    const defaultColor =
        typeof coverBoxes.color === "string" && /^#[0-9a-fA-F]{6}$/u.test(coverBoxes.color)
            ? coverBoxes.color
            : "#000000";
    const defaultOpacity = Number.isFinite(coverBoxes.opacity)
        ? Math.min(100, Math.max(0, Math.round(coverBoxes.opacity ?? 65)))
        : 65;
    const regions = Array.isArray(coverBoxes.regions)
        ? coverBoxes.regions
        : coverBoxes.region && coverBoxes.timeline
          ? [
                {
                    region: coverBoxes.region,
                    timeline: coverBoxes.timeline,
                    color: coverBoxes.color,
                    opacity: coverBoxes.opacity,
                },
            ]
          : [];

    return regions
        .map((item) => ({
            region: {
                x: Number(item.region.x),
                y: Number(item.region.y),
                width: Number(item.region.width),
                height: Number(item.region.height),
            },
            timeline: {
                start: Number(item.timeline.start),
                end: Number(item.timeline.end),
            },
            color:
                typeof item.color === "string" &&
                /^#[0-9a-fA-F]{6}$/u.test(item.color)
                    ? item.color
                    : defaultColor,
            opacity: Number.isFinite(item.opacity)
                ? Math.min(100, Math.max(0, Math.round(item.opacity ?? 65)))
                : defaultOpacity,
        }))
        .filter(
            (item) =>
                Number.isFinite(item.region.x) &&
                Number.isFinite(item.region.y) &&
                Number.isFinite(item.region.width) &&
                Number.isFinite(item.region.height) &&
                Number.isFinite(item.timeline.start) &&
                Number.isFinite(item.timeline.end) &&
                item.region.width > 0 &&
                item.region.height > 0 &&
                item.timeline.end > item.timeline.start,
        );
}

export function buildVipFinalRenderArgs(input: {
    videoPath: string;
    voicePath: string;
    subtitleAssPath: string;
    textOverlayAssPath?: string;
    outputPath: string;
    speedFactor: number;
    mirrorEnabled: boolean;
    blurRegions: ReturnType<typeof normalizeBlurRegions>;
    coverBoxes?: ReturnType<typeof normalizeCoverBoxes>;
    originalAudioVolume: number;
    voiceVolume: number;
    renderPreset?: VipRenderPreset;
}) {
    const clampedSpeed = Math.min(2, Math.max(0.5, input.speedFactor || 1));
    const videoFilters: string[] = [];
    if (Math.abs(clampedSpeed - 1) >= 0.0001) {
        videoFilters.push(
            `setpts=${(1 / clampedSpeed).toFixed(6).replace(/\.?0+$/u, "")}*PTS`,
        );
    }

    const videoEditChains: string[] = [];
    const blurRegions = input.blurRegions;
    let currentVideoLabel = "basev";
    blurRegions.forEach((item, index) => {
        const prev = currentVideoLabel;
        const splitBase = `blurbase${index}`;
        const splitCrop = `blurcrop${index}`;
        const blurLabel = `blur${index}`;
        const next = `vblur${index}`;
        const xExpr = `(iw*${(item.region.x / 100).toFixed(6)})`;
        const yExpr = `(ih*${(item.region.y / 100).toFixed(6)})`;
        const wExpr = `(iw*${(item.region.width / 100).toFixed(6)})`;
        const hExpr = `(ih*${(item.region.height / 100).toFixed(6)})`;
        const lumaRadius = Math.max(1, Math.round(item.strength / 3));
        const adaptiveLumaRadius = `min(${lumaRadius}\\,min(w\\,h)/2-1)`;
        const adaptiveChromaRadius = `min(${lumaRadius}\\,min(cw\\,ch)/2-1)`;
        videoEditChains.push(
            `[${prev}]split[${splitBase}][${splitCrop}]`,
            `[${splitCrop}]crop=w=${wExpr}:h=${hExpr}:x=${xExpr}:y=${yExpr},boxblur=luma_radius=${adaptiveLumaRadius}:luma_power=1:chroma_radius=${adaptiveChromaRadius}:chroma_power=1[${blurLabel}]`,
            `[${splitBase}][${blurLabel}]overlay=x=main_w*${(item.region.x / 100).toFixed(6)}:y=main_h*${(item.region.y / 100).toFixed(6)}:enable='between(t,${item.timeline.start.toFixed(3)},${item.timeline.end.toFixed(3)})'[${next}]`,
        );
        currentVideoLabel = next;
    });

    const coverBoxes = input.coverBoxes ?? [];
    coverBoxes.forEach((item, index) => {
        const next = `vcover${index}`;
        const color = item.color.replace(/^#/u, "0x");
        const opacity = Math.min(1, Math.max(0, item.opacity / 100))
            .toFixed(4)
            .replace(/\.?0+$/u, "");
        videoEditChains.push(
            `[${currentVideoLabel}]drawbox=x=iw*${(item.region.x / 100).toFixed(6)}:y=ih*${(item.region.y / 100).toFixed(6)}:w=iw*${(item.region.width / 100).toFixed(6)}:h=ih*${(item.region.height / 100).toFixed(6)}:color=${color}@${opacity || "0"}:t=fill:enable='between(t,${item.timeline.start.toFixed(3)},${item.timeline.end.toFixed(3)})'[${next}]`,
        );
        currentVideoLabel = next;
    });

    const escapeFilterPath = (filePath: string) =>
        filePath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\\\'");
    const escapedSubtitlePath = escapeFilterPath(input.subtitleAssPath);
    const escapedTextOverlayPath = input.textOverlayAssPath
        ? escapeFilterPath(input.textOverlayAssPath)
        : "";

    const atempo = buildAtempoFilters(clampedSpeed).join(",");
    const audioBase = atempo
        ? `[0:a]${atempo},volume=${input.originalAudioVolume.toFixed(3)}[orig]`
        : `[0:a]volume=${input.originalAudioVolume.toFixed(3)}[orig]`;

    const videoChain =
        videoFilters.length > 0 ? videoFilters.join(",") : "null";
    const mirroredVideoLabel = "mirroredv";
    if (input.mirrorEnabled) {
        videoEditChains.push(`[${currentVideoLabel}]hflip[${mirroredVideoLabel}]`);
        currentVideoLabel = mirroredVideoLabel;
    }
    videoEditChains.push(`[${currentVideoLabel}]ass='${escapedSubtitlePath}'[subv]`);
    currentVideoLabel = "subv";
    if (escapedTextOverlayPath) {
        videoEditChains.push(
            `[${currentVideoLabel}]ass='${escapedTextOverlayPath}'[vout]`,
        );
    } else {
        videoEditChains.push(`[${currentVideoLabel}]null[vout]`);
    }

    const filterParts = [
        `[0:v]${videoChain}[basev]`,
        ...videoEditChains,
        audioBase,
        `[1:a]volume=${input.voiceVolume.toFixed(3)}[voice]`,
        `[orig][voice]amix=inputs=2:duration=longest:dropout_transition=0[aout]`,
    ];
    const renderPreset = normalizeRenderPreset(input.renderPreset);

    return [
        "-y",
        "-i",
        input.videoPath,
        "-i",
        input.voicePath,
        "-filter_complex",
        filterParts.join(";"),
        "-map",
        "[vout]",
        "-map",
        "[aout]",
        "-c:v",
        "libx264",
        "-preset",
        renderPreset,
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-shortest",
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
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => reject(error));
        child.on("close", (code) => {
            if (code === 0) {
                resolve();
                return;
            }
            const lines = stderr
                .split(/\r?\n/u)
                .map((line) => line.trim())
                .filter(Boolean);
            const concise =
                lines
                    .slice()
                    .reverse()
                    .find(
                        (line) =>
                            /Error|Invalid|Option not found|Failed|No such filter/iu.test(
                                line,
                            ),
                    ) ??
                lines.at(-1) ??
                `ffmpeg exited with code ${code}`;
            reject(new Error(concise));
        });
    });
}

async function probeVideoDimensions(inputPath: string) {
    const ffmpegPath = resolveFfmpegPath();
    return await new Promise<{ width: number; height: number } | null>(
        (resolve) => {
            const child = spawn(
                ffmpegPath,
                ["-hide_banner", "-i", inputPath],
                {
                    stdio: ["ignore", "ignore", "pipe"],
                },
            );
            let stderr = "";

            child.stderr?.on("data", (chunk) => {
                stderr += chunk.toString();
            });
            child.on("error", () => resolve(null));
            child.on("close", () => {
                const match = /Video:\s.*?(\d{2,5})x(\d{2,5})(?:[,\s]|$)/u.exec(
                    stderr,
                );
                if (!match) {
                    resolve(null);
                    return;
                }
                const width = Number(match[1]);
                const height = Number(match[2]);
                if (!Number.isFinite(width) || !Number.isFinite(height)) {
                    resolve(null);
                    return;
                }
                const rotationMatch =
                    /rotation of\s+(-?\d+(?:\.\d+)?)\s+degrees/iu.exec(
                        stderr,
                    ) ?? /rotate\s*:\s*(-?\d+(?:\.\d+)?)/iu.exec(stderr);
                const rotation = rotationMatch ? Number(rotationMatch[1]) : 0;
                const normalizedRotation = Math.abs(
                    Math.round(rotation) % 180,
                );
                if (normalizedRotation === 90) {
                    resolve({ width: height, height: width });
                    return;
                }
                resolve({ width, height });
            });
        },
    );
}

async function renderVipCompositeVideo(input: {
    sourceVideoBytes: Uint8Array;
    sourceFileName: string;
    voiceBytes: Buffer;
    translatedSegments: TranscriptTranslationResult["translatedSegments"];
    speedFactor: number;
    mirrorEnabled: boolean;
    blur: VideoEditInput["blur"];
    coverBoxes?: VideoEditInput["coverBoxes"];
    subtitleStyle: VipSubtitleStyle | undefined;
    textOverlays?: VideoEditInput["textOverlays"];
    originalAudioVolume: number;
    voiceVolume: number;
    renderPreset?: VipRenderPreset;
}) {
    const workDir = path.join(tmpdir(), `omnivideo-vip-${randomUUID()}`);
    const inputPath = path.join(workDir, "source.mp4");
    const voicePath = path.join(workDir, "voice.wav");
    const assPath = path.join(workDir, "subtitles.ass");
    const textOverlayAssPath =
        input.textOverlays?.enabled === true &&
        input.textOverlays.overlays.length > 0
            ? path.join(workDir, "text-overlays.ass")
            : "";
    const outputPath = path.join(workDir, "vip.mp4");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.sourceVideoBytes);
        await writeFile(voicePath, input.voiceBytes);
        const probedDimensions = await probeVideoDimensions(inputPath);
        await writeFile(
            assPath,
            buildSubtitleAssContent(input.translatedSegments, {
                ...input.subtitleStyle,
                playResX: probedDimensions?.width,
                playResY: probedDimensions?.height,
            }),
        );
        if (textOverlayAssPath && input.textOverlays?.enabled === true) {
            await writeFile(
                textOverlayAssPath,
                buildTextOverlayAssContent(input.textOverlays.overlays, {
                    playResX: probedDimensions?.width,
                    playResY: probedDimensions?.height,
                }),
            );
        }

        await runFfmpeg(
            buildVipFinalRenderArgs({
                videoPath: inputPath,
                voicePath,
                subtitleAssPath: assPath,
                textOverlayAssPath: textOverlayAssPath || undefined,
                outputPath,
                speedFactor: input.speedFactor,
                mirrorEnabled: input.mirrorEnabled,
                blurRegions: normalizeBlurRegions(input.blur),
                coverBoxes: normalizeCoverBoxes(input.coverBoxes),
                originalAudioVolume: input.originalAudioVolume,
                voiceVolume: input.voiceVolume,
                renderPreset: input.renderPreset,
            }),
        );

        return await readFile(outputPath);
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            error instanceof Error
                ? `VIP render failed: ${error.message}`
                : "VIP render failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export async function runVideoVipProcessing(
    input: VideoVipProcessingInput,
): Promise<VideoVipProcessingResult> {
    const startedAt = Date.now();
    const runId = randomUUID();
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "A source video file is required for VIP processing.",
            400,
        );
    }

    const translationMode = input.translationMode ?? "ai";
    const clampedSpeed = Math.min(2, Math.max(0.5, input.videoSpeedFactor ?? 1));
    const renderPreset = normalizeRenderPreset(input.renderPreset);
    logVipEvent(runId, "run-start", {
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileBytes.byteLength,
        language: input.language ?? "zh",
        sourceLanguage: input.sourceLanguage,
        targetLanguage: input.targetLanguage ?? "vi",
        translationProvider: input.providerName ?? "default",
        translationProviderHost: getVipProviderHost(input.baseUrl),
        translationModel: input.model ?? DEFAULT_TRANSLATION_MODEL,
        translationMode,
        metadataProvider: input.metadataProviderName ?? input.providerName ?? "default",
        metadataProviderHost: getVipProviderHost(input.metadataBaseUrl ?? input.baseUrl),
        metadataModel: input.metadataModel ?? input.model ?? DEFAULT_TRANSLATION_MODEL,
        speedFactor: clampedSpeed,
        renderPreset,
        originalAudioVolume: normalizeVolume(input.originalAudioVolume, 0),
        voiceVolume: normalizeVolume(input.voiceVolume, 1),
        checkpointEnabled: Boolean(input.checkpointKey),
    });
    const runners: VipStageRunners = {
        transcribe: input.stageRunners?.transcribe ?? runChineseVideoTranscription,
        translate: input.stageRunners?.translate ?? translateTranscriptSegments,
        generateVoice: input.stageRunners?.generateVoice ?? generateVoiceFromSegments,
        render: input.stageRunners?.render ?? renderVipCompositeVideo,
        generateMetadata:
            input.stageRunners?.generateMetadata ?? generateVietnameseVideoMetadata,
    };
    const checkpoint = await readVipCheckpoint(input);
    const checkpointPaths = checkpoint.paths;
    let checkpointState =
        checkpoint.state ?? buildEmptyCheckpointState(input);
    logVipEvent(runId, "checkpoint-read", {
        checkpointEnabled: Boolean(checkpointPaths),
        checkpointKey: checkpointPaths?.key,
        reusableStages: getReusableCheckpointStages(checkpointState),
        checkpointHit: Boolean(checkpoint.state),
    });
    const reusedStages: VipStageName[] = [];
    const savedStages: VipStageName[] = [];
    const saveCheckpoint = async (stage: VipStageName) => {
        if (!checkpointPaths) return;
        await writeVipCheckpoint({
            paths: checkpointPaths,
            state: checkpointState,
        });
        savedStages.push(stage);
        logVipEvent(runId, "checkpoint-saved", {
            stage,
            savedStages: uniqueStages(savedStages),
            reusableStages: getReusableCheckpointStages(checkpointState),
            checkpointKey: checkpointPaths.key,
        });
    };

    const preprocessStartedAt = Date.now();
    // VIP path keeps preprocess lightweight: only affect transcript audio timing,
    // defer video speed transform to final composite render.
    const preprocessDurationMs =
        checkpointState.durations?.preprocessDurationMs ??
        Date.now() - preprocessStartedAt;
    logVipEvent(runId, "stage-success", {
        stage: "preprocess",
        durationMs: preprocessDurationMs,
        note: "VIP preprocess is lightweight; speed is applied to transcription timing and final render.",
    });

    const transcriptionStartedAt = Date.now();
    logVipEvent(runId, "stage-start", {
        stage: "transcript",
        reused: Boolean(checkpointState.transcript),
        fileSizeBytes: input.fileBytes.byteLength,
        language: input.language ?? "zh",
        speedFactor: clampedSpeed,
    });
    const transcript =
        checkpointState.transcript ??
        (await (async () => {
            try {
                return await runners.transcribe({
                    fileName: input.fileName,
                    mimeType: input.mimeType,
                    fileSizeBytes: input.fileBytes.byteLength,
                    fileBytes: input.fileBytes,
                    language: input.language,
                    includeWordTimestamps: true,
                    overlongSegmentRetryMode: "best-effort",
                    videoSpeedFactor: clampedSpeed,
                });
            } catch (error) {
                logVipEvent(runId, "stage-failed", {
                    stage: "transcript",
                    durationMs: Date.now() - transcriptionStartedAt,
                    error: summarizeVipError(error),
                });
                throw toVipCheckpointError({
                    error,
                    paths: checkpointPaths,
                    state: checkpointState,
                    reusedStages,
                    savedStages,
                    failedStage: "transcript",
                });
            }
        })());
    const transcriptionDurationMs =
        checkpointState.durations?.transcriptionDurationMs ??
        Date.now() - transcriptionStartedAt;
    if (checkpointState.transcript) {
        reusedStages.push("transcript");
        logVipEvent(runId, "stage-reused", {
            stage: "transcript",
            segmentCount: transcript.segments.length,
            wordCount: transcript.words.length,
            durationMs: transcriptionDurationMs,
        });
    } else {
        checkpointState = {
            ...checkpointState,
            transcript,
            durations: {
                ...checkpointState.durations,
                preprocessDurationMs,
                transcriptionDurationMs,
            },
        };
        await saveCheckpoint("transcript");
        logVipEvent(runId, "stage-success", {
            stage: "transcript",
            segmentCount: transcript.segments.length,
            wordCount: transcript.words.length,
            transcriptChars: transcript.text.length,
            audioFileSizeBytes: transcript.audio.fileSizeBytes,
            durationMs: transcriptionDurationMs,
        });
    }

    const translationStartedAt = Date.now();
    logVipEvent(runId, "stage-start", {
        stage: "translation",
        reused: Boolean(checkpointState.translation),
        mode: translationMode,
        segmentCount: transcript.segments.length,
        provider: input.providerName ?? "default",
        providerHost: getVipProviderHost(input.baseUrl),
        model: input.model ?? DEFAULT_TRANSLATION_MODEL,
        sourceLanguage: input.sourceLanguage ?? transcript.language,
        targetLanguage: input.targetLanguage ?? "vi",
    });
    const translation =
        checkpointState.translation ??
        (await (async () => {
            try {
                if (translationMode === "import") {
                    return buildImportedTranslationResult({
                        transcript,
                        sourceLanguage: input.sourceLanguage ?? transcript.language,
                        targetLanguage: input.targetLanguage ?? "vi",
                        model: input.model ?? DEFAULT_TRANSLATION_MODEL,
                        importedLines: input.importedTranslationLines,
                    });
                }
                return await runners.translate({
                    segments: transcript.segments,
                    sourceLanguage: input.sourceLanguage ?? transcript.language,
                    targetLanguage: input.targetLanguage ?? "vi",
                    model: input.model ?? DEFAULT_TRANSLATION_MODEL,
                    apiKey: input.apiKey,
                    baseUrl: input.baseUrl,
                    providerName: input.providerName,
                });
            } catch (error) {
                logVipEvent(runId, "stage-failed", {
                    stage: "translation",
                    durationMs: Date.now() - translationStartedAt,
                    segmentCount: transcript.segments.length,
                    provider: input.providerName ?? "default",
                    providerHost: getVipProviderHost(input.baseUrl),
                    model: input.model ?? DEFAULT_TRANSLATION_MODEL,
                    error: summarizeVipError(error),
                });
                throw toVipCheckpointError({
                    error,
                    paths: checkpointPaths,
                    state: checkpointState,
                    reusedStages,
                    savedStages,
                    failedStage: "translation",
                });
            }
        })());
    const translationDurationMs =
        checkpointState.durations?.translationDurationMs ??
        Date.now() - translationStartedAt;
    if (checkpointState.translation) {
        reusedStages.push("translation");
        logVipEvent(runId, "stage-reused", {
            stage: "translation",
            translatedCount: translation.translatedSegments.length,
            chunkCount: translation.chunks.length,
            provider: translation.provider.name,
            requestId: translation.provider.requestId,
            durationMs: translationDurationMs,
        });
    } else {
        checkpointState = {
            ...checkpointState,
            translation,
            durations: {
                ...checkpointState.durations,
                translationDurationMs,
            },
        };
        await saveCheckpoint("translation");
        logVipEvent(runId, "stage-success", {
            stage: "translation",
            translatedCount: translation.translatedSegments.length,
            chunkCount: translation.chunks.length,
            provider: translation.provider.name,
            requestId: translation.provider.requestId,
            totalTokensUsed: "totalTokensUsed" in translation
                ? translation.totalTokensUsed
                : undefined,
            durationMs: translationDurationMs,
        });
    }

    const voiceStartedAt = Date.now();
    const voiceInputSegments = buildVideoDubbingVoiceSegments({
        transcript,
        translation,
    });
    logVipEvent(runId, "stage-start", {
        stage: "voice",
        reused: Boolean(checkpointState.voice),
        segmentCount: voiceInputSegments.length,
        alignmentMode:
            input.ttsSettings?.alignmentMode ??
            DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
        binaryPath: input.ttsSettings?.binaryPath ?? DEFAULT_PIPER_TTS_SETTINGS.binaryPath,
        modelPath: input.ttsSettings?.modelPath ?? DEFAULT_PIPER_TTS_SETTINGS.modelPath,
    });
    const voice =
        checkpointState.voice ??
        (await (async () => {
            try {
                return await runners.generateVoice({
                    segments: voiceInputSegments,
                    settings: {
                        ...DEFAULT_PIPER_TTS_SETTINGS,
                        ...input.ttsSettings,
                        preserveTimestampGaps:
                            input.ttsSettings?.preserveTimestampGaps ??
                            DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps,
                    },
                });
            } catch (error) {
                logVipEvent(runId, "stage-failed", {
                    stage: "voice",
                    durationMs: Date.now() - voiceStartedAt,
                    segmentCount: voiceInputSegments.length,
                    error: summarizeVipError(error),
                });
                throw toVipCheckpointError({
                    error,
                    paths: checkpointPaths,
                    state: checkpointState,
                    reusedStages,
                    savedStages,
                    failedStage: "voice",
                });
            }
        })());
    const voiceDurationMs =
        checkpointState.durations?.voiceDurationMs ??
        Date.now() - voiceStartedAt;
    if (checkpointState.voice) {
        reusedStages.push("voice");
        logVipEvent(runId, "stage-reused", {
            stage: "voice",
            segmentCount: voice.segmentCount,
            byteLength: voice.byteLength,
            alignmentMode: voice.alignment.mode,
            durationMs: voiceDurationMs,
        });
    } else {
        checkpointState = {
            ...checkpointState,
            voice,
            durations: {
                ...checkpointState.durations,
                voiceDurationMs,
            },
        };
        await saveCheckpoint("voice");
        logVipEvent(runId, "stage-success", {
            stage: "voice",
            segmentCount: voice.segmentCount,
            byteLength: voice.byteLength,
            alignmentMode: voice.alignment.mode,
            durationMs: voiceDurationMs,
        });
    }

    const originalAudioVolume = normalizeVolume(input.originalAudioVolume, 0);
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);

    const finalRenderStartedAt = Date.now();
    let videoBytes: Buffer;
    logVipEvent(runId, "stage-start", {
        stage: "render",
        reused: Boolean(checkpointState.renderedVideo),
        sourceFileSizeBytes: input.fileBytes.byteLength,
        voiceByteLength: voice.byteLength,
        translatedCount: translation.translatedSegments.length,
        speedFactor: clampedSpeed,
        mirrorEnabled: input.mirrorEnabled === true,
        blurEnabled: input.blur?.enabled === true,
        coverBoxEnabled: input.coverBoxes?.enabled === true,
        textOverlayEnabled: input.textOverlays?.enabled === true,
        renderPreset,
        originalAudioVolume,
        voiceVolume,
    });
    if (checkpointState.renderedVideo && checkpointPaths) {
        try {
            videoBytes = await readFile(checkpointPaths.videoPath);
            reusedStages.push("render");
            logVipEvent(runId, "stage-reused", {
                stage: "render",
                byteLength: videoBytes.byteLength,
                checkpointVideoPath: checkpointPaths.videoPath,
                durationMs: Date.now() - finalRenderStartedAt,
            });
        } catch {
            logVipEvent(runId, "checkpoint-render-missing", {
                stage: "render",
                checkpointVideoPath: checkpointPaths.videoPath,
                action: "rerender",
            });
            checkpointState = {
                ...checkpointState,
                renderedVideo: undefined,
            };
            try {
                videoBytes = await runners.render({
                    sourceVideoBytes: input.fileBytes,
                    sourceFileName: input.fileName,
                    voiceBytes: Buffer.from(voice.audioBase64, "base64"),
                    translatedSegments: translation.translatedSegments,
                    speedFactor: clampedSpeed,
                    mirrorEnabled: input.mirrorEnabled === true,
                    blur: input.blur,
                    coverBoxes: input.coverBoxes,
                    subtitleStyle: input.subtitleStyle,
                    textOverlays: input.textOverlays,
                    originalAudioVolume,
                    voiceVolume,
                    renderPreset,
                });
            } catch (error) {
                logVipEvent(runId, "stage-failed", {
                    stage: "render",
                    durationMs: Date.now() - finalRenderStartedAt,
                    error: summarizeVipError(error),
                });
                throw toVipCheckpointError({
                    error,
                    paths: checkpointPaths,
                    state: checkpointState,
                    reusedStages,
                    savedStages,
                    failedStage: "render",
                });
            }
        }
    } else {
        try {
            videoBytes = await runners.render({
                sourceVideoBytes: input.fileBytes,
                sourceFileName: input.fileName,
                voiceBytes: Buffer.from(voice.audioBase64, "base64"),
                translatedSegments: translation.translatedSegments,
                speedFactor: clampedSpeed,
                mirrorEnabled: input.mirrorEnabled === true,
                blur: input.blur,
                coverBoxes: input.coverBoxes,
                subtitleStyle: input.subtitleStyle,
                textOverlays: input.textOverlays,
                originalAudioVolume,
                voiceVolume,
                renderPreset,
            });
        } catch (error) {
            logVipEvent(runId, "stage-failed", {
                stage: "render",
                durationMs: Date.now() - finalRenderStartedAt,
                error: summarizeVipError(error),
            });
            throw toVipCheckpointError({
                error,
                paths: checkpointPaths,
                state: checkpointState,
                reusedStages,
                savedStages,
                failedStage: "render",
            });
        }
    }
    const finalRenderDurationMs =
        checkpointState.durations?.finalRenderDurationMs ??
        Date.now() - finalRenderStartedAt;
    if (!checkpointState.renderedVideo) {
        if (checkpointPaths) {
            await mkdir(checkpointPaths.dir, { recursive: true });
            await writeFile(checkpointPaths.videoPath, videoBytes);
        }
        checkpointState = {
            ...checkpointState,
            renderedVideo: {
                fileName: sanitizeOutputName(input.fileName),
                mimeType: "video/mp4",
                extension: "mp4",
                byteLength: videoBytes.byteLength,
            },
            durations: {
                ...checkpointState.durations,
                finalRenderDurationMs,
            },
        };
        await saveCheckpoint("render");
        logVipEvent(runId, "stage-success", {
            stage: "render",
            byteLength: videoBytes.byteLength,
            durationMs: finalRenderDurationMs,
        });
    }

    const metadataStartedAt = Date.now();
    logVipEvent(runId, "stage-start", {
        stage: "metadata",
        reused: Boolean(checkpointState.metadata),
        translatedCount: translation.translatedSegments.length,
        provider: input.metadataProviderName ?? input.providerName ?? "default",
        providerHost: getVipProviderHost(input.metadataBaseUrl ?? input.baseUrl),
        model: input.metadataModel ?? input.model ?? DEFAULT_TRANSLATION_MODEL,
    });
    const metadata =
        checkpointState.metadata ??
        (await (async () => {
            try {
                return await runners.generateMetadata({
                    translatedSegments: translation.translatedSegments,
                    sourceTitle: input.sourceTitle,
                    sourceDescription: input.sourceDescription,
                    model: input.metadataModel ?? input.model ?? DEFAULT_TRANSLATION_MODEL,
                    apiKey: input.metadataApiKey ?? input.apiKey,
                    baseUrl: input.metadataBaseUrl ?? input.baseUrl,
                    providerName: input.metadataProviderName ?? input.providerName,
                });
            } catch (error) {
                logVipEvent(runId, "stage-failed", {
                    stage: "metadata",
                    durationMs: Date.now() - metadataStartedAt,
                    provider: input.metadataProviderName ?? input.providerName ?? "default",
                    providerHost: getVipProviderHost(input.metadataBaseUrl ?? input.baseUrl),
                    model: input.metadataModel ?? input.model ?? DEFAULT_TRANSLATION_MODEL,
                    error: summarizeVipError(error),
                });
                throw toVipCheckpointError({
                    error,
                    paths: checkpointPaths,
                    state: checkpointState,
                    reusedStages,
                    savedStages,
                    failedStage: "metadata",
                });
            }
        })());
    const metadataDurationMs =
        checkpointState.durations?.metadataDurationMs ??
        Date.now() - metadataStartedAt;
    if (checkpointState.metadata) {
        reusedStages.push("metadata");
        logVipEvent(runId, "stage-reused", {
            stage: "metadata",
            title: metadata.title,
            hashtagCount: metadata.hashtags.length,
            durationMs: metadataDurationMs,
        });
    } else {
        checkpointState = {
            ...checkpointState,
            metadata,
            durations: {
                ...checkpointState.durations,
                metadataDurationMs,
            },
        };
        await saveCheckpoint("metadata");
        logVipEvent(runId, "stage-success", {
            stage: "metadata",
            title: metadata.title,
            hashtagCount: metadata.hashtags.length,
            durationMs: metadataDurationMs,
        });
    }

    logVipEvent(runId, "run-success", {
        totalDurationMs: Date.now() - startedAt,
        reusedStages: uniqueStages(reusedStages),
        savedStages: uniqueStages(savedStages),
        outputFileName: sanitizeOutputName(input.fileName),
        outputByteLength: videoBytes.byteLength,
    });

    return {
        ...(input.omitVideoBase64
            ? { videoBytes }
            : { videoBase64: videoBytes.toString("base64") }),
        mimeType: "video/mp4",
        extension: "mp4",
        fileName: sanitizeOutputName(input.fileName),
        byteLength: videoBytes.byteLength,
        generationDurationMs: Date.now() - startedAt,
        transcript,
        translation,
        voice: {
            mimeType: voice.mimeType,
            extension: voice.extension,
            fileName: voice.fileName,
            byteLength: voice.byteLength,
            segmentCount: voice.segmentCount,
            generationDurationMs: voice.generationDurationMs,
            alignment: voice.alignment,
            settings: voice.settings,
            provider: voice.provider,
        },
        metadata,
        stages: {
            preprocessDurationMs,
            transcriptionDurationMs,
            translationDurationMs,
            voiceDurationMs,
            muxDurationMs: 0,
            finalRenderDurationMs,
            metadataDurationMs,
        },
        ...(checkpointPaths
            ? {
                  checkpoint: {
                      key: checkpointPaths.key,
                      reusedStages,
                      savedStages,
                  },
              }
            : {}),
    };
}
