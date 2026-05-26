import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChineseTranscriptionError } from "./types";
import {
    buildVipFinalRenderArgs,
    runVideoVipProcessing,
} from "./video-vip-processing";

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
        });
        const filter = args[args.indexOf("-filter_complex") + 1] ?? "";

        expect(args).toEqual(expect.arrayContaining(["-preset", "superfast"]));
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

        expect(args).toEqual(expect.arrayContaining(["-preset", "superfast"]));
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
});

describe("VIP processing stage checkpoints", () => {
    beforeEach(() => {
        vi.spyOn(console, "log").mockImplementation(() => {});
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
});
