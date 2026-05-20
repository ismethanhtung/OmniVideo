import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "./audio-extraction";
import { runChineseVideoTranscription } from "./chinese-transcription";
import { generateVoiceFromSegments } from "./piper-tts";
import { translateTranscriptSegments } from "./transcript-translation";
import { preprocessVideoSpeed } from "./video-preprocess";
import { buildWordAwareVoiceSegments } from "./voice-segment-timing";
import {
    ChineseTranscriptionError,
    DEFAULT_PIPER_TTS_SETTINGS,
    DEFAULT_TRANSLATION_MODEL,
    type ChineseTranscriptionResult,
    type TranscriptTranslationResult,
    type VoiceGenerationResult,
    type VoiceGenerationSettings,
} from "./types";

type FfmpegSpawn = typeof spawn;

let dubbingFfmpegSpawnForTest: FfmpegSpawn | null = null;
let dubbingReadFileForTest: ((filePath: string) => Promise<Buffer>) | null =
    null;

export type VideoDubbingInput = {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
    fileBytes: Uint8Array;
    language?: string;
    prompt?: string;
    includeWordTimestamps?: boolean;
    sourceLanguage?: string;
    targetLanguage?: string;
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    providerName?: string;
    ttsSettings?: Partial<VoiceGenerationSettings>;
    originalAudioVolume?: number;
    voiceVolume?: number;
    videoSpeedFactor?: number;
    omitVideoBase64?: boolean;
};

export type VideoDubbingResult = {
    videoBase64?: string;
    videoBytes?: Buffer;
    artifactId?: string;
    artifactExpiresAt?: string;
    mimeType: "video/mp4";
    extension: "mp4";
    fileName: string;
    byteLength: number;
    generationDurationMs: number;
    transcript: ChineseTranscriptionResult;
    translation: TranscriptTranslationResult;
    voice: Omit<VoiceGenerationResult, "audioBase64">;
    mix: {
        originalAudioVolume: number;
        voiceVolume: number;
        mode: "duck-original";
    };
};

export function setVideoDubbingFfmpegSpawnForTest(
    spawnImpl: FfmpegSpawn | null,
) {
    dubbingFfmpegSpawnForTest = spawnImpl;
}

export function setVideoDubbingReadFileForTest(
    readFileImpl: ((filePath: string) => Promise<Buffer>) | null,
) {
    dubbingReadFileForTest = readFileImpl;
}

export function buildVideoDubbingVoiceSegments(input: {
    transcript: ChineseTranscriptionResult;
    translation: TranscriptTranslationResult;
}) {
    return buildWordAwareVoiceSegments({
        translatedSegments: input.translation.translatedSegments,
        words: input.transcript.words,
    });
}

function sanitizeOutputName(fileName: string) {
    const base = fileName.replace(/\.[^.]+$/u, "") || "omnivideo-dubbed";
    return `${
        base
            .replace(/[^a-zA-Z0-9._-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 90) || "omnivideo-dubbed"
    }-vi-dub.mp4`;
}

function normalizeVolume(value: number | undefined, fallback: number) {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(2, Math.max(0, value));
}

export function buildDubbedVideoFfmpegArgs(input: {
    videoPath: string;
    voicePath: string;
    outputPath: string;
    originalAudioVolume: number;
    voiceVolume: number;
}) {
    const originalVolume = normalizeVolume(input.originalAudioVolume, 0.1);
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);

    if (originalVolume <= 0) {
        return [
            "-y",
            "-i",
            input.videoPath,
            "-i",
            input.voicePath,
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-shortest",
            "-movflags",
            "+faststart",
            input.outputPath,
        ];
    }

    return [
        "-y",
        "-i",
        input.videoPath,
        "-i",
        input.voicePath,
        "-filter_complex",
        `[0:a]volume=${originalVolume.toFixed(3)}[original];[1:a]volume=${voiceVolume.toFixed(3)}[voice];[original][voice]amix=inputs=2:duration=longest:dropout_transition=0[aout]`,
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-c:v",
        "copy",
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
    const spawnImpl = dubbingFfmpegSpawnForTest ?? spawn;

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

export async function muxDubbedVideo(input: {
    videoBytes: Uint8Array;
    voiceBytes: Uint8Array;
    fileName: string;
    originalAudioVolume: number;
    voiceVolume: number;
}) {
    const workDir = path.join(tmpdir(), `omnivideo-dubbing-${randomUUID()}`);
    const inputPath = path.join(workDir, input.fileName || "source.mp4");
    const voicePath = path.join(workDir, "voice.wav");
    const outputPath = path.join(workDir, "dubbed.mp4");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(inputPath, input.videoBytes);
        await writeFile(voicePath, input.voiceBytes);
        await runFfmpeg(
            buildDubbedVideoFfmpegArgs({
                videoPath: inputPath,
                voicePath,
                outputPath,
                originalAudioVolume: input.originalAudioVolume,
                voiceVolume: input.voiceVolume,
            }),
        );

        return dubbingReadFileForTest
            ? await dubbingReadFileForTest(outputPath)
            : await readFile(outputPath);
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            error instanceof Error
                ? error.message
                : "Video dubbing mux failed.",
            500,
        );
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export async function runVideoDubbing(
    input: VideoDubbingInput,
): Promise<VideoDubbingResult> {
    const startedAt = Date.now();
    if (!input.fileBytes || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "A source video file is required for video dubbing.",
            400,
        );
    }

    const processedSource = await preprocessVideoSpeed({
        fileName: input.fileName,
        fileBytes: input.fileBytes,
        speedFactor: input.videoSpeedFactor ?? 1,
    });

    const transcript = await runChineseVideoTranscription({
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileSizeBytes: processedSource.fileBytes.byteLength,
        fileBytes: new Uint8Array(processedSource.fileBytes),
        language: input.language,
        prompt: input.prompt,
        includeWordTimestamps: input.includeWordTimestamps,
        videoSpeedFactor: 1,
    });
    const translation = await translateTranscriptSegments({
        segments: transcript.segments,
        sourceLanguage: input.sourceLanguage ?? transcript.language,
        targetLanguage: input.targetLanguage ?? "vi",
        model: input.model ?? DEFAULT_TRANSLATION_MODEL,
        apiKey: input.apiKey,
        baseUrl: input.baseUrl,
        providerName: input.providerName,
    });
    const voice = await generateVoiceFromSegments({
        segments: buildVideoDubbingVoiceSegments({ transcript, translation }),
        settings: {
            ...DEFAULT_PIPER_TTS_SETTINGS,
            ...input.ttsSettings,
            preserveTimestampGaps:
                input.ttsSettings?.preserveTimestampGaps ??
                DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps,
        },
    });
    const originalAudioVolume = normalizeVolume(
        input.originalAudioVolume,
        0.1,
    );
    const voiceVolume = normalizeVolume(input.voiceVolume, 1);
    const videoBytes = await muxDubbedVideo({
        videoBytes: new Uint8Array(processedSource.fileBytes),
        voiceBytes: Buffer.from(voice.audioBase64, "base64"),
        fileName: input.fileName,
        originalAudioVolume,
        voiceVolume,
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
        mix: {
            originalAudioVolume,
            voiceVolume,
            mode: "duck-original",
        },
    };
}
