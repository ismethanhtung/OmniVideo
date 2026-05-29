export type SubtitleAssPlacement = {
    subtitleAlignment: number;
    subtitleMarginLeft: number;
    subtitleMarginRight: number;
    subtitleMarginBottom: number;
};

export type SubtitlePlacementRegion = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export const ASS_SUBTITLE_OUTLINE = 2;
export const ASS_TO_CSS_FONT_DPI_RATIO = 72 / 96;
export const SUBTITLE_PREVIEW_LINE_HEIGHT = 1.25;

function clampPercent(value: number) {
    return Math.min(100, Math.max(0, value));
}

function resolveTopAlignedAssAlignment(centerXPercent: number) {
    return centerXPercent < 33 ? 7 : centerXPercent > 67 ? 9 : 8;
}

function resolveBottomAlignedAssAlignment(centerXPercent: number) {
    return centerXPercent < 33 ? 1 : centerXPercent > 67 ? 3 : 2;
}

function normalizeRegion(input: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
}): SubtitlePlacementRegion | null {
    if (
        !Number.isFinite(input.x) ||
        !Number.isFinite(input.y) ||
        !Number.isFinite(input.width) ||
        !Number.isFinite(input.height)
    ) {
        return null;
    }

    const x = clampPercent(Number(input.x));
    const y = clampPercent(Number(input.y));
    return {
        x,
        y,
        width: Math.min(100 - x, Math.max(0.5, Number(input.width))),
        height: Math.min(100 - y, Math.max(0.5, Number(input.height))),
    };
}

export function buildSubtitleAssPlacementFromPreview(input: {
    leftPx: number;
    topPx: number;
    frameWidth: number;
    frameHeight: number;
    boxWidth: number;
    boxHeight: number;
    videoWidth: number;
    videoHeight: number;
    subtitleFontSize: number;
    subtitleBackgroundPaddingY: number;
    lineCount?: number;
}): SubtitleAssPlacement {
    const centerX = input.leftPx + input.boxWidth / 2;
    const centerXPercent = (centerX / input.frameWidth) * 100;
    const scaleX = input.videoWidth / input.frameWidth;
    const scaleY = input.videoHeight / input.frameHeight;

    return {
        subtitleAlignment: resolveBottomAlignedAssAlignment(centerXPercent),
        subtitleMarginLeft: Math.round(Math.max(0, input.leftPx) * scaleX),
        subtitleMarginRight: Math.round(
            Math.max(0, input.frameWidth - input.leftPx - input.boxWidth) *
                scaleX,
        ),
        subtitleMarginBottom: Math.round(
            Math.max(0, input.frameHeight - input.topPx - input.boxHeight) *
                scaleY,
        ),
    };
}

export function buildSubtitleAssPlacementFromPreviewPercent(input: {
    leftPercent?: number;
    topPercent?: number;
    widthPercent?: number;
    playResX?: number;
    playResY?: number;
}): SubtitleAssPlacement | null {
    if (
        !Number.isFinite(input.leftPercent) ||
        !Number.isFinite(input.topPercent)
    ) {
        return null;
    }

    const playResX = Math.max(360, Math.round(input.playResX ?? 1920));
    const playResY = Math.max(360, Math.round(input.playResY ?? 1080));
    const leftPercent = clampPercent(Number(input.leftPercent));
    const topPercent = clampPercent(Number(input.topPercent));
    const widthPercent = clampPercent(Number(input.widthPercent ?? 100));
    const rightPercent = clampPercent(100 - leftPercent - widthPercent);
    const centerXPercent = leftPercent + widthPercent / 2;

    return {
        subtitleAlignment: resolveBottomAlignedAssAlignment(centerXPercent),
        subtitleMarginLeft: Math.round((leftPercent / 100) * playResX),
        subtitleMarginRight: Math.round((rightPercent / 100) * playResX),
        subtitleMarginBottom: Math.round(
            Math.max(0, 100 - topPercent) / 100 * playResY,
        ),
    };
}

