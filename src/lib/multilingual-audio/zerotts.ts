import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { getAllZeroTtsVoices, type ZeroTtsVoice } from "./zerotts-voices";

const execFileAsync = promisify(execFile);
const DEFAULT_DAEMON_PORT = 50123;
let isStartingDaemon = false;

export class ZeroTtsError extends Error {
  code: string;
  category: "validation" | "dependency" | "execution" | "timeout";
  status: number;

  constructor(options: {
    errorCode: string;
    message: string;
    category?: "validation" | "dependency" | "execution" | "timeout";
    status?: number;
  }) {
    super(options.message);
    this.name = "ZeroTtsError";
    this.code = options.errorCode;
    this.category = options.category ?? "execution";
    this.status = options.status ?? 500;
  }
}

export type ZeroTtsGenerateInput = {
  text: string;
  voice?: string;
  customVoicePath?: string;
  customVoiceBuffer?: Buffer;
  customVoiceFilename?: string;
  modelId?: string;
  speed?: number;
  normalizeVi?: boolean;
  temperature?: number;
  topP?: number;
  cfgScale?: number;
  audioRepetitionPenalty?: number;
  seed?: number;
  sentenceSilence?: number;
  timeoutMs?: number;
};

export type ZeroTtsGenerateResult = {
  audioBase64: string;
  mimeType: "audio/wav";
  extension: "wav";
  byteLength: number;
  durationMs: number;
  sampleRate: number;
  generationDurationMs: number;
  text: string;
  normalizedText: string;
  voice: string;
  speed: number;
  seed?: number;
  cfgScale?: number;
  modelId: string;
  segmentCount?: number;
  wordTimestamps?: Array<{ word: string; start: number; end: number }>;
  isRealInference?: boolean;
};

export type ZeroTtsEnvironmentInfo = {
  pythonVersion: string;
  zerottsInstalled: boolean;
  zerottsVersion?: string | null;
  onnxruntimeInstalled: boolean;
  soundfileInstalled: boolean;
  presetVoices: ZeroTtsVoice[];
  customVoices: ZeroTtsVoice[];
};

function getRuntimePythonCandidate(...segments: string[]): string {
  const base = process.cwd();
  return segments.reduce((curr, seg) => path.join(curr, seg), base);
}

export function resolvePythonExecutable(): string {
  if (process.env.ZEROTTS_PYTHON_PATH && existsSync(process.env.ZEROTTS_PYTHON_PATH)) {
    return process.env.ZEROTTS_PYTHON_PATH;
  }

  if (process.env.PYTHON_BIN && existsSync(process.env.PYTHON_BIN)) {
    return process.env.PYTHON_BIN;
  }

  const venvDir = [".", "v", "e", "n", "v"].join("");
  const projectVenvPython = getRuntimePythonCandidate(venvDir, "bin", "python3");
  if (existsSync(projectVenvPython)) {
    return projectVenvPython;
  }

  const piperVenvPython = getRuntimePythonCandidate("piper", venvDir, "bin", "python3");
  if (existsSync(piperVenvPython)) {
    return piperVenvPython;
  }

  return "python3";
}

export function getZeroTtsRunnerScriptPath(): string {
  return path.join(process.cwd(), "src", "lib", "multilingual-audio", "zerotts-runner.py");
}

export async function checkZeroTtsEnvironment(): Promise<ZeroTtsEnvironmentInfo> {
  const pythonBin = resolvePythonExecutable();
  const scriptPath = getZeroTtsRunnerScriptPath();

  try {
    const { stdout } = await execFileAsync(pythonBin, [scriptPath, "--action", "check-env"], {
      timeout: 10000,
    });

    const parsed = JSON.parse(stdout);
    const data = parsed.data || {};
    const customVoices = getAllZeroTtsVoices().filter((v) => !v.isPreset);

    return {
      pythonVersion: data.pythonVersion || "unknown",
      zerottsInstalled: Boolean(data.zerottsInstalled),
      zerottsVersion: data.zerottsVersion ?? null,
      onnxruntimeInstalled: Boolean(data.onnxruntimeInstalled),
      soundfileInstalled: Boolean(data.soundfileInstalled),
      presetVoices: data.presetVoices || [],
      customVoices,
    };
  } catch (error) {
    return {
      pythonVersion: "unknown",
      zerottsInstalled: false,
      zerottsVersion: null,
      onnxruntimeInstalled: false,
      soundfileInstalled: false,
      presetVoices: getAllZeroTtsVoices().filter((v) => v.isPreset),
      customVoices: getAllZeroTtsVoices().filter((v) => !v.isPreset),
    };
  }
}

