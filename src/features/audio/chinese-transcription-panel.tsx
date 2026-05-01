"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Captions,
    Copy,
    Download,
    FileAudio,
    Loader2,
    Mic2,
    Volume2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import type {
    AudioTranscriptionStep,
    ChineseTranscriptionResult,
    TranscriptTranslationResult,
    VietnameseVideoMetadataResult,
    VoiceGenerationResult,
} from "@/lib/multilingual-audio/types";
import { DEFAULT_PIPER_TTS_SETTINGS } from "@/lib/multilingual-audio/types";
import {
    parseTranscriptSession,
    serializeTranscriptSession,
    TRANSCRIPT_SESSION_STORAGE_KEY,
} from "@/lib/multilingual-audio/transcript-session";

type AiProviderOption = {
    _id: string;
    label: string;
    providerType: string;
    status: string;
};

type AiModelOption = {
    id: string;
    name: string;
};

type ChineseTranscriptionPanelProps = {
    section: LeftbarNavItem;
};

type StoredVideoAsset = {
    _id: string;
    sizeBytes?: number | null;
    metadata?: {
        title?: string | null;
        description?: string | null;
        vietnameseTitle?: string | null;
        vietnameseDescription?: string | null;
        vietnameseHashtags?: string[] | null;
        originPlatform?: string | null;
        actualQuality?: string | null;
    };
    createdFrom?: {
        storageProviderLabel?: string | null;
    };
    storageProvider: string;
};

type ApiPayload =
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

