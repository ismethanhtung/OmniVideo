"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Captions,
    Copy,
    Download,
    FileAudio,
    Info,
    Loader2,
    Mic2,
    TriangleAlert,
    Volume2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import type {
    AudioTranscriptionStep,
    ChineseTranscriptionResult,
    TranscriptTranslationResult,
    VietnameseVideoMetadataResult,
    VoiceGenerationResult,
    VoiceSegmentTimingDiagnostic,
} from "@/lib/multilingual-audio/types";
import {
    DEFAULT_PIPER_TTS_SETTINGS,
    PIPER_TTS_ALIGNMENT_SETTINGS,
} from "@/lib/multilingual-audio/types";
import {
    parseTranscriptSession,
    serializeTranscriptSession,
    TRANSCRIPT_SESSION_STORAGE_KEY,
} from "@/lib/multilingual-audio/transcript-session";
import { buildWordAwareVoiceSegmentsWithDiagnostics } from "@/lib/multilingual-audio/voice-segment-timing";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";

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
    enableVideoPreprocess?: boolean;
    defaultVideoSpeedFactor?: number;
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
        sourceUrl?: string | null;
        originPlatform?: string | null;
        actualQuality?: string | null;
    };
    createdFrom?: {
        storageProviderLabel?: string | null;
    };
    storageProvider: string;
};

type AssetPreviewState = {
    assetId: string;
    src: string;
};

type ProcessedSourceMeta = {
    byteLength: number;
    speedFactor: number;
    generationDurationMs: number;
};

type VoiceTimelineFilter = "all" | "warnings" | "overlap" | "fast" | "slow";

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

function formatSpeedFactor(value: number) {
    if (!Number.isFinite(value)) return "n/a";
    return `${Math.max(1.4, value).toFixed(2)}x`;
}

function clampVideoSpeedFactor(value: number) {
    if (!Number.isFinite(value)) return 1;
    return Math.min(2, Math.max(0.5, value));
}

function timelineTickStep(seconds: number) {
    if (seconds <= 60) return 5;
    if (seconds <= 180) return 10;
    if (seconds <= 600) return 30;
    return 60;
}

function parseHashtagInput(value: string) {
    return value
        .split(/[,\s]+/u)
        .map((token) => token.trim().replace(/^#/u, ""))
        .filter(Boolean);
}

function stepTone(status: AudioTranscriptionStep["status"]) {
    if (status === "success") return "text-emerald-700";
    if (status === "failed") return "text-rose-700";
    return "text-muted";
}

function formatMediaPlaybackError(error: unknown) {
    if (error instanceof DOMException && error.name === "NotSupportedError") {
        return "Dub preview không phát được vì browser không nhận source video/audio hiện tại. Thử reload preview hoặc chọn lại asset.";
    }
    if (error instanceof Error && error.message) {
        return `Dub preview không phát được: ${error.message}`;
    }
    return "Dub preview không phát được vì source video/audio chưa sẵn sàng.";
}

const PIPER_TTS_SETUP_ROWS = [
    ["Audio Transcript mode", "strict timestamp sync"],
    [
        "Preserve timing",
        String(DEFAULT_PIPER_TTS_SETTINGS.preserveTimestampGaps),
    ],
    [
        "Balanced max speed",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.balancedMaxSpeedFactor}x`,
    ],
    [
        "Balanced max pause",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.balancedMaxPauseSeconds}s`,
    ],
    [
        "Long pause warning",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.balancedLongPauseSeconds}s`,
    ],
    [
        "Drift warning",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.balancedDriftWarningSeconds}s`,
    ],
    [
        "Timeline sentence silence",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.timelineSegmentSentenceSilenceSeconds}s`,
    ],
    [
        "Strict gap borrow ratio",
        String(PIPER_TTS_ALIGNMENT_SETTINGS.timelineGapBorrowRatio),
    ],
    [
        "Strict max gap borrow",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.maxTimelineGapBorrowSeconds}s`,
    ],
    [
        "Strict high-speed warning",
        `${PIPER_TTS_ALIGNMENT_SETTINGS.highTimelineSpeedFactor}x`,
    ],
] as const;

