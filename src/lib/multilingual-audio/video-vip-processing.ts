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
    mirrorEnabled?: boolean;
    blur?: VideoEditInput["blur"];
    subtitleStyle?: VipSubtitleStyle;
    sourceTitle?: string;
    sourceDescription?: string;
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
            mirrorEnabled: input.mirrorEnabled,
            blur: input.blur,
            subtitleStyle: input.subtitleStyle,
            sourceTitle: input.sourceTitle,
            sourceDescription: input.sourceDescription,
        }),
    );
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

export function buildVipFinalRenderArgs(input: {
    videoPath: string;
    voicePath: string;
    subtitleAssPath: string;
    outputPath: string;
    speedFactor: number;
    mirrorEnabled: boolean;
    blurRegions: ReturnType<typeof normalizeBlurRegions>;
    originalAudioVolume: number;
    voiceVolume: number;
}) {
    const clampedSpeed = Math.min(2, Math.max(0.5, input.speedFactor || 1));
    const videoFilters: string[] = [];
    if (Math.abs(clampedSpeed - 1) >= 0.0001) {
        videoFilters.push(
            `setpts=${(1 / clampedSpeed).toFixed(6).replace(/\.?0+$/u, "")}*PTS`,
        );
    }

    const blurChains: string[] = [];
    const blurRegions = input.blurRegions;
    blurRegions.forEach((item, index) => {
        const prev = index === 0 ? "basev" : `v${index - 1}`;
        const splitBase = `base${index}`;
        const splitCrop = `crop${index}`;
        const blurLabel = `blur${index}`;
        const next = `v${index}`;
        const xExpr = `(iw*${(item.region.x / 100).toFixed(6)})`;
        const yExpr = `(ih*${(item.region.y / 100).toFixed(6)})`;
        const wExpr = `(iw*${(item.region.width / 100).toFixed(6)})`;
        const hExpr = `(ih*${(item.region.height / 100).toFixed(6)})`;
        const lumaRadius = Math.max(1, Math.round(item.strength / 3));
        const adaptiveLumaRadius = `min(${lumaRadius}\\,min(w\\,h)/2-1)`;
        const adaptiveChromaRadius = `min(${lumaRadius}\\,min(cw\\,ch)/2-1)`;
        blurChains.push(
            `[${prev}]split[${splitBase}][${splitCrop}]`,
            `[${splitCrop}]crop=w=${wExpr}:h=${hExpr}:x=${xExpr}:y=${yExpr},boxblur=luma_radius=${adaptiveLumaRadius}:luma_power=1:chroma_radius=${adaptiveChromaRadius}:chroma_power=1[${blurLabel}]`,
            `[${splitBase}][${blurLabel}]overlay=x=main_w*${(item.region.x / 100).toFixed(6)}:y=main_h*${(item.region.y / 100).toFixed(6)}:enable='between(t,${item.timeline.start.toFixed(3)},${item.timeline.end.toFixed(3)})'[${next}]`,
        );
    });

    const escapedSubtitlePath = input.subtitleAssPath
        .replace(/\\/g, "\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\\\\'");

    const atempo = buildAtempoFilters(clampedSpeed).join(",");
    const audioBase = atempo
        ? `[0:a]${atempo},volume=${input.originalAudioVolume.toFixed(3)}[orig]`
        : `[0:a]volume=${input.originalAudioVolume.toFixed(3)}[orig]`;

    const videoChain = videoFilters.length > 0 ? videoFilters.join(",") : "null";
    const lastBlurLabel = blurRegions.length > 0 ? `v${blurRegions.length - 1}` : "basev";
    const finalVideoLabel = input.mirrorEnabled ? "mirroredv" : lastBlurLabel;

    const filterParts = [
        `[0:v]${videoChain}[basev]`,
        ...blurChains,
        ...(input.mirrorEnabled ? [`[${lastBlurLabel}]hflip[mirroredv]`] : []),
        `[${finalVideoLabel}]ass='${escapedSubtitlePath}'[vout]`,
        audioBase,
        `[1:a]volume=${input.voiceVolume.toFixed(3)}[voice]`,
        `[orig][voice]amix=inputs=2:duration=longest:dropout_transition=0[aout]`,
    ];

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
        "veryfast",
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
    subtitleStyle: VipSubtitleStyle | undefined;
    originalAudioVolume: number;
    voiceVolume: number;
}) {
    const workDir = path.join(tmpdir(), `omnivideo-vip-${randomUUID()}`);
    const inputPath = path.join(workDir, "source.mp4");
    const voicePath = path.join(workDir, "voice.wav");
    const assPath = path.join(workDir, "subtitles.ass");
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

        await runFfmpeg(
            buildVipFinalRenderArgs({
                videoPath: inputPath,
                voicePath,
                subtitleAssPath: assPath,
                outputPath,
                speedFactor: input.speedFactor,
                mirrorEnabled: input.mirrorEnabled,
                blurRegions: normalizeBlurRegions(input.blur),
                originalAudioVolume: input.originalAudioVolume,
                voiceVolume: input.voiceVolume,
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
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "A source video file is required for VIP processing.",
            400,
        );
    }

    const clampedSpeed = Math.min(2, Math.max(0.5, input.videoSpeedFactor ?? 1));
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
    const reusedStages: VipStageName[] = [];
    const savedStages: VipStageName[] = [];
    const saveCheckpoint = async (stage: VipStageName) => {
        if (!checkpointPaths) return;
        await writeVipCheckpoint({
            paths: checkpointPaths,
            state: checkpointState,
        });
        savedStages.push(stage);
    };

    const preprocessStartedAt = Date.now();
    // VIP path keeps preprocess lightweight: only affect transcript audio timing,
    // defer video speed transform to final composite render.
    const preprocessDurationMs =
        checkpointState.durations?.preprocessDurationMs ??
        Date.now() - preprocessStartedAt;

    const transcriptionStartedAt = Date.now();
    const transcript =
        checkpointState.transcript ??
        (await runners.transcribe({
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileSizeBytes: input.fileBytes.byteLength,
            fileBytes: input.fileBytes,
            language: input.language,
            includeWordTimestamps: true,
            overlongSegmentRetryMode: "best-effort",
            videoSpeedFactor: clampedSpeed,
        }));
    const transcriptionDurationMs =
        checkpointState.durations?.transcriptionDurationMs ??
        Date.now() - transcriptionStartedAt;
    if (checkpointState.transcript) {
        reusedStages.push("transcript");
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
    }

    const translationStartedAt = Date.now();
    const translation =
        checkpointState.translation ??
        (await runners.translate({
            segments: transcript.segments,
            sourceLanguage: input.sourceLanguage ?? transcript.language,
            targetLanguage: input.targetLanguage ?? "vi",
            model: input.model ?? DEFAULT_TRANSLATION_MODEL,
            apiKey: input.apiKey,
            baseUrl: input.baseUrl,
            providerName: input.providerName,
        }));
    const translationDurationMs =
        checkpointState.durations?.translationDurationMs ??
        Date.now() - translationStartedAt;
    if (checkpointState.translation) {
        reusedStages.push("translation");
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
    }

    const voiceStartedAt = Date.now();
    const voice =
        checkpointState.voice ??
        (await runners.generateVoice({
            segments: buildVideoDubbingVoiceSegments({ transcript, translation }),
            settings: {
                ...DEFAULT_PIPER_TTS_SETTINGS,
                ...input.ttsSettings,
                preserveTimestampGaps:
                    input.ttsSettings?.preserveTimestampGaps ??
                    DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps,
            },
        }));
    const voiceDurationMs =
        checkpointState.durations?.voiceDurationMs ??
        Date.now() - voiceStartedAt;
    if (checkpointState.voice) {
        reusedStages.push("voice");
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
    }

    const originalAudioVolume = normalizeVolume(input.originalAudioVolume, 0.1);
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);

    const finalRenderStartedAt = Date.now();
    let videoBytes: Buffer;
    if (checkpointState.renderedVideo && checkpointPaths) {
        videoBytes = await readFile(checkpointPaths.videoPath);
        reusedStages.push("render");
    } else {
        videoBytes = await runners.render({
            sourceVideoBytes: input.fileBytes,
            sourceFileName: input.fileName,
            voiceBytes: Buffer.from(voice.audioBase64, "base64"),
            translatedSegments: translation.translatedSegments,
            speedFactor: clampedSpeed,
            mirrorEnabled: input.mirrorEnabled === true,
            blur: input.blur,
            subtitleStyle: input.subtitleStyle,
            originalAudioVolume,
            voiceVolume,
        });
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
    }

    const metadataStartedAt = Date.now();
    const metadata =
        checkpointState.metadata ??
        (await runners.generateMetadata({
            translatedSegments: translation.translatedSegments,
            sourceTitle: input.sourceTitle,
            sourceDescription: input.sourceDescription,
            model: input.metadataModel ?? input.model ?? DEFAULT_TRANSLATION_MODEL,
            apiKey: input.metadataApiKey ?? input.apiKey,
            baseUrl: input.metadataBaseUrl ?? input.baseUrl,
            providerName: input.metadataProviderName ?? input.providerName,
        }));
    const metadataDurationMs =
        checkpointState.durations?.metadataDurationMs ??
        Date.now() - metadataStartedAt;
    if (checkpointState.metadata) {
        reusedStages.push("metadata");
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
    }

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
