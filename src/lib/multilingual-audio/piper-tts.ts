import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "./audio-extraction";
import {
  ChineseTranscriptionError,
  DEFAULT_PIPER_TTS_SETTINGS,
  PIPER_TTS_ALIGNMENT_SETTINGS,
  type VoiceGenerationResult,
  type VoiceGenerationSegment,
  type VoiceGenerationSettings,
} from "./types";

const MAX_PIPER_TEXT_LENGTH = 5000;
const DEFAULT_TIMEOUT_MS = 60000;
const {
  timelineGapBorrowRatio: TIMELINE_GAP_BORROW_RATIO,
  maxTimelineGapBorrowSeconds: MAX_TIMELINE_GAP_BORROW_SECONDS,
  timelineSegmentSentenceSilenceSeconds:
    TIMELINE_SEGMENT_SENTENCE_SILENCE_SECONDS,
  timelineMinSpeedFactor: TIMELINE_MIN_SPEED_FACTOR,
  timelineMaxSpeedFactor: TIMELINE_MAX_SPEED_FACTOR,
  highTimelineSpeedFactor: HIGH_TIMELINE_SPEED_FACTOR,
  balancedMaxPauseSeconds: BALANCED_MAX_PAUSE_SECONDS,
  balancedMaxSpeedFactor: BALANCED_MAX_SPEED_FACTOR,
  balancedLongPauseSeconds: BALANCED_LONG_PAUSE_SECONDS,
  balancedDriftWarningSeconds: BALANCED_DRIFT_WARNING_SECONDS,
} = PIPER_TTS_ALIGNMENT_SETTINGS;
const DEFAULT_LOCAL_PIPER_DIR = path.join(process.cwd(), "piper");
const DEFAULT_LOCAL_PIPER_BINARY = path.join(
  process.cwd(),
  "piper",
  ".venv",
  "bin",
  "piper",
);
const FALLBACK_LOCAL_PIPER_BINARY = path.join(process.cwd(), "piper", "piper");
const REQUIRED_PIPER_DYLIBS = [
  "libespeak-ng.1.dylib",
  "libpiper_phonemize.1.dylib",
  "libonnxruntime.1.14.1.dylib",
];
const BATCH_TIMEOUT_BASE_MS = 60000;
const BATCH_TIMEOUT_PER_TEXT_MS = 5000;
const BATCH_TIMEOUT_MAX_MS = 15 * 60 * 1000;

type PiperSpawn = typeof spawn;

let piperSpawnForTest: PiperSpawn | null = null;
let piperFileExistsForTest: ((filePath: string) => boolean) | null = null;
let piperReadFileForTest: ((filePath: string) => Promise<Buffer>) | null = null;
let piperFfmpegRunnerForTest:
  | ((args: string[]) => Promise<{ stderr: string }>)
  | null = null;

export type PiperTtsInput = {
  text: string;
  binaryPath: string;
  modelPath: string;
  configPath?: string;
  speaker?: number;
  lengthScale?: number;
  noiseScale?: number;
  noiseW?: number;
  sentenceSilence?: number;
  timeoutMs?: number;
};

type NormalizedPiperVoiceSettings = VoiceGenerationSettings;

type TimelineAlignmentChunk = {
  segmentId: number;
  sourceSegmentId?: number;
  start: number;
  end: number;
  slotDurationSeconds: number;
  rawDurationSeconds: number;
  targetDurationSeconds: number;
  borrowedGapSeconds: number;
  speedFactor: number;
  tempoFilter: string;
  scheduledStartSeconds?: number;
  scheduledEndSeconds?: number;
  pauseBeforeSeconds?: number;
  driftSeconds?: number;
  warningCodes: string[];
};

export type PiperTtsResult = {
  audioBase64: string;
  mimeType: "audio/wav";
  extension: "wav";
  byteLength: number;
  durationMs: number;
  settings: {
    modelPath: string;
    configPath?: string;
    speaker?: number;
    lengthScale?: number;
    noiseScale?: number;
    noiseW?: number;
    sentenceSilence?: number;
  };
  provider: {
    name: "piper";
    mode: "local-cli";
  };
};

export function resolvePiperBinaryPath(binaryPath: string) {
  const trimmed = binaryPath.trim();
  if (!trimmed || trimmed === "piper") {
    if (fileExists(DEFAULT_LOCAL_PIPER_BINARY)) return DEFAULT_LOCAL_PIPER_BINARY;
    return FALLBACK_LOCAL_PIPER_BINARY;
  }
  if (
    trimmed === FALLBACK_LOCAL_PIPER_BINARY &&
    fileExists(DEFAULT_LOCAL_PIPER_BINARY)
  ) {
    return DEFAULT_LOCAL_PIPER_BINARY;
  }
  return trimmed;
}

function fileExists(filePath: string) {
  return piperFileExistsForTest?.(filePath) ?? existsSync(filePath);
}