export function buildSubtitlePlacementRegionFromPreview(input: {
    leftPx: number;
    topPx: number;
    frameWidth: number;
    frameHeight: number;
    boxWidth: number;
    boxHeight: number;
}): SubtitlePlacementRegion {
    return {
        x: clampPercent((input.leftPx / input.frameWidth) * 100),
        y: clampPercent((input.topPx / input.frameHeight) * 100),
        width: clampPercent((input.boxWidth / input.frameWidth) * 100),
        height: clampPercent((input.boxHeight / input.frameHeight) * 100),
    };
}

export function buildSubtitlePlacementRegionFromVideoEditSetup(
    setup: Record<string, unknown> | null | undefined,
): SubtitlePlacementRegion | null {
    const savedRegion =
        setup?.subtitlePlacementRegion &&
        typeof setup.subtitlePlacementRegion === "object" &&
        !Array.isArray(setup.subtitlePlacementRegion)
            ? (setup.subtitlePlacementRegion as Record<string, unknown>)
            : null;
    const normalizedSavedRegion = savedRegion
        ? normalizeRegion({
              x: Number(savedRegion.x),
              y: Number(savedRegion.y),
              width: Number(savedRegion.width),
              height: Number(savedRegion.height),
          })
        : null;
    if (normalizedSavedRegion) return normalizedSavedRegion;

    const placement =
        setup?.subtitlePreviewPlacement &&
        typeof setup.subtitlePreviewPlacement === "object" &&
        !Array.isArray(setup.subtitlePreviewPlacement)
            ? (setup.subtitlePreviewPlacement as Record<string, unknown>)
            : null;
    const sampleWidth =
        typeof setup?.subtitleSampleWidthPercent === "number"
            ? setup.subtitleSampleWidthPercent
            : Number(setup?.subtitleSampleWidthPercent);
    const previewRegion = placement
        ? normalizeRegion({
              x: Number(placement.leftPercent),
              y: Number(placement.topPercent),
              width: Number.isFinite(Number(placement.widthPercent))
                  ? Number(placement.widthPercent)
                  : Number.isFinite(sampleWidth)
                    ? sampleWidth
                    : 100,
              height: Number(placement.heightPercent),
          })
        : null;
    if (previewRegion) return previewRegion;

    const blurRegions = Array.isArray(setup?.blurRegions)
        ? setup.blurRegions
        : [];
    for (const item of blurRegions) {
        const candidate =
            typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : null;
        const region =
            candidate &&
            typeof candidate.region === "object" &&
            candidate.region !== null
                ? (candidate.region as Record<string, unknown>)
                : candidate;
        const normalized = normalizeRegion({
            x: Number(region?.x),
            y: Number(region?.y),
            width: Number(region?.width),
            height: Number(region?.height),
        });
        if (normalized) return normalized;
    }

    return null;
}

export function buildSubtitleAssPlacementFromVideoEditSetup(
    setup: Record<string, unknown> | null | undefined,
    input?: {
        playResX?: number;
        playResY?: number;
    },
): SubtitleAssPlacement | null {
    const region = buildSubtitlePlacementRegionFromVideoEditSetup(setup);
    if (region) {
        return buildSubtitleAssPlacementFromPreviewPercent({
            leftPercent: region.x,
            topPercent: region.y + region.height,
            widthPercent: region.width,
            playResX: input?.playResX,
            playResY: input?.playResY,
        });
    }

    const placement =
        setup?.subtitlePreviewPlacement &&
        typeof setup.subtitlePreviewPlacement === "object" &&
        !Array.isArray(setup.subtitlePreviewPlacement)
            ? (setup.subtitlePreviewPlacement as Record<string, unknown>)
            : null;
    if (!placement) return null;

    const sampleWidth =
        typeof setup?.subtitleSampleWidthPercent === "number"
            ? setup.subtitleSampleWidthPercent
            : Number(setup?.subtitleSampleWidthPercent);

    return buildSubtitleAssPlacementFromPreviewPercent({
        leftPercent: Number(placement.leftPercent),
        topPercent: Number(placement.topPercent),
        widthPercent: Number.isFinite(sampleWidth) ? sampleWidth : 100,
        playResX: input?.playResX,
        playResY: input?.playResY,
    });
}