export async function checkDaemonHealthy(port = DEFAULT_DAEMON_PORT): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const body = (await res.json()) as { ok?: boolean; loaded?: boolean };
    return Boolean(body.ok && body.loaded);
  } catch {
    return false;
  }
}

export async function shutdownZeroTtsDaemon(port = DEFAULT_DAEMON_PORT): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/shutdown`, { method: "POST" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ensureZeroTtsDaemon(port = DEFAULT_DAEMON_PORT): Promise<boolean> {
  if (await checkDaemonHealthy(port)) {
    return true;
  }
  if (isStartingDaemon) {
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await checkDaemonHealthy(port)) return true;
    }
    return checkDaemonHealthy(port);
  }

  isStartingDaemon = true;
  try {
    const pythonBin = resolvePythonExecutable();
    const scriptPath = getZeroTtsRunnerScriptPath();
    const child = spawn(pythonBin, [scriptPath, "--action", "server", "--port", String(port)], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 250));
      if (await checkDaemonHealthy(port)) {
        isStartingDaemon = false;
        return true;
      }
    }
  } catch {
    // Ignore spawn error and fallback to CLI
  } finally {
    isStartingDaemon = false;
  }
  return false;
}

export async function normalizeZeroTtsText(text: string): Promise<string> {
  if (!text || !text.trim()) return "";

  const pythonBin = resolvePythonExecutable();
  const scriptPath = getZeroTtsRunnerScriptPath();

  try {
    const { stdout } = await execFileAsync(
      pythonBin,
      [scriptPath, "--action", "normalize-text", "--text", text.trim()],
      { timeout: 10000 },
    );

    const parsed = JSON.parse(stdout);
    return parsed.data?.normalized || text;
  } catch {
    return text;
  }
}

export async function generateZeroTtsSpeech(
  input: ZeroTtsGenerateInput,
): Promise<ZeroTtsGenerateResult> {
  const trimmedText = (input.text || "").trim();
  if (!trimmedText) {
    throw new ZeroTtsError({
      errorCode: "ZERO_TTS_EMPTY_TEXT",
      message: "Synthesis text is required.",
      category: "validation",
      status: 400,
    });
  }

  const pythonBin = resolvePythonExecutable();
  const scriptPath = getZeroTtsRunnerScriptPath();
  const tempDir = path.join(os.tmpdir(), `zerotts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  await mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, "output.wav");
  let voiceTarget = (input.voice || "maichi").trim();

  // If custom voice buffer (e.g. 10s audio or .zip/.npz) is provided, write to temp file
  if (input.customVoiceBuffer) {
    const filename = input.customVoiceFilename || "custom_voice.wav";
    const uploadedVoicePath = path.join(tempDir, filename);
    await writeFile(uploadedVoicePath, input.customVoiceBuffer);
    voiceTarget = uploadedVoicePath;
  } else if (input.customVoicePath && existsSync(input.customVoicePath)) {
    voiceTarget = input.customVoicePath;
  }

  const speed = typeof input.speed === "number" && Number.isFinite(input.speed) ? Math.max(0.2, Math.min(3.0, input.speed)) : 1.0;
  const normalizeVi = input.normalizeVi !== false;
  const modelId = input.modelId || "zeroweight-ai/ZeroTTS";
  const temperature = typeof input.temperature === "number" ? input.temperature : 0.8;
  const topP = typeof input.topP === "number" ? input.topP : 0.95;
  const cfgScale = typeof input.cfgScale === "number" ? input.cfgScale : 1.0;
  const audioRepetitionPenalty = typeof input.audioRepetitionPenalty === "number" ? input.audioRepetitionPenalty : 1.2;
  const seed = typeof input.seed === "number" ? input.seed : 42;
  const sentenceSilence = typeof input.sentenceSilence === "number" ? input.sentenceSilence : 0.2;
  const timeoutMs = input.timeoutMs || 90000;

  // Attempt warm resident daemon first for sub-second start time (no 4s disk loading)
  let isDaemonReady = await checkDaemonHealthy(DEFAULT_DAEMON_PORT);
  if (!isDaemonReady) {
    isDaemonReady = await ensureZeroTtsDaemon(DEFAULT_DAEMON_PORT);
  }

  if (isDaemonReady) {
    try {
      const res = await fetch(`http://127.0.0.1:${DEFAULT_DAEMON_PORT}/synthesize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmedText,
          voice: voiceTarget,
          output: outputPath,
          modelId,
          speed,
          normalizeVi,
          temperature,
          topP,
          cfgScale,
          audioRepetitionPenalty,
          seed,
          sentenceSilence,
        }),
      });

      if (res.ok) {
        const parsed = (await res.json()) as { ok?: boolean; data?: ZeroTtsGenerateResult; error?: string };
        if (parsed.ok && parsed.data) {
          return parsed.data;
        }
      }
    } catch {
      // Seamlessly fall back to CLI execution if daemon fails
    }
  }

  const args = [
    scriptPath,
    "--action",
    "synthesize",
    "--text",
    trimmedText,
    "--voice",
    voiceTarget,
    "--output",
    outputPath,
    "--model-id",
    modelId,
    "--speed",
    String(speed),
    normalizeVi ? "--normalize-vi" : "--no-normalize-vi",
    "--temperature",
    String(temperature),
    "--top-p",
    String(topP),
    "--cfg-scale",
    String(cfgScale),
    "--audio-repetition-penalty",
    String(audioRepetitionPenalty),
    "--seed",
    String(seed),
    "--sentence-silence",
    String(sentenceSilence),
  ];

  try {
    const { stdout, stderr } = await execFileAsync(pythonBin, args, {
      timeout: timeoutMs,
      maxBuffer: 50 * 1024 * 1024,
    });

    if (stderr && stderr.trim()) {
      console.warn(`[ZeroTTS Runner Stderr]: ${stderr.trim()}`);
    }

    const parsed = JSON.parse(stdout);
    if (!parsed.ok || !parsed.data) {
      throw new ZeroTtsError({
        errorCode: parsed.errorCode || "ZERO_TTS_EXECUTION_FAILED",
        message: parsed.error || "ZeroTTS synthesis failed.",
        category: "execution",
        status: 500,
      });
    }

    return parsed.data as ZeroTtsGenerateResult;
  } catch (error) {
    if (error instanceof ZeroTtsError) throw error;

    if (error && typeof error === "object" && "stdout" in error && typeof (error as { stdout?: unknown }).stdout === "string") {
      try {
        const parsed = JSON.parse((error as { stdout: string }).stdout);
        if (parsed && !parsed.ok && parsed.error) {
          throw new ZeroTtsError({
            errorCode: parsed.errorCode || "ZERO_TTS_EXECUTION_FAILED",
            message: parsed.error,
            category: "execution",
            status: 400,
          });
        }
      } catch (e) {
        if (e instanceof ZeroTtsError) throw e;
      }
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("timed out") || errMsg.includes("ETIMEDOUT")) {
      throw new ZeroTtsError({
        errorCode: "ZERO_TTS_TIMEOUT",
        message: `ZeroTTS execution timed out after ${Math.round(timeoutMs / 1000)}s.`,
        category: "timeout",
        status: 504,
      });
    }

    throw new ZeroTtsError({
      errorCode: "ZERO_TTS_RUNTIME_ERROR",
      message: `ZeroTTS runner failed: ${errMsg}`,
      category: "execution",
      status: 500,
    });
  } finally {
    rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