function resolvePiperModelPath(modelPath: string) {
  const trimmed = modelPath.trim();
  if (trimmed) return trimmed;

  const bundledModel = path.join(DEFAULT_LOCAL_PIPER_DIR, "model.onnx");
  if (fileExists(bundledModel)) return bundledModel;

  let bundledCandidates: string[] = [];
  try {
    bundledCandidates = readdirSync(DEFAULT_LOCAL_PIPER_DIR)
      .filter((fileName) => fileName.endsWith(".onnx"))
      .sort();
  } catch {
    bundledCandidates = [];
  }

  if (bundledCandidates.length > 0) {
    return path.join(DEFAULT_LOCAL_PIPER_DIR, bundledCandidates[0]);
  }

  return "";
}

function resolvePiperConfigPath(configPath: string | undefined, modelPath: string) {
  const trimmed = configPath?.trim();
  if (trimmed) return trimmed;

  const derived = `${modelPath}.json`;
  if (fileExists(derived)) return derived;

  const bundledModelConfig = path.join(DEFAULT_LOCAL_PIPER_DIR, "model.onnx.json");
  if (fileExists(bundledModelConfig)) return bundledModelConfig;

  return undefined;
}

function validateReadableFile(input: {
  pathValue: string;
  code:
    | "VAL_PIPER_TTS_BINARY_REQUIRED"
    | "VAL_PIPER_TTS_MODEL_REQUIRED"
    | "VAL_PIPER_TTS_CONFIG_NOT_FOUND";
  label: string;
}) {
  if (!fileExists(input.pathValue)) {
    throw new ChineseTranscriptionError(
      input.code,
      `${input.label} not found: ${input.pathValue}`,
      400,
    );
  }
}

export function validatePiperRuntimeFiles(input: {
  binaryPath: string;
  modelPath: string;
  configPath?: string;
}) {
  validateReadableFile({
    pathValue: input.binaryPath,
    code: "VAL_PIPER_TTS_BINARY_REQUIRED",
    label: "Piper executable",
  });
  validateReadableFile({
    pathValue: input.modelPath,
    code: "VAL_PIPER_TTS_MODEL_REQUIRED",
    label: "Piper ONNX model",
  });
  if (input.configPath) {
    validateReadableFile({
      pathValue: input.configPath,
      code: "VAL_PIPER_TTS_CONFIG_NOT_FOUND",
      label: "Piper config JSON",
    });
  }

  if (!input.binaryPath.includes(`${path.sep}.venv${path.sep}`)) {
    const piperDir = path.dirname(input.binaryPath);
    const missingLibraries = REQUIRED_PIPER_DYLIBS.filter(
      (fileName) => !fileExists(path.join(piperDir, fileName)),
    );
    if (missingLibraries.length > 0) {
      throw new ChineseTranscriptionError(
        "CFG_PIPER_TTS_RUNTIME_MISSING",
        `Piper runtime is missing dynamic libraries in ${piperDir}: ${missingLibraries.join(", ")}`,
        500,
      );
    }
  }
}

export function setPiperSpawnForTest(spawnImpl: PiperSpawn | null) {
  piperSpawnForTest = spawnImpl;
}

export function setPiperFileExistsForTest(
  fileExistsImpl: ((filePath: string) => boolean) | null,
) {
  piperFileExistsForTest = fileExistsImpl;
}

export function setPiperReadFileForTest(
  readFileImpl: ((filePath: string) => Promise<Buffer>) | null,
) {
  piperReadFileForTest = readFileImpl;
}

export function setPiperFfmpegRunnerForTest(
  runnerImpl: ((args: string[]) => Promise<{ stderr: string }>) | null,
) {
  piperFfmpegRunnerForTest = runnerImpl;
}

function normalizeOptionalNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function validatePiperTtsInput(input: PiperTtsInput) {
  const text = input.text.trim();
  const binaryPath = resolvePiperBinaryPath(input.binaryPath);
  const modelPath = resolvePiperModelPath(input.modelPath);

  if (!text) {
    throw new ChineseTranscriptionError(
      "VAL_PIPER_TTS_TEXT_REQUIRED",
      "Text input is required for Piper TTS.",
      400,
    );
  }
  if (text.length > MAX_PIPER_TEXT_LENGTH) {
    throw new ChineseTranscriptionError(
      "VAL_PIPER_TTS_TEXT_REQUIRED",
      `Piper TTS sandbox text is limited to ${MAX_PIPER_TEXT_LENGTH} characters.`,
      400,
    );
  }
  if (!binaryPath) {
    throw new ChineseTranscriptionError(
      "VAL_PIPER_TTS_BINARY_REQUIRED",
      "Piper executable path is required.",
      400,
    );
  }
  if (!modelPath) {
    throw new ChineseTranscriptionError(
      "VAL_PIPER_TTS_MODEL_REQUIRED",
      "Piper ONNX model path is required.",
      400,
    );
  }
  const configPath = resolvePiperConfigPath(input.configPath, modelPath);
  validatePiperRuntimeFiles({ binaryPath, modelPath, configPath });

  return {
    ...input,
    text,
    binaryPath,
    modelPath,
    configPath,
    speaker: normalizeOptionalNumber(input.speaker),
    lengthScale: normalizeOptionalNumber(input.lengthScale),
    noiseScale: normalizeOptionalNumber(input.noiseScale),
    noiseW: normalizeOptionalNumber(input.noiseW),
    sentenceSilence: normalizeOptionalNumber(input.sentenceSilence),
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };
}

