import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import {
    access,
    copyFile,
    mkdir,
    readdir,
    readFile,
    rm,
    writeFile,
} from "node:fs/promises";
import { cpus, tmpdir } from "node:os";
import path from "node:path";

import type { AiProviderRateLimit } from "@/lib/ai-providers/rate-limit";
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
    type TranscriptTranslationSegment,
    type VietnameseVideoMetadataResult,
    type VoiceGenerationResult,
    type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";
import type { RemoteVipWorkerProgress } from "@/lib/multilingual-audio/remote-vip-worker";
import { buildVideoDubbingVoiceSegments } from "@/lib/multilingual-audio/video-dubbing";
import { generateVietnameseVideoMetadata } from "@/lib/multilingual-audio/video-metadata";
import { buildStrictDownloadFilename } from "@/lib/storage/strict-download-filename";
import {
    isSafePublicMusicSource,
    normalizeVideoBackgroundMusicConfig,
    type VideoBackgroundMusicConfig,
    type VideoBackgroundMusicTrackConfig,
} from "@/lib/video-processing/background-music";
import {
    buildSubtitleAssContent,
    buildTextOverlayAssContent,
    type VideoEditInput,
} from "@/lib/video-processing/video-edit-pipeline";

type VipSubtitleStyle = NonNullable<
    Parameters<typeof buildSubtitleAssContent>[1]
>;

type ResolvedVipBackgroundMusicTrack = VideoBackgroundMusicTrackConfig & {
    filePath: string;
};

type ResolvedVipBackgroundMusicConfig = {
    enabled: true;
    volume: number;
    tracks: ResolvedVipBackgroundMusicTrack[];
};

type VipStageName =
    | "transcript"
    | "translation"
    | "voice"
    | "render"
    | "metadata";
type VipTranslationMode = "ai" | "import";
type VipRenderPreset = "superfast" | "veryfast";
export type VipVoiceRenderExecutionMode =
    | "local"
    | "remote"
    | "remote-voice-render";

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
    remoteWorker?: VipRemoteWorkerCheckpointState;
    durations?: Partial<VideoVipProcessingResult["stages"]>;
    updatedAt: string;
};

type VipRemoteWorkerCheckpointState = Omit<
    RemoteVipWorkerProgress,
    "phase"
> & {
    phase:
        | RemoteVipWorkerProgress["phase"]
        | "preflight"
        | "preflight-complete"
        | "preflight-failed";
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

const VIP_BUNDLED_SUBTITLE_FONT_FILES: Record<string, string> = {
    Bangers: path.join(process.cwd(), "public", "fonts", "Bangers-Regular.ttf"),
    Lobster: path.join(process.cwd(), "public", "fonts", "Lobster-Regular.ttf"),
};

const VIP_FALLBACK_BUNDLED_SUBTITLE_FONT_FILES: Record<string, string> = {
    Lobster: path.join(
        process.cwd(),
        "src",
        "assets",
        "fonts",
        "Lobster-Regular.ttf",
    ),
};

function normalizeFontFamilyCandidates(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const firstFamily = trimmed.split(",")[0]?.trim() ?? "";
    const unquoted = firstFamily.replace(/^['"]+|['"]+$/gu, "").trim();
    const variants = [trimmed, firstFamily, unquoted].filter(Boolean);
    const canonical = new Set<string>();
    for (const variant of variants) {
        canonical.add(variant);
        canonical.add(variant.toLowerCase());
    }
    return Array.from(canonical);
}

function resolveBundledVipFontPath(fontFamily: string) {
    const candidates = normalizeFontFamilyCandidates(fontFamily);
    for (const candidate of candidates) {
        const direct =
            VIP_BUNDLED_SUBTITLE_FONT_FILES[candidate] ??
            VIP_BUNDLED_SUBTITLE_FONT_FILES[
                candidate.charAt(0).toUpperCase() + candidate.slice(1)
            ];
        if (direct) return direct;
    }
    for (const candidate of candidates) {
        const fallback =
            VIP_FALLBACK_BUNDLED_SUBTITLE_FONT_FILES[candidate] ??
            VIP_FALLBACK_BUNDLED_SUBTITLE_FONT_FILES[
                candidate.charAt(0).toUpperCase() + candidate.slice(1)
            ];
        if (fallback) return fallback;
    }
    return null;
}

function escapeRegExp(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

async function resolveGoogleFontMediaPathsForFamily(fontFamily: string) {
    const nextServerDir = path.join(process.cwd(), ".next", "server");
    const cssRootCandidates = [
        path.join(nextServerDir, "app"),
        path.join(nextServerDir, "pages"),
    ];
    const resolvedPaths = new Set<string>();

    for (const rootDir of cssRootCandidates) {
        let chunks: string[] = [];
        try {
            chunks = await readdir(rootDir);
        } catch {
            continue;
        }
        for (const chunkName of chunks) {
            const chunkDir = path.join(rootDir, chunkName);
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
    }

    return Array.from(resolvedPaths);
}

function buildSpeechTimedSubtitleSegments(input: {
    translatedSegments: TranscriptTranslationResult["translatedSegments"];
    voiceSegments: ReturnType<typeof buildVideoDubbingVoiceSegments>;
}) {
    const timingBySourceSegmentId = new Map<number, { start: number; end: number }>();

    for (const voiceSegment of input.voiceSegments) {
        const sourceSegmentId =
            typeof voiceSegment.sourceSegmentId === "number"
                ? voiceSegment.sourceSegmentId
                : voiceSegment.id;
        const start = Number(voiceSegment.start);
        const end = Number(voiceSegment.end);
        if (!Number.isFinite(sourceSegmentId)) continue;
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
            continue;
        }
        const existing = timingBySourceSegmentId.get(sourceSegmentId);
        if (!existing) {
            timingBySourceSegmentId.set(sourceSegmentId, { start, end });
            continue;
        }
        timingBySourceSegmentId.set(sourceSegmentId, {
            start: Math.min(existing.start, start),
            end: Math.max(existing.end, end),
        });
    }

    const timedSegments = input.translatedSegments.map((segment) => {
        const timed = timingBySourceSegmentId.get(segment.id);
        if (!timed) return segment;
        return {
            ...segment,
            start: timed.start,
            end: timed.end,
        };
    });

    const MIN_SUBTITLE_DURATION_SECONDS = 0.01;
    return timedSegments.map((segment) => {
        const start = segment.start;
        const end = Math.max(segment.end, start + MIN_SUBTITLE_DURATION_SECONDS);
        return {
            ...segment,
            start,
            end,
        };
    });
}

interface SpeechTimingChunk {
    segmentId: number;
    start: number;
    end: number;
    rawDurationSeconds: number;
    speedFactor: number;
}

export function enrichSubtitlesWithSpeechTimings(
    segments: TranscriptTranslationSegment[],
    alignment: {
        timeline?: SpeechTimingChunk[];
    } | undefined | null,
) {
    if (!alignment?.timeline || !Array.isArray(alignment.timeline) || alignment.timeline.length === 0) {
        return segments;
    }

    const chunkMap = new Map<number, SpeechTimingChunk>();
    for (const chunk of alignment.timeline) {
        if (chunk && typeof chunk.segmentId === "number") {
            chunkMap.set(chunk.segmentId, chunk);
        }
    }

    return segments.map((segment) => {
        const chunk = chunkMap.get(segment.id);
        if (!chunk || typeof chunk.rawDurationSeconds !== "number" || typeof chunk.speedFactor !== "number" || chunk.speedFactor <= 0) {
            return segment;
        }

        const speechDuration = chunk.rawDurationSeconds / chunk.speedFactor;
        const speechEnd = chunk.start + speechDuration;

        return {
            ...segment,
            speechEnd,
        };
    });
}

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
    translationRateLimit?: AiProviderRateLimit;
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
    backgroundMusic?: VideoBackgroundMusicConfig;
    sourceTitle?: string;
    sourceDescription?: string;
    translationMode?: VipTranslationMode;
    importedTranslationLines?: string[];
    metadataApiKey?: string;
    metadataBaseUrl?: string;
    metadataProviderName?: string;
    metadataRateLimit?: AiProviderRateLimit;
    omitVideoBase64?: boolean;
    checkpointKey?: string;
    checkpointDir?: string;
    voiceRenderExecutionMode?: VipVoiceRenderExecutionMode;
    remoteVoiceRenderEndpoint?: string;
    remoteVoiceRenderToken?: string;
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

export type VideoVipVoiceRenderInput = {
    fileName: string;
    sourceTitle?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    fileBytes: Uint8Array;
    transcript: ChineseTranscriptionResult;
    translation: TranscriptTranslationResult;
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
    backgroundMusic?: VideoBackgroundMusicConfig;
    omitVideoBase64?: boolean;
    stageRunners?: Pick<VipStageRunners, "generateVoice" | "render">;
};

export type VideoVipVoiceRenderResult = {
    videoBase64?: string;
    videoBytes?: Buffer;
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    voice: VideoVipProcessingResult["voice"];
    stages: Pick<
        VideoVipProcessingResult["stages"],
        "voiceDurationMs" | "finalRenderDurationMs"
    >;
    mix: {
        originalAudioVolume: number;
        voiceVolume: number;
    };
};

export type VideoVipRemoteRenderInput = {
    fileName: string;
    sourceTitle?: string;
    mimeType?: string;
    fileSizeBytes?: number;
    fileBytes: Uint8Array;
    voiceAudioBase64: string;
    translatedSegments: TranscriptTranslationResult["translatedSegments"];
    originalAudioVolume?: number;
    voiceVolume?: number;
    videoSpeedFactor?: number;
    renderPreset?: VipRenderPreset;
    mirrorEnabled?: boolean;
    blur?: VideoEditInput["blur"];
    coverBoxes?: VideoEditInput["coverBoxes"];
    subtitleStyle?: VipSubtitleStyle;
    textOverlays?: VideoEditInput["textOverlays"];
    backgroundMusic?: VideoBackgroundMusicConfig;
    omitVideoBase64?: boolean;
    stageRunners?: Pick<VipStageRunners, "render">;
};

export type VideoVipRemoteRenderResult = {
    videoBase64?: string;
    videoBytes?: Buffer;
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    stages: Pick<VideoVipProcessingResult["stages"], "finalRenderDurationMs">;
    mix: {
        originalAudioVolume: number;
        voiceVolume: number;
    };
};

function normalizeVolume(value: number | undefined, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(2, Math.max(0, value));
}

function resolvePublicMusicFilePath(source: string) {
    if (!isSafePublicMusicSource(source)) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_MUSIC_INVALID",
            `Background music source must be under /musics: ${source}`,
            400,
        );
    }
    const publicDir = path.resolve(process.cwd(), "public");
    const musicRoot = path.resolve(publicDir, "musics");
    const resolved = path.resolve(publicDir, source.replace(/^\/+/u, ""));
    if (
        resolved !== musicRoot &&
        !resolved.startsWith(`${musicRoot}${path.sep}`)
    ) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_MUSIC_INVALID",
            `Background music source must be under /musics: ${source}`,
            400,
        );
    }
    return resolved;
}

