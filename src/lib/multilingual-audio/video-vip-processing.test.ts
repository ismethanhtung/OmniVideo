import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChineseTranscriptionError } from "./types";
import {
    assertRemoteVipWorkerAvailable,
    runRemoteVideoVipRender,
    runRemoteVideoVipVoiceRender,
} from "@/lib/multilingual-audio/remote-vip-worker";
import {
    buildFfmpegExitErrorMessage,
    buildVipFinalRenderArgs,
    planVipParallelRenderChunks,
    resolveVipRenderChunkCount,
    resolveVipRenderThreadCount,
    resolveVipRenderTimeoutMs,
    runVideoVipProcessing,
    shiftTranslatedSegmentsForRender,
} from "./video-vip-processing";
import { buildSubtitleAssContent } from "@/lib/video-processing/video-edit-pipeline";

vi.mock("@/lib/multilingual-audio/remote-vip-worker", () => ({
    assertRemoteVipWorkerAvailable: vi.fn(),
    runRemoteVideoVipRender: vi.fn(),
    runRemoteVideoVipVoiceRender: vi.fn(),
}));

const mockedAssertRemoteVipWorkerAvailable = vi.mocked(
    assertRemoteVipWorkerAvailable,
);
const mockedRunRemoteVideoVipRender = vi.mocked(runRemoteVideoVipRender);
const mockedRunRemoteVideoVipVoiceRender = vi.mocked(
    runRemoteVideoVipVoiceRender,
);

const checkpointDirs: string[] = [];

async function createCheckpointDir() {
    const dir = await mkdtemp(path.join(tmpdir(), "vip-checkpoint-test-"));
    checkpointDirs.push(dir);
    return dir;
}

function createStageRunners(overrides?: {
    render?: () => Promise<Buffer>;
    metadata?: () => Promise<{
        title: string;
        description: string;
        hashtags: string[];
        model: string;
        provider: { name: string };
    }>;
}) {
    return {
        transcribe: vi.fn(async () => ({
            text: "你好",
            language: "zh",
            model: "whisper-large-v3-turbo",
            segments: [{ id: 0, start: 0, end: 1, text: "你好" }],
            words: [],
            source: { fileName: "source.mp4", fileSizeBytes: 3 },
            audio: {
                format: "mp3",
                sampleRate: 16000,
                channels: 1,
                bitrateKbps: 64,
                fileSizeBytes: 3,
            },
            steps: [],
            provider: { name: "groq" as const },
        })),
        translate: vi.fn(async () => ({
            sourceLanguage: "zh",
            targetLanguage: "vi",
            model: "test-model",
            translatedSegments: [
                {
                    id: 0,
                    start: 0,
                    end: 1,
                    sourceText: "你好",
                    translatedText: "Xin chào",
                },
            ],
            generationDurationMs: 1,
            chunks: [],
            provider: { name: "test" },
        })),
        generateVoice: vi.fn(async () => ({
            audioBase64: Buffer.from("voice").toString("base64"),
            mimeType: "audio/wav",
            extension: "wav",
            fileName: "voice.wav",
            byteLength: 5,
            segmentCount: 1,
            generationDurationMs: 1,
            alignment: {
                mode: "timeline" as const,
                chunks: 1,
                targetDurationSeconds: 1,
            },
            settings: { binaryPath: "piper", modelPath: "" },
            provider: { name: "piper" as const, mode: "local-cli" as const },
        })),
        render: vi.fn(overrides?.render ?? (async () => Buffer.from("video"))),
        generateMetadata: vi.fn(
            overrides?.metadata ??
                (async () => ({
                    title: "Tiêu đề",
                    description: "Mô tả",
                    hashtags: ["review"],
                    model: "test-model",
                    provider: { name: "test" },
                })),
        ),
    };
}