export function buildPiperArgs(
  input: ReturnType<typeof validatePiperTtsInput>,
  outputPath: string,
) {
  const args = ["--model", input.modelPath, "--output_file", outputPath];

  if (input.configPath) args.push("--config", input.configPath);
  if (input.speaker !== undefined) args.push("--speaker", String(input.speaker));
  if (input.lengthScale !== undefined) {
    args.push("--length_scale", String(input.lengthScale));
  }
  if (input.noiseScale !== undefined) {
    args.push("--noise_scale", String(input.noiseScale));
  }
  if (input.noiseW !== undefined) args.push("--noise_w", String(input.noiseW));
  if (input.sentenceSilence !== undefined) {
    args.push("--sentence_silence", String(input.sentenceSilence));
  }

  return args;
}

export function buildPiperBatchArgs(
  input: ReturnType<typeof validatePiperTtsInput>,
  paths: { inputPath: string; outputDir: string },
) {
  const args = [
    "--model",
    input.modelPath,
    "--input_file",
    paths.inputPath,
    "--output_dir",
    paths.outputDir,
  ];

  if (input.configPath) args.push("--config", input.configPath);
  if (input.speaker !== undefined) args.push("--speaker", String(input.speaker));
  if (input.lengthScale !== undefined) {
    args.push("--length_scale", String(input.lengthScale));
  }
  if (input.noiseScale !== undefined) {
    args.push("--noise_scale", String(input.noiseScale));
  }
  if (input.noiseW !== undefined) args.push("--noise_w", String(input.noiseW));
  if (input.sentenceSilence !== undefined) {
    args.push("--sentence_silence", String(input.sentenceSilence));
  }

  return args;
}

function buildPiperEnv(binaryPath: string) {
  if (binaryPath.includes(`${path.sep}.venv${path.sep}`)) {
    return process.env;
  }

  const piperDir = path.dirname(binaryPath);
  const libraryPath = [piperDir, process.env.DYLD_LIBRARY_PATH]
    .filter(Boolean)
    .join(":");

  return {
    ...process.env,
    DYLD_LIBRARY_PATH: libraryPath,
    LD_LIBRARY_PATH: [piperDir, process.env.LD_LIBRARY_PATH]
      .filter(Boolean)
      .join(":"),
    PIPER_PHONEMIZE_EXECUTABLE:
      process.env.PIPER_PHONEMIZE_EXECUTABLE ??
      path.join(piperDir, "piper_phonemize"),
    PIPER_ESPEAKNG_DATA_DIRECTORY:
      process.env.PIPER_ESPEAKNG_DATA_DIRECTORY ??
      path.join(piperDir, "espeak-ng-data"),
  };
}

function clampTimelineSpeedFactor(speedFactor: number) {
  if (!Number.isFinite(speedFactor) || speedFactor <= 0) return 1;
  return Math.min(
    TIMELINE_MAX_SPEED_FACTOR,
    Math.max(TIMELINE_MIN_SPEED_FACTOR, speedFactor),
  );
}

function formatPiperFailure(stderr: string, code: number | null) {
  const message = stderr.trim();
  if (
    message.includes("Required inputs") &&
    message.includes("char_inputs") &&
    message.includes("diac_inputs")
  ) {
    return "Piper model is incompatible with piper-tts. This ONNX expects char_inputs/diac_inputs, but Piper VITS models expect input/input_lengths/scales.";
  }

  return message || `Piper exited with code ${code}.`;
}

function piperTimeoutForTextCount(textCount: number) {
  return Math.min(
    BATCH_TIMEOUT_MAX_MS,
    Math.max(
      DEFAULT_TIMEOUT_MS,
      BATCH_TIMEOUT_BASE_MS + textCount * BATCH_TIMEOUT_PER_TEXT_MS,
    ),
  );
}

async function runPiperCommand(input: {
  binaryPath: string;
  args: string[];
  stdinText?: string;
  timeoutMs: number;
}) {
  const spawnImpl = piperSpawnForTest ?? spawn;

  return await new Promise<{ stderr: string }>((resolve, reject) => {
    const child = spawnImpl(input.binaryPath, input.args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: buildPiperEnv(input.binaryPath),
    });
    let stderr = "";
    let settled = false;

    const finishReject = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(
        error instanceof ChineseTranscriptionError
          ? error
          : new ChineseTranscriptionError(
              "PRV_PIPER_TTS_FAILED",
              error instanceof Error ? error.message : "Piper TTS failed.",
              500,
            ),
      );
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      finishReject(
        new ChineseTranscriptionError(
          "PRV_PIPER_TTS_FAILED",
          "Piper TTS timed out.",
          504,
        ),
      );
    }, input.timeoutMs);

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      finishReject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (settled) return;
      settled = true;

      if (code !== 0) {
        reject(
          new ChineseTranscriptionError(
            "PRV_PIPER_TTS_FAILED",
            formatPiperFailure(stderr, code),
            502,
          ),
        );
        return;
      }

      resolve({ stderr });
    });

    child.stdin.end(input.stdinText ?? "");
  });
}