async function resolveVipBackgroundMusicConfig(
    input: VideoBackgroundMusicConfig | undefined,
): Promise<ResolvedVipBackgroundMusicConfig | undefined> {
    const config = normalizeVideoBackgroundMusicConfig(input);
    if (!config) return undefined;
    const tracks: ResolvedVipBackgroundMusicTrack[] = [];
    for (const track of config.tracks) {
        const filePath = resolvePublicMusicFilePath(track.source);
        try {
            await access(filePath);
        } catch {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_MUSIC_INVALID",
                `Background music file was not found on this server: ${track.source}`,
                400,
            );
        }
        tracks.push({ ...track, filePath });
    }
    return tracks.length > 0
        ? { enabled: true, volume: config.volume, tracks }
        : undefined;
}

export const DEFAULT_VIP_VIDEO_SPEED_FACTOR = 0.75;
export const DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME = 0;
const DEFAULT_VIP_RENDER_TIMEOUT_MS = 4 * 60 * 60 * 1000;

function isVipRenderPreset(value: string | undefined): value is VipRenderPreset {
    return value === "superfast" || value === "veryfast";
}

function normalizeRenderPreset(value: string | undefined): VipRenderPreset {
    if (isVipRenderPreset(value)) return value;
    const envPreset = process.env.OMNIVIDEO_VIP_RENDER_PRESET?.trim();
    return isVipRenderPreset(envPreset) ? envPreset : "veryfast";
}

export function resolveVipRenderThreadCount() {
    const configured = process.env.OMNIVIDEO_VIP_RENDER_THREADS?.trim() ?? "";
    const detected = Math.max(1, cpus().length || 1);
    if (!configured || configured === "auto" || configured === "all") {
        return detected;
    }
    const parsed = Number(configured);
    if (!Number.isFinite(parsed) || parsed <= 0) return detected;
    return Math.min(64, Math.max(1, Math.floor(parsed)));
}

export function resolveVipRenderTimeoutMs() {
    const configured = Number(process.env.OMNIVIDEO_VIP_RENDER_TIMEOUT_MS);
    if (!Number.isFinite(configured) || configured <= 0) {
        return DEFAULT_VIP_RENDER_TIMEOUT_MS;
    }
    return Math.max(1000, Math.floor(configured));
}

export function resolveVipRenderChunkCount() {
    const configured = process.env.OMNIVIDEO_VIP_RENDER_CHUNKS?.trim() ?? "";
    if (!configured || configured === "1") return 1;
    const maxChunks = Math.min(8, Math.max(1, resolveVipRenderThreadCount()));
    if (configured === "auto" || configured === "all") return maxChunks;
    const parsed = Number(configured);
    if (!Number.isFinite(parsed) || parsed <= 1) return 1;
    return Math.min(maxChunks, Math.max(1, Math.floor(parsed)));
}

export type VipParallelRenderChunk = {
    index: number;
    startSeconds: number;
    durationSeconds: number;
};

export function planVipParallelRenderChunks(input: {
    durationSeconds: number;
    requestedChunks: number;
    minChunkDurationSeconds?: number;
}): VipParallelRenderChunk[] {
    const durationSeconds = input.durationSeconds;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return [];
    const requestedChunks = Math.max(1, Math.floor(input.requestedChunks));
    const minChunkDurationSeconds = Math.max(
        10,
        input.minChunkDurationSeconds ?? 30,
    );
    const chunkCount = Math.min(
        requestedChunks,
        Math.max(1, Math.floor(durationSeconds / minChunkDurationSeconds)),
    );
    if (chunkCount <= 1) return [];

    const baseDuration = durationSeconds / chunkCount;
    return Array.from({ length: chunkCount }, (_, index) => {
        const startSeconds = index * baseDuration;
        const endSeconds =
            index === chunkCount - 1
                ? durationSeconds
                : (index + 1) * baseDuration;
        return {
            index,
            startSeconds,
            durationSeconds: Math.max(0, endSeconds - startSeconds),
        };
    }).filter((chunk) => chunk.durationSeconds > 0.1);
}

