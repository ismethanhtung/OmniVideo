import type { VideoEditRegionPercent } from "./video-edit-pipeline";

export type ContainedVideoRectInput = {
    frameWidth: number;
    frameHeight: number;
    videoWidth: number;
    videoHeight: number;
};

export type ContainedVideoRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export type PreviewPointToVideoPercentInput = ContainedVideoRectInput & {
    clientX: number;
    clientY: number;
    frameLeft: number;
    frameTop: number;
};

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

export function resolveContainedVideoRect({
    frameWidth,
    frameHeight,
    videoWidth,
    videoHeight,
}: ContainedVideoRectInput): ContainedVideoRect {
    const safeFrameWidth = Number.isFinite(frameWidth)
        ? Math.max(0, frameWidth)
        : 0;
    const safeFrameHeight = Number.isFinite(frameHeight)
        ? Math.max(0, frameHeight)
        : 0;
    if (
        safeFrameWidth <= 0 ||
        safeFrameHeight <= 0 ||
        !Number.isFinite(videoWidth) ||
        !Number.isFinite(videoHeight) ||
        videoWidth <= 0 ||
        videoHeight <= 0
    ) {
        return {
            left: 0,
            top: 0,
            width: safeFrameWidth,
            height: safeFrameHeight,
        };
    }

    const frameAspect = safeFrameWidth / safeFrameHeight;
    const videoAspect = videoWidth / videoHeight;
    if (frameAspect > videoAspect) {
        const width = safeFrameHeight * videoAspect;
        return {
            left: (safeFrameWidth - width) / 2,
            top: 0,
            width,
            height: safeFrameHeight,
        };
    }

    const height = safeFrameWidth / videoAspect;
    return {
        left: 0,
        top: (safeFrameHeight - height) / 2,
        width: safeFrameWidth,
        height,
    };
}

export function pointToContainedVideoPercent({
    clientX,
    clientY,
    frameLeft,
    frameTop,
    frameWidth,
    frameHeight,
    videoWidth,
    videoHeight,
}: PreviewPointToVideoPercentInput): { x: number; y: number } | null {
    const videoRect = resolveContainedVideoRect({
        frameWidth,
        frameHeight,
        videoWidth,
        videoHeight,
    });
    if (videoRect.width <= 0 || videoRect.height <= 0) return null;

    return {
        x: clampNumber(
            ((clientX - frameLeft - videoRect.left) / videoRect.width) * 100,
            0,
            100,
        ),
        y: clampNumber(
            ((clientY - frameTop - videoRect.top) / videoRect.height) * 100,
            0,
            100,
        ),
    };
}

export function buildContainedVideoRegionBox(
    region: VideoEditRegionPercent,
    videoRect: ContainedVideoRect,
): ContainedVideoRect {
    const x1 = clampNumber(region.x, 0, 100);
    const y1 = clampNumber(region.y, 0, 100);
    const x2 = clampNumber(region.x + region.width, x1, 100);
    const y2 = clampNumber(region.y + region.height, y1, 100);
    return {
        left: videoRect.left + (x1 / 100) * videoRect.width,
        top: videoRect.top + (y1 / 100) * videoRect.height,
        width: ((x2 - x1) / 100) * videoRect.width,
        height: ((y2 - y1) / 100) * videoRect.height,
    };
}
