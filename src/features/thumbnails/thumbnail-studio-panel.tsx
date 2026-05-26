"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Copy,
    Droplets,
    Trash2,
    DownloadCloud,
    Filter,
    Scissors,
    Search,
    Sparkles,
    Type,
    X,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";
import {
    getAssetFolderName,
    matchesVideoAssetSearch,
} from "@/lib/storage/asset-folder";

type ThumbnailStudioPanelProps = {
    section: LeftbarNavItem;
};

type ThumbnailLifecycleTag = "raw" | "processed" | "has-processed-output";
type ThumbnailEditMode = "create-variant" | "overwrite";
type ThumbnailCropPreset = "none" | "16:9" | "9:16" | "1:1" | "4:5" | "custom";

type ThumbnailAsset = {
    _id: string;
    providerAssetId?: string | null;
    storageProvider?: string;
    storagePointer?: Record<string, unknown>;
    sizeBytes?: number | null;
    metadata?: {
        title?: string | null;
        folder?: string | null;
        tags?: string[] | null;
        sourceUrl?: string | null;
        width?: number | null;
        height?: number | null;
        resolution?: string | null;
    };
    createdFrom?: {
        storageProviderLabel?: string | null;
    };
    createdAt?: string;
};

type StorageProviderAccount = {
    _id: string;
    label: string;
    providerType: "telegram" | "drive";
    status: string;
};

type BlurRegionDraft = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    strength: number;
};

type CropSelectionDraft = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type TextOverlayDraft = {
    id: string;
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    strokeColor: string;
    strokeWidth: number;
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowSpread: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    x: number;
    y: number;
};

type BlurInteractionState = {
    regionId: string;
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
};

type CropInteractionState = {
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
};

type TextDragState = {
    overlayId: string;
    offsetXPercent: number;
    offsetYPercent: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
};

const LIFECYCLE_FILTERS: Array<"all" | ThumbnailLifecycleTag> = [
    "all",
    "raw",
    "processed",
    "has-processed-output",
];

const DEFAULT_BLUR_REGIONS: BlurRegionDraft[] = [];

const DEFAULT_TEXT_OVERLAYS: TextOverlayDraft[] = [];

const PRESET_CROP_OPTIONS: Array<{
    value: ThumbnailCropPreset;
    label: string;
}> = [
    { value: "none", label: "None" },
    { value: "16:9", label: "16:9 YouTube" },
    { value: "9:16", label: "9:16 Shorts" },
    { value: "1:1", label: "1:1 Square" },
    { value: "4:5", label: "4:5 Feed" },
    { value: "custom", label: "Custom" },
];

const THUMBNAIL_TEXT_FONT_OPTIONS: Array<{
    value: string;
    label: string;
    cssVariable: string;
    fallbackFamily: string;
}> = [
    {
        value: "Montserrat",
        label: "Montserrat",
        cssVariable: "--font-thumb-montserrat",
        fallbackFamily: '"Montserrat", sans-serif',
    },
    {
        value: "Bangers",
        label: "Bangers",
        cssVariable: "--font-thumb-bangers",
        fallbackFamily: '"Bangers", sans-serif',
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

const TEXT_STYLE_PRESETS: Array<{
    label: string;
    description: string;
    patch: Partial<TextOverlayDraft>;
}> = [
    {
        label: "Red glow Montserrat",
        description: "White text, black stroke, red halo.",
        patch: {
            fontFamily: "Montserrat",
            fontWeight: 900,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 5,
            shadowEnabled: true,
            shadowColor: "#ef4444",
            shadowBlur: 18,
            shadowSpread: 5,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
        },
    },
    {
        label: "Yellow glow Bangers",
        description: "Comic title with warm yellow halo.",
        patch: {
            fontFamily: "Bangers",
            fontWeight: 900,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 5,
            shadowEnabled: true,
            shadowColor: "#facc15",
            shadowBlur: 20,
            shadowSpread: 6,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
        },
    },
    {
        label: "Yellow text black",
        description: "Yellow fill, heavy black stroke, no glow.",
        patch: {
            fontFamily: "Baloo 2",
            fontWeight: 900,
            textColor: "#fde047",
            strokeColor: "#111827",
            strokeWidth: 5,
            shadowEnabled: false,
            shadowColor: "#facc15",
            shadowBlur: 0,
            shadowSpread: 0,
            shadowOffsetX: 0,
            shadowOffsetY: 0,
        },
    },
    {
        label: "Red edge Barlow",
        description: "White title with red glow edge.",
        patch: {
            fontFamily: "Prompt",
            fontWeight: 900,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 5,
            shadowEnabled: true,
            shadowColor: "#ef4444",
            shadowBlur: 12,
            shadowSpread: 4,
            shadowOffsetX: 3,
            shadowOffsetY: 3,
        },
    },
];

const QUICK_TEXT_PRESETS: Array<{
    label: string;
    text: string;
    glowColor: string;
}> = [
    { label: "FULL VERSION", text: "FULL VERSION", glowColor: "#facc15" },
    { label: "TEXT TEXT", text: "TEXT TEXT", glowColor: "#ef4444" },
    { label: "CHAP 1", text: "CHAP 1", glowColor: "#22d3ee" },
    { label: "CHAP 2", text: "CHAP 2", glowColor: "#8b5cf6" },
    { label: "NEW EP", text: "NEW EP", glowColor: "#4ade80" },
    { label: "RECAP", text: "RECAP", glowColor: "#f97316" },
];

const EDITOR_FRAME_RATIO = 16 / 9;
const EDITOR_FRAME_SIZE = { width: 1280, height: 720 };
const DEFAULT_CROP_SELECTION: CropSelectionDraft = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
};

const OUTPUT_SIZE_BY_PRESET: Record<
    Exclude<ThumbnailCropPreset, "none" | "custom">,
    { width: number; height: number }
> = {
    "16:9": { width: 1280, height: 720 },
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1080, height: 1080 },
    "4:5": { width: 1080, height: 1350 },
};

const CROP_RATIO_BY_PRESET: Record<
    Exclude<ThumbnailCropPreset, "none" | "custom">,
    number
