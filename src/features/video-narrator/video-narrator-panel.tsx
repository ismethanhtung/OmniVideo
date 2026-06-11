"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    ChevronDown,
    ChevronUp,
    Copy,
    Download,
    Info,
    Loader2,
    Mic2,
    TriangleAlert,
    Volume2,
    Wand2,
    Server,
    Play,
    Plus,
    Trash2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";
import { resolveDefaultAiProviderId } from "@/lib/ai-providers/default-provider";
import {
    getAssetFolderName,
    matchesVideoAssetSearch,
} from "@/lib/storage/asset-folder";
import { readRemoteVipWorkerBrowserConfig } from "@/lib/workspace/remote-vip-worker-config";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";
import type { SubtitleDisplayMode } from "@/lib/video-processing/video-edit-pipeline";

const VIDEO_TEXT_FONT_OPTIONS: Array<{
    value: string;
    label: string;
    cssVariable: string;
    fallbackFamily: string;
}> = [
    {
        value: "Arial",
        label: "Arial",
        cssVariable: "--font-sans",
        fallbackFamily: "Arial, sans-serif",
    },
    {
        value: "Montserrat",
        label: "Montserrat",
        cssVariable: "--font-thumb-montserrat",
        fallbackFamily: '"Montserrat", sans-serif',
    },
    {
        value: "Baloo 2",
        label: "Baloo 2",
        cssVariable: "--font-thumb-baloo-2",
        fallbackFamily: '"Baloo 2", sans-serif',
    },
    {
        value: "Braah One",
        label: "Braah One",
        cssVariable: "--font-thumb-braah-one",
        fallbackFamily: '"Braah One", sans-serif',
    },
    {
        value: "Bangers",
        label: "Bangers",
        cssVariable: "--font-thumb-bangers",
        fallbackFamily: '"Bangers", sans-serif',
    },
    {
        value: "Lobster",
        label: "Lobster",
        cssVariable: "--font-thumb-lobster",
        fallbackFamily: '"Lobster", cursive',
    },
    {
        value: "Mitr",
        label: "Mitr",
        cssVariable: "--font-thumb-mitr",
        fallbackFamily: '"Mitr", sans-serif',
    },
    {
        value: "Paytone One",
        label: "Paytone One",
        cssVariable: "--font-thumb-paytone-one",
        fallbackFamily: '"Paytone One", sans-serif',
    },
    {
        value: "Prompt",
        label: "Prompt",
        cssVariable: "--font-thumb-prompt",
        fallbackFamily: '"Prompt", sans-serif',
    },
    {
        value: "Sriracha",
        label: "Sriracha",
        cssVariable: "--font-thumb-sriracha",
        fallbackFamily: '"Sriracha", cursive',
    },
    {
        value: "Agbalumo",
        label: "Agbalumo",
        cssVariable: "--font-thumb-agbalumo",
        fallbackFamily: '"Agbalumo", cursive',
    },
];

const SUBTITLE_TEXT_COLOR_OPTIONS = [
    { value: "#FFFFCC", label: "Warm white" },
    { value: "#FFFFFF", label: "White" },
    { value: "#FFE066", label: "Yellow" },
    { value: "#7DD3FC", label: "Sky" },
    { value: "#FCA5A5", label: "Coral" },
    { value: "#86EFAC", label: "Green" },
];

const SUBTITLE_BACKGROUND_COLOR_OPTIONS = [
    { value: "#000000", label: "Black" },
    { value: "#111827", label: "Ink" },
    { value: "#1F2937", label: "Slate" },
    { value: "#7F1D1D", label: "Dark red" },
];

const SUBTITLE_STYLE_SESSION_VERSION = 2;
const SUBTITLE_PLAY_RES_Y = 1080;
const DEFAULT_SUBTITLE_FONT_SIZE = 80;
const DEFAULT_SUBTITLE_VERTICAL_PERCENT_FROM_BOTTOM = 35;
const DEFAULT_SUBTITLE_TEXT_COLOR = "#FFFFCC";
const DEFAULT_SUBTITLE_MARGIN_BOTTOM = Math.round(
    SUBTITLE_PLAY_RES_Y * (DEFAULT_SUBTITLE_VERTICAL_PERCENT_FROM_BOTTOM / 100),
);

function marginBottomToVerticalPercent(marginBottom: number) {
    if (!Number.isFinite(marginBottom)) {
        return DEFAULT_SUBTITLE_VERTICAL_PERCENT_FROM_BOTTOM;
    }
    return Math.round(
        Math.min(60, Math.max(0, (marginBottom / SUBTITLE_PLAY_RES_Y) * 100)),
    );
}

function verticalPercentToMarginBottom(percent: number) {
    if (!Number.isFinite(percent)) return DEFAULT_SUBTITLE_MARGIN_BOTTOM;
    return Math.round(
        SUBTITLE_PLAY_RES_Y * (Math.min(60, Math.max(0, percent)) / 100),
    );
}

function getVideoTextFontOption(fontFamily: string) {
    return (
        VIDEO_TEXT_FONT_OPTIONS.find((option) => option.value === fontFamily) ??
        VIDEO_TEXT_FONT_OPTIONS[0]
    );
}