function segmentText(segment: VoiceGenerationSegment) {
  return segment.text.trim();
}

function segmentDuration(segment: VoiceGenerationSegment) {
  if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) {
    return 0;
  }
  return Math.max(0, segment.end - segment.start);
}

function normalizeVoiceSegments(segments: VoiceGenerationSegment[]) {
  return segments
    .map((segment, index) => ({
      id: Number.isFinite(segment.id) ? segment.id : index,
      sourceSegmentId: Number.isFinite(segment.sourceSegmentId)
        ? segment.sourceSegmentId
        : undefined,
      start: Number.isFinite(segment.start) ? segment.start : 0,
      end: Number.isFinite(segment.end) ? segment.end : 0,
      text: segmentText(segment),
    }))
    .filter((segment) => segment.text.length > 0)
    .sort((left, right) => left.start - right.start || left.id - right.id);
}

export function normalizePiperVoiceSettings(
  settings?: Partial<VoiceGenerationSettings>,
): NormalizedPiperVoiceSettings {
  return {
    binaryPath:
      settings?.binaryPath?.trim() || DEFAULT_PIPER_TTS_SETTINGS.binaryPath,
    modelPath: settings?.modelPath?.trim() || DEFAULT_PIPER_TTS_SETTINGS.modelPath,
    configPath:
      settings?.configPath?.trim() || DEFAULT_PIPER_TTS_SETTINGS.configPath,
    speaker:
      typeof settings?.speaker === "number" && Number.isFinite(settings.speaker)
        ? settings.speaker
        : DEFAULT_PIPER_TTS_SETTINGS.speaker,
    lengthScale:
      typeof settings?.lengthScale === "number" &&
      Number.isFinite(settings.lengthScale)
        ? settings.lengthScale
        : DEFAULT_PIPER_TTS_SETTINGS.lengthScale,
    noiseScale:
      typeof settings?.noiseScale === "number" &&
      Number.isFinite(settings.noiseScale)
        ? settings.noiseScale
        : DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
    noiseW:
      typeof settings?.noiseW === "number" && Number.isFinite(settings.noiseW)
        ? settings.noiseW
        : DEFAULT_PIPER_TTS_SETTINGS.noiseW,
    sentenceSilence:
      typeof settings?.sentenceSilence === "number" &&
      Number.isFinite(settings.sentenceSilence)
        ? settings.sentenceSilence
        : DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
    preserveTimestampGaps:
      typeof settings?.preserveTimestampGaps === "boolean"
        ? settings.preserveTimestampGaps
        : DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps,
    alignmentMode:
      settings?.alignmentMode === "strict" || settings?.alignmentMode === "balanced"
        ? settings.alignmentMode
        : DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
  };
}

export function validateVoiceSegments(segments: VoiceGenerationSegment[]) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_SEGMENTS_REQUIRED",
      "At least one translated transcript segment is required for voice generation.",
      400,
    );
  }

  const normalized = normalizeVoiceSegments(segments);
  if (normalized.length === 0) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_SEGMENTS_REQUIRED",
      "At least one translated transcript segment with text is required for voice generation.",
      400,
    );
  }

  return normalized;
}

function runFfmpeg(args: string[]) {
  if (piperFfmpegRunnerForTest) {
    return piperFfmpegRunnerForTest(args);
  }

  return new Promise<{ stderr: string }>((resolve, reject) => {
    let ffmpegPath: string;
    try {
      ffmpegPath = resolveFfmpegPath();
    } catch (error) {
      reject(error);
      return;
    }

    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stderr });
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function parseFfmpegDuration(stderr: string) {
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/u.exec(stderr);
  if (!match) return 0;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3])
  );
}

async function probeAudioDuration(filePath: string) {
  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    filePath,
    "-f",
    "null",
    "-",
  ]);
  return parseFfmpegDuration(stderr);
}

export function buildAtempoFilterChain(speedFactor: number) {
  if (!Number.isFinite(speedFactor) || speedFactor <= 1.0001) {
    return "anull";
  }

  const filters: string[] = [];
  let remaining = speedFactor;
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  filters.push(
    `atempo=${remaining.toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "")}`,
  );
  return filters.join(",");
}

