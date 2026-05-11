import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPiperBatchArgs,
  buildPiperArgs,
  buildAtempoFilterChain,
  buildTimelineAlignmentChunk,
  generateVoiceFromSegments,
  generatePiperSpeech,
  resolvePiperBinaryPath,
  setPiperFfmpegRunnerForTest,
  setPiperFileExistsForTest,
  setPiperReadFileForTest,
  setPiperSpawnForTest,
  splitTextForPiperSynthesis,
  validatePiperTtsInput,
  validatePiperRuntimeFiles,
  validateVoiceSegments,
} from "./piper-tts";

function createMockSpawn(output = "wav-bytes", exitCode = 0) {
  return vi.fn((_command: string, args: string[]) => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      kill: ReturnType<typeof vi.fn>;
    };
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = vi.fn();

    setTimeout(() => {
      if (exitCode !== 0) child.stderr.write("piper failed");
      const inputPathIndex = args.indexOf("--input_file");
      const outputDirIndex = args.indexOf("--output_dir");
      const inputPath =
        inputPathIndex >= 0 ? args[inputPathIndex + 1] : undefined;
      const outputDir =
        outputDirIndex >= 0 ? args[outputDirIndex + 1] : undefined;
      if (inputPath && outputDir) {
        const lineCount = readFileSync(inputPath, "utf8")
          .split(/\r?\n/u)
          .filter(Boolean).length;
        for (let index = 0; index < lineCount; index += 1) {
          child.stderr.write(`INFO:__main__:Wrote ${outputDir}/${index}.wav\n`);
        }
      }
      child.stdout.write(Buffer.from(output));
      child.emit("close", exitCode);
    }, 0);

    return child;
  });
}

function createFailingModelSpawn() {
  return vi.fn(() => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      kill: ReturnType<typeof vi.fn>;
    };
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = vi.fn();

    setTimeout(() => {
      child.stderr.write(
        "ValueError: Required inputs (['char_inputs', 'diac_inputs']) are missing from input feed (['input', 'input_lengths', 'scales']).",
      );
      child.emit("close", 1);
    }, 0);

    return child;
  });
}