function StepTracePanel({ steps }: { steps: AudioTranscriptionStep[] }) {
    const [collapsed, setCollapsed] = useState(true);
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
    enableVideoPreprocess = false,
    defaultVideoSpeedFactor = 1,
}: ChineseTranscriptionPanelProps) {
    const Icon = section.icon;
    const [file, setFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [assetPreview, setAssetPreview] = useState<AssetPreviewState | null>(
        null,
    );
    const [language, setLanguage] = useState("zh");
    const [prompt, setPrompt] = useState("");
    const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);
    const [videoSpeedFactor, setVideoSpeedFactor] = useState(
        clampVideoSpeedFactor(defaultVideoSpeedFactor),
    );
    const [processedSourceVideoUrl, setProcessedSourceVideoUrl] = useState<
        string | null
    >(null);
    const [isPreparingProcessedSource, setIsPreparingProcessedSource] =
        useState(false);
    const [processedSourceError, setProcessedSourceError] = useState<
        string | null
    >(null);
    const [processedSourceMeta, setProcessedSourceMeta] =
        useState<ProcessedSourceMeta | null>(null);
    const [metadataGenerationDurationMs, setMetadataGenerationDurationMs] =
        useState<number | null>(null);

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
    const [dubPreviewError, setDubPreviewError] = useState<string | null>(null);
    const [metadataError, setMetadataError] = useState<string | null>(null);
    const [metadataSaveMessage, setMetadataSaveMessage] = useState<
        string | null
    >(null);
    const [result, setResult] = useState<ChineseTranscriptionResult | null>(
        null,
    );
    const [translation, setTranslation] =
        useState<TranscriptTranslationResult | null>(null);
    const [voiceResult, setVoiceResult] =
        useState<VoiceGenerationResult | null>(null);
    const [voiceTimingDiagnostics, setVoiceTimingDiagnostics] = useState<
        VoiceSegmentTimingDiagnostic[]
    >([]);
    const [videoMetadata, setVideoMetadata] =
        useState<VietnameseVideoMetadataResult | null>(null);
    const [metadataTitleDraft, setMetadataTitleDraft] = useState("");
    const [metadataDescriptionDraft, setMetadataDescriptionDraft] =
        useState("");
    const [metadataHashtagsDraft, setMetadataHashtagsDraft] = useState("");
    const [steps, setSteps] = useState<AudioTranscriptionStep[]>([]);
    const [copiedSegmentsLabel, setCopiedSegmentsLabel] = useState<
        "json" | "text" | null
    >(null);
    const [isHydrated, setIsHydrated] = useState(false);
    const [isTranscriptCollapsed, setIsTranscriptCollapsed] = useState(true);
    const [isWordsCollapsed, setIsWordsCollapsed] = useState(true);
    const [isDubPreviewPaused, setIsDubPreviewPaused] = useState(false);
    const [activeVoiceSegmentId, setActiveVoiceSegmentId] = useState<
        number | null
    >(null);
    const [selectedVoiceChunkId, setSelectedVoiceChunkId] = useState<
        number | null
    >(null);
    const [voiceTimelineFilter, setVoiceTimelineFilter] =
        useState<VoiceTimelineFilter>("all");
    const [voiceTimelineZoom, setVoiceTimelineZoom] = useState(1);
    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
    const voicePreviewRef = useRef<HTMLAudioElement | null>(null);
    const segmentsScrollRef = useRef<HTMLDivElement | null>(null);
    const segmentRefs = useRef(new Map<number, HTMLDivElement>());

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
            setVideoMetadata(saved.videoMetadata);
            if (saved.videoMetadata) {
                setMetadataTitleDraft(saved.videoMetadata.title ?? "");
                setMetadataDescriptionDraft(
                    saved.videoMetadata.description ?? "",
                );
                setMetadataHashtagsDraft(
                    (saved.videoMetadata.hashtags ?? [])
                        .map((tag) => `#${tag}`)
                        .join(" "),
                );
            }
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
                    videoMetadata,
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
        videoMetadata,
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
        setDubPreviewError(null);
        setProcessedSourceError(null);
        setProcessedSourceMeta(null);
        setResult(null);
        setTranslation(null);
        setVoiceResult(null);
        setVoiceTimingDiagnostics([]);
        setSteps([]);
        const progressTaskId = startProgressTask({
            title: "Audio transcript",
            description: "Extracting audio and transcribing...",
            scope: "system",
            progress: 10,
        });

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
            if (enableVideoPreprocess) {
                formData.set("videoSpeedFactor", String(videoSpeedFactor));
            }
            if (prompt.trim()) {
                formData.set("prompt", prompt.trim());
            }

            updateProgressTask(progressTaskId, {
                description: "Submitting transcription request...",
                progress: 45,
            });
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
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Transcription completed.",
            });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Transcription failed.",
            );
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Transcription failed.",
                error:
                    requestError instanceof Error
                        ? requestError.message
                        : "Unknown error",
            });
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
        setMetadataGenerationDurationMs(null);
        setVideoMetadata(null);
        setMetadataTitleDraft("");
        setMetadataDescriptionDraft("");
        setMetadataHashtagsDraft("");
        const progressTaskId = startProgressTask({
            title: "Transcript translation",
            description: "Translating transcript segments...",
            scope: "system",
            progress: 10,
        });

        try {
            updateProgressTask(progressTaskId, {
                description: "Calling translation model...",
                progress: 45,
            });
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
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Translation completed.",
            });
        } catch (requestError) {
            setTranslationError(
                requestError instanceof Error
                    ? requestError.message
                    : "Translation failed.",
            );
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Translation failed.",
                error:
                    requestError instanceof Error
                        ? requestError.message
                        : "Unknown error",
            });
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
        setDubPreviewError(null);
        setVoiceResult(null);
        setVoiceTimingDiagnostics([]);
        const progressTaskId = startProgressTask({
            title: "Voice generation",
            description: "Generating Vietnamese voice audio...",
            scope: "system",
            progress: 10,
        });

        try {
            updateProgressTask(progressTaskId, {
                description: "Synthesizing voice segments...",
                progress: 50,
            });
            const voiceTiming = buildWordAwareVoiceSegmentsWithDiagnostics({
                translatedSegments: translation.translatedSegments,
                words: result?.words ?? [],
            });
            setVoiceTimingDiagnostics(voiceTiming.diagnostics);
            const response = await fetch("/api/audio/voice-generation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    segments: voiceTiming.segments,
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
                        alignmentMode: "strict",
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
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Voice generation completed.",
            });
        } catch (requestError) {
            setVoiceError(
                requestError instanceof Error
                    ? requestError.message
                    : "Voice generation failed.",
            );
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Voice generation failed.",
                error:
                    requestError instanceof Error
                        ? requestError.message
                        : "Unknown error",
            });
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
            const startedAt = Date.now();
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
            setMetadataTitleDraft(payload.data.title ?? "");
            setMetadataDescriptionDraft(payload.data.description ?? "");
            setMetadataHashtagsDraft(
                (payload.data.hashtags ?? []).map((tag) => `#${tag}`).join(" "),
            );
            setMetadataGenerationDurationMs(Date.now() - startedAt);
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
            const response = await fetch(
                `/api/storage/assets/${selectedAssetId}`,
                {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        metadata: {
                            vietnameseTitle: metadataTitleDraft.trim(),
                            vietnameseDescription:
                                metadataDescriptionDraft.trim(),
                            vietnameseHashtags: parseHashtagInput(
                                metadataHashtagsDraft,
                            ),
                        },
                    }),
                },
            );
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
    const voiceTimelineDiagnostics = voiceResult?.alignment.timeline ?? [];
    const voiceTimelineBySegmentId = useMemo(() => {
        const grouped = new Map<
            number,
            (typeof voiceTimelineDiagnostics)[number]
        >();
        for (const chunk of voiceTimelineDiagnostics) {
            const parentId = chunk.sourceSegmentId ?? chunk.segmentId;
            const previous = grouped.get(parentId);
            if (!previous) {
                grouped.set(parentId, { ...chunk, segmentId: parentId });
                continue;
            }

            grouped.set(parentId, {
                ...previous,
                start: Math.min(previous.start, chunk.start),
                end: Math.max(previous.end, chunk.end),
                scheduledStartSeconds: Math.min(
                    previous.scheduledStartSeconds ?? previous.start,
                    chunk.scheduledStartSeconds ?? chunk.start,
                ),
                scheduledEndSeconds: Math.max(
                    previous.scheduledEndSeconds ?? previous.end,
                    chunk.scheduledEndSeconds ?? chunk.end,
                ),
                rawDurationSeconds:
                    previous.rawDurationSeconds + chunk.rawDurationSeconds,
                targetDurationSeconds:
                    previous.targetDurationSeconds +
                    chunk.targetDurationSeconds,
                borrowedGapSeconds:
                    previous.borrowedGapSeconds + chunk.borrowedGapSeconds,
                speedFactor: Math.max(previous.speedFactor, chunk.speedFactor),
                warningCodes: Array.from(
                    new Set([...previous.warningCodes, ...chunk.warningCodes]),
                ),
            });
        }
        return grouped;
    }, [voiceTimelineDiagnostics]);
    const voiceTimingDiagnosticsBySegmentId = useMemo(() => {
        const grouped = new Map<number, VoiceSegmentTimingDiagnostic[]>();
        for (const diagnostic of voiceTimingDiagnostics) {
            const current = grouped.get(diagnostic.segmentId) ?? [];
            current.push(diagnostic);
            grouped.set(diagnostic.segmentId, current);
        }
        return grouped;
    }, [voiceTimingDiagnostics]);
    const voiceWarningSegments = voiceTimelineDiagnostics
        .filter(
            (chunk) =>
                chunk.warningCodes.length > 0 ||
                chunk.speedFactor >
                    PIPER_TTS_ALIGNMENT_SETTINGS.highTimelineSpeedFactor,
        )
        .sort((left, right) => right.speedFactor - left.speedFactor);
    const voiceSlowSegments = voiceTimelineDiagnostics
        .filter(
            (chunk) =>
                chunk.targetDurationSeconds > chunk.rawDurationSeconds * 1.25 ||
                (chunk.pauseBeforeSeconds ?? 0) > 0.7,
        )
        .sort(
            (left, right) =>
                right.targetDurationSeconds /
                    Math.max(0.01, right.rawDurationSeconds) -
                left.targetDurationSeconds /
                    Math.max(0.01, left.rawDurationSeconds),
        );
    const maxVoiceSpeedFactor =
        voiceTimelineDiagnostics.length > 0
            ? Math.max(
                  ...voiceTimelineDiagnostics.map((chunk) =>
                      Number.isFinite(chunk.speedFactor)
                          ? chunk.speedFactor
                          : 1,
                  ),
              )
            : undefined;
    const totalBorrowedGapSeconds = voiceTimelineDiagnostics.reduce(
        (sum, chunk) => sum + chunk.borrowedGapSeconds,
        0,
    );
    const voiceTimelineWorkbench = useMemo(() => {
        const timelineEnd = Math.max(
            voiceResult?.alignment.targetDurationSeconds ?? 0,
            ...voiceTimelineDiagnostics.map(
                (chunk) =>
                    chunk.scheduledEndSeconds ??
                    chunk.end ??
                    chunk.start + chunk.targetDurationSeconds,
            ),
            1,
        );
        const timelineWidth = Math.max(
            960,
            timelineEnd * 12 * voiceTimelineZoom,
        );
        const minChunkWidthPx = 34;
        const sorted = [...voiceTimelineDiagnostics].sort(
            (left, right) =>
                (left.scheduledStartSeconds ?? left.start) -
                    (right.scheduledStartSeconds ?? right.start) ||
                left.segmentId - right.segmentId,
        );
        const laneEnds: number[] = [];
        const laneEndsPx: number[] = [];
        const items = sorted.map((chunk, index) => {
            const start = chunk.scheduledStartSeconds ?? chunk.start;
            const end =
                chunk.scheduledEndSeconds ??
                start + chunk.targetDurationSeconds;
            const duration = Math.max(0.05, end - start);
            const leftPercent = (start / timelineEnd) * 100;
            const widthPercent = (duration / timelineEnd) * 100;
            const leftPx = (start / timelineEnd) * timelineWidth;
            const widthPx = Math.max(
                minChunkWidthPx,
                (duration / timelineEnd) * timelineWidth,
            );
            const rightPx = leftPx + widthPx;
            const hasOverlap = sorted.some((other, otherIndex) => {
                if (otherIndex === index) return false;
                const otherStart = other.scheduledStartSeconds ?? other.start;
                const otherEnd =
                    other.scheduledEndSeconds ??
                    otherStart + other.targetDurationSeconds;
                return start < otherEnd - 0.01 && end > otherStart + 0.01;
            });
            let lane = laneEndsPx.findIndex(
                (laneEndPx) => leftPx >= laneEndPx - 1,
            );
            if (lane < 0) {
                lane = laneEnds.length;
                laneEnds.push(end);
                laneEndsPx.push(rightPx);
            } else {
                laneEnds[lane] = end;
                laneEndsPx[lane] = rightPx;
            }
            const padded =
                chunk.targetDurationSeconds > chunk.rawDurationSeconds * 1.2;
            const fast =
                chunk.speedFactor >=
                PIPER_TTS_ALIGNMENT_SETTINGS.highTimelineSpeedFactor;
            const status = hasOverlap
                ? "overlap"
                : chunk.warningCodes.length > 0
                  ? "warning"
                  : fast
                    ? "fast"
                    : padded
                      ? "slow"
                      : "ok";
            const parentId = chunk.sourceSegmentId ?? chunk.segmentId;
            return {
                ...chunk,
                parentId,
                start,
                end,
                lane,
                duration,
                hasOverlap,
                padded,
                fast,
                status,
                leftPercent,
                widthPercent,
            };
        });
        const filteredItems = items.filter((item) => {
            if (voiceTimelineFilter === "all") return true;
            if (voiceTimelineFilter === "warnings") {
                return item.warningCodes.length > 0;
            }
            if (voiceTimelineFilter === "overlap") return item.hasOverlap;
            if (voiceTimelineFilter === "fast") return item.fast;
            return item.padded;
        });
        const tickStep = timelineTickStep(timelineEnd);
        const ticks = [];
        for (let second = 0; second <= timelineEnd; second += tickStep) {
            ticks.push(second);
        }
        if (ticks[ticks.length - 1] !== timelineEnd) ticks.push(timelineEnd);

        return {
            items,
            filteredItems,
            issues: items
                .filter(
                    (item) =>
                        item.status !== "ok" || item.warningCodes.length > 0,
                )
                .slice(0, 12),
            laneCount: Math.max(1, laneEnds.length),
            timelineEnd,
            timelineWidth,
            ticks,
            overlapCount: items.filter((item) => item.hasOverlap).length,
            warningCount: items.filter((item) => item.warningCodes.length > 0)
                .length,
            fastCount: items.filter((item) => item.fast).length,
            slowCount: items.filter((item) => item.padded).length,
        };
    }, [
        voiceResult?.alignment.targetDurationSeconds,
        voiceTimelineDiagnostics,
        voiceTimelineFilter,
        voiceTimelineZoom,
    ]);
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
    const activeSourceVideoPreviewUrl =
        processedSourceVideoUrl ?? sourceVideoPreviewUrl;
    const dubPreviewPlaybackRate =
        enableVideoPreprocess && !processedSourceVideoUrl
            ? clampVideoSpeedFactor(videoSpeedFactor)
            : 1;

    useEffect(() => {
        if (!file || !sourceVideoPreviewUrl) return;
        return () => URL.revokeObjectURL(sourceVideoPreviewUrl);
    }, [file, sourceVideoPreviewUrl]);

    useEffect(() => {
        if (!processedSourceVideoUrl) return;
        return () => URL.revokeObjectURL(processedSourceVideoUrl);
    }, [processedSourceVideoUrl]);

    useEffect(() => {
        if (!enableVideoPreprocess) return;
        if (!sourceVideoPreviewUrl || (!file && !selectedAssetId)) {
            setProcessedSourceVideoUrl(null);
            setProcessedSourceError(null);
            setProcessedSourceMeta(null);
            return;
        }

        const speedFactor = clampVideoSpeedFactor(videoSpeedFactor);
        if (Math.abs(speedFactor - 1) < 0.0001) {
            setProcessedSourceVideoUrl(null);
            setProcessedSourceError(null);
            setProcessedSourceMeta(null);
            return;
        }

        const controller = new AbortController();
        let cancelled = false;
        const run = async () => {
            setIsPreparingProcessedSource(true);
            setProcessedSourceError(null);
            try {
                const formData = new FormData();
                if (file) {
                    formData.set("videoFile", file);
                } else if (selectedAssetId) {
                    formData.set("assetId", selectedAssetId);
                }
                formData.set("videoSpeedFactor", String(speedFactor));
                const response = await fetch("/api/audio/video-preprocess", {
                    method: "POST",
                    body: formData,
                    signal: controller.signal,
                });
                const payload = (await response.json()) as
                    | {
                          ok: true;
                          data: {
                              mimeType: string;
                              videoBase64: string;
                              byteLength: number;
                              speedFactor: number;
                              generationDurationMs: number;
                          };
                      }
                    | {
                          ok: false;
                          error?: string;
                          errorCode?: string;
                      };
                if (!response.ok || !payload.ok) {
                    throw new Error(
                        payload.errorCode
                            ? `${payload.errorCode}: ${payload.error ?? "Video preprocess failed."}`
                            : (payload.error ?? "Video preprocess failed."),
                    );
                }
                const bin = atob(payload.data.videoBase64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i += 1) {
                    bytes[i] = bin.charCodeAt(i);
                }
                const blob = new Blob([bytes], {
                    type: payload.data.mimeType || "video/mp4",
                });
                const nextUrl = URL.createObjectURL(blob);
                if (!cancelled) {
                    setProcessedSourceMeta({
                        byteLength: payload.data.byteLength,
                        speedFactor: payload.data.speedFactor,
                        generationDurationMs: payload.data.generationDurationMs,
                    });
                    setProcessedSourceVideoUrl((previous) => {
                        if (previous) URL.revokeObjectURL(previous);
                        return nextUrl;
                    });
                } else {
                    URL.revokeObjectURL(nextUrl);
                }
            } catch (error) {
                if (cancelled || controller.signal.aborted) return;
                setProcessedSourceError(
                    error instanceof Error
                        ? error.message
                        : "Video preprocess failed.",
                );
                setProcessedSourceVideoUrl(null);
                setProcessedSourceMeta(null);
            } finally {
                if (!cancelled) {
                    setIsPreparingProcessedSource(false);
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [
        enableVideoPreprocess,
        file,
        selectedAssetId,
        sourceVideoPreviewUrl,
        videoSpeedFactor,
    ]);

    useEffect(() => {
        const video = videoPreviewRef.current;
        if (!video) return;
        video.playbackRate = dubPreviewPlaybackRate;
        video.defaultPlaybackRate = dubPreviewPlaybackRate;
    }, [dubPreviewPlaybackRate, activeSourceVideoPreviewUrl]);

    useEffect(() => {
        if (activeVoiceSegmentId === null) return;
        const container = segmentsScrollRef.current;
        const segmentNode = segmentRefs.current.get(activeVoiceSegmentId);
        if (!container || !segmentNode) return;

        const containerRect = container.getBoundingClientRect();
        const segmentRect = segmentNode.getBoundingClientRect();
        const segmentTop =
            segmentRect.top - containerRect.top + container.scrollTop;
        const segmentBottom = segmentTop + segmentRect.height;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;

        if (segmentTop < containerTop || segmentBottom > containerBottom) {
            const targetTop = segmentBottom - container.clientHeight;
            container.scrollTo({
                top: Math.max(0, targetTop),
                behavior: "smooth",
            });
        }
    }, [activeVoiceSegmentId]);

    const updateActiveVoiceSegment = (currentTime: number) => {
        if (voiceTimelineDiagnostics.length === 0) return;
        const activeChunk =
            voiceTimelineDiagnostics.find((chunk) => {
                const start = chunk.scheduledStartSeconds ?? chunk.start;
                const end = chunk.scheduledEndSeconds ?? chunk.end;
                return currentTime >= start && currentTime < end;
            }) ?? null;
        setActiveVoiceSegmentId(
            activeChunk
                ? (activeChunk.sourceSegmentId ?? activeChunk.segmentId)
                : null,
        );
    };

    const playDubPreview = async () => {
        const video = videoPreviewRef.current;
        const audio = voicePreviewRef.current;
        if (!video || !audio) return;
        setDubPreviewError(null);
        try {
            video.muted = true;
            video.playbackRate = dubPreviewPlaybackRate;
            video.currentTime = 0;
            audio.currentTime = 0;
            await video.play();
            await audio.play();
            setIsDubPreviewPaused(false);
        } catch (playError) {
            video.pause();
            audio.pause();
            setIsDubPreviewPaused(true);
            setDubPreviewError(formatMediaPlaybackError(playError));
        }
    };

    const toggleDubPreviewPause = async () => {
        const video = videoPreviewRef.current;
        const audio = voicePreviewRef.current;
        if (!video || !audio) return;
        if (isDubPreviewPaused) {
            setDubPreviewError(null);
            try {
                video.muted = true;
                video.playbackRate = dubPreviewPlaybackRate;
                await video.play();
                await audio.play();
                setIsDubPreviewPaused(false);
            } catch (playError) {
                video.pause();
                audio.pause();
                setIsDubPreviewPaused(true);
                setDubPreviewError(formatMediaPlaybackError(playError));
            }
            return;
        }
        video.pause();
        audio.pause();
        setIsDubPreviewPaused(true);
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
                                                const isPreviewing =
                                                    assetPreview?.assetId ===
                                                    asset._id;
                                                return (
                                                    <div
                                                        key={asset._id}
                                                        className={`border p-2 ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main"}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedAssetId(
                                                                        asset._id,
                                                                    );
                                                                    setFile(
                                                                        null,
                                                                    );
                                                                    setShowAssetPicker(
                                                                        false,
                                                                    );
                                                                }}
                                                                className="min-w-0 flex-1 text-left hover:opacity-90"
                                                            >
                                                                <p className="truncate text-[12px] font-semibold text-main">
                                                                    {asset
                                                                        .metadata
                                                                        ?.title ??
                                                                        asset._id}
                                                                </p>
                                                                <p className="mt-1 truncate text-[10px] text-muted">
                                                                    {[
                                                                        asset
                                                                            .createdFrom
                                                                            ?.storageProviderLabel ??
                                                                            asset.storageProvider,
                                                                        formatBytes(
                                                                            asset.sizeBytes ??
                                                                                0,
                                                                        ),
                                                                        asset
                                                                            .metadata
                                                                            ?.originPlatform,
                                                                        asset
                                                                            .metadata
                                                                            ?.actualQuality,
                                                                    ]
                                                                        .filter(
                                                                            Boolean,
                                                                        )
                                                                        .join(
                                                                            " · ",
                                                                        )}
                                                                </p>
                                                                {asset.metadata
                                                                    ?.sourceUrl ? (
                                                                    <p className="mt-1 truncate text-[10px] text-muted">
                                                                        {
                                                                            asset
                                                                                .metadata
                                                                                .sourceUrl
                                                                        }
                                                                    </p>
                                                                ) : null}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (
                                                                        isPreviewing
                                                                    ) {
                                                                        setAssetPreview(
                                                                            null,
                                                                        );
                                                                        return;
                                                                    }
                                                                    setAssetPreview(
                                                                        {
                                                                            assetId:
                                                                                asset._id,
                                                                            src: `/api/storage/assets/${asset._id}/download?disposition=inline`,
                                                                        },
                                                                    );
                                                                }}
                                                                className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                                            >
                                                                {isPreviewing
                                                                    ? "Hide"
                                                                    : "Preview"}
                                                            </button>
                                                        </div>
                                                        {isPreviewing ? (
                                                            <div className="mt-2 border border-main bg-black">
                                                                <video
                                                                    src={
                                                                        assetPreview.src
                                                                    }
                                                                    controls
                                                                    preload="metadata"
                                                                    className="block max-h-48 w-full bg-black"
                                                                />
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {enableVideoPreprocess ? (
                        <div className="border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Video Preprocess
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-muted">
                                Tốc độ này sẽ áp dụng trước bước extract audio.
                            </p>
                            <label className="mt-3 block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Video speed
                                </span>
                                <select
                                    value={videoSpeedFactor}
                                    disabled={isRunning}
                                    onChange={(event) =>
                                        setVideoSpeedFactor(
                                            clampVideoSpeedFactor(
                                                Number(
                                                    event.currentTarget.value,
                                                ),
                                            ),
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                >
                                    <option value={0.5}>0.5x</option>
                                    <option value={0.6}>0.6x</option>
                                    <option value={0.75}>0.75x</option>
                                    <option value={1}>1.0x</option>
                                    <option value={1.25}>1.25x</option>
                                    <option value={1.5}>1.5x</option>
                                </select>
                            </label>
                        </div>
                    ) : null}

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
                                        translated segments ·{" "}
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
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-emerald-700">
                                                    VI Title
                                                </span>
                                                <input
                                                    value={metadataTitleDraft}
                                                    disabled={isSavingMetadata}
                                                    onChange={(event) =>
                                                        setMetadataTitleDraft(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    className="w-full border border-emerald-500/30 bg-white/75 px-2 py-1.5 text-[11px] text-main"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-emerald-700">
                                                    VI Description
                                                </span>
                                                <textarea
                                                    rows={3}
                                                    value={
                                                        metadataDescriptionDraft
                                                    }
                                                    disabled={isSavingMetadata}
                                                    onChange={(event) =>
                                                        setMetadataDescriptionDraft(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    className="w-full resize-y border border-emerald-500/30 bg-white/75 px-2 py-1.5 text-[11px] leading-5 text-main"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-emerald-700">
                                                    VI Hashtags
                                                </span>
                                                <input
                                                    value={
                                                        metadataHashtagsDraft
                                                    }
                                                    disabled={isSavingMetadata}
                                                    onChange={(event) =>
                                                        setMetadataHashtagsDraft(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    placeholder="#tag1 #tag2"
                                                    className="w-full border border-emerald-500/30 bg-white/75 px-2 py-1.5 text-[11px] text-main"
                                                />
                                            </label>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    {translation ? (
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <div className="flex items-start gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-[12px] font-semibold text-main">
                                            Voice Generation
                                        </p>
                                        <div className="group relative inline-flex">
                                            <button
                                                type="button"
                                                aria-label="Piper TTS setup"
                                                className="inline-flex h-4 w-4 items-center justify-center border border-main bg-main text-muted hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                                            >
                                                <Info className="h-3 w-3" />
                                            </button>
                                            <div className="pointer-events-none absolute left-0 top-6 z-20 hidden w-[300px] border border-main bg-main p-3 shadow-lg group-focus-within:block group-hover:block">
                                                <p className="text-[10px] font-bold uppercase text-muted">
                                                    Piper TTS setup
                                                </p>
                                                <div className="mt-2 space-y-1.5">
                                                    {PIPER_TTS_SETUP_ROWS.map(
                                                        ([label, value]) => (
                                                            <div
                                                                key={label}
                                                                className="flex items-center justify-between gap-3 border-b border-main pb-1 last:border-b-0 last:pb-0"
                                                            >
                                                                <span className="text-[10px] text-muted">
                                                                    {label}
                                                                </span>
                                                                <span className="text-[10px] font-semibold text-main">
                                                                    {value}
                                                                </span>
                                                            </div>
                                                        ),
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
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

                            <div className="grid gap-2 sm:grid-cols-2">
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
                            </div>

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
                                        className="block"
                                    >
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            {control.label}
                                        </span>
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
                                        Giữ thứ tự/timeline tương đối, nhưng
                                        giới hạn pause dài và speed-up quá mạnh.
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
                                {isGeneratingVoice
                                    ? "Generating voice..."
                                    : "Generate Voice"}
                            </button>

                            {voiceError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {voiceError}
                                </p>
                            ) : null}

                            {null}
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
                                        <span className="border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                                            {result.segments.length} segments
                                        </span>
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
                            {result.words.length > 0 ? (
                                <div className="border border-main bg-main">
                                    <div className="flex items-center justify-between border-b border-main bg-secondary/30 px-4 py-2">
                                        <p className="text-[12px] font-semibold text-main">
                                            Words
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setIsWordsCollapsed(
                                                    (previous) => !previous,
                                                )
                                            }
                                            className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                        >
                                            {isWordsCollapsed ? (
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
                                    {!isWordsCollapsed ? (
                                        <div className="thin-scrollbar max-h-60 overflow-auto p-4">
                                            <div className="flex flex-wrap gap-1.5">
                                                {result.words.map(
                                                    (word, index) => (
                                                        <span
                                                            key={`${word.word}-${index}-${word.start}`}
                                                            title={`${formatTime(word.start)} -> ${formatTime(
                                                                word.end,
                                                            )}`}
                                                            className="border border-main bg-secondary/25 px-2 py-1 text-[11px] text-main"
                                                        >
                                                            {word.word}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

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
                                <div
                                    ref={segmentsScrollRef}
                                    className="thin-scrollbar max-h-[420px] overflow-auto"
                                >
                                    {result.segments.map((segment) =>
                                        (() => {
                                            const translated =
                                                translationById.get(segment.id);
                                            const segmentNumber =
                                                segment.id + 1;
                                            const displayText =
                                                segmentView === "translation" &&
                                                translated
                                                    ? translated.translatedText
                                                    : segment.text;
                                            const voiceChunk =
                                                voiceTimelineBySegmentId.get(
                                                    segment.id,
                                                );
                                            const timingDiagnostics =
                                                voiceTimingDiagnosticsBySegmentId.get(
                                                    segment.id,
                                                ) ?? [];
                                            const hasVoiceResult =
                                                Boolean(voiceResult);
                                            const missingGeneratedVoice =
                                                hasVoiceResult &&
                                                (!voiceChunk ||
                                                    (translated &&
                                                        !translated.translatedText.trim()));
                                            const isActiveVoiceSegment =
                                                activeVoiceSegmentId ===
                                                segment.id;
                                            const segmentTone =
                                                missingGeneratedVoice
                                                    ? "border-rose-500/50 bg-rose-500/10"
                                                    : isActiveVoiceSegment
                                                      ? "border-accent bg-accent/10"
                                                      : "border-main";
                                            return (
                                                <div
                                                    key={segment.id}
                                                    ref={(node) => {
                                                        if (node) {
                                                            segmentRefs.current.set(
                                                                segment.id,
                                                                node,
                                                            );
                                                            return;
                                                        }
                                                        segmentRefs.current.delete(
                                                            segment.id,
                                                        );
                                                    }}
                                                    className={`grid gap-3 border-b px-4 py-3 last:border-b-0 md:grid-cols-[190px_minmax(0,1fr)] ${segmentTone}`}
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-[11px] font-bold text-main">
                                                            Segment #
                                                            {segmentNumber}
                                                        </p>
                                                        <p className="text-[10px] font-semibold text-muted">
                                                            {formatTime(
                                                                segment.start,
                                                            )}{" "}
                                                            →{" "}
                                                            {formatTime(
                                                                segment.end,
                                                            )}
                                                        </p>
                                                        {voiceChunk ? (
                                                            <div className="mt-1 space-y-1">
                                                                <p className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                                                    <span>
                                                                        Voice
                                                                        speed
                                                                    </span>
                                                                    <span>
                                                                        {formatSpeedFactor(
                                                                            voiceChunk.speedFactor,
                                                                        )}
                                                                    </span>
                                                                </p>
                                                                <p className="block text-[10px] font-semibold text-green-700">
                                                                    Voice{" "}
                                                                    {formatTime(
                                                                        voiceChunk.scheduledStartSeconds ??
                                                                            voiceChunk.start,
                                                                    )}{" "}
                                                                    →{" "}
                                                                    {formatTime(
                                                                        voiceChunk.scheduledEndSeconds ??
                                                                            voiceChunk.end,
                                                                    )}
                                                                </p>
                                                            </div>
                                                        ) : hasVoiceResult ? (
                                                            <p className="text-[10px] font-semibold text-rose-700">
                                                                Missing
                                                                generated voice
                                                            </p>
                                                        ) : null}
                                                        {timingDiagnostics.map(
                                                            (diagnostic) => (
                                                                <p
                                                                    key={`${diagnostic.code}-${diagnostic.repairedStart}-${diagnostic.repairedEnd}`}
                                                                    className="mt-1 text-[10px] font-semibold leading-4 text-amber-700"
                                                                    title={diagnostic.suspiciousWords
                                                                        .map(
                                                                            (
                                                                                word,
                                                                            ) =>
                                                                                `${word.word}: ${formatTime(
                                                                                    word.start,
                                                                                )} -> ${formatTime(
                                                                                    word.end,
                                                                                )}`,
                                                                        )
                                                                        .join(
                                                                            "\n",
                                                                        )}
                                                                >
                                                                    Timing
                                                                    repaired{" "}
                                                                    {formatTime(
                                                                        diagnostic.repairedStart,
                                                                    )}{" "}
                                                                    →{" "}
                                                                    {formatTime(
                                                                        diagnostic.repairedEnd,
                                                                    )}
                                                                </p>
                                                            ),
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        {segmentView ===
                                                            "translation" &&
                                                        translated ? (
                                                            <textarea
                                                                value={
                                                                    translated.translatedText
                                                                }
                                                                rows={1}
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
                        </>
                    )}
                    {voiceResult && voiceAudioUrl ? (
                        <div className="grid gap-3 border border-emerald-500/30 bg-emerald-500/10 p-3 lg:grid-cols-2">
                            <div className="space-y-2">
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
                                    segment(s) · {voiceResult.alignment.mode}
                                    {voiceResult.alignment.targetDurationSeconds
                                        ? ` · target ${formatTime(voiceResult.alignment.targetDurationSeconds)}`
                                        : ""}
                                </p>
                                {voiceTimelineDiagnostics.length > 0 ? (
                                    <div className="space-y-2 border border-emerald-500/25 bg-white/55 p-2 text-[10px] leading-4 text-emerald-800">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold">
                                                Speech rate diagnostics
                                            </span>
                                            <span>
                                                max{" "}
                                                {formatSpeedFactor(
                                                    maxVoiceSpeedFactor ?? 1,
                                                )}
                                            </span>
                                            <span>
                                                borrowed{" "}
                                                {totalBorrowedGapSeconds.toFixed(
                                                    2,
                                                )}
                                                s
                                            </span>
                                            <span>
                                                warnings{" "}
                                                {voiceWarningSegments.length}
                                            </span>
                                            <span>
                                                slow {voiceSlowSegments.length}
                                            </span>
                                        </div>
                                        {voiceWarningSegments.length > 0 ? (
                                            <div className="space-y-1 border border-amber-500/30 bg-amber-500/10 p-2 text-amber-800">
                                                <div className="flex items-start gap-2">
                                                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                    <p>
                                                        Một số segment vẫn cần
                                                        nói nhanh vì bản dịch
                                                        dài hơn timeline/gap
                                                        hiện có. Rút gọn text ở
                                                        các segment này sẽ cho
                                                        giọng tự nhiên hơn.
                                                    </p>
                                                </div>
                                                <div className="grid gap-1 sm:grid-cols-2">
                                                    {voiceWarningSegments
                                                        .slice(0, 6)
                                                        .map((chunk) => (
                                                            <div
                                                                key={
                                                                    chunk.segmentId
                                                                }
                                                                className="border border-amber-500/20 bg-white/60 px-2 py-1"
                                                            >
                                                                <span className="font-semibold">
                                                                    #
                                                                    {
                                                                        chunk.segmentId
                                                                    }{" "}
                                                                    {formatSpeedFactor(
                                                                        chunk.speedFactor,
                                                                    )}
                                                                </span>{" "}
                                                                <span>
                                                                    raw{" "}
                                                                    {chunk.rawDurationSeconds.toFixed(
                                                                        2,
                                                                    )}
                                                                    s / target{" "}
                                                                    {chunk.targetDurationSeconds.toFixed(
                                                                        2,
                                                                    )}
                                                                    s
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}
                                {voiceAudioUrl ? (
                                    <div className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                                        <p className="text-[11px] font-semibold text-main">
                                            Processing summary
                                        </p>
                                        <div className="mt-1 grid gap-1 sm:grid-cols-2">
                                            <p>
                                                Processed video size:{" "}
                                                {processedSourceMeta
                                                    ? formatBytes(
                                                          processedSourceMeta.byteLength,
                                                      )
                                                    : "n/a"}
                                            </p>
                                            <p>
                                                Processed source speed:{" "}
                                                {processedSourceMeta
                                                    ? `${processedSourceMeta.speedFactor.toFixed(2)}x`
                                                    : "1.00x"}
                                            </p>
                                            <p>
                                                Preprocess time:{" "}
                                                {processedSourceMeta
                                                    ? formatDurationMs(
                                                          processedSourceMeta.generationDurationMs,
                                                      )
                                                    : "skipped"}
                                            </p>
                                            <p>
                                                Extract audio time:{" "}
                                                {formatDurationMs(
                                                    Number(
                                                        result?.steps.find(
                                                            (step) =>
                                                                step.id ===
                                                                "extract-audio",
                                                        )?.metrics
                                                            ?.stepDurationMs ??
                                                            Number.NaN,
                                                    ),
                                                )}
                                            </p>
                                            <p>
                                                Transcribe time:{" "}
                                                {formatDurationMs(
                                                    Number(
                                                        result?.steps.find(
                                                            (step) =>
                                                                step.id ===
                                                                "groq-transcribe",
                                                        )?.metrics
                                                            ?.stepDurationMs ??
                                                            Number.NaN,
                                                    ),
                                                )}
                                            </p>
                                            <p>
                                                Translate time:{" "}
                                                {translation
                                                    ? formatDurationMs(
                                                          translation.generationDurationMs,
                                                      )
                                                    : "n/a"}
                                            </p>
                                            <p>
                                                Voice generation time:{" "}
                                                {voiceResult
                                                    ? formatDurationMs(
                                                          voiceResult.generationDurationMs,
                                                      )
                                                    : "n/a"}
                                            </p>
                                            <p>
                                                Metadata time:{" "}
                                                {metadataGenerationDurationMs !==
                                                null
                                                    ? formatDurationMs(
                                                          metadataGenerationDurationMs,
                                                      )
                                                    : "n/a"}
                                            </p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
                                    {activeSourceVideoPreviewUrl ? (
                                        <>
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
                                                onClick={() => {
                                                    void toggleDubPreviewPause();
                                                }}
                                                className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                            >
                                                {isDubPreviewPaused
                                                    ? "Resume"
                                                    : "Pause"}
                                            </button>
                                        </>
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
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-semibold text-main">
                                    Dub preview (source video + generated voice)
                                </p>
                                {enableVideoPreprocess ? (
                                    <p className="text-[10px] text-muted">
                                        Source preview speed:{" "}
                                        {dubPreviewPlaybackRate.toFixed(2)}x
                                    </p>
                                ) : null}
                                {activeSourceVideoPreviewUrl ? (
                                    <video
                                        ref={videoPreviewRef}
                                        controls
                                        muted
                                        src={activeSourceVideoPreviewUrl}
                                        onError={() =>
                                            setDubPreviewError(
                                                "Dub preview không load được source video hiện tại.",
                                            )
                                        }
                                        className="w-full border border-main bg-black"
                                    />
                                ) : (
                                    <div className="border border-dashed border-main bg-main px-3 py-8 text-[11px] text-muted">
                                        No source video preview.
                                    </div>
                                )}
                                {isPreparingProcessedSource ? (
                                    <p className="text-[10px] text-muted">
                                        Preparing processed source video...
                                    </p>
                                ) : null}
                                {processedSourceError ? (
                                    <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                        {processedSourceError}
                                    </p>
                                ) : null}

                                <audio
                                    controls
                                    src={voiceAudioUrl}
                                    ref={voicePreviewRef}
                                    onError={() =>
                                        setDubPreviewError(
                                            "Dub preview không load được generated voice audio.",
                                        )
                                    }
                                    onTimeUpdate={(event) => {
                                        const currentTime =
                                            event.currentTarget.currentTime;
                                        updateActiveVoiceSegment(currentTime);
                                    }}
                                    onEnded={() =>
                                        setActiveVoiceSegmentId(null)
                                    }
                                    onPause={() => {
                                        if (voicePreviewRef.current?.ended) {
                                            setActiveVoiceSegmentId(null);
                                        }
                                    }}
                                    className="w-full"
                                />
                                {dubPreviewError ? (
                                    <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                        {dubPreviewError}
                                    </p>
                                ) : null}
                            </div>
                            {voiceTimelineDiagnostics.length > 0 ? (
                                <div className="space-y-3 border border-main bg-main p-3 lg:col-span-2">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-semibold text-main">
                                                Audio Timeline Workbench
                                            </p>
                                            <p className="mt-1 text-[10px] leading-4 text-muted">
                                                {
                                                    voiceTimelineWorkbench.items
                                                        .length
                                                }{" "}
                                                chunks ·{" "}
                                                {
                                                    voiceTimelineWorkbench.laneCount
                                                }{" "}
                                                lane(s) ·{" "}
                                                {formatTime(
                                                    voiceTimelineWorkbench.timelineEnd,
                                                )}{" "}
                                                total
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {(
                                                [
                                                    "all",
                                                    "warnings",
                                                    "overlap",
                                                    "fast",
                                                    "slow",
                                                ] as const
                                            ).map((filter) => (
                                                <button
                                                    key={filter}
                                                    type="button"
                                                    onClick={() =>
                                                        setVoiceTimelineFilter(
                                                            filter,
                                                        )
                                                    }
                                                    className={`border px-2 py-1 text-[10px] font-semibold capitalize ${
                                                        voiceTimelineFilter ===
                                                        filter
                                                            ? "border-accent bg-accent/10 text-accent"
                                                            : "border-main bg-main text-main hover:bg-secondary"
                                                    }`}
                                                >
                                                    {filter}
                                                </button>
                                            ))}
                                            <div className="ml-1 flex items-center gap-1 border border-main bg-secondary/40 px-2 py-1 text-[10px] text-muted">
                                                <span>Zoom</span>
                                                <input
                                                    type="range"
                                                    min="0.7"
                                                    max="2.2"
                                                    step="0.1"
                                                    value={voiceTimelineZoom}
                                                    onChange={(event) =>
                                                        setVoiceTimelineZoom(
                                                            Number(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="h-4 w-24 accent-[var(--color-accent)]"
                                                />
                                                <span>
                                                    {voiceTimelineZoom.toFixed(
                                                        1,
                                                    )}
                                                    x
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid gap-2 text-[10px] text-main sm:grid-cols-4">
                                        <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                            <p className="font-semibold">
                                                Warnings
                                            </p>
                                            <p className="text-muted">
                                                {
                                                    voiceTimelineWorkbench.warningCount
                                                }{" "}
                                                chunk(s)
                                            </p>
                                        </div>
                                        <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                            <p className="font-semibold">
                                                Overlap
                                            </p>
                                            <p className="text-muted">
                                                {
                                                    voiceTimelineWorkbench.overlapCount
                                                }{" "}
                                                chunk(s)
                                            </p>
                                        </div>
                                        <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                            <p className="font-semibold">
                                                Fast
                                            </p>
                                            <p className="text-muted">
                                                {
                                                    voiceTimelineWorkbench.fastCount
                                                }{" "}
                                                chunk(s)
                                            </p>
                                        </div>
                                        <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                            <p className="font-semibold">
                                                Padded
                                            </p>
                                            <p className="text-muted">
                                                {
                                                    voiceTimelineWorkbench.slowCount
                                                }{" "}
                                                chunk(s)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="thin-scrollbar overflow-x-auto border border-main bg-white p-2">
                                        <div
                                            className="relative"
                                            style={{
                                                width: `${voiceTimelineWorkbench.timelineWidth}px`,
                                                height:
                                                    voiceTimelineWorkbench.laneCount *
                                                        42 +
                                                    44,
                                            }}
                                        >
                                            <div className="absolute left-0 right-0 top-0 h-8 border-b border-main bg-secondary/30">
                                                {voiceTimelineWorkbench.ticks.map(
                                                    (tick) => (
                                                        <div
                                                            key={tick}
                                                            className="absolute top-0 h-full border-l border-main pl-1 text-[10px] text-muted"
                                                            style={{
                                                                left: `${(tick / voiceTimelineWorkbench.timelineEnd) * 100}%`,
                                                            }}
                                                        >
                                                            {formatTime(tick)}
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                            {Array.from({
                                                length: voiceTimelineWorkbench.laneCount,
                                            }).map((_, lane) => (
                                                <div
                                                    key={lane}
                                                    className="absolute left-0 right-0 border-b border-main/60 bg-secondary/10"
                                                    style={{
                                                        top: 44 + lane * 42,
                                                    }}
                                                />
                                            ))}
                                            {voiceTimelineWorkbench.filteredItems.map(
                                                (chunk) => {
                                                    const tone =
                                                        chunk.status ===
                                                        "overlap"
                                                            ? "border-rose-300 bg-rose-500/80 text-white"
                                                            : chunk.status ===
                                                                "warning"
                                                              ? "border-amber-200 bg-amber-500/85 text-neutral-950"
                                                              : chunk.status ===
                                                                  "fast"
                                                                ? "border-sky-200 bg-sky-500/85 text-white"
                                                                : chunk.status ===
                                                                    "slow"
                                                                  ? "border-violet-200 bg-violet-500/85 text-white"
                                                                  : "border-cyan-100 bg-cyan-600/85 text-white";
                                                    const selected =
                                                        selectedVoiceChunkId ===
                                                        chunk.segmentId;
                                                    return (
                                                        <button
                                                            key={
                                                                chunk.segmentId
                                                            }
                                                            type="button"
                                                            title={`#${chunk.parentId} · ${formatTime(chunk.start)} -> ${formatTime(chunk.end)} · ${formatSpeedFactor(chunk.speedFactor)} · raw ${chunk.rawDurationSeconds.toFixed(2)}s / target ${chunk.targetDurationSeconds.toFixed(2)}s`}
                                                            onClick={() => {
                                                                setSelectedVoiceChunkId(
                                                                    chunk.segmentId,
                                                                );
                                                                setActiveVoiceSegmentId(
                                                                    chunk.parentId,
                                                                );
                                                            }}
                                                            className={`absolute overflow-hidden border px-1.5 py-1 text-left text-[10px] leading-3 shadow-sm transition ${tone} ${
                                                                selected
                                                                    ? "ring-2 ring-white"
                                                                    : "hover:brightness-110"
                                                            }`}
                                                            style={{
                                                                left: `${chunk.leftPercent}%`,
                                                                top:
                                                                    48 +
                                                                    chunk.lane *
                                                                        42,
                                                                width: `${Math.max(0.45, chunk.widthPercent)}%`,
                                                                minWidth: 34,
                                                                height: 30,
                                                            }}
                                                        >
                                                            <span className="block truncate font-bold">
                                                                #
                                                                {chunk.parentId}{" "}
                                                                {formatSpeedFactor(
                                                                    chunk.speedFactor,
                                                                )}
                                                            </span>
                                                            <span className="block truncate opacity-85">
                                                                {formatTime(
                                                                    chunk.start,
                                                                )}{" "}
                                                                →{" "}
                                                                {formatTime(
                                                                    chunk.end,
                                                                )}
                                                            </span>
                                                        </button>
                                                    );
                                                },
                                            )}
                                            {voiceTimelineWorkbench
                                                .filteredItems.length === 0 ? (
                                                <div className="absolute left-4 top-14 text-[11px] text-muted">
                                                    No chunks match this filter.
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
                                        <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                                            <span className="border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-cyan-700">
                                                Normal chunk
                                            </span>
                                            <span className="border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-sky-700">
                                                Fast
                                            </span>
                                            <span className="border border-violet-500/30 bg-violet-500/10 px-2 py-1 text-violet-700">
                                                Padded/sparse
                                            </span>
                                            <span className="border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-700">
                                                Warning
                                            </span>
                                            <span className="border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-rose-700">
                                                Overlap
                                            </span>
                                        </div>
                                        <div className="max-h-36 overflow-auto border border-main bg-secondary/25 p-2 text-[10px] leading-4">
                                            <p className="mb-1 font-semibold text-main">
                                                Timeline issues
                                            </p>
                                            {voiceTimelineWorkbench.issues
                                                .length > 0 ? (
                                                <div className="space-y-1">
                                                    {voiceTimelineWorkbench.issues.map(
                                                        (chunk) => (
                                                            <button
                                                                key={
                                                                    chunk.segmentId
                                                                }
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedVoiceChunkId(
                                                                        chunk.segmentId,
                                                                    );
                                                                    setActiveVoiceSegmentId(
                                                                        chunk.parentId,
                                                                    );
                                                                }}
                                                                className="block w-full border border-main bg-main px-2 py-1 text-left hover:bg-secondary"
                                                            >
                                                                <span className="font-semibold text-main">
                                                                    #
                                                                    {
                                                                        chunk.parentId
                                                                    }{" "}
                                                                    {
                                                                        chunk.status
                                                                    }
                                                                </span>{" "}
                                                                <span className="text-muted">
                                                                    {formatSpeedFactor(
                                                                        chunk.speedFactor,
                                                                    )}{" "}
                                                                    ·{" "}
                                                                    {formatTime(
                                                                        chunk.start,
                                                                    )}{" "}
                                                                    →{" "}
                                                                    {formatTime(
                                                                        chunk.end,
                                                                    )}
                                                                </span>
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-muted">
                                                    No timeline issues detected.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </main>
            </div>
        </section>
    );
}