function sanitizeOutputName(fileName: string, sourceTitle?: string) {
    const preferredBase =
        sourceTitle?.trim() || fileName.replace(/\.[^.]+$/u, "");
    return buildStrictDownloadFilename({
        baseName: `${preferredBase || "omnivideo-vip"}-done`,
        fallbackBaseName: "omnivideo-vip-done",
        extension: "mp4",
        maxBaseLength: 90,
    });
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
            voiceRenderExecutionMode: input.voiceRenderExecutionMode ?? "local",
            originalAudioVolume: input.originalAudioVolume,
            voiceVolume: input.voiceVolume,
            videoSpeedFactor: input.videoSpeedFactor,
            renderPreset: normalizeRenderPreset(input.renderPreset),
            mirrorEnabled: input.mirrorEnabled,
            blur: input.blur,
            coverBoxes: input.coverBoxes,
            subtitleStyle: input.subtitleStyle,
            textOverlays: input.textOverlays,
            backgroundMusic: input.backgroundMusic,
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

function formatFfmpegSeconds(value: number) {
    return Math.max(0, value)
        .toFixed(3)
        .replace(/\.?0+$/u, "");
}

function buildFfmpegInputArgs(input: {
    filePath: string;
    startSeconds?: number;
    durationSeconds?: number;
}) {
    const args: string[] = [];
    if (Number.isFinite(input.startSeconds) && (input.startSeconds ?? 0) > 0) {
        args.push("-ss", formatFfmpegSeconds(input.startSeconds ?? 0));
    }
    if (
        Number.isFinite(input.durationSeconds) &&
        (input.durationSeconds ?? 0) > 0
    ) {
        args.push("-t", formatFfmpegSeconds(input.durationSeconds ?? 0));
    }
    args.push("-i", input.filePath);
    return args;
}

function shiftTimelineForRender(
    timeline: { start: number; end: number },
    input: { offsetSeconds: number; durationSeconds?: number },
) {
    const start = timeline.start - input.offsetSeconds;
    const end = timeline.end - input.offsetSeconds;
    const maxEnd =
        Number.isFinite(input.durationSeconds) && (input.durationSeconds ?? 0) > 0
            ? input.durationSeconds ?? end
            : end;
    const clippedStart = Math.max(0, start);
    const clippedEnd = Math.min(maxEnd, end);
    if (clippedEnd <= 0 || clippedEnd <= clippedStart) return null;
    return { start: clippedStart, end: clippedEnd };
}

function shiftBlurRegionsForRender(
    regions: ReturnType<typeof normalizeBlurRegions>,
    input: { offsetSeconds: number; durationSeconds?: number },
) {
    if (input.offsetSeconds <= 0 && !input.durationSeconds) return regions;
    return regions
        .map((item) => {
            const timeline = shiftTimelineForRender(item.timeline, input);
            return timeline ? { ...item, timeline } : null;
        })
        .filter((item): item is (typeof regions)[number] => item !== null);
}

function shiftCoverBoxesForRender(
    coverBoxes: ReturnType<typeof normalizeCoverBoxes>,
    input: { offsetSeconds: number; durationSeconds?: number },
) {
    if (input.offsetSeconds <= 0 && !input.durationSeconds) return coverBoxes;
    return coverBoxes
        .map((item) => {
            const timeline = shiftTimelineForRender(item.timeline, input);
            return timeline ? { ...item, timeline } : null;
        })
        .filter((item): item is (typeof coverBoxes)[number] => item !== null);
}

export function shiftTranslatedSegmentsForRender(
    segments: TranscriptTranslationResult["translatedSegments"],
    input: { offsetSeconds: number; durationSeconds?: number },
) {
    if (input.offsetSeconds <= 0 && !input.durationSeconds) return segments;
    return segments
        .map((segment) => {
            const speechEnd =
                typeof segment.speechEnd === "number" &&
                Number.isFinite(segment.speechEnd) &&
                segment.speechEnd > segment.start
                    ? segment.speechEnd
                    : undefined;
            const effectiveEnd = speechEnd ?? segment.end;
            const timeline = shiftTimelineForRender(
                { start: segment.start, end: effectiveEnd },
                input,
            );
            const segmentTimeline = shiftTimelineForRender(
                { start: segment.start, end: segment.end },
                input,
            );
            const speechTimeline =
                speechEnd === undefined
                    ? null
                    : shiftTimelineForRender(
                          { start: segment.start, end: speechEnd },
                          input,
                      );
            const { speechEnd: _speechEnd, ...segmentWithoutSpeechEnd } = segment;
            return timeline
                ? {
                      ...segmentWithoutSpeechEnd,
                      start: timeline.start,
                      end: segmentTimeline?.end ?? timeline.end,
                      ...(speechTimeline?.end === undefined
                          ? {}
                          : { speechEnd: speechTimeline.end }),
                  }
                : null;
        })
        .filter((segment): segment is (typeof segments)[number] => segment !== null);
}

function shiftTextOverlaysForRender(
    textOverlays: VideoEditInput["textOverlays"] | undefined,
    input: { offsetSeconds: number; durationSeconds?: number },
): VideoEditInput["textOverlays"] | undefined {
    if (!textOverlays?.enabled || textOverlays.overlays.length === 0) {
        return undefined;
    }
    if (input.offsetSeconds <= 0 && !input.durationSeconds) return textOverlays;
    const overlays: typeof textOverlays.overlays = [];
    for (const overlay of textOverlays.overlays) {
        const overlayStart = Number.isFinite(overlay.start)
            ? Number(overlay.start)
            : 0;
        const overlayEnd = Number.isFinite(overlay.end)
            ? Number(overlay.end)
            : 36000;
        const timeline = shiftTimelineForRender(
            { start: overlayStart, end: overlayEnd },
            input,
        );
        if (!timeline) continue;
        overlays.push({
            ...overlay,
            start: timeline.start,
            end: timeline.end,
        });
    }
    return overlays.length > 0 ? { ...textOverlays, overlays } : undefined;
}

function buildEmptyAssContent(input: { playResX?: number; playResY?: number }) {
    const playResX = Number.isFinite(input.playResX)
        ? Math.max(360, Math.round(input.playResX ?? 1920))
        : 1920;
    const playResY = Number.isFinite(input.playResY)
        ? Math.max(360, Math.round(input.playResY ?? 1080))
        : 1080;
    return [
        "[Script Info]",
        "ScriptType: v4.00+",
        "WrapStyle: 0",
        "ScaledBorderAndShadow: yes",
        `PlayResX: ${playResX}`,
        `PlayResY: ${playResY}`,
        "",
        "[V4+ Styles]",
        "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
        "Style: Default,Arial,40,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,60,60,150,1",
        "",
        "[Events]",
        "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text",
        "",
    ].join("\n");
}

export function buildVipFinalRenderArgs(input: {
    videoPath: string;
    voicePath: string;
    subtitleAssPath: string;
    subtitleFontsDir?: string;
    textOverlayAssPath?: string;
    outputPath: string;
    speedFactor: number;
    mirrorEnabled: boolean;
    blurRegions: ReturnType<typeof normalizeBlurRegions>;
    coverBoxes?: ReturnType<typeof normalizeCoverBoxes>;
    originalAudioVolume: number;
    voiceVolume: number;
    backgroundMusic?: ResolvedVipBackgroundMusicConfig;
    renderPreset?: VipRenderPreset;
    renderThreads?: number;
    sourceStartSeconds?: number;
    sourceDurationSeconds?: number;
    voiceStartSeconds?: number;
    voiceDurationSeconds?: number;
    timelineOffsetSeconds?: number;
    timelineDurationSeconds?: number;
}) {
    const clampedSpeed = Math.min(2, Math.max(0.5, input.speedFactor || 1));
    const timelineOffsetSeconds = Math.max(0, input.timelineOffsetSeconds ?? 0);
    const timelineDurationSeconds =
        typeof input.timelineDurationSeconds === "number" &&
        Number.isFinite(input.timelineDurationSeconds) &&
        input.timelineDurationSeconds > 0
            ? input.timelineDurationSeconds
            : undefined;
    const audioTimelineDurationSeconds =
        timelineDurationSeconds ??
        (typeof input.voiceDurationSeconds === "number" &&
        Number.isFinite(input.voiceDurationSeconds) &&
        input.voiceDurationSeconds > 0
            ? input.voiceDurationSeconds
            : undefined);
    const videoFilters: string[] = [];
    if (Math.abs(clampedSpeed - 1) >= 0.0001) {
        videoFilters.push(
            `setpts=${(1 / clampedSpeed).toFixed(6).replace(/\.?0+$/u, "")}*PTS`,
        );
    }

    const videoEditChains: string[] = [];
    const blurRegions = shiftBlurRegionsForRender(input.blurRegions, {
        offsetSeconds: timelineOffsetSeconds,
        durationSeconds: timelineDurationSeconds,
    });
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

    const coverBoxes = shiftCoverBoxesForRender(input.coverBoxes ?? [], {
        offsetSeconds: timelineOffsetSeconds,
        durationSeconds: timelineDurationSeconds,
    });
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
    const escapedSubtitleFontsDir = input.subtitleFontsDir
        ? escapeFilterPath(input.subtitleFontsDir)
        : "";
    const escapedTextOverlayPath = input.textOverlayAssPath
        ? escapeFilterPath(input.textOverlayAssPath)
        : "";

    const atempo = buildAtempoFilters(clampedSpeed).join(",");
    const shouldMixOriginalAudio = input.originalAudioVolume > 0.0001;
    const backgroundMusicTracks =
        input.backgroundMusic?.enabled === true
            ? input.backgroundMusic.tracks.filter((track) => {
                  if (!audioTimelineDurationSeconds) return true;
                  return (
                      Math.max(0, track.startSeconds - timelineOffsetSeconds) <
                      audioTimelineDurationSeconds
                  );
              })
            : [];
    const audioParts: string[] = [];
    const mixLabels: string[] = [];
    if (shouldMixOriginalAudio) {
        audioParts.push(
            atempo
                ? `[0:a]${atempo},volume=${input.originalAudioVolume.toFixed(3)}[orig]`
                : `[0:a]volume=${input.originalAudioVolume.toFixed(3)}[orig]`,
        );
    }
    const shouldMixAudio = shouldMixOriginalAudio || backgroundMusicTracks.length > 0;
    const voiceLabel = shouldMixAudio ? "voice" : "aout";
    audioParts.push(
        Math.abs(input.voiceVolume - 1) >= 0.0001
            ? `[1:a]volume=${input.voiceVolume.toFixed(3)}[${voiceLabel}]`
            : `[1:a]anull[${voiceLabel}]`,
    );
    if (shouldMixAudio) {
        if (backgroundMusicTracks.length > 0) {
            mixLabels.push("[voice]");
            if (shouldMixOriginalAudio) mixLabels.push("[orig]");
        } else {
            if (shouldMixOriginalAudio) mixLabels.push("[orig]");
            mixLabels.push("[voice]");
        }
    }
    backgroundMusicTracks.forEach((track, index) => {
        const inputIndex = index + 2;
        const musicLabel = `music${index}`;
        const relativeStartSeconds = Math.max(
            0,
            track.startSeconds - timelineOffsetSeconds,
        );
        const delayMs = Math.max(0, Math.round(relativeStartSeconds * 1000));
        const remainingDurationSeconds = audioTimelineDurationSeconds
            ? Math.max(0.001, audioTimelineDurationSeconds - relativeStartSeconds)
            : undefined;
        const volume = Math.min(
            4,
            Math.max(0, track.volume * (input.backgroundMusic?.volume ?? 1)),
        );
        const musicFilters = [
            ...(remainingDurationSeconds
                ? [`atrim=duration=${remainingDurationSeconds.toFixed(3)}`]
                : []),
            "asetpts=PTS-STARTPTS",
            `volume=${volume.toFixed(3)}`,
            ...(delayMs > 0 ? [`adelay=${delayMs}|${delayMs}`] : []),
        ];
        audioParts.push(
            `[${inputIndex}:a]${musicFilters.join(",")}[${musicLabel}]`,
        );
        mixLabels.push(`[${musicLabel}]`);
    });
    if (mixLabels.length > 1) {
        const mixDuration =
            backgroundMusicTracks.length > 0 ? "first" : "longest";
        audioParts.push(
            `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=${mixDuration}:dropout_transition=0${
                backgroundMusicTracks.length > 0 ? ":normalize=0" : ""
            }[aout]`,
        );
    }

    const videoChain =
        videoFilters.length > 0 ? videoFilters.join(",") : "null";
    const mirroredVideoLabel = "mirroredv";
    if (input.mirrorEnabled) {
        videoEditChains.push(`[${currentVideoLabel}]hflip[${mirroredVideoLabel}]`);
        currentVideoLabel = mirroredVideoLabel;
    }
    videoEditChains.push(
        `[${currentVideoLabel}]ass='${escapedSubtitlePath}'${
            escapedSubtitleFontsDir
                ? `:fontsdir='${escapedSubtitleFontsDir}'`
                : ""
        }[subv]`,
    );
    currentVideoLabel = "subv";
    if (escapedTextOverlayPath) {
        videoEditChains.push(
            `[${currentVideoLabel}]ass='${escapedTextOverlayPath}'${
                escapedSubtitleFontsDir
                    ? `:fontsdir='${escapedSubtitleFontsDir}'`
                    : ""
            }[vout]`,
        );
    } else {
        videoEditChains.push(`[${currentVideoLabel}]null[vout]`);
    }

    const filterParts = [
        `[0:v]${videoChain}[basev]`,
        ...videoEditChains,
        ...audioParts,
    ];
    const renderPreset = normalizeRenderPreset(input.renderPreset);
    const renderThreads = Math.max(
        1,
        Math.floor(input.renderThreads ?? resolveVipRenderThreadCount()),
    );

    return [
        "-y",
        "-filter_threads",
        String(renderThreads),
        "-filter_complex_threads",
        String(renderThreads),
        ...buildFfmpegInputArgs({
            filePath: input.videoPath,
            startSeconds: input.sourceStartSeconds,
            durationSeconds: input.sourceDurationSeconds,
        }),
        ...buildFfmpegInputArgs({
            filePath: input.voicePath,
            startSeconds: input.voiceStartSeconds,
            durationSeconds: input.voiceDurationSeconds,
        }),
        ...backgroundMusicTracks.flatMap((track) => [
            ...(track.repeat ? ["-stream_loop", "-1"] : []),
            "-i",
            track.filePath,
        ]),
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
        "-threads",
        String(renderThreads),
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

async function prepareVipSubtitleFontsDir(input: {
    workDir: string;
    subtitleFontFamily?: string;
    textOverlayFontFamilies?: string[];
}) {
    const fontFamilies = new Set<string>();
    if (input.subtitleFontFamily?.trim()) {
        fontFamilies.add(input.subtitleFontFamily.trim());
    }
    for (const family of input.textOverlayFontFamilies ?? []) {
        if (family?.trim()) fontFamilies.add(family.trim());
    }
    if (fontFamilies.size === 0) return undefined;

    const fontFiles = new Set<string>();
    const resolvedBundledFamilies = new Set<string>();
    for (const family of fontFamilies) {
        const bundledPath = resolveBundledVipFontPath(family);
        if (!bundledPath) continue;
        try {
            await access(bundledPath);
            fontFiles.add(bundledPath);
            resolvedBundledFamilies.add(family);
        } catch {
            // Continue to dynamic discovery.
        }
    }
    for (const family of fontFamilies) {
        if (resolvedBundledFamilies.has(family)) continue;
        const mediaPaths = await resolveGoogleFontMediaPathsForFamily(family);
        for (const mediaPath of mediaPaths) {
            fontFiles.add(mediaPath);
        }
    }
    if (fontFiles.size === 0) return undefined;

    const fontsDir = path.join(input.workDir, "fonts");
    await mkdir(fontsDir, { recursive: true });
    let copiedCount = 0;
    for (const fontFile of fontFiles) {
        const target = path.join(fontsDir, path.basename(fontFile));
        try {
            await copyFile(fontFile, target);
            copiedCount += 1;
        } catch {
            // ignore copy failures for optional fonts
        }
    }
    if (copiedCount === 0) return undefined;
    return fontsDir;
}

export function buildFfmpegExitErrorMessage(input: {
    code: number | null;
    stderr: string;
}) {
    const exitLabel =
        typeof input.code === "number"
            ? `ffmpeg exited with code ${input.code}`
            : "ffmpeg exited";
    const lines = input.stderr
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean);
    const concise =
        lines
            .slice()
            .reverse()
            .find((line) =>
                /Error|Invalid|Option not found|Failed|No such filter|Conversion failed/iu.test(
                    line,
                ),
            ) ??
        lines.at(-1) ??
        exitLabel;
    const stderrTail = lines.slice(-12).join("\n");
    if (!stderrTail) return concise;
    return `${exitLabel}: ${concise}\nffmpeg stderr tail:\n${stderrTail}`;
}

async function runFfmpeg(input: { args: string[]; timeoutMs?: number } | string[]) {
    const args = Array.isArray(input) ? input : input.args;
    const timeoutMs = Array.isArray(input) ? undefined : input.timeoutMs;
    const ffmpegPath = resolveFfmpegPath();
    await new Promise<void>((resolve, reject) => {
        const child = spawn(ffmpegPath, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let settled = false;
        let timedOut = false;
        let killTimer: ReturnType<typeof setTimeout> | undefined;
        const timeoutTimer =
            timeoutMs && timeoutMs > 0
                ? setTimeout(() => {
                      timedOut = true;
                      try {
                          child.kill("SIGTERM");
                      } catch {
                          // Process may already have exited.
                      }
                      killTimer = setTimeout(() => {
                          try {
                              child.kill("SIGKILL");
                          } catch {
                              // Process may already have exited.
                          }
                      }, 5000);
                  }, timeoutMs)
                : undefined;
        const finish = (callback: () => void) => {
            if (settled) return;
            settled = true;
            if (timeoutTimer) clearTimeout(timeoutTimer);
            if (killTimer) clearTimeout(killTimer);
            callback();
        };
        let stderr = "";
        child.stderr?.on("data", (chunk) => {
            stderr += chunk.toString();
        });
        child.on("error", (error) => finish(() => reject(error)));
        child.on("close", (code) => {
            if (code === 0) {
                finish(() => resolve());
                return;
            }
            if (timedOut) {
                finish(() =>
                    reject(
                        new Error(
                            `ffmpeg render timed out after ${timeoutMs}ms`,
                        ),
                    ),
                );
                return;
            }
            finish(() =>
                reject(
                    new Error(
                        buildFfmpegExitErrorMessage({
                            code,
                            stderr,
                        }),
                    ),
                ),
            );
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

async function readWavDurationSeconds(filePath: string) {
    try {
        const buffer = await readFile(filePath);
        if (buffer.byteLength < 44) return null;
        if (buffer.toString("ascii", 0, 4) !== "RIFF") return null;
        if (buffer.toString("ascii", 8, 12) !== "WAVE") return null;

        let offset = 12;
        let byteRate: number | null = null;
        let dataSize: number | null = null;
        while (offset + 8 <= buffer.byteLength) {
            const chunkId = buffer.toString("ascii", offset, offset + 4);
            const chunkSize = buffer.readUInt32LE(offset + 4);
            const chunkStart = offset + 8;
            if (chunkId === "fmt " && chunkStart + 12 <= buffer.byteLength) {
                byteRate = buffer.readUInt32LE(chunkStart + 8);
            }
            if (chunkId === "data") {
                dataSize = chunkSize;
                break;
            }
            offset = chunkStart + chunkSize + (chunkSize % 2);
        }
        if (!byteRate || !dataSize) return null;
        const duration = dataSize / byteRate;
        return Number.isFinite(duration) && duration > 0 ? duration : null;
    } catch {
        return null;
    }
}

function escapeConcatFilePath(filePath: string) {
    return filePath.replace(/'/g, "'\\''");
}

async function concatRenderedChunks(input: {
    chunkPaths: string[];
    concatListPath: string;
    outputPath: string;
}) {
    await writeFile(
        input.concatListPath,
        `${input.chunkPaths
            .map((chunkPath) => `file '${escapeConcatFilePath(chunkPath)}'`)
            .join("\n")}\n`,
    );
    await runFfmpeg({
        args: [
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            input.concatListPath,
            "-c",
            "copy",
            "-movflags",
            "+faststart",
            input.outputPath,
        ],
        timeoutMs: resolveVipRenderTimeoutMs(),
    });
}

export async function renderVipCompositeVideo(input: {
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
    backgroundMusic?: VideoBackgroundMusicConfig;
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
        const subtitleFontsDir = await prepareVipSubtitleFontsDir({
            workDir,
            subtitleFontFamily: input.subtitleStyle?.fontFamily,
            textOverlayFontFamilies:
                input.textOverlays?.enabled === true
                    ? input.textOverlays.overlays
                          .map((overlay) => overlay.fontFamily)
                          .filter((family): family is string => Boolean(family))
                    : [],
        });
        const writeSubtitleAss = async (inputSegments: typeof input.translatedSegments, targetPath: string) => {
            await writeFile(
                targetPath,
                inputSegments.length > 0
                    ? buildSubtitleAssContent(inputSegments, {
                          ...input.subtitleStyle,
                          playResX: probedDimensions?.width,
                          playResY: probedDimensions?.height,
                      })
                    : buildEmptyAssContent({
                          playResX: probedDimensions?.width,
                          playResY: probedDimensions?.height,
                      }),
            );
        };
        const writeTextOverlayAss = async (
            textOverlays: VideoEditInput["textOverlays"] | undefined,
            targetPath: string,
        ) => {
            if (!textOverlays?.enabled || textOverlays.overlays.length === 0) {
                return false;
            }
            await writeFile(
                targetPath,
                buildTextOverlayAssContent(textOverlays.overlays, {
                    playResX: probedDimensions?.width,
                    playResY: probedDimensions?.height,
                }),
            );
            return true;
        };

        const voiceDurationSeconds = await readWavDurationSeconds(voicePath);
        const backgroundMusic = await resolveVipBackgroundMusicConfig(
            input.backgroundMusic,
        );
        const renderChunks = voiceDurationSeconds && !backgroundMusic
            ? planVipParallelRenderChunks({
                  durationSeconds: voiceDurationSeconds,
                  requestedChunks: resolveVipRenderChunkCount(),
              })
            : [];
        const normalizedBlurRegions = normalizeBlurRegions(input.blur);
        const normalizedCoverBoxes = normalizeCoverBoxes(input.coverBoxes);

        if (renderChunks.length > 1) {
            const totalThreads = resolveVipRenderThreadCount();
            const perChunkThreads = Math.max(
                1,
                Math.floor(totalThreads / renderChunks.length),
            );
            const chunkPaths = await Promise.all(
                renderChunks.map(async (chunk) => {
                    const chunkAssPath = path.join(
                        workDir,
                        `subtitles-${chunk.index}.ass`,
                    );
                    const chunkTextOverlayAssPath = path.join(
                        workDir,
                        `text-overlays-${chunk.index}.ass`,
                    );
                    const chunkOutputPath = path.join(
                        workDir,
                        `vip-chunk-${chunk.index}.mp4`,
                    );
                    await writeSubtitleAss(
                        shiftTranslatedSegmentsForRender(input.translatedSegments, {
                            offsetSeconds: chunk.startSeconds,
                            durationSeconds: chunk.durationSeconds,
                        }),
                        chunkAssPath,
                    );
                    const shiftedTextOverlays = shiftTextOverlaysForRender(
                        input.textOverlays,
                        {
                            offsetSeconds: chunk.startSeconds,
                            durationSeconds: chunk.durationSeconds,
                        },
                    );
                    const hasTextOverlay = await writeTextOverlayAss(
                        shiftedTextOverlays,
                        chunkTextOverlayAssPath,
                    );
                    await runFfmpeg({
                        args: buildVipFinalRenderArgs({
                            videoPath: inputPath,
                            voicePath,
                            subtitleAssPath: chunkAssPath,
                            subtitleFontsDir,
                            textOverlayAssPath: hasTextOverlay
                                ? chunkTextOverlayAssPath
                                : undefined,
                            outputPath: chunkOutputPath,
                            speedFactor: input.speedFactor,
                            mirrorEnabled: input.mirrorEnabled,
                            blurRegions: normalizedBlurRegions,
                            coverBoxes: normalizedCoverBoxes,
                            originalAudioVolume: input.originalAudioVolume,
                            voiceVolume: input.voiceVolume,
                            backgroundMusic,
                            renderPreset: input.renderPreset,
                            renderThreads: perChunkThreads,
                            sourceStartSeconds:
                                chunk.startSeconds * Math.min(2, Math.max(0.5, input.speedFactor || 1)),
                            sourceDurationSeconds:
                                chunk.durationSeconds * Math.min(2, Math.max(0.5, input.speedFactor || 1)),
                            voiceStartSeconds: chunk.startSeconds,
                            voiceDurationSeconds: chunk.durationSeconds,
                            timelineOffsetSeconds: chunk.startSeconds,
                            timelineDurationSeconds: chunk.durationSeconds,
                        }),
                        timeoutMs: resolveVipRenderTimeoutMs(),
                    });
                    return chunkOutputPath;
                }),
            );
            await concatRenderedChunks({
                chunkPaths,
                concatListPath: path.join(workDir, "chunks.txt"),
                outputPath,
            });
        } else {
            await writeSubtitleAss(input.translatedSegments, assPath);
            const hasTextOverlay = await writeTextOverlayAss(
                input.textOverlays,
                textOverlayAssPath,
            );
            await runFfmpeg({
                args: buildVipFinalRenderArgs({
                    videoPath: inputPath,
                    voicePath,
                    subtitleAssPath: assPath,
                    subtitleFontsDir,
                    textOverlayAssPath: hasTextOverlay
                        ? textOverlayAssPath
                        : undefined,
                    outputPath,
                    speedFactor: input.speedFactor,
                    mirrorEnabled: input.mirrorEnabled,
                    blurRegions: normalizedBlurRegions,
                    coverBoxes: normalizedCoverBoxes,
                    originalAudioVolume: input.originalAudioVolume,
                    voiceVolume: input.voiceVolume,
                    backgroundMusic,
                    renderPreset: input.renderPreset,
                    timelineDurationSeconds:
                        backgroundMusic && voiceDurationSeconds
                            ? voiceDurationSeconds
                            : undefined,
                }),
                timeoutMs: resolveVipRenderTimeoutMs(),
            });
        }

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

export async function runVideoVipVoiceRender(
    input: VideoVipVoiceRenderInput,
): Promise<VideoVipVoiceRenderResult> {
    const startedAt = Date.now();
    const runId = randomUUID();
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "A source video file is required for VIP voice/render processing.",
            400,
        );
    }

    const clampedSpeed = Math.min(
        2,
        Math.max(0.5, input.videoSpeedFactor ?? DEFAULT_VIP_VIDEO_SPEED_FACTOR),
    );
    const renderPreset = normalizeRenderPreset(input.renderPreset);
    const runners = {
        generateVoice: input.stageRunners?.generateVoice ?? generateVoiceFromSegments,
        render: input.stageRunners?.render ?? renderVipCompositeVideo,
    };

    const voiceStartedAt = Date.now();
    const voiceInputSegments = buildVideoDubbingVoiceSegments({
        transcript: input.transcript,
        translation: input.translation,
    });
    const subtitleSegments = buildSpeechTimedSubtitleSegments({
        translatedSegments: input.translation.translatedSegments,
        voiceSegments: voiceInputSegments,
    });
    logVipEvent(runId, "remote-stage-start", {
        stage: "voice",
        segmentCount: voiceInputSegments.length,
        alignmentMode:
            input.ttsSettings?.alignmentMode ??
            DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
    });
    let voice: VoiceGenerationResult;
    try {
        voice = await runners.generateVoice({
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
        logVipEvent(runId, "remote-stage-failed", {
            stage: "voice",
            durationMs: Date.now() - voiceStartedAt,
            error: summarizeVipError(error),
        });
        throw error;
    }
    const voiceDurationMs = Date.now() - voiceStartedAt;
    logVipEvent(runId, "remote-stage-success", {
        stage: "voice",
        durationMs: voiceDurationMs,
        segmentCount: voice.segmentCount,
        byteLength: voice.byteLength,
        alignmentMode: voice.alignment.mode,
    });

    const originalAudioVolume = normalizeVolume(
        input.originalAudioVolume,
        DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
    );
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);
    const backgroundMusic = normalizeVideoBackgroundMusicConfig(
        input.backgroundMusic,
    );
    const renderStartedAt = Date.now();
    logVipEvent(runId, "remote-stage-start", {
        stage: "render",
        sourceFileSizeBytes: input.fileBytes.byteLength,
        voiceByteLength: voice.byteLength,
        translatedCount: input.translation.translatedSegments.length,
        speedFactor: clampedSpeed,
        mirrorEnabled: input.mirrorEnabled === true,
        blurEnabled: input.blur?.enabled === true,
        coverBoxEnabled: input.coverBoxes?.enabled === true,
        textOverlayEnabled: input.textOverlays?.enabled === true,
        renderPreset,
        originalAudioVolume,
        voiceVolume,
        backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
    });
    let videoBytes: Buffer;
    try {
        const enrichedSubtitleSegments = enrichSubtitlesWithSpeechTimings(
            subtitleSegments,
            voice.alignment,
        );
        videoBytes = await runners.render({
            sourceVideoBytes: input.fileBytes,
            sourceFileName: input.fileName,
            voiceBytes: Buffer.from(voice.audioBase64, "base64"),
            translatedSegments: enrichedSubtitleSegments,
            speedFactor: clampedSpeed,
            mirrorEnabled: input.mirrorEnabled === true,
            blur: input.blur,
            coverBoxes: input.coverBoxes,
            subtitleStyle: input.subtitleStyle,
            textOverlays: input.textOverlays,
            backgroundMusic,
            originalAudioVolume,
            voiceVolume,
            renderPreset,
        });
    } catch (error) {
        logVipEvent(runId, "remote-stage-failed", {
            stage: "render",
            durationMs: Date.now() - renderStartedAt,
            error: summarizeVipError(error),
        });
        throw error;
    }
    const finalRenderDurationMs = Date.now() - renderStartedAt;
    logVipEvent(runId, "remote-stage-success", {
        stage: "render",
        durationMs: finalRenderDurationMs,
        byteLength: videoBytes.byteLength,
    });

    return {
        ...(input.omitVideoBase64
            ? { videoBytes }
            : { videoBase64: videoBytes.toString("base64") }),
        mimeType: "video/mp4",
        extension: "mp4",
        fileName: sanitizeOutputName(input.fileName, input.sourceTitle),
        byteLength: videoBytes.byteLength,
        generationDurationMs: Date.now() - startedAt,
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
        stages: {
            voiceDurationMs,
            finalRenderDurationMs,
        },
        mix: {
            originalAudioVolume,
            voiceVolume,
        },
    };
}

export async function runVideoVipRemoteRender(
    input: VideoVipRemoteRenderInput,
): Promise<VideoVipRemoteRenderResult> {
    const startedAt = Date.now();
    const runId = randomUUID();
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "A source video file is required for VIP remote render.",
            400,
        );
    }
    if (!input.voiceAudioBase64.trim()) {
        throw new ChineseTranscriptionError(
            "VAL_TTS_SEGMENTS_REQUIRED",
            "Voice audio is required for VIP remote render.",
            400,
        );
    }

    const clampedSpeed = Math.min(
        2,
        Math.max(0.5, input.videoSpeedFactor ?? DEFAULT_VIP_VIDEO_SPEED_FACTOR),
    );
    const renderPreset = normalizeRenderPreset(input.renderPreset);
    const originalAudioVolume = normalizeVolume(
        input.originalAudioVolume,
        DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
    );
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);
    const backgroundMusic = normalizeVideoBackgroundMusicConfig(
        input.backgroundMusic,
    );
    const runners = {
        render: input.stageRunners?.render ?? renderVipCompositeVideo,
    };

    const renderStartedAt = Date.now();
    logVipEvent(runId, "remote-stage-start", {
        stage: "render",
        sourceFileSizeBytes: input.fileBytes.byteLength,
        translatedCount: input.translatedSegments.length,
        speedFactor: clampedSpeed,
        mirrorEnabled: input.mirrorEnabled === true,
        blurEnabled: input.blur?.enabled === true,
        coverBoxEnabled: input.coverBoxes?.enabled === true,
        textOverlayEnabled: input.textOverlays?.enabled === true,
        renderPreset,
        originalAudioVolume,
        voiceVolume,
        backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
    });
    let videoBytes: Buffer;
    try {
        videoBytes = await runners.render({
            sourceVideoBytes: input.fileBytes,
            sourceFileName: input.fileName,
            voiceBytes: Buffer.from(input.voiceAudioBase64, "base64"),
            translatedSegments: input.translatedSegments,
            speedFactor: clampedSpeed,
            mirrorEnabled: input.mirrorEnabled === true,
            blur: input.blur,
            coverBoxes: input.coverBoxes,
            subtitleStyle: input.subtitleStyle,
            textOverlays: input.textOverlays,
            backgroundMusic,
            originalAudioVolume,
            voiceVolume,
            renderPreset,
        });
    } catch (error) {
        logVipEvent(runId, "remote-stage-failed", {
            stage: "render",
            durationMs: Date.now() - renderStartedAt,
            error: summarizeVipError(error),
        });
        throw error;
    }
    const finalRenderDurationMs = Date.now() - renderStartedAt;
    logVipEvent(runId, "remote-stage-success", {
        stage: "render",
        durationMs: finalRenderDurationMs,
        byteLength: videoBytes.byteLength,
    });

    return {
        ...(input.omitVideoBase64
            ? { videoBytes }
            : { videoBase64: videoBytes.toString("base64") }),
        mimeType: "video/mp4",
        extension: "mp4",
        fileName: sanitizeOutputName(input.fileName, input.sourceTitle),
        byteLength: videoBytes.byteLength,
        generationDurationMs: Date.now() - startedAt,
        stages: {
            finalRenderDurationMs,
        },
        mix: {
            originalAudioVolume,
            voiceVolume,
        },
    };
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
    const clampedSpeed = Math.min(
        2,
        Math.max(0.5, input.videoSpeedFactor ?? DEFAULT_VIP_VIDEO_SPEED_FACTOR),
    );
    const renderPreset = normalizeRenderPreset(input.renderPreset);
    const backgroundMusic = normalizeVideoBackgroundMusicConfig(
        input.backgroundMusic,
    );
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
        originalAudioVolume: normalizeVolume(
            input.originalAudioVolume,
            DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
        ),
        voiceVolume: normalizeVolume(input.voiceVolume, 1),
        backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
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
    const saveRemoteWorkerProgress = async (
        progress: Omit<VipRemoteWorkerCheckpointState, "updatedAt">,
    ) => {
        checkpointState = {
            ...checkpointState,
            remoteWorker: {
                ...progress,
                updatedAt: new Date().toISOString(),
            },
        };
        if (checkpointPaths) {
            await writeVipCheckpoint({
                paths: checkpointPaths,
                state: checkpointState,
            });
        }
    };

    if (input.voiceRenderExecutionMode === "remote-voice-render") {
        const preflightStartedAt = Date.now();
        await saveRemoteWorkerProgress({
            phase: "preflight",
            message: "Checking remote VIP worker health before transcript work.",
        });
        logVipEvent(runId, "stage-start", {
            stage: "remote-voice-render",
            phase: "preflight",
            endpointConfigured: Boolean(
                input.remoteVoiceRenderEndpoint ??
                    process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL,
            ),
        });
        const { assertRemoteVipWorkerAvailable } = await import(
            "@/lib/multilingual-audio/remote-vip-worker"
        );
        try {
            await assertRemoteVipWorkerAvailable({
                endpoint: input.remoteVoiceRenderEndpoint,
                token: input.remoteVoiceRenderToken,
            });
            await saveRemoteWorkerProgress({
                phase: "preflight-complete",
                message: "Remote VIP worker health check passed.",
            });
            logVipEvent(runId, "stage-success", {
                stage: "remote-voice-render",
                phase: "preflight",
                durationMs: Date.now() - preflightStartedAt,
            });
        } catch (error) {
            await saveRemoteWorkerProgress({
                phase: "preflight-failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Remote VIP worker health check failed.",
            });
            logVipEvent(runId, "stage-failed", {
                stage: "remote-voice-render",
                phase: "preflight",
                durationMs: Date.now() - preflightStartedAt,
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
                    rateLimit: input.translationRateLimit,
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

    if (input.voiceRenderExecutionMode === "remote-voice-render") {
        const originalAudioVolume = normalizeVolume(
            input.originalAudioVolume,
            DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
        );
        const voiceVolume = normalizeVolume(input.voiceVolume, 1);
        const remoteStartedAt = Date.now();
        logVipEvent(runId, "stage-start", {
            stage: "remote-voice-render",
            endpointConfigured: Boolean(
                input.remoteVoiceRenderEndpoint ??
                    process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL,
            ),
            sourceFileSizeBytes: input.fileBytes.byteLength,
            translatedCount: translation.translatedSegments.length,
            speedFactor: clampedSpeed,
            renderPreset,
            originalAudioVolume,
            voiceVolume,
            backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
            alignmentMode:
                input.ttsSettings?.alignmentMode ??
                DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
            binaryPath: input.ttsSettings?.binaryPath ?? DEFAULT_PIPER_TTS_SETTINGS.binaryPath,
            modelPath: input.ttsSettings?.modelPath ?? DEFAULT_PIPER_TTS_SETTINGS.modelPath,
        });
        const { runRemoteVideoVipVoiceRender } = await import(
            "@/lib/multilingual-audio/remote-vip-worker"
        );
        let remoteResult: VideoVipVoiceRenderResult;
        try {
            remoteResult = await runRemoteVideoVipVoiceRender(
                {
                    fileName: input.fileName,
                    sourceTitle: input.sourceTitle,
                    mimeType: input.mimeType,
                    fileSizeBytes: input.fileSizeBytes,
                    fileBytes: input.fileBytes,
                    transcript,
                    translation,
                    ttsSettings: input.ttsSettings,
                    originalAudioVolume,
                    voiceVolume,
                    videoSpeedFactor: clampedSpeed,
                    renderPreset,
                    mirrorEnabled: input.mirrorEnabled,
                    blur: input.blur,
                    coverBoxes: input.coverBoxes,
                    subtitleStyle: input.subtitleStyle,
                    textOverlays: input.textOverlays,
                    backgroundMusic,
                    omitVideoBase64: true,
                },
                {
                    endpoint: input.remoteVoiceRenderEndpoint,
                    token: input.remoteVoiceRenderToken,
                    onProgress: saveRemoteWorkerProgress,
                },
            );
        } catch (error) {
            logVipEvent(runId, "stage-failed", {
                stage: "remote-voice-render",
                durationMs: Date.now() - remoteStartedAt,
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
        const remoteVideoBytes =
            remoteResult.videoBytes ??
            Buffer.from(remoteResult.videoBase64 ?? "", "base64");
        const outputFileName = sanitizeOutputName(input.fileName, input.sourceTitle);
        const voiceDurationMs = remoteResult.stages.voiceDurationMs;
        const finalRenderDurationMs = remoteResult.stages.finalRenderDurationMs;
        logVipEvent(runId, "stage-success", {
            stage: "remote-voice-render",
            durationMs: Date.now() - remoteStartedAt,
            voiceDurationMs,
            finalRenderDurationMs,
            voiceByteLength: remoteResult.voice.byteLength,
            byteLength: remoteVideoBytes.byteLength,
        });
        if (checkpointPaths) {
            await mkdir(checkpointPaths.dir, { recursive: true });
            await writeFile(checkpointPaths.videoPath, remoteVideoBytes);
            checkpointState = {
                ...checkpointState,
                renderedVideo: {
                    fileName: outputFileName,
                    mimeType: "video/mp4",
                    extension: "mp4",
                    byteLength: remoteVideoBytes.byteLength,
                },
                durations: {
                    ...checkpointState.durations,
                    voiceDurationMs,
                    finalRenderDurationMs,
                },
            };
            await saveCheckpoint("render");
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
                        model:
                            input.metadataModel ??
                            input.model ??
                            DEFAULT_TRANSLATION_MODEL,
                        apiKey: input.metadataApiKey ?? input.apiKey,
                        baseUrl: input.metadataBaseUrl ?? input.baseUrl,
                        providerName:
                            input.metadataProviderName ?? input.providerName,
                        rateLimit: input.metadataRateLimit,
                    });
                } catch (error) {
                    logVipEvent(runId, "stage-failed", {
                        stage: "metadata",
                        durationMs: Date.now() - metadataStartedAt,
                        provider:
                            input.metadataProviderName ??
                            input.providerName ??
                            "default",
                        providerHost: getVipProviderHost(
                            input.metadataBaseUrl ?? input.baseUrl,
                        ),
                        model:
                            input.metadataModel ??
                            input.model ??
                            DEFAULT_TRANSLATION_MODEL,
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
            outputFileName,
            outputByteLength: remoteVideoBytes.byteLength,
            voiceRenderExecutionMode: "remote-voice-render",
        });

        return {
            ...(input.omitVideoBase64
                ? { videoBytes: remoteVideoBytes }
                : { videoBase64: remoteVideoBytes.toString("base64") }),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: outputFileName,
            byteLength: remoteVideoBytes.byteLength,
            generationDurationMs: Date.now() - startedAt,
            transcript,
            translation,
            voice: remoteResult.voice,
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

    if (input.voiceRenderExecutionMode === "remote") {
        const voiceStartedAt = Date.now();
        const voiceInputSegments = buildVideoDubbingVoiceSegments({
            transcript,
            translation,
        });
        const subtitleSegments = buildSpeechTimedSubtitleSegments({
            translatedSegments: translation.translatedSegments,
            voiceSegments: voiceInputSegments,
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

        const originalAudioVolume = normalizeVolume(
            input.originalAudioVolume,
            DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
        );
        const voiceVolume = normalizeVolume(input.voiceVolume, 1);
        const remoteStartedAt = Date.now();
        logVipEvent(runId, "stage-start", {
            stage: "remote-render",
            endpointConfigured: Boolean(
                input.remoteVoiceRenderEndpoint ??
                    process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL,
            ),
            sourceFileSizeBytes: input.fileBytes.byteLength,
            voiceByteLength: voice.byteLength,
            translatedCount: subtitleSegments.length,
            speedFactor: clampedSpeed,
            renderPreset,
            originalAudioVolume,
            voiceVolume,
            backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
        });
        const { runRemoteVideoVipRender } = await import(
            "@/lib/multilingual-audio/remote-vip-worker"
        );
        let remoteResult: VideoVipRemoteRenderResult;
        const enrichedSubtitleSegments = enrichSubtitlesWithSpeechTimings(
            subtitleSegments,
            voice.alignment,
        );
        try {
            remoteResult = await runRemoteVideoVipRender(
                {
                    fileName: input.fileName,
                    sourceTitle: input.sourceTitle,
                    mimeType: input.mimeType,
                    fileSizeBytes: input.fileSizeBytes,
                    fileBytes: input.fileBytes,
                    voiceAudioBase64: voice.audioBase64,
                    translatedSegments: enrichedSubtitleSegments,
                    originalAudioVolume,
                    voiceVolume,
                    videoSpeedFactor: clampedSpeed,
                    renderPreset,
                    mirrorEnabled: input.mirrorEnabled,
                    blur: input.blur,
                    coverBoxes: input.coverBoxes,
                    subtitleStyle: input.subtitleStyle,
                    textOverlays: input.textOverlays,
                    backgroundMusic,
                    omitVideoBase64: true,
                },
                {
                    endpoint: input.remoteVoiceRenderEndpoint,
                    token: input.remoteVoiceRenderToken,
                    onProgress: saveRemoteWorkerProgress,
                },
            );
        } catch (error) {
            logVipEvent(runId, "stage-failed", {
                stage: "remote-render",
                durationMs: Date.now() - remoteStartedAt,
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
        const remoteVideoBytes =
            remoteResult.videoBytes ??
            Buffer.from(remoteResult.videoBase64 ?? "", "base64");
        const finalRenderDurationMs = remoteResult.stages.finalRenderDurationMs;
        logVipEvent(runId, "stage-success", {
            stage: "remote-render",
            durationMs: Date.now() - remoteStartedAt,
            finalRenderDurationMs,
            byteLength: remoteVideoBytes.byteLength,
        });
        if (checkpointPaths) {
            await mkdir(checkpointPaths.dir, { recursive: true });
            await writeFile(checkpointPaths.videoPath, remoteVideoBytes);
            checkpointState = {
                ...checkpointState,
                renderedVideo: {
                    fileName: remoteResult.fileName,
                    mimeType: "video/mp4",
                    extension: "mp4",
                    byteLength: remoteVideoBytes.byteLength,
                },
                durations: {
                    ...checkpointState.durations,
                    finalRenderDurationMs,
                },
            };
            await saveCheckpoint("render");
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
                        model:
                            input.metadataModel ??
                            input.model ??
                            DEFAULT_TRANSLATION_MODEL,
                        apiKey: input.metadataApiKey ?? input.apiKey,
                        baseUrl: input.metadataBaseUrl ?? input.baseUrl,
                        providerName:
                            input.metadataProviderName ?? input.providerName,
                        rateLimit: input.metadataRateLimit,
                    });
                } catch (error) {
                    logVipEvent(runId, "stage-failed", {
                        stage: "metadata",
                        durationMs: Date.now() - metadataStartedAt,
                        provider:
                            input.metadataProviderName ??
                            input.providerName ??
                            "default",
                        providerHost: getVipProviderHost(
                            input.metadataBaseUrl ?? input.baseUrl,
                        ),
                        model:
                            input.metadataModel ??
                            input.model ??
                            DEFAULT_TRANSLATION_MODEL,
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
            outputFileName: remoteResult.fileName,
            outputByteLength: remoteVideoBytes.byteLength,
            voiceRenderExecutionMode: "remote",
        });

        return {
            ...(input.omitVideoBase64
                ? { videoBytes: remoteVideoBytes }
                : { videoBase64: remoteVideoBytes.toString("base64") }),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: remoteResult.fileName,
            byteLength: remoteVideoBytes.byteLength,
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

    const voiceStartedAt = Date.now();
    const voiceInputSegments = buildVideoDubbingVoiceSegments({
        transcript,
        translation,
    });
    const subtitleSegments = buildSpeechTimedSubtitleSegments({
        translatedSegments: translation.translatedSegments,
        voiceSegments: voiceInputSegments,
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

    const originalAudioVolume = normalizeVolume(
        input.originalAudioVolume,
        DEFAULT_VIP_ORIGINAL_AUDIO_VOLUME,
    );
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);

    const finalRenderStartedAt = Date.now();
    const enrichedSubtitleSegments = enrichSubtitlesWithSpeechTimings(
        subtitleSegments,
        voice.alignment,
    );
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
        backgroundMusicTrackCount: backgroundMusic?.tracks.length ?? 0,
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
                    translatedSegments: enrichedSubtitleSegments,
                    speedFactor: clampedSpeed,
                    mirrorEnabled: input.mirrorEnabled === true,
                    blur: input.blur,
                    coverBoxes: input.coverBoxes,
                    subtitleStyle: input.subtitleStyle,
                    textOverlays: input.textOverlays,
                    backgroundMusic,
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
                translatedSegments: enrichedSubtitleSegments,
                speedFactor: clampedSpeed,
                mirrorEnabled: input.mirrorEnabled === true,
                blur: input.blur,
                coverBoxes: input.coverBoxes,
                subtitleStyle: input.subtitleStyle,
                textOverlays: input.textOverlays,
                backgroundMusic,
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
                fileName: sanitizeOutputName(input.fileName, input.sourceTitle),
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
                    rateLimit: input.metadataRateLimit,
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
        outputFileName: sanitizeOutputName(input.fileName, input.sourceTitle),
        outputByteLength: videoBytes.byteLength,
    });

    return {
        ...(input.omitVideoBase64
            ? { videoBytes }
            : { videoBase64: videoBytes.toString("base64") }),
        mimeType: "video/mp4",
        extension: "mp4",
        fileName: sanitizeOutputName(input.fileName, input.sourceTitle),
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