> = {
    "16:9": 16 / 9,
    "9:16": 9 / 16,
    "1:1": 1,
    "4:5": 4 / 5,
};

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function buildId(prefix = "thumb") {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildDuplicateName(name: string) {
    const trimmed = name.trim();
    return trimmed ? `${trimmed} (Copy)` : "Untitled thumbnail (Copy)";
}

function clampPercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

function clampValue(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

function cloneDefaultBlurRegions() {
    return DEFAULT_BLUR_REGIONS.map((item) => ({ ...item }));
}

function cloneDefaultTextOverlays() {
    return DEFAULT_TEXT_OVERLAYS.map((item) => ({ ...item }));
}

function cloneDefaultCropSelection() {
    return { ...DEFAULT_CROP_SELECTION };
}

function normalizeCropSelection(
    selection?: Partial<CropSelectionDraft> | null,
) {
    const width = clampValue(Number(selection?.width) || 100, 2, 100);
    const height = clampValue(Number(selection?.height) || 100, 2, 100);
    return {
        x: clampValue(Number(selection?.x) || 0, 0, 100 - width),
        y: clampValue(Number(selection?.y) || 0, 0, 100 - height),
        width,
        height,
    };
}

function buildCenteredCropSelectionForRatio(ratio: number) {
    if (!Number.isFinite(ratio) || ratio <= 0) {
        return cloneDefaultCropSelection();
    }

    if (ratio >= EDITOR_FRAME_RATIO) {
        const height = clampValue((EDITOR_FRAME_RATIO / ratio) * 100, 2, 100);
        return {
            x: 0,
            y: (100 - height) / 2,
            width: 100,
            height,
        };
    }

    const width = clampValue((ratio / EDITOR_FRAME_RATIO) * 100, 2, 100);
    return {
        x: (100 - width) / 2,
        y: 0,
        width,
        height: 100,
    };
}

function getCropSelectionRatio(selection: CropSelectionDraft) {
    if (selection.height <= 0) return EDITOR_FRAME_RATIO;
    return (selection.width / selection.height) * EDITOR_FRAME_RATIO;
}

function getOutputSizeForCrop({
    cropPreset,
    cropSelection,
}: {
    cropPreset: ThumbnailCropPreset;
    cropSelection: CropSelectionDraft;
}) {
    if (cropPreset === "none") {
        return EDITOR_FRAME_SIZE;
    }
    if (cropPreset !== "custom") {
        return OUTPUT_SIZE_BY_PRESET[cropPreset];
    }

    const ratio = getCropSelectionRatio(cropSelection);
    if (ratio >= 1) {
        return {
            width: 1280,
            height: Math.max(1, Math.round(1280 / ratio)),
        };
    }

    return {
        width: Math.max(1, Math.round(1280 * ratio)),
        height: 1280,
    };
}

function isLegacyDefaultBlurRegion(region: BlurRegionDraft) {
    return (
        Math.abs(region.x - 8) < 0.001 &&
        Math.abs(region.y - 8) < 0.001 &&
        Math.abs(region.width - 32) < 0.001 &&
        Math.abs(region.height - 28) < 0.001 &&
        Math.abs(region.strength - 28) < 0.001
    );
}

function isLegacyDefaultTextOverlay(overlay: TextOverlayDraft) {
    return (
        overlay.text.trim() === "TEXT" &&
        overlay.fontFamily === "Montserrat" &&
        overlay.fontSize === 40 &&
        overlay.fontWeight === 800 &&
        overlay.textColor.toLowerCase() === "#ffffff" &&
        overlay.strokeColor.toLowerCase() === "#111827" &&
        overlay.strokeWidth === 0 &&
        (overlay.shadowEnabled ?? false) === false &&
        Math.abs(overlay.x - 50) < 0.001 &&
        Math.abs(overlay.y - 78) < 0.001
    );
}

function formatBlurRegionSummary(region: BlurRegionDraft, index: number) {
    return `#${index + 1} x:${region.x.toFixed(1)} y:${region.y.toFixed(1)} w:${region.width.toFixed(1)} h:${region.height.toFixed(1)} s:${region.strength}`;
}

function formatTextOverlaySummary(overlay: TextOverlayDraft, index: number) {
    const text = (overlay.text || "EMPTY").replace(/\s+/gu, " ").trim();
    const clipped = text.slice(0, 24);
    return `#${index + 1} x:${overlay.x.toFixed(1)} y:${overlay.y.toFixed(1)} z:${overlay.fontSize} w:${overlay.fontWeight} \"${clipped}\"`;
}

function parseTagsInput(value: string) {
    return Array.from(
        new Set(
            value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
        ),
    );
}

function getCenterCropRect(width: number, height: number, targetRatio: number) {
    const sourceRatio = width / height;
    if (sourceRatio > targetRatio) {
        const cropWidth = height * targetRatio;
        const left = (width - cropWidth) / 2;
        return { x: left, y: 0, width: cropWidth, height };
    }
    const cropHeight = width / targetRatio;
    const top = (height - cropHeight) / 2;
    return { x: 0, y: top, width, height: cropHeight };
}

function buildTagString(asset: ThumbnailAsset | null) {
    const tags = Array.isArray(asset?.metadata?.tags)
        ? asset?.metadata?.tags.filter(
              (entry): entry is string => typeof entry === "string",
          )
        : [];
    const nonLifecycle = tags.filter((entry) => {
        const normalized = entry.trim().toLowerCase();
        return (
            normalized !== "raw" &&
            normalized !== "processed" &&
            normalized !== "has-processed-output"
        );
    });
    return nonLifecycle.join(", ");
}

function filterLibraryLifecycleTags(tags?: string[] | null) {
    return (tags ?? []).filter((entry) => {
        const normalized = entry.trim().toLowerCase();
        return normalized !== "has-processed-output";
    });
}

function formatDateLabel(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}.${month}.${year}`;
}

function formatSizeMbLabel(sizeBytes?: number | null) {
    if (
        typeof sizeBytes !== "number" ||
        !Number.isFinite(sizeBytes) ||
        sizeBytes <= 0
    ) {
        return "- MB";
    }
    const sizeMb = sizeBytes / (1024 * 1024);
    return `${sizeMb.toFixed(1)} MB`;
}

function parseResolutionLabel(
    resolution: string | null | undefined,
): { width: number; height: number } | null {
    if (!resolution) return null;
    const normalized = resolution.trim().toLowerCase();
    const matched = normalized.match(/^(\d{2,5})x(\d{2,5})$/);
    if (!matched) return null;
    const width = Number(matched[1]);
    const height = Number(matched[2]);
    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        return null;
    }
    return { width, height };
}

function formatDimensionLabel({
    width,
    height,
}: {
    width?: number | null;
    height?: number | null;
}) {
    if (
        typeof width === "number" &&
        Number.isFinite(width) &&
        width > 0 &&
        typeof height === "number" &&
        Number.isFinite(height) &&
        height > 0
    ) {
        return `${Math.round(width)}x${Math.round(height)}`;
    }
    return "-";
}

function buildLibraryMetaLabel({
    createdAt,
    sizeBytes,
    metadata,
    previewSize,
}: {
    createdAt?: string;
    sizeBytes?: number | null;
    metadata?: ThumbnailAsset["metadata"];
    previewSize?: { width: number; height: number } | null;
}) {
    const fallbackResolution = parseResolutionLabel(metadata?.resolution);
    const dimensionLabel = formatDimensionLabel({
        width:
            previewSize?.width ?? metadata?.width ?? fallbackResolution?.width,
        height:
            previewSize?.height ??
            metadata?.height ??
            fallbackResolution?.height,
    });
    return `${formatDateLabel(createdAt)} · ${formatSizeMbLabel(sizeBytes)} · ${dimensionLabel}`;
}

function buildUploadTitleWithTime(date = new Date()) {
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");
    const second = String(date.getSeconds()).padStart(2, "0");
    return `upload ${hour}:${minute}:${second}`;
}

function getBlurPixelsFromStrength(strength: number) {
    const normalizedStrength = clampValue(strength, 0, 100);
    if (normalizedStrength <= 0) return 0;
    return Math.max(1, Math.round(normalizedStrength / 2.5));
}

function getThumbnailTextFontOption(fontFamily: string) {
    return (
        THUMBNAIL_TEXT_FONT_OPTIONS.find(
            (option) => option.value === fontFamily,
        ) ?? THUMBNAIL_TEXT_FONT_OPTIONS[0]
    );
}

function getThumbnailTextPreviewFontFamily(fontFamily: string) {
    const option = getThumbnailTextFontOption(fontFamily);
    return `var(${option.cssVariable}), ${option.fallbackFamily}`;
}

function getThumbnailTextCanvasFontFamily(fontFamily: string) {
    const option = getThumbnailTextFontOption(fontFamily);
    if (typeof document === "undefined") {
        return option.fallbackFamily;
    }

    const resolvedFontFamily = getComputedStyle(document.documentElement)
        .getPropertyValue(option.cssVariable)
        .trim();
    return resolvedFontFamily
        ? `${resolvedFontFamily}, ${option.fallbackFamily}`
        : option.fallbackFamily;
}

function buildTextGlowCss({
    shadowEnabled,
    shadowColor,
    shadowBlur,
    shadowSpread,
    shadowOffsetX,
    shadowOffsetY,
    scale = 1,
}: {
    shadowEnabled: boolean;
    shadowColor: string;
    shadowBlur: number;
    shadowSpread: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    scale?: number;
}) {
    if (!shadowEnabled) return "none";
    const blur = Math.max(0, shadowBlur * scale);
    const spread = Math.max(0, shadowSpread * scale);
    const offsetX = shadowOffsetX * scale;
    const offsetY = shadowOffsetY * scale;
    return [
        `0 0 ${spread}px ${shadowColor}`,
        `0 0 ${Math.max(spread, blur * 0.55)}px ${shadowColor}`,
        `${offsetX}px ${offsetY}px ${blur}px ${shadowColor}`,
    ].join(", ");
}

async function loadImage(url: string) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
            reject(new Error("Cannot load thumbnail source image."));
        image.src = url;
    });

    return image;
}

async function renderThumbnailBlob({
    sourceUrl,
    cropPreset,
    cropSelection,
    blurRegions,
    textOverlays,
}: {
    sourceUrl: string;
    cropPreset: ThumbnailCropPreset;
    cropSelection: CropSelectionDraft;
    blurRegions: BlurRegionDraft[];
    textOverlays: TextOverlayDraft[];
}) {
    const image = await loadImage(sourceUrl);
    const outputSize = getOutputSizeForCrop({ cropPreset, cropSelection });
    const targetRatio = EDITOR_FRAME_RATIO;
    const cropRect = getCenterCropRect(
        image.naturalWidth,
        image.naturalHeight,
        targetRatio,
    );
    const baseCanvas = document.createElement("canvas");
    baseCanvas.width = EDITOR_FRAME_SIZE.width;
    baseCanvas.height = EDITOR_FRAME_SIZE.height;

    const context = baseCanvas.getContext("2d");
    if (!context) {
        throw new Error("Cannot initialize thumbnail canvas renderer.");
    }

    context.drawImage(
        image,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
        0,
        0,
        EDITOR_FRAME_SIZE.width,
        EDITOR_FRAME_SIZE.height,
    );

    if (blurRegions.length > 0) {
        for (const region of blurRegions) {
            const regionX = Math.round(
                (region.x / 100) * EDITOR_FRAME_SIZE.width,
            );
            const regionY = Math.round(
                (region.y / 100) * EDITOR_FRAME_SIZE.height,
            );
            const regionWidth = Math.max(
                1,
                Math.round((region.width / 100) * EDITOR_FRAME_SIZE.width),
            );
            const regionHeight = Math.max(
                1,
                Math.round((region.height / 100) * EDITOR_FRAME_SIZE.height),
            );
            const blurPixels = getBlurPixelsFromStrength(region.strength);
            if (blurPixels <= 0) continue;
            const samplePadding = Math.max(4, Math.ceil(blurPixels * 2));
            const sampleX = Math.max(0, regionX - samplePadding);
            const sampleY = Math.max(0, regionY - samplePadding);
            const sampleRight = Math.min(
                EDITOR_FRAME_SIZE.width,
                regionX + regionWidth + samplePadding,
            );
            const sampleBottom = Math.min(
                EDITOR_FRAME_SIZE.height,
                regionY + regionHeight + samplePadding,
            );
            const sampleWidth = Math.max(1, sampleRight - sampleX);
            const sampleHeight = Math.max(1, sampleBottom - sampleY);

            const sampleCanvas = document.createElement("canvas");
            sampleCanvas.width = sampleWidth;
            sampleCanvas.height = sampleHeight;
            const sampleContext = sampleCanvas.getContext("2d");
            if (!sampleContext) continue;

            sampleContext.drawImage(
                baseCanvas,
                sampleX,
                sampleY,
                sampleWidth,
                sampleHeight,
                0,
                0,
                sampleWidth,
                sampleHeight,
            );

            const blurredCanvas = document.createElement("canvas");
            blurredCanvas.width = sampleWidth;
            blurredCanvas.height = sampleHeight;
            const blurredContext = blurredCanvas.getContext("2d");
            if (!blurredContext) continue;

            blurredContext.filter = `blur(${blurPixels}px)`;
            blurredContext.drawImage(sampleCanvas, 0, 0);

            context.save();
            context.beginPath();
            context.rect(regionX, regionY, regionWidth, regionHeight);
            context.clip();
            context.drawImage(
                blurredCanvas,
                sampleX,
                sampleY,
                sampleWidth,
                sampleHeight,
            );
            context.restore();
        }
    }

    const fontScale = EDITOR_FRAME_SIZE.height / 720;
    for (const overlay of textOverlays) {
        const text = overlay.text || "";
        if (!text.trim()) continue;

        const x = (overlay.x / 100) * EDITOR_FRAME_SIZE.width;
        const y = (overlay.y / 100) * EDITOR_FRAME_SIZE.height;
        const fontSize = Math.max(12, Math.round(overlay.fontSize * fontScale));
        const strokeWidth = Math.max(
            0,
            Math.round(overlay.strokeWidth * fontScale),
        );
        const canvasFontFamily = getThumbnailTextCanvasFontFamily(
            overlay.fontFamily,
        );

        if ("fonts" in document && typeof document.fonts?.load === "function") {
            await document.fonts.load(
                `${overlay.fontWeight} ${fontSize}px ${canvasFontFamily}`,
            );
        }

        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillStyle = overlay.textColor;
        context.strokeStyle = overlay.strokeColor;
        context.lineJoin = "round";
        context.lineWidth = strokeWidth;
        context.font = `${overlay.fontWeight} ${fontSize}px ${canvasFontFamily}`;
        const shadowEnabled = overlay.shadowEnabled ?? false;
        const shadowBlur = overlay.shadowBlur ?? 0;
        const shadowSpread = overlay.shadowSpread ?? 0;
        const shadowOffsetX = overlay.shadowOffsetX ?? 0;
        const shadowOffsetY = overlay.shadowOffsetY ?? 0;
        const shadowColor = overlay.shadowColor ?? "#facc15";

        const lines = text.split("\n");
        const lineHeight = Math.round(fontSize * 1.2);
        const startY = y - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
            const lineY = startY + index * lineHeight;
            if (shadowEnabled) {
                context.save();
                context.textAlign = "center";
                context.textBaseline = "middle";
                context.font = `${overlay.fontWeight} ${fontSize}px ${canvasFontFamily}`;
                context.lineJoin = "round";
                context.strokeStyle = shadowColor;
                context.lineWidth =
                    strokeWidth + Math.max(1, shadowSpread * fontScale * 2);
                context.shadowColor = shadowColor;
                context.shadowBlur = Math.max(
                    0,
                    Math.round(shadowBlur * fontScale),
                );
                context.shadowOffsetX = shadowOffsetX * fontScale;
                context.shadowOffsetY = shadowOffsetY * fontScale;
                context.strokeText(line, x, lineY);
                context.restore();
            }

            context.shadowColor = "transparent";
            context.shadowBlur = 0;
            context.shadowOffsetX = 0;
            context.shadowOffsetY = 0;
            context.fillText(line, x, lineY);
            if (strokeWidth > 0) {
                context.strokeText(line, x, lineY);
            }
        });
    }

    const activeCropSelection =
        cropPreset === "none" ? cloneDefaultCropSelection() : cropSelection;
    const cropSourceX = Math.round(
        (activeCropSelection.x / 100) * EDITOR_FRAME_SIZE.width,
    );
    const cropSourceY = Math.round(
        (activeCropSelection.y / 100) * EDITOR_FRAME_SIZE.height,
    );
    const cropSourceWidth = Math.max(
        1,
        Math.round((activeCropSelection.width / 100) * EDITOR_FRAME_SIZE.width),
    );
    const cropSourceHeight = Math.max(
        1,
        Math.round(
            (activeCropSelection.height / 100) * EDITOR_FRAME_SIZE.height,
        ),
    );
    const canvas = document.createElement("canvas");
    canvas.width = outputSize.width;
    canvas.height = outputSize.height;
    const outputContext = canvas.getContext("2d");
    if (!outputContext) {
        throw new Error("Cannot initialize thumbnail crop renderer.");
    }
    outputContext.drawImage(
        baseCanvas,
        cropSourceX,
        cropSourceY,
        cropSourceWidth,
        cropSourceHeight,
        0,
        0,
        outputSize.width,
        outputSize.height,
    );

    const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), "image/png", 0.95);
    });

    if (!blob) {
        throw new Error("Cannot export rendered thumbnail image.");
    }

    return blob;
}

const BLUR_RESIZE_HANDLES: Array<{
    mode: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    className: string;
}> = [
    {
        mode: "n",
        className:
            "left-1/2 top-0 h-3 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "s",
        className:
            "left-1/2 bottom-0 h-3 w-8 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "e",
        className:
            "right-0 top-1/2 h-8 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "w",
        className:
            "left-0 top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "ne",
        className:
            "right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    },
    {
        mode: "nw",
        className:
            "left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "se",
        className:
            "right-0 bottom-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "sw",
        className:
            "left-0 bottom-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    },
];

const CROP_RESIZE_HANDLES: Array<{
    mode: CropInteractionState["mode"];
    className: string;
}> = [
    {
        mode: "n",
        className:
            "left-1/2 top-0 h-4 w-12 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "s",
        className:
            "left-1/2 bottom-0 h-4 w-12 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "e",
        className:
            "right-0 top-1/2 h-12 w-4 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "w",
        className:
            "left-0 top-1/2 h-12 w-4 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "ne",
        className:
            "right-0 top-0 h-5 w-5 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    },
    {
        mode: "nw",
        className:
            "left-0 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "se",
        className:
            "right-0 bottom-0 h-5 w-5 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "sw",
        className:
            "left-0 bottom-0 h-5 w-5 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    },
];

export function ThumbnailStudioPanel({
    section: _section,
}: ThumbnailStudioPanelProps) {
    const [thumbnails, setThumbnails] = useState<ThumbnailAsset[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedThumbnailId, setSelectedThumbnailId] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [lifecycleFilter, setLifecycleFilter] = useState<
        "all" | ThumbnailLifecycleTag
    >("all");
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [importMessage, setImportMessage] = useState("Ready.");
    const [storageAccounts, setStorageAccounts] = useState<
        StorageProviderAccount[]
    >([]);
    const [selectedStorageAccountId, setSelectedStorageAccountId] =
        useState("");

    const [thumbnailName, setThumbnailName] = useState("Untitled thumbnail");
    const [folderName, setFolderName] = useState("thumbnails");
    const [tagsInput, setTagsInput] = useState("");

    const [editMode, setEditMode] =
        useState<ThumbnailEditMode>("create-variant");
    const [cropPreset, setCropPreset] = useState<ThumbnailCropPreset>("none");
    const [cropSelection, setCropSelection] = useState<CropSelectionDraft>(
        cloneDefaultCropSelection(),
    );
    const [blurRegions, setBlurRegions] = useState<BlurRegionDraft[]>(
        cloneDefaultBlurRegions(),
    );
    const [activeBlurRegionId, setActiveBlurRegionId] = useState(
        DEFAULT_BLUR_REGIONS[0]?.id ?? "",
    );
    const [textOverlays, setTextOverlays] = useState<TextOverlayDraft[]>(
        cloneDefaultTextOverlays(),
    );
    const [activeTextOverlayId, setActiveTextOverlayId] = useState(
        DEFAULT_TEXT_OVERLAYS[0]?.id ?? "",
    );
    const [editingTextOverlayId, setEditingTextOverlayId] = useState<
        string | null
    >(null);
    const [textDragState, setTextDragState] = useState<TextDragState | null>(
        null,
    );
    const [blurInteraction, setBlurInteraction] =
        useState<BlurInteractionState | null>(null);
    const [cropInteraction, setCropInteraction] =
        useState<CropInteractionState | null>(null);
    const [thumbnailPreviewSizes, setThumbnailPreviewSizes] = useState<
        Record<string, { width: number; height: number }>
    >({});
    const [editingLibraryTitleId, setEditingLibraryTitleId] = useState<
        string | null
    >(null);
    const [editingLibraryTitleValue, setEditingLibraryTitleValue] =
        useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [previewFrameHeight, setPreviewFrameHeight] = useState(
        EDITOR_FRAME_SIZE.height,
    );

    const previewFrameRef = useRef<HTMLDivElement | null>(null);
    const uploadFileInputRef = useRef<HTMLInputElement | null>(null);

    const fetchThumbnails = async (targetAssetId?: string) => {
        setIsLoading(true);
        try {
            const response = await fetch(
                "/api/storage/thumbnail-assets?limit=200",
                {
                    method: "GET",
                    cache: "no-store",
                },
            );
            const payload = (await response.json()) as {
                ok: boolean;
                data?: ThumbnailAsset[];
                error?: string;
            };

            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(
                    payload.error ?? "Cannot load thumbnail library.",
                );
            }

            const data = payload.data;
            setThumbnails(data);
            setThumbnailPreviewSizes((current) => {
                const next: Record<string, { width: number; height: number }> =
                    {};
                for (const thumbnail of data) {
                    const existing = current[thumbnail._id];
                    if (existing) {
                        next[thumbnail._id] = existing;
                    }
                }
                return next;
            });
            setSelectedThumbnailId((current) => {
                if (targetAssetId) return targetAssetId;
                if (current && data.some((item) => item._id === current)) {
                    return current;
                }
                return data[0]?._id ?? "";
            });
        } catch (error) {
            setImportMessage(
                error instanceof Error
                    ? error.message
                    : "Cannot load thumbnail library.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStorageAccounts = async () => {
        try {
            const response = await fetch("/api/storage/providers", {
                method: "GET",
                cache: "no-store",
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: StorageProviderAccount[];
            };

            if (!response.ok || !payload.ok || !payload.data) {
                return;
            }

            const uploadableAccounts = payload.data.filter(
                (account) =>
                    (account.providerType === "drive" ||
                        account.providerType === "telegram") &&
                    account.status !== "error",
            );
            setStorageAccounts(uploadableAccounts);
            setSelectedStorageAccountId(
                (current) => current || uploadableAccounts[0]?._id || "",
            );
        } catch {
            // best effort; UI will show empty account state
        }
    };

    useEffect(() => {
        fetchStorageAccounts();
        fetchThumbnails();
    }, []);

    useEffect(() => {
        const frame = previewFrameRef.current;
        if (!frame) return;

        const syncPreviewFrameHeight = () => {
            const bounds = frame.getBoundingClientRect();
            if (bounds.height > 0) {
                setPreviewFrameHeight(bounds.height);
            }
        };

        syncPreviewFrameHeight();

        if (typeof ResizeObserver === "undefined") return;

        const observer = new ResizeObserver(syncPreviewFrameHeight);
        observer.observe(frame);
        return () => observer.disconnect();
    }, []);

    const selectedThumbnail =
        thumbnails.find((item) => item._id === selectedThumbnailId) ?? null;

    const selectedThumbnailPreviewUrl = selectedThumbnail
        ? `/api/storage/thumbnail-assets/${selectedThumbnail._id}/download?disposition=inline&ts=${encodeURIComponent(selectedThumbnail.createdAt ?? "")}`
        : null;
    const selectedThumbnailDownloadUrl = selectedThumbnail
        ? `/api/storage/thumbnail-assets/${selectedThumbnail._id}/download?disposition=attachment&ts=${encodeURIComponent(selectedThumbnail.createdAt ?? "")}`
        : null;
    const selectedThumbnailNameHint =
        selectedThumbnail?.metadata?.title?.trim() ||
        thumbnailName.trim() ||
        "-";

    useEffect(() => {
        if (!selectedThumbnail) {
            setThumbnailName("Untitled thumbnail");
            setFolderName("thumbnails");
            setTagsInput("");
            setCropPreset("none");
            setCropSelection(cloneDefaultCropSelection());
            setBlurRegions([]);
            setActiveBlurRegionId("");
            setTextOverlays([]);
            setActiveTextOverlayId("");
            return;
        }

        setThumbnailName(
            selectedThumbnail.metadata?.title?.trim() || "Untitled thumbnail",
        );
        setFolderName(getAssetFolderName(selectedThumbnail) || "thumbnails");
        setTagsInput(buildTagString(selectedThumbnail));
        setCropPreset("none");
        setCropSelection(cloneDefaultCropSelection());
        setBlurRegions([]);
        setActiveBlurRegionId("");
        setTextOverlays([]);
        setActiveTextOverlayId("");
    }, [selectedThumbnail?._id]);

    useEffect(() => {
        setEditingLibraryTitleId(null);
        setEditingLibraryTitleValue("");
    }, [selectedThumbnailId]);

    const visibleThumbnails = useMemo(() => {
        const lifecycleFiltered = thumbnails.filter((thumbnail) => {
            const tags = Array.isArray(thumbnail.metadata?.tags)
                ? thumbnail.metadata.tags.filter(
                      (entry): entry is string => typeof entry === "string",
                  )
                : [];
            if (lifecycleFilter === "all") {
                return true;
            }
            return tags.some(
                (tag) => tag.trim().toLowerCase() === lifecycleFilter,
            );
        });

        return lifecycleFiltered.filter((thumbnail) =>
            matchesVideoAssetSearch(
                {
                    _id: thumbnail._id,
                    providerAssetId: thumbnail.providerAssetId,
                    metadata: {
                        title: thumbnail.metadata?.title,
                        folder: thumbnail.metadata?.folder,
                        tags: thumbnail.metadata?.tags,
                        sourceUrl: thumbnail.metadata?.sourceUrl,
                    },
                },
                searchQuery,
            ),
        );
    }, [lifecycleFilter, searchQuery, thumbnails]);

    const activeBlurRegion =
        blurRegions.find((item) => item.id === activeBlurRegionId) ?? null;
    const activeTextOverlay =
        textOverlays.find((item) => item.id === activeTextOverlayId) ?? null;
    const previewTextScale = Math.max(
        0.01,
        previewFrameHeight / EDITOR_FRAME_SIZE.height,
    );

    const updateActiveBlurRegion = (patch: Partial<BlurRegionDraft>) => {
        if (!activeBlurRegion) return;
        setBlurRegions((current) =>
            current.map((item) => {
                if (item.id !== activeBlurRegion.id) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    width:
                        patch.width === undefined
                            ? item.width
                            : clampPercent(Number(patch.width)),
                    height:
                        patch.height === undefined
                            ? item.height
                            : clampPercent(Number(patch.height)),
                    strength:
                        patch.strength === undefined
                            ? item.strength
                            : clampValue(Number(patch.strength), 0, 100),
                };
            }),
        );
    };

    const updateActiveTextOverlay = (patch: Partial<TextOverlayDraft>) => {
        if (!activeTextOverlay) return;
        setTextOverlays((current) =>
            current.map((item) => {
                if (item.id !== activeTextOverlay.id) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    fontSize:
                        patch.fontSize === undefined
                            ? item.fontSize
                            : clampValue(Number(patch.fontSize), 10, 140),
                    fontWeight:
                        patch.fontWeight === undefined
                            ? item.fontWeight
                            : clampValue(Number(patch.fontWeight), 600, 900),
                    strokeWidth:
                        patch.strokeWidth === undefined
                            ? item.strokeWidth
                            : clampValue(Number(patch.strokeWidth), 0, 12),
                    shadowBlur:
                        patch.shadowBlur === undefined
                            ? item.shadowBlur
                            : clampValue(Number(patch.shadowBlur), 0, 80),
                    shadowSpread:
                        patch.shadowSpread === undefined
                            ? item.shadowSpread
                            : clampValue(Number(patch.shadowSpread), 0, 40),
                    shadowOffsetX:
                        patch.shadowOffsetX === undefined
                            ? item.shadowOffsetX
                            : clampValue(Number(patch.shadowOffsetX), -60, 60),
                    shadowOffsetY:
                        patch.shadowOffsetY === undefined
                            ? item.shadowOffsetY
                            : clampValue(Number(patch.shadowOffsetY), -60, 60),
                };
            }),
        );
    };

    const updateTextOverlayById = (
        overlayId: string,
        patch: Partial<TextOverlayDraft>,
    ) => {
        setTextOverlays((current) =>
            current.map((item) => {
                if (item.id !== overlayId) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    fontSize:
                        patch.fontSize === undefined
                            ? item.fontSize
                            : clampValue(Number(patch.fontSize), 10, 140),
                    fontWeight:
                        patch.fontWeight === undefined
                            ? item.fontWeight
                            : clampValue(Number(patch.fontWeight), 600, 900),
                    strokeWidth:
                        patch.strokeWidth === undefined
                            ? item.strokeWidth
                            : clampValue(Number(patch.strokeWidth), 0, 12),
                    shadowBlur:
                        patch.shadowBlur === undefined
                            ? item.shadowBlur
                            : clampValue(Number(patch.shadowBlur), 0, 80),
                    shadowSpread:
                        patch.shadowSpread === undefined
                            ? item.shadowSpread
                            : clampValue(Number(patch.shadowSpread), 0, 40),
                    shadowOffsetX:
                        patch.shadowOffsetX === undefined
                            ? item.shadowOffsetX
                            : clampValue(Number(patch.shadowOffsetX), -60, 60),
                    shadowOffsetY:
                        patch.shadowOffsetY === undefined
                            ? item.shadowOffsetY
                            : clampValue(Number(patch.shadowOffsetY), -60, 60),
                };
            }),
        );
    };

    const addBlurRegion = () => {
        const nextRegion: BlurRegionDraft = {
            id: buildId("blur"),
            x: 10,
            y: 10,
            width: 20,
            height: 10,
            strength: 50,
        };
        setBlurRegions((current) => [...current, nextRegion]);
        setActiveBlurRegionId(nextRegion.id);
    };

    const removeBlurRegionById = (regionId: string) => {
        setBlurRegions((current) => {
            const remaining = current.filter((item) => item.id !== regionId);
            setActiveBlurRegionId((currentActive) =>
                currentActive === regionId
                    ? (remaining[0]?.id ?? "")
                    : currentActive,
            );
            return remaining;
        });
    };

    const addTextOverlay = (preset?: Partial<TextOverlayDraft>) => {
        const nextTextOverlay: TextOverlayDraft = {
            id: buildId("text"),
            text: preset?.text ?? "NEW TEXT",
            fontFamily: "Montserrat",
            fontSize: 40,
            fontWeight: 800,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 5,
            shadowEnabled: true,
            shadowColor: "#facc15",
            shadowBlur: 18,
            shadowSpread: 5,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
            x: 50,
            y: 70,
            ...preset,
        };
        setTextOverlays((current) => [...current, nextTextOverlay]);
        setActiveTextOverlayId(nextTextOverlay.id);
    };

    const applyTextStylePreset = (preset: {
        label: string;
        patch: Partial<TextOverlayDraft>;
    }) => {
        addTextOverlay({
            text: preset.label,
            ...preset.patch,
        });
    };

    const applyQuickTextPreset = (preset: {
        text: string;
        glowColor: string;
    }) => {
        addTextOverlay({
            text: preset.text,
            fontFamily: "Bangers",
            fontSize: 70,
            fontWeight: 900,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 1,
            shadowEnabled: true,
            shadowColor: preset.glowColor,
            shadowBlur: 20,
            shadowSpread: 6,
            shadowOffsetX: 0,
            shadowOffsetY: 2,
        });
    };

    const removeTextOverlayById = (overlayId: string) => {
        setTextOverlays((current) => {
            const remaining = current.filter((item) => item.id !== overlayId);
            setActiveTextOverlayId((currentActive) =>
                currentActive === overlayId
                    ? (remaining[0]?.id ?? "")
                    : currentActive,
            );
            return remaining;
        });
    };

    const handleCanvasTextDrag = (
        overlayId: string,
        clientX: number,
        clientY: number,
    ) => {
        if (!textDragState || textDragState.overlayId !== overlayId) return;
        const frame = previewFrameRef.current;
        if (!frame) return;
        const bounds = frame.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const xPercent = ((clientX - bounds.left) / bounds.width) * 100;
        const yPercent = ((clientY - bounds.top) / bounds.height) * 100;
        updateTextOverlayById(overlayId, {
            x: clampPercent(xPercent - textDragState.offsetXPercent),
            y: clampPercent(yPercent - textDragState.offsetYPercent),
        });
    };

    const startBlurInteraction = (
        event: {
            clientX: number;
            clientY: number;
            preventDefault: () => void;
            stopPropagation: () => void;
        },
        region: BlurRegionDraft,
        mode: BlurInteractionState["mode"],
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setTextDragState(null);
        setEditingTextOverlayId(null);
        setActiveBlurRegionId(region.id);
        setBlurInteraction({
            regionId: region.id,
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: region.x,
            startY: region.y,
            startWidth: region.width,
            startHeight: region.height,
        });
    };

    const applyCropPreset = (preset: ThumbnailCropPreset) => {
        setCropPreset(preset);
        setCropInteraction(null);
        if (preset === "none") {
            setCropSelection(cloneDefaultCropSelection());
            return;
        }
        if (preset === "custom") {
            setCropSelection((current) => normalizeCropSelection(current));
            return;
        }
        setCropSelection(
            buildCenteredCropSelectionForRatio(CROP_RATIO_BY_PRESET[preset]),
        );
    };

    const startCropInteraction = (
        event: {
            clientX: number;
            clientY: number;
            preventDefault: () => void;
            stopPropagation: () => void;
        },
        mode: CropInteractionState["mode"],
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setTextDragState(null);
        setBlurInteraction(null);
        setEditingTextOverlayId(null);
        setCropInteraction({
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: cropSelection.x,
            startY: cropSelection.y,
            startWidth: cropSelection.width,
            startHeight: cropSelection.height,
        });
    };

    const buildFreeCropResize = (
        interaction: CropInteractionState,
        deltaXPercent: number,
        deltaYPercent: number,
    ) => {
        const minSize = 4;
        const horizontalMode = interaction.mode.includes("e")
            ? "e"
            : interaction.mode.includes("w")
              ? "w"
              : null;
        const verticalMode = interaction.mode.includes("s")
            ? "s"
            : interaction.mode.includes("n")
              ? "n"
              : null;
        const startLeft = interaction.startX;
        const startTop = interaction.startY;
        const startRight = startLeft + interaction.startWidth;
        const startBottom = startTop + interaction.startHeight;
        let nextLeft = startLeft;
        let nextRight = startRight;
        let nextTop = startTop;
        let nextBottom = startBottom;

        if (horizontalMode === "e") {
            nextRight = clampValue(
                startRight + deltaXPercent,
                startLeft + minSize,
                100,
            );
        } else if (horizontalMode === "w") {
            nextLeft = clampValue(
                startLeft + deltaXPercent,
                0,
                startRight - minSize,
            );
        }

        if (verticalMode === "s") {
            nextBottom = clampValue(
                startBottom + deltaYPercent,
                startTop + minSize,
                100,
            );
        } else if (verticalMode === "n") {
            nextTop = clampValue(
                startTop + deltaYPercent,
                0,
                startBottom - minSize,
            );
        }

        return {
            x: nextLeft,
            y: nextTop,
            width: nextRight - nextLeft,
            height: nextBottom - nextTop,
        };
    };

    const buildRatioLockedCropResize = (
        interaction: CropInteractionState,
        deltaXPercent: number,
        deltaYPercent: number,
        ratio: number,
    ) => {
        const minSize = 4;
        const horizontalMode = interaction.mode.includes("e")
            ? "e"
            : interaction.mode.includes("w")
              ? "w"
              : null;
        const verticalMode = interaction.mode.includes("s")
            ? "s"
            : interaction.mode.includes("n")
              ? "n"
              : null;
        let nextWidth = interaction.startWidth;
        let nextHeight = interaction.startHeight;
        const widthFromHeight = (height: number) =>
            (height * ratio) / EDITOR_FRAME_RATIO;
        const heightFromWidth = (width: number) =>
            (width * EDITOR_FRAME_RATIO) / ratio;

        if (
            horizontalMode &&
            (!verticalMode ||
                Math.abs(deltaXPercent) >= Math.abs(deltaYPercent))
        ) {
            const rawWidth =
                horizontalMode === "e"
                    ? interaction.startWidth + deltaXPercent
                    : interaction.startWidth - deltaXPercent;
            nextWidth = clampValue(rawWidth, minSize, 100);
            nextHeight = heightFromWidth(nextWidth);
        } else {
            const rawHeight =
                verticalMode === "s"
                    ? interaction.startHeight + deltaYPercent
                    : interaction.startHeight - deltaYPercent;
            nextHeight = clampValue(rawHeight, minSize, 100);
            nextWidth = widthFromHeight(nextHeight);
        }

        if (nextWidth > 100) {
            nextWidth = 100;
            nextHeight = heightFromWidth(nextWidth);
        }
        if (nextHeight > 100) {
            nextHeight = 100;
            nextWidth = widthFromHeight(nextHeight);
        }

        let nextX =
            horizontalMode === "w"
                ? interaction.startX + interaction.startWidth - nextWidth
                : horizontalMode === "e"
                  ? interaction.startX
                  : interaction.startX +
                    (interaction.startWidth - nextWidth) / 2;
        let nextY =
            verticalMode === "n"
                ? interaction.startY + interaction.startHeight - nextHeight
                : verticalMode === "s"
                  ? interaction.startY
                  : interaction.startY +
                    (interaction.startHeight - nextHeight) / 2;

        nextX = clampValue(nextX, 0, 100 - nextWidth);
        nextY = clampValue(nextY, 0, 100 - nextHeight);
        return normalizeCropSelection({
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
        });
    };

    const handleCropPointerMove = (
        clientX: number,
        clientY: number,
        bounds: DOMRect,
    ) => {
        if (
            !cropInteraction ||
            cropPreset === "none" ||
            bounds.width <= 0 ||
            bounds.height <= 0
        ) {
            return;
        }
        const deltaXPercent =
            ((clientX - cropInteraction.startClientX) / bounds.width) * 100;
        const deltaYPercent =
            ((clientY - cropInteraction.startClientY) / bounds.height) * 100;

        if (cropInteraction.mode === "move") {
            setCropSelection((current) => ({
                ...current,
                x: clampValue(
                    cropInteraction.startX + deltaXPercent,
                    0,
                    100 - current.width,
                ),
                y: clampValue(
                    cropInteraction.startY + deltaYPercent,
                    0,
                    100 - current.height,
                ),
            }));
            return;
        }

        const nextSelection =
            cropPreset === "custom"
                ? buildFreeCropResize(
                      cropInteraction,
                      deltaXPercent,
                      deltaYPercent,
                  )
                : buildRatioLockedCropResize(
                      cropInteraction,
                      deltaXPercent,
                      deltaYPercent,
                      CROP_RATIO_BY_PRESET[cropPreset],
                  );
        setCropSelection(normalizeCropSelection(nextSelection));
    };

    const handleResetEditor = () => {
        setEditMode("create-variant");
        setCropPreset("none");
        setCropSelection(cloneDefaultCropSelection());
        const resetBlur = cloneDefaultBlurRegions();
        const resetText = cloneDefaultTextOverlays();
        setBlurRegions(resetBlur);
        setActiveBlurRegionId(resetBlur[0]?.id ?? "");
        setTextOverlays(resetText);
        setActiveTextOverlayId(resetText[0]?.id ?? "");
        setEditingTextOverlayId(null);
        setTextDragState(null);
        setBlurInteraction(null);
        setCropInteraction(null);
        setImportMessage("Editor reset to default.");
    };

    const uploadThumbnailFile = async ({
        file,
        sourceUrl,
        title,
        lifecycle,
        overwriteAssetId,
        selectAssetIdAfterUpload,
    }: {
        file?: File;
        sourceUrl?: string;
        title: string;
        lifecycle: "raw" | "processed";
        overwriteAssetId?: string;
        selectAssetIdAfterUpload?: string;
    }) => {
        if (!selectedStorageAccountId) {
            setImportMessage(
                "Please select a storage account before importing/saving.",
            );
            return;
        }

        const formData = new FormData();
        formData.set("storageProviderAccountId", selectedStorageAccountId);
        formData.set("title", title);
        formData.set("folder", folderName || "thumbnails");
        formData.set("tags", parseTagsInput(tagsInput).join(","));
        formData.set("lifecycle", lifecycle);
        if (sourceUrl) {
            formData.set("sourceUrl", sourceUrl);
        }
        if (file) {
            formData.set("thumbnailFile", file);
        }
        if (selectedThumbnailId) {
            formData.set("sourceAssetId", selectedThumbnailId);
        }
        if (overwriteAssetId) {
            formData.set("overwriteAssetId", overwriteAssetId);
        }
        const response = await fetch("/api/storage/thumbnail-assets", {
            method: "POST",
            body: formData,
        });
        const payload = (await response.json()) as {
            ok: boolean;
            data?: { _id: string };
            error?: string;
        };

        if (!response.ok || !payload.ok || !payload.data) {
            throw new Error(payload.error ?? "Thumbnail upload failed.");
        }

        await fetchThumbnails(selectAssetIdAfterUpload ?? payload.data._id);
    };

    const handleDropUpload = async (file: File | null) => {
        if (!file) return;
        try {
            setImportMessage("Uploading image to storage...");
            await uploadThumbnailFile({
                file,
                title: buildUploadTitleWithTime(),
                lifecycle: "raw",
            });
            setImportMessage("Imported image and saved to storage.");
        } catch (error) {
            setImportMessage(
                error instanceof Error ? error.message : "Import failed.",
            );
        }
    };

    const handleImportFromUrl = async () => {
        if (!importUrl.trim()) {
            setImportMessage("Please input an image URL first.");
            return;
        }

        try {
            setImportMessage("Downloading URL and uploading to storage...");
            await uploadThumbnailFile({
                sourceUrl: importUrl.trim(),
                title: importUrl.trim(),
                lifecycle: "raw",
            });
            setImportUrl("");
            setImportMessage("Imported image URL and saved to storage.");
        } catch (error) {
            setImportMessage(
                error instanceof Error ? error.message : "Import URL failed.",
            );
        }
    };

    const handleInlineTitleRename = async ({
        thumbnailId,
        nextTitle,
    }: {
        thumbnailId: string;
        nextTitle: string;
    }) => {
        const trimmedTitle = nextTitle.trim();
        if (!trimmedTitle) {
            setEditingLibraryTitleId(null);
            setEditingLibraryTitleValue("");
            return;
        }
        try {
            const response = await fetch(
                `/api/storage/thumbnail-assets/${thumbnailId}`,
                {
                    method: "PATCH",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        metadata: {
                            title: trimmedTitle,
                        },
                    }),
                },
            );
            const payload = (await response.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error ?? "Rename failed.");
            }
            setThumbnails((current) =>
                current.map((item) => {
                    if (item._id !== thumbnailId) return item;
                    return {
                        ...item,
                        metadata: {
                            ...item.metadata,
                            title: trimmedTitle,
                        },
                    };
                }),
            );
            if (selectedThumbnailId === thumbnailId) {
                setThumbnailName(trimmedTitle);
            }
            setImportMessage("Thumbnail name updated.");
        } catch (error) {
            setImportMessage(
                error instanceof Error ? error.message : "Rename failed.",
            );
        } finally {
            setEditingLibraryTitleId(null);
            setEditingLibraryTitleValue("");
        }
    };

    const handleDeleteSelected = async () => {
        if (!selectedThumbnailId) return;
        if (!window.confirm("Delete selected thumbnail?")) {
            return;
        }
        try {
            setImportMessage("Deleting selected thumbnail...");
            const response = await fetch(
                `/api/storage/thumbnail-assets/${selectedThumbnailId}`,
                {
                    method: "DELETE",
                },
            );
            const payload = (await response.json()) as {
                ok: boolean;
                error?: string;
            };
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error ?? "Delete failed.");
            }

            await fetchThumbnails();
            setImportMessage("Deleted selected thumbnail.");
        } catch (error) {
            setImportMessage(
                error instanceof Error ? error.message : "Delete failed.",
            );
        }
    };

    const handleDuplicateSelected = () => {
        if (!selectedThumbnail) return;
        setEditMode("create-variant");
        setThumbnailName(
            buildDuplicateName(selectedThumbnail.metadata?.title || ""),
        );
        setImportMessage(
            "Duplicate mode: edit then press Save to create a new thumbnail.",
        );
    };

    const handleSave = async () => {
        if (!selectedThumbnailPreviewUrl) {
            setImportMessage("Please import/select a thumbnail image first.");
            return;
        }

        try {
            setIsSaving(true);
            setImportMessage("Rendering thumbnail output...");
            const renderedBlob = await renderThumbnailBlob({
                sourceUrl: selectedThumbnailPreviewUrl,
                cropPreset,
                cropSelection,
                blurRegions,
                textOverlays,
            });

            const file = new File(
                [renderedBlob],
                `${(thumbnailName || "thumbnail").replace(/\s+/g, "-")}.png`,
                {
                    type: "image/png",
                },
            );

            setImportMessage("Uploading rendered thumbnail to storage...");
            const sourceThumbnailId = selectedThumbnailId;
            await uploadThumbnailFile({
                file,
                title: thumbnailName || "Untitled thumbnail",
                lifecycle: "processed",
                overwriteAssetId:
                    editMode === "overwrite" ? selectedThumbnailId : undefined,
                selectAssetIdAfterUpload:
                    editMode === "create-variant"
                        ? sourceThumbnailId
                        : undefined,
            });

            setImportMessage(
                editMode === "overwrite"
                    ? "Saved and overwritten selected thumbnail."
                    : "Saved as a new thumbnail variant.",
            );
            setEditMode("create-variant");
        } catch (error) {
            setImportMessage(
                error instanceof Error ? error.message : "Save failed.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section className="h-full min-h-0 w-full max-w-none border border-main bg-main">
            <div className="grid h-full min-h-0 w-full gap-4 p-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
                <aside className="flex min-h-0 min-w-0 flex-col gap-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Import Thumbnails
                            </p>
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Storage account
                            </span>
                            <select
                                value={selectedStorageAccountId}
                                onChange={(event) =>
                                    setSelectedStorageAccountId(
                                        event.currentTarget.value,
                                    )
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                            >
                                <option value="">
                                    Select storage account...
                                </option>
                                {storageAccounts.map((account) => (
                                    <option
                                        key={account._id}
                                        value={account._id}
                                    >
                                        {account.label} ({account.providerType})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div
                            role="button"
                            tabIndex={0}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                handleDropUpload(
                                    event.dataTransfer.files?.[0] ?? null,
                                );
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setImportMessage(
                                        "Drop image file here to import.",
                                    );
                                }
                            }}
                            className="mt-3 border border-dashed border-main bg-main px-3 py-4 text-center text-[11px] text-muted"
                        >
                            <p>Drag image into this box to import</p>
                            <button
                                type="button"
                                onClick={() =>
                                    uploadFileInputRef.current?.click()
                                }
                                className="mt-2 border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75"
                            >
                                Upload
                            </button>
                            <input
                                ref={uploadFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(event) =>
                                    handleDropUpload(
                                        event.currentTarget.files?.[0] ?? null,
                                    )
                                }
                            />
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Import from URL
                            </span>
                            <div className="flex gap-2">
                                <input
                                    value={importUrl}
                                    onChange={(event) =>
                                        setImportUrl(event.currentTarget.value)
                                    }
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter") {
                                            event.preventDefault();
                                            handleImportFromUrl();
                                        }
                                    }}
                                    placeholder="https://..."
                                    className="min-w-0 flex-1 border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                />
                                <button
                                    type="button"
                                    onClick={handleImportFromUrl}
                                    className="shrink-0 border border-main bg-secondary px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary/75"
                                >
                                    Import
                                </button>
                            </div>
                        </label>
                        <p className="mt-2 border border-main bg-main px-2 py-1 text-[10px] text-muted">
                            {importMessage}
                        </p>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col space-y-3 border border-main bg-secondary/20 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Thumbnail Library
                            </p>
                            <span className="border border-main bg-main px-2 py-1 text-[10px] text-muted">
                                {isLoading
                                    ? "Loading..."
                                    : `${visibleThumbnails.length} items`}
                            </span>
                        </div>

                        <label className="block">
                            <span className="sr-only">Search thumbnails</span>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Search name, source, tag..."
                                    className="w-full border border-main bg-main py-1.5 pl-8 pr-10 text-[11px] text-main"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsFilterMenuOpen(
                                            (current) => !current,
                                        )
                                    }
                                    className={cn(
                                        "absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border p-1 hover:bg-secondary",
                                        lifecycleFilter === "all"
                                            ? "border-main bg-main text-muted hover:text-main"
                                            : "border-accent bg-accent/10 text-main",
                                    )}
                                    aria-label="Toggle lifecycle filter menu"
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                </button>
                                {isFilterMenuOpen ? (
                                    <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-44 border border-main bg-main p-1.5 shadow-sm">
                                        {LIFECYCLE_FILTERS.map(
                                            (filterValue) => (
                                                <button
                                                    key={filterValue}
                                                    type="button"
                                                    onClick={() => {
                                                        setLifecycleFilter(
                                                            filterValue,
                                                        );
                                                        setIsFilterMenuOpen(
                                                            false,
                                                        );
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                                                        lifecycleFilter ===
                                                            filterValue
                                                            ? "border-accent bg-accent/10 text-main"
                                                            : "border-main bg-main text-muted hover:bg-secondary/50",
                                                    )}
                                                >
                                                    <span>{filterValue}</span>
                                                    {lifecycleFilter ===
                                                    filterValue ? (
                                                        <span>•</span>
                                                    ) : null}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </label>

                        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
                            <div className="grid auto-rows-max grid-cols-3 content-start gap-2">
                                {visibleThumbnails.map((thumbnail) => {
                                    const isSelected =
                                        thumbnail._id === selectedThumbnailId;
                                    const title =
                                        thumbnail.metadata?.title?.trim() ||
                                        "Untitled thumbnail";
                                    const infoLabel = buildLibraryMetaLabel({
                                        createdAt: thumbnail.createdAt,
                                        sizeBytes: thumbnail.sizeBytes,
                                        metadata: thumbnail.metadata,
                                        previewSize:
                                            thumbnailPreviewSizes[
                                                thumbnail._id
                                            ] ?? null,
                                    });
                                    const previewUrl = `/api/storage/thumbnail-assets/${thumbnail._id}/download?disposition=inline`;

                                    return (
                                        <div
                                            key={thumbnail._id}
                                            className={cn(
                                                "flex h-fit w-full flex-col border text-left",
                                                isSelected
                                                    ? "border-accent bg-secondary/35"
                                                    : "border-main bg-main hover:bg-secondary/20",
                                            )}
                                        >
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() =>
                                                    setSelectedThumbnailId(
                                                        thumbnail._id,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === "Enter" ||
                                                        event.key === " "
                                                    ) {
                                                        event.preventDefault();
                                                        setSelectedThumbnailId(
                                                            thumbnail._id,
                                                        );
                                                    }
                                                }}
                                                className="w-full text-left"
                                            >
                                                <div className="aspect-video overflow-hidden border-b border-main bg-zinc-900">
                                                    <img
                                                        src={previewUrl}
                                                        alt={title}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        onLoad={(event) => {
                                                            const image =
                                                                event.currentTarget;
                                                            const width =
                                                                image.naturalWidth;
                                                            const height =
                                                                image.naturalHeight;
                                                            if (
                                                                width <= 0 ||
                                                                height <= 0
                                                            )
                                                                return;
                                                            setThumbnailPreviewSizes(
                                                                (current) => {
                                                                    const existing =
                                                                        current[
                                                                            thumbnail
                                                                                ._id
                                                                        ];
                                                                    if (
                                                                        existing &&
                                                                        existing.width ===
                                                                            width &&
                                                                        existing.height ===
                                                                            height
                                                                    ) {
                                                                        return current;
                                                                    }
                                                                    return {
                                                                        ...current,
                                                                        [thumbnail._id]:
                                                                            {
                                                                                width,
                                                                                height,
                                                                            },
                                                                    };
                                                                },
                                                            );
                                                        }}
                                                    />
                                                </div>
                                                {editingLibraryTitleId ===
                                                thumbnail._id ? (
                                                    <input
                                                        value={
                                                            editingLibraryTitleValue
                                                        }
                                                        onChange={(event) =>
                                                            setEditingLibraryTitleValue(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            )
                                                        }
                                                        onClick={(event) =>
                                                            event.stopPropagation()
                                                        }
                                                        onDoubleClick={(
                                                            event,
                                                        ) =>
                                                            event.stopPropagation()
                                                        }
                                                        onBlur={() =>
                                                            handleInlineTitleRename(
                                                                {
                                                                    thumbnailId:
                                                                        thumbnail._id,
                                                                    nextTitle:
                                                                        editingLibraryTitleValue,
                                                                },
                                                            )
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.key ===
                                                                "Enter"
                                                            ) {
                                                                event.preventDefault();
                                                                handleInlineTitleRename(
                                                                    {
                                                                        thumbnailId:
                                                                            thumbnail._id,
                                                                        nextTitle:
                                                                            editingLibraryTitleValue,
                                                                    },
                                                                );
                                                            }
                                                            if (
                                                                event.key ===
                                                                "Escape"
                                                            ) {
                                                                event.preventDefault();
                                                                setEditingLibraryTitleId(
                                                                    null,
                                                                );
                                                                setEditingLibraryTitleValue(
                                                                    "",
                                                                );
                                                            }
                                                        }}
                                                        className="mx-1.5 mt-1.5 w-[calc(100%-12px)] border border-main bg-main px-1.5 py-1 text-[11px] font-semibold text-main"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <p
                                                        title={title}
                                                        onDoubleClick={(
                                                            event,
                                                        ) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            setEditingLibraryTitleId(
                                                                thumbnail._id,
                                                            );
                                                            setEditingLibraryTitleValue(
                                                                title,
                                                            );
                                                        }}
                                                        className="truncate px-1.5 pt-1.5 text-[11px] font-semibold text-main"
                                                    >
                                                        {title}
                                                    </p>
                                                )}
                                                <p className="truncate px-1.5 pb-1 text-[9px] text-muted">
                                                    {infoLabel}
                                                </p>
                                            </div>
                                            <div className="px-1.5 pb-1.5">
                                                <AssetLifecycleBadges
                                                    tags={filterLibraryLifecycleTags(
                                                        thumbnail.metadata
                                                            ?.tags,
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {!isLoading &&
                                visibleThumbnails.length === 0 ? (
                                    <p className="border border-main bg-main px-3 py-4 text-center text-[11px] text-muted">
                                        No thumbnail matches current
                                        search/filter.
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="thin-scrollbar min-h-0 min-w-0 space-y-3 overflow-y-auto pr-1">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="min-w-0 space-y-3">
                            <div className="border border-main p-3">
                                <div
                                    ref={previewFrameRef}
                                    className="relative mx-auto aspect-video max-w-[900px] overflow-hidden border border-main bg-zinc-900"
                                    onPointerMove={(event) => {
                                        const frame = previewFrameRef.current;
                                        if (cropInteraction && frame) {
                                            handleCropPointerMove(
                                                event.clientX,
                                                event.clientY,
                                                frame.getBoundingClientRect(),
                                            );
                                        } else if (blurInteraction && frame) {
                                            const bounds =
                                                frame.getBoundingClientRect();
                                            if (
                                                bounds.width > 0 &&
                                                bounds.height > 0
                                            ) {
                                                const deltaXPercent =
                                                    ((event.clientX -
                                                        blurInteraction.startClientX) /
                                                        bounds.width) *
                                                    100;
                                                const deltaYPercent =
                                                    ((event.clientY -
                                                        blurInteraction.startClientY) /
                                                        bounds.height) *
                                                    100;
                                                setBlurRegions((current) =>
                                                    current.map((item) => {
                                                        if (
                                                            item.id !==
                                                            blurInteraction.regionId
                                                        ) {
                                                            return item;
                                                        }
                                                        if (
                                                            blurInteraction.mode ===
                                                            "move"
                                                        ) {
                                                            const nextX =
                                                                clampPercent(
                                                                    blurInteraction.startX +
                                                                        deltaXPercent,
                                                                );
                                                            const nextY =
                                                                clampPercent(
                                                                    blurInteraction.startY +
                                                                        deltaYPercent,
                                                                );
                                                            return {
                                                                ...item,
                                                                x: Math.min(
                                                                    nextX,
                                                                    Math.max(
                                                                        0,
                                                                        100 -
                                                                            item.width,
                                                                    ),
                                                                ),
                                                                y: Math.min(
                                                                    nextY,
                                                                    Math.max(
                                                                        0,
                                                                        100 -
                                                                            item.height,
                                                                    ),
                                                                ),
                                                            };
                                                        }
                                                        const minSize = 2;
                                                        const mode =
                                                            blurInteraction.mode;
                                                        const horizontalMode =
                                                            mode.includes("e")
                                                                ? "e"
                                                                : mode.includes(
                                                                        "w",
                                                                    )
                                                                  ? "w"
                                                                  : null;
                                                        const verticalMode =
                                                            mode.includes("s")
                                                                ? "s"
                                                                : mode.includes(
                                                                        "n",
                                                                    )
                                                                  ? "n"
                                                                  : null;
                                                        const startLeft =
                                                            blurInteraction.startX;
                                                        const startTop =
                                                            blurInteraction.startY;
                                                        const startRight =
                                                            startLeft +
                                                            blurInteraction.startWidth;
                                                        const startBottom =
                                                            startTop +
                                                            blurInteraction.startHeight;
                                                        let nextLeft =
                                                            startLeft;
                                                        let nextRight =
                                                            startRight;
                                                        let nextTop = startTop;
                                                        let nextBottom =
                                                            startBottom;

                                                        if (
                                                            horizontalMode ===
                                                            "e"
                                                        ) {
                                                            nextRight =
                                                                clampValue(
                                                                    startRight +
                                                                        deltaXPercent,
                                                                    startLeft +
                                                                        minSize,
                                                                    100,
                                                                );
                                                        } else if (
                                                            horizontalMode ===
                                                            "w"
                                                        ) {
                                                            nextLeft =
                                                                clampValue(
                                                                    startLeft +
                                                                        deltaXPercent,
                                                                    0,
                                                                    startRight -
                                                                        minSize,
                                                                );
                                                        }

                                                        if (
                                                            verticalMode === "s"
                                                        ) {
                                                            nextBottom =
                                                                clampValue(
                                                                    startBottom +
                                                                        deltaYPercent,
                                                                    startTop +
                                                                        minSize,
                                                                    100,
                                                                );
                                                        } else if (
                                                            verticalMode === "n"
                                                        ) {
                                                            nextTop =
                                                                clampValue(
                                                                    startTop +
                                                                        deltaYPercent,
                                                                    0,
                                                                    startBottom -
                                                                        minSize,
                                                                );
                                                        }

                                                        return {
                                                            ...item,
                                                            x: nextLeft,
                                                            y: nextTop,
                                                            width:
                                                                nextRight -
                                                                nextLeft,
                                                            height:
                                                                nextBottom -
                                                                nextTop,
                                                        };
                                                    }),
                                                );
                                            }
                                        } else if (textDragState) {
                                            const deltaX = Math.abs(
                                                event.clientX -
                                                    textDragState.startClientX,
                                            );
                                            const deltaY = Math.abs(
                                                event.clientY -
                                                    textDragState.startClientY,
                                            );
                                            const hasMoved =
                                                deltaX > 2 || deltaY > 2;
                                            if (hasMoved) {
                                                if (!textDragState.moved) {
                                                    setTextDragState(
                                                        (current) =>
                                                            current
                                                                ? {
                                                                      ...current,
                                                                      moved: true,
                                                                  }
                                                                : current,
                                                    );
                                                }
                                                handleCanvasTextDrag(
                                                    textDragState.overlayId,
                                                    event.clientX,
                                                    event.clientY,
                                                );
                                            }
                                        }
                                    }}
                                    onPointerUp={() => {
                                        if (
                                            textDragState &&
                                            !textDragState.moved
                                        ) {
                                            setEditingTextOverlayId(
                                                textDragState.overlayId,
                                            );
                                            setActiveTextOverlayId(
                                                textDragState.overlayId,
                                            );
                                        }
                                        setTextDragState(null);
                                        setBlurInteraction(null);
                                        setCropInteraction(null);
                                    }}
                                    onPointerLeave={() => {
                                        setTextDragState(null);
                                        setBlurInteraction(null);
                                        setCropInteraction(null);
                                    }}
                                >
                                    {selectedThumbnailPreviewUrl ? (
                                        <img
                                            src={selectedThumbnailPreviewUrl}
                                            alt={
                                                selectedThumbnail?.metadata
                                                    ?.title ??
                                                "Selected thumbnail"
                                            }
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-600/70 via-slate-500/35 to-zinc-900/70" />
                                    )}
                                    {blurRegions.map((region) => (
                                        <div
                                            key={region.id}
                                            role="button"
                                            tabIndex={0}
                                            onPointerDown={(event) =>
                                                startBlurInteraction(
                                                    event,
                                                    region,
                                                    "move",
                                                )
                                            }
                                            className="absolute cursor-move border border-main"
                                            style={{
                                                left: `${region.x}%`,
                                                top: `${region.y}%`,
                                                width: `${region.width}%`,
                                                height: `${region.height}%`,
                                                backgroundColor:
                                                    getBlurPixelsFromStrength(
                                                        region.strength,
                                                    ) > 0
                                                        ? "rgba(255, 255, 255, 0.01)"
                                                        : "transparent",
                                                backdropFilter: `blur(${getBlurPixelsFromStrength(
                                                    region.strength,
                                                )}px)`,
                                                WebkitBackdropFilter: `blur(${getBlurPixelsFromStrength(
                                                    region.strength,
                                                )}px)`,
                                            }}
                                        >
                                            {activeBlurRegionId === region.id
                                                ? BLUR_RESIZE_HANDLES.map(
                                                      (handle) => (
                                                          <div
                                                              key={handle.mode}
                                                              role="button"
                                                              tabIndex={0}
                                                              aria-label={`Resize blur region ${handle.mode}`}
                                                              onPointerDown={(
                                                                  event,
                                                              ) =>
                                                                  startBlurInteraction(
                                                                      event,
                                                                      region,
                                                                      handle.mode,
                                                                  )
                                                              }
                                                              className={cn(
                                                                  "absolute z-10 bg-transparent",
                                                                  handle.className,
                                                              )}
                                                          />
                                                      ),
                                                  )
                                                : null}
                                        </div>
                                    ))}

                                    {textOverlays.map((overlay, index) => (
                                        <div
                                            key={overlay.id}
                                            style={{
                                                left: `${overlay.x}%`,
                                                top: `${overlay.y}%`,
                                                fontFamily:
                                                    getThumbnailTextPreviewFontFamily(
                                                        overlay.fontFamily,
                                                    ),
                                                fontSize: `${Math.max(
                                                    1,
                                                    overlay.fontSize *
                                                        previewTextScale,
                                                )}px`,
                                                fontWeight: overlay.fontWeight,
                                                lineHeight: 1.2,
                                            }}
                                            className={cn(
                                                "absolute -translate-x-1/2 -translate-y-1/2 text-center tracking-wide",
                                                activeTextOverlayId ===
                                                    overlay.id
                                                    ? "ring-1 ring-accent/70"
                                                    : "",
                                            )}
                                        >
                                            {editingTextOverlayId ===
                                            overlay.id ? (
                                                <input
                                                    autoFocus
                                                    aria-label={`Edit text overlay on preview #${index + 1}`}
                                                    value={overlay.text}
                                                    onChange={(event) =>
                                                        updateTextOverlayById(
                                                            overlay.id,
                                                            {
                                                                text: event
                                                                    .currentTarget
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        setEditingTextOverlayId(
                                                            null,
                                                        )
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key ===
                                                            "Enter"
                                                        ) {
                                                            event.currentTarget.blur();
                                                        }
                                                        if (
                                                            event.key ===
                                                            "Escape"
                                                        ) {
                                                            setEditingTextOverlayId(
                                                                null,
                                                            );
                                                        }
                                                    }}
                                                    className="min-w-[180px] max-w-[82vw] border border-main bg-main/90 px-2 py-1 text-center text-[inherit] font-[inherit] text-main outline-none"
                                                />
                                            ) : (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`Drag text overlay on preview #${index + 1}`}
                                                    onPointerDown={(event) => {
                                                        event.preventDefault();
                                                        setEditingTextOverlayId(
                                                            null,
                                                        );
                                                        setActiveTextOverlayId(
                                                            overlay.id,
                                                        );
                                                        const frame =
                                                            previewFrameRef.current;
                                                        if (!frame) return;
                                                        const bounds =
                                                            frame.getBoundingClientRect();
                                                        if (
                                                            bounds.width <= 0 ||
                                                            bounds.height <= 0
                                                        )
                                                            return;
                                                        const pointerXPercent =
                                                            ((event.clientX -
                                                                bounds.left) /
                                                                bounds.width) *
                                                            100;
                                                        const pointerYPercent =
                                                            ((event.clientY -
                                                                bounds.top) /
                                                                bounds.height) *
                                                            100;
                                                        setTextDragState({
                                                            overlayId:
                                                                overlay.id,
                                                            offsetXPercent:
                                                                pointerXPercent -
                                                                overlay.x,
                                                            offsetYPercent:
                                                                pointerYPercent -
                                                                overlay.y,
                                                            startClientX:
                                                                event.clientX,
                                                            startClientY:
                                                                event.clientY,
                                                            moved: false,
                                                        });
                                                    }}
                                                    className={cn(
                                                        "relative cursor-grab whitespace-pre",
                                                        textDragState?.overlayId ===
                                                            overlay.id
                                                            ? "cursor-grabbing"
                                                            : "cursor-grab",
                                                    )}
                                                >
                                                    {overlay.shadowEnabled ? (
                                                        <span
                                                            aria-hidden="true"
                                                            className="pointer-events-none absolute inset-0 whitespace-pre"
                                                            style={{
                                                                color:
                                                                    overlay.shadowColor ??
                                                                    "#facc15",
                                                                WebkitTextStroke: `${Math.max(
                                                                    1,
                                                                    (overlay.strokeWidth +
                                                                        (overlay.shadowSpread ??
                                                                            0) *
                                                                            2) *
                                                                        previewTextScale,
                                                                )}px ${
                                                                    overlay.shadowColor ??
                                                                    "#facc15"
                                                                }`,
                                                                textShadow:
                                                                    buildTextGlowCss(
                                                                        {
                                                                            shadowEnabled: true,
                                                                            shadowColor:
                                                                                overlay.shadowColor ??
                                                                                "#facc15",
                                                                            shadowBlur:
                                                                                overlay.shadowBlur ??
                                                                                0,
                                                                            shadowSpread:
                                                                                overlay.shadowSpread ??
                                                                                0,
                                                                            shadowOffsetX:
                                                                                overlay.shadowOffsetX ??
                                                                                0,
                                                                            shadowOffsetY:
                                                                                overlay.shadowOffsetY ??
                                                                                0,
                                                                            scale: previewTextScale,
                                                                        },
                                                                    ),
                                                            }}
                                                        >
                                                            {overlay.text ||
                                                                "YOUR HEADLINE"}
                                                        </span>
                                                    ) : null}
                                                    <span
                                                        className="relative whitespace-pre"
                                                        style={{
                                                            color: overlay.textColor,
                                                            WebkitTextStroke: `${Math.max(
                                                                0,
                                                                overlay.strokeWidth *
                                                                    previewTextScale,
                                                            )}px ${overlay.strokeColor}`,
                                                        }}
                                                    >
                                                        {overlay.text ||
                                                            "YOUR HEADLINE"}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {selectedThumbnailPreviewUrl &&
                                    cropPreset !== "none" ? (
                                        <div
                                            aria-label="Crop selection"
                                            className="pointer-events-none absolute z-30 border-2 border-emerald-400"
                                            style={{
                                                left: `${cropSelection.x}%`,
                                                top: `${cropSelection.y}%`,
                                                width: `${cropSelection.width}%`,
                                                height: `${cropSelection.height}%`,
                                            }}
                                        >
                                            <button
                                                type="button"
                                                aria-label="Move crop selection top edge"
                                                onPointerDown={(event) =>
                                                    startCropInteraction(
                                                        event,
                                                        "move",
                                                    )
                                                }
                                                className="pointer-events-auto absolute left-0 top-0 h-3 w-full -translate-y-1/2 cursor-move bg-transparent"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Move crop selection bottom edge"
                                                onPointerDown={(event) =>
                                                    startCropInteraction(
                                                        event,
                                                        "move",
                                                    )
                                                }
                                                className="pointer-events-auto absolute bottom-0 left-0 h-3 w-full translate-y-1/2 cursor-move bg-transparent"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Move crop selection left edge"
                                                onPointerDown={(event) =>
                                                    startCropInteraction(
                                                        event,
                                                        "move",
                                                    )
                                                }
                                                className="pointer-events-auto absolute left-0 top-0 h-full w-3 -translate-x-1/2 cursor-move bg-transparent"
                                            />
                                            <button
                                                type="button"
                                                aria-label="Move crop selection right edge"
                                                onPointerDown={(event) =>
                                                    startCropInteraction(
                                                        event,
                                                        "move",
                                                    )
                                                }
                                                className="pointer-events-auto absolute right-0 top-0 h-full w-3 translate-x-1/2 cursor-move bg-transparent"
                                            />
                                            {CROP_RESIZE_HANDLES.map(
                                                (handle) => (
                                                    <button
                                                        key={handle.mode}
                                                        type="button"
                                                        aria-label={`Resize crop selection ${handle.mode}`}
                                                        onPointerDown={(
                                                            event,
                                                        ) =>
                                                            startCropInteraction(
                                                                event,
                                                                handle.mode,
                                                            )
                                                        }
                                                        className={cn(
                                                            "pointer-events-auto absolute z-10 bg-transparent",
                                                            handle.className,
                                                        )}
                                                    />
                                                ),
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="block">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Thumbnail name
                                        </span>
                                        <span className="max-w-[180px] truncate text-right text-[10px] text-muted">
                                            {selectedThumbnailNameHint}
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2">
                                        <input
                                            value={thumbnailName}
                                            onChange={(event) =>
                                                setThumbnailName(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            placeholder="e.g. con meo"
                                            className="w-full flex-1 border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                        <a
                                            href={
                                                selectedThumbnailDownloadUrl ??
                                                undefined
                                            }
                                            download
                                            aria-disabled={
                                                !selectedThumbnailDownloadUrl
                                            }
                                            className={cn(
                                                "inline-flex shrink-0 items-center gap-1 border px-2 py-1.5 text-[10px] font-semibold",
                                                selectedThumbnailDownloadUrl
                                                    ? "border-main bg-main text-main hover:bg-secondary/60"
                                                    : "pointer-events-none border-main/40 bg-main/60 text-muted/60",
                                            )}
                                        >
                                            <DownloadCloud className="h-3 w-3" />
                                            Download
                                        </a>
                                    </div>
                                </div>

                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Folder
                                        </span>
                                        <input
                                            value={folderName}
                                            onChange={(event) =>
                                                setFolderName(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            placeholder="thumbnails/movies"
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Tags (comma separated)
                                        </span>
                                        <input
                                            value={tagsInput}
                                            onChange={(event) =>
                                                setTagsInput(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            placeholder="movie, ep1, action"
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>

                                <div className="mt-3">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-semibold text-muted">
                                            Quick text styles
                                        </p>
                                        <p className="text-[9px] text-muted">
                                            Creates new text layer with style.
                                        </p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {TEXT_STYLE_PRESETS.slice(0, 3).map(
                                                (preset) => (
                                                    <button
                                                        key={preset.label}
                                                        type="button"
                                                        onClick={() =>
                                                            applyTextStylePreset(
                                                                preset,
                                                            )
                                                        }
                                                        className="min-h-11 border border-main bg-main px-2 py-1 text-left hover:bg-secondary/70"
                                                    >
                                                        <span
                                                            className="block text-[10px] font-semibold"
                                                            style={{
                                                                color:
                                                                    preset.patch
                                                                        .shadowColor ??
                                                                    preset.patch
                                                                        .textColor ??
                                                                    "#ffffff",
                                                            }}
                                                        >
                                                            {preset.label}
                                                        </span>
                                                        <span className="block text-[9px] text-muted">
                                                            {preset.description}
                                                        </span>
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <button
                                                key={
                                                    TEXT_STYLE_PRESETS[3].label
                                                }
                                                type="button"
                                                onClick={() =>
                                                    applyTextStylePreset(
                                                        TEXT_STYLE_PRESETS[3],
                                                    )
                                                }
                                                className="min-h-11 border border-main bg-main px-2 py-1 text-left hover:bg-secondary/70"
                                            >
                                                <span
                                                    className="block text-[10px] font-semibold"
                                                    style={{
                                                        color:
                                                            TEXT_STYLE_PRESETS[3]
                                                                .patch
                                                                .shadowColor ??
                                                            TEXT_STYLE_PRESETS[3]
                                                                .patch
                                                                .textColor ??
                                                            "#ffffff",
                                                    }}
                                                >
                                                    {
                                                        TEXT_STYLE_PRESETS[3]
                                                            .label
                                                    }
                                                </span>
                                                <span className="block text-[9px] text-muted">
                                                    {
                                                        TEXT_STYLE_PRESETS[3]
                                                            .description
                                                    }
                                                </span>
                                            </button>
                                            <div className="col-span-2 grid grid-cols-3 gap-1 text-[9px]">
                                                {QUICK_TEXT_PRESETS.map(
                                                    (preset) => (
                                                        <button
                                                            key={preset.label}
                                                            type="button"
                                                            onClick={() =>
                                                                applyQuickTextPreset(
                                                                    preset,
                                                                )
                                                            }
                                                            className="min-h-5 border border-main bg-main px-1 py-1 font-semibold text-main hover:bg-secondary/70"
                                                            style={{
                                                                color: preset.glowColor,
                                                            }}
                                                        >
                                                            {preset.label}
                                                        </button>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <label className="flex items-center gap-2 border border-main bg-main px-3 py-2">
                                        <input
                                            type="radio"
                                            name="thumbnail-edit-mode"
                                            checked={
                                                editMode === "create-variant"
                                            }
                                            onChange={() =>
                                                setEditMode("create-variant")
                                            }
                                            className="h-4 w-4 accent-[var(--color-accent)]"
                                        />
                                        <span>
                                            <span className="block text-[11px] font-semibold text-main">
                                                Create variant (default)
                                            </span>
                                            <span className="block text-[10px] text-muted">
                                                Keep original thumbnail intact.
                                            </span>
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 border border-main bg-main px-3 py-2">
                                        <input
                                            type="radio"
                                            name="thumbnail-edit-mode"
                                            checked={editMode === "overwrite"}
                                            onChange={() =>
                                                setEditMode("overwrite")
                                            }
                                            className="h-4 w-4 accent-[var(--color-accent)]"
                                        />
                                        <span>
                                            <span className="block text-[11px] font-semibold text-main">
                                                Overwrite current
                                            </span>
                                            <span className="block text-[10px] text-muted">
                                                Replace selected thumbnail.
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={
                                            isSaving ||
                                            !selectedThumbnailPreviewUrl
                                        }
                                        className="inline-flex items-center justify-center gap-1 border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        {isSaving ? "Saving..." : "Save"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDuplicateSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-main bg-secondary/70 px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Duplicate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetEditor}
                                        className="inline-flex items-center justify-center border border-main bg-secondary/70 px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-rose-500/35 bg-rose-500/10 px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-3">
                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[12px] font-semibold text-main">
                                        Text Overlay
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => addTextOverlay()}
                                    className="w-full border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25"
                                >
                                    Add text layer
                                </button>
                                <div className="max-h-28 space-y-2 overflow-y-auto border border-main bg-secondary/20 p-2">
                                    {textOverlays.length === 0 ? (
                                        <p className="text-[10px] text-muted">
                                            No text layer yet.
                                        </p>
                                    ) : (
                                        textOverlays.map((overlay, index) => (
                                            <div
                                                key={overlay.id}
                                                className={cn(
                                                    "flex w-full max-w-full items-center gap-1 overflow-hidden border px-1.5 py-1",
                                                    activeTextOverlayId ===
                                                        overlay.id
                                                        ? "border-accent bg-accent/10 text-main"
                                                        : "border-main bg-main text-main",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveTextOverlayId(
                                                            overlay.id,
                                                        )
                                                    }
                                                    title={formatTextOverlaySummary(
                                                        overlay,
                                                        index,
                                                    )}
                                                    className="min-w-0 max-w-full flex-1 truncate whitespace-nowrap text-left text-[10px]"
                                                >
                                                    {formatTextOverlaySummary(
                                                        overlay,
                                                        index,
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove text layer #${index + 1}`}
                                                    onClick={() =>
                                                        removeTextOverlayById(
                                                            overlay.id,
                                                        )
                                                    }
                                                    className="shrink-0 px-1 text-[10px] font-semibold text-rose-700 hover:text-rose-800"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {activeTextOverlay ? (
                                    <>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Headline text
                                            </span>
                                            <textarea
                                                rows={2}
                                                value={activeTextOverlay.text}
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        text: event
                                                            .currentTarget
                                                            .value,
                                                    })
                                                }
                                                className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                            />
                                        </label>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Font family
                                                </span>
                                                <select
                                                    value={
                                                        activeTextOverlay.fontFamily
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                fontFamily:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                                >
                                                    {THUMBNAIL_TEXT_FONT_OPTIONS.map(
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
                                                    Font weight
                                                </span>
                                                <select
                                                    value={
                                                        activeTextOverlay.fontWeight
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                fontWeight:
                                                                    Number(
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                                >
                                                    <option value={600}>
                                                        600
                                                    </option>
                                                    <option value={700}>
                                                        700
                                                    </option>
                                                    <option value={800}>
                                                        800
                                                    </option>
                                                    <option value={900}>
                                                        900
                                                    </option>
                                                </select>
                                            </label>
                                        </div>

                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Font size:{" "}
                                                {activeTextOverlay.fontSize}px
                                            </span>
                                            <input
                                                type="range"
                                                min={10}
                                                max={140}
                                                value={
                                                    activeTextOverlay.fontSize
                                                }
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        fontSize: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full accent-[var(--color-accent)]"
                                            />
                                        </label>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Text color
                                                </span>
                                                <input
                                                    type="color"
                                                    value={
                                                        activeTextOverlay.textColor
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                textColor:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="h-9 w-full border border-main bg-main p-1"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Stroke color
                                                </span>
                                                <input
                                                    type="color"
                                                    value={
                                                        activeTextOverlay.strokeColor
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                strokeColor:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="h-9 w-full border border-main bg-main p-1"
                                                />
                                            </label>
                                        </div>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Stroke width:{" "}
                                                {activeTextOverlay.strokeWidth}
                                                px
                                            </span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={12}
                                                value={
                                                    activeTextOverlay.strokeWidth
                                                }
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        strokeWidth: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full accent-[var(--color-accent)]"
                                            />
                                        </label>

                                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                                            <span>
                                                <span className="block text-[11px] font-semibold text-main">
                                                    Glow behind text
                                                </span>
                                                <span className="block text-[10px] text-muted">
                                                    Bật để tạo viền màu nổi sau
                                                    chữ.
                                                </span>
                                            </span>
                                            <input
                                                type="checkbox"
                                                checked={
                                                    activeTextOverlay.shadowEnabled
                                                }
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        shadowEnabled:
                                                            event.currentTarget
                                                                .checked,
                                                    })
                                                }
                                                className="h-4 w-4 accent-[var(--color-accent)]"
                                            />
                                        </label>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Glow color
                                                </span>
                                                <input
                                                    type="color"
                                                    disabled={
                                                        !activeTextOverlay.shadowEnabled
                                                    }
                                                    value={
                                                        activeTextOverlay.shadowColor
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                shadowColor:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="h-9 w-full border border-main bg-main p-1 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Glow blur:{" "}
                                                    {
                                                        activeTextOverlay.shadowBlur
                                                    }
                                                    px
                                                </span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={80}
                                                    disabled={
                                                        !activeTextOverlay.shadowEnabled
                                                    }
                                                    value={
                                                        activeTextOverlay.shadowBlur
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                shadowBlur:
                                                                    Number(
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </label>
                                        </div>

                                        <div className="grid gap-2 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Glow spread:{" "}
                                                    {
                                                        activeTextOverlay.shadowSpread
                                                    }
                                                    px
                                                </span>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={40}
                                                    disabled={
                                                        !activeTextOverlay.shadowEnabled
                                                    }
                                                    value={
                                                        activeTextOverlay.shadowSpread
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                shadowSpread:
                                                                    Number(
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Glow drop:{" "}
                                                    {
                                                        activeTextOverlay.shadowOffsetY
                                                    }
                                                    px
                                                </span>
                                                <input
                                                    type="range"
                                                    min={-60}
                                                    max={60}
                                                    disabled={
                                                        !activeTextOverlay.shadowEnabled
                                                    }
                                                    value={
                                                        activeTextOverlay.shadowOffsetY
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                shadowOffsetY:
                                                                    Number(
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full accent-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </label>
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-muted">
                                        Select a text layer to edit.
                                    </p>
                                )}
                                <p className="border border-main bg-main px-2 py-1.5 text-[10px] text-muted">
                                    Text position: drag directly on preview
                                    canvas.
                                </p>
                            </div>

                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <p className="text-[12px] font-semibold text-main">
                                        Crop
                                    </p>
                                </div>
                                <div>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {PRESET_CROP_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() =>
                                                    applyCropPreset(
                                                        option.value,
                                                    )
                                                }
                                                className={cn(
                                                    "border px-2 py-1.5 text-[10px] font-semibold",
                                                    cropPreset === option.value
                                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700"
                                                        : "border-main bg-main text-main hover:bg-secondary/70",
                                                )}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <Droplets className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Blur
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addBlurRegion}
                                    className="w-full border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25"
                                >
                                    Add blur region
                                </button>
                                <div className="max-h-28 space-y-2 overflow-y-auto border border-main bg-secondary/20 p-2">
                                    {blurRegions.length === 0 ? (
                                        <p className="text-[10px] text-muted">
                                            No blur region yet.
                                        </p>
                                    ) : (
                                        blurRegions.map((region, index) => (
                                            <div
                                                key={region.id}
                                                className={cn(
                                                    "flex w-full max-w-full items-center gap-1 overflow-hidden border px-1.5 py-1",
                                                    activeBlurRegionId ===
                                                        region.id
                                                        ? "border-accent bg-accent/10 text-main"
                                                        : "border-main bg-main text-main",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveBlurRegionId(
                                                            region.id,
                                                        )
                                                    }
                                                    title={formatBlurRegionSummary(
                                                        region,
                                                        index,
                                                    )}
                                                    className="min-w-0 max-w-full flex-1 truncate whitespace-nowrap text-left text-[10px]"
                                                >
                                                    {formatBlurRegionSummary(
                                                        region,
                                                        index,
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove blur region #${index + 1}`}
                                                    onClick={() =>
                                                        removeBlurRegionById(
                                                            region.id,
                                                        )
                                                    }
                                                    className="shrink-0 px-1 text-[10px] font-semibold text-rose-700 hover:text-rose-800"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {activeBlurRegion ? (
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Blur strength:{" "}
                                            {activeBlurRegion.strength}
                                        </span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={activeBlurRegion.strength}
                                            onChange={(event) =>
                                                updateActiveBlurRegion({
                                                    strength: Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                })
                                            }
                                            className="w-full accent-[var(--color-accent)]"
                                        />
                                    </label>
                                ) : (
                                    <p className="text-[10px] text-muted">
                                        Select a blur region to edit.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
