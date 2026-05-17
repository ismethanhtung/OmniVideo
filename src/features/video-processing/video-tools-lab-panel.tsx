"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Captions,
    Clapperboard,
    FlipHorizontal2,
    Loader2,
    Pause,
    Play,
    ScanLine,
    Volume2,
    VolumeX,
    Wand2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    getAssetFolderName,
    matchesVideoAssetSearch,
} from "@/lib/storage/asset-folder";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";

type VideoEditApiPayload =
    | {
          ok: true;
          data: {
              videoBase64: string;
              mimeType: "video/mp4";
              fileName: string;
              byteLength: number;
              generationDurationMs: number;
              transform: {
                  mirror: boolean;
                  partialBlur: boolean;
                  subtitleOverlay: boolean;
                  segmentCount: number;
              };
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type VideoToolsLabPanelProps = {
    section: LeftbarNavItem;
};

type StoredVideoAsset = {
    _id: string;
    sizeBytes?: number | null;
    storageProvider: string;
    metadata?: {
        title?: string | null;
        folder?: string | null;
        tags?: string[] | null;
        originPlatform?: string | null;
        actualQuality?: string | null;
        videoEditSetup?: {
            mirrorEnabled?: boolean;
            blurEnabled?: boolean;
            subtitleOverlayEnabled?: boolean;
            blurRegions?: Array<{
                x: number;
                y: number;
                width: number;
                height: number;
                start: number;
                end: number;
                strength: number;
            }>;
            subtitleFontFamily?: string;
            subtitleFontSize?: number;
            subtitleMarginBottom?: number;
            subtitleMarginLeft?: number;
            subtitleMarginRight?: number;
            subtitleAlignment?: number;
            subtitleBackgroundEnabled?: boolean;
            subtitleBackgroundColor?: string;
            subtitleBackgroundOpacity?: number;
            subtitleSampleWidthPercent?: number;
            subtitlePreviewPlacement?: {
                leftPercent?: number;
                topPercent?: number;
            } | null;
        } | null;
    };
};

type BlurRegionDraft = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    start: number;
    end: number;
    strength: number;
};

type VideoEditSetup = NonNullable<
    NonNullable<StoredVideoAsset["metadata"]>["videoEditSetup"]
>;

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

export function formatPreviewClock(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(
            remainingSeconds,
        ).padStart(2, "0")}`;
    }
    return `${String(minutes).padStart(2, "0")}:${String(
        remainingSeconds,
    ).padStart(2, "0")}`;
}

function hexToRgba(hex: string, opacityPercent: number) {
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

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function InfoCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="border border-main bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div>
                        <p className="text-xs font-semibold text-main">
                            {title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted">
                            {description}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 border border-main bg-main px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Ready
                </span>
            </div>
        </div>
    );
}

export function SourcePreviewControls({
    isPlaying,
    isMuted,
    currentTime,
    duration,
    onTogglePlay,
    onToggleMute,
    onSeek,
}: {
    isPlaying: boolean;
    isMuted: boolean;
    currentTime: number;
    duration: number;
    onTogglePlay: () => void;
    onToggleMute: () => void;
    onSeek: (timeSeconds: number) => void;
}) {
    const safeDuration =
        Number.isFinite(duration) && duration > 0 ? duration : 0;
    const safeTime = clampNumber(currentTime, 0, safeDuration || 0);
    const canSeek = safeDuration > 0;

    return (
        <div className="flex items-center gap-2 border border-main bg-main px-2 py-2">
            <button
                type="button"
                aria-label={isPlaying ? "Pause preview" : "Play preview"}
                onClick={onTogglePlay}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-main bg-secondary text-main hover:bg-secondary/70"
            >
                {isPlaying ? (
                    <Pause className="h-4 w-4" />
                ) : (
                    <Play className="h-4 w-4" />
                )}
            </button>
            <button
                type="button"
                aria-label={isMuted ? "Unmute preview" : "Mute preview"}
                onClick={onToggleMute}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-main bg-secondary text-main hover:bg-secondary/70"
            >
                {isMuted ? (
                    <VolumeX className="h-4 w-4" />
                ) : (
                    <Volume2 className="h-4 w-4" />
                )}
            </button>
            <input
                aria-label="Preview seek"
                type="range"
                min={0}
                max={safeDuration || 0}
                step={0.05}
                value={safeTime}
                disabled={!canSeek}
                onChange={(event) => onSeek(Number(event.currentTarget.value))}
                className="min-w-0 flex-1 accent-[var(--color-accent)] disabled:opacity-50"
            />
            <span className="w-[96px] shrink-0 text-right text-[10px] tabular-nums text-muted">
                {formatPreviewClock(safeTime)} /{" "}
                {formatPreviewClock(safeDuration)}
            </span>
        </div>
    );
}

const sampleTranslatedSegmentsJson = JSON.stringify(
    [
        {
            id: 1,
            start: 0,
            end: 2,
            sourceText: "Hello!",
            translatedText: "Xin chào!",
        },
        {
            id: 2,
            start: 2,
            end: 4,
            sourceText: "This is a short test.",
            translatedText: "Đây là một bài kiểm tra ngắn.",
        },
        {
            id: 3,
            start: 4,
            end: 6,
            sourceText:
                "Subtitle lengths can vary significantly depending on the speaker's pace.",
            translatedText:
                "Độ dài phụ đề có thể thay đổi đáng kể tùy thuộc vào tốc độ của người nói.",
        },
        {
            id: 4,
            start: 6,
            end: 8,
            sourceText: "Yes.",
            translatedText: "Đúng vậy.",
        },
        {
            id: 5,
            start: 8,
            end: 10,
            sourceText: "Can you see the difference in text volume here?",
            translatedText:
                "Bạn có thấy sự khác biệt về lượng văn bản ở đây không?",
        },
    ],
    null,
    2,
);

const ASS_SUBTITLE_OUTLINE = 2;
const SUBTITLE_BACKGROUND_COLOR_OPTIONS = [
    { value: "#000000", label: "Đen" },
    { value: "#FFFFFF", label: "Trắng" },
    { value: "#808080", label: "Xám" },
] as const;

function normalizeSubtitleBackgroundColor(value: string | null | undefined) {
    const normalized = (value || "").trim().toUpperCase();
    return SUBTITLE_BACKGROUND_COLOR_OPTIONS.some(
        (option) => option.value === normalized,
    )
        ? normalized
        : "#000000";
}

function hasSavedVideoEditSetup(asset: StoredVideoAsset | null) {
    return Boolean(asset?.metadata?.videoEditSetup);
}

export function VideoToolsLabPanel({ section }: VideoToolsLabPanelProps) {
    const Icon = section.icon ?? Clapperboard;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetPicker, setShowAssetPicker] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");
    const [mirrorEnabled, setMirrorEnabled] = useState(false);
    const [blurEnabled, setBlurEnabled] = useState(true);
    const [subtitleOverlayEnabled, setSubtitleOverlayEnabled] = useState(true);
    const [blurRegions, setBlurRegions] = useState<BlurRegionDraft[]>([]);
    const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
    const [isDrawingRegion, setIsDrawingRegion] = useState(false);
    const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(
        null,
    );
    const [drawCurrent, setDrawCurrent] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [regionTimeStart, setRegionTimeStart] = useState(0);
    const [regionTimeEnd, setRegionTimeEnd] = useState(36000);
    const [regionStrength, setRegionStrength] = useState(50);
    const [subtitleFontFamily, setSubtitleFontFamily] = useState("Arial");
    const [subtitleFontSize, setSubtitleFontSize] = useState(55);
    const [subtitleMarginBottom, setSubtitleMarginBottom] = useState(150);
    const [subtitleMarginLeft, setSubtitleMarginLeft] = useState(60);
    const [subtitleMarginRight, setSubtitleMarginRight] = useState(60);
    const [subtitleAlignment, setSubtitleAlignment] = useState(2);
    const [subtitleBackgroundEnabled, setSubtitleBackgroundEnabled] =
        useState(true);
    const [subtitleBackgroundColor, setSubtitleBackgroundColor] =
        useState("#000000");
    const [subtitleBackgroundOpacity, setSubtitleBackgroundOpacity] =
        useState(65);
    const [subtitleSampleWidthPercent, setSubtitleSampleWidthPercent] =
        useState(100);
    const [subtitlePreviewPlacement, setSubtitlePreviewPlacement] = useState<{
        leftPercent: number;
        topPercent: number;
    } | null>(null);
    const [videoNaturalSize, setVideoNaturalSize] = useState({
        width: 1920,
        height: 1080,
    });
    const [sourcePreviewPlaying, setSourcePreviewPlaying] = useState(false);
    const [sourcePreviewMuted, setSourcePreviewMuted] = useState(true);
    const [sourcePreviewTime, setSourcePreviewTime] = useState(0);
    const [sourcePreviewDuration, setSourcePreviewDuration] = useState(0);
    const [previewLayoutVersion, setPreviewLayoutVersion] = useState(0);
    const [subtitlePreviewLeftPx, setSubtitlePreviewLeftPx] = useState(120);
    const [subtitlePreviewTopPx, setSubtitlePreviewTopPx] = useState(320);
    const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
    const [subtitleDragOffset, setSubtitleDragOffset] = useState({
        x: 0,
        y: 0,
    });
    const [translatedSegmentsJson, setTranslatedSegmentsJson] = useState("");
    const [isRunningEdit, setIsRunningEdit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [result, setResult] = useState<
        Extract<VideoEditApiPayload, { ok: true }>["data"] | null
    >(null);
    const previewFrameRef = useRef<HTMLDivElement | null>(null);
    const subtitleBoxRef = useRef<HTMLDivElement | null>(null);
    const sourceVideoRef = useRef<HTMLVideoElement | null>(null);
    const subtitlePreviewPosRef = useRef({ left: 120, top: 320 });

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

    const selectedAsset =
        assets.find((asset) => asset._id === selectedAssetId) ?? null;
    const visibleAssets = assets.filter((asset) =>
        matchesVideoAssetSearch(asset, assetSearchQuery),
    );
    const selectedAssetHasSavedSetup = hasSavedVideoEditSetup(selectedAsset);

    const sourceVideoUrl = useMemo(() => {
        if (videoFile) return URL.createObjectURL(videoFile);
        if (selectedAssetId) {
            return `/api/storage/assets/${selectedAssetId}/download?disposition=inline`;
        }
        return null;
    }, [videoFile, selectedAssetId]);

    const editedVideoUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.videoBase64}`;
    }, [result]);

    useEffect(() => {
        return () => {
            if (videoFile && sourceVideoUrl)
                URL.revokeObjectURL(sourceVideoUrl);
        };
    }, [sourceVideoUrl, videoFile]);

    useEffect(() => {
        setSourcePreviewPlaying(false);
        setSourcePreviewTime(0);
        setSourcePreviewDuration(0);
    }, [sourceVideoUrl]);

    const activeRegion =
        blurRegions.find((item) => item.id === activeRegionId) ?? null;

    const applyDefaultSubtitleSetup = useCallback(() => {
        setSubtitleFontFamily("Arial");
        setSubtitleFontSize(55);
        setSubtitleMarginBottom(150);
        setSubtitleMarginLeft(60);
        setSubtitleMarginRight(60);
        setSubtitleAlignment(2);
        setSubtitleBackgroundEnabled(true);
        setSubtitleBackgroundColor("#000000");
        setSubtitleBackgroundOpacity(65);
        setSubtitleSampleWidthPercent(100);
        setSubtitlePreviewPlacement(null);
    }, []);

    const getCurrentSubtitlePreviewPlacement = useCallback(() => {
        const frame = previewFrameRef.current;
        if (!frame || frame.clientWidth <= 0 || frame.clientHeight <= 0) {
            return subtitlePreviewPlacement;
        }
        return {
            leftPercent: clampNumber(
                (subtitlePreviewPosRef.current.left / frame.clientWidth) * 100,
                0,
                100,
            ),
            topPercent: clampNumber(
                (subtitlePreviewPosRef.current.top / frame.clientHeight) * 100,
                0,
                100,
            ),
        };
    }, [subtitlePreviewPlacement]);

    const commitSubtitlePositionToAssStyle = useCallback(
        (leftPx: number, topPx: number) => {
            const frame = previewFrameRef.current;
            const subtitleBox = subtitleBoxRef.current;
            if (!frame || !subtitleBox) return;
            const frameWidth = frame.clientWidth;
            const frameHeight = frame.clientHeight;
            const boxWidth = subtitleBox.clientWidth;
            const boxHeight = subtitleBox.clientHeight;
            if (frameWidth <= 0 || frameHeight <= 0) return;

            const centerX = leftPx + boxWidth / 2;
            const centerY = topPx + boxHeight / 2;
            const horizontalZone =
                centerX < frameWidth * 0.33
                    ? "left"
                    : centerX > frameWidth * 0.67
                      ? "right"
                      : "center";
            const verticalZone = centerY < frameHeight * 0.5 ? "top" : "bottom";

            const leftMarginPx = Math.max(0, leftPx);
            const rightMarginPx = Math.max(0, frameWidth - leftPx - boxWidth);
            const topMarginPx = Math.max(0, topPx);
            const bottomMarginPx = Math.max(0, frameHeight - topPx - boxHeight);
            const scaleX = videoNaturalSize.width / frameWidth;
            const scaleY = videoNaturalSize.height / frameHeight;

            let nextAlignment = 2;
            if (verticalZone === "top") {
                nextAlignment =
                    horizontalZone === "left"
                        ? 7
                        : horizontalZone === "right"
                          ? 9
                          : 8;
            } else {
                nextAlignment =
                    horizontalZone === "left"
                        ? 1
                        : horizontalZone === "right"
                          ? 3
                          : 2;
            }

            setSubtitleAlignment(nextAlignment);
            setSubtitleMarginLeft(Math.round(leftMarginPx * scaleX));
            setSubtitleMarginRight(Math.round(rightMarginPx * scaleX));
            setSubtitleMarginBottom(
                Math.round(
                    (verticalZone === "top" ? topMarginPx : bottomMarginPx) *
                        scaleY,
                ),
            );
        },
        [videoNaturalSize.height, videoNaturalSize.width],
    );

    useEffect(() => {
        if (!isDraggingSubtitle) return;

        const handlePointerMove = (event: MouseEvent) => {
            const frame = previewFrameRef.current;
            const subtitleBox = subtitleBoxRef.current;
            if (!frame || !subtitleBox) return;
            const frameRect = frame.getBoundingClientRect();
            const maxLeft = Math.max(
                0,
                frameRect.width - subtitleBox.clientWidth,
            );
            const maxTop = Math.max(
                0,
                frameRect.height - subtitleBox.clientHeight,
            );
            const rawLeft =
                event.clientX - frameRect.left - subtitleDragOffset.x;
            const rawTop = event.clientY - frameRect.top - subtitleDragOffset.y;
            const clampedLeft = Math.max(0, Math.min(maxLeft, rawLeft));
            const clampedTop = Math.max(0, Math.min(maxTop, rawTop));
            setSubtitlePreviewLeftPx(clampedLeft);
            setSubtitlePreviewTopPx(clampedTop);
            subtitlePreviewPosRef.current = {
                left: clampedLeft,
                top: clampedTop,
            };
        };

        const handlePointerUp = () => {
            setIsDraggingSubtitle(false);
            const nextPlacement = getCurrentSubtitlePreviewPlacement();
            setSubtitlePreviewPlacement(nextPlacement);
            commitSubtitlePositionToAssStyle(
                subtitlePreviewPosRef.current.left,
                subtitlePreviewPosRef.current.top,
            );
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp, { once: true });
        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
        };
    }, [
        commitSubtitlePositionToAssStyle,
        getCurrentSubtitlePreviewPlacement,
        isDraggingSubtitle,
        subtitleDragOffset.x,
        subtitleDragOffset.y,
    ]);

    useEffect(() => {
        if (isDraggingSubtitle) return;
        const frame = previewFrameRef.current;
        const subtitleBox = subtitleBoxRef.current;
        if (!frame || !subtitleBox) return;
        const frameWidth = frame.clientWidth;
        const frameHeight = frame.clientHeight;
        const boxWidth = subtitleBox.clientWidth;
        const boxHeight = subtitleBox.clientHeight;
        if (frameWidth <= 0 || frameHeight <= 0) return;

        if (subtitlePreviewPlacement) {
            const left = clampNumber(
                (subtitlePreviewPlacement.leftPercent / 100) * frameWidth,
                0,
                Math.max(0, frameWidth - boxWidth),
            );
            const top = clampNumber(
                (subtitlePreviewPlacement.topPercent / 100) * frameHeight,
                0,
                Math.max(0, frameHeight - boxHeight),
            );
            setSubtitlePreviewLeftPx(left);
            setSubtitlePreviewTopPx(top);
            subtitlePreviewPosRef.current = { left, top };
            return;
        }

        const scaleX = frameWidth / videoNaturalSize.width;
        const scaleY = frameHeight / videoNaturalSize.height;
        const marginL = subtitleMarginLeft * scaleX;
        const marginR = subtitleMarginRight * scaleX;
        const marginV = subtitleMarginBottom * scaleY;
        const isTop = subtitleAlignment >= 7;
        const isLeft =
            subtitleAlignment === 1 ||
            subtitleAlignment === 4 ||
            subtitleAlignment === 7;
        const isRight =
            subtitleAlignment === 3 ||
            subtitleAlignment === 6 ||
            subtitleAlignment === 9;
        const top = isTop
            ? marginV
            : Math.max(0, frameHeight - boxHeight - marginV);
        const left = isLeft
            ? marginL
            : isRight
              ? Math.max(0, frameWidth - boxWidth - marginR)
              : Math.max(
                    0,
                    marginL + (frameWidth - marginL - marginR - boxWidth) / 2,
                );
        setSubtitlePreviewLeftPx(left);
        setSubtitlePreviewTopPx(top);
        subtitlePreviewPosRef.current = { left, top };
    }, [
        isDraggingSubtitle,
        subtitleOverlayEnabled,
        subtitleAlignment,
        subtitleMarginLeft,
        subtitleMarginRight,
        subtitleMarginBottom,
        subtitleSampleWidthPercent,
        subtitlePreviewPlacement,
        subtitleFontSize,
        previewLayoutVersion,
        videoNaturalSize.width,
        videoNaturalSize.height,
        sourceVideoUrl,
    ]);

    const updateActiveRegion = (
        patch: Partial<Omit<BlurRegionDraft, "id">>,
    ) => {
        if (!activeRegionId) return;
        setBlurRegions((current) =>
            current.map((item) =>
                item.id === activeRegionId ? { ...item, ...patch } : item,
            ),
        );
    };

    const toggleSourcePreviewPlayback = async () => {
        const video = sourceVideoRef.current;
        if (!video) return;
        if (video.paused) {
            try {
                await video.play();
            } catch {
                setSourcePreviewPlaying(false);
            }
            return;
        }
        video.pause();
    };

    const toggleSourcePreviewMuted = () => {
        const video = sourceVideoRef.current;
        const nextMuted = !sourcePreviewMuted;
        if (video) {
            video.muted = nextMuted;
        }
        setSourcePreviewMuted(nextMuted);
    };

    const seekSourcePreview = (timeSeconds: number) => {
        const video = sourceVideoRef.current;
        if (!video || !Number.isFinite(timeSeconds)) return;
        const duration =
            Number.isFinite(video.duration) && video.duration > 0
                ? video.duration
                : sourcePreviewDuration;
        const nextTime = clampNumber(timeSeconds, 0, duration || 0);
        video.currentTime = nextTime;
        setSourcePreviewTime(nextTime);
    };

    const applyVideoEditSetup = useCallback(
        (setup: VideoEditSetup | null) => {
            if (!setup) {
                applyDefaultSubtitleSetup();
                return;
            }
            setMirrorEnabled(setup.mirrorEnabled === true);
            setBlurEnabled(setup.blurEnabled !== false);
            setSubtitleOverlayEnabled(setup.subtitleOverlayEnabled !== false);
            setBlurRegions(
                (setup.blurRegions ?? []).map((region, index) => ({
                    id: `setup-${index}-${Date.now()}`,
                    ...region,
                })),
            );
            setSubtitleFontFamily(setup.subtitleFontFamily || "Arial");
            setSubtitleFontSize(setup.subtitleFontSize ?? 55);
            setSubtitleMarginBottom(setup.subtitleMarginBottom ?? 150);
            setSubtitleMarginLeft(setup.subtitleMarginLeft ?? 60);
            setSubtitleMarginRight(setup.subtitleMarginRight ?? 60);
            setSubtitleAlignment(setup.subtitleAlignment ?? 2);
            setSubtitleBackgroundEnabled(
                setup.subtitleBackgroundEnabled !== false,
            );
            setSubtitleBackgroundColor(
                normalizeSubtitleBackgroundColor(setup.subtitleBackgroundColor),
            );
            setSubtitleBackgroundOpacity(setup.subtitleBackgroundOpacity ?? 65);
            setSubtitleSampleWidthPercent(
                setup.subtitleSampleWidthPercent ?? 100,
            );
            const placement = setup.subtitlePreviewPlacement;
            setSubtitlePreviewPlacement(
                placement &&
                    Number.isFinite(placement.leftPercent) &&
                    Number.isFinite(placement.topPercent)
                    ? {
                          leftPercent: clampNumber(
                              Number(placement.leftPercent),
                              0,
                              100,
                          ),
                          topPercent: clampNumber(
                              Number(placement.topPercent),
                              0,
                              100,
                          ),
                      }
                    : null,
            );
        },
        [applyDefaultSubtitleSetup],
    );

    useEffect(() => {
        if (!selectedAssetId) return;
        applyVideoEditSetup(selectedAsset?.metadata?.videoEditSetup ?? null);
    }, [
        applyVideoEditSetup,
        selectedAsset?._id,
        selectedAsset?.metadata,
        selectedAssetId,
    ]);

    const saveSetupToSelectedAsset = async () => {
        if (!selectedAssetId) {
            setError("Chọn Storage Asset trước khi lưu setup theo video.");
            setSaveMessage(null);
            return;
        }
        try {
            const videoEditSetup: VideoEditSetup = {
                mirrorEnabled,
                blurEnabled,
                subtitleOverlayEnabled,
                blurRegions: blurRegions.map((item) => ({
                    x: item.x,
                    y: item.y,
                    width: item.width,
                    height: item.height,
                    start: item.start,
                    end: item.end,
                    strength: item.strength,
                })),
                subtitleFontFamily,
                subtitleFontSize,
                subtitleMarginBottom,
                subtitleMarginLeft,
                subtitleMarginRight,
                subtitleAlignment,
                subtitleBackgroundEnabled,
                subtitleBackgroundColor,
                subtitleBackgroundOpacity,
                subtitleSampleWidthPercent,
                subtitlePreviewPlacement: getCurrentSubtitlePreviewPlacement(),
            };
            const payload = {
                metadata: {
                    videoEditSetup,
                },
            };
            const response = await fetch(
                `/api/storage/assets/${selectedAssetId}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            const resultPayload = await response.json();
            if (!response.ok || !resultPayload.ok) {
                throw new Error(resultPayload.error ?? "Save setup failed.");
            }
            setAssets((current) =>
                current.map((asset) =>
                    asset._id === selectedAssetId
                        ? {
                              ...asset,
                              metadata: {
                                  ...asset.metadata,
                                  videoEditSetup,
                              },
                          }
                        : asset,
                ),
            );
            applyVideoEditSetup(videoEditSetup);
            await fetch("/api/storage/assets?limit=100", {
                method: "GET",
                cache: "no-store",
            })
                .then((res) => res.json())
                .then(
                    (nextPayload: {
                        ok: boolean;
                        data?: StoredVideoAsset[];
                    }) => {
                        if (nextPayload.ok && nextPayload.data) {
                            setAssets(nextPayload.data);
                        }
                    },
                );
            setError(null);
            setSaveMessage("Đã lưu setup vào video asset.");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Save setup failed.",
            );
            setSaveMessage(null);
        }
    };

    const removeActiveRegion = () => {
        if (!activeRegionId) return;
        setBlurRegions((current) =>
            current.filter((item) => item.id !== activeRegionId),
        );
        setActiveRegionId(null);
    };

    const runCombinedEdit = async () => {
        if (!videoFile && !selectedAssetId) {
            setError(
                "Hãy upload video hoặc chọn Storage Asset trước khi chạy.",
            );
            return;
        }
        if (!mirrorEnabled && !blurEnabled && !subtitleOverlayEnabled) {
            setError(
                "Hãy bật ít nhất một transform: mirror, blur hoặc subtitle.",
            );
            return;
        }
        if (blurEnabled && !translatedSegmentsJson.trim()) {
            setError(
                "Partial Blur cần translated subtitle segments để đè phụ đề tiếng Việt.",
            );
            return;
        }
        if (blurEnabled && blurRegions.length === 0) {
            setError("Hãy vẽ ít nhất 1 blur region trước khi chạy.");
            return;
        }

        setIsRunningEdit(true);
        setError(null);
        setResult(null);
        const progressTaskId = startProgressTask({
            title: "Video edit pipeline",
            description: "Preparing mirror/edit render...",
            scope: "system",
            progress: 10,
        });

        try {
            let inputFile = videoFile;
            if (!inputFile && selectedAssetId) {
                updateProgressTask(progressTaskId, {
                    description: "Downloading source asset for edit...",
                    progress: 25,
                });
                const response = await fetch(
                    `/api/storage/assets/${selectedAssetId}/download`,
                );
                if (!response.ok) {
                    throw new Error("Không tải được video từ Storage Asset.");
                }
                const blob = await response.blob();
                inputFile = new File(
                    [blob],
                    `${selectedAsset?.metadata?.title ?? "storage-asset"}.mp4`,
                    { type: blob.type || "video/mp4" },
                );
            }
            if (!inputFile) {
                throw new Error("Thiếu input video.");
            }
            const formData = new FormData();
            formData.set("videoFile", inputFile);
            formData.set("mirrorEnabled", String(mirrorEnabled));
            formData.set("blurEnabled", String(blurEnabled));
            formData.set(
                "subtitleOverlayEnabled",
                String(subtitleOverlayEnabled),
            );
            formData.set("blurRegionsJson", JSON.stringify(blurRegions));
            formData.set("subtitleFontFamily", subtitleFontFamily);
            formData.set("subtitleFontSize", String(subtitleFontSize));
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
            formData.set("subtitlePlayResX", String(videoNaturalSize.width));
            formData.set("subtitlePlayResY", String(videoNaturalSize.height));
            formData.set("translatedSegmentsJson", translatedSegmentsJson);

            updateProgressTask(progressTaskId, {
                description: "Running ffmpeg edit pipeline...",
                progress: 60,
            });
            const response = await fetch("/api/video-processing/edit", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as VideoEditApiPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Video Edit failed."}`
                        : (payload.error ?? "Video Edit failed."),
                );
            }
            setResult(payload.data);
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Video edit pipeline completed.",
            });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Video Edit request failed.",
            );
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Video edit pipeline failed.",
                error:
                    requestError instanceof Error
                        ? requestError.message
                        : "Unknown error",
            });
        } finally {
            setIsRunningEdit(false);
        }
    };

    return (
        <section className="w-full max-w-none border border-main bg-main">
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
                        <p>ffmpeg filters</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Scope</p>
                        <p>Lab + Workspace</p>
                    </div>
                </div>
            </header>

            <div className="grid w-full gap-4 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <Clapperboard className="h-4 w-4 text-muted" />
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
                                onChange={(event) => {
                                    setVideoFile(
                                        event.currentTarget.files?.[0] ?? null,
                                    );
                                    setSelectedAssetId("");
                                    setResult(null);
                                    setError(null);
                                }}
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        {videoFile ? (
                            <p className="mt-2 truncate text-[11px] text-muted">
                                {videoFile.name} · {formatBytes(videoFile.size)}
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
                                                const hasSetup =
                                                    hasSavedVideoEditSetup(
                                                        asset,
                                                    );
                                                return (
                                                    <button
                                                        key={asset._id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedAssetId(
                                                                asset._id,
                                                            );
                                                            setVideoFile(null);
                                                            setResult(null);
                                                            setError(null);
                                                            setShowAssetPicker(
                                                                false,
                                                            );
                                                            applyVideoEditSetup(
                                                                asset.metadata
                                                                    ?.videoEditSetup ??
                                                                    null,
                                                            );
                                                        }}
                                                        className={`w-full border p-2 text-left ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main hover:bg-secondary/20"}`}
                                                    >
                                                        <p className="truncate text-[12px] font-semibold text-main">
                                                            {asset.metadata
                                                                ?.title ??
                                                                asset._id}
                                                        </p>
                                                        <div className="mt-1 flex items-center justify-between gap-2">
                                                            <p className="truncate text-[10px] text-muted">
                                                                {[
                                                                    getAssetFolderName(
                                                                        asset,
                                                                    ),
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
                                                            {hasSetup ? (
                                                                <span className="shrink-0 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                                                    Saved setup
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                disabled={!selectedAssetId}
                                onClick={saveSetupToSelectedAsset}
                                className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Save Setup To Asset
                            </button>
                        </div>
                        {saveMessage ? (
                            <p className="mt-2 border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700">
                                {saveMessage}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Combined Tools
                        </p>
                        <p className="text-[10px] leading-4 text-muted">
                            Chạy trực tiếp trên video local. Một request có thể
                            kết hợp mirror, blur vùng/timeline và burn phụ đề
                            tiếng Việt theo timestamps.
                        </p>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <FlipHorizontal2 className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Mirror horizontal
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Lật ngang bằng ffmpeg hflip.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={mirrorEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) =>
                                    setMirrorEnabled(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <ScanLine className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Partial Blur + stamp
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Blur luôn đi kèm phụ đề/stamp overlay.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={blurEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) => {
                                    const nextValue =
                                        event.currentTarget.checked;
                                    setBlurEnabled(nextValue);
                                    if (nextValue) {
                                        setSubtitleOverlayEnabled(true);
                                    }
                                }}
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <Captions className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Burn Vietnamese subtitles
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Dùng translated segments có start/end.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={subtitleOverlayEnabled}
                                disabled={isRunningEdit || blurEnabled}
                                onChange={(event) =>
                                    setSubtitleOverlayEnabled(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        {blurEnabled ? (
                            <div className="grid gap-2 border border-main bg-main p-3">
                                <p className="text-[11px] font-semibold text-main">
                                    Blur regions (% of output frame)
                                </p>
                                <p className="text-[10px] leading-4 text-muted">
                                    Vẽ trực tiếp trên preview gốc để thêm vùng
                                    blur. Có thể thêm nhiều vùng cho một video.
                                </p>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Start (s)
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={regionTimeStart}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setRegionTimeStart(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            End (s)
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={regionTimeEnd}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setRegionTimeEnd(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Strength
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={regionStrength}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setRegionStrength(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <div className="max-h-36 space-y-2 overflow-y-auto border border-main bg-secondary/20 p-2">
                                    {blurRegions.length === 0 ? (
                                        <p className="text-[10px] text-muted">
                                            Chưa có region nào.
                                        </p>
                                    ) : (
                                        blurRegions.map((item, index) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                disabled={isRunningEdit}
                                                onClick={() =>
                                                    setActiveRegionId(item.id)
                                                }
                                                className={`w-full border px-2 py-1 text-left text-[10px] ${activeRegionId === item.id ? "border-accent bg-accent/10 text-accent" : "border-main bg-main text-main"}`}
                                            >
                                                #{index + 1} x:
                                                {item.x.toFixed(1)} y:
                                                {item.y.toFixed(1)} w:
                                                {item.width.toFixed(1)} h:
                                                {item.height.toFixed(1)} t:
                                                {item.start}s-{item.end}s s:
                                                {item.strength}
                                            </button>
                                        ))
                                    )}
                                </div>
                                {activeRegion ? (
                                    <div className="grid grid-cols-2 gap-2 border border-main bg-secondary/20 p-2">
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                X %
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={activeRegion.x}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        x: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Y %
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={activeRegion.y}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        y: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Width %
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={activeRegion.width}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        width: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Height %
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={activeRegion.height}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        height: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Start (s)
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={activeRegion.start}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        start: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                End (s)
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={activeRegion.end}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        end: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Strength
                                            </span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={activeRegion.strength}
                                                onChange={(event) =>
                                                    updateActiveRegion({
                                                        strength: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full border border-main bg-main px-2 py-1 text-[10px] text-main"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={removeActiveRegion}
                                            className="self-end border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] font-semibold text-rose-700"
                                        >
                                            Remove region
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        {subtitleOverlayEnabled ? (
                            <div className="space-y-2 border border-main bg-main p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Translated segments JSON
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isRunningEdit}
                                        onClick={() =>
                                            setTranslatedSegmentsJson(
                                                sampleTranslatedSegmentsJson,
                                            )
                                        }
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Sample
                                    </button>
                                </div>
                                <textarea
                                    value={translatedSegmentsJson}
                                    disabled={isRunningEdit}
                                    onChange={(event) =>
                                        setTranslatedSegmentsJson(
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder='[{"id":1,"start":0,"end":2.5,"sourceText":"...","translatedText":"..."}]'
                                    className="min-h-16 w-full border border-main bg-secondary/30 px-2 py-1.5 font-mono text-[10px] leading-4 text-main placeholder:text-muted/60"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Font
                                        </span>
                                        <input
                                            value={subtitleFontFamily}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleFontFamily(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Cỡ chữ
                                        </span>
                                        <input
                                            type="number"
                                            min={20}
                                            max={160}
                                            value={subtitleFontSize}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleFontSize(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Vị trí dọc
                                        </span>
                                        <input
                                            type="number"
                                            min={20}
                                            max={520}
                                            value={subtitleMarginBottom}
                                            disabled={isRunningEdit}
                                            onChange={(event) => {
                                                setSubtitlePreviewPlacement(
                                                    null,
                                                );
                                                setSubtitleMarginBottom(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                );
                                            }}
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Vị trí ngang trái
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={520}
                                            value={subtitleMarginLeft}
                                            disabled={isRunningEdit}
                                            onChange={(event) => {
                                                setSubtitlePreviewPlacement(
                                                    null,
                                                );
                                                setSubtitleMarginLeft(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                );
                                            }}
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Vị trí ngang phải
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={520}
                                            value={subtitleMarginRight}
                                            disabled={isRunningEdit}
                                            onChange={(event) => {
                                                setSubtitlePreviewPlacement(
                                                    null,
                                                );
                                                setSubtitleMarginRight(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                );
                                            }}
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Alignment
                                        </span>
                                        <select
                                            value={subtitleAlignment}
                                            disabled={isRunningEdit}
                                            onChange={(event) => {
                                                setSubtitlePreviewPlacement(
                                                    null,
                                                );
                                                setSubtitleAlignment(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                );
                                            }}
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        >
                                            <option value={1}>
                                                Bottom left
                                            </option>
                                            <option value={2}>
                                                Bottom center
                                            </option>
                                            <option value={3}>
                                                Bottom right
                                            </option>
                                            <option value={7}>Top left</option>
                                            <option value={8}>
                                                Top center
                                            </option>
                                            <option value={9}>Top right</option>
                                        </select>
                                    </label>
                                </div>
                                <label className="flex items-center justify-between gap-3 border border-main bg-secondary/20 px-3 py-2">
                                    <span className="text-[10px] font-semibold text-muted">
                                        Subtitle background
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={subtitleBackgroundEnabled}
                                        disabled={isRunningEdit}
                                        onChange={(event) =>
                                            setSubtitleBackgroundEnabled(
                                                event.currentTarget.checked,
                                            )
                                        }
                                        className="h-4 w-4 accent-[var(--color-accent)]"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Background color
                                        </span>
                                        <select
                                            value={subtitleBackgroundColor}
                                            disabled={
                                                isRunningEdit ||
                                                !subtitleBackgroundEnabled
                                            }
                                            onChange={(event) =>
                                                setSubtitleBackgroundColor(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        >
                                            {SUBTITLE_BACKGROUND_COLOR_OPTIONS.map(
                                                (option) => (
                                                    <option
                                                        key={option.value}
                                                        value={option.value}
                                                    >
                                                        {option.label}
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Background opacity %
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={subtitleBackgroundOpacity}
                                            disabled={
                                                isRunningEdit ||
                                                !subtitleBackgroundEnabled
                                            }
                                            onChange={(event) =>
                                                setSubtitleBackgroundOpacity(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Độ rộng Subtitle mẫu (%)
                                    </span>
                                    <input
                                        type="number"
                                        min={30}
                                        max={100}
                                        value={subtitleSampleWidthPercent}
                                        disabled={isRunningEdit}
                                        onChange={(event) =>
                                            setSubtitleSampleWidthPercent(
                                                Number(
                                                    event.currentTarget.value,
                                                ),
                                            )
                                        }
                                        className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                    />
                                </label>
                                <p className="text-[10px] leading-4 text-muted">
                                    Kéo thả `Subtitle mẫu` trực tiếp trên
                                    preview để tự động cập nhật alignment và
                                    margins.
                                </p>
                                <p className="text-[10px] leading-4 text-muted">
                                    Paste `translatedSegments` từ Audio
                                    Transcript. Workspace sẽ tự lấy kết quả từ
                                    node Translate Transcript upstream.
                                </p>
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={runCombinedEdit}
                            disabled={
                                isRunningEdit ||
                                (!videoFile && !selectedAssetId)
                            }
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRunningEdit ? "Editing..." : "Run Video Edit"}
                        </button>

                        {error ? (
                            <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                {error}
                            </p>
                        ) : null}
                    </div>
                </aside>

                <div className="grid content-start self-start gap-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
                                Original Preview
                            </p>
                        </div>
                        {sourceVideoUrl ? (
                            <div className="space-y-2">
                                <div className="flex justify-center">
                                    <div
                                        ref={previewFrameRef}
                                        className="relative inline-block overflow-hidden border border-main bg-black"
                                        onMouseDown={(event) => {
                                            if (
                                                !blurEnabled ||
                                                isRunningEdit ||
                                                isDraggingSubtitle
                                            ) {
                                                return;
                                            }
                                            const rect =
                                                event.currentTarget.getBoundingClientRect();
                                            const x =
                                                ((event.clientX - rect.left) /
                                                    rect.width) *
                                                100;
                                            const y =
                                                ((event.clientY - rect.top) /
                                                    rect.height) *
                                                100;
                                            setIsDrawingRegion(true);
                                            setDrawStart({ x, y });
                                            setDrawCurrent({ x, y });
                                        }}
                                        onMouseMove={(event) => {
                                            if (!isDrawingRegion || !drawStart)
                                                return;
                                            const rect =
                                                event.currentTarget.getBoundingClientRect();
                                            const x =
                                                ((event.clientX - rect.left) /
                                                    rect.width) *
                                                100;
                                            const y =
                                                ((event.clientY - rect.top) /
                                                    rect.height) *
                                                100;
                                            setDrawCurrent({ x, y });
                                        }}
                                        onMouseUp={() => {
                                            if (
                                                !isDrawingRegion ||
                                                !drawStart ||
                                                !drawCurrent
                                            ) {
                                                setIsDrawingRegion(false);
                                                return;
                                            }
                                            const x = Math.min(
                                                drawStart.x,
                                                drawCurrent.x,
                                            );
                                            const y = Math.min(
                                                drawStart.y,
                                                drawCurrent.y,
                                            );
                                            const width = Math.abs(
                                                drawCurrent.x - drawStart.x,
                                            );
                                            const height = Math.abs(
                                                drawCurrent.y - drawStart.y,
                                            );
                                            if (width >= 1 && height >= 1) {
                                                const id =
                                                    typeof crypto !==
                                                        "undefined" &&
                                                    "randomUUID" in crypto
                                                        ? crypto.randomUUID()
                                                        : `${Date.now()}-${Math.random()}`;
                                                const next: BlurRegionDraft = {
                                                    id,
                                                    x: Math.max(
                                                        0,
                                                        Math.min(100, x),
                                                    ),
                                                    y: Math.max(
                                                        0,
                                                        Math.min(100, y),
                                                    ),
                                                    width: Math.max(
                                                        0.5,
                                                        Math.min(100, width),
                                                    ),
                                                    height: Math.max(
                                                        0.5,
                                                        Math.min(100, height),
                                                    ),
                                                    start: regionTimeStart,
                                                    end: regionTimeEnd,
                                                    strength: regionStrength,
                                                };
                                                setBlurRegions((current) => [
                                                    ...current,
                                                    next,
                                                ]);
                                                setActiveRegionId(next.id);
                                            }
                                            setIsDrawingRegion(false);
                                            setDrawStart(null);
                                            setDrawCurrent(null);
                                        }}
                                        onMouseLeave={() => {
                                            if (!isDrawingRegion) return;
                                            setIsDrawingRegion(false);
                                            setDrawStart(null);
                                            setDrawCurrent(null);
                                        }}
                                    >
                                        <video
                                            ref={sourceVideoRef}
                                            src={sourceVideoUrl}
                                            className="block max-h-[420px] w-auto max-w-full bg-black"
                                            playsInline
                                            muted={sourcePreviewMuted}
                                            onPlay={() =>
                                                setSourcePreviewPlaying(true)
                                            }
                                            onPause={() =>
                                                setSourcePreviewPlaying(false)
                                            }
                                            onEnded={() =>
                                                setSourcePreviewPlaying(false)
                                            }
                                            onTimeUpdate={(event) =>
                                                setSourcePreviewTime(
                                                    event.currentTarget
                                                        .currentTime,
                                                )
                                            }
                                            onDurationChange={(event) => {
                                                const duration =
                                                    event.currentTarget
                                                        .duration;
                                                setSourcePreviewDuration(
                                                    Number.isFinite(duration)
                                                        ? duration
                                                        : 0,
                                                );
                                            }}
                                            onLoadedMetadata={(event) => {
                                                const element =
                                                    event.currentTarget;
                                                setSourcePreviewDuration(
                                                    Number.isFinite(
                                                        element.duration,
                                                    )
                                                        ? element.duration
                                                        : 0,
                                                );
                                                setSourcePreviewTime(
                                                    element.currentTime,
                                                );
                                                if (
                                                    element.videoWidth > 0 &&
                                                    element.videoHeight > 0
                                                ) {
                                                    setVideoNaturalSize({
                                                        width: element.videoWidth,
                                                        height: element.videoHeight,
                                                    });
                                                    setPreviewLayoutVersion(
                                                        (current) =>
                                                            current + 1,
                                                    );
                                                }
                                            }}
                                        />
                                        {subtitleOverlayEnabled ? (
                                            <div
                                                ref={subtitleBoxRef}
                                                onMouseDown={(event) => {
                                                    if (isRunningEdit) return;
                                                    event.stopPropagation();
                                                    const boxRect =
                                                        event.currentTarget.getBoundingClientRect();
                                                    setSubtitleDragOffset({
                                                        x:
                                                            event.clientX -
                                                            boxRect.left,
                                                        y:
                                                            event.clientY -
                                                            boxRect.top,
                                                    });
                                                    setIsDraggingSubtitle(true);
                                                }}
                                                className="absolute cursor-move select-none border border-dashed border-accent/70 text-center text-[12px] font-semibold text-white"
                                                style={{
                                                    left: subtitlePreviewLeftPx,
                                                    top: subtitlePreviewTopPx,
                                                    width: `${subtitleSampleWidthPercent}%`,
                                                    fontFamily:
                                                        subtitleFontFamily,
                                                    // ASS uses 72dpi typography while CSS uses 96dpi.
                                                    // Convert so preview fontsize matches rendered subtitle.
                                                    fontSize: `${Math.max(
                                                        10,
                                                        ((subtitleFontSize *
                                                            (previewFrameRef
                                                                .current
                                                                ?.clientHeight ??
                                                                420)) /
                                                            videoNaturalSize.height) *
                                                            (72 / 96),
                                                    )}px`,
                                                    lineHeight: 1.25,
                                                    paddingLeft: `${Math.max(
                                                        1,
                                                        ((previewFrameRef
                                                            .current
                                                            ?.clientHeight ??
                                                            420) /
                                                            videoNaturalSize.height) *
                                                            ASS_SUBTITLE_OUTLINE,
                                                    )}px`,
                                                    paddingRight: `${Math.max(
                                                        1,
                                                        ((previewFrameRef
                                                            .current
                                                            ?.clientHeight ??
                                                            420) /
                                                            videoNaturalSize.height) *
                                                            ASS_SUBTITLE_OUTLINE,
                                                    )}px`,
                                                    paddingTop: `${Math.max(
                                                        1,
                                                        ((previewFrameRef
                                                            .current
                                                            ?.clientHeight ??
                                                            420) /
                                                            videoNaturalSize.height) *
                                                            ASS_SUBTITLE_OUTLINE,
                                                    )}px`,
                                                    paddingBottom: `${Math.max(
                                                        1,
                                                        ((previewFrameRef
                                                            .current
                                                            ?.clientHeight ??
                                                            420) /
                                                            videoNaturalSize.height) *
                                                            ASS_SUBTITLE_OUTLINE,
                                                    )}px`,
                                                    backgroundColor:
                                                        subtitleBackgroundEnabled
                                                            ? hexToRgba(
                                                                  subtitleBackgroundColor,
                                                                  subtitleBackgroundOpacity,
                                                              )
                                                            : "transparent",
                                                    textShadow:
                                                        "1px 0 0 #000, -1px 0 0 #000, 0 1px 0 #000, 0 -1px 0 #000",
                                                }}
                                            >
                                                Phụ đề tiếng Việt mẫu để căn vị
                                                trí
                                            </div>
                                        ) : null}
                                        {blurRegions.map((region) => (
                                            <div
                                                key={region.id}
                                                className={`pointer-events-none absolute border ${activeRegionId === region.id ? "border-accent bg-accent/20" : "border-main bg-main/10"}`}
                                                style={{
                                                    left: `${region.x}%`,
                                                    top: `${region.y}%`,
                                                    width: `${region.width}%`,
                                                    height: `${region.height}%`,
                                                }}
                                            />
                                        ))}
                                        {isDrawingRegion &&
                                        drawStart &&
                                        drawCurrent ? (
                                            <div
                                                className="pointer-events-none absolute border border-accent bg-accent/15"
                                                style={{
                                                    left: `${Math.min(
                                                        drawStart.x,
                                                        drawCurrent.x,
                                                    )}%`,
                                                    top: `${Math.min(
                                                        drawStart.y,
                                                        drawCurrent.y,
                                                    )}%`,
                                                    width: `${Math.abs(
                                                        drawCurrent.x -
                                                            drawStart.x,
                                                    )}%`,
                                                    height: `${Math.abs(
                                                        drawCurrent.y -
                                                            drawStart.y,
                                                    )}%`,
                                                }}
                                            />
                                        ) : null}
                                    </div>
                                </div>
                                <SourcePreviewControls
                                    isPlaying={sourcePreviewPlaying}
                                    isMuted={sourcePreviewMuted}
                                    currentTime={sourcePreviewTime}
                                    duration={sourcePreviewDuration}
                                    onTogglePlay={toggleSourcePreviewPlayback}
                                    onToggleMute={toggleSourcePreviewMuted}
                                    onSeek={seekSourcePreview}
                                />
                            </div>
                        ) : (
                            <div className="flex min-h-28 items-center justify-center border border-dashed border-main bg-main px-4 py-3 text-center text-[11px] text-muted">
                                Upload video hoặc chọn Storage Asset để xem
                                preview gốc.
                            </div>
                        )}
                    </div>

                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
                                Edited Output
                            </p>
                        </div>
                        {editedVideoUrl ? (
                            <div className="space-y-3">
                                <div className="flex justify-center">
                                    <div className="overflow-hidden border border-main bg-black">
                                        <video
                                            controls
                                            src={editedVideoUrl}
                                            className="block max-h-[420px] w-auto max-w-full bg-black"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-start justify-between gap-3 w-full">
                                    <div className="grid gap-2 border border-main w-full bg-main p-3 text-[11px] text-muted sm:grid-cols-4">
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Size
                                            </span>
                                            {formatBytes(
                                                result?.byteLength ?? 0,
                                            )}
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Runtime
                                            </span>
                                            {result?.generationDurationMs ?? 0}{" "}
                                            ms
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Segments
                                            </span>
                                            {result?.transform.segmentCount ??
                                                0}
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                File
                                            </span>
                                            {result?.fileName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-h-28 items-center justify-center border border-dashed border-main bg-main px-4 py-3 text-center text-[11px] text-muted">
                                Chạy Video Edit để preview output gồm mirror,
                                blur và subtitle overlay.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