describe("VIP final render filter order", () => {
    afterEach(() => {
        delete process.env.OMNIVIDEO_VIP_RENDER_PRESET;
        delete process.env.OMNIVIDEO_VIP_RENDER_CHUNKS;
        delete process.env.OMNIVIDEO_VIP_RENDER_THREADS;
        delete process.env.OMNIVIDEO_VIP_RENDER_TIMEOUT_MS;
    });

    it("applies blur before mirror and subtitles after mirror", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 0.8,
            mirrorEnabled: true,
            blurRegions: [
                {
                    region: { x: 10, y: 20, width: 30, height: 12 },
                    timeline: { start: 1, end: 3 },
                    strength: 50,
                },
            ],
            originalAudioVolume: 0.1,
            voiceVolume: 1,
            renderPreset: "veryfast",
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(args).toEqual(expect.arrayContaining(["-preset", "veryfast"]));
        expect(filter.indexOf("setpts=1.25*PTS[basev]")).toBeLessThan(
            filter.indexOf("boxblur"),
        );
        expect(filter.indexOf("boxblur")).toBeLessThan(
            filter.indexOf("hflip[mirroredv]"),
        );
        expect(filter.indexOf("hflip[mirroredv]")).toBeLessThan(
            filter.indexOf("ass='/tmp/subtitles.ass'[subv]"),
        );
        expect(filter).toContain(
            "overlay=x=main_w*0.100000:y=main_h*0.200000",
        );
    });

    it("applies cover boxes before mirror and text overlay after subtitles", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            textOverlayAssPath: "/tmp/text-overlays.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: true,
            blurRegions: [],
            coverBoxes: [
                {
                    region: { x: 0, y: 82, width: 100, height: 14 },
                    timeline: { start: 0, end: 36000 },
                    color: "#000000",
                    opacity: 65,
                },
            ],
            originalAudioVolume: 0.1,
            voiceVolume: 1,
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(args).toEqual(expect.arrayContaining(["-preset", "veryfast"]));
        expect(filter).toContain("drawbox=x=iw*0.000000:y=ih*0.820000");
        expect(filter).toContain("color=0x000000@0.65:t=fill");
        expect(filter).not.toContain("boxblur");
        expect(filter.indexOf("drawbox")).toBeLessThan(
            filter.indexOf("hflip[mirroredv]"),
        );
        expect(filter.indexOf("ass='/tmp/subtitles.ass'[subv]")).toBeLessThan(
            filter.indexOf("ass='/tmp/text-overlays.ass'[vout]"),
        );
    });

    it("defaults to veryfast preset and explicit render threads when render preset is not provided", () => {
        process.env.OMNIVIDEO_VIP_RENDER_THREADS = "4";
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: true,
            blurRegions: [],
            originalAudioVolume: 0,
            voiceVolume: 1,
        });

        expect(args).toEqual(
            expect.arrayContaining([
                "-filter_complex_threads",
                "4",
                "-preset",
                "veryfast",
                "-threads",
                "4",
            ]),
        );
    });

    it("falls back to veryfast preset when render preset is invalid", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: true,
            blurRegions: [],
            originalAudioVolume: 0,
            voiceVolume: 1,
            renderPreset: "not-real" as unknown as "superfast",
        });

        expect(args).toEqual(expect.arrayContaining(["-preset", "veryfast"]));
    });

    it("uses env overrides for render preset, threads, and timeout", () => {
        process.env.OMNIVIDEO_VIP_RENDER_PRESET = "superfast";
        process.env.OMNIVIDEO_VIP_RENDER_THREADS = "2";
        process.env.OMNIVIDEO_VIP_RENDER_CHUNKS = "2";
        process.env.OMNIVIDEO_VIP_RENDER_TIMEOUT_MS = "90000";

        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: true,
            blurRegions: [],
            originalAudioVolume: 0,
            voiceVolume: 1,
            renderPreset: "not-real" as unknown as "superfast",
        });

        expect(args).toEqual(expect.arrayContaining(["-preset", "superfast"]));
        expect(resolveVipRenderThreadCount()).toBe(2);
        expect(resolveVipRenderChunkCount()).toBe(2);
        expect(resolveVipRenderTimeoutMs()).toBe(90000);
    });

    it("plans parallel render chunks only for long enough media", () => {
        expect(
            planVipParallelRenderChunks({
                durationSeconds: 90,
                requestedChunks: 4,
                minChunkDurationSeconds: 30,
            }),
        ).toEqual([
            { index: 0, startSeconds: 0, durationSeconds: 30 },
            { index: 1, startSeconds: 30, durationSeconds: 30 },
            { index: 2, startSeconds: 60, durationSeconds: 30 },
        ]);
        expect(
            planVipParallelRenderChunks({
                durationSeconds: 20,
                requestedChunks: 4,
                minChunkDurationSeconds: 30,
            }),
        ).toEqual([]);
    });

    it("builds chunk render args with input seeks and shifted timelines", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles-1.ass",
            outputPath: "/tmp/chunk-1.mp4",
            speedFactor: 0.8,
            mirrorEnabled: true,
            blurRegions: [
                {
                    region: { x: 0, y: 84, width: 100, height: 16 },
                    timeline: { start: 50, end: 120 },
                    strength: 50,
                },
            ],
            coverBoxes: [
                {
                    region: { x: 0, y: 82, width: 100, height: 14 },
                    timeline: { start: 40, end: 85 },
                    color: "#000000",
                    opacity: 65,
                },
            ],
            originalAudioVolume: 0.2,
            voiceVolume: 1,
            renderThreads: 1,
            sourceStartSeconds: 48,
            sourceDurationSeconds: 24,
            voiceStartSeconds: 60,
            voiceDurationSeconds: 30,
            timelineOffsetSeconds: 60,
            timelineDurationSeconds: 30,
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(args.slice(0, 14)).toEqual([
            "-y",
            "-filter_threads",
            "1",
            "-filter_complex_threads",
            "1",
            "-ss",
            "48",
            "-t",
            "24",
            "-i",
            "/tmp/source.mp4",
            "-ss",
            "60",
            "-t",
        ]);
        expect(args).toEqual(expect.arrayContaining(["-i", "/tmp/voice.wav"]));
        expect(filter).toContain("between(t,0.000,30.000)");
        expect(filter).toContain("between(t,0.000,25.000)");
    });

    it("shifts speechEnd to chunk-local time for parallel subtitle renders", () => {
        const shifted = shiftTranslatedSegmentsForRender(
            [
                {
                    id: 1,
                    start: 30,
                    end: 35,
                    sourceText: "source",
                    translatedText: "mot hai",
                    speechEnd: 42,
                },
                {
                    id: 2,
                    start: 25,
                    end: 28,
                    sourceText: "tail",
                    translatedText: "ba bon",
                    speechEnd: 33,
                },
            ],
            { offsetSeconds: 30, durationSeconds: 30 },
        );

        expect(shifted).toEqual([
            expect.objectContaining({
                id: 1,
                start: 0,
                end: 5,
                speechEnd: 12,
            }),
            expect.objectContaining({
                id: 2,
                start: 0,
                end: 3,
                speechEnd: 3,
            }),
        ]);

        const ass = buildSubtitleAssContent(shifted, {
            subtitleMode: "standard",
        });

        expect(ass).toContain("Dialogue: 1,0:00:00.00,0:00:12.00");
        expect(ass).toContain("Dialogue: 1,0:00:00.00,0:00:03.00");
        expect(ass).not.toContain("0:00:42.00");
        expect(ass).not.toContain("0:00:33.00");
    });

    it("skips source audio decode and amix when original audio is muted", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 0.8,
            mirrorEnabled: true,
            blurRegions: [],
            originalAudioVolume: 0,
            voiceVolume: 1,
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(filter).not.toContain("[0:a]");
        expect(filter).not.toContain("amix=");
        expect(filter).toContain("[1:a]anull[aout]");
    });

    it("keeps source audio speed and mix when original audio is audible", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 0.8,
            mirrorEnabled: true,
            blurRegions: [],
            originalAudioVolume: 0.2,
            voiceVolume: 1,
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(filter).toContain("[0:a]atempo=0.8,volume=0.200[orig]");
        expect(filter).toContain(
            "[orig][voice]amix=inputs=2:duration=longest:dropout_transition=0[aout]",
        );
    });

    it("mixes repeat and scheduled background music tracks into VIP audio", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: false,
            blurRegions: [],
            originalAudioVolume: 0,
            voiceVolume: 1,
            timelineDurationSeconds: 360,
            backgroundMusic: {
                enabled: true,
                volume: 0.25,
                tracks: [
                    {
                        source: "/musics/one.mp3",
                        label: "One",
                        filePath: "/tmp/music-one.mp3",
                        startSeconds: 0,
                        volume: 1,
                        repeat: true,
                    },
                    {
                        source: "/musics/two.mp3",
                        label: "Two",
                        filePath: "/tmp/music-two.mp3",
                        startSeconds: 300,
                        volume: 0.5,
                        repeat: false,
                    },
                    {
                        source: "/musics/late.mp3",
                        label: "Late",
                        filePath: "/tmp/music-late.mp3",
                        startSeconds: 500,
                        volume: 1,
                        repeat: false,
                    },
                ],
            },
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(args).toEqual(
            expect.arrayContaining([
                "-stream_loop",
                "-1",
                "-i",
                "/tmp/music-one.mp3",
                "-i",
                "/tmp/music-two.mp3",
            ]),
        );
        expect(filter).toContain(
            "[2:a]atrim=duration=360.000,asetpts=PTS-STARTPTS,volume=0.250[music0]",
        );
        expect(filter).toContain(
            "[3:a]atrim=duration=60.000,asetpts=PTS-STARTPTS,volume=0.125,adelay=300000|300000[music1]",
        );
        expect(filter).toContain(
            "[voice][music0][music1]amix=inputs=3:duration=first:dropout_transition=0:normalize=0[aout]",
        );
        expect(filter).not.toContain("adelay=0");
        expect(filter).not.toContain(":all=1");
        expect(args).not.toContain("/tmp/music-late.mp3");
    });

    it("anchors background music mixes to voice even when source audio is audible", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: false,
            blurRegions: [],
            originalAudioVolume: 0.2,
            voiceVolume: 1,
            timelineDurationSeconds: 30,
            backgroundMusic: {
                enabled: true,
                volume: 0.25,
                tracks: [
                    {
                        source: "/musics/one.mp3",
                        label: "One",
                        filePath: "/tmp/music-one.mp3",
                        startSeconds: 0,
                        volume: 1,
                        repeat: true,
                    },
                ],
            },
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(filter).toContain("[0:a]volume=0.200[orig]");
        expect(filter).toContain(
            "[voice][orig][music0]amix=inputs=3:duration=first:dropout_transition=0:normalize=0[aout]",
        );
    });

    it("includes stderr tail when formatting ffmpeg render failures", () => {
        const message = buildFfmpegExitErrorMessage({
            code: 1,
            stderr: [
                "Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'source.mp4':",
                "[AVFilterGraph @ 0x123] No such filter: 'broken_filter'",
                "Error initializing complex filters.",
                "Conversion failed!",
            ].join("\n"),
        });

        expect(message).toContain("ffmpeg exited with code 1: Conversion failed!");
        expect(message).toContain("ffmpeg stderr tail:");
        expect(message).toContain("No such filter: 'broken_filter'");
    });

    it("passes fontsdir to ass filters when subtitle fonts dir is provided", () => {
        const args = buildVipFinalRenderArgs({
            videoPath: "/tmp/source.mp4",
            voicePath: "/tmp/voice.wav",
            subtitleAssPath: "/tmp/subtitles.ass",
            subtitleFontsDir: "/tmp/fonts",
            textOverlayAssPath: "/tmp/text-overlays.ass",
            outputPath: "/tmp/output.mp4",
            speedFactor: 1,
            mirrorEnabled: false,
            blurRegions: [],
            originalAudioVolume: 0.2,
            voiceVolume: 1,
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(filter).toContain("ass='/tmp/subtitles.ass':fontsdir='/tmp/fonts'[subv]");
        expect(filter).toContain(
            "ass='/tmp/text-overlays.ass':fontsdir='/tmp/fonts'[vout]",
        );
    });
});

