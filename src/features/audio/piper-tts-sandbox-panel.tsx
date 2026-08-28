"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Download, RadioTower, Send, Volume2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import type {
    AudioTranscriptionStep,
    ChineseTranscriptionResult,
} from "@/lib/multilingual-audio/types";

const REPO_PIPER_BINARY = "piper";
const REPO_PIPER_MODEL = "";
const REPO_PIPER_CONFIG = "";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";

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

type LocalPiperModel = {
    id: string;
    label: string;
    modelPath: string;
    configPath: string;
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

type ReplicateResolvedTarget = {
    mode: string;
    endpoint: string;
    version?: string;
};

type ReplicatePredictionPayload =
    | {
          ok: true;
          data: {
              prediction: {
                  id?: string;
                  status?: string;
                  output?: unknown;
                  logs?: string;
                  error?: unknown;
                  urls?: {
                      get?: string;
                      web?: string;
                  };
                  [key: string]: unknown;
              };
              warnings: string[];
              resolved: ReplicateResolvedTarget;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type ReplicateSchemaField = {
    key: string;
    title: string;
    type: string;
    format: string;
    description: string;
    default?: unknown;
    enum?: unknown[];
    likelyFileInput: boolean;
};

type ReplicateSchemaPayload =
    | {
          ok: true;
          data: {
              mode: string;
              version: string;
              inputProperties: ReplicateSchemaField[];
              suggestedFileKeys: string[];
              note?: string;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

const DEFAULT_REPLICATE_INPUT = JSON.stringify(
    {
        width: 1024,
        height: 768,
        prompt: "Cô gái dọn dẹp tủ đồ, định vứt một chiếc áo khoác phao cũ, sờn rách ở tay áo. Anh chồng đi qua nhìn thấy, liền nhặt lại và treo vào tủ.",
        go_fast: false,
        output_format: "jpg",
        guidance_scale: 0,
        output_quality: 80,
        num_inference_steps: 8,
    },
    null,
    2,
);
const DEFAULT_STYLE_LOCK =
    "Một phong cách duy nhất cho toàn bộ video: cinematic Vietnamese drama, semi-realistic anime/manhua illustration, soft film lighting, warm emotional color grading, detailed fabric texture, natural proportions, consistent camera lens and composition language.";
const DEFAULT_CHARACTER_LOCK =
    "Nhân vật chính phải giữ nguyên qua mọi ảnh: cô gái trẻ người Việt, tóc đen dài ngang vai, khuôn mặt thanh tú hơi buồn, dáng người nhỏ, mặc áo len sáng màu; người chồng dáng cao gầy, tóc đen ngắn, áo khoác tối màu, biểu cảm ít nói nhưng dịu dàng.";
const DEFAULT_CONTINUITY_LOCK =
    "Không đổi phong cách đồ họa, độ tuổi, kiểu tóc, màu tóc, khuôn mặt, trang phục chính, tỉ lệ cơ thể và mood ánh sáng giữa các cảnh. Mỗi ảnh là một cảnh khác nhau nhưng thuộc cùng một bộ phim.";

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

function collectOutputUrls(value: unknown, urls: string[] = []) {
    if (typeof value === "string") {
        if (/^(https?:\/\/|data:)/iu.test(value)) urls.push(value);
        return urls;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectOutputUrls(item, urls);
        return urls;
    }
    if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectOutputUrls(item, urls);
    }
    return urls;
}

function classifyMediaUrl(url: string) {
    const lower = url.toLowerCase();
    if (
        lower.startsWith("data:image/") ||
        /\.(png|jpe?g|webp|gif)(\?|$)/u.test(lower)
    ) {
        return "image";
    }
    if (
        lower.startsWith("data:audio/") ||
        /\.(wav|mp3|m4a|ogg|flac)(\?|$)/u.test(lower)
    ) {
        return "audio";
    }
    if (
        lower.startsWith("data:video/") ||
        /\.(mp4|webm|mov)(\?|$)/u.test(lower)
    ) {
        return "video";
    }
    return "link";
}

interface ExtractorFormat {
    formatId: string;
    ext: string;
    resolution?: string | null;
    formatNote?: string | null;
    filesize?: number | null;
    hasVideo?: boolean;
    hasAudio?: boolean;
}

interface ExtractorResult {
    title?: string | null;
    originPlatform?: string | null;
    durationMs?: number | null;
    formats?: ExtractorFormat[];
}

type PiperTtsSandboxPanelProps = {
    section: LeftbarNavItem;
};

export function PiperTtsSandboxPanel({ section }: PiperTtsSandboxPanelProps) {
    const Icon = section.icon ?? RadioTower;
    const [file, setFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([]);
    const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
    const [isLoadingAiProviders, setIsLoadingAiProviders] = useState(false);
    const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetBrowser, setShowAssetBrowser] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");
    const [language, setLanguage] = useState("zh");
    const [
        selectedTranscriptionProviderId,
        setSelectedTranscriptionProviderId,
    ] = useState("");
    const [transcriptionModel, setTranscriptionModel] = useState(
        DEFAULT_TRANSCRIPTION_MODEL,
    );
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
    const [piperModels, setPiperModels] = useState<LocalPiperModel[]>([]);
    const [isLoadingPiperModels, setIsLoadingPiperModels] = useState(true);
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
    const [replicateToken, setReplicateToken] = useState("");
    const [replicateTarget, setReplicateTarget] = useState(
        "prunaai/z-image-turbo",
    );
    const [replicateMode, setReplicateMode] = useState("auto");
    const [replicateInputJson, setReplicateInputJson] = useState(
        DEFAULT_REPLICATE_INPUT,
    );
    const [replicateFileInputKey, setReplicateFileInputKey] = useState("");
    const [replicateFile, setReplicateFile] = useState<File | null>(null);
    const [replicateWaitSeconds, setReplicateWaitSeconds] = useState("45");
    const [replicateCancelAfter, setReplicateCancelAfter] = useState("5m");
    const [styleLock, setStyleLock] = useState(DEFAULT_STYLE_LOCK);
    const [characterLock, setCharacterLock] = useState(DEFAULT_CHARACTER_LOCK);
    const [continuityLock, setContinuityLock] = useState(
        DEFAULT_CONTINUITY_LOCK,
    );
    const [scenePrompt, setScenePrompt] = useState(
        "Cô gái dọn dẹp tủ đồ, định vứt một chiếc áo khoác phao cũ, sờn rách ở tay áo. Anh chồng đi qua nhìn thấy, liền nhặt lại và treo vào tủ.",
    );
    const [isInspectingReplicateSchema, setIsInspectingReplicateSchema] =
        useState(false);
    const [replicateSchemaError, setReplicateSchemaError] = useState<
        string | null
    >(null);
    const [replicateSchema, setReplicateSchema] = useState<
        Extract<ReplicateSchemaPayload, { ok: true }>["data"] | null
    >(null);
    const [isRunningReplicate, setIsRunningReplicate] = useState(false);
    const [replicateError, setReplicateError] = useState<string | null>(null);
    const [replicateResult, setReplicateResult] = useState<
        Extract<ReplicatePredictionPayload, { ok: true }>["data"] | null
    >(null);

    const [extractorUrl, setExtractorUrl] = useState("");
    const [extractorTitle, setExtractorTitle] = useState("");
    const [extractorTarget, setExtractorTarget] = useState<"video" | "audio">(
        "video",
    );
    const [extractorQuality, setExtractorQuality] = useState<string>("best");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const [analyzeResult, setAnalyzeResult] = useState<ExtractorResult | null>(
        null,
    );

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

    useEffect(() => {
        fetch("/api/audio/piper-models", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: LocalPiperModel[] }) => {
                const models = payload.ok ? (payload.data ?? []) : [];
                setPiperModels(models);
                if (models.length > 0) {
                    setModelPath(
                        (currentPath) => currentPath || models[0].modelPath,
                    );
                    setConfigPath(
                        (currentPath) => currentPath || models[0].configPath,
                    );
                }
            })
            .catch(() => setPiperModels([]))
            .finally(() => setIsLoadingPiperModels(false));
    }, []);

    useEffect(() => {
        setIsLoadingAiProviders(true);
        fetch("/api/ai-providers", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiProviderOption[] }) => {
                const activeProviders = (payload.data ?? []).filter(
                    (provider) => provider.status === "active",
                );
                if (payload.ok) setAiProviders(activeProviders);
            })
            .catch(() => setAiProviders([]))
            .finally(() => setIsLoadingAiProviders(false));
    }, []);

    useEffect(() => {
        if (!selectedTranscriptionProviderId) {
            setAiModels([]);
            return;
        }
        setIsLoadingAiModels(true);
        fetch(`/api/ai-providers/${selectedTranscriptionProviderId}/models`, {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiModelOption[] }) => {
                const models = payload.ok ? (payload.data ?? []) : [];
                setAiModels(models);
                const preferred =
                    models.find((model) =>
                        /whisper|transcri|speech|audio/iu.test(model.id),
                    ) ?? models[0];
                if (preferred) setTranscriptionModel(preferred.id);
            })
            .catch(() => setAiModels([]))
            .finally(() => setIsLoadingAiModels(false));
    }, [selectedTranscriptionProviderId]);

    const audioUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.audioBase64}`;
    }, [result]);
    const selectedAsset = useMemo(
        () => assets.find((asset) => asset._id === selectedAssetId) ?? null,
        [assets, selectedAssetId],
    );
    const replicateOutputUrls = useMemo(
        () => collectOutputUrls(replicateResult?.prediction.output),
        [replicateResult],
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
            if (selectedTranscriptionProviderId) {
                formData.append("providerId", selectedTranscriptionProviderId);
            }
            if (transcriptionModel.trim()) {
                formData.append("model", transcriptionModel.trim());
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

    const copyReplicateOutput = async () => {
        if (!replicateResult) return;
        await navigator.clipboard.writeText(
            JSON.stringify(replicateResult.prediction, null, 2),
        );
    };

    const inspectReplicateSchema = async () => {
        setIsInspectingReplicateSchema(true);
        setReplicateSchemaError(null);
        setReplicateSchema(null);
        try {
            const params = new URLSearchParams({
                target: replicateTarget,
                mode: replicateMode,
            });
            if (replicateToken.trim()) params.set("token", replicateToken);
            const response = await fetch(
                `/api/replicate/predictions?${params.toString()}`,
                { cache: "no-store" },
            );
            const payload = (await response.json()) as ReplicateSchemaPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Schema inspection failed."}`
                        : (payload.error ?? "Schema inspection failed."),
                );
            }
            setReplicateSchema(payload.data);
            if (
                !replicateFileInputKey.trim() &&
                payload.data.suggestedFileKeys[0]
            ) {
                setReplicateFileInputKey(payload.data.suggestedFileKeys[0]);
            }
        } catch (requestError) {
            setReplicateSchemaError(
                requestError instanceof Error
                    ? requestError.message
                    : "Schema inspection failed.",
            );
        } finally {
            setIsInspectingReplicateSchema(false);
        }
    };

    const applyConsistentPrompt = () => {
        const prompt = [
            `Scene: ${scenePrompt.trim()}`,
            `Style lock: ${styleLock.trim()}`,
            `Character lock: ${characterLock.trim()}`,
            `Continuity lock: ${continuityLock.trim()}`,
            "Render this as one frame from the same visual series. Do not change the established character design or visual style.",
        ]
            .filter((line) => !/:\s*$/u.test(line))
            .join("\n\n");

        try {
            const parsed = JSON.parse(replicateInputJson) as Record<
                string,
                unknown
            >;
            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                throw new Error("Input JSON must be an object.");
            }
            setReplicateInputJson(
                JSON.stringify({ ...parsed, prompt }, null, 2),
            );
        } catch {
            setReplicateInputJson(JSON.stringify({ prompt }, null, 2));
        }
    };

    const runReplicate = async () => {
        setIsRunningReplicate(true);
        setReplicateError(null);
        setReplicateResult(null);
        try {
            const formData = new FormData();
            formData.append("token", replicateToken);
            formData.append("target", replicateTarget);
            formData.append("mode", replicateMode);
            formData.append("inputJson", replicateInputJson);
            formData.append("fileInputKey", replicateFileInputKey);
            formData.append("waitSeconds", replicateWaitSeconds);
            formData.append("cancelAfter", replicateCancelAfter);
            if (replicateFile) formData.append("inputFile", replicateFile);

            const response = await fetch("/api/replicate/predictions", {
                method: "POST",
                body: formData,
            });
            const payload =
                (await response.json()) as ReplicatePredictionPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Replicate prediction failed."}`
                        : (payload.error ?? "Replicate prediction failed."),
                );
            }
            setReplicateResult(payload.data);
        } catch (requestError) {
            setReplicateError(
                requestError instanceof Error
                    ? requestError.message
                    : "Replicate prediction failed.",
            );
        } finally {
            setIsRunningReplicate(false);
        }
    };

    const runAnalyze = async () => {
        if (!extractorUrl.trim()) {
            setAnalyzeError("Vui lòng nhập link video.");
            return;
        }
        setIsAnalyzing(true);
        setAnalyzeError(null);
        setAnalyzeResult(null);
        try {
            const response = await fetch("/api/video-intake/formats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: extractorUrl.trim(),
                    qualityPreference: extractorQuality,
                }),
            });
            const payload = await response.json();
            if (!payload.ok) {
                throw new Error(payload.error || "Phân tích link thất bại.");
            }
            setAnalyzeResult(payload.data);
        } catch (err) {
            setAnalyzeError(
                err instanceof Error ? err.message : "Phân tích link thất bại.",
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runDownload = () => {
        if (!extractorUrl.trim()) {
            setAnalyzeError("Vui lòng nhập link video trước khi tải.");
            return;
        }
        const formatSelector =
            extractorTarget === "audio" ? "ba/bestaudio" : "";
        const params = new URLSearchParams({
            sourceUrl: extractorUrl.trim(),
            qualityPreference: extractorQuality,
            formatSelector,
            title: extractorTitle.trim(),
        });
        const downloadUrl = `/api/video-intake/resolve-file?${params.toString()}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 10000);
    };

    return (
        <section className="border border-main bg-main">
            <div className="space-y-5 p-5">
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Replicate Model Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Prediction Target
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Model / version / deployment
                                </span>
                                <input
                                    value={replicateTarget}
                                    onChange={(event) =>
                                        setReplicateTarget(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="prunaai/z-image-turbo"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Run mode
                                </span>
                                <select
                                    value={replicateMode}
                                    onChange={(event) =>
                                        setReplicateMode(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                >
                                    <option value="auto">
                                        Auto: owner/model latest version
                                    </option>
                                    <option value="version">
                                        Explicit version ref
                                    </option>
                                    <option value="official-model">
                                        Official model endpoint
                                    </option>
                                    <option value="deployment">
                                        Deployment endpoint
                                    </option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Token
                                </span>
                                <input
                                    value={replicateToken}
                                    onChange={(event) =>
                                        setReplicateToken(event.target.value)
                                    }
                                    type="password"
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="Optional if server has REPLICATE_API_TOKEN"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={inspectReplicateSchema}
                                disabled={isInspectingReplicateSchema}
                                className="inline-flex w-full items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isInspectingReplicateSchema
                                    ? "Inspecting..."
                                    : "Inspect Schema"}
                            </button>
                            {replicateSchemaError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] leading-4 text-rose-700">
                                    {replicateSchemaError}
                                </p>
                            ) : null}
                            {replicateSchema ? (
                                <div className="space-y-2 border border-main bg-main p-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-semibold text-main">
                                            Schema Inputs
                                        </p>
                                        <span className="truncate text-[10px] text-muted">
                                            {replicateSchema.version ||
                                                replicateSchema.mode}
                                        </span>
                                    </div>
                                    {replicateSchema.note ? (
                                        <p className="text-[10px] leading-4 text-muted">
                                            {replicateSchema.note}
                                        </p>
                                    ) : null}
                                    {replicateSchema.suggestedFileKeys.length >
                                    0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {replicateSchema.suggestedFileKeys.map(
                                                (key) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() =>
                                                            setReplicateFileInputKey(
                                                                key,
                                                            )
                                                        }
                                                        className="border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent"
                                                    >
                                                        Use {key}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] leading-4 text-muted">
                                            No obvious image/file reference
                                            input detected.
                                        </p>
                                    )}
                                    <div className="max-h-44 overflow-auto border border-main">
                                        {replicateSchema.inputProperties.map(
                                            (field) => (
                                                <div
                                                    key={field.key}
                                                    className="border-b border-main px-2 py-1.5 last:border-b-0"
                                                >
                                                    <p className="text-[10px] font-semibold text-main">
                                                        {field.key}
                                                        {field.likelyFileInput
                                                            ? " · file"
                                                            : ""}
                                                    </p>
                                                    <p className="truncate text-[10px] text-muted">
                                                        {[
                                                            field.type,
                                                            field.format,
                                                            field.description,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Wait seconds
                                    </span>
                                    <input
                                        value={replicateWaitSeconds}
                                        onChange={(event) =>
                                            setReplicateWaitSeconds(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Cancel after
                                    </span>
                                    <input
                                        value={replicateCancelAfter}
                                        onChange={(event) =>
                                            setReplicateCancelAfter(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                        placeholder="5m"
                                    />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Optional file input key
                                </span>
                                <input
                                    value={replicateFileInputKey}
                                    onChange={(event) =>
                                        setReplicateFileInputKey(
                                            event.target.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="image, audio, input_audio..."
                                />
                            </label>
                            <input
                                type="file"
                                onChange={(event) =>
                                    setReplicateFile(
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                            />
                            <button
                                type="button"
                                onClick={runReplicate}
                                disabled={isRunningReplicate}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {isRunningReplicate
                                    ? "Running..."
                                    : "Run Replicate"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[12px] font-semibold text-main">
                                        Reference & Consistency
                                    </p>
                                    <button
                                        type="button"
                                        onClick={applyConsistentPrompt}
                                        className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:border-accent"
                                    >
                                        Build Prompt
                                    </button>
                                </div>
                                <label className="mt-3 block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Scene prompt
                                    </span>
                                    <textarea
                                        rows={3}
                                        value={scenePrompt}
                                        onChange={(event) =>
                                            setScenePrompt(event.target.value)
                                        }
                                        className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                    />
                                </label>
                                <div className="mt-3 grid gap-3 xl:grid-cols-3">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Style lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={styleLock}
                                            onChange={(event) =>
                                                setStyleLock(event.target.value)
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Character lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={characterLock}
                                            onChange={(event) =>
                                                setCharacterLock(
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Continuity lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={continuityLock}
                                            onChange={(event) =>
                                                setContinuityLock(
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[12px] font-semibold text-main">
                                        Input JSON
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setReplicateInputJson(
                                                DEFAULT_REPLICATE_INPUT,
                                            )
                                        }
                                        className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:border-accent"
                                    >
                                        Z Image Turbo
                                    </button>
                                </div>
                                <textarea
                                    rows={10}
                                    value={replicateInputJson}
                                    onChange={(event) =>
                                        setReplicateInputJson(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full resize-y border border-main bg-main px-2 py-1.5 font-mono text-[11px] leading-5 text-main outline-none focus:border-accent"
                                />
                                <p className="mt-2 text-[10px] leading-4 text-muted">
                                    For file models, set a file input key and
                                    upload a small test file. The route injects
                                    it as a data URL into this JSON object.
                                </p>
                            </div>
                            {replicateError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {replicateError}
                                </p>
                            ) : null}
                            {replicateResult ? (
                                <div className="space-y-3 border border-main bg-secondary/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-semibold text-main">
                                                Prediction Output
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted">
                                                {replicateResult.resolved.mode}{" "}
                                                ·{" "}
                                                {replicateResult.prediction
                                                    .status ?? "unknown"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyReplicateOutput}
                                            className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                        >
                                            <Copy className="h-3 w-3" />
                                            Copy JSON
                                        </button>
                                    </div>
                                    {replicateResult.warnings.length > 0 ? (
                                        <div className="space-y-1">
                                            {replicateResult.warnings.map(
                                                (warning) => (
                                                    <p
                                                        key={warning}
                                                        className="border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] leading-4 text-amber-700"
                                                    >
                                                        {warning}
                                                    </p>
                                                ),
                                            )}
                                        </div>
                                    ) : null}
                                    {replicateOutputUrls.length > 0 ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {replicateOutputUrls.map(
                                                (url, index) => {
                                                    const type =
                                                        classifyMediaUrl(url);
                                                    return (
                                                        <div
                                                            key={`${url}-${index}`}
                                                            className="border border-main bg-main p-2"
                                                        >
                                                            {type ===
                                                            "image" ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={url}
                                                                    alt={`Replicate output ${index + 1}`}
                                                                    className="max-h-80 w-full object-contain"
                                                                />
                                                            ) : null}
                                                            {type ===
                                                            "audio" ? (
                                                                <audio
                                                                    controls
                                                                    src={url}
                                                                    className="w-full"
                                                                />
                                                            ) : null}
                                                            {type ===
                                                            "video" ? (
                                                                <video
                                                                    controls
                                                                    src={url}
                                                                    className="max-h-80 w-full bg-black object-contain"
                                                                />
                                                            ) : null}
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-2 block truncate text-[10px] font-semibold text-accent"
                                                            >
                                                                Output{" "}
                                                                {index + 1}
                                                            </a>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    ) : null}
                                    <pre className="max-h-[360px] overflow-auto border border-main bg-main p-3 text-[10px] leading-4 text-main">
                                        {JSON.stringify(
                                            replicateResult.prediction,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
                <div className="border-t border-main" />
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
                                                                    .join(
                                                                        " · ",
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
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    AI Provider
                                </span>
                                <select
                                    value={selectedTranscriptionProviderId}
                                    onChange={(event) =>
                                        setSelectedTranscriptionProviderId(
                                            event.target.value,
                                        )
                                    }
                                    disabled={
                                        isRunningTranscript ||
                                        isLoadingAiProviders
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    <option value="">
                                        Groq env (GROQ_API_KEY)
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
                                    Transcription model
                                </span>
                                {selectedTranscriptionProviderId &&
                                aiModels.length > 0 ? (
                                    <select
                                        value={transcriptionModel}
                                        onChange={(event) =>
                                            setTranscriptionModel(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            isRunningTranscript ||
                                            isLoadingAiModels
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                    >
                                        {aiModels.map((model) => (
                                            <option
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.name || model.id}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={transcriptionModel}
                                        onChange={(event) =>
                                            setTranscriptionModel(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            isRunningTranscript ||
                                            isLoadingAiModels
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                        placeholder={
                                            DEFAULT_TRANSCRIPTION_MODEL
                                        }
                                    />
                                )}
                            </label>
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
                <div className="border-t border-main" />
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
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Local voice model
                                </span>
                                <select
                                    value={
                                        piperModels.some(
                                            (model) =>
                                                model.modelPath === modelPath &&
                                                model.configPath === configPath,
                                        )
                                            ? modelPath
                                            : ""
                                    }
                                    onChange={(event) => {
                                        const model = piperModels.find(
                                            (candidate) =>
                                                candidate.modelPath ===
                                                event.target.value,
                                        );
                                        if (!model) return;
                                        setModelPath(model.modelPath);
                                        setConfigPath(model.configPath);
                                    }}
                                    disabled={
                                        isLoadingPiperModels ||
                                        piperModels.length === 0
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLoadingPiperModels ? (
                                        <option>Loading local voices...</option>
                                    ) : null}
                                    {!isLoadingPiperModels &&
                                    piperModels.length === 0 ? (
                                        <option>
                                            No complete Piper model pairs found
                                        </option>
                                    ) : null}
                                    {piperModels.map((model) => (
                                        <option
                                            key={model.id}
                                            value={model.modelPath}
                                        >
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="mt-1 block text-[10px] leading-4 text-muted">
                                    {piperModels.length > 0
                                        ? "Choosing a voice fills both model and config paths."
                                        : "Add matching .onnx and .onnx.json files directly in piper/, or enter paths manually."}
                                </span>
                            </label>
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
                                {isRunning
                                    ? "Generating..."
                                    : "Generate Speech"}
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
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Fast Media Extractor
                    </h2>
                    <p className="text-[11px] text-muted leading-relaxed">
                        Tải nhanh video/audio bằng <strong>Cobalt API</strong>{" "}
                        hoặc <strong>yt-dlp (Local)</strong>. Để sử dụng Cobalt
                        cho tốc độ tải cực cao và tránh bị YouTube chặn, vui
                        lòng cấu hình <code>COBALT_API_URL</code> trong file{" "}
                        <code>.env.local</code> (ví dụ:{" "}
                        <code>COBALT_API_URL=https://api.cobalt.tools/</code>{" "}
                        hoặc instance tự host của bạn). Tìm hiểu thêm tại{" "}
                        <a
                            href="https://cobalt.tools"
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline font-semibold"
                        >
                            cobalt.tools
                        </a>{" "}
                        hoặc{" "}
                        <a
                            href="https://github.com/imputnet/cobalt"
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline font-semibold"
                        >
                            GitHub Cobalt
                        </a>
                        .
                    </p>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Extractor Settings
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Media Link (TikTok, Douyin, Facebook,
                                    YouTube)
                                </span>
                                <input
                                    value={extractorUrl}
                                    onChange={(event) =>
                                        setExtractorUrl(event.target.value)
                                    }
                                    placeholder="https://..."
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Custom File Title (Optional)
                                </span>
                                <input
                                    value={extractorTitle}
                                    onChange={(event) =>
                                        setExtractorTitle(event.target.value)
                                    }
                                    placeholder="my-extracted-media"
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Target Type
                                    </span>
                                    <select
                                        value={extractorTarget}
                                        onChange={(event) =>
                                            setExtractorTarget(
                                                event.target.value as
                                                    | "video"
                                                    | "audio",
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    >
                                        <option value="video">
                                            Video + Audio
                                        </option>
                                        <option value="audio">
                                            Audio Only (Voice extract)
                                        </option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Quality
                                    </span>
                                    <select
                                        value={extractorQuality}
                                        onChange={(event) =>
                                            setExtractorQuality(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    >
                                        <option value="best">Best</option>
                                        <option value="1080p">1080p</option>
                                        <option value="720p">720p</option>
                                        <option value="480p">480p</option>
                                        <option value="360p">360p</option>
                                    </select>
                                </label>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={runAnalyze}
                                    disabled={isAnalyzing}
                                    className="inline-flex w-full items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {isAnalyzing
                                        ? "Analyzing..."
                                        : "Analyze Link"}
                                </button>
                                <button
                                    type="button"
                                    onClick={runDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15"
                                >
                                    Extract & Download
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {analyzeError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {analyzeError}
                                </p>
                            ) : null}

                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Metadata & Formats
                                </p>
                                {analyzeResult ? (
                                    <div className="mt-3 space-y-3">
                                        <div className="grid gap-2 border-b border-main pb-3 text-[11px]">
                                            <p className="text-main font-semibold leading-relaxed">
                                                Title:{" "}
                                                <span className="font-normal text-muted">
                                                    {analyzeResult.title ||
                                                        "Unknown"}
                                                </span>
                                            </p>
                                            <p className="text-main font-semibold">
                                                Platform:{" "}
                                                <span className="font-normal text-muted capitalize">
                                                    {analyzeResult.originPlatform ||
                                                        "Unknown"}
                                                </span>
                                            </p>
                                            <p className="text-main font-semibold">
                                                Duration:{" "}
                                                <span className="font-normal text-muted">
                                                    {analyzeResult.durationMs
                                                        ? `${Math.floor(analyzeResult.durationMs / 1000)}s`
                                                        : "Unknown"}
                                                </span>
                                            </p>
                                        </div>
                                        {analyzeResult.formats &&
                                        analyzeResult.formats.length > 0 ? (
                                            <div className="max-h-56 overflow-y-auto border border-main bg-main text-[10px]">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-main bg-secondary/50">
                                                            <th className="p-2 font-semibold text-muted">
                                                                Format ID
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Ext
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Resolution
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Size
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                A/V
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {analyzeResult.formats.map(
                                                            (fmt, idx) => (
                                                                <tr
                                                                    key={`${fmt.formatId}-${idx}`}
                                                                    className="border-b border-main last:border-b-0 hover:bg-secondary/20"
                                                                >
                                                                    <td className="p-2 font-mono truncate max-w-[100px]">
                                                                        {
                                                                            fmt.formatId
                                                                        }
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {
                                                                            fmt.ext
                                                                        }
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.resolution ||
                                                                            fmt.formatNote ||
                                                                            "N/A"}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.filesize
                                                                            ? `${(fmt.filesize / (1024 * 1024)).toFixed(2)} MB`
                                                                            : "N/A"}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.hasVideo
                                                                            ? "V"
                                                                            : ""}
                                                                        {fmt.hasAudio
                                                                            ? "A"
                                                                            : ""}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted">
                                                No formats listed.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-[10px] text-muted">
                                        Analyze a link to see formats.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
