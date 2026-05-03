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
type VoiceGenerationApiPayload =
    | {
          ok: true;
          data: {
              audioBase64: string;
              mimeType: "audio/wav";
              extension: "wav";
              byteLength: number;
              generationDurationMs: number;
              segmentCount: number;
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
        "Xin chào, đây là trang test Piper TTS local trong OmniVideo.",
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
            const raw = text.trim();
            const looksLikeJsonArray = raw.startsWith("[") && raw.endsWith("]");
            let payload: PiperTtsApiPayload | VoiceGenerationApiPayload;
            if (looksLikeJsonArray) {
                const parsed = JSON.parse(raw) as Array<
                    Record<string, unknown>
                >;
                const segments = parsed
                    .map((item, index) => ({
                        id: Number(item.id ?? index),
                        start: Number(item.start ?? 0),
                        end: Number(item.end ?? Number(item.start ?? 0) + 1),
                        text: String(
                            item.translatedText ?? item.text ?? "",
                        ).trim(),
                    }))
                    .filter((segment) => segment.text.length > 0);
                const response = await fetch("/api/audio/voice-generation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        segments,
                        settings: {
                            binaryPath,
                            modelPath,
                            configPath,
                            speaker:
                                speaker === "" ? undefined : Number(speaker),
                            lengthScale:
                                lengthScale === ""
                                    ? undefined
                                    : Number(lengthScale),
                            noiseScale:
                                noiseScale === ""
                                    ? undefined
                                    : Number(noiseScale),
                            noiseW: noiseW === "" ? undefined : Number(noiseW),
                            sentenceSilence:
                                sentenceSilence === ""
                                    ? undefined
                                    : Number(sentenceSilence),
                            preserveTimestampGaps: true,
                            balancedTiming: true,
                        },
                    }),
                });
                payload = (await response.json()) as VoiceGenerationApiPayload;
            } else {
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
                payload = (await response.json()) as PiperTtsApiPayload;
            }
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Piper TTS failed."}`
                        : (payload.error ?? "Piper TTS failed."),
                );
            }
            setResult({
                ...payload.data,
                durationMs:
                    "durationMs" in payload.data
                        ? payload.data.durationMs
                        : payload.data.generationDurationMs,
                settings:
                    "settings" in payload.data
                        ? payload.data.settings
                        : {
                              modelPath,
                              configPath,
                              speaker: speaker ? Number(speaker) : undefined,
                              lengthScale: lengthScale
                                  ? Number(lengthScale)
                                  : undefined,
                              noiseScale: noiseScale
                                  ? Number(noiseScale)
                                  : undefined,
                              noiseW: noiseW ? Number(noiseW) : undefined,
                              sentenceSilence: sentenceSilence
                                  ? Number(sentenceSilence)
                                  : undefined,
                          },
            });
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
                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Voice Generation
                        </p>
                        <p className="text-[10px] leading-4 text-muted">
                            Sinh voice tiếng Việt từ translated segments bằng
                            Piper local.
                        </p>
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Piper executable
                            </span>
                            <input
                                value={binaryPath}
                                onChange={(event) =>
                                    setBinaryPath(event.target.value)
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                placeholder="piper"
                            />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    ONNX model
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
                        </div>
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
                        <div className="grid gap-2 sm:grid-cols-2">
                            {(
                                [
                                    [
                                        "Length scale",
                                        lengthScale,
                                        setLengthScale,
                                        0.05,
                                    ],
                                    [
                                        "Noise scale",
                                        noiseScale,
                                        setNoiseScale,
                                        0.01,
                                    ],
                                    ["Noise W", noiseW, setNoiseW, 0.01],
                                    [
                                        "Sentence silence",
                                        sentenceSilence,
                                        setSentenceSilence,
                                        0.05,
                                    ],
                                ] as const
                            ).map(([label, value, setter, step]) => (
                                <label key={label} className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        {label}
                                    </span>
                                    <input
                                        type="number"
                                        step={step}
                                        value={value}
                                        onChange={(event) =>
                                            setter(event.target.value)
                                        }
                                        className="w-full border border-main bg-main px-2.5 py-2 text-[12px] text-main"
                                    />
                                </label>
                            ))}
                        </div>
                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span>
                                <span className="block text-[11px] font-semibold text-main">
                                    Balanced timing
                                </span>
                                <span className="block text-[10px] text-muted">
                                    Giữ thứ tự/timeline tương đối, nhưng giới
                                    hạn pause dài và speed-up quá mạnh.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked
                                disabled
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>
                    </div>
                </aside>

                <div className="space-y-4">
                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Voice Generation
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-muted">
                            Sinh voice tiếng Việt từ text hoặc
                            `translatedSegments` JSON bằng Piper local.
                        </p>
                        <textarea
                            rows={7}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            className="mt-3 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main placeholder:text-muted/60"
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
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
