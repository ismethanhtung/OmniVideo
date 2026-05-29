"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Captions,
    Clapperboard,
    FlipHorizontal2,
    Pause,
    Play,
    ScanLine,
    Type,
    Volume2,
    VolumeX,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";
import {
    getAssetFolderName,
    matchesVideoAssetSearch,
} from "@/lib/storage/asset-folder";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";
import {
    loadLocalVideoEditSetup,
    saveLocalVideoEditSetup,
} from "@/lib/video-processing/local-video-edit-setup";

import {
    ASS_SUBTITLE_OUTLINE,
    ASS_TO_CSS_FONT_DPI_RATIO,
    SUBTITLE_PREVIEW_LINE_HEIGHT,
    buildSubtitleAssPlacementFromPreview,
    buildSubtitlePlacementRegionFromPreview,
    type SubtitleAssPlacement,
    type SubtitlePlacementRegion,
} from "./subtitle-preview-placement";

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
                  coverBox?: boolean;
                  subtitleOverlay: boolean;
                  segmentCount: number;
                  textOverlay?: boolean;
                  textOverlayCount?: number;
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
            coverBoxEnabled?: boolean;
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
            subtitleBackgroundPaddingY?: number;
            subtitleSampleWidthPercent?: number;
            subtitlePreviewPlacement?: {
                leftPercent?: number;
                topPercent?: number;
                widthPercent?: number;
                heightPercent?: number;
            } | null;
            subtitlePlacementRegion?: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
            } | null;
            textOverlayEnabled?: boolean;
            textOverlay?: {
                text?: string;
                fontFamily?: string;
                fontSize?: number;
                fontWeight?: number;
                textColor?: string;
                strokeColor?: string;
                strokeWidth?: number;
                backgroundEnabled?: boolean;
                backgroundColor?: string;
                backgroundOpacity?: number;
                x?: number;
                y?: number;
                start?: number;
                end?: number;
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

type TextOverlayDraft = {
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    strokeColor: string;
    strokeWidth: number;
    backgroundEnabled: boolean;
    backgroundColor: string;
    backgroundOpacity: number;
    x: number;
    y: number;
    start: number;
    end: number;
};

type VideoEditSetup = NonNullable<
    NonNullable<StoredVideoAsset["metadata"]>["videoEditSetup"]
>;

type AssetPreviewState = {
    assetId: string;
    src: string;
};

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

const SUBTITLE_BACKGROUND_COLOR_OPTIONS = [
    { value: "#000000", label: "Đen" },
    { value: "#FFFFFF", label: "Trắng" },
    { value: "#808080", label: "Xám" },
] as const;

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

const DEFAULT_TEXT_OVERLAY: TextOverlayDraft = {
    text: "Ăn Không Ngồi Rồi",
    fontFamily: "Baloo 2",
    fontSize: 52,
    fontWeight: 800,
    textColor: "#ffffff",
    strokeColor: "#111827",
    strokeWidth: 3,
    backgroundEnabled: false,
    backgroundColor: "#000000",
    backgroundOpacity: 60,
    x: 82,
    y: 10,
    start: 0,
    end: 36000,
};

function buildDraftId(prefix: string) {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random()}`;
}

function normalizeSubtitleBackgroundColor(value: string | null | undefined) {
    const normalized = (value || "").trim().toUpperCase();
    return SUBTITLE_BACKGROUND_COLOR_OPTIONS.some(
        (option) => option.value === normalized,
    )
        ? normalized
        : "#000000";
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
    const [blurEnabled, setBlurEnabled] = useState(false);
    const [coverBoxEnabled, setCoverBoxEnabled] = useState(true);
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
    const [subtitleFontSize, setSubtitleFontSize] = useState(35);
    const [subtitleMarginBottom, setSubtitleMarginBottom] = useState(150);
    const [subtitleMarginLeft, setSubtitleMarginLeft] = useState(60);
    const [subtitleMarginRight, setSubtitleMarginRight] = useState(60);
    const [subtitleAlignment, setSubtitleAlignment] = useState(2);
    const [subtitleBackgroundEnabled, setSubtitleBackgroundEnabled] =
        useState(true);
    const [subtitleBackgroundColor, setSubtitleBackgroundColor] =
        useState("#000000");
    const [subtitleBackgroundOpacity, setSubtitleBackgroundOpacity] =
        useState(50);
    const [subtitleBackgroundPaddingY, setSubtitleBackgroundPaddingY] =
        useState(8);
    const [subtitleSampleWidthPercent, setSubtitleSampleWidthPercent] =
        useState(100);
    const [subtitlePreviewPlacement, setSubtitlePreviewPlacement] = useState<{
        leftPercent: number;
        topPercent: number;
        widthPercent?: number;
        heightPercent?: number;
    } | null>(null);
    const [textOverlayEnabled, setTextOverlayEnabled] = useState(false);
    const [textOverlay, setTextOverlay] = useState<TextOverlayDraft>({
        ...DEFAULT_TEXT_OVERLAY,
    });
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
    const [isDraggingTextOverlay, setIsDraggingTextOverlay] = useState(false);
    const [textOverlayDragOffset, setTextOverlayDragOffset] = useState({
        x: 0,
        y: 0,
    });
    const [translatedSegmentsJson, setTranslatedSegmentsJson] = useState("");
    const [isRunningEdit, setIsRunningEdit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [isSavingSetup, setIsSavingSetup] = useState(false);
    const [result, setResult] = useState<
        Extract<VideoEditApiPayload, { ok: true }>["data"] | null
    >(null);
    const [assetPreview, setAssetPreview] = useState<AssetPreviewState | null>(
        null,
    );
    const previewFrameRef = useRef<HTMLDivElement | null>(null);
    const subtitleBoxRef = useRef<HTMLDivElement | null>(null);
    const subtitleTextRef = useRef<HTMLSpanElement | null>(null);
    const textOverlayBoxRef = useRef<HTMLDivElement | null>(null);
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
        setSubtitleFontSize(35);
        setSubtitleMarginBottom(150);
        setSubtitleMarginLeft(60);
        setSubtitleMarginRight(60);
        setSubtitleAlignment(2);
        setSubtitleBackgroundEnabled(true);
        setSubtitleBackgroundColor("#000000");
        setSubtitleBackgroundOpacity(50);
        setSubtitleBackgroundPaddingY(8);
        setSubtitleSampleWidthPercent(100);
        setSubtitlePreviewPlacement(null);
    }, []);

    const applyDefaultTextOverlaySetup = useCallback(() => {
        setTextOverlay({ ...DEFAULT_TEXT_OVERLAY });
    }, []);

    const updateTextOverlay = useCallback((patch: Partial<TextOverlayDraft>) => {
        setTextOverlay((current) => ({ ...current, ...patch }));
    }, []);

    const getCurrentSubtitlePreviewPlacement = useCallback(() => {
        const frame = previewFrameRef.current;
        const subtitleBox = subtitleBoxRef.current;
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
            widthPercent: subtitleBox
                ? clampNumber(
                      (subtitleBox.clientWidth / frame.clientWidth) * 100,
                      0,
                      100,
                  )
                : subtitleSampleWidthPercent,
            heightPercent: subtitleBox
                ? clampNumber(
                      (subtitleBox.clientHeight / frame.clientHeight) * 100,
                      0,
                      100,
                  )
                : undefined,
        };
    }, [subtitlePreviewPlacement, subtitleSampleWidthPercent]);

    const getCurrentSubtitlePlacementRegion =
        useCallback((): SubtitlePlacementRegion | null => {
            const frame = previewFrameRef.current;
            const subtitleBox = subtitleBoxRef.current;
            if (!frame || !subtitleBox) return null;
            if (frame.clientWidth <= 0 || frame.clientHeight <= 0) return null;
            return buildSubtitlePlacementRegionFromPreview({
                leftPx: subtitlePreviewPosRef.current.left,
                topPx: subtitlePreviewPosRef.current.top,
                frameWidth: frame.clientWidth,
                frameHeight: frame.clientHeight,
                boxWidth: subtitleBox.clientWidth,
                boxHeight: subtitleBox.clientHeight,
            });
        }, []);

    const getCurrentSubtitlePreviewLineCount = useCallback(() => {
        const textElement = subtitleTextRef.current;
        if (!textElement) return 1;
        return Math.max(1, textElement.getClientRects().length);
    }, []);

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

            const nextPlacement = buildSubtitleAssPlacementFromPreview({
                leftPx,
                topPx,
                frameWidth,
                frameHeight,
                boxWidth,
                boxHeight,
                videoWidth: videoNaturalSize.width,
                videoHeight: videoNaturalSize.height,
                subtitleFontSize,
                subtitleBackgroundPaddingY,
                lineCount: getCurrentSubtitlePreviewLineCount(),
            });

            setSubtitleAlignment(nextPlacement.subtitleAlignment);
            setSubtitleMarginLeft(nextPlacement.subtitleMarginLeft);
            setSubtitleMarginRight(nextPlacement.subtitleMarginRight);
            setSubtitleMarginBottom(nextPlacement.subtitleMarginBottom);
        },
        [
            subtitleBackgroundPaddingY,
            subtitleFontSize,
            getCurrentSubtitlePreviewLineCount,
            videoNaturalSize.height,
            videoNaturalSize.width,
        ],
    );

    const getCurrentSubtitleAssPlacement =
        useCallback((): SubtitleAssPlacement => {
            const frame = previewFrameRef.current;
            const subtitleBox = subtitleBoxRef.current;
            if (!frame || !subtitleBox) {
                return {
                    subtitleAlignment,
                    subtitleMarginLeft,
                    subtitleMarginRight,
                    subtitleMarginBottom,
                };
            }
            const frameWidth = frame.clientWidth;
            const frameHeight = frame.clientHeight;
            const boxWidth = subtitleBox.clientWidth;
            const boxHeight = subtitleBox.clientHeight;
            if (frameWidth <= 0 || frameHeight <= 0) {
                return {
                    subtitleAlignment,
                    subtitleMarginLeft,
                    subtitleMarginRight,
                    subtitleMarginBottom,
                };
            }
            return buildSubtitleAssPlacementFromPreview({
                leftPx: subtitlePreviewPosRef.current.left,
                topPx: subtitlePreviewPosRef.current.top,
                frameWidth,
                frameHeight,
                boxWidth,
                boxHeight,
                videoWidth: videoNaturalSize.width,
                videoHeight: videoNaturalSize.height,
                subtitleFontSize,
                subtitleBackgroundPaddingY,
                lineCount: getCurrentSubtitlePreviewLineCount(),
            });
        }, [
            subtitleBackgroundPaddingY,
            subtitleAlignment,
            subtitleFontSize,
            getCurrentSubtitlePreviewLineCount,
            subtitleMarginBottom,
            subtitleMarginLeft,
            subtitleMarginRight,
            videoNaturalSize.height,
            videoNaturalSize.width,
        ]);

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
        if (!isDraggingTextOverlay) return;

        const handlePointerMove = (event: MouseEvent) => {
            const frame = previewFrameRef.current;
            if (!frame) return;
            const frameRect = frame.getBoundingClientRect();
            if (frameRect.width <= 0 || frameRect.height <= 0) return;
            const centerX =
                event.clientX - frameRect.left - textOverlayDragOffset.x;
            const centerY =
                event.clientY - frameRect.top - textOverlayDragOffset.y;
            updateTextOverlay({
                x: clampNumber((centerX / frameRect.width) * 100, 0, 100),
                y: clampNumber((centerY / frameRect.height) * 100, 0, 100),
            });
        };

        const handlePointerUp = () => {
            setIsDraggingTextOverlay(false);
        };

        window.addEventListener("mousemove", handlePointerMove);
        window.addEventListener("mouseup", handlePointerUp, { once: true });
        return () => {
            window.removeEventListener("mousemove", handlePointerMove);
            window.removeEventListener("mouseup", handlePointerUp);
        };
    }, [
        isDraggingTextOverlay,
        textOverlayDragOffset.x,
        textOverlayDragOffset.y,
        updateTextOverlay,
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
        subtitleBackgroundPaddingY,
        subtitleFontFamily,
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
                setMirrorEnabled(false);
                setBlurEnabled(false);
                setCoverBoxEnabled(true);
                setSubtitleOverlayEnabled(true);
                setBlurRegions([]);
                setActiveRegionId(null);
                applyDefaultSubtitleSetup();
                setTextOverlayEnabled(false);
                applyDefaultTextOverlaySetup();
                return;
            }
            setMirrorEnabled(setup.mirrorEnabled === true);
            setBlurEnabled(setup.blurEnabled === true);
            setCoverBoxEnabled(setup.coverBoxEnabled !== false);
            setSubtitleOverlayEnabled(setup.subtitleOverlayEnabled !== false);
            setBlurRegions(
                (setup.blurRegions ?? []).map((region, index) => ({
                    id: `setup-${index}-${Date.now()}`,
                    ...region,
                })),
            );
            setSubtitleFontFamily(setup.subtitleFontFamily || "Arial");
            setSubtitleFontSize(setup.subtitleFontSize ?? 35);
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
            setSubtitleBackgroundOpacity(setup.subtitleBackgroundOpacity ?? 50);
            setSubtitleBackgroundPaddingY(setup.subtitleBackgroundPaddingY ?? 8);
            setSubtitleSampleWidthPercent(
                setup.subtitleSampleWidthPercent ?? 100,
            );
            const savedRegion = setup.subtitlePlacementRegion;
            const placement =
                savedRegion &&
                Number.isFinite(savedRegion.x) &&
                Number.isFinite(savedRegion.y)
                    ? {
                          leftPercent: Number(savedRegion.x),
                          topPercent: Number(savedRegion.y),
                          widthPercent: Number(savedRegion.width),
                          heightPercent: Number(savedRegion.height),
                      }
                    : setup.subtitlePreviewPlacement;
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
                          widthPercent: Number.isFinite(placement.widthPercent)
                              ? clampNumber(
                                    Number(placement.widthPercent),
                                    0,
                                    100,
                                )
                              : undefined,
                          heightPercent: Number.isFinite(
                              placement.heightPercent,
                          )
                              ? clampNumber(
                                    Number(placement.heightPercent),
                                    0,
                                    100,
                                )
                              : undefined,
                      }
                    : null,
            );
            setTextOverlayEnabled(setup.textOverlayEnabled === true);
            const savedTextOverlay = setup.textOverlay;
            setTextOverlay({
                ...DEFAULT_TEXT_OVERLAY,
                ...(savedTextOverlay && typeof savedTextOverlay === "object"
                    ? {
                          text:
                              typeof savedTextOverlay.text === "string"
                                  ? savedTextOverlay.text
                                  : DEFAULT_TEXT_OVERLAY.text,
                          fontFamily:
                              typeof savedTextOverlay.fontFamily === "string"
                                  ? savedTextOverlay.fontFamily
                                  : DEFAULT_TEXT_OVERLAY.fontFamily,
                          fontSize: Number.isFinite(savedTextOverlay.fontSize)
                              ? Number(savedTextOverlay.fontSize)
                              : DEFAULT_TEXT_OVERLAY.fontSize,
                          fontWeight: Number.isFinite(
                              savedTextOverlay.fontWeight,
                          )
                              ? Number(savedTextOverlay.fontWeight)
                              : DEFAULT_TEXT_OVERLAY.fontWeight,
                          textColor:
                              typeof savedTextOverlay.textColor === "string"
                                  ? savedTextOverlay.textColor
                                  : DEFAULT_TEXT_OVERLAY.textColor,
                          strokeColor:
                              typeof savedTextOverlay.strokeColor === "string"
                                  ? savedTextOverlay.strokeColor
                                  : DEFAULT_TEXT_OVERLAY.strokeColor,
                          strokeWidth: Number.isFinite(
                              savedTextOverlay.strokeWidth,
                          )
                              ? Number(savedTextOverlay.strokeWidth)
                              : DEFAULT_TEXT_OVERLAY.strokeWidth,
                          backgroundEnabled:
                              savedTextOverlay.backgroundEnabled === true,
                          backgroundColor:
                              typeof savedTextOverlay.backgroundColor ===
                              "string"
                                  ? savedTextOverlay.backgroundColor
                                  : DEFAULT_TEXT_OVERLAY.backgroundColor,
                          backgroundOpacity: Number.isFinite(
                              savedTextOverlay.backgroundOpacity,
                          )
                              ? Number(savedTextOverlay.backgroundOpacity)
                              : DEFAULT_TEXT_OVERLAY.backgroundOpacity,
                          x: Number.isFinite(savedTextOverlay.x)
                              ? Number(savedTextOverlay.x)
                              : DEFAULT_TEXT_OVERLAY.x,
                          y: Number.isFinite(savedTextOverlay.y)
                              ? Number(savedTextOverlay.y)
                              : DEFAULT_TEXT_OVERLAY.y,
                          start: Number.isFinite(savedTextOverlay.start)
                              ? Number(savedTextOverlay.start)
                              : DEFAULT_TEXT_OVERLAY.start,
                          end: Number.isFinite(savedTextOverlay.end)
                              ? Number(savedTextOverlay.end)
                              : DEFAULT_TEXT_OVERLAY.end,
                      }
                    : {}),
            });
        },
        [applyDefaultSubtitleSetup, applyDefaultTextOverlaySetup],
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
        if (!selectedAssetId && !videoFile) {
            setError(
                "Chọn Storage Asset hoặc file local trước khi lưu setup theo video.",
            );
            setSaveMessage(null);
            return;
        }
        setIsSavingSetup(true);
        setError(null);
        setSaveMessage("Đang lưu setup...");
        try {
            const subtitleAssPlacement = getCurrentSubtitleAssPlacement();
            const subtitlePlacementRegion = getCurrentSubtitlePlacementRegion();
            const videoEditSetup: VideoEditSetup = {
                mirrorEnabled,
                blurEnabled,
                coverBoxEnabled,
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
                subtitleMarginBottom: subtitleAssPlacement.subtitleMarginBottom,
                subtitleMarginLeft: subtitleAssPlacement.subtitleMarginLeft,
                subtitleMarginRight: subtitleAssPlacement.subtitleMarginRight,
                subtitleAlignment: subtitleAssPlacement.subtitleAlignment,
                subtitleBackgroundEnabled,
                subtitleBackgroundColor,
                subtitleBackgroundOpacity,
                subtitleBackgroundPaddingY,
                subtitleSampleWidthPercent,
                subtitlePreviewPlacement: getCurrentSubtitlePreviewPlacement(),
                subtitlePlacementRegion,
                textOverlayEnabled,
                textOverlay: { ...textOverlay },
            };
            if (!selectedAssetId && videoFile) {
                saveLocalVideoEditSetup({
                    file: videoFile,
                    videoEditSetup,
                });
                setError(null);
                setSaveMessage(
                    "Đã lưu setup local. Khi Workspace upload đúng file này, setup sẽ tự gắn vào asset.",
                );
                return;
            }
            const formData = new FormData();
            formData.set("videoEditSetupJson", JSON.stringify(videoEditSetup));
            if (selectedAssetId) {
                formData.set("assetId", selectedAssetId);
            }
            const response = await fetch(
                "/api/storage/assets/save-video-setup",
                {
                    method: "POST",
                    body: formData,
                },
            );
            const resultPayload = await response.json();
            if (!response.ok || !resultPayload.ok) {
                throw new Error(resultPayload.error ?? "Save setup failed.");
            }
            const responseMode =
                typeof resultPayload.data?.mode === "string"
                    ? resultPayload.data.mode
                    : "";
            const resolvedAssetId =
                typeof resultPayload.data?.assetId === "string"
                    ? resultPayload.data.assetId
                    : selectedAssetId;
            if (!resolvedAssetId) {
                throw new Error("Save setup succeeded but missing asset id.");
            }
            setSelectedAssetId(resolvedAssetId);
            setAssets((current) =>
                current.map((asset) =>
                    asset._id === resolvedAssetId
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
            setSaveMessage(
                selectedAssetId || responseMode === "existing-asset"
                    ? "Đã lưu setup vào video asset."
                    : "Đã lưu setup vào video asset.",
            );
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Save setup failed.",
            );
            setSaveMessage(null);
        } finally {
            setIsSavingSetup(false);
        }
    };

    const removeActiveRegion = () => {
        if (!activeRegionId) return;
        setBlurRegions((current) =>
            current.filter((item) => item.id !== activeRegionId),
        );
        setActiveRegionId(null);
    };

    const addDefaultSubtitleCoverBox = () => {
        const id = buildDraftId("cover");
        const next: BlurRegionDraft = {
            id,
            x: 0,
            y: 82,
            width: 100,
            height: 14,
            start: regionTimeStart,
            end: regionTimeEnd,
            strength: regionStrength,
        };
        setBlurRegions((current) => [...current, next]);
        setActiveRegionId(id);
    };

    const runCombinedEdit = async () => {
        if (!videoFile && !selectedAssetId) {
            setError(
                "Hãy upload video hoặc chọn Storage Asset trước khi chạy.",
            );
            return;
        }
        if (
            !mirrorEnabled &&
            !blurEnabled &&
            !coverBoxEnabled &&
            !subtitleOverlayEnabled &&
            !textOverlayEnabled
        ) {
            setError(
                "Hãy bật ít nhất một transform: mirror, cover, blur, subtitle hoặc text.",
            );
            return;
        }
        if (blurEnabled && !translatedSegmentsJson.trim()) {
            setError(
                "Partial Blur cần translated subtitle segments để đè phụ đề tiếng Việt.",
            );
            return;
        }
        if (subtitleOverlayEnabled && !translatedSegmentsJson.trim()) {
            setError("Subtitle overlay cần translated subtitle segments.");
            return;
        }
        if ((blurEnabled || coverBoxEnabled) && blurRegions.length === 0) {
            setError("Hãy vẽ hoặc thêm ít nhất 1 mask region trước khi chạy.");
            return;
        }
        if (textOverlayEnabled && !textOverlay.text.trim()) {
            setError("Text Overlay cần nội dung chữ.");
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
            const subtitleAssPlacement = getCurrentSubtitleAssPlacement();
            const subtitlePlacementRegion = getCurrentSubtitlePlacementRegion();
            const formData = new FormData();
            formData.set("videoFile", inputFile);
            formData.set("mirrorEnabled", String(mirrorEnabled));
            formData.set("blurEnabled", String(blurEnabled));
            formData.set("coverBoxEnabled", String(coverBoxEnabled));
            formData.set(
                "subtitleOverlayEnabled",
                String(subtitleOverlayEnabled),
            );
            formData.set("blurRegionsJson", JSON.stringify(blurRegions));
            formData.set("coverBoxesJson", JSON.stringify(blurRegions));
            formData.set("coverBoxColor", subtitleBackgroundColor);
            formData.set(
                "coverBoxOpacity",
                String(subtitleBackgroundOpacity),
            );
            formData.set("subtitleFontFamily", subtitleFontFamily);
            formData.set("subtitleFontSize", String(subtitleFontSize));
            formData.set(
                "subtitleMarginBottom",
                String(subtitleAssPlacement.subtitleMarginBottom),
            );
            formData.set(
                "subtitleMarginLeft",
                String(subtitleAssPlacement.subtitleMarginLeft),
            );
            formData.set(
                "subtitleMarginRight",
                String(subtitleAssPlacement.subtitleMarginRight),
            );
            formData.set(
                "subtitleAlignment",
                String(subtitleAssPlacement.subtitleAlignment),
            );
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
            if (subtitlePlacementRegion) {
                formData.set(
                    "subtitleRegionX",
                    String(subtitlePlacementRegion.x),
                );
                formData.set(
                    "subtitleRegionY",
                    String(subtitlePlacementRegion.y),
                );
                formData.set(
                    "subtitleRegionWidth",
                    String(subtitlePlacementRegion.width),
                );
                formData.set(
                    "subtitleRegionHeight",
                    String(subtitlePlacementRegion.height),
                );
            }
            formData.set("subtitlePlayResX", String(videoNaturalSize.width));
            formData.set("subtitlePlayResY", String(videoNaturalSize.height));
            formData.set("textOverlayEnabled", String(textOverlayEnabled));
            formData.set("textOverlayPlayResX", String(videoNaturalSize.width));
            formData.set(
                "textOverlayPlayResY",
                String(videoNaturalSize.height),
            );
            formData.set(
                "textOverlaysJson",
                JSON.stringify(textOverlayEnabled ? [textOverlay] : []),
            );
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
            <div className="grid w-full gap-4 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="space-y-3">
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
                                onChange={(event) => {
                                    const nextFile =
                                        event.currentTarget.files?.[0] ?? null;
                                    const localSetup =
                                        loadLocalVideoEditSetup(nextFile);
                                    setVideoFile(nextFile);
                                    setSelectedAssetId("");
                                    setResult(null);
                                    setError(null);
                                    if (localSetup?.videoEditSetup) {
                                        applyVideoEditSetup(
                                            localSetup.videoEditSetup,
                                        );
                                        setSaveMessage(
                                            "Đã áp dụng setup local đã lưu cho file này.",
                                        );
                                    } else {
                                        applyVideoEditSetup(null);
                                        setSaveMessage(null);
                                    }
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
                                                const isPreviewing =
                                                    assetPreview?.assetId ===
                                                    asset._id;
                                                const hasSetup =
                                                    hasSavedVideoEditSetup(
                                                        asset,
                                                    );
                                                return (
                                                    <div
                                                        key={asset._id}
                                                        className={`w-full border p-2 text-left ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main hover:bg-secondary/20"}`}
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedAssetId(
                                                                        asset._id,
                                                                    );
                                                                    setVideoFile(
                                                                        null,
                                                                    );
                                                                    setResult(
                                                                        null,
                                                                    );
                                                                    setError(
                                                                        null,
                                                                    );
                                                                    setShowAssetPicker(
                                                                        false,
                                                                    );
                                                                    setAssetPreview(
                                                                        null,
                                                                    );
                                                                    applyVideoEditSetup(
                                                                        asset
                                                                            .metadata
                                                                            ?.videoEditSetup ??
                                                                            null,
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
                                                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                                                    <AssetLifecycleBadges
                                                                        tags={
                                                                            asset
                                                                                .metadata
                                                                                ?.tags
                                                                        }
                                                                        wrap
                                                                    />
                                                                    {hasSetup ? (
                                                                        <span className="border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
                                                                            Saved setup
                                                                        </span>
                                                                    ) : null}
                                                                </div>
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
                        <div className="mt-2 grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                disabled={
                                    isSavingSetup ||
                                    (!selectedAssetId && !videoFile)
                                }
                                onClick={saveSetupToSelectedAsset}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSavingSetup
                                    ? "Saving Setup..."
                                    : "Save Setup To Asset"}
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
                            kết hợp mirror, cover box, blur, subtitle và text
                            overlay.
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
                                        Cover subtitle box
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Dùng màu nền subtitle, không chạy blur.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={coverBoxEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) => {
                                    const nextValue =
                                        event.currentTarget.checked;
                                    setCoverBoxEnabled(nextValue);
                                    if (nextValue) {
                                        setBlurEnabled(false);
                                        setSubtitleOverlayEnabled(true);
                                    }
                                }}
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <ScanLine className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Partial blur
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Chỉ bật khi thật sự cần làm mờ vùng.
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
                                        setCoverBoxEnabled(false);
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

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <Type className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Text Overlay
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Tên kênh / watermark chữ đơn giản.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={textOverlayEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) =>
                                    setTextOverlayEnabled(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        {blurEnabled || coverBoxEnabled ? (
                            <div className="grid gap-2 border border-main bg-main p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Mask regions (% of output frame)
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isRunningEdit}
                                        onClick={addDefaultSubtitleCoverBox}
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Add subtitle box
                                    </button>
                                </div>
                                <p className="text-[10px] leading-4 text-muted">
                                    Vẽ trên preview hoặc thêm nhanh một box đáy
                                    màn hình.
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
                                            Blur strength
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={regionStrength}
                                            disabled={
                                                isRunningEdit ||
                                                !blurEnabled
                                            }
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
                                                disabled={!blurEnabled}
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

                        {textOverlayEnabled ? (
                            <div className="space-y-2 border border-main bg-main p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Text Overlay
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isRunningEdit}
                                        onClick={applyDefaultTextOverlaySetup}
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Channel preset
                                    </button>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Text
                                    </span>
                                    <input
                                        value={textOverlay.text}
                                        disabled={isRunningEdit}
                                        onChange={(event) =>
                                            updateTextOverlay({
                                                text: event.currentTarget.value,
                                            })
                                        }
                                        className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                    />
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Font
                                        </span>
                                        <select
                                            value={textOverlay.fontFamily}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    fontFamily:
                                                        event.currentTarget
                                                            .value,
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        >
                                            {VIDEO_TEXT_FONT_OPTIONS.map(
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
                                            Size
                                        </span>
                                        <input
                                            type="number"
                                            min={12}
                                            max={180}
                                            value={textOverlay.fontSize}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    fontSize: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Weight
                                        </span>
                                        <input
                                            type="number"
                                            min={100}
                                            max={900}
                                            step={100}
                                            value={textOverlay.fontWeight}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    fontWeight: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Text color
                                        </span>
                                        <input
                                            type="color"
                                            value={textOverlay.textColor}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    textColor:
                                                        event.currentTarget
                                                            .value,
                                                })
                                            }
                                            className="h-8 w-full border border-main bg-secondary/30 p-1"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Stroke
                                        </span>
                                        <input
                                            type="color"
                                            value={textOverlay.strokeColor}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    strokeColor:
                                                        event.currentTarget
                                                            .value,
                                                })
                                            }
                                            className="h-8 w-full border border-main bg-secondary/30 p-1"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Stroke px
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={20}
                                            value={textOverlay.strokeWidth}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    strokeWidth: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            X %
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={textOverlay.x}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    x: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
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
                                            value={textOverlay.y}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                updateTextOverlay({
                                                    y: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <label className="flex items-center justify-between gap-3 border border-main bg-secondary/20 px-3 py-2">
                                    <span className="text-[10px] font-semibold text-muted">
                                        Text background
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={textOverlay.backgroundEnabled}
                                        disabled={isRunningEdit}
                                        onChange={(event) =>
                                            updateTextOverlay({
                                                backgroundEnabled:
                                                    event.currentTarget.checked,
                                            })
                                        }
                                        className="h-4 w-4 accent-[var(--color-accent)]"
                                    />
                                </label>
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
                                        <select
                                            value={subtitleFontFamily}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleFontFamily(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            style={{
                                                fontFamily:
                                                    getVideoTextFontFamily(
                                                        subtitleFontFamily,
                                                    ),
                                            }}
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
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
                                            min={0}
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
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Background padding Y
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={24}
                                            value={subtitleBackgroundPaddingY}
                                            disabled={
                                                isRunningEdit ||
                                                !subtitleBackgroundEnabled
                                            }
                                            onChange={(event) =>
                                                setSubtitleBackgroundPaddingY(
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
                                                (!blurEnabled &&
                                                    !coverBoxEnabled) ||
                                                isRunningEdit ||
                                                isDraggingSubtitle ||
                                                isDraggingTextOverlay
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
                                                    buildDraftId("mask");
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
                                                        getVideoTextFontFamily(
                                                            subtitleFontFamily,
                                                        ),
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
                                                            ASS_TO_CSS_FONT_DPI_RATIO,
                                                    )}px`,
                                                    lineHeight:
                                                        SUBTITLE_PREVIEW_LINE_HEIGHT,
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
                                                            Math.max(
                                                                ASS_SUBTITLE_OUTLINE,
                                                                subtitleBackgroundPaddingY,
                                                            ),
                                                    )}px`,
                                                    paddingBottom: `${Math.max(
                                                        1,
                                                        ((previewFrameRef
                                                            .current
                                                            ?.clientHeight ??
                                                            420) /
                                                            videoNaturalSize.height) *
                                                            Math.max(
                                                                ASS_SUBTITLE_OUTLINE,
                                                                subtitleBackgroundPaddingY,
                                                            ),
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
                                                <span ref={subtitleTextRef}>
                                                    Phụ đề tiếng Việt mẫu để căn
                                                    vị trí
                                                </span>
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
                                                    backgroundColor:
                                                        coverBoxEnabled
                                                            ? hexToRgba(
                                                                  subtitleBackgroundColor,
                                                                  subtitleBackgroundOpacity,
                                                              )
                                                            : undefined,
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
                                        {textOverlayEnabled ? (
                                            <div
                                                ref={textOverlayBoxRef}
                                                onMouseDown={(event) => {
                                                    if (isRunningEdit) return;
                                                    event.stopPropagation();
                                                    const boxRect =
                                                        event.currentTarget.getBoundingClientRect();
                                                    setTextOverlayDragOffset({
                                                        x:
                                                            event.clientX -
                                                            (boxRect.left +
                                                                boxRect.width /
                                                                    2),
                                                        y:
                                                            event.clientY -
                                                            (boxRect.top +
                                                                boxRect.height /
                                                                    2),
                                                    });
                                                    setIsDraggingTextOverlay(
                                                        true,
                                                    );
                                                }}
                                                className="absolute cursor-move select-none whitespace-nowrap px-1 text-center"
                                                style={{
                                                    left: `${textOverlay.x}%`,
                                                    top: `${textOverlay.y}%`,
                                                    transform:
                                                        "translate(-50%, -50%)",
                                                    fontFamily: `var(${getVideoTextFontOption(textOverlay.fontFamily).cssVariable}), ${getVideoTextFontOption(textOverlay.fontFamily).fallbackFamily}`,
                                                    fontSize: `${Math.max(
                                                        8,
                                                        ((textOverlay.fontSize *
                                                            (previewFrameRef
                                                                .current
                                                                ?.clientHeight ??
                                                                420)) /
                                                            videoNaturalSize.height) *
                                                            (72 / 96),
                                                    )}px`,
                                                    fontWeight:
                                                        textOverlay.fontWeight,
                                                    color: textOverlay.textColor,
                                                    WebkitTextStroke: `${Math.max(
                                                        0,
                                                        ((textOverlay.strokeWidth *
                                                            (previewFrameRef
                                                                .current
                                                                ?.clientHeight ??
                                                                420)) /
                                                            videoNaturalSize.height) *
                                                            (72 / 96),
                                                    )}px ${textOverlay.strokeColor}`,
                                                    paintOrder: "stroke fill",
                                                    backgroundColor:
                                                        textOverlay.backgroundEnabled
                                                            ? hexToRgba(
                                                                  textOverlay.backgroundColor,
                                                                  textOverlay.backgroundOpacity,
                                                              )
                                                            : "transparent",
                                                }}
                                            >
                                                {textOverlay.text}
                                            </div>
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
                                cover box, blur, subtitle và text overlay.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
