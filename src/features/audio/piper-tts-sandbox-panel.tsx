"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, RadioTower, Volume2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import type {
    AudioTranscriptionStep,
    ChineseTranscriptionResult,
} from "@/lib/multilingual-audio/types";

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

type StoredVideoAsset = {
    _id: string;
    sizeBytes?: number | null;
    metadata?: {
        title?: string | null;
        tags?: string[] | null;
        folder?: string | null;
    };
    storageProvider?: string;
};

type TranscriptionApiPayload =
    | {
          ok: true;
          data: ChineseTranscriptionResult;
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
          steps?: AudioTranscriptionStep[];
      };

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "00:00.000";
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds - minutes * 60;
    return `${String(minutes).padStart(2, "0")}:${remaining
        .toFixed(3)
        .padStart(6, "0")}`;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "n/a";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

type PiperTtsSandboxPanelProps = {
    section: LeftbarNavItem;
};

export function PiperTtsSandboxPanel({ section }: PiperTtsSandboxPanelProps) {
    const Icon = section.icon ?? RadioTower;
    const [file, setFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetBrowser, setShowAssetBrowser] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");
    const [language, setLanguage] = useState("zh");
    const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);
    const [retryPromptHardConstraint, setRetryPromptHardConstraint] =
        useState(true);
    const [transcriptPrompt, setTranscriptPrompt] = useState("");
    const [isRunningTranscript, setIsRunningTranscript] = useState(false);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [transcriptSteps, setTranscriptSteps] = useState<
        AudioTranscriptionStep[]
    >([]);
    const [transcriptResult, setTranscriptResult] =
        useState<ChineseTranscriptionResult | null>(null);
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

    useEffect(() => {
        fetch("/api/storage/assets?limit=50", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: StoredVideoAsset[] }) => {
                if (payload.ok && payload.data) setAssets(payload.data);
            })
            .catch(() => {});
    }, []);

    const audioUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.audioBase64}`;
    }, [result]);
    const selectedAsset = useMemo(
        () => assets.find((asset) => asset._id === selectedAssetId) ?? null,
        [assets, selectedAssetId],
    );
    const visibleAssets = useMemo(() => {
        const query = assetSearchQuery.trim().toLowerCase();
        if (!query) return assets;
        return assets.filter((asset) => {
            const title = asset.metadata?.title?.toLowerCase() ?? "";
            const id = asset._id.toLowerCase();
            const folder = asset.metadata?.folder?.toLowerCase() ?? "";
            const tags = (asset.metadata?.tags ?? []).join(" ").toLowerCase();
            return (
                title.includes(query) ||
                id.includes(query) ||
                folder.includes(query) ||
                tags.includes(query)
            );
        });
    }, [assetSearchQuery, assets]);

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

    const runTranscript = async () => {
        if (!file && !selectedAssetId) {
            setTranscriptError("Upload video/audio hoặc chọn 1 storage asset.");
            return;
        }
        setIsRunningTranscript(true);
        setTranscriptError(null);
        setTranscriptSteps([]);
        setTranscriptResult(null);
        try {
            const formData = new FormData();
            if (file) formData.append("videoFile", file);
            if (selectedAssetId) formData.append("assetId", selectedAssetId);
            formData.append("language", language);
            formData.append(
                "includeWordTimestamps",
                includeWordTimestamps ? "true" : "false",
            );
            formData.append(
                "retryPromptHardConstraint",
                retryPromptHardConstraint ? "true" : "false",
            );
            if (transcriptPrompt.trim()) {
                formData.append("prompt", transcriptPrompt.trim());
            }
            const response = await fetch("/api/audio/chinese-transcription", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as TranscriptionApiPayload;
            if (!payload.ok) {
                setTranscriptSteps(payload.steps ?? []);
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Transcription failed."}`
                        : (payload.error ?? "Transcription failed."),
                );
            }
            setTranscriptResult(payload.data);
            setTranscriptSteps(payload.data.steps);
        } catch (requestError) {
            setTranscriptError(
                requestError instanceof Error
                    ? requestError.message
                    : "Transcription request failed.",
            );
        } finally {
            setIsRunningTranscript(false);
        }
    };

    return (
        <section className="border border-main bg-main">
            <header className="border-b border-main bg-secondary/45 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted" />
                    <h1 className="text-[15px] font-semibold text-main">
                        {section.label}
                    </h1>
                </div>
                <p className="mt-1 text-[12px] leading-5 text-muted">
                    {section.description}
                </p>
            </header>

            <div className="space-y-5 p-5">
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Transcript Retry Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Input & Settings
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Upload video/audio
                                </span>
                                <input
                                    type="file"
                                    accept="video/*,audio/*"
                                    onChange={(event) =>
                                        setFile(event.target.files?.[0] ?? null)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                                />
                            </label>
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-muted">
                                    Video Asset
                                </p>
                                <div className="flex items-center justify-between gap-2 border border-main bg-main px-2 py-1.5">
                                    <span className="truncate text-[11px] text-main">
                                        {selectedAsset?.metadata?.title ??
                                            selectedAsset?._id ??
                                            "Select asset"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAssetBrowser(
                                                (previous) => !previous,
                                            )
                                        }
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/70"
                                    >
                                        {showAssetBrowser ? "Close" : "Browse"}
                                    </button>
                                </div>
                                {showAssetBrowser ? (
                                    <div className="max-h-56 overflow-y-auto border border-main bg-main">
                                        <div className="border-b border-main p-2">
                                            <input
                                                value={assetSearchQuery}
                                                onChange={(event) =>
                                                    setAssetSearchQuery(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search title, folder, tags..."
                                                className="w-full border border-main bg-main px-2 py-1 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                            />
                                        </div>
                                        {visibleAssets.length === 0 ? (
                                            <p className="px-3 py-4 text-[11px] text-muted">
                                                No matching asset.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 p-2">
                                                {visibleAssets.map((asset) => {
                                                    const isSelected =
                                                        selectedAssetId ===
                                                        asset._id;
                                                    return (
                                                        <button
                                                            key={asset._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAssetId(
                                                                    asset._id,
                                                                );
                                                                setFile(null);
                                                                setShowAssetBrowser(
                                                                    false,
                                                                );
                                                            }}
                                                            className={`w-full border p-2 text-left hover:opacity-90 ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main"}`}
                                                        >
                                                            <p className="truncate text-[12px] font-semibold text-main">
                                                                {asset.metadata
                                                                    ?.title ??
                                                                    asset._id}
                                                            </p>
                                                            <p className="mt-1 truncate text-[10px] text-muted">
                                                                {[
                                                                    asset
                                                                        .metadata
                                                                        ?.folder,
                                                                    ...(asset
                                                                        .metadata
                                                                        ?.tags ??
                                                                        []),
                                                                    asset.storageProvider,
                                                                    formatBytes(
                                                                        asset.sizeBytes ??
                                                                            0,
                                                                    ),
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(" · ")}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Language
                                </span>
                                <input
                                    value={language}
                                    onChange={(event) =>
                                        setLanguage(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="zh"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Base prompt (optional)
                                </span>
                                <textarea
                                    rows={2}
                                    value={transcriptPrompt}
                                    onChange={(event) =>
                                        setTranscriptPrompt(event.target.value)
                                    }
                                    className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main"
                                />
                            </label>
                            <label className="flex items-center justify-between border border-main bg-main px-3 py-2 text-[11px]">
                                <span className="font-semibold text-main">
                                    Hard constraint retry prompt
                                </span>
                                <input
                                    type="checkbox"
                                    checked={retryPromptHardConstraint}
                                    onChange={(event) =>
                                        setRetryPromptHardConstraint(
                                            event.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                            </label>
                            <label className="flex items-center justify-between border border-main bg-main px-3 py-2 text-[11px]">
                                <span className="font-semibold text-main">
                                    Include word timestamps
                                </span>
                                <input
                                    type="checkbox"
                                    checked={includeWordTimestamps}
                                    onChange={(event) =>
                                        setIncludeWordTimestamps(
                                            event.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                            </label>
                        <button
                            type="button"
                            onClick={runTranscript}
                            disabled={isRunningTranscript}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRunningTranscript
                                ? "Transcribing..."
                                : "Run Transcript Test"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {transcriptError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {transcriptError}
                                </p>
                            ) : null}
                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Segments
                                </p>
                                {transcriptResult ? (
                                    <p className="mt-1 text-[10px] text-muted">
                                        {transcriptResult.segments.length}{" "}
                                        segment(s) ·{" "}
                                        {transcriptResult.words.length} word(s)
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[10px] text-muted">
                                        Run transcription to inspect segment
                                        splits.
                                    </p>
                                )}
                                {transcriptResult ? (
                                    <div className="mt-3 max-h-[420px] overflow-auto border border-main bg-main">
                                        {transcriptResult.segments.map(
                                            (segment) => (
                                                <div
                                                    key={`${segment.id}-${segment.start}`}
                                                    className="border-b border-main px-3 py-2 last:border-b-0"
                                                >
                                                    <p className="text-[10px] font-semibold text-muted">
                                                        #{segment.id + 1} ·{" "}
                                                        {formatTime(
                                                            segment.start,
                                                        )}{" "}
                                                        {"->"}{" "}
                                                        {formatTime(
                                                            segment.end,
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] leading-5 text-main">
                                                        {segment.text}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            {transcriptSteps.length > 0 ? (
                                <div className="border border-main bg-secondary/20 p-4">
                                    <p className="text-[12px] font-semibold text-main">
                                        Run Steps
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {transcriptSteps.map((step, index) => (
                                            <p
                                                key={`${step.id}-${index}`}
                                                className="text-[10px] leading-4 text-muted"
                                            >
                                                {index + 1}. {step.label}:{" "}
                                                {step.status} - {step.detail}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
                <div className="border-t border-main/70" />
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Voice Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Piper Settings
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
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                    value={modelPath}
                                    onChange={(event) =>
                                        setModelPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="ONNX model"
                                />
                                <input
                                    value={configPath}
                                    onChange={(event) =>
                                        setConfigPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="Config JSON"
                                />
                            </div>
                            <input
                                value={speaker}
                                onChange={(event) =>
                                    setSpeaker(event.target.value)
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                placeholder="Speaker"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                    [
                                        [
                                            "Length scale",
                                            lengthScale,
                                            setLengthScale,
                                        ],
                                        [
                                            "Noise scale",
                                            noiseScale,
                                            setNoiseScale,
                                        ],
                                        ["Noise W", noiseW, setNoiseW],
                                        [
                                            "Sentence silence",
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
                                        />
                                    </label>
                                    ))}
                            </div>
                            <button
                                type="button"
                                onClick={runTts}
                                disabled={isRunning}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRunning ? "Generating..." : "Generate Speech"}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Voice Input
                                </p>
                                <textarea
                                    rows={8}
                                    value={text}
                                    onChange={(event) =>
                                        setText(event.target.value)
                                    }
                                    className="mt-2 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main"
                                />
                                {error ? (
                                    <p className="mt-3 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                            {result && audioUrl ? (
                                <div className="border border-main bg-secondary/20 p-4">
                                    <div className="flex items-center gap-2">
                                        <Volume2 className="h-4 w-4 text-muted" />
                                        <p className="text-[12px] font-semibold text-main">
                                            Generated WAV
                                        </p>
                                    </div>
                                    <p className="mt-1 text-[10px] text-muted">
                                        {result.byteLength} bytes ·{" "}
                                        {result.durationMs} ms
                                    </p>
                                    <audio
                                        controls
                                        className="mt-3 w-full"
                                        src={audioUrl}
                                    />
                                    <a
                                        href={audioUrl}
                                        download="piper-tts-sandbox.wav"
                                        className="mt-3 inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        <Download className="h-3 w-3" />
                                        Download WAV
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
