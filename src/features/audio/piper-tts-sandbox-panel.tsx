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
        <section className="border border-main bg-main">
            <header className="flex flex-col gap-3 border-b border-main bg-secondary/45 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted" />
                        <h1 className="truncate text-[15px] font-semibold text-main">
                            {section.label}
                        </h1>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
                        {section.description}
                    </p>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 text-[10px] text-muted">
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Engine</p>
                        <p>Piper ONNX</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Device</p>
                        <p>CPU only</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <RadioTower className="h-4 w-4 text-muted" />
                            <p className="text-[12px] font-semibold text-main">
                                Piper Config
                            </p>
                        </div>
                        <div className="mt-3 space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Piper Executable
                                </span>
                                <input
                                    value={binaryPath}
                                    onChange={(event) =>
                                        setBinaryPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                    placeholder="piper or /absolute/path/to/piper"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    ONNX Model
                                </span>
                                <input
                                    value={modelPath}
                                    onChange={(event) =>
                                        setModelPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                    placeholder="auto: piper/model.onnx"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Config JSON
                                </span>
                                <input
                                    value={configPath}
                                    onChange={(event) =>
                                        setConfigPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                    placeholder="auto: piper/model.onnx.json"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setBinaryPath(REPO_PIPER_BINARY);
                                    setModelPath(REPO_PIPER_MODEL);
                                    setConfigPath(REPO_PIPER_CONFIG);
                                }}
                                className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary"
                            >
                                Use Repo Defaults
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Synthesis Params
                        </p>
                        <p className="text-[10px] leading-4 text-muted">
                            Tuỳ chỉnh speaker và noise params cho Piper model.
                        </p>
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Speaker
                            </span>
                            <input
                                value={speaker}
                                onChange={(event) =>
                                    setSpeaker(event.target.value)
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                placeholder="0"
                                inputMode="numeric"
                            />
                        </label>
                        {(
                            [
                                ["Length Scale", lengthScale, setLengthScale],
                                ["Noise Scale", noiseScale, setNoiseScale],
                                ["Noise W", noiseW, setNoiseW],
                                [
                                    "Sentence Silence",
                                    sentenceSilence,
                                    setSentenceSilence,
                                ],
                            ] as const
                        ).map(([label, value, setter]) => (
                            <label key={label} className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    {label}
                                </span>
                                <input
                                    value={value}
                                    onChange={(event) =>
                                        setter(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    inputMode="decimal"
                                />
                            </label>
                        ))}
                    </div>
                </aside>

                <div className="space-y-4">
                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Text Input
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-muted">
                            Nhập văn bản cần chuyển thành giọng nói.
                        </p>
                        <textarea
                            rows={7}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="mt-3 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main placeholder:text-muted/60"
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={runTts}
                                disabled={isRunning}
                                className="inline-flex items-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRunning ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                {isRunning
                                    ? "Generating..."
                                    : "Generate Speech"}
                            </button>
                            {result ? (
                                <p className="text-[11px] text-muted">
                                    {result.byteLength} bytes ·{" "}
                                    {result.durationMs} ms
                                </p>
                            ) : null}
                        </div>

                        {error ? (
                            <p className="mt-3 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                {error}
                            </p>
                        ) : null}
                    </div>

                    {result && audioUrl ? (
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <div className="flex items-center gap-2">
                                <Volume2 className="h-4 w-4 text-muted" />
                                <p className="text-[12px] font-semibold text-main">
                                    Generated WAV
                                </p>
                            </div>
                            <audio controls className="w-full" src={audioUrl} />
                            <div className="grid gap-2 border border-main bg-main p-3 text-[11px] text-muted sm:grid-cols-3">
                                <p>
                                    <span className="block font-semibold text-main">
                                        Format
                                    </span>
                                    {result.extension}
                                </p>
                                <p>
                                    <span className="block font-semibold text-main">
                                        Size
                                    </span>
                                    {result.byteLength} bytes
                                </p>
                                <p>
                                    <span className="block font-semibold text-main">
                                        Runtime
                                    </span>
                                    {result.durationMs} ms
                                </p>
                            </div>
                            <a
                                href={audioUrl}
                                download="piper-tts-sandbox.wav"
                                className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                            >
                                <Download className="h-3 w-3" />
                                Download WAV
                            </a>
                        </div>
                    ) : null}
                </div>
            </div>
        </section>
    );
}
