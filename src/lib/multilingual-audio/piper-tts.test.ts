import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildPiperArgs,
  buildAtempoFilterChain,
  generateVoiceFromSegments,
  generatePiperSpeech,
  resolvePiperBinaryPath,
  setPiperFfmpegRunnerForTest,
  setPiperFileExistsForTest,
  setPiperReadFileForTest,
  setPiperSpawnForTest,
  validatePiperTtsInput,
  validatePiperRuntimeFiles,
  validateVoiceSegments,
} from "./piper-tts";

function createMockSpawn(output = "wav-bytes", exitCode = 0) {
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
      if (exitCode !== 0) child.stderr.write("piper failed");
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

  it("returns timestamp-aligned Piper voice audio from segments", async () => {
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

    expect(spawnMock).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      mimeType: "audio/wav",
      extension: "wav",
      byteLength: "aligned-audio".length,
      segmentCount: 2,
      alignment: {
        mode: "timeline",
        targetDurationSeconds: 1.5,
        chunks: 2,
      },
      provider: { name: "piper", mode: "local-cli" },
    });
  });
});