function getVideoTextFontFamily(fontFamily: string) {
    const option = getVideoTextFontOption(fontFamily);
    return `var(${option.cssVariable}), ${option.fallbackFamily}`;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function hexToPreviewRgba(hex: string, opacityPercent: number) {
    const normalized = hex.replace(/^#/u, "");
    const safe =
        normalized.length === 6 && /^[0-9a-fA-F]{6}$/u.test(normalized)
            ? normalized
            : "000000";
    const rr = parseInt(safe.slice(0, 2), 16);
    const gg = parseInt(safe.slice(2, 4), 16);
    const bb = parseInt(safe.slice(4, 6), 16);
    const alpha = Math.min(1, Math.max(0, opacityPercent / 100));
    return `rgba(${rr}, ${gg}, ${bb}, ${alpha})`;
}

function calculatePreviewWordWeights(words: string[]) {
    return words.map((word) => Math.max(1, word.replace(/[^\p{L}\p{N}]/gu, "").length));
}

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

type StoredVideoAsset = {
    _id: string;
    providerId: string;
    storageProvider?: string;
    fileName: string;
    mimeType?: string;
    sizeBytes?: number | null;
    fileSizeBytes?: number;
    metadata?: {
        title?: string;
        description?: string;
        vietnameseTitle?: string;
        vietnameseDescription?: string;
        folder?: string;
        tags?: string[];
        sourceUrl?: string | null;
        originPlatform?: string | null;
        actualQuality?: string | null;
    };
    createdFrom?: {
        storageProviderLabel?: string | null;
    };
    lifecycleState?: string;
    createdAt?: string;
};

type TimedNarrationSegment = {
    id: number;
    start: number;
    end: number;
    text: string;
};

type VideoNarratorPanelProps = {
    section: LeftbarNavItem;
};

type AssetPreviewState = {
    assetId: string;
    src: string;
};

const SESSION_STORAGE_KEY = "omnivideo.videoNarratorSession.v1";

export function VideoNarratorPanel({ section }: VideoNarratorPanelProps) {
    const [file, setFile] = useState<File | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");
    const [assetPreview, setAssetPreview] = useState<AssetPreviewState | null>(
        null,
    );
    const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([]);
    const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState("env-gemini");
    const [selectedModel, setSelectedModel] = useState("");
    const [prompt, setPrompt] = useState(
        "Xem video này và viết một kịch bản thuyết minh ngắn bằng tiếng Việt. Hãy mô tả sinh động sự kiện đang xảy ra từng bước, dí dỏm và thú vị để giữ chân người xem. Phân chia kịch bản thành các phân đoạn tương ứng với các mốc thời gian trong video.",
    );

    // Piper settings
    const [ttsBinaryPath, setTtsBinaryPath] = useState("piper");
    const [ttsModelPath, setTtsModelPath] = useState("");
    const [ttsConfigPath, setTtsConfigPath] = useState("");
    const [ttsSpeaker, setTtsSpeaker] = useState(0);
    const [ttsLengthScale, setTtsLengthScale] = useState(1.0);
    const [ttsNoiseScale, setTtsNoiseScale] = useState(0.667);
    const [ttsNoiseW, setTtsNoiseW] = useState(0.8);
    const [ttsSentenceSilence, setTtsSentenceSilence] = useState(0.2);
    const [ttsPreserveTimestampGaps, setTtsPreserveTimestampGaps] =
        useState(true);

    // Audio mixing
    const [originalAudioVolume, setOriginalAudioVolume] = useState(0.1);
    const [voiceVolume, setVoiceVolume] = useState(1.0);
    const [subtitleMode, setSubtitleMode] =
        useState<SubtitleDisplayMode>("standard");
    const [subtitleFontFamily, setSubtitleFontFamily] = useState("Bangers");
    const [subtitleFontSize, setSubtitleFontSize] = useState(
        DEFAULT_SUBTITLE_FONT_SIZE,
    );
    const [subtitleTextColor, setSubtitleTextColor] = useState("#FFFFCC");
    const [subtitleMarginBottom, setSubtitleMarginBottom] = useState(
        DEFAULT_SUBTITLE_MARGIN_BOTTOM,
    );
    const [subtitleMarginLeft, setSubtitleMarginLeft] = useState(60);
    const [subtitleMarginRight, setSubtitleMarginRight] = useState(60);
    const [subtitleAlignment, setSubtitleAlignment] = useState(2);
    const [subtitleBackgroundEnabled, setSubtitleBackgroundEnabled] =
        useState(true);
    const [subtitleBackgroundColor, setSubtitleBackgroundColor] =
        useState("#000000");
    const [subtitleBackgroundOpacity, setSubtitleBackgroundOpacity] =
        useState(0);
    const [subtitleBackgroundPaddingY, setSubtitleBackgroundPaddingY] =
        useState(2);

    // State management
    const [segments, setSegments] = useState<TimedNarrationSegment[]>([]);
    const [executionMode, setExecutionMode] = useState<"local" | "remote">(
        "local",
    );
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [renderProgress, setRenderProgress] = useState("");
    const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(
        null,
    );
    const [renderedVideoName, setRenderedVideoName] = useState<string | null>(
        null,
    );
    const [error, setError] = useState<string | null>(null);
    const [previewCurrentTime, setPreviewCurrentTime] = useState(0);

    // UI Toggles
    const [showTtsSettings, setShowTtsSettings] = useState(false);
    const [showAudioSettings, setShowAudioSettings] = useState(true);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);

    const videoPreviewRef = useRef<HTMLVideoElement | null>(null);

    // Load assets and providers
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
                        const defaultId = resolveDefaultAiProviderId(active);
                        setSelectedProviderId(defaultId || active[0]._id);
                    }
                }
            })
            .catch(() => {});

        fetch("/api/storage/assets?limit=100")
            .then((res) => res.json())
            .then((payload: { ok: boolean; data?: StoredVideoAsset[] }) => {
                if (payload.ok && payload.data) {
                    setAssets(payload.data);
                }
            })
            .catch(() => {});
    }, []);

    // Load session
    useEffect(() => {
        const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.selectedProviderId)
                    setSelectedProviderId(parsed.selectedProviderId);
                if (parsed.selectedModel)
                    setSelectedModel(parsed.selectedModel);
                if (parsed.prompt) setPrompt(parsed.prompt);
                if (parsed.selectedAssetId)
                    setSelectedAssetId(parsed.selectedAssetId);
                if (parsed.segments) setSegments(parsed.segments);
                if (parsed.originalAudioVolume !== undefined)
                    setOriginalAudioVolume(parsed.originalAudioVolume);
                if (parsed.voiceVolume !== undefined)
                    setVoiceVolume(parsed.voiceVolume);
                if (parsed.executionMode)
                    setExecutionMode(parsed.executionMode);
                if (parsed.subtitleMode) setSubtitleMode(parsed.subtitleMode);
                if (parsed.subtitleFontFamily)
                    setSubtitleFontFamily(parsed.subtitleFontFamily);
                if (parsed.subtitleFontSize !== undefined)
                    setSubtitleFontSize(parsed.subtitleFontSize);
                if (parsed.subtitleTextColor)
                    setSubtitleTextColor(parsed.subtitleTextColor);
                if (parsed.subtitleMarginBottom !== undefined)
                    setSubtitleMarginBottom(parsed.subtitleMarginBottom);
                if (parsed.subtitleMarginLeft !== undefined)
                    setSubtitleMarginLeft(parsed.subtitleMarginLeft);
                if (parsed.subtitleMarginRight !== undefined)
                    setSubtitleMarginRight(parsed.subtitleMarginRight);
                if (parsed.subtitleAlignment !== undefined)
                    setSubtitleAlignment(parsed.subtitleAlignment);
                if (parsed.subtitleBackgroundEnabled !== undefined)
                    setSubtitleBackgroundEnabled(
                        parsed.subtitleBackgroundEnabled,
                    );
                if (parsed.subtitleBackgroundColor)
                    setSubtitleBackgroundColor(parsed.subtitleBackgroundColor);
                if (parsed.subtitleBackgroundOpacity !== undefined)
                    setSubtitleBackgroundOpacity(
                        parsed.subtitleBackgroundOpacity,
                    );
                if (parsed.subtitleBackgroundPaddingY !== undefined)
                    setSubtitleBackgroundPaddingY(
                        parsed.subtitleBackgroundPaddingY,
                    );
            } catch {}
        }
        setIsHydrated(true);
    }, []);

    // Save session
    useEffect(() => {
        if (!isHydrated) return;
        window.localStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
                selectedProviderId,
                selectedModel,
                prompt,
                selectedAssetId,
                segments,
                originalAudioVolume,
                voiceVolume,
                executionMode,
                subtitleMode,
                subtitleFontFamily,
                subtitleFontSize,
                subtitleTextColor,
                subtitleMarginBottom,
                subtitleMarginLeft,
                subtitleMarginRight,
                subtitleAlignment,
                subtitleBackgroundEnabled,
                subtitleBackgroundColor,
                subtitleBackgroundOpacity,
                subtitleBackgroundPaddingY,
            }),
        );
    }, [
        isHydrated,
        selectedProviderId,
        selectedModel,
        prompt,
        selectedAssetId,
        segments,
        originalAudioVolume,
        voiceVolume,
        executionMode,
        subtitleMode,
        subtitleFontFamily,
        subtitleFontSize,
        subtitleTextColor,
        subtitleMarginBottom,
        subtitleMarginLeft,
        subtitleMarginRight,
        subtitleAlignment,
        subtitleBackgroundEnabled,
        subtitleBackgroundColor,
        subtitleBackgroundOpacity,
        subtitleBackgroundPaddingY,
    ]);

    // Fetch models on provider change
    const fetchModels = async (providerId: string) => {
        if (!providerId) {
            setAiModels([]);
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
                    const hasDefault = payload.data.find(
                        (m) => m.id === "gemini-1.5-flash",
                    );
                    setSelectedModel(
                        hasDefault ? hasDefault.id : payload.data[0].id,
                    );
                }
            }
        } catch {
            setAiModels([]);
        } finally {
            setIsLoadingModels(false);
        }
    };

    useEffect(() => {
        if (selectedProviderId) {
            fetchModels(selectedProviderId);
        }
    }, [selectedProviderId]);

    const selectedAsset = useMemo(() => {
        return assets.find((asset) => asset._id === selectedAssetId);
    }, [assets, selectedAssetId]);

    const subtitleVerticalPercent = useMemo(
        () => marginBottomToVerticalPercent(subtitleMarginBottom),
        [subtitleMarginBottom],
    );

    const visibleAssets = useMemo(
        () =>
            assets.filter((asset) =>
                matchesVideoAssetSearch(asset, assetSearchQuery),
            ),
        [assets, assetSearchQuery],
    );

    const subtitlePreviewStyle = useMemo(() => {
        const isLeftAligned = [1, 4, 7].includes(subtitleAlignment);
        const isRightAligned = [3, 6, 9].includes(subtitleAlignment);
        return {
            bottom: `${subtitleVerticalPercent}%`,
            left: isLeftAligned ? "8%" : isRightAligned ? "auto" : "50%",
            right: isRightAligned ? "8%" : "auto",
            transform:
                isLeftAligned || isRightAligned ? "none" : "translateX(-50%)",
            color:
                subtitleMode === "triple-word-highlight"
                    ? DEFAULT_SUBTITLE_TEXT_COLOR
                    : subtitleTextColor,
            fontFamily: getVideoTextFontFamily(subtitleFontFamily),
            fontSize: `${Math.max(18, Math.round(subtitleFontSize * 0.42))}px`,
            backgroundColor: subtitleBackgroundEnabled
                ? hexToPreviewRgba(
                      subtitleBackgroundColor,
                      subtitleBackgroundOpacity,
                  )
                : "transparent",
            padding: subtitleBackgroundEnabled
                ? `${Math.max(2, subtitleBackgroundPaddingY)}px 14px`
                : "0",
        };
    }, [
        subtitleAlignment,
        subtitleBackgroundColor,
        subtitleBackgroundEnabled,
        subtitleBackgroundOpacity,
        subtitleBackgroundPaddingY,
        subtitleFontFamily,
        subtitleFontSize,
        subtitleMode,
        subtitleTextColor,
        subtitleVerticalPercent,
    ]);

    const subtitlePreviewTokens = useMemo(() => {
        const activeSegment =
            segments.find(
                (segment) =>
                    previewCurrentTime >= segment.start &&
                    previewCurrentTime <= segment.end,
            ) ?? segments[0];
        if (!activeSegment?.text.trim()) {
            return [{ text: "Sample subtitle", active: false }];
        }
        const words = activeSegment.text
            .toLocaleUpperCase("vi-VN")
            .split(/\s+/u)
            .filter(Boolean);
        if (words.length === 0) {
            return [{ text: "Sample subtitle", active: false }];
        }
        if (subtitleMode === "standard" || words.length === 1) {
            return [{ text: words.join(" "), active: false }];
        }

        const duration = Math.max(0.01, activeSegment.end - activeSegment.start);
        const elapsed = Math.min(
            duration,
            Math.max(0, previewCurrentTime - activeSegment.start),
        );
        const weights = calculatePreviewWordWeights(words);
        const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
        let cursor = 0;
        let activeIndex = words.length - 1;
        for (let index = 0; index < words.length; index += 1) {
            const wordDuration = duration * (weights[index] / totalWeight);
            if (elapsed <= cursor + wordDuration || index === words.length - 1) {
                activeIndex = index;
                break;
            }
            cursor += wordDuration;
        }

        if (subtitleMode === "word-reveal") {
            return words
                .slice(0, activeIndex + 1)
                .map((word) => ({ text: word, active: false }));
        }

        if (
            subtitleMode === "karaoke" ||
            subtitleMode === "triple-word-highlight"
        ) {
            const windowStart =
                subtitleMode === "triple-word-highlight"
                    ? Math.floor(activeIndex / 3) * 3
                    : 0;
            const windowWords =
                subtitleMode === "triple-word-highlight"
                    ? words.slice(windowStart, windowStart + 3)
                    : words;
            return windowWords.map((word, index) => ({
                text: word,
                active: windowStart + index === activeIndex,
            }));
        }

        return [{ text: words.join(" "), active: false }];
    }, [previewCurrentTime, segments, subtitleMode]);

    const effectiveExecutionMode =
        subtitleMode === "triple-word-highlight" ? "local" : executionMode;

    const videoPreviewUrl = useMemo(() => {
        if (file) {
            return URL.createObjectURL(file);
        }
        if (selectedAssetId) {
            return `/api/storage/assets/${selectedAssetId}/download?disposition=inline`;
        }
        return null;
    }, [file, selectedAssetId]);

    const runScriptGeneration = async () => {
        if (!file && !selectedAssetId) {
            setError("Vui lòng tải lên video hoặc chọn từ Storage Library.");
            return;
        }

        setIsGeneratingScript(true);
        setError(null);
        setSegments([]);

        const progressTaskId = startProgressTask({
            title: "Gemini Video Understanding",
            description: "Uploading video and generating narration script...",
            scope: "system",
            progress: 15,
        });

        try {
            const formData = new FormData();
            if (file) {
                formData.set("videoFile", file);
            } else {
                formData.set("assetId", selectedAssetId);
            }
            formData.set("providerId", selectedProviderId);
            formData.set("model", selectedModel);
            formData.set("prompt", prompt.trim());

            updateProgressTask(progressTaskId, {
                description: "Gemini is analyzing video details...",
                progress: 60,
            });

            const response = await fetch("/api/audio/video-narrator", {
                method: "POST",
                body: formData,
            });

            const payload = await response.json();

            if (!payload.ok) {
                throw new Error(
                    payload.error || "Không thể sinh kịch bản thuyết minh.",
                );
            }

            setSegments(payload.data.segments);

            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Tạo kịch bản thuyết minh thành công.",
            });
        } catch (err) {
            const errMsg =
                err instanceof Error
                    ? err.message
                    : "Đã xảy ra lỗi không xác định.";
            setError(errMsg);
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Không thể sinh kịch bản.",
                error: errMsg,
            });
        } finally {
            setIsGeneratingScript(false);
        }
    };

    const runVideoRender = async () => {
        if (segments.length === 0) {
            setError("Vui lòng sinh kịch bản trước khi lồng tiếng.");
            return;
        }

        setIsRendering(true);
        setError(null);
        setRenderedVideoUrl(null);
        setRenderProgress("Đang chuẩn bị video lồng tiếng...");

        const progressTaskId = startProgressTask({
            title: "Dựng video thuyết minh",
            description: "Đang tổng hợp Piper voice và xử lý FFmpeg render...",
            scope: "system",
            progress: 10,
        });

        try {
            const formData = new FormData();
            if (file) {
                formData.set("videoFile", file);
            } else {
                formData.set("assetId", selectedAssetId);
            }

            formData.set("segmentsJson", JSON.stringify(segments));
            formData.set("executionMode", effectiveExecutionMode);
            formData.set("originalAudioVolume", String(originalAudioVolume));
            formData.set("voiceVolume", String(voiceVolume));
            formData.set("subtitleMode", subtitleMode);
            formData.set("subtitleFontFamily", subtitleFontFamily);
            formData.set("subtitleFontSize", String(subtitleFontSize));
            formData.set("subtitleTextColor", subtitleTextColor);
            formData.set("subtitleMarginBottom", String(subtitleMarginBottom));
            formData.set("subtitleMarginLeft", String(subtitleMarginLeft));
            formData.set("subtitleMarginRight", String(subtitleMarginRight));
            formData.set("subtitleAlignment", String(subtitleAlignment));
            formData.set(
                "subtitleBackgroundEnabled",
                String(subtitleBackgroundEnabled),
            );
            formData.set("subtitleBackgroundColor", subtitleBackgroundColor);
            formData.set(
                "subtitleBackgroundOpacity",
                String(subtitleBackgroundOpacity),
            );
            formData.set(
                "subtitleBackgroundPaddingY",
                String(subtitleBackgroundPaddingY),
            );

            // Piper configurations
            formData.set("ttsBinaryPath", ttsBinaryPath);
            formData.set("ttsModelPath", ttsModelPath);
            formData.set("ttsConfigPath", ttsConfigPath);
            formData.set("ttsSpeaker", String(ttsSpeaker));
            formData.set("ttsLengthScale", String(ttsLengthScale));
            formData.set("ttsNoiseScale", String(ttsNoiseScale));
            formData.set("ttsNoiseW", String(ttsNoiseW));
            formData.set("ttsSentenceSilence", String(ttsSentenceSilence));
            formData.set(
                "ttsPreserveTimestampGaps",
                String(ttsPreserveTimestampGaps),
            );

            // Remote configurations
            if (executionMode === "remote") {
                const remoteConfig = readRemoteVipWorkerBrowserConfig();
                if (!remoteConfig.endpoint) {
                    throw new Error(
                        "Địa chỉ EC2 worker chưa được cấu hình. Vui lòng thiết lập ở mục Server.",
                    );
                }
                formData.set("remoteEndpoint", remoteConfig.endpoint);
                formData.set("remoteToken", remoteConfig.token);
            }

            const response = await fetch("/api/audio/video-narrator", {
                method: "POST",
                body: formData,
            });

            const payload = await response.json();

            if (!payload.ok) {
                throw new Error(
                    payload.error || "Dựng video lồng tiếng thất bại.",
                );
            }

            if (payload.data.videoBase64) {
                setRenderedVideoUrl(
                    `data:video/mp4;base64,${payload.data.videoBase64}`,
                );
            } else if (payload.data.artifactId) {
                setRenderedVideoUrl(
                    `/api/workspace/artifacts/${payload.data.artifactId}/download`,
                );
            } else {
                setRenderedVideoUrl(null);
            }
            setRenderedVideoName(payload.data.fileName || "output.mp4");

            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Đã dựng xong video thuyết minh.",
            });
        } catch (err) {
            const errMsg =
                err instanceof Error ? err.message : "Dựng video thất bại.";
            setError(errMsg);
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Dựng video thất bại.",
                error: errMsg,
            });
        } finally {
            setIsRendering(false);
            setRenderProgress("");
        }
    };

    const playSegment = (start: number) => {
        if (videoPreviewRef.current) {
            videoPreviewRef.current.currentTime = start;
            videoPreviewRef.current.play().catch(() => {});
        }
    };

    const addSegment = () => {
        const newSeg: TimedNarrationSegment = {
            id:
                segments.length > 0
                    ? Math.max(...segments.map((s) => s.id)) + 1
                    : 0,
            start: segments.length > 0 ? segments[segments.length - 1].end : 0,
            end:
                segments.length > 0 ? segments[segments.length - 1].end + 5 : 5,
            text: "Đoạn thuyết minh mới",
        };
        setSegments([...segments, newSeg]);
    };

    const deleteSegment = (id: number) => {
        setSegments(segments.filter((s) => s.id !== id));
    };

    const updateSegment = (
        id: number,
        field: keyof TimedNarrationSegment,
        val: string | number,
    ) => {
        setSegments(
            segments.map((s) => {
                if (s.id === id) {
                    return { ...s, [field]: val };
                }
                return s;
            }),
        );
    };

    return (
        <section className="w-full max-w-none border border-main bg-main">
            {error ? (
                <div className="m-5 mb-0 flex items-start gap-3 border border-red-500/30 bg-red-500/5 px-4 py-3 text-xs text-red-500">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    <div>
                        <p className="font-semibold">Đã xảy ra lỗi:</p>
                        <p className="mt-0.5">{error}</p>
                    </div>
                </div>
            ) : null}

            <div className="grid w-full gap-4 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                {/* Left controls */}
                <aside className="space-y-3">
                    {/* Source Selection */}
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Source Video
                            </p>
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video file
                            </span>
                            <input
                                type="file"
                                accept="video/*,.mp4,.webm,.mov"
                                disabled={isGeneratingScript || isRendering}
                                onChange={(event) => {
                                    const selected =
                                        event.currentTarget.files?.[0] ?? null;
                                    setFile(selected);
                                    if (selected) {
                                        setSelectedAssetId("");
                                        setShowAssetPicker(false);
                                        setAssetPreview(null);
                                    }
                                }}
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        {file ? (
                            <p className="mt-2 truncate text-[11px] text-muted">
                                {file.name} · {formatBytes(file.size)}
                            </p>
                        ) : null}
                        <div className="mt-3">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video Asset
                            </span>
                            <button
                                type="button"
                                disabled={isGeneratingScript || isRendering}
                                onClick={() =>
                                    setShowAssetPicker((previous) => !previous)
                                }
                                className="flex w-full items-center justify-between border border-main bg-main px-3 py-2 text-left text-[12px] text-main disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <span className="truncate">
                                    {selectedAsset?.metadata?.title ??
                                        selectedAsset?.fileName ??
                                        selectedAsset?._id ??
                                        "Select asset"}
                                </span>
                                <span className="ml-2 text-[11px] text-muted">
                                    {showAssetPicker ? "Close" : "Browse"}
                                </span>
                            </button>
                            {showAssetPicker ? (
                                <div className="mt-2 max-h-56 overflow-y-auto border border-main bg-main">
                                    <div className="border-b border-main p-2">
                                        <input
                                            value={assetSearchQuery}
                                            disabled={
                                                isGeneratingScript ||
                                                isRendering
                                            }
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
                                                const isPreviewing =
                                                    assetPreview?.assetId ===
                                                    asset._id;
                                                return (
                                                    <div
                                                        key={asset._id}
                                                        className={`w-full border p-2 text-left ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main hover:bg-secondary/20"}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    isGeneratingScript ||
                                                                    isRendering
                                                                }
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
                                                                    setAssetPreview(
                                                                        null,
                                                                    );
                                                                }}
                                                                className="min-w-0 flex-1 text-left hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                                                            >
                                                                <p className="truncate text-[12px] font-semibold text-main">
                                                                    {asset
                                                                        .metadata
                                                                        ?.title ??
                                                                        asset.fileName ??
                                                                        asset._id}
                                                                </p>
                                                                <p className="mt-1 truncate text-[10px] text-muted">
                                                                    {[
                                                                        getAssetFolderName(
                                                                            asset,
                                                                        ),
                                                                        ...(asset
                                                                            .metadata
                                                                            ?.tags ??
                                                                            []),
                                                                        asset
                                                                            .createdFrom
                                                                            ?.storageProviderLabel ??
                                                                            asset.storageProvider ??
                                                                            asset.providerId,
                                                                        formatBytes(
                                                                            asset.sizeBytes ??
                                                                                asset.fileSizeBytes ??
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
                                                                <div className="mt-1">
                                                                    <AssetLifecycleBadges
                                                                        tags={
                                                                            asset
                                                                                .metadata
                                                                                ?.tags
                                                                        }
                                                                        wrap
                                                                    />
                                                                </div>
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
                                                                disabled={
                                                                    isGeneratingScript ||
                                                                    isRendering
                                                                }
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
                                                                className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
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

                    {/* AI & Prompts */}
                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Narration Script
                        </p>

                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                AI Provider
                            </span>
                            <select
                                value={selectedProviderId}
                                disabled={isGeneratingScript || isRendering}
                                onChange={(event) =>
                                    setSelectedProviderId(
                                        event.currentTarget.value,
                                    )
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                            >
                                <option value="env-gemini">
                                    -- Dùng env key (Gemini) --
                                </option>
                                {aiProviders.map((prov) => (
                                    <option key={prov._id} value={prov._id}>
                                        {prov.label} ({prov.providerType})
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                AI Model
                            </span>
                            {isLoadingModels ? (
                                <div className="flex items-center gap-1.5 text-xs text-muted py-1">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Đang tải danh sách model...</span>
                                </div>
                            ) : (
                                <select
                                    value={selectedModel}
                                    disabled={isGeneratingScript || isRendering}
                                    onChange={(event) =>
                                        setSelectedModel(
                                            event.currentTarget.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                >
                                    <option value="gemini-1.5-flash">
                                        Gemini 1.5 Flash
                                    </option>
                                    <option value="gemini-1.5-pro">
                                        Gemini 1.5 Pro
                                    </option>
                                    <option value="gemini-2.0-flash">
                                        Gemini 2.0 Flash
                                    </option>
                                    <option value="gemini-2.5-flash">
                                        Gemini 2.5 Flash
                                    </option>
                                    {aiModels
                                        .filter(
                                            (m) =>
                                                ![
                                                    "gemini-1.5-flash",
                                                    "gemini-1.5-pro",
                                                    "gemini-2.0-flash",
                                                    "gemini-2.5-flash",
                                                ].includes(m.id),
                                        )
                                        .map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.name}
                                            </option>
                                        ))}
                                </select>
                            )}
                        </label>

                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Narration Prompt
                            </span>
                            <textarea
                                value={prompt}
                                disabled={isGeneratingScript || isRendering}
                                onChange={(event) =>
                                    setPrompt(event.currentTarget.value)
                                }
                                rows={4}
                                className="w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main placeholder:text-muted/60"
                                placeholder="Gợi ý nội dung để Gemini viết kịch bản thuyết minh..."
                            />
                        </label>

                        <button
                            onClick={runScriptGeneration}
                            disabled={isGeneratingScript || isRendering}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isGeneratingScript ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Đang phân tích video...</span>
                                </>
                            ) : (
                                <>
                                    <span>Generate Script</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* Piper TTS Settings */}
                    <div className="border border-main bg-secondary/20">
                        <button
                            onClick={() => setShowTtsSettings(!showTtsSettings)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                            <span className="text-[12px] font-semibold text-main">
                                Piper Voice
                            </span>
                            {showTtsSettings ? (
                                <ChevronUp className="h-4 w-4 text-muted" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted" />
                            )}
                        </button>

                        {showTtsSettings ? (
                            <div className="border-t border-main p-4 space-y-3">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Piper executable
                                    </span>
                                    <input
                                        type="text"
                                        value={ttsBinaryPath}
                                        onChange={(e) =>
                                            setTtsBinaryPath(e.target.value)
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Model ONNX path (trống = auto)
                                    </span>
                                    <input
                                        type="text"
                                        value={ttsModelPath}
                                        onChange={(e) =>
                                            setTtsModelPath(e.target.value)
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        placeholder="auto: model.onnx"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Speaker ID
                                        </span>
                                        <input
                                            type="number"
                                            value={ttsSpeaker}
                                            onChange={(e) =>
                                                setTtsSpeaker(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Speed (Length scale)
                                        </span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            value={ttsLengthScale}
                                            onChange={(e) =>
                                                setTtsLengthScale(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Audio mixing & Render settings */}
                    <div className="border border-main bg-secondary/20">
                        <button
                            onClick={() =>
                                setShowAudioSettings(!showAudioSettings)
                            }
                            className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                            <span className="text-[12px] font-semibold text-main">
                                Render Settings
                            </span>
                            {showAudioSettings ? (
                                <ChevronUp className="h-4 w-4 text-muted" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted" />
                            )}
                        </button>

                        {showAudioSettings ? (
                            <div className="border-t border-main p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Original Volume
                                        </span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="1"
                                            value={originalAudioVolume}
                                            onChange={(e) =>
                                                setOriginalAudioVolume(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Voice Volume
                                        </span>
                                        <input
                                            type="number"
                                            step="0.05"
                                            min="0"
                                            max="2"
                                            value={voiceVolume}
                                            onChange={(e) =>
                                                setVoiceVolume(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Subtitle Mode
                                    </span>
                                    <select
                                        value={subtitleMode}
                                        disabled={
                                            isGeneratingScript || isRendering
                                        }
                                        onChange={(event) =>
                                            setSubtitleMode(
                                                event.currentTarget
                                                    .value as SubtitleDisplayMode,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    >
                                        <option value="standard">
                                            Standard
                                        </option>
                                        <option value="word-reveal">
                                            Word Reveal
                                        </option>
                                        <option value="karaoke">Karaoke</option>
                                        <option value="triple-word-highlight">
                                            3-word active highlight
                                        </option>
                                    </select>
                                </label>

                                <div className="space-y-3 border border-main bg-main p-3">
                                    <div className="border-b border-main pb-2">
                                        <p className="text-[11px] font-semibold text-main">
                                            Subtitle controls
                                        </p>
                                        <p className="mt-0.5 text-[10px] leading-4 text-muted">
                                            Preview is shown directly on Source
                                            Preview.
                                        </p>
                                    </div>

                                    {/* Row 1: Font & Size */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Font
                                            </span>
                                            <select
                                                value={subtitleFontFamily}
                                                disabled={
                                                    isGeneratingScript ||
                                                    isRendering
                                                }
                                                onChange={(event) =>
                                                    setSubtitleFontFamily(
                                                        event.currentTarget
                                                            .value,
                                                    )
                                                }
                                                style={{
                                                    fontFamily:
                                                        getVideoTextFontFamily(
                                                            subtitleFontFamily,
                                                        ),
                                                }}
                                                className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                            >
                                                {VIDEO_TEXT_FONT_OPTIONS.map(
                                                    (option) => (
                                                        <option
                                                            key={option.value}
                                                            value={option.value}
                                                            style={{
                                                                fontFamily: `var(${option.cssVariable}), ${option.fallbackFamily}`,
                                                            }}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Size
                                            </span>
                                            <input
                                                type="number"
                                                min={20}
                                                max={160}
                                                value={subtitleFontSize}
                                                disabled={
                                                    isGeneratingScript ||
                                                    isRendering
                                                }
                                                onChange={(event) =>
                                                    setSubtitleFontSize(
                                                        Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    )
                                                }
                                                className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                            />
                                        </label>
                                    </div>

                                    {/* Row 2: Text color & Vertical placement */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Text color
                                            </span>
                                            <div className="flex gap-2">
                                                <input
                                                    type="color"
                                                    value={
                                                        subtitleTextColor.startsWith(
                                                            "#",
                                                        )
                                                            ? subtitleTextColor
                                                            : "#FFFFCC"
                                                    }
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleTextColor(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    className="h-[29px] w-10 border border-main bg-secondary/30 cursor-pointer rounded-sm"
                                                />
                                                <select
                                                    value={subtitleTextColor}
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleTextColor(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    className="flex-1 border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                                >
                                                    {SUBTITLE_TEXT_COLOR_OPTIONS.map(
                                                        (option) => (
                                                            <option
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </option>
                                                        ),
                                                    )}
                                                    {!SUBTITLE_TEXT_COLOR_OPTIONS.some(
                                                        (opt) =>
                                                            opt.value ===
                                                            subtitleTextColor,
                                                    ) && (
                                                        <option
                                                            value={
                                                                subtitleTextColor
                                                            }
                                                        >
                                                            Custom
                                                        </option>
                                                    )}
                                                </select>
                                            </div>
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Vertical %
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={60}
                                                value={subtitleVerticalPercent}
                                                disabled={
                                                    isGeneratingScript ||
                                                    isRendering
                                                }
                                                onChange={(event) =>
                                                    setSubtitleMarginBottom(
                                                        verticalPercentToMarginBottom(
                                                            Number(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            ),
                                                        ),
                                                    )
                                                }
                                                className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                            />
                                        </label>
                                    </div>

                                    {/* Row 3: Horizontal position */}
                                    <div>
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Horizontal position
                                        </span>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {(
                                                [
                                                    [1, "Left"],
                                                    [2, "Center"],
                                                    [3, "Right"],
                                                ] as const
                                            ).map(([value, label]) => (
                                                <button
                                                    key={value}
                                                    type="button"
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onClick={() => {
                                                        setSubtitleAlignment(
                                                            value,
                                                        );
                                                        setSubtitleMarginLeft(
                                                            60,
                                                        );
                                                        setSubtitleMarginRight(
                                                            60,
                                                        );
                                                    }}
                                                    className={`border px-2 py-1.5 text-[11px] font-semibold ${
                                                        subtitleAlignment ===
                                                        value
                                                            ? "border-accent bg-accent/10 text-accent"
                                                            : "border-main bg-secondary/30 text-main hover:bg-secondary"
                                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                                >
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Row 4: Background Enable Toggle */}
                                    <div>
                                        <label className="flex items-center justify-between gap-3 border border-main bg-secondary/20 px-3 py-2 rounded-sm cursor-pointer hover:bg-secondary/30 transition-colors">
                                                <span className="text-[10px] font-semibold text-muted">
                                                    Background
                                                </span>
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        subtitleBackgroundEnabled
                                                    }
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleBackgroundEnabled(
                                                            event.currentTarget
                                                                .checked,
                                                        )
                                                    }
                                                    className="h-4 w-4 accent-[var(--color-accent)] cursor-pointer"
                                                />
                                            </label>
                                    </div>

                                    {/* Conditional Row 5: Background configurations */}
                                    {subtitleBackgroundEnabled && (
                                        <div className="grid grid-cols-3 gap-2 border-t border-main/30 pt-3 mt-1 animate-fadeIn">
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    BG color
                                                </span>
                                                <select
                                                    value={
                                                        subtitleBackgroundColor
                                                    }
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleBackgroundColor(
                                                            event.currentTarget
                                                                .value,
                                                        )
                                                    }
                                                    className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                                >
                                                    {SUBTITLE_BACKGROUND_COLOR_OPTIONS.map(
                                                        (option) => (
                                                            <option
                                                                key={
                                                                    option.value
                                                                }
                                                                value={
                                                                    option.value
                                                                }
                                                            >
                                                                {option.label}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Opacity %
                                                </span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={100}
                                                    value={
                                                        subtitleBackgroundOpacity
                                                    }
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleBackgroundOpacity(
                                                            Number(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Padding Y
                                                </span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={24}
                                                    value={
                                                        subtitleBackgroundPaddingY
                                                    }
                                                    disabled={
                                                        isGeneratingScript ||
                                                        isRendering
                                                    }
                                                    onChange={(event) =>
                                                        setSubtitleBackgroundPaddingY(
                                                            Number(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                    className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent"
                                                />
                                            </label>
                                        </div>
                                    )}
                                </div>

                                <div className="border-main/50 pt-3">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Worker
                                    </span>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-1.5 text-xs text-main cursor-pointer">
                                            <input
                                                type="radio"
                                                name="executionMode"
                                                value="local"
                                                checked={
                                                    executionMode === "local"
                                                }
                                                onChange={() =>
                                                    setExecutionMode("local")
                                                }
                                                className="accent-[var(--color-accent)]"
                                            />
                                            <span>Local</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-main cursor-pointer">
                                            <input
                                                type="radio"
                                                name="executionMode"
                                                value="remote"
                                                checked={
                                                    executionMode === "remote"
                                                }
                                                onChange={() =>
                                                    setExecutionMode("remote")
                                                }
                                                className="accent-[var(--color-accent)]"
                                            />
                                            <span>EC2 Spot Worker</span>
                                        </label>
                                    </div>
                                    {executionMode === "remote" &&
                                    effectiveExecutionMode === "local" ? (
                                        <p className="mt-2 border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] leading-4 text-amber-700">
                                            3-word active highlight uses local
                                            render so subtitle styling matches
                                            the preview.
                                        </p>
                                    ) : null}
                                </div>

                                <button
                                    onClick={runVideoRender}
                                    disabled={
                                        isGeneratingScript ||
                                        isRendering ||
                                        segments.length === 0
                                    }
                                    className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isRendering ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            <span>
                                                {renderProgress ||
                                                    "Đang dựng..."}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Render Narrated Video</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : null}
                    </div>
                </aside>

                {/* Right Workspace (Editor + Previews) */}
                <div className="space-y-4">
                    {/* Video Previews */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {/* Original Video */}
                        <div className="overflow-hidden border border-main bg-secondary/20">
                            <p className="border-b border-main bg-secondary/30 px-4 py-2 text-[12px] font-semibold text-main">
                                Source Preview
                            </p>
                            {videoPreviewUrl ? (
                                <div className="relative flex min-h-80 w-full bg-black">
                                    <video
                                        ref={videoPreviewRef}
                                        src={videoPreviewUrl}
                                        controls
                                        preload="metadata"
                                        onTimeUpdate={(event) =>
                                            setPreviewCurrentTime(
                                                event.currentTarget.currentTime,
                                            )
                                        }
                                        onSeeked={(event) =>
                                            setPreviewCurrentTime(
                                                event.currentTarget.currentTime,
                                            )
                                        }
                                        className="block h-full min-h-80 w-full bg-black object-contain"
                                    />
                                    <div
                                        className="pointer-events-none absolute max-w-[84%] text-center font-semibold leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
                                        style={subtitlePreviewStyle}
                                    >
                                        {subtitlePreviewTokens.map(
                                            (token, index) => (
                                                <span
                                                    key={`${token.text}-${index}`}
                                                    style={{
                                                        color: token.active
                                                            ? subtitleTextColor
                                                            : undefined,
                                                    }}
                                                >
                                                    {index > 0 ? " " : ""}
                                                    {token.text}
                                                </span>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-80 items-center justify-center bg-main text-[11px] text-muted">
                                    No source video selected.
                                </div>
                            )}
                        </div>

                        {/* Rendered Video */}
                        <div className="overflow-hidden border border-main bg-secondary/20">
                            <p className="border-b border-main bg-secondary/30 px-4 py-2 text-[12px] font-semibold text-main">
                                Render Output
                            </p>
                            {renderedVideoUrl ? (
                                <div className="bg-black">
                                    <video
                                        src={renderedVideoUrl}
                                        controls
                                        preload="metadata"
                                        className="block h-full min-h-80 w-full bg-black object-contain"
                                    />
                                    <a
                                        href={renderedVideoUrl}
                                        download={
                                            renderedVideoName || "output.mp4"
                                        }
                                        className="inline-flex w-full items-center justify-center gap-2 border-t border-main bg-main px-3 py-2 text-[12px] font-semibold text-main transition-colors hover:bg-secondary"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        <span>Download Video</span>
                                    </a>
                                </div>
                            ) : (
                                <div className="flex h-80 items-center justify-center bg-main text-[11px] text-muted">
                                    {isRendering
                                        ? "Rendering narrated video..."
                                        : "No rendered output yet."}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Timeline script segments editor */}
                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
                                Narration Timeline ({segments.length})
                            </p>
                            <button
                                onClick={addSegment}
                                className="inline-flex items-center gap-1 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                            >
                                <Plus className="h-3 w-3" />
                                <span>Add Segment</span>
                            </button>
                        </div>

                        {segments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center border border-dashed border-main bg-main py-10 text-[11px] text-muted">
                                <Mic2 className="h-8 w-8 text-muted/50" />
                                <span className="mt-2">
                                    No narration segments yet.
                                </span>
                            </div>
                        ) : (
                            <div className="max-h-[560px] space-y-2 overflow-y-auto">
                                {segments.map((seg) => (
                                    <div
                                        key={seg.id}
                                        className="grid gap-3 border border-main bg-main px-4 py-3 last:border-b-0 md:grid-cols-[200px_minmax(0,1fr)] hover:bg-secondary/10 transition-colors"
                                    >
                                        {/* Left Column: Metadata, timing inputs, play/delete button group */}
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-bold text-main">
                                                    Segment #{seg.id + 1}
                                                </p>
                                                <div className="flex gap-1.5">
                                                    {/* Play button */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            playSegment(
                                                                seg.start,
                                                            )
                                                        }
                                                        className="flex h-5 w-5 items-center justify-center border border-main bg-secondary text-main hover:bg-secondary/80 rounded-sm"
                                                        title="Xem thử video tại phân cảnh này"
                                                    >
                                                        <Play className="h-2.5 w-2.5 fill-main" />
                                                    </button>
                                                    {/* Delete button */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            deleteSegment(
                                                                seg.id,
                                                            )
                                                        }
                                                        className="flex h-5 w-5 items-center justify-center border border-rose-500/20 text-rose-700 hover:bg-rose-500/10 rounded-sm"
                                                        title="Delete segment"
                                                    >
                                                        <Trash2 className="h-2.5 w-2.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <label className="flex flex-1 items-center gap-1">
                                                    <span className="text-[9px] font-semibold text-muted">
                                                        In
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={seg.start}
                                                        disabled={
                                                            isGeneratingScript ||
                                                            isRendering
                                                        }
                                                        onChange={(e) =>
                                                            updateSegment(
                                                                seg.id,
                                                                "start",
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        className="w-full border border-main bg-secondary/30 px-1 py-0.5 text-center text-[10px] text-main rounded-sm focus:outline-none"
                                                    />
                                                </label>
                                                <label className="flex flex-1 items-center gap-1">
                                                    <span className="text-[9px] font-semibold text-muted">
                                                        Out
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.1"
                                                        value={seg.end}
                                                        disabled={
                                                            isGeneratingScript ||
                                                            isRendering
                                                        }
                                                        onChange={(e) =>
                                                            updateSegment(
                                                                seg.id,
                                                                "end",
                                                                Number(
                                                                    e.target
                                                                        .value,
                                                                ),
                                                            )
                                                        }
                                                        className="w-full border border-main bg-secondary/30 px-1 py-0.5 text-center text-[10px] text-main rounded-sm focus:outline-none"
                                                    />
                                                </label>
                                            </div>
                                        </div>

                                        {/* Right Column: Thuyết minh text */}
                                        <div className="flex flex-col justify-center min-w-0">
                                            <textarea
                                                rows={2}
                                                value={seg.text}
                                                disabled={
                                                    isGeneratingScript ||
                                                    isRendering
                                                }
                                                onChange={(e) =>
                                                    updateSegment(
                                                        seg.id,
                                                        "text",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Nhập nội dung thuyết minh cho phân cảnh này..."
                                                className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main rounded-sm focus:outline-none focus:border-accent resize-none min-h-[50px] leading-relaxed"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