describe("VIP processing stage checkpoints", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
        mockedRunRemoteVideoVipRender.mockReset();
        mockedRunRemoteVideoVipVoiceRender.mockReset();
    });

    afterEach(async () => {
        vi.restoreAllMocks();
        await Promise.all(
            checkpointDirs.splice(0).map((dir) =>
                rm(dir, { recursive: true, force: true }),
            ),
        );
    });

    it("resumes from saved transcript, translation, and voice checkpoints after a render failure", async () => {
        const checkpointDir = await createCheckpointDir();
        const checkpointKey = "workspace-vip:test";
        const firstRunners = createStageRunners({
            render: async () => {
                throw new ChineseTranscriptionError(
                    "SYS_DUBBING_MUX_FAILED",
                    "render failed",
                    500,
                );
            },
        });

        await expect(
            runVideoVipProcessing({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                checkpointKey,
                checkpointDir,
                stageRunners: firstRunners,
                omitVideoBase64: true,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
            checkpoint: {
                failedStage: "render",
                savedStages: ["transcript", "translation", "voice"],
                reusableStages: ["transcript", "translation", "voice"],
            },
        });

        expect(firstRunners.transcribe).toHaveBeenCalledTimes(1);
        expect(firstRunners.transcribe).toHaveBeenCalledWith(
            expect.objectContaining({
                overlongSegmentRetryMode: "best-effort",
            }),
        );
        expect(firstRunners.translate).toHaveBeenCalledTimes(1);
        expect(firstRunners.generateVoice).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith(
            "[VIP]",
            expect.objectContaining({
                event: "stage-start",
                stage: "translation",
                segmentCount: 1,
            }),
        );
        expect(console.log).toHaveBeenCalledWith(
            "[VIP]",
            expect.objectContaining({
                event: "stage-success",
                stage: "translation",
                translatedCount: 1,
            }),
        );
        expect(console.log).toHaveBeenCalledWith(
            "[VIP]",
            expect.objectContaining({
                event: "stage-failed",
                stage: "render",
                error: expect.objectContaining({
                    code: "SYS_DUBBING_MUX_FAILED",
                    message: "render failed",
                }),
            }),
        );

        const secondRunners = createStageRunners();
        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            checkpointKey,
            checkpointDir,
            stageRunners: secondRunners,
            omitVideoBase64: true,
        });

        expect(secondRunners.transcribe).not.toHaveBeenCalled();
        expect(secondRunners.translate).not.toHaveBeenCalled();
        expect(secondRunners.generateVoice).not.toHaveBeenCalled();
        expect(secondRunners.render).toHaveBeenCalledTimes(1);
        expect(secondRunners.generateMetadata).toHaveBeenCalledTimes(1);
        expect(result.checkpoint?.reusedStages).toEqual([
            "transcript",
            "translation",
            "voice",
        ]);
        expect(result.checkpoint?.savedStages).toEqual(["render", "metadata"]);
        expect(result.byteLength).toBe(5);
    });

    it("invalidates checkpoints when VIP input settings change", async () => {
        const checkpointDir = await createCheckpointDir();
        const checkpointKey = "workspace-vip:fingerprint";
        const firstRunners = createStageRunners();
        await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            checkpointKey,
            checkpointDir,
            videoSpeedFactor: 1,
            stageRunners: firstRunners,
            omitVideoBase64: true,
        });

        const secondRunners = createStageRunners();
        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            checkpointKey,
            checkpointDir,
            videoSpeedFactor: 0.7,
            stageRunners: secondRunners,
            omitVideoBase64: true,
        });

        expect(secondRunners.transcribe).toHaveBeenCalledTimes(1);
        expect(secondRunners.translate).toHaveBeenCalledTimes(1);
        expect(result.checkpoint?.reusedStages).toEqual([]);
    });

    it("uses imported translation lines without calling AI translate runner", async () => {
        const runners = createStageRunners();
        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            translationMode: "import",
            importedTranslationLines: ["Xin chào"],
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(runners.transcribe).toHaveBeenCalledTimes(1);
        expect(runners.translate).not.toHaveBeenCalled();
        expect(result.fileName).toBe("source-done.mp4");
        expect(result.translation.provider.name).toBe("manual-import");
        expect(result.translation.translatedSegments).toEqual([
            expect.objectContaining({
                sourceText: "你好",
                translatedText: "Xin chào",
            }),
        ]);
    });

    it("uses transcript override and imported translation for corrected reruns", async () => {
        const runners = createStageRunners();
        const transcriptOverride = {
            text: "你好",
            language: "zh",
            model: "whisper-large-v3-turbo" as const,
            segments: [{ id: 0, start: 0, end: 1, text: "你好" }],
            words: [],
            source: { fileName: "source.mp4", fileSizeBytes: 3 },
            audio: {
                format: "mp3" as const,
                sampleRate: 16000,
                channels: 1,
                bitrateKbps: 64,
                fileSizeBytes: 3,
            },
            steps: [],
            provider: { name: "groq" as const },
        };

        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            transcriptOverride,
            translationMode: "import",
            importedTranslationLines: ["Nàng đẹp quá"],
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(runners.transcribe).not.toHaveBeenCalled();
        expect(runners.translate).not.toHaveBeenCalled();
        expect(runners.generateVoice).toHaveBeenCalledWith(
            expect.objectContaining({
                segments: [
                    expect.objectContaining({
                        text: "Nàng đẹp quá",
                    }),
                ],
            }),
        );
        expect(result.translation.provider.name).toBe("manual-import");
        expect(result.translation.translatedSegments[0].translatedText).toBe(
            "Nàng đẹp quá",
        );
        expect(console.log).toHaveBeenCalledWith(
            "[VIP]",
            expect.objectContaining({
                event: "stage-start",
                stage: "transcript",
                override: true,
            }),
        );
        expect(console.log).toHaveBeenCalledWith(
            "[VIP]",
            expect.objectContaining({
                event: "stage-success",
                stage: "transcript",
                source: "override",
            }),
        );
    });

    it("applies VIP rate limits to translation and metadata without changing transcript", async () => {
        const runners = createStageRunners();
        const translationRateLimit = {
            key: "ai-provider:translation",
            rpm: 14,
        };
        const metadataRateLimit = {
            key: "ai-provider:metadata",
            rpm: 14,
        };

        await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            apiKey: "provider-key",
            baseUrl: "https://provider.example/v1",
            providerName: "Provider One",
            translationRateLimit,
            metadataApiKey: "metadata-key",
            metadataBaseUrl: "https://metadata.example/v1",
            metadataProviderName: "Metadata Provider",
            metadataRateLimit,
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(runners.transcribe).toHaveBeenCalledWith(
            expect.not.objectContaining({
                transcriptionApiKey: expect.any(String),
                transcriptionRateLimit: expect.anything(),
            }),
        );
        expect(runners.translate).toHaveBeenCalledWith(
            expect.objectContaining({
                apiKey: "provider-key",
                baseUrl: "https://provider.example/v1",
                providerName: "Provider One",
                rateLimit: translationRateLimit,
            }),
        );
        expect(runners.generateMetadata).toHaveBeenCalledWith(
            expect.objectContaining({
                apiKey: "metadata-key",
                baseUrl: "https://metadata.example/v1",
                providerName: "Metadata Provider",
                rateLimit: metadataRateLimit,
            }),
        );
    });

    it("prefers sourceTitle over technical fileName for output naming", async () => {
        const runners = createStageRunners();
        const result = await runVideoVipProcessing({
            fileName: "part-001.mp4",
            sourceTitle: "My Original Video",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(result.fileName).toBe("My-Original-Video-done.mp4");
    });

    it("sanitizes accented and punctuated source titles for output naming", async () => {
        const runners = createStageRunners();
        const result = await runVideoVipProcessing({
            fileName: "part-001.mp4",
            sourceTitle:
                "Review Full: Thanh mai trúc mã thích bạn thân, cô ấy đền bù anh trai cho tôi",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(result.fileName).toBe(
            "Review-Full-Thanh-mai-truc-ma-thich-ban-than-co-ay-den-bu-anh-trai-cho-toi-done.mp4",
        );
        expect(result.fileName.replace(/\.mp4$/u, "")).toMatch(
            /^[a-zA-Z0-9-]+$/u,
        );
    });

    it("fails import mode when line count does not match transcript segment count", async () => {
        const runners = createStageRunners();
        await expect(
            runVideoVipProcessing({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                translationMode: "import",
                importedTranslationLines: ["Xin chào", "Dư dòng"],
                stageRunners: runners,
                omitVideoBase64: true,
            }),
        ).rejects.toMatchObject({
            code: "VAL_TRANSLATION_SEGMENT_COUNT_MISMATCH",
            status: 422,
            manualTranslationPrompt: expect.objectContaining({
                expectedSegmentCount: 1,
                actualSegmentCount: 2,
            }),
        });
        expect(runners.translate).not.toHaveBeenCalled();
    });

    it("preserves subtitle timing alignment with voice segments without delaying overlapping segments", async () => {
        const runners = createStageRunners();
        runners.transcribe = vi.fn(async () => ({
            text: "你好 世界",
            language: "zh",
            model: "whisper-large-v3-turbo",
            segments: [
                { id: 1, start: 0, end: 3, text: "你好" },
                { id: 2, start: 2, end: 4, text: "世界" },
            ],
            words: [],
            source: { fileName: "source.mp4", fileSizeBytes: 3 },
            audio: {
                format: "mp3",
                sampleRate: 16000,
                channels: 1,
                bitrateKbps: 64,
                fileSizeBytes: 3,
            },
            steps: [],
            provider: { name: "groq" as const },
        }));
        runners.translate = vi.fn(async () => ({
            sourceLanguage: "zh",
            targetLanguage: "vi",
            model: "test-model",
            translatedSegments: [
                {
                    id: 1,
                    start: 0,
                    end: 3,
                    sourceText: "你好",
                    translatedText: "xin chào",
                },
                {
                    id: 2,
                    start: 2,
                    end: 4,
                    sourceText: "世界",
                    translatedText: "thế giới",
                },
            ],
            generationDurationMs: 1,
            chunks: [],
            provider: { name: "test" },
        }));

        await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(runners.render).toHaveBeenCalledTimes(1);
        const renderInput = vi.mocked(runners.render).mock.calls[0][0];
        expect(renderInput.translatedSegments).toHaveLength(2);
        expect(renderInput.translatedSegments[1].start).toBe(2);
    });

    it("uses current VIP speed and original-volume defaults when omitted", async () => {
        const runners = createStageRunners();

        await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            stageRunners: runners,
            omitVideoBase64: true,
        });

        const renderInput = vi.mocked(runners.render).mock.calls[0][0];
        expect(renderInput.speedFactor).toBe(0.75);
        expect(renderInput.originalAudioVolume).toBe(0);
        expect(renderInput.voiceVolume).toBe(1);
    });

    it("generates voice locally and delegates only render in remote mode", async () => {
        mockedRunRemoteVideoVipRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("remote-video"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 12,
            generationDurationMs: 9,
            stages: { finalRenderDurationMs: 8 },
            mix: { originalAudioVolume: 0, voiceVolume: 1 },
        });
        const runners = createStageRunners();

        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            voiceRenderExecutionMode: "remote",
            remoteVoiceRenderEndpoint: "http://worker.example",
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(runners.generateVoice).toHaveBeenCalledTimes(1);
        expect(runners.render).not.toHaveBeenCalled();
        expect(mockedRunRemoteVideoVipRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: new Uint8Array([1, 2, 3]),
                voiceAudioBase64: Buffer.from("voice").toString("base64"),
                translatedSegments: [
                    expect.objectContaining({
                        translatedText: "Xin chào",
                    }),
                ],
                omitVideoBase64: true,
            }),
            expect.objectContaining({
                endpoint: "http://worker.example",
            }),
        );
        expect(result.videoBytes?.toString()).toBe("remote-video");
        expect(result.voice.byteLength).toBe(5);
    });

    it("delegates Piper voice and render to EC2 in remote voice/render mode", async () => {
        mockedRunRemoteVideoVipVoiceRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("remote-voice-render-video"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-done.mp4",
            byteLength: 25,
            generationDurationMs: 20,
            voice: {
                mimeType: "audio/wav",
                extension: "wav",
                fileName: "voice.wav",
                byteLength: 11,
                segmentCount: 1,
                generationDurationMs: 7,
                alignment: {
                    mode: "timeline",
                    chunks: 1,
                    targetDurationSeconds: 1,
                },
                settings: { binaryPath: "piper", modelPath: "" },
                provider: { name: "piper", mode: "local-cli" },
            },
            stages: { voiceDurationMs: 7, finalRenderDurationMs: 8 },
            mix: { originalAudioVolume: 0, voiceVolume: 1 },
        });
        const runners = createStageRunners();

        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            voiceRenderExecutionMode: "remote-voice-render",
            remoteVoiceRenderEndpoint: "http://worker.example",
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(mockedAssertRemoteVipWorkerAvailable).toHaveBeenCalledWith(
            expect.objectContaining({
                endpoint: "http://worker.example",
            }),
        );
        expect(runners.generateVoice).not.toHaveBeenCalled();
        expect(runners.render).not.toHaveBeenCalled();
        expect(mockedRunRemoteVideoVipRender).not.toHaveBeenCalled();
        expect(mockedRunRemoteVideoVipVoiceRender).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileBytes: new Uint8Array([1, 2, 3]),
                transcript: expect.objectContaining({ text: "你好" }),
                translation: expect.objectContaining({
                    translatedSegments: [
                        expect.objectContaining({
                            translatedText: "Xin chào",
                        }),
                    ],
                }),
                omitVideoBase64: true,
            }),
            expect.objectContaining({
                endpoint: "http://worker.example",
            }),
        );
        expect(result.videoBytes?.toString()).toBe("remote-voice-render-video");
        expect(result.voice.byteLength).toBe(11);
        expect(result.stages.voiceDurationMs).toBe(7);
        expect(result.stages.finalRenderDurationMs).toBe(8);
    });

    it("persists remote worker upload progress in VIP checkpoints", async () => {
        mockedAssertRemoteVipWorkerAvailable.mockResolvedValueOnce(undefined);
        mockedRunRemoteVideoVipVoiceRender.mockImplementationOnce(
            async (_input, options) => {
                await options.onProgress?.({
                    phase: "start-upload-progress",
                    uploadedBytes: 2,
                    totalBytes: 3,
                    percent: 67,
                    message: "Uploading source video to remote VIP worker.",
                });
                return {
                    videoBytes: Buffer.from("remote-voice-render-video"),
                    mimeType: "video/mp4",
                    extension: "mp4",
                    fileName: "source-done.mp4",
                    byteLength: 25,
                    generationDurationMs: 20,
                    voice: {
                        mimeType: "audio/wav",
                        extension: "wav",
                        fileName: "voice.wav",
                        byteLength: 11,
                        segmentCount: 1,
                        generationDurationMs: 7,
                        alignment: {
                            mode: "timeline",
                            chunks: 1,
                            targetDurationSeconds: 1,
                        },
                        settings: { binaryPath: "piper", modelPath: "" },
                        provider: { name: "piper", mode: "local-cli" },
                    },
                    stages: { voiceDurationMs: 7, finalRenderDurationMs: 8 },
                    mix: { originalAudioVolume: 0, voiceVolume: 1 },
                };
            },
        );
        const checkpointDir = await createCheckpointDir();
        const runners = createStageRunners();

        await runVideoVipProcessing({
            fileName: "source.mp4",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            voiceRenderExecutionMode: "remote-voice-render",
            remoteVoiceRenderEndpoint: "http://worker.example",
            checkpointKey: "workspace-vip:remote-progress",
            checkpointDir,
            stageRunners: runners,
            omitVideoBase64: true,
        });

        const [checkpointKeyDir] = await readdir(checkpointDir);
        const checkpoint = JSON.parse(
            await readFile(
                path.join(checkpointDir, checkpointKeyDir, "checkpoint.json"),
                "utf8",
            ),
        );
        expect(checkpoint.remoteWorker).toMatchObject({
            phase: "start-upload-progress",
            uploadedBytes: 2,
            totalBytes: 3,
            percent: 67,
            message: "Uploading source video to remote VIP worker.",
        });
    });

    it("uses local sanitized output name when stale EC2 worker returns generic filename", async () => {
        mockedRunRemoteVideoVipVoiceRender.mockResolvedValueOnce({
            videoBytes: Buffer.from("remote-voice-render-video"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "omnivideo-vip-done.mp4",
            byteLength: 25,
            generationDurationMs: 20,
            voice: {
                mimeType: "audio/wav",
                extension: "wav",
                fileName: "voice.wav",
                byteLength: 11,
                segmentCount: 1,
                generationDurationMs: 7,
                alignment: {
                    mode: "timeline",
                    chunks: 1,
                    targetDurationSeconds: 1,
                },
                settings: { binaryPath: "piper", modelPath: "" },
                provider: { name: "piper", mode: "local-cli" },
            },
            stages: { voiceDurationMs: 7, finalRenderDurationMs: 8 },
            mix: { originalAudioVolume: 0, voiceVolume: 1 },
        });
        const runners = createStageRunners();

        const result = await runVideoVipProcessing({
            fileName: "source.mp4",
            sourceTitle:
                "Review Full: Thanh mai trúc mã thích bạn thân, cô ấy đền bù anh trai cho tôi",
            fileSizeBytes: 3,
            fileBytes: new Uint8Array([1, 2, 3]),
            voiceRenderExecutionMode: "remote-voice-render",
            remoteVoiceRenderEndpoint: "http://worker.example",
            stageRunners: runners,
            omitVideoBase64: true,
        });

        expect(result.fileName).toBe(
            "Review-Full-Thanh-mai-truc-ma-thich-ban-than-co-ay-den-bu-anh-trai-cho-toi-done.mp4",
        );
    });

    it("checks remote worker before transcript work in remote voice/render mode", async () => {
        mockedAssertRemoteVipWorkerAvailable.mockRejectedValueOnce(
            new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                "Remote VIP worker preflight failed.",
                502,
            ),
        );
        const runners = createStageRunners();

        await expect(
            runVideoVipProcessing({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                fileBytes: new Uint8Array([1, 2, 3]),
                voiceRenderExecutionMode: "remote-voice-render",
                remoteVoiceRenderEndpoint: "http://worker.example",
                stageRunners: runners,
                omitVideoBase64: true,
            }),
        ).rejects.toMatchObject({
            code: "SYS_DUBBING_MUX_FAILED",
        });

        expect(runners.transcribe).not.toHaveBeenCalled();
        expect(mockedRunRemoteVideoVipVoiceRender).not.toHaveBeenCalled();
    });
});
