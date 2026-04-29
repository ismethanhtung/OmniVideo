"use client";

import { useMemo, useState } from "react";
import { Download, Loader2, Play, RadioTower, Volume2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

const REPO_PIPER_BINARY = "piper";
const REPO_PIPER_MODEL = "";
const REPO_PIPER_CONFIG = "";

type PiperTtsApiPayload =
  | {
      ok: true;
      data: {
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
      };
    }
  | {
      ok: false;
      errorCode?: string;
      error?: string;
    };

type PiperTtsSandboxPanelProps = {
  section: LeftbarNavItem;
};

export function PiperTtsSandboxPanel({ section }: PiperTtsSandboxPanelProps) {
  const Icon = section.icon ?? RadioTower;
  const [binaryPath, setBinaryPath] = useState(REPO_PIPER_BINARY);
  const [modelPath, setModelPath] = useState(REPO_PIPER_MODEL);
  const [configPath, setConfigPath] = useState(REPO_PIPER_CONFIG);
  const [speaker, setSpeaker] = useState("");
  const [lengthScale, setLengthScale] = useState("1.0");
  const [noiseScale, setNoiseScale] = useState("0.667");
  const [noiseW, setNoiseW] = useState("0.8");
  const [sentenceSilence, setSentenceSilence] = useState("0.2");
  const [text, setText] = useState(
    "Xin chao, day la trang test Piper TTS local trong OmniVideo.",
  );
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<
    Extract<PiperTtsApiPayload, { ok: true }>["data"] | null
  >(null);

  const audioUrl = useMemo(() => {
    if (!result) return null;
    return `data:${result.mimeType};base64,${result.audioBase64}`;
  }, [result]);

  const runTts = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/audio/piper-tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          binaryPath,
          modelPath,
          configPath,
          speaker,
          lengthScale,
          noiseScale,
          noiseW,
          sentenceSilence,
        }),
      });
      const payload = (await response.json()) as PiperTtsApiPayload;
      if (!payload.ok) {
        throw new Error(
          payload.errorCode
            ? `${payload.errorCode}: ${payload.error ?? "Piper TTS failed."}`
            : (payload.error ?? "Piper TTS failed."),
        );
      }
      setResult(payload.data);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Piper TTS request failed.",
      );
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="space-y-4">
      <header className="border border-main bg-main px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center border border-main bg-secondary/30">
            <Icon className="h-4 w-4 text-main" />
          </span>
          <div>
            <p className="text-sm font-semibold text-main">{section.label}</p>
            <p className="text-xs text-muted">{section.description}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 border border-main bg-main p-4 lg:grid-cols-2">
        <div className="flex items-end lg:col-span-2">
          <button
            type="button"
            onClick={() => {
              setBinaryPath(REPO_PIPER_BINARY);
              setModelPath(REPO_PIPER_MODEL);
              setConfigPath(REPO_PIPER_CONFIG);
            }}
            className="inline-flex items-center gap-2 border border-main bg-secondary/30 px-3 py-2 text-xs font-semibold text-main"
          >
            Use Repo Defaults
          </button>
        </div>

        <label className="space-y-1 text-xs text-main">
          Piper Executable
          <input
            value={binaryPath}
            onChange={(event) => setBinaryPath(event.target.value)}
            className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
            placeholder="piper or /absolute/path/to/piper"
          />
        </label>

        <label className="space-y-1 text-xs text-main">
          ONNX Model
          <input
            value={modelPath}
            onChange={(event) => setModelPath(event.target.value)}
            className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
            placeholder="auto: piper/model.onnx"
          />
        </label>

        <label className="space-y-1 text-xs text-main">
          Config JSON
          <input
            value={configPath}
            onChange={(event) => setConfigPath(event.target.value)}
            className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
            placeholder="auto: piper/model.onnx.json"
          />
        </label>

        <label className="space-y-1 text-xs text-main">
          Speaker
          <input
            value={speaker}
            onChange={(event) => setSpeaker(event.target.value)}
            className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
            placeholder="0"
            inputMode="numeric"
          />
        </label>

        {[
          ["Length Scale", lengthScale, setLengthScale],
          ["Noise Scale", noiseScale, setNoiseScale],
          ["Noise W", noiseW, setNoiseW],
          ["Sentence Silence", sentenceSilence, setSentenceSilence],
        ].map(([label, value, setter]) => (
          <label key={label as string} className="space-y-1 text-xs text-main">
            {label as string}
            <input
              value={value as string}
              onChange={(event) =>
                (setter as (nextValue: string) => void)(event.target.value)
              }
              className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
              inputMode="decimal"
            />
          </label>
        ))}
      </div>

      <label className="block space-y-1 border border-main bg-main p-4 text-xs text-main">
        Text Input
        <textarea
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="w-full border border-main bg-main px-3 py-2 text-sm text-main"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runTts}
          disabled={isRunning}
          className="inline-flex items-center gap-2 border border-main bg-secondary/40 px-3 py-2 text-sm font-semibold text-main disabled:opacity-60"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Generate Speech
        </button>
        {result ? (
          <p className="text-xs text-muted">
            {result.byteLength} bytes in {result.durationMs} ms
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {result && audioUrl ? (
        <div className="space-y-3 border border-main bg-main p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-main">
            <Volume2 className="h-4 w-4" />
            Generated WAV
          </div>
          <audio controls className="w-full" src={audioUrl} />
          <a
            href={audioUrl}
            download="piper-tts-sandbox.wav"
            className="inline-flex items-center gap-2 border border-main bg-secondary/30 px-3 py-2 text-xs font-semibold text-main"
          >
            <Download className="h-4 w-4" />
            Download Output
          </a>
        </div>
      ) : null}
    </section>
  );
}