type TranslationApiPayload =
    | {
          ok: true;
          data: TranscriptTranslationResult;
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type VoiceGenerationApiPayload =
    | {
          ok: true;
          data: VoiceGenerationResult;
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
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

function formatDurationMs(ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return "n/a";
    if (ms < 1000) return `${ms.toFixed(0)} ms`;
    const seconds = ms / 1000;
    if (seconds < 10) return `${seconds.toFixed(2)} s`;
    return `${seconds.toFixed(1)} s`;
}

function stepTone(status: AudioTranscriptionStep["status"]) {
    if (status === "success") return "text-emerald-700";
    if (status === "failed") return "text-rose-700";
    return "text-muted";
}

function StepTracePanel({ steps }: { steps: AudioTranscriptionStep[] }) {
    const [collapsed, setCollapsed] = useState(false);
    if (steps.length === 0) return null;

    return (
        <div className="border border-main bg-main">
            <div className="flex items-center justify-between border-b border-main bg-secondary/30 px-4 py-2">
                <p className="text-[12px] font-semibold text-main">Run steps</p>
                <button
                    type="button"
                    onClick={() => setCollapsed((previous) => !previous)}
                    className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                >
                    {collapsed ? (
                        <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Show
                        </>
                    ) : (
                        <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Hide
                        </>
                    )}
                </button>
            </div>
            {!collapsed ? (
                <div className="divide-y divide-[var(--border-color)]">
                    {steps.map((step, index) => (
                        <div
                            key={`${step.id}-${index}`}
                            className="grid gap-2 px-4 py-3 lg:grid-cols-[150px_minmax(0,1fr)]"
                        >
                            <div>
                                <p className="text-[11px] font-semibold text-main">
                                    {index + 1}. {step.label}
                                </p>
                                <p
                                    className={`mt-0.5 text-[10px] font-bold uppercase ${stepTone(
                                        step.status,
                                    )}`}
                                >
                                    {step.status}
                                </p>
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] leading-5 text-muted">
                                    {step.detail}
                                </p>
                                {step.metrics ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {Object.entries(step.metrics).map(
                                            ([key, value]) => (
                                                <span
                                                    key={key}
                                                    className="border border-main bg-secondary/25 px-2 py-1 text-[10px] text-main"
                                                >
                                                    {key}: {String(value)}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export function ChineseTranscriptionPanel({
    section,
}: ChineseTranscriptionPanelProps) {
    const Icon = section.icon;
    const [file, setFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [language, setLanguage] = useState("zh");
    const [prompt, setPrompt] = useState("");
    const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);

    const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState("");
    const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
    const [translationModel, setTranslationModel] = useState("");
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [ttsBinaryPath, setTtsBinaryPath] = useState<string>(
        DEFAULT_PIPER_TTS_SETTINGS.binaryPath,
    );
    const [ttsModelPath, setTtsModelPath] = useState<string>(
        DEFAULT_PIPER_TTS_SETTINGS.modelPath,
    );
    const [ttsConfigPath, setTtsConfigPath] = useState<string>(
        DEFAULT_PIPER_TTS_SETTINGS.configPath,
    );
    const [ttsSpeaker, setTtsSpeaker] = useState<number>(
        DEFAULT_PIPER_TTS_SETTINGS.speaker,
    );
    const [ttsLengthScale, setTtsLengthScale] = useState<number>(
        DEFAULT_PIPER_TTS_SETTINGS.lengthScale,
    );
    const [ttsNoiseScale, setTtsNoiseScale] = useState<number>(
        DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
    );
    const [ttsNoiseW, setTtsNoiseW] = useState<number>(
        DEFAULT_PIPER_TTS_SETTINGS.noiseW,
    );
    const [ttsSentenceSilence, setTtsSentenceSilence] = useState<number>(
        DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
    );
    const [ttsPreserveTimestampGaps, setTtsPreserveTimestampGaps] =
        useState<boolean>(DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps);
    const [segmentView, setSegmentView] = useState<"source" | "translation">(
        "source",
    );
    const [isRunning, setIsRunning] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
    const [isSavingMetadata, setIsSavingMetadata] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [translationError, setTranslationError] = useState<string | null>(
        null,
    );
    const [voiceError, setVoiceError] = useState<string | null>(null);
    const [metadataError, setMetadataError] = useState<string | null>(null);
    const [metadataSaveMessage, setMetadataSaveMessage] = useState<string | null>(
        null,
    );
    const [result, setResult] = useState<ChineseTranscriptionResult | null>(
        null,
    );
    const [translation, setTranslation] =
        useState<TranscriptTranslationResult | null>(null);
    const [voiceResult, setVoiceResult] =
        useState<VoiceGenerationResult | null>(null);
    const [videoMetadata, setVideoMetadata] =
        useState<VietnameseVideoMetadataResult | null>(null);
    const [steps, setSteps] = useState<AudioTranscriptionStep[]>([]);
    const [copiedSegmentsLabel, setCopiedSegmentsLabel] = useState<
        "json" | "text" | null
    >(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(false);
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const voicePreviewRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetch("/api/ai-providers")
            .then((res) => res.json())
            .then((payload: { ok: boolean; data?: AiProviderOption[] }) => {
                if (payload.ok && payload.data) {
                    const active = payload.data.filter(
                        (p) => p.status === "active",
                    );
                    setAiProviders(active);
                    if (active.length > 0 && !selectedProviderId) {
                        setSelectedProviderId(active[0]._id);
                    }
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch("/api/storage/assets?limit=100", {
            method: "GET",
            cache: "no-store",
        })
            .then((res) => res.json())
            .then((payload: { ok: boolean; data?: StoredVideoAsset[] }) => {
                if (payload.ok && payload.data) {
                    setAssets(payload.data);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const saved = parseTranscriptSession(
            window.localStorage.getItem(TRANSCRIPT_SESSION_STORAGE_KEY),
        );
        if (saved) {
            setLanguage(saved.language);
            setPrompt(saved.prompt);
            setIncludeWordTimestamps(saved.includeWordTimestamps);
            setSelectedProviderId(saved.selectedProviderId);
            setTranslationModel(saved.translationModel);
            setSelectedAssetId(saved.selectedAssetId);
            setSegmentView(saved.segmentView);
            setSteps(saved.steps);
            setResult(saved.result);
            setTranslation(saved.translation);
        }
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        try {
            window.localStorage.setItem(
                TRANSCRIPT_SESSION_STORAGE_KEY,
                serializeTranscriptSession({
                    language,
                    prompt,
                    includeWordTimestamps,
                    selectedProviderId,
                    translationModel,
                    selectedAssetId,
                    segmentView,
                    steps,
                    result,
                    translation,
                }),
            );
        } catch {
            // Keep page usable even when browser storage quota is exceeded.
        }
    }, [
        includeWordTimestamps,
        isHydrated,
        language,
        prompt,
        result,
        segmentView,
        selectedAssetId,
        selectedProviderId,
        steps,
        translation,
        translationModel,
    ]);

    const fetchModelsForProvider = async (providerId: string) => {
        if (!providerId) {
            setAiModels([]);
            setTranslationModel("");
            return;
        }
        setIsLoadingModels(true);
        try {
            const res = await fetch(`/api/ai-providers/${providerId}/models`);
            const payload = (await res.json()) as {
                ok: boolean;
                data?: AiModelOption[];
            };
            if (payload.ok && payload.data) {
                setAiModels(payload.data);
                if (payload.data.length > 0) {
                    setTranslationModel(payload.data[0].id);
                }
            } else {
                setAiModels([]);
            }
        } catch {
            setAiModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleProviderChange = (providerId: string) => {
        setSelectedProviderId(providerId);
        setTranslationModel("");
        setAiModels([]);
        if (providerId) {
            fetchModelsForProvider(providerId);
        }
    };

    const runTranscription = async () => {
        if (!file && !selectedAssetId) {
            setError(
                "Chọn video/audio upload hoặc Storage Library asset trước khi chạy transcription.",
            );
            return;
        }

        // New extract/transcribe run should start from a clean session.
        window.localStorage.removeItem(TRANSCRIPT_SESSION_STORAGE_KEY);
        setIsRunning(true);
        setError(null);
        setTranslationError(null);
        setVoiceError(null);
        setResult(null);
        setTranslation(null);
        setVoiceResult(null);
        setSteps([]);

        try {
            const formData = new FormData();
            if (file) {
                formData.set("videoFile", file);
            } else if (selectedAssetId) {
                formData.set("assetId", selectedAssetId);
            }
            formData.set("language", language);
            formData.set(
                "includeWordTimestamps",
                String(includeWordTimestamps),
            );
            if (prompt.trim()) {
                formData.set("prompt", prompt.trim());
            }

            const response = await fetch("/api/audio/chinese-transcription", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as ApiPayload;

            if (!payload.ok) {
                setSteps(payload.steps ?? []);
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Transcription failed."}`
                        : (payload.error ?? "Transcription failed."),
                );
            }

            setSteps(payload.data.steps);
            setResult(payload.data);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Transcription failed.",
            );
        } finally {
            setIsRunning(false);
        }
    };

    const runTranslation = async () => {
        if (!result?.segments.length) {
            setTranslationError("Chưa có transcript segments để dịch.");
            return;
        }

        setIsTranslating(true);
        setTranslationError(null);
        setTranslation(null);
        setVoiceError(null);
        setVoiceResult(null);
        setMetadataError(null);
        setMetadataSaveMessage(null);
        setVideoMetadata(null);

        try {
            const response = await fetch("/api/audio/transcript-translation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    segments: result.segments,
                    sourceLanguage: result.language || language,
                    targetLanguage: "vi",
                    model: translationModel,
                    providerId: selectedProviderId || undefined,
                }),
            });
            const payload = (await response.json()) as TranslationApiPayload;

            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Translation failed."}`
                        : (payload.error ?? "Translation failed."),
                );
            }

            setTranslation(payload.data);
            setSegmentView("translation");
        } catch (requestError) {
            setTranslationError(
                requestError instanceof Error
                    ? requestError.message
                    : "Translation failed.",
            );
        } finally {
            setIsTranslating(false);
        }
    };

    const runVoiceGeneration = async () => {
        if (!translation?.translatedSegments.length) {
            setVoiceError("Chưa có bản dịch tiếng Việt để sinh voice.");
            return;
        }

        setIsGeneratingVoice(true);
        setVoiceError(null);
        setVoiceResult(null);

        try {
            const response = await fetch("/api/audio/voice-generation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    segments: translation.translatedSegments.map((segment) => ({
                        id: segment.id,
                        start: segment.start,
                        end: segment.end,
                        text: segment.translatedText,
                    })),
                    settings: {
                        binaryPath: ttsBinaryPath,
                        modelPath: ttsModelPath,
                        configPath: ttsConfigPath,
                        speaker: ttsSpeaker,
                        lengthScale: ttsLengthScale,
                        noiseScale: ttsNoiseScale,
                        noiseW: ttsNoiseW,
                        sentenceSilence: ttsSentenceSilence,
                        preserveTimestampGaps: ttsPreserveTimestampGaps,
                    },
                }),
            });
            const payload =
                (await response.json()) as VoiceGenerationApiPayload;

            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Voice generation failed."}`
                        : (payload.error ?? "Voice generation failed."),
                );
            }

            setVoiceResult(payload.data);
        } catch (requestError) {
            setVoiceError(
                requestError instanceof Error
                    ? requestError.message
                    : "Voice generation failed.",
            );
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const runVideoMetadata = async () => {
        if (!translation?.translatedSegments.length) {
            setMetadataError("Chưa có bản dịch tiếng Việt để tạo metadata.");
            return;
        }

        setIsGeneratingMetadata(true);
        setMetadataError(null);
        setMetadataSaveMessage(null);

        try {
            const response = await fetch("/api/audio/video-metadata", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    translatedSegments: translation.translatedSegments,
                    sourceTitle:
                        selectedAsset?.metadata?.title ?? file?.name ?? "",
                    sourceDescription:
                        selectedAsset?.metadata?.description ?? "",
                    model: translationModel,
                    providerId: selectedProviderId || undefined,
                }),
            });
            const payload = (await response.json()) as
                | { ok: true; data: VietnameseVideoMetadataResult }
                | { ok: false; errorCode?: string; error?: string };

            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Metadata generation failed."}`
                        : (payload.error ?? "Metadata generation failed."),
                );
            }

            setVideoMetadata(payload.data);
        } catch (requestError) {
            setMetadataError(
                requestError instanceof Error
                    ? requestError.message
                    : "Metadata generation failed.",
            );
        } finally {
            setIsGeneratingMetadata(false);
        }
    };

    const saveVideoMetadata = async () => {
        if (!selectedAssetId || !videoMetadata) {
            setMetadataSaveMessage(
                "Chưa chọn Storage Asset hoặc chưa có metadata để lưu.",
            );
            return;
        }

        setIsSavingMetadata(true);
        setMetadataSaveMessage(null);
        try {
            const response = await fetch(`/api/storage/assets/${selectedAssetId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    metadata: {
                        vietnameseTitle: videoMetadata.title,
                        vietnameseDescription: videoMetadata.description,
                        vietnameseHashtags: videoMetadata.hashtags,
                    },
                }),
            });
            const payload = (await response.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error ?? "Lưu metadata thất bại.");
            }
            setMetadataSaveMessage("Đã lưu metadata tiếng Việt vào asset.");
        } catch (requestError) {
            setMetadataSaveMessage(
                requestError instanceof Error
                    ? requestError.message
                    : "Lưu metadata thất bại.",
            );
        } finally {
            setIsSavingMetadata(false);
        }
    };

    const translationById = new Map(
        translation?.translatedSegments.map((segment) => [
            segment.id,
            segment,
        ]) ?? [],
    );
    const voiceAudioUrl = voiceResult
        ? `data:${voiceResult.mimeType};base64,${voiceResult.audioBase64}`
        : null;
    const extractedAudioUrl = result?.audio.audioPreviewBase64
        ? `data:audio/mpeg;base64,${result.audio.audioPreviewBase64}`
        : null;
    const sourceVideoPreviewUrl = useMemo(() => {
        if (file) {
            return URL.createObjectURL(file);
        }
        if (selectedAssetId) {
            return `/api/storage/assets/${selectedAssetId}/download?disposition=inline`;
        }
        return null;
    }, [file, selectedAssetId]);

    useEffect(() => {
        if (!file || !sourceVideoPreviewUrl) return;
        return () => URL.revokeObjectURL(sourceVideoPreviewUrl);
    }, [file, sourceVideoPreviewUrl]);

    const playDubPreview = async () => {
        const video = videoPreviewRef.current;
        const audio = voicePreviewRef.current;
        if (!video || !audio) return;
        video.muted = true;
        video.currentTime = 0;
        audio.currentTime = 0;
        await Promise.all([video.play(), audio.play()]);
    };

    const pauseDubPreview = () => {
        videoPreviewRef.current?.pause();
        voicePreviewRef.current?.pause();
    };

    const resetDubPreview = () => {
        pauseDubPreview();
        if (videoPreviewRef.current) videoPreviewRef.current.currentTime = 0;
        if (voicePreviewRef.current) voicePreviewRef.current.currentTime = 0;
    };
    const selectedAsset =
        assets.find((asset) => asset._id === selectedAssetId) ?? null;
    const copySegmentsToClipboard = async (mode: "json" | "text") => {
        if (!result) return;

        const text =
            mode === "json"
                ? JSON.stringify(translation?.translatedSegments ?? [], null, 2)
                : result.segments
                      .map((segment) => {
                          const translated = translationById.get(segment.id);
                          const displayText =
                              segmentView === "translation" && translated
                                  ? translated.translatedText
                                  : segment.text;
                          const sourceLine =
                              translated && segmentView === "translation"
                                  ? `\nSource: ${translated.sourceText}`
                                  : "";
                          return `${formatTime(segment.start)} -> ${formatTime(
                              segment.end,
                          )}\n${displayText}${sourceLine}`;
                      })
                      .join("\n\n");

        await navigator.clipboard.writeText(text);
        setCopiedSegmentsLabel(mode);
        window.setTimeout(() => setCopiedSegmentsLabel(null), 1800);
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
                <div className="grid shrink-0 grid-cols-3 gap-2 text-[10px] text-muted">
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Model</p>
                        <p>whisper-large-v3-turbo</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Language</p>
                        <p>{language || "auto"}</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Audio</p>
                        <p>MP3 mono 16k</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 p-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Source Video
                            </p>
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video/audio file
                            </span>
                            <input
                                type="file"
                                accept="video/*,audio/*,.mp4,.mov,.webm,.mp3,.m4a,.wav,.ogg"
                                disabled={isRunning}
                                onChange={(event) => {
                                    const pickedFile =
                                        event.currentTarget.files?.[0] ?? null;
                                    setFile(pickedFile);
                                    if (pickedFile) {
                                        setSelectedAssetId("");
                                        setShowAssetPicker(false);
                                    }
                                }}
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        {file ? (
                            <p className="mt-2 truncate text-[11px] text-muted">
                                {file.name} ·{" "}
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        ) : null}
                        <div className="mt-3">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video Asset
                            </span>
                            <button
                                type="button"
                                onClick={() =>
                                    setShowAssetPicker((previous) => !previous)
                                }
                                disabled={isRunning}
                                className="flex w-full items-center justify-between border border-main bg-main px-3 py-2 text-left text-[12px] text-main"
                            >
                                <span className="truncate">
                                    {selectedAsset?.metadata?.title ??
                                        selectedAsset?._id ??
                                        "Select asset"}
                                </span>
                                <span className="ml-2 text-[11px] text-muted">
                                    {showAssetPicker ? "Close" : "Browse"}
                                </span>
                            </button>
                            {showAssetPicker ? (
                                <div className="mt-2 max-h-56 overflow-y-auto border border-main bg-main">
                                    {assets.length === 0 ? (
                                        <p className="px-3 py-4 text-[11px] text-muted">
                                            No asset available.
                                        </p>
                                    ) : (
                                        <div className="space-y-2 p-2">
                                            {assets.map((asset) => {
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
                                                            setShowAssetPicker(
                                                                false,
                                                            );
                                                        }}
                                                        className={`w-full border p-2 text-left ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main hover:bg-secondary/20"}`}
                                                    >
                                                        <p className="truncate text-[12px] font-semibold text-main">
                                                            {asset.metadata
                                                                ?.title ??
                                                                asset._id}
                                                        </p>
                                                        <p className="mt-1 truncate text-[10px] text-muted">
                                                            {asset.createdFrom
                                                                ?.storageProviderLabel ??
                                                                asset.storageProvider}{" "}
                                                            ·{" "}
                                                            {formatBytes(
                                                                asset.sizeBytes ??
                                                                    0,
                                                            )}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Language hint
                            </span>
                            <select
                                value={language}
                                disabled={isRunning}
                                onChange={(event) =>
                                    setLanguage(event.currentTarget.value)
                                }
                                className="mb-3 w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                            >
                                <option value="zh">Chinese (zh)</option>
                                <option value="vi">Vietnamese (vi)</option>
                                <option value="en">English (en)</option>
                                <option value="ja">Japanese (ja)</option>
                                <option value="ko">Korean (ko)</option>
                            </select>
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Prompt
                            </span>
                            <textarea
                                value={prompt}
                                disabled={isRunning}
                                rows={2}
                                placeholder="Tên riêng, thuật ngữ, ngữ cảnh nội dung..."
                                onChange={(event) =>
                                    setPrompt(event.currentTarget.value)
                                }
                                className="w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main placeholder:text-muted/60"
                            />
                        </label>
                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span>
                                <span className="block text-[11px] font-semibold text-main">
                                    Word timestamps
                                </span>
                                <span className="block text-[10px] text-muted">
                                    Bật khi cần canh lại voice/subtitle chi tiết
                                    hơn.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={includeWordTimestamps}
                                disabled={isRunning}
                                onChange={(event) =>
                                    setIncludeWordTimestamps(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>
                        <button
                            type="button"
                            disabled={isRunning || (!file && !selectedAssetId)}
                            onClick={runTranscription}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRunning ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Mic2 className="h-4 w-4" />
                            )}
                            {isRunning
                                ? "Transcribing..."
                                : "Extract + Transcribe"}
                        </button>
                    </div>

                    {error ? (
                        <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                            {error}
                        </p>
                    ) : null}

                    {result ? (
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[12px] font-semibold text-main">
                                        Translation
                                    </p>
                                    <p className="mt-1 text-[10px] leading-4 text-muted">
                                        Dịch segment sang tiếng Việt.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    disabled={!translation}
                                    onClick={() =>
                                        setSegmentView((current) =>
                                            current === "source"
                                                ? "translation"
                                                : "source",
                                        )
                                    }
                                    className="shrink-0 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {segmentView === "source"
                                        ? "Xem tiếng Việt"
                                        : "Xem bản gốc"}
                                </button>
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    AI Provider
                                </span>
                                <select
                                    value={selectedProviderId}
                                    disabled={isTranslating}
                                    onChange={(event) =>
                                        handleProviderChange(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                >
                                    <option value="">
                                        Default (env GROQ_API_KEY)
                                    </option>
                                    {aiProviders.map((provider) => (
                                        <option
                                            key={provider._id}
                                            value={provider._id}
                                        >
                                            {provider.label} (
                                            {provider.providerType})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Model
                                    {isLoadingModels ? " (loading...)" : ""}
                                </span>
                                {selectedProviderId && aiModels.length > 0 ? (
                                    <select
                                        value={translationModel}
                                        disabled={
                                            isTranslating || isLoadingModels
                                        }
                                        onChange={(event) =>
                                            setTranslationModel(
                                                event.currentTarget.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    >
                                        {aiModels.map((model) => (
                                            <option
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={translationModel}
                                        disabled={isTranslating}
                                        onChange={(event) =>
                                            setTranslationModel(
                                                event.currentTarget.value,
                                            )
                                        }
                                        placeholder="llama-3.1-8b-instant"
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
                                    />
                                )}
                            </label>

                            <button
                                type="button"
                                disabled={
                                    isTranslating ||
                                    result.segments.length === 0
                                }
                                onClick={runTranslation}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isTranslating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Captions className="h-4 w-4" />
                                )}
                                {isTranslating
                                    ? "Translating..."
                                    : "Translate to VI"}
                            </button>

                            {translationError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {translationError}
                                </p>
                            ) : null}

                            {translation ? (
                                <div className="border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                                    <p className="text-[11px] font-semibold text-emerald-700">
                                        {translation.translatedSegments.length}{" "}
                                        translated segments
                                    </p>
                                    <p className="mt-1 text-[10px] leading-4 text-emerald-700">
                                        {translation.model} ·{" "}
                                        {translation.chunks.length} chunk(s) ·{" "}
                                        Created in{" "}
                                        {formatDurationMs(
                                            translation.generationDurationMs,
                                        )}
                                    </p>
                                </div>
                            ) : null}

                            {translation ? (
                                <div className="space-y-2 border border-main bg-main p-3">
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={isGeneratingMetadata}
                                            onClick={runVideoMetadata}
                                            className="inline-flex items-center gap-2 border border-accent/35 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isGeneratingMetadata ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Captions className="h-3.5 w-3.5" />
                                            )}
                                            {isGeneratingMetadata
                                                ? "Generating metadata..."
                                                : "Generate VI Metadata"}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={
                                                isSavingMetadata ||
                                                !videoMetadata ||
                                                !selectedAssetId
                                            }
                                            onClick={saveVideoMetadata}
                                            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isSavingMetadata ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : null}
                                            Save to Asset
                                        </button>
                                    </div>
                                    {metadataError ? (
                                        <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                            {metadataError}
                                        </p>
                                    ) : null}
                                    {metadataSaveMessage ? (
                                        <p className="border border-main bg-secondary/20 px-3 py-2 text-[11px] text-main">
                                            {metadataSaveMessage}
                                        </p>
                                    ) : null}
                                    {videoMetadata ? (
                                        <div className="space-y-2 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                                            <p className="text-[11px] font-semibold text-emerald-700">
                                                {videoMetadata.title}
                                            </p>
                                            <p className="text-[11px] leading-5 text-emerald-700">
                                                {videoMetadata.description}
                                            </p>
                                            <p className="text-[10px] leading-4 text-emerald-700">
                                                {(videoMetadata.hashtags ?? [])
                                                    .map((tag) => `#${tag}`)
                                                    .join(" ")}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {translation ? (
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <div className="flex items-start gap-2">
                                <Volume2 className="mt-0.5 h-4 w-4 text-muted" />
                                <div>
                                    <p className="text-[12px] font-semibold text-main">
                                        Voice Generation
                                    </p>
                                    <p className="mt-1 text-[10px] leading-4 text-muted">
                                        Sinh voice tiếng Việt từ translated
                                        segments bằng Piper local.
                                    </p>
                                </div>
                            </div>

                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Piper executable
                                </span>
                                <input
                                    value={ttsBinaryPath}
                                    disabled={isGeneratingVoice}
                                    onChange={(event) =>
                                        setTtsBinaryPath(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="piper"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    ONNX model
                                </span>
                                <input
                                    value={ttsModelPath}
                                    disabled={isGeneratingVoice}
                                    onChange={(event) =>
                                        setTtsModelPath(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="auto: piper/model.onnx"
                                />
                            </label>

                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Config JSON
                                </span>
                                <input
                                    value={ttsConfigPath}
                                    disabled={isGeneratingVoice}
                                    onChange={(event) =>
                                        setTtsConfigPath(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="auto: piper/model.onnx.json"
                                />
                            </label>

                            <div className="grid gap-2 sm:grid-cols-2">
                                {[
                                    {
                                        label: "Speaker",
                                        value: ttsSpeaker,
                                        setter: setTtsSpeaker,
                                        step: 1,
                                    },
                                    {
                                        label: "Length scale",
                                        value: ttsLengthScale,
                                        setter: setTtsLengthScale,
                                        step: 0.05,
                                    },
                                    {
                                        label: "Noise scale",
                                        value: ttsNoiseScale,
                                        setter: setTtsNoiseScale,
                                        step: 0.01,
                                    },
                                    {
                                        label: "Noise W",
                                        value: ttsNoiseW,
                                        setter: setTtsNoiseW,
                                        step: 0.01,
                                    },
                                    {
                                        label: "Sentence silence",
                                        value: ttsSentenceSilence,
                                        setter: setTtsSentenceSilence,
                                        step: 0.05,
                                    },
                                ].map((control) => (
                                    <label
                                        key={control.label}
                                        className="block border border-main bg-main px-3 py-2"
                                    >
                                        <input
                                            type="number"
                                            step={control.step}
                                            value={control.value}
                                            disabled={isGeneratingVoice}
                                            onChange={(event) =>
                                                control.setter(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                        <span className="mt-1 block text-[10px] font-semibold text-muted">
                                            {control.label}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Preserve timestamp gaps
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Thêm khoảng lặng giữa segments theo
                                        timestamp.
                                    </span>
                                </span>
                                <input
                                    type="checkbox"
                                    checked={ttsPreserveTimestampGaps}
                                    disabled={isGeneratingVoice}
                                    onChange={(event) =>
                                        setTtsPreserveTimestampGaps(
                                            event.currentTarget.checked,
                                        )
                                    }
                                    className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                            </label>

                            <button
                                type="button"
                                disabled={
                                    isGeneratingVoice ||
                                    translation.translatedSegments.length === 0
                                }
                                onClick={runVoiceGeneration}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isGeneratingVoice ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                                {isGeneratingVoice
                                    ? "Generating voice..."
                                    : "Generate Voice"}
                            </button>

                            {voiceError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {voiceError}
                                </p>
                            ) : null}

                            {voiceResult && voiceAudioUrl ? (
                                <div className="space-y-2 border border-emerald-500/30 bg-emerald-500/10 p-3">
                                    <p className="text-[11px] font-semibold text-emerald-700">
                                        Voice ready ·{" "}
                                        {formatBytes(voiceResult.byteLength)} ·
                                        Created in{" "}
                                        {formatDurationMs(
                                            voiceResult.generationDurationMs,
                                        )}
                                    </p>
                                    <p className="text-[10px] leading-4 text-emerald-700">
                                        Piper · {voiceResult.segmentCount}{" "}
                                        segment(s) ·{" "}
                                        {voiceResult.alignment.mode}
                                        {voiceResult.alignment
                                            .targetDurationSeconds
                                            ? ` · target ${formatTime(
                                                  voiceResult.alignment
                                                      .targetDurationSeconds,
                                              )}`
                                            : ""}
                                    </p>
                                    <audio
                                        controls
                                        src={voiceAudioUrl}
                                        ref={voicePreviewRef}
                                        className="w-full"
                                    />
                                    {sourceVideoPreviewUrl ? (
                                        <div className="space-y-2 border border-main bg-main p-3">
                                            <p className="text-[11px] font-semibold text-main">
                                                Dub preview (source video +
                                                generated voice)
                                            </p>
                                            <video
                                                ref={videoPreviewRef}
                                                controls
                                                muted
                                                src={sourceVideoPreviewUrl}
                                                className="w-full border border-main bg-black"
                                            />
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void playDubPreview();
                                                    }}
                                                    className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                                >
                                                    Play sync preview
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={pauseDubPreview}
                                                    className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                                >
                                                    Pause
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={resetDubPreview}
                                                    className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                                >
                                                    Reset
                                                </button>
                                            </div>
                                            <p className="text-[10px] leading-4 text-muted">
                                                Video gốc được mute để nghe
                                                voice mới rõ hơn; dùng Play sync
                                                preview để canh timing nhanh.
                                            </p>
                                        </div>
                                    ) : null}
                                    <a
                                        href={voiceAudioUrl}
                                        download={voiceResult.fileName}
                                        className="inline-flex items-center gap-2 border border-emerald-500/35 bg-main px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-secondary"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Download {voiceResult.extension}
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </aside>

                <main className="min-w-0 space-y-4">
                    <StepTracePanel steps={steps} />
                    {!result ? (
                        <div className="border border-dashed border-main bg-secondary/20 px-5 py-8">
                            <div className="flex items-center gap-2">
                                <p className="text-[13px] font-semibold text-main">
                                    Transcript output
                                </p>
                            </div>
                            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-muted">
                                Kết quả sẽ gồm transcript tổng, segment
                                timestamps và word timestamps nếu bật ở cấu
                                hình.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[12px] font-semibold text-main">
                                            Transcript
                                        </p>
                                        <p className="mt-1 text-[10px] text-muted">
                                            {result.source.fileName} ·{" "}
                                            {result.model} · request{" "}
                                            {result.provider.requestId ?? "n/a"}
                                        </p>
                                        <p className="mt-1 text-[10px] text-muted">
                                            Source{" "}
                                            {formatBytes(
                                                result.source.fileSizeBytes,
                                            )}{" "}
                                            · Audio{" "}
                                            {formatBytes(
                                                result.audio.fileSizeBytes,
                                            )}{" "}
                                            · {result.audio.format}{" "}
                                            {result.audio.bitrateKbps}kbps
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsTranscriptCollapsed(
                                                    (previous) => !previous,
                                                )
                                            }
                                            className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                        >
                                            {isTranscriptCollapsed ? (
                                                <>
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                    Show
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronUp className="h-3.5 w-3.5" />
                                                    Hide
                                                </>
                                            )}
                                        </button>
                                        <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                                            {result.segments.length} segments
                                        </span>
                                    </div>
                                </div>
                                {!isTranscriptCollapsed ? (
                                    <p className="mt-3 whitespace-pre-wrap text-[13px] leading-6 text-main">
                                        {result.text || "(empty transcript)"}
                                    </p>
                                ) : null}
                                {extractedAudioUrl ? (
                                    <div className="mt-3 border border-main bg-main p-3">
                                        <p className="mb-2 text-[11px] font-semibold text-main">
                                            Extracted audio preview
                                        </p>
                                        <audio
                                            controls
                                            src={extractedAudioUrl}
                                            className="w-full"
                                        />
                                    </div>
                                ) : null}
                            </div>

                            <div className="border border-main bg-main">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main bg-secondary/30 px-4 py-2">
                                    <div>
                                        <p className="text-[12px] font-semibold text-main">
                                            Segments
                                        </p>
                                        {translation ? (
                                            <p className="mt-0.5 text-[10px] leading-4 text-muted">
                                                Copy JSON để dán vào Video Tools
                                                Lab `translatedSegmentsJson`.
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={!translation}
                                            onClick={() =>
                                                copySegmentsToClipboard("json")
                                            }
                                            className="inline-flex items-center gap-1.5 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {copiedSegmentsLabel === "json"
                                                ? "Copied JSON"
                                                : "Copy translatedSegments JSON"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                copySegmentsToClipboard("text")
                                            }
                                            className="inline-flex items-center gap-1.5 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                            {copiedSegmentsLabel === "text"
                                                ? "Copied text"
                                                : "Copy visible text"}
                                        </button>
                                    </div>
                                </div>
                                <div className="thin-scrollbar max-h-[420px] overflow-auto">
                                    {result.segments.map((segment) =>
                                        (() => {
                                            const translated =
                                                translationById.get(segment.id);
                                            const displayText =
                                                segmentView === "translation" &&
                                                translated
                                                    ? translated.translatedText
                                                    : segment.text;
                                            return (
                                                <div
                                                    key={segment.id}
                                                    className="grid gap-3 border-b border-main px-4 py-3 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)]"
                                                >
                                                    <p className="text-[11px] font-semibold text-muted">
                                                        {formatTime(
                                                            segment.start,
                                                        )}{" "}
                                                        →{" "}
                                                        {formatTime(
                                                            segment.end,
                                                        )}
                                                    </p>
                                                    <div className="min-w-0">
                                                        {segmentView ===
                                                            "translation" &&
                                                        translated ? (
                                                            <textarea
                                                                value={
                                                                    translated.translatedText
                                                                }
                                                                rows={2}
                                                                onChange={(
                                                                    event,
                                                                ) => {
                                                                    if (
                                                                        !translation ||
                                                                        !translated
                                                                    )
                                                                        return;
                                                                    const next =
                                                                        translation.translatedSegments.map(
                                                                            (
                                                                                item,
                                                                            ) =>
                                                                                item.id ===
                                                                                segment.id
                                                                                    ? {
                                                                                          ...item,
                                                                                          translatedText:
                                                                                              event
                                                                                                  .currentTarget
                                                                                                  .value,
                                                                                      }
                                                                                    : item,
                                                                        );
                                                                    setTranslation(
                                                                        {
                                                                            ...translation,
                                                                            translatedSegments:
                                                                                next,
                                                                        },
                                                                    );
                                                                }}
                                                                className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[12px] leading-5 text-main"
                                                            />
                                                        ) : (
                                                            <p className="text-[12px] leading-5 text-main">
                                                                {displayText}
                                                            </p>
                                                        )}
                                                        {translated &&
                                                        segmentView ===
                                                            "translation" ? (
                                                            <p className="mt-1 text-[10px] leading-4 text-muted">
                                                                Source:{" "}
                                                                {
                                                                    translated.sourceText
                                                                }
                                                            </p>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })(),
                                    )}
                                </div>
                            </div>

                            {result.words.length > 0 ? (
                                <div className="border border-main bg-main">
                                    <div className="border-b border-main bg-secondary/30 px-4 py-2">
                                        <p className="text-[12px] font-semibold text-main">
                                            Words
                                        </p>
                                    </div>
                                    <div className="thin-scrollbar max-h-60 overflow-auto p-4">
                                        <div className="flex flex-wrap gap-1.5">
                                            {result.words.map((word, index) => (
                                                <span
                                                    key={`${word.word}-${index}-${word.start}`}
                                                    title={`${formatTime(word.start)} -> ${formatTime(
                                                        word.end,
                                                    )}`}
                                                    className="border border-main bg-secondary/25 px-2 py-1 text-[11px] text-main"
                                                >
                                                    {word.word}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}
                </main>
            </div>
        </section>
    );
}