describe("Piper TTS adapter", () => {
  afterEach(() => {
    setPiperSpawnForTest(null);
    setPiperFileExistsForTest(null);
    setPiperReadFileForTest(null);
    setPiperFfmpegRunnerForTest(null);
  });

  it("validates required text, binary, and model paths", () => {
    setPiperFileExistsForTest((filePath) => !filePath.includes("missing"));

    expect(() =>
      validatePiperTtsInput({
        text: "",
        binaryPath: "piper",
        modelPath: "/voice.onnx",
      }),
    ).toThrow("Text input");
    expect(() =>
      validatePiperTtsInput({
        text: "Hello",
        binaryPath: "piper",
        modelPath: "/missing/voice.onnx",
      }),
    ).toThrow("not found");
  });

  it("fails fast when bundled Piper dynamic libraries are missing", () => {
    setPiperFileExistsForTest((filePath) => {
      return !filePath.endsWith("libespeak-ng.1.dylib");
    });

    expect(() =>
      validatePiperRuntimeFiles({
        binaryPath: "/repo/piper/piper",
        modelPath: "/repo/piper/model.onnx",
        configPath: "/repo/piper/model.onnx.json",
      }),
    ).toThrow("libespeak-ng.1.dylib");
  });

  it("maps default `piper` command to local bundled binary path", () => {
    setPiperFileExistsForTest((filePath) => filePath.includes(".venv"));

    expect(resolvePiperBinaryPath("piper")).toBe(
      `${process.cwd()}/piper/.venv/bin/piper`,
    );
  });

  it("builds low-resource Piper CLI args for stdout WAV output", () => {
    setPiperFileExistsForTest(() => true);

    const input = validatePiperTtsInput({
      text: "Hello",
      binaryPath: "piper",
      modelPath: "/models/voice.onnx",
      configPath: "/models/voice.onnx.json",
      speaker: 0,
      lengthScale: 1,
      noiseScale: 0.667,
      noiseW: 0.8,
      sentenceSilence: 0.2,
    });

    expect(buildPiperArgs(input, "/tmp/speech.wav")).toEqual([
      "--model",
      "/models/voice.onnx",
      "--output_file",
      "/tmp/speech.wav",
      "--config",
      "/models/voice.onnx.json",
      "--speaker",
      "0",
      "--length_scale",
      "1",
      "--noise_scale",
      "0.667",
      "--noise_w",
      "0.8",
      "--sentence_silence",
      "0.2",
    ]);
  });

  it("builds batch Piper CLI args for one model load across many text chunks", () => {
    setPiperFileExistsForTest(() => true);

    const input = validatePiperTtsInput({
      text: "Hello",
      binaryPath: "piper",
      modelPath: "/models/voice.onnx",
      configPath: "/models/voice.onnx.json",
      speaker: 0,
      lengthScale: 1,
      noiseScale: 0.667,
      noiseW: 0.8,
      sentenceSilence: 0.2,
    });

    expect(
      buildPiperBatchArgs(input, {
        inputPath: "/tmp/input.txt",
        outputDir: "/tmp/out",
      }),
    ).toEqual([
      "--model",
      "/models/voice.onnx",
      "--input_file",
      "/tmp/input.txt",
      "--output_dir",
      "/tmp/out",
      "--config",
      "/models/voice.onnx.json",
      "--speaker",
      "0",
      "--length_scale",
      "1",
      "--noise_scale",
      "0.667",
      "--noise_w",
      "0.8",
      "--sentence_silence",
      "0.2",
    ]);
  });

  it("returns synthesized WAV audio from Piper stdout", async () => {
    const spawnMock = createMockSpawn("route-audio");
    setPiperSpawnForTest(spawnMock as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("route-audio"));

    const result = await generatePiperSpeech({
      text: "Hello Piper",
      binaryPath: "piper",
      modelPath: "/models/voice.onnx",
    });

    expect(spawnMock).toHaveBeenCalledWith(
      `${process.cwd()}/piper/.venv/bin/piper`,
      expect.arrayContaining(["--model", "/models/voice.onnx"]),
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      }),
    );
    expect(result).toMatchObject({
      mimeType: "audio/wav",
      extension: "wav",
      byteLength: "route-audio".length,
      provider: { name: "piper", mode: "local-cli" },
    });
    expect(Buffer.from(result.audioBase64, "base64").toString()).toBe(
      "route-audio",
    );
  });

  it("maps non-zero Piper exits to provider errors", async () => {
    setPiperSpawnForTest(createMockSpawn("", 1) as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from(""));

    await expect(
      generatePiperSpeech({
        text: "Hello Piper",
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
      }),
    ).rejects.toThrow("piper failed");
  });

  it("maps incompatible ONNX model errors to a concise message", async () => {
    setPiperSpawnForTest(createFailingModelSpawn() as never);
    setPiperFileExistsForTest(() => true);

    await expect(
      generatePiperSpeech({
        text: "Hello Piper",
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
      }),
    ).rejects.toThrow("model is incompatible");
  });

  it("validates translated voice segments", () => {
    expect(() => validateVoiceSegments([])).toThrow(
      "At least one translated transcript segment",
    );

    expect(
      validateVoiceSegments([
        { id: 1, start: 1.4, end: 2, text: " Sau " },
        { id: 0, start: 0, end: 1, text: "" },
        { id: 2, start: 0.2, end: 0.8, text: "Trước" },
      ]),
    ).toEqual([
      { id: 2, start: 0.2, end: 0.8, text: "Trước" },
      { id: 1, start: 1.4, end: 2, text: "Sau" },
    ]);
  });

  it("builds ffmpeg atempo chains for large speedups", () => {
    expect(buildAtempoFilterChain(1)).toBe("anull");
    expect(buildAtempoFilterChain(5)).toBe("atempo=2,atempo=2,atempo=1.25");
  });

  it("splits multi-sentence text before Piper synthesis", () => {
    expect(
      splitTextForPiperSynthesis(
        "mạch máu bị cắt đứt ngay. Mất nguồn máu và dinh dưỡng, các tế bào chết đi.",
      ),
    ).toEqual([
      "mạch máu bị cắt đứt ngay.",
      "Mất nguồn máu và dinh dưỡng, các tế bào chết đi.",
    ]);
  });

  it("borrows safe following gaps before speeding up timeline segments", () => {
    expect(
      buildTimelineAlignmentChunk({
        segment: { id: 7, start: 0, end: 1, text: "Một câu hơi dài" },
        rawDurationSeconds: 1.5,
        nextSegmentStart: 2,
      }),
    ).toMatchObject({
      segmentId: 7,
      slotDurationSeconds: 1,
      rawDurationSeconds: 1.5,
      targetDurationSeconds: 1.5,
      borrowedGapSeconds: 0.5,
      speedFactor: 1.25,
      tempoFilter: "atempo=1.25",
      warningCodes: [],
    });
  });

  it("flags timeline segments that still need aggressive speed-up", () => {
    expect(
      buildTimelineAlignmentChunk({
        segment: { id: 8, start: 0, end: 1, text: "Một câu quá dài" },
        rawDurationSeconds: 3,
        nextSegmentStart: 1.2,
      }),
    ).toMatchObject({
      targetDurationSeconds: 1.15,
      borrowedGapSeconds: expect.closeTo(0.15, 4),
      speedFactor: 1.75,
      warningCodes: [
        "HIGH_SPEED_FACTOR",
        "INSUFFICIENT_GAP_FOR_NATURAL_SPEED",
      ],
    });
  });

  it("uses a 1.25x speed floor when timeline acceleration is needed", () => {
    expect(
      buildTimelineAlignmentChunk({
        segment: { id: 9, start: 0, end: 1, text: "Nhanh hơn một chút" },
        rawDurationSeconds: 1.1,
        nextSegmentStart: 1,
      }),
    ).toMatchObject({
      targetDurationSeconds: 1,
      speedFactor: 1.25,
      tempoFilter: "atempo=1.25",
    });
  });

  it("batches balanced timeline Piper voice synthesis into one model load", async () => {
    const spawnMock = createMockSpawn();
    setPiperSpawnForTest(spawnMock as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("aligned-audio"));
    setPiperFfmpegRunnerForTest(async () => ({
      stderr: "Duration: 00:00:00.500",
    }));

    const result = await generateVoiceFromSegments({
      segments: [
        { id: 0, start: 0, end: 0.75, text: "Xin chào" },
        { id: 1, start: 1, end: 1.5, text: "Tạm biệt" },
      ],
      settings: {
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
        preserveTimestampGaps: true,
      },
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        "--input_file",
        expect.any(String),
        "--output_dir",
        expect.any(String),
        "--sentence_silence",
        "0.05",
      ]),
      expect.any(Object),
    );
    expect(result).toMatchObject({
      mimeType: "audio/wav",
      extension: "wav",
      byteLength: "aligned-audio".length,
      segmentCount: 2,
      generationDurationMs: expect.any(Number),
      alignment: {
        mode: "balanced",
        targetDurationSeconds: 1.5,
        chunks: 2,
        timeline: [
          expect.objectContaining({
            segmentId: 0,
            rawDurationSeconds: 0.5,
            targetDurationSeconds: 0.4,
            scheduledStartSeconds: 0,
            speedFactor: 1.25,
          }),
          expect.objectContaining({
            segmentId: 1,
            rawDurationSeconds: 0.5,
            targetDurationSeconds: 0.4,
            scheduledStartSeconds: 0.7,
            pauseBeforeSeconds: 0.3,
            speedFactor: 1.25,
          }),
        ],
        warnings: [],
      },
      provider: { name: "piper", mode: "local-cli" },
    });
  });

  it("keeps strict timeline metadata on original segment timestamps", async () => {
    const spawnMock = createMockSpawn();
    setPiperSpawnForTest(spawnMock as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("strict-audio"));
    setPiperFfmpegRunnerForTest(async () => ({
      stderr: "Duration: 00:00:00.500",
    }));

    const result = await generateVoiceFromSegments({
      segments: [
        { id: 217, start: 420.432, end: 421.532, text: "Đoạn cuối" },
      ],
      settings: {
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
        preserveTimestampGaps: true,
        alignmentMode: "strict",
      },
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(result.alignment).toMatchObject({
      mode: "timeline",
      targetDurationSeconds: 421.532,
      timeline: [
        expect.objectContaining({
          segmentId: 217,
          scheduledStartSeconds: 420.432,
          scheduledEndSeconds: 421.532,
          pauseBeforeSeconds: 420.432,
          driftSeconds: 0,
        }),
      ],
    });
  });

  it("places strict timeline chunks by absolute timestamp instead of serial concat", async () => {
    const spawnMock = createMockSpawn();
    const ffmpegCalls: string[][] = [];
    setPiperSpawnForTest(spawnMock as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("strict-mixed-audio"));
    setPiperFfmpegRunnerForTest(async (args) => {
      ffmpegCalls.push(args);
      return { stderr: "Duration: 00:00:02.000" };
    });

    await generateVoiceFromSegments({
      segments: [
        { id: 16, start: 16.6, end: 18, text: "Câu trước rất dài" },
        { id: 17, start: 18.8, end: 19.8, text: "Thằng ngốc, lại đây!" },
        {
          id: 18,
          start: 20.1,
          end: 20.86,
          text: "Sợ thì gọi thêm hai đứa xuống!",
        },
      ],
      settings: {
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
        preserveTimestampGaps: true,
        alignmentMode: "strict",
      },
    });

    const finalMixCall = ffmpegCalls.at(-1) ?? [];
    const filterComplex =
      finalMixCall[finalMixCall.indexOf("-filter_complex") + 1] ?? "";

    expect(finalMixCall).not.toContain("concat");
    expect(filterComplex).toContain("adelay=16600:all=1");
    expect(filterComplex).toContain("adelay=18800:all=1");
    expect(filterComplex).toContain("adelay=20100:all=1");
    expect(filterComplex).toContain("amix=inputs=3");
    expect(filterComplex).toContain("atrim=0:20.860");
  });

  it("keeps multi-sentence chunking without spawning Piper for every chunk", async () => {
    const spawnMock = createMockSpawn();
    setPiperSpawnForTest(spawnMock as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("chunked-audio"));
    setPiperFfmpegRunnerForTest(async () => ({
      stderr: "Duration: 00:00:01.000",
    }));

    await generateVoiceFromSegments({
      segments: [
        {
          id: 0,
          start: 0,
          end: 3,
          text: "Câu đầu bình thường. Câu sau từng gây rè rất nặng.",
        },
      ],
      settings: {
        binaryPath: "piper",
        modelPath: "/models/voice.onnx",
        preserveTimestampGaps: true,
      },
    });

    expect(spawnMock).toHaveBeenCalledTimes(1);
  });
});