async function concatWavFiles(input: {
  workDir: string;
  filePaths: string[];
  outputPath: string;
}) {
  const concatListPath = path.join(input.workDir, "concat.txt");
  const concatList = input.filePaths
    .map((filePath) => `file '${filePath.replaceAll("'", "'\\''")}'`)
    .join("\n");
  await writeFile(concatListPath, concatList);
  await runFfmpeg([
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatListPath,
    "-ac",
    "1",
    "-ar",
    "22050",
    "-c:a",
    "pcm_s16le",
    input.outputPath,
  ]);
}

async function mixWavFilesOnAbsoluteTimeline(input: {
  filePaths: string[];
  startsSeconds: number[];
  outputPath: string;
  targetDurationSeconds: number;
}) {
  const filterLabels = input.filePaths.map((_, index) => `delayed${index}`);
  const delayFilters = input.startsSeconds.map((startSeconds, index) => {
    const delayMs = Math.max(0, Math.round(startSeconds * 1000));
    return `[${index}:a]adelay=${delayMs}:all=1[${filterLabels[index]}]`;
  });
  const mixInputs = filterLabels.map((label) => `[${label}]`).join("");
  const filterComplex = [
    ...delayFilters,
    `${mixInputs}amix=inputs=${input.filePaths.length}:duration=longest:normalize=0,apad,atrim=0:${input.targetDurationSeconds.toFixed(3)},asetpts=PTS-STARTPTS[out]`,
  ].join(";");

  await runFfmpeg([
    "-y",
    ...input.filePaths.flatMap((filePath) => ["-i", filePath]),
    "-filter_complex",
    filterComplex,
    "-map",
    "[out]",
    "-ac",
    "1",
    "-ar",
    "22050",
    "-c:a",
    "pcm_s16le",
    input.outputPath,
  ]);
}

export function splitTextForPiperSynthesis(text: string) {
  const normalized = text.replace(/\s+/gu, " ").trim();
  if (!normalized) return [];

  const chunks = normalized.match(/[^.!?。！？]+[.!?。！？]+|[^.!?。！？]+$/gu) ?? [
    normalized,
  ];
  return chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export async function generatePiperSpeech(
  input: PiperTtsInput,
): Promise<PiperTtsResult> {
  const normalized = validatePiperTtsInput(input);
  const startedAt = Date.now();
  const workDir = path.join(tmpdir(), `omnivideo-piper-${randomUUID()}`);
  const outputPath = path.join(workDir, "speech.wav");
  const args = buildPiperArgs(normalized, outputPath);

  await mkdir(workDir, { recursive: true });

  try {
    await runPiperCommand({
      binaryPath: normalized.binaryPath,
      args,
      stdinText: `${normalized.text}\n`,
      timeoutMs: normalized.timeoutMs,
    });

    let audioBytes: Buffer;
    try {
      audioBytes = piperReadFileForTest
        ? await piperReadFileForTest(outputPath)
        : await readFile(outputPath);
    } catch (error) {
      throw new ChineseTranscriptionError(
        "PRV_PIPER_TTS_FAILED",
        error instanceof Error
          ? `Piper output file could not be read: ${error.message}`
          : "Piper output file could not be read.",
        502,
      );
    }

    if (audioBytes.byteLength === 0) {
      throw new ChineseTranscriptionError(
        "PRV_PIPER_TTS_FAILED",
        "Piper returned an empty audio payload.",
        502,
      );
    }

    return {
      audioBase64: audioBytes.toString("base64"),
      mimeType: "audio/wav",
      extension: "wav",
      byteLength: audioBytes.byteLength,
      durationMs: Date.now() - startedAt,
      settings: {
        modelPath: normalized.modelPath,
        configPath: normalized.configPath,
        speaker: normalized.speaker,
        lengthScale: normalized.lengthScale,
        noiseScale: normalized.noiseScale,
        noiseW: normalized.noiseW,
        sentenceSilence: normalized.sentenceSilence,
      },
      provider: {
        name: "piper",
        mode: "local-cli",
      },
    };
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}

function parsePiperBatchOutputPaths(stderr: string) {
  return stderr
    .split(/\r?\n/u)
    .map((line) => {
      const match = /Wrote\s+(.+\.wav)\s*$/u.exec(line.trim());
      return match?.[1];
    })
    .filter((filePath): filePath is string => Boolean(filePath));
}

async function generatePiperSpeechBatch(input: {
  texts: string[];
  settings: NormalizedPiperVoiceSettings;
  workDir: string;
  outputDir: string;
}) {
  const texts = input.texts.map((text) => text.replace(/\s+/gu, " ").trim());
  if (texts.length === 0) return [];

  for (const text of texts) {
    if (!text) {
      throw new ChineseTranscriptionError(
        "VAL_PIPER_TTS_TEXT_REQUIRED",
        "Text input is required for Piper TTS.",
        400,
      );
    }
    if (text.length > MAX_PIPER_TEXT_LENGTH) {
      throw new ChineseTranscriptionError(
        "VAL_PIPER_TTS_TEXT_REQUIRED",
        `Piper TTS text chunks are limited to ${MAX_PIPER_TEXT_LENGTH} characters.`,
        400,
      );
    }
  }

  const normalized = validatePiperTtsInput({
    text: texts[0],
    binaryPath: input.settings.binaryPath,
    modelPath: input.settings.modelPath,
    configPath: input.settings.configPath,
    speaker: input.settings.speaker,
    lengthScale: input.settings.lengthScale,
    noiseScale: input.settings.noiseScale,
    noiseW: input.settings.noiseW,
    sentenceSilence: input.settings.sentenceSilence,
    timeoutMs: piperTimeoutForTextCount(texts.length),
  });
  const inputPath = path.join(input.workDir, "piper-batch-input.txt");
  await mkdir(input.outputDir, { recursive: true });
  await writeFile(inputPath, `${texts.join("\n")}\n`);

  const { stderr } = await runPiperCommand({
    binaryPath: normalized.binaryPath,
    args: buildPiperBatchArgs(normalized, {
      inputPath,
      outputDir: input.outputDir,
    }),
    timeoutMs: normalized.timeoutMs,
  });
  const outputPaths = parsePiperBatchOutputPaths(stderr);

  if (outputPaths.length !== texts.length) {
    throw new ChineseTranscriptionError(
      "PRV_PIPER_TTS_FAILED",
      `Piper batch generated ${outputPaths.length} file(s) for ${texts.length} text chunk(s).`,
      502,
    );
  }

  return outputPaths;
}

async function synthesizeSegmentFiles(input: {
  segments: VoiceGenerationSegment[];
  settings: NormalizedPiperVoiceSettings;
  workDir: string;
  timelineMode?: boolean;
}) {
  const files: Array<{ segment: VoiceGenerationSegment; filePath: string }> = [];
  const batchItems: Array<{
    segment: VoiceGenerationSegment;
    outputPath: string;
    textChunks: string[];
  }> = [];
  const sentenceSilence =
    input.timelineMode && input.settings.sentenceSilence !== undefined
      ? Math.min(
          input.settings.sentenceSilence,
          TIMELINE_SEGMENT_SENTENCE_SILENCE_SECONDS,
        )
      : input.settings.sentenceSilence;

  for (const segment of input.segments) {
    batchItems.push({
      segment,
      outputPath: path.join(input.workDir, `segment-${segment.id}.wav`),
      textChunks: splitTextForPiperSynthesis(segment.text),
    });
  }

  const batchSettings = { ...input.settings, sentenceSilence };
  const batchOutputPaths = await generatePiperSpeechBatch({
    texts: batchItems.flatMap((item) => item.textChunks),
    settings: batchSettings,
    workDir: input.workDir,
    outputDir: path.join(input.workDir, "piper-batch-output"),
  });
  let batchIndex = 0;

  for (const item of batchItems) {
    const chunkPaths = batchOutputPaths.slice(
      batchIndex,
      batchIndex + item.textChunks.length,
    );
    batchIndex += item.textChunks.length;

    if (chunkPaths.length === 1) {
      await writeFile(
        item.outputPath,
        piperReadFileForTest
          ? await piperReadFileForTest(chunkPaths[0])
          : await readFile(chunkPaths[0]),
      );
    } else {
      await concatWavFiles({
        workDir: input.workDir,
        filePaths: chunkPaths,
        outputPath: item.outputPath,
      });
    }
    files.push({ segment: item.segment, filePath: item.outputPath });
  }

  return files;
}

export function buildTimelineAlignmentChunk(input: {
  segment: VoiceGenerationSegment;
  rawDurationSeconds: number;
  nextSegmentStart?: number;
}) {
  const slotDurationSeconds = segmentDuration(input.segment);
  const gapAfter =
    input.nextSegmentStart !== undefined
      ? Math.max(0, input.nextSegmentStart - input.segment.end)
      : 0;
  const maxBorrowedGapSeconds = Math.min(
    gapAfter * TIMELINE_GAP_BORROW_RATIO,
    MAX_TIMELINE_GAP_BORROW_SECONDS,
  );
  const wantedBorrowSeconds = Math.max(
    0,
    input.rawDurationSeconds - slotDurationSeconds,
  );
  const borrowedGapSeconds = Math.min(
    wantedBorrowSeconds,
    maxBorrowedGapSeconds,
  );
  const targetDurationSeconds = slotDurationSeconds + borrowedGapSeconds;
  const speedFactor =
    input.rawDurationSeconds > 0 &&
    targetDurationSeconds > 0
      ? clampTimelineSpeedFactor(
          input.rawDurationSeconds / targetDurationSeconds,
        )
      : 1;
  const tempoFilter = buildAtempoFilterChain(speedFactor);
  const warningCodes: string[] = [];

  if (speedFactor > HIGH_TIMELINE_SPEED_FACTOR) {
    warningCodes.push("HIGH_SPEED_FACTOR");
  }
  if (
    input.rawDurationSeconds > slotDurationSeconds &&
    borrowedGapSeconds < wantedBorrowSeconds
  ) {
    warningCodes.push("INSUFFICIENT_GAP_FOR_NATURAL_SPEED");
  }

  return {
    segmentId: input.segment.id,
    sourceSegmentId: input.segment.sourceSegmentId,
    start: input.segment.start,
    end: input.segment.end,
    slotDurationSeconds,
    rawDurationSeconds: input.rawDurationSeconds,
    targetDurationSeconds,
    borrowedGapSeconds,
    speedFactor,
    tempoFilter,
    warningCodes,
  } satisfies TimelineAlignmentChunk;
}

async function alignPiperFilesToTimeline(input: {
  files: Array<{ segment: VoiceGenerationSegment; filePath: string }>;
  workDir: string;
  outputPath: string;
}) {
  const timelinePaths: string[] = [];
  const timelineStarts: number[] = [];
  const chunks: TimelineAlignmentChunk[] = [];

  for (const [index, item] of input.files.entries()) {
    const duration = segmentDuration(item.segment);
    if (duration <= 0) continue;

    const rawDuration = await probeAudioDuration(item.filePath);
    const chunk = buildTimelineAlignmentChunk({
      segment: item.segment,
      rawDurationSeconds: rawDuration,
      nextSegmentStart: input.files[index + 1]?.segment.start,
    });
    chunks.push({
      ...chunk,
      scheduledStartSeconds: item.segment.start,
      scheduledEndSeconds: item.segment.start + chunk.targetDurationSeconds,
      pauseBeforeSeconds: item.segment.start,
      driftSeconds: 0,
    });
    const alignedPath = path.join(
      input.workDir,
      `aligned-${item.segment.id}.wav`,
    );
    await runFfmpeg([
      "-y",
      "-i",
      item.filePath,
      "-af",
      `${chunk.tempoFilter},apad,atrim=0:${chunk.targetDurationSeconds.toFixed(3)},asetpts=PTS-STARTPTS`,
      "-ac",
      "1",
      "-ar",
      "22050",
      "-c:a",
      "pcm_s16le",
      alignedPath,
    ]);
    timelinePaths.push(alignedPath);
    timelineStarts.push(item.segment.start);
  }

  if (timelinePaths.length === 0) {
    await concatWavFiles({
      workDir: input.workDir,
      filePaths: input.files.map((file) => file.filePath),
      outputPath: input.outputPath,
    });
    return { chunks: [], warnings: [] };
  }

  await mixWavFilesOnAbsoluteTimeline({
    filePaths: timelinePaths,
    startsSeconds: timelineStarts,
    outputPath: input.outputPath,
    targetDurationSeconds: Math.max(
      ...input.files.map((file) => file.segment.end),
    ),
  });
  return {
    chunks,
    warnings: Array.from(
      new Set(chunks.flatMap((chunk) => chunk.warningCodes)),
    ),
  };
}

async function alignPiperFilesToBalancedTimeline(input: {
  files: Array<{ segment: VoiceGenerationSegment; filePath: string }>;
  workDir: string;
  outputPath: string;
}) {
  const concatPaths: string[] = [];
  const chunks: TimelineAlignmentChunk[] = [];
  let cursor = 0;

  for (const item of input.files) {
    const slotDurationSeconds = segmentDuration(item.segment);
    if (slotDurationSeconds <= 0) continue;

    const rawDurationSeconds = await probeAudioDuration(item.filePath);
    const naturalGapSeconds = Math.max(0, item.segment.start - cursor);
    const pauseBeforeSeconds =
      naturalGapSeconds > 0
        ? Math.min(naturalGapSeconds, BALANCED_MAX_PAUSE_SECONDS)
        : 0;

    if (pauseBeforeSeconds > 0.01) {
      const silencePath = path.join(
        input.workDir,
        `balanced-silence-${item.segment.id}.wav`,
      );
      await runFfmpeg([
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=r=22050:cl=mono",
        "-t",
        pauseBeforeSeconds.toFixed(3),
        "-c:a",
        "pcm_s16le",
        silencePath,
      ]);
      concatPaths.push(silencePath);
      cursor += pauseBeforeSeconds;
    }

    const requiredSpeedFactor =
      rawDurationSeconds > slotDurationSeconds && slotDurationSeconds > 0
        ? rawDurationSeconds / slotDurationSeconds
        : 1;
    const speedFactor =
      rawDurationSeconds > 0
        ? clampTimelineSpeedFactor(
            Math.min(requiredSpeedFactor, BALANCED_MAX_SPEED_FACTOR),
          )
        : 1;
    const targetDurationSeconds =
      speedFactor > 1 ? rawDurationSeconds / speedFactor : rawDurationSeconds;
    const scheduledStartSeconds = cursor;
    const scheduledEndSeconds = scheduledStartSeconds + targetDurationSeconds;
    const driftSeconds = scheduledStartSeconds - item.segment.start;
    const tempoFilter = buildAtempoFilterChain(speedFactor);
    const warningCodes: string[] = [];

    if (naturalGapSeconds > BALANCED_LONG_PAUSE_SECONDS) {
      warningCodes.push("COMPRESSED_LONG_PAUSE");
    }
    if (requiredSpeedFactor > BALANCED_MAX_SPEED_FACTOR) {
      warningCodes.push("SPILLOVER_TO_KEEP_NATURAL_SPEED");
    }
    if (driftSeconds > BALANCED_DRIFT_WARNING_SECONDS) {
      warningCodes.push("START_DELAYED_BY_PREVIOUS_SEGMENT");
    }

    const alignedPath = path.join(
      input.workDir,
      `balanced-${item.segment.id}.wav`,
    );
    await runFfmpeg([
      "-y",
      "-i",
      item.filePath,
      "-af",
      `${tempoFilter},atrim=0:${targetDurationSeconds.toFixed(3)},asetpts=PTS-STARTPTS`,
      "-ac",
      "1",
      "-ar",
      "22050",
      "-c:a",
      "pcm_s16le",
      alignedPath,
    ]);
    concatPaths.push(alignedPath);
    chunks.push({
      segmentId: item.segment.id,
      start: item.segment.start,
      end: item.segment.end,
      slotDurationSeconds,
      rawDurationSeconds,
      targetDurationSeconds,
      borrowedGapSeconds: 0,
      speedFactor,
      tempoFilter,
      scheduledStartSeconds,
      scheduledEndSeconds,
      pauseBeforeSeconds,
      driftSeconds,
      warningCodes,
    });
    cursor = scheduledEndSeconds;
  }

  if (concatPaths.length === 0) {
    await concatWavFiles({
      workDir: input.workDir,
      filePaths: input.files.map((file) => file.filePath),
      outputPath: input.outputPath,
    });
    return { chunks: [], warnings: [] };
  }

  await concatWavFiles({
    workDir: input.workDir,
    filePaths: concatPaths,
    outputPath: input.outputPath,
  });
  return {
    chunks,
    warnings: Array.from(
      new Set(chunks.flatMap((chunk) => chunk.warningCodes)),
    ),
  };
}

export async function generateVoiceFromSegments(input: {
  segments: VoiceGenerationSegment[];
  settings?: Partial<VoiceGenerationSettings>;
}): Promise<VoiceGenerationResult> {
  const startedAt = Date.now();
  const segments = validateVoiceSegments(input.segments);
  const settings = normalizePiperVoiceSettings(input.settings);
  const workDir = path.join(tmpdir(), `omnivideo-piper-voice-${randomUUID()}`);
  const outputPath = path.join(workDir, "voice.wav");
  let timelineAlignment:
    | Awaited<ReturnType<typeof alignPiperFilesToTimeline>>
    | Awaited<ReturnType<typeof alignPiperFilesToBalancedTimeline>>
    | undefined;

  try {
    await mkdir(workDir, { recursive: true });
    const files = await synthesizeSegmentFiles({
      segments,
      settings,
      workDir,
      timelineMode: settings.preserveTimestampGaps,
    });

    if (settings.preserveTimestampGaps) {
      timelineAlignment =
        settings.alignmentMode === "strict"
          ? await alignPiperFilesToTimeline({
              files,
              workDir,
              outputPath,
            })
          : await alignPiperFilesToBalancedTimeline({
              files,
              workDir,
              outputPath,
            });
    } else {
      await concatWavFiles({
        workDir,
        filePaths: files.map((file) => file.filePath),
        outputPath,
      });
    }

    const audioBytes = piperReadFileForTest
      ? await piperReadFileForTest(outputPath)
      : await readFile(outputPath);
    const targetDurationSeconds =
      settings.preserveTimestampGaps && segments.length > 0
        ? Math.max(...segments.map((segment) => segment.end))
        : undefined;

    return {
      audioBase64: audioBytes.toString("base64"),
      mimeType: "audio/wav",
      extension: "wav",
      fileName: "omnivideo-piper-voice.wav",
      byteLength: audioBytes.byteLength,
      segmentCount: segments.length,
      generationDurationMs: Date.now() - startedAt,
      alignment: {
        mode: settings.preserveTimestampGaps
          ? settings.alignmentMode === "strict"
            ? "timeline"
            : "balanced"
          : "natural",
        targetDurationSeconds,
        chunks: segments.length,
        timeline: timelineAlignment?.chunks,
        warnings: timelineAlignment?.warnings,
      },
      settings,
      provider: {
        name: "piper",
        mode: "local-cli",
      },
    };
  } catch (error) {
    if (error instanceof ChineseTranscriptionError) throw error;
    throw new ChineseTranscriptionError(
      "PRV_PIPER_TTS_FAILED",
      error instanceof Error ? error.message : "Piper voice generation failed.",
      500,
    );
  } finally {
    await rm(workDir, { force: true, recursive: true });
  }
}
