"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import {
    Layers,
    Link2,
    Plus,
    Captions,
    Info,
    X,
    Trash2,
    Volume2,
    Workflow,
    FastForward,
    Sprout,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";
import {
    finishProgressStep,
    finishProgressTask,
    startProgressStep,
    startProgressTask,
    updateProgressStep,
    updateProgressTask,
} from "@/lib/ui/progress-center";
import {
    buildFolderAssetTags,
    buildRawSourceProcessedOutputTags,
    getAssetFolderName,
    matchesVideoAssetSearch,
} from "@/lib/storage/asset-folder";
import {
    fetchFacebookPagesForAccount,
    type FacebookPageOption,
} from "@/lib/social/facebook-pages-client";
import {
    DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL,
    DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE,
    resolveDefaultAiProviderId,
} from "@/lib/ai-providers/default-provider";
import {
    WORKSPACE_DRAFT_STORAGE_KEY,
    WORKSPACE_NODE_TEMPLATES,
    addWorkspaceNode,
    connectWorkspaceNodes,
    createEmptyWorkspaceGraph,
    deleteWorkspaceEdge,
    deleteWorkspaceNode,
    getWorkspaceNodeTemplate,
    moveWorkspaceNode,
    parseWorkspaceDraft,
    planWorkspaceFlow,
    selectWorkspaceNode,
    serializeWorkspaceDraft,
    updateWorkspaceNodeConfig,
    validateWorkspaceConnection,
    validateWorkspaceGraph,
    type WorkspaceFlowPlan,
    type WorkspaceFlowStep,
    type WorkspaceGraph,
    type WorkspaceNodeCategory,
    type WorkspaceNodeInstance,
    type WorkspaceNodeTemplate,
} from "@/lib/workspace/workspace-graph";
import {
    getWorkspaceFlowSetupNodes,
    getWorkspaceNodeSetupIssues,
    getWorkspaceNodeSetupWarnings,
    type WorkspaceFlowSetupNode,
} from "@/lib/workspace/workspace-flow-setup";
import {
    WORKSPACE_SEED_TEMPLATES,
    type WorkspaceSeedTemplate,
} from "@/lib/workspace/workspace-seeds";
import {
    DEFAULT_TRANSLATION_MODEL,
    DEFAULT_PIPER_TTS_SETTINGS,
    PIPER_TTS_ALIGNMENT_SETTINGS,
    type ChineseTranscriptionResult,
    type TranscriptTranslationResult,
    type VietnameseVideoMetadataResult,
    type VoiceGenerationResult,
} from "@/lib/multilingual-audio/types";
import type { VideoDubbingResult } from "@/lib/multilingual-audio/video-dubbing";
import type { VideoVipProcessingResult } from "@/lib/multilingual-audio/video-vip-processing";
import { buildWordAwareVoiceSegments } from "@/lib/multilingual-audio/voice-segment-timing";
import { loadLocalVideoEditSetup } from "@/lib/video-processing/local-video-edit-setup";

type WorkspaceCanvasPanelProps = {
    section: LeftbarNavItem;
};

type WorkspaceStorageAccount = {
    _id: string;
    providerType: "telegram" | "drive" | string;
    label: string;
    status: "active" | "paused" | "error";
};

type WorkspaceSocialAccount = {
    _id: string;
    platform: "facebook" | "tiktok" | "shopee" | "youtube";
    label: string;
    status: "needs_auth" | "connected" | "paused" | "error";
    supportedFormats: WorkspacePublishType[];
};

type WorkspaceAiProvider = {
    _id: string;
    label: string;
    providerType: string;
    status: string;
};

type WorkspaceAiModel = {
    id: string;
    name: string;
};

type WorkspaceAsset = {
    _id: string;
    storageProvider: string;
    providerAssetId?: string | null;
    metadata?: {
        title?: string | null;
        description?: string | null;
        vietnameseTitle?: string | null;
        vietnameseDescription?: string | null;
        vietnameseHashtags?: string[] | null;
        folder?: string | null;
        tags?: string[] | null;
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
    createdAt?: string;
};

type WorkspaceThumbnailAsset = {
    _id: string;
    providerAssetId?: string | null;
    storageProvider?: string;
    metadata?: {
        title?: string | null;
        folder?: string | null;
        tags?: string[] | null;
    };
    createdAt?: string;
};

type WorkspacePublishType =
    | "facebook_reel"
    | "facebook_video"
    | "tiktok_video"
    | "shopee_video"
    | "youtube_short"
    | "youtube_video";

type FacebookPagesResult = {
    pages: FacebookPageOption[];
    configuredPageId: string | null;
};

type NodeRunStatus = "idle" | "running" | "success" | "failed" | "skipped";

type NodeRunState = {
    status: NodeRunStatus;
    detail: string;
};

type WorkspaceRuntimeArtifact = {
    artifactId?: string;
    artifactExpiresAt?: string;
    fileName: string;
    mimeType: string;
    base64?: string;
    file?: File;
    objectUrl?: string;
    byteLength: number;
    kind: "audio" | "video";
    detail: string;
};

type WorkspaceFileProgress = {
    loadedBytes: number;
    totalBytes?: number;
    percent?: number;
};

type WorkspaceVideoEditSetup = NonNullable<
    NonNullable<WorkspaceAsset["metadata"]>["videoEditSetup"]
>;

const DEFAULT_PUBLISH_TYPE_BY_PLATFORM: Record<
    WorkspaceSocialAccount["platform"],
    WorkspacePublishType
> = {
    facebook: "facebook_reel",
    tiktok: "tiktok_video",
    shopee: "shopee_video",
    youtube: "youtube_short",
};

const CATEGORY_LABELS: Record<WorkspaceNodeCategory, string> = {
    input: "Input Nodes",
    processing: "Processing Nodes",
    output: "Output Nodes",
    cleanup: "Cleanup Nodes",
};

const CATEGORY_ORDER: WorkspaceNodeCategory[] = [
    "input",
    "processing",
    "output",
    "cleanup",
];
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1400;
const NODE_WIDTH = 192;
const NODE_HEIGHT = 80;
const NODE_HEIGHT_OFFSET = NODE_HEIGHT / 2;
const NODE_HANDLE_HIT_SIZE = 18;
const NODE_HANDLE_VISUAL_SIZE = 8;
const WORKSPACE_RUNTIME_RESUME_STORAGE_KEY =
    "omnivideo.workspace.runtime.resume.v1";
const DEFAULT_CANVAS_VIEW = { x: 0, y: 0, scale: 0.6 };

type WorkspaceRuntimeResumeSnapshot = {
    version: 1;
    graphSignature: string;
    nodeRunStatus: Record<string, NodeRunState>;
    runtimeArtifactsByNodeId?: Record<string, WorkspaceRuntimeArtifact | undefined>;
    runtimeAssetIdsByNodeId: Record<string, string | undefined>;
    runtimeVietnameseMetadataByNodeId: Record<
        string,
        VietnameseVideoMetadataResult | undefined
    >;
    runError: string | null;
    runResult: string | null;
};
const MAX_RESUME_TEXT_LENGTH = 4000;

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function formatTimeout(timeoutMs: number) {
    if (timeoutMs < 60000) {
        return `${Math.round(timeoutMs / 1000)}s`;
    }

    return `${Math.round(timeoutMs / 60000)}m`;
}

function formatBytes(bytes: number) {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function formatDurationMs(durationMs: number) {
    const safeMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
    const totalSeconds = Math.round(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatTimelineTimestamp(seconds: number) {
    const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds - minutes * 60;
    return `${String(minutes).padStart(2, "0")}:${remaining
        .toFixed(2)
        .padStart(5, "0")}`;
}

function summarizeTextForProgress(value: string, limit = 88) {
    const compact = value.replace(/\s+/gu, " ").trim();
    if (!compact) return "(no text)";
    if (compact.length <= limit) return compact;
    return `${compact.slice(0, limit - 1).trimEnd()}...`;
}

function buildDubbingProgressStepDescription(input: {
    nodeLabel: string;
    result: VideoDubbingResult;
}) {
    const summary = `Dubbing ${input.nodeLabel} complete.`;
    const segments = input.result.translation.translatedSegments;
    const voiceAlignment = input.result.voice.alignment;
    const metadataLines = [
        "Metadata:",
        `File: ${input.result.fileName}`,
        `Size: ${formatBytes(input.result.byteLength)}`,
        `MIME: ${input.result.mimeType}`,
        `Runtime: ${formatDurationMs(input.result.generationDurationMs)}`,
        `Transcript: ${input.result.transcript.segments.length} segment(s) · ${input.result.transcript.words.length} word(s)`,
        `Translation: ${segments.length} segment(s) · ${input.result.translation.provider.name} · ${input.result.translation.model}`,
        `Voice: ${input.result.voice.segmentCount} segment(s) · ${formatBytes(input.result.voice.byteLength)} · ${voiceAlignment.mode} alignment`,
        `Mix: original ${input.result.mix.originalAudioVolume.toFixed(2)} · voice ${input.result.mix.voiceVolume.toFixed(2)}`,
    ];

    if (segments.length === 0) return [summary, ...metadataLines].join("\n");

    const header = `Segments (${segments.length} total):`;
    const timelineLines = segments.map((segment) => {
        const segmentText = summarizeTextForProgress(
            segment.translatedText || segment.sourceText || "",
        );
        return `[${formatTimelineTimestamp(segment.start)} -> ${formatTimelineTimestamp(segment.end)}] ${segmentText}`;
    });

    return [summary, ...metadataLines, header, ...timelineLines]
        .filter((line) => line.length > 0)
        .join("\n");
}

function buildVoiceProcessingChunkLines(
    alignment: VideoVipProcessingResult["voice"]["alignment"],
) {
    const chunks = alignment.processingChunks ?? [];
    if (chunks.length === 0) return [];

    const segmentCounts = chunks
        .map((chunk) => String(chunk.segmentCount))
        .join("/");
    return [
        `Voice chunks: ${chunks.length} chunk(s) · ${segmentCounts} segment(s)`,
        ...chunks.map(
            (chunk) =>
                `Voice chunk ${chunk.index}: ${chunk.segmentCount} segment(s) · ${formatTimelineTimestamp(chunk.start)} -> ${formatTimelineTimestamp(chunk.end)} · ${formatDurationMs(chunk.durationSeconds * 1000)}`,
        ),
    ];
}

function buildVipProgressStepDescription(input: {
    nodeLabel: string;
    result: VideoVipProcessingResult;
}) {
    const summary = `VIP processing ${input.nodeLabel} complete.`;
    const segments = input.result.translation.translatedSegments;
    const stage = input.result.stages;
    const voiceChunkLines = buildVoiceProcessingChunkLines(
        input.result.voice.alignment,
    );
    const metadataLines = [
        "Metadata:",
        `File: ${input.result.fileName}`,
        `Size: ${formatBytes(input.result.byteLength)}`,
        `MIME: ${input.result.mimeType}`,
        `Runtime: ${formatDurationMs(input.result.generationDurationMs)}`,
        `Transcript: ${input.result.transcript.segments.length} segment(s) · ${input.result.transcript.words.length} word(s)`,
        `Translation: ${segments.length} segment(s) · ${input.result.translation.provider.name} · ${input.result.translation.model}`,
        `Voice: ${input.result.voice.segmentCount} segment(s) · ${formatBytes(input.result.voice.byteLength)} · ${input.result.voice.alignment.mode} alignment`,
        `Stages: preprocess ${formatDurationMs(stage.preprocessDurationMs)} · transcript ${formatDurationMs(stage.transcriptionDurationMs)} · translate ${formatDurationMs(stage.translationDurationMs)} · voice ${formatDurationMs(stage.voiceDurationMs)} · render (speed+mix+mirror+blur+sub) ${formatDurationMs(stage.finalRenderDurationMs)} · metadata ${formatDurationMs(stage.metadataDurationMs)}`,
        "Stage log:",
        `Completed transcript stage (${formatDurationMs(stage.transcriptionDurationMs)}).`,
        `Completed translation stage (${formatDurationMs(stage.translationDurationMs)}).`,
        `Completed voice generation stage (${formatDurationMs(stage.voiceDurationMs)}).`,
        `Completed final render stage (speed + mirror + blur + subtitles + audio mix) (${formatDurationMs(stage.finalRenderDurationMs)}).`,
        `Completed metadata generation stage (${formatDurationMs(stage.metadataDurationMs)}).`,
        ...voiceChunkLines,
    ];

    if (segments.length === 0) return [summary, ...metadataLines].join("\n");
    const header = `Segments (${segments.length} total):`;
    const timelineLines = segments.map((segment) => {
        const segmentText = summarizeTextForProgress(
            segment.translatedText || segment.sourceText || "",
        );
        return `[${formatTimelineTimestamp(segment.start)} -> ${formatTimelineTimestamp(segment.end)}] ${segmentText}`;
    });

    return [summary, ...metadataLines, header, ...timelineLines]
        .filter((line) => line.length > 0)
        .join("\n");
}

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function buildWorkspaceLinkPath({
    startX,
    startY,
    endX,
    endY,
}: {
    startX: number;
    startY: number;
    endX: number;
    endY: number;
}) {
    const midX = startX + (endX - startX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
}

function findUpstreamNodeByTemplateType(
    graph: WorkspaceGraph,
    targetNodeId: string,
    templateNodeTypes: string[],
) {
    const visited = new Set<string>();
    const stack = graph.edges
        .filter((edge) => edge.toNodeId === targetNodeId)
        .map((edge) => edge.fromNodeId);
    while (stack.length > 0) {
        const current = stack.pop() as string;
        if (visited.has(current)) continue;
        visited.add(current);
        const currentNode = graph.nodes.find((entry) => entry.id === current);
        if (!currentNode) continue;
        if (templateNodeTypes.includes(currentNode.templateNodeType)) {
            return currentNode;
        }
        for (const edge of graph.edges) {
            if (edge.toNodeId === currentNode.id) {
                stack.push(edge.fromNodeId);
            }
        }
    }
    return null;
}

function findUpstreamSourceAssetNode(
    graph: WorkspaceGraph,
    targetNodeId: string,
) {
    return findUpstreamNodeByTemplateType(graph, targetNodeId, [
        "source.asset",
    ]);
}

function findUpstreamSourceFileNode(
    graph: WorkspaceGraph,
    targetNodeId: string,
) {
    return findUpstreamNodeByTemplateType(graph, targetNodeId, ["source.file"]);
}

function findUpstreamMetadataNode(graph: WorkspaceGraph, targetNodeId: string) {
    return findUpstreamNodeByTemplateType(graph, targetNodeId, [
        "text.generate-vi-metadata",
    ]);
}

function stripFileExtension(fileName: string) {
    return fileName.replace(/\.[^.]+$/u, "").trim();
}

function findMaskUpstreamVideoNode(graph: WorkspaceGraph, maskNodeId: string) {
    const videoSourceNodeTypes = new Set([
        "source.file",
        "source.url",
        "source.asset",
        "video.preprocess",
        "audio.video-dubbing",
        "edit.mirror",
        "edit.mask-region",
    ]);
    const candidates = graph.edges
        .filter(
            (edge) =>
                edge.toNodeId === maskNodeId && edge.toPortId !== "transcript",
        )
        .map((edge) => graph.nodes.find((node) => node.id === edge.fromNodeId))
        .filter(
            (node): node is WorkspaceNodeInstance =>
                node !== undefined &&
                videoSourceNodeTypes.has(node.templateNodeType),
        );

    if (candidates.length === 1) {
        return candidates[0];
    }
    return null;
}

function findMirrorParityToAncestorNode(
    graph: WorkspaceGraph,
    startNodeId: string,
    ancestorNodeId: string,
) {
    const startNode = graph.nodes.find((node) => node.id === startNodeId);
    if (!startNode) return null;
    const stack: Array<{ nodeId: string; parity: number }> = [
        {
            nodeId: startNodeId,
            parity: startNode.templateNodeType === "edit.mirror" ? 1 : 0,
        },
    ];
    const visited = new Set<string>();

    while (stack.length > 0) {
        const current = stack.pop() as { nodeId: string; parity: number };
        const key = `${current.nodeId}:${current.parity}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (current.nodeId === ancestorNodeId) {
            return current.parity;
        }

        const incomingEdges = graph.edges.filter(
            (edge) => edge.toNodeId === current.nodeId,
        );
        for (const edge of incomingEdges) {
            const parentNode = graph.nodes.find(
                (node) => node.id === edge.fromNodeId,
            );
            if (!parentNode) continue;
            stack.push({
                nodeId: parentNode.id,
                parity:
                    current.parity ^
                    (parentNode.templateNodeType === "edit.mirror" ? 1 : 0),
            });
        }
    }
    return null;
}

function mirrorBlurRegionsHorizontally(
    regions: NonNullable<WorkspaceVideoEditSetup["blurRegions"]>,
) {
    return regions.map((region) => {
        const width = clampNumber(Number(region.width), 0.5, 100);
        const x = clampNumber(Number(region.x), 0, 100);
        return {
            ...region,
            x: clampNumber(100 - (x + width), 0, Math.max(0, 100 - width)),
        };
    });
}

function buildEffectiveMaskSetup(
    node: WorkspaceNodeInstance,
    setup: WorkspaceVideoEditSetup | null,
    options?: { mirrorSetupRegions?: boolean },
) {
    if (!setup) return null;
    const shouldMirrorSetupRegions = options?.mirrorSetupRegions === true;
    const hasUserBlurRegionsOverride =
        getStringConfig(node, "blurRegionsJson").trim().length > 0;
    if (
        !shouldMirrorSetupRegions ||
        hasUserBlurRegionsOverride ||
        !Array.isArray(setup.blurRegions) ||
        setup.blurRegions.length === 0
    ) {
        return setup;
    }
    return {
        ...setup,
        blurRegions: mirrorBlurRegionsHorizontally(setup.blurRegions),
    };
}

async function probeVideoDimensionsFromFile(file: File): Promise<{
    width: number;
    height: number;
}> {
    return await new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            const width =
                Number.isFinite(video.videoWidth) && video.videoWidth > 0
                    ? Math.round(video.videoWidth)
                    : 1920;
            const height =
                Number.isFinite(video.videoHeight) && video.videoHeight > 0
                    ? Math.round(video.videoHeight)
                    : 1080;
            URL.revokeObjectURL(objectUrl);
            resolve({ width, height });
        };
        video.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({ width: 1920, height: 1080 });
        };
        video.src = objectUrl;
    });
}

function buildWorkspaceGraphSignature(graph: WorkspaceGraph) {
    return JSON.stringify({
        title: graph.title,
        nodes: graph.nodes.map((node) => ({
            id: node.id,
            templateNodeType: node.templateNodeType,
            label: node.label,
            position: node.position,
            config: node.config,
        })),
        edges: graph.edges,
    });
}

function buildInitialNodeRunStatus(graph: WorkspaceGraph) {
    const initial: Record<string, NodeRunState> = {};
    for (const node of graph.nodes) {
        initial[node.id] = { status: "idle", detail: "" };
    }
    return initial;
}

function parseRuntimeResumeSnapshot(
    raw: string | null,
): WorkspaceRuntimeResumeSnapshot | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as WorkspaceRuntimeResumeSnapshot;
        if (!parsed || parsed.version !== 1) return null;
        if (typeof parsed.graphSignature !== "string") return null;
        return parsed;
    } catch {
        return null;
    }
}

function trimResumeText(value: string | null | undefined) {
    if (!value) return null;
    const normalized = value.trim();
    if (!normalized) return null;
    return normalized.length <= MAX_RESUME_TEXT_LENGTH
        ? normalized
        : `${normalized.slice(0, MAX_RESUME_TEXT_LENGTH)}...`;
}

function buildNodeRunStatusResumeSnapshot(
    nodeRunStatus: Record<string, NodeRunState>,
) {
    return Object.fromEntries(
        Object.entries(nodeRunStatus).map(([nodeId, status]) => [
            nodeId,
            {
                status: status.status,
                detail: trimResumeText(status.detail) ?? "",
            },
        ]),
    );
}

function buildRuntimeArtifactResumeSnapshot(
    artifacts: Record<string, WorkspaceRuntimeArtifact | undefined>,
) {
    return Object.fromEntries(
        Object.entries(artifacts)
            .filter((entry): entry is [string, WorkspaceRuntimeArtifact] =>
                Boolean(entry[1]?.artifactId),
            )
            .map(([nodeId, artifact]) => [
                nodeId,
                {
                    artifactId: artifact.artifactId,
                    artifactExpiresAt: artifact.artifactExpiresAt,
                    fileName: artifact.fileName,
                    mimeType: artifact.mimeType,
                    byteLength: artifact.byteLength,
                    kind: artifact.kind,
                    detail: trimResumeText(artifact.detail) ?? "",
                },
            ]),
    );
}

function artifactDataUrl(artifact: WorkspaceRuntimeArtifact) {
    if (artifact.objectUrl) return artifact.objectUrl;
    if (!artifact.base64) return null;
    return `data:${artifact.mimeType};base64,${artifact.base64}`;
}

function revokeRuntimeArtifactUrls(
    artifacts: Record<string, WorkspaceRuntimeArtifact | undefined>,
) {
    for (const artifact of Object.values(artifacts)) {
        if (artifact?.objectUrl) {
            URL.revokeObjectURL(artifact.objectUrl);
        }
    }
}

function base64ToFile(artifact: WorkspaceRuntimeArtifact) {
    if (artifact.file) return artifact.file;
    if (!artifact.base64) {
        throw new Error(
            `Runtime artifact '${artifact.fileName}' không có file/base64 để dùng trực tiếp từ browser.`,
        );
    }
    const binary = atob(artifact.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], artifact.fileName, { type: artifact.mimeType });
}

async function resolveRuntimeArtifactFileForLocalSave(input: {
    artifact: WorkspaceRuntimeArtifact;
    actionLabel: string;
    onProgress?: (progress: WorkspaceFileProgress) => void;
}) {
    const { artifact } = input;
    if (artifact.file || artifact.base64) {
        const file = base64ToFile(artifact);
        return {
            file,
            fileName: artifact.fileName,
            mimeType: artifact.mimeType,
            byteLength: artifact.byteLength || file.size,
        };
    }
    if (artifact.artifactId) {
        return fetchWorkspaceFile({
            url: `/api/workspace/artifacts/${artifact.artifactId}/download`,
            actionLabel: input.actionLabel,
            onProgress: input.onProgress,
        });
    }
    throw new Error(
        `Runtime artifact '${artifact.fileName}' không có file/base64/artifactId để lưu về máy local.`,
    );
}

function getWorkspaceApiErrorMessage(
    payload: unknown,
    fallback: string,
    status?: number,
) {
    if (payload && typeof payload === "object") {
        const data = payload as { error?: unknown; errorCode?: unknown };
        if (typeof data.error === "string" && data.error.trim()) {
            return data.error;
        }
        if (typeof data.errorCode === "string" && data.errorCode.trim()) {
            return data.errorCode;
        }
    }
    if (typeof status === "number" && status >= 400) {
        return `${fallback} (HTTP ${status})`;
    }
    return fallback;
}

type WorkspaceApiStep = {
    id?: string;
    label?: string;
    status?: string;
    detail?: string;
    metrics?: Record<string, unknown>;
};

type WorkspaceApiErrorPayload = {
    error?: unknown;
    errorCode?: unknown;
    steps?: unknown;
    checkpoint?: unknown;
};

class WorkspaceApiError extends Error {
    readonly status?: number;
    readonly payload: unknown;
    readonly url: string;
    readonly actionLabel: string;

    constructor(input: {
        message: string;
        status?: number;
        payload: unknown;
        url: string;
        actionLabel: string;
    }) {
        super(input.message);
        this.name = "WorkspaceApiError";
        this.status = input.status;
        this.payload = input.payload;
        this.url = input.url;
        this.actionLabel = input.actionLabel;
    }
}

function parseWorkspaceApiSteps(payload: unknown): WorkspaceApiStep[] {
    if (!payload || typeof payload !== "object") return [];
    const steps = (payload as WorkspaceApiErrorPayload).steps;
    if (!Array.isArray(steps)) return [];
    return steps.filter(
        (step): step is WorkspaceApiStep =>
            Boolean(step) && typeof step === "object",
    );
}

function formatWorkspaceMetricValue(value: unknown) {
    if (typeof value === "string") return value;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
    if (typeof value === "boolean") return value ? "true" : "false";
    return "";
}

function readWorkspaceCheckpointStages(value: unknown) {
    return Array.isArray(value)
        ? value.filter(
              (stage): stage is string =>
                  typeof stage === "string" && stage.trim().length > 0,
          )
        : [];
}

function parseWorkspaceApiCheckpoint(payload: unknown) {
    if (!payload || typeof payload !== "object") return null;
    const checkpoint = (payload as WorkspaceApiErrorPayload).checkpoint;
    if (!checkpoint || typeof checkpoint !== "object") return null;
    const data = checkpoint as {
        failedStage?: unknown;
        reusedStages?: unknown;
        savedStages?: unknown;
        reusableStages?: unknown;
    };
    return {
        failedStage:
            typeof data.failedStage === "string" ? data.failedStage : "",
        reusedStages: readWorkspaceCheckpointStages(data.reusedStages),
        savedStages: readWorkspaceCheckpointStages(data.savedStages),
        reusableStages: readWorkspaceCheckpointStages(data.reusableStages),
    };
}

function buildWorkspaceApiFailureDetailLines(payload: unknown) {
    const lines: string[] = [];
    if (!payload || typeof payload !== "object") return lines;
    const data = payload as WorkspaceApiErrorPayload;
    const errorCode =
        typeof data.errorCode === "string" ? data.errorCode.trim() : "";
    const error =
        typeof data.error === "string" ? data.error.trim() : "";

    if (errorCode) lines.push(`API error code: ${errorCode}`);
    if (error) lines.push(`API error: ${error}`);

    const checkpoint = parseWorkspaceApiCheckpoint(payload);
    if (checkpoint) {
        if (checkpoint.failedStage) {
            lines.push(`VIP failed stage: ${checkpoint.failedStage}`);
        }
        if (checkpoint.reusableStages.length > 0) {
            lines.push(
                `VIP checkpoint reusable stages: ${checkpoint.reusableStages.join(", ")}`,
            );
            lines.push(
                "Continue Failed Flow will skip those VIP stages on the same server/source/config.",
            );
        }
        if (checkpoint.savedStages.length > 0) {
            lines.push(
                `VIP checkpoint saved this run: ${checkpoint.savedStages.join(", ")}`,
            );
        }
        if (checkpoint.reusedStages.length > 0) {
            lines.push(
                `VIP checkpoint reused this run: ${checkpoint.reusedStages.join(", ")}`,
            );
        }
    }

    const steps = parseWorkspaceApiSteps(payload);
    if (steps.length === 0) return lines;

    lines.push("VIP stage details:");
    for (const step of steps) {
        const status = typeof step.status === "string" ? step.status : "unknown";
        const label = typeof step.label === "string" ? step.label : step.id ?? "step";
        const detail = typeof step.detail === "string" ? step.detail : "";
        lines.push(`[${status}] ${label}${detail ? `: ${detail}` : ""}`);

        if (step.metrics && typeof step.metrics === "object") {
            const metricParts = Object.entries(step.metrics)
                .map(([key, value]) => {
                    const formatted = formatWorkspaceMetricValue(value);
                    if (!formatted) return "";
                    return `${key}=${formatted}`;
                })
                .filter(Boolean);
            if (metricParts.length > 0) {
                lines.push(`metrics: ${metricParts.join(", ")}`);
            }
        }
    }

    return lines;
}

async function fetchWorkspaceJson<T>(input: {
    url: string;
    actionLabel: string;
    init?: RequestInit;
}) {
    let response: Response;
    try {
        response = await fetch(input.url, input.init);
    } catch (error) {
        const detail =
            error instanceof Error && error.message
                ? error.message
                : "network error";
        throw new Error(
            `${input.actionLabel} failed at ${input.url}: ${detail}`,
        );
    }

    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    const ok =
        response.ok &&
        (!payload ||
            typeof payload !== "object" ||
            !("ok" in payload) ||
            (payload as { ok?: unknown }).ok !== false);

    if (!ok) {
        throw new WorkspaceApiError({
            message: `${input.actionLabel} failed at ${input.url}: ${getWorkspaceApiErrorMessage(
                payload,
                "Unexpected API error.",
                response.status,
            )}`,
            status: response.status,
            payload,
            url: input.url,
            actionLabel: input.actionLabel,
        });
    }

    return payload as T;
}

async function fetchWorkspaceFile(input: {
    url: string;
    actionLabel: string;
    init?: RequestInit;
    onProgress?: (progress: WorkspaceFileProgress) => void;
}) {
    let response: Response;
    try {
        response = await fetch(input.url, input.init);
    } catch (error) {
        const detail =
            error instanceof Error && error.message
                ? error.message
                : "network error";
        throw new Error(
            `${input.actionLabel} failed at ${input.url}: ${detail}`,
        );
    }

    if (!response.ok) {
        let payload: unknown = null;
        try {
            payload = await response.json();
        } catch {
            payload = null;
        }
        throw new Error(
            `${input.actionLabel} failed at ${input.url}: ${getWorkspaceApiErrorMessage(
                payload,
                "Unexpected API error.",
                response.status,
            )}`,
        );
    }

    const blob = await readWorkspaceResponseBlob(response, input.onProgress);
    const fileName = decodeURIComponent(
        response.headers.get("X-OmniVideo-File-Name") || "workspace-output.mp4",
    );
    const mimeType =
        response.headers.get("Content-Type") || blob.type || "video/mp4";
    const file = new File([blob], fileName, { type: mimeType });
    const byteLength = Number(response.headers.get("X-OmniVideo-Byte-Length"));

    return {
        file,
        fileName,
        mimeType,
        byteLength: Number.isFinite(byteLength) ? byteLength : file.size,
        objectUrl: URL.createObjectURL(file),
        transformHeader: response.headers.get("X-OmniVideo-Transform"),
    };
}

async function readWorkspaceResponseBlob(
    response: Response,
    onProgress?: (progress: WorkspaceFileProgress) => void,
) {
    const totalBytes = Number(
        response.headers.get("content-length") ??
            response.headers.get("X-OmniVideo-Byte-Length"),
    );
    const canMeasure = Number.isFinite(totalBytes) && totalBytes > 0;
    if (!response.body || !onProgress || !canMeasure) {
        return response.blob();
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let loadedBytes = 0;
    let lastPercent = -1;
    let lastUpdateAt = 0;

    onProgress({
        loadedBytes,
        totalBytes,
        percent: 0,
    });

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        const chunk =
            value.buffer instanceof ArrayBuffer
                ? (value as Uint8Array<ArrayBuffer>)
                : Uint8Array.from(value);
        chunks.push(chunk);
        loadedBytes += chunk.byteLength;
        const percent = Math.min(
            100,
            Math.round((loadedBytes / totalBytes) * 100),
        );
        const now = Date.now();
        if (
            percent === 100 ||
            (percent !== lastPercent && now - lastUpdateAt >= 250)
        ) {
            lastPercent = percent;
            lastUpdateAt = now;
            onProgress({
                loadedBytes,
                totalBytes,
                percent,
            });
        }
    }

    return new Blob(chunks, {
        type: response.headers.get("content-type") ?? undefined,
    });
}

async function saveWorkspaceFileToLocal(input: {
    file: File;
    mode: "downloads" | "choose-folder";
}) {
    if (
        input.mode === "choose-folder" &&
        typeof window !== "undefined" &&
        "showSaveFilePicker" in window
    ) {
        const pickerWindow = window as Window & {
            showSaveFilePicker?: (options?: {
                suggestedName?: string;
                types?: Array<{
                    description?: string;
                    accept?: Record<string, string[]>;
                }>;
            }) => Promise<{
                createWritable: () => Promise<{
                    write: (data: Blob | BufferSource | string) => Promise<void>;
                    close: () => Promise<void>;
                }>;
            }>;
        };
        const handle = await pickerWindow.showSaveFilePicker?.({
            suggestedName: input.file.name,
            types: [
                {
                    description: "Video file",
                    accept: {
                        [input.file.type || "video/mp4"]: [
                            `.${input.file.name.split(".").pop() || "mp4"}`,
                        ],
                    },
                },
            ],
        });
        if (!handle) {
            throw new Error("Cannot open folder picker.");
        }
        const writable = await handle.createWritable();
        await writable.write(input.file);
        await writable.close();
        return;
    }

    const objectUrl = URL.createObjectURL(input.file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = input.file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function statusClass(status: WorkspaceNodeTemplate["status"]) {
    if (status === "available") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    }
    if (status === "blocked") {
        return "border-rose-500/30 bg-rose-500/10 text-rose-700";
    }

    return "border-amber-500/30 bg-amber-500/10 text-amber-700";
}

function runStatusBadgeClass(status: NodeRunStatus) {
    if (status === "running") {
        return "border-accent/40 bg-accent/10 text-accent";
    }
    if (status === "success") {
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700";
    }
    if (status === "failed") {
        return "border-rose-500/30 bg-rose-500/10 text-rose-700";
    }
    if (status === "skipped") {
        return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    }
    return "border-main bg-secondary/30 text-muted";
}

function templateAccent(category: WorkspaceNodeCategory) {
    if (category === "input") {
        return "border-l-blue-500";
    }
    if (category === "output") {
        return "border-l-emerald-500";
    }
    if (category === "cleanup") {
        return "border-l-rose-500";
    }

    return "border-l-violet-500";
}

function parseCommaList(value: string) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

const PIPER_TTS_SETUP_ROWS = [
    ["Alignment mode", DEFAULT_PIPER_TTS_SETTINGS.alignmentMode],
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

function getStringConfig(
    node: WorkspaceNodeInstance | undefined,
    key: string,
    fallback = "",
): string {
    if (!node) return fallback;
    const value = node.config[key];
    if (value === undefined || value === null) return fallback;
    return String(value);
}

function getBooleanConfig(
    node: WorkspaceNodeInstance | undefined,
    key: string,
    fallback = false,
): boolean {
    if (!node) return fallback;
    const value = node.config[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return fallback;
}

function getNumberConfig(
    node: WorkspaceNodeInstance | undefined,
    key: string,
    fallback: number,
): number {
    if (!node) return fallback;
    const value = node.config[key];
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const MASK_REGION_DEFAULTS = {
    blurRegionsJson: "",
    blurEnabled: true,
    coverBoxEnabled: false,
    subtitleOverlayEnabled: true,
    regionX: 0,
    regionY: 84,
    regionWidth: 100,
    regionHeight: 16,
    timelineStart: 0,
    timelineEnd: 36000,
    blurStrength: 50,
    subtitleFontFamily: "Arial",
    subtitleFontSize: 55,
    subtitleMarginBottom: 150,
    subtitleMarginLeft: 60,
    subtitleMarginRight: 60,
    subtitleAlignment: 2,
    subtitleBackgroundEnabled: true,
    subtitleBackgroundColor: "#000000",
    subtitleBackgroundOpacity: 65,
    mirrorEnabled: false,
    textOverlayEnabled: false,
    textOverlaysJson: "",
} as const;

function resolveMaskStringConfig(input: {
    node: WorkspaceNodeInstance;
    key: string;
    defaultValue: string;
    setupValue?: string;
}) {
    const raw = input.node.config[input.key];
    const hasRaw = raw !== undefined && raw !== null;
    const rawValue = hasRaw ? String(raw).trim() : "";
    if (hasRaw && rawValue && rawValue !== input.defaultValue) {
        return rawValue;
    }
    if (input.setupValue && input.setupValue.trim()) {
        return input.setupValue.trim();
    }
    if (hasRaw && rawValue) {
        return rawValue;
    }
    return input.defaultValue;
}

function resolveMaskNumberConfig(input: {
    node: WorkspaceNodeInstance;
    key: string;
    defaultValue: number;
    setupValue?: number;
}) {
    const raw = input.node.config[input.key];
    const parsedRaw = typeof raw === "number" ? raw : Number(raw);
    const hasRaw =
        raw !== undefined && raw !== null && Number.isFinite(parsedRaw);
    if (hasRaw && parsedRaw !== input.defaultValue) {
        return parsedRaw;
    }
    if (
        typeof input.setupValue === "number" &&
        Number.isFinite(input.setupValue)
    ) {
        return input.setupValue;
    }
    if (hasRaw) {
        return parsedRaw;
    }
    return input.defaultValue;
}

function resolveMaskBooleanConfig(input: {
    node: WorkspaceNodeInstance;
    key: string;
    defaultValue: boolean;
    setupValue?: boolean;
}) {
    const raw = input.node.config[input.key];
    const parsedRaw =
        typeof raw === "boolean"
            ? raw
            : typeof raw === "string"
              ? raw === "true"
              : undefined;
    const hasRaw = parsedRaw !== undefined;
    if (hasRaw && parsedRaw !== input.defaultValue) {
        return parsedRaw;
    }
    if (typeof input.setupValue === "boolean") {
        return input.setupValue;
    }
    if (hasRaw) {
        return parsedRaw;
    }
    return input.defaultValue;
}

function resolveMaskRegionConfig(
    node: WorkspaceNodeInstance,
    setup: WorkspaceVideoEditSetup | null,
) {
    const rawBlurRegionsJson = getStringConfig(node, "blurRegionsJson").trim();
    const setupBlurRegionsJson =
        setup?.blurRegions && setup.blurRegions.length > 0
            ? JSON.stringify(setup.blurRegions)
            : "";
    const setupTextOverlaysJson =
        setup?.textOverlayEnabled === true && setup.textOverlay
            ? JSON.stringify([setup.textOverlay])
            : "";

    return {
        mirrorEnabled: resolveMaskBooleanConfig({
            node,
            key: "mirrorEnabled",
            defaultValue: MASK_REGION_DEFAULTS.mirrorEnabled,
            setupValue: setup?.mirrorEnabled,
        }),
        blurEnabled: resolveMaskBooleanConfig({
            node,
            key: "blurEnabled",
            defaultValue: MASK_REGION_DEFAULTS.blurEnabled,
            setupValue: setup?.blurEnabled,
        }),
        coverBoxEnabled: resolveMaskBooleanConfig({
            node,
            key: "coverBoxEnabled",
            defaultValue: MASK_REGION_DEFAULTS.coverBoxEnabled,
            setupValue: setup?.coverBoxEnabled,
        }),
        subtitleOverlayEnabled: resolveMaskBooleanConfig({
            node,
            key: "subtitleOverlayEnabled",
            defaultValue: MASK_REGION_DEFAULTS.subtitleOverlayEnabled,
            setupValue: setup?.subtitleOverlayEnabled,
        }),
        blurRegionsJson: rawBlurRegionsJson || setupBlurRegionsJson,
        textOverlayEnabled: resolveMaskBooleanConfig({
            node,
            key: "textOverlayEnabled",
            defaultValue: MASK_REGION_DEFAULTS.textOverlayEnabled,
            setupValue: setup?.textOverlayEnabled,
        }),
        textOverlaysJson:
            getStringConfig(node, "textOverlaysJson").trim() ||
            setupTextOverlaysJson,
        regionX: resolveMaskNumberConfig({
            node,
            key: "regionX",
            defaultValue: MASK_REGION_DEFAULTS.regionX,
        }),
        regionY: resolveMaskNumberConfig({
            node,
            key: "regionY",
            defaultValue: MASK_REGION_DEFAULTS.regionY,
        }),
        regionWidth: resolveMaskNumberConfig({
            node,
            key: "regionWidth",
            defaultValue: MASK_REGION_DEFAULTS.regionWidth,
        }),
        regionHeight: resolveMaskNumberConfig({
            node,
            key: "regionHeight",
            defaultValue: MASK_REGION_DEFAULTS.regionHeight,
        }),
        timelineStart: resolveMaskNumberConfig({
            node,
            key: "timelineStart",
            defaultValue: MASK_REGION_DEFAULTS.timelineStart,
        }),
        timelineEnd: resolveMaskNumberConfig({
            node,
            key: "timelineEnd",
            defaultValue: MASK_REGION_DEFAULTS.timelineEnd,
        }),
        blurStrength: resolveMaskNumberConfig({
            node,
            key: "blurStrength",
            defaultValue: MASK_REGION_DEFAULTS.blurStrength,
        }),
        subtitleFontFamily: resolveMaskStringConfig({
            node,
            key: "subtitleFontFamily",
            defaultValue: MASK_REGION_DEFAULTS.subtitleFontFamily,
            setupValue: setup?.subtitleFontFamily ?? undefined,
        }),
        subtitleFontSize: resolveMaskNumberConfig({
            node,
            key: "subtitleFontSize",
            defaultValue: MASK_REGION_DEFAULTS.subtitleFontSize,
            setupValue: setup?.subtitleFontSize ?? undefined,
        }),
        subtitleMarginBottom: resolveMaskNumberConfig({
            node,
            key: "subtitleMarginBottom",
            defaultValue: MASK_REGION_DEFAULTS.subtitleMarginBottom,
            setupValue: setup?.subtitleMarginBottom ?? undefined,
        }),
        subtitleMarginLeft: resolveMaskNumberConfig({
            node,
            key: "subtitleMarginLeft",
            defaultValue: MASK_REGION_DEFAULTS.subtitleMarginLeft,
            setupValue: setup?.subtitleMarginLeft ?? undefined,
        }),
        subtitleMarginRight: resolveMaskNumberConfig({
            node,
            key: "subtitleMarginRight",
            defaultValue: MASK_REGION_DEFAULTS.subtitleMarginRight,
            setupValue: setup?.subtitleMarginRight ?? undefined,
        }),
        subtitleAlignment: resolveMaskNumberConfig({
            node,
            key: "subtitleAlignment",
            defaultValue: MASK_REGION_DEFAULTS.subtitleAlignment,
            setupValue: setup?.subtitleAlignment ?? undefined,
        }),
        subtitleBackgroundEnabled: resolveMaskBooleanConfig({
            node,
            key: "subtitleBackgroundEnabled",
            defaultValue: MASK_REGION_DEFAULTS.subtitleBackgroundEnabled,
            setupValue: setup?.subtitleBackgroundEnabled ?? undefined,
        }),
        subtitleBackgroundColor: resolveMaskStringConfig({
            node,
            key: "subtitleBackgroundColor",
            defaultValue: MASK_REGION_DEFAULTS.subtitleBackgroundColor,
            setupValue: setup?.subtitleBackgroundColor ?? undefined,
        }),
        subtitleBackgroundOpacity: resolveMaskNumberConfig({
            node,
            key: "subtitleBackgroundOpacity",
            defaultValue: MASK_REGION_DEFAULTS.subtitleBackgroundOpacity,
            setupValue: setup?.subtitleBackgroundOpacity ?? undefined,
        }),
    };
}

function getNodePublishType(
    node: WorkspaceNodeInstance | undefined,
): WorkspacePublishType {
    const raw = getStringConfig(node, "publishType", "");
    const allowed: WorkspacePublishType[] = [
        "facebook_reel",
        "facebook_video",
        "tiktok_video",
        "shopee_video",
        "youtube_short",
        "youtube_video",
    ];
    if (allowed.includes(raw as WorkspacePublishType)) {
        return raw as WorkspacePublishType;
    }
    return "youtube_short";
}

function getNodePrivacy(
    node: WorkspaceNodeInstance | undefined,
): "private" | "unlisted" | "public" {
    const raw = getStringConfig(node, "privacyStatus", "private");
    if (raw === "unlisted" || raw === "public") return raw;
    return "private";
}

function publishTypesForAccount(
    account: WorkspaceSocialAccount | undefined,
): WorkspacePublishType[] {
    if (!account) return [];
    if (account.supportedFormats.length > 0) {
        return account.supportedFormats;
    }
    return [DEFAULT_PUBLISH_TYPE_BY_PLATFORM[account.platform]];
}

function matchesThumbnailAssetSearch(
    asset: WorkspaceThumbnailAsset,
    query: string,
) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return true;
    const haystack = [
        asset.metadata?.title,
        asset.metadata?.folder,
        ...(asset.metadata?.tags ?? []),
        asset.storageProvider,
        asset.providerAssetId,
        asset._id,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
    return haystack.includes(normalizedQuery);
}

export function WorkspaceCanvasPanel({ section }: WorkspaceCanvasPanelProps) {
    const Icon = section.icon;
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const [graph, setGraph] = useState<WorkspaceGraph>(() =>
        createEmptyWorkspaceGraph("Workspace Draft"),
    );
    const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
    const [pendingSourceNodeId, setPendingSourceNodeId] = useState<
        string | null
    >(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [canvasView, setCanvasView] = useState(DEFAULT_CANVAS_VIEW);
    const [storageAccounts, setStorageAccounts] = useState<
        WorkspaceStorageAccount[]
    >([]);
    const [socialAccounts, setSocialAccounts] = useState<
        WorkspaceSocialAccount[]
    >([]);
    const [aiProviders, setAiProviders] = useState<WorkspaceAiProvider[]>([]);
    const [aiModelsByProviderId, setAiModelsByProviderId] = useState<
        Record<string, WorkspaceAiModel[] | undefined>
    >({});
    const [loadingAiModelProviderIds, setLoadingAiModelProviderIds] = useState<
        Record<string, boolean>
    >({});
    const [storageAssets, setStorageAssets] = useState<WorkspaceAsset[]>([]);
    const [thumbnailAssets, setThumbnailAssets] = useState<
        WorkspaceThumbnailAsset[]
    >([]);
    const [accountsError, setAccountsError] = useState<string | null>(null);
    const [facebookPagesByAccount, setFacebookPagesByAccount] = useState<
        Record<string, FacebookPageOption[]>
    >({});
    const [loadingFacebookAccountIds, setLoadingFacebookAccountIds] = useState<
        Record<string, boolean>
    >({});
    const [runtimeFilesByNodeId, setRuntimeFilesByNodeId] = useState<
        Record<string, File | undefined>
    >({});
    const [runtimeArtifactsByNodeId, setRuntimeArtifactsByNodeId] = useState<
        Record<string, WorkspaceRuntimeArtifact | undefined>
    >({});
    const [runtimeAssetIdsByNodeId, setRuntimeAssetIdsByNodeId] = useState<
        Record<string, string | undefined>
    >({});
    const [runtimeTranscriptsByNodeId, setRuntimeTranscriptsByNodeId] =
        useState<Record<string, ChineseTranscriptionResult | undefined>>({});
    const [runtimeTranslationsByNodeId, setRuntimeTranslationsByNodeId] =
        useState<Record<string, TranscriptTranslationResult | undefined>>({});
    const [
        runtimeVietnameseMetadataByNodeId,
        setRuntimeVietnameseMetadataByNodeId,
    ] = useState<Record<string, VietnameseVideoMetadataResult | undefined>>({});
    const [nodeRunStatus, setNodeRunStatus] = useState<
        Record<string, NodeRunState>
    >({});
    const [isRunningFlow, setIsRunningFlow] = useState(false);
    const [isFlowSetupOpen, setIsFlowSetupOpen] = useState(false);
    const [runError, setRunError] = useState<string | null>(null);
    const [runResult, setRunResult] = useState<string | null>(null);
    const [dragState, setDragState] = useState<{
        nodeId: string;
        pointerId: number;
        offsetX: number;
        offsetY: number;
    } | null>(null);
    const [panState, setPanState] = useState<{
        pointerId: number;
        startX: number;
        startY: number;
        originX: number;
        originY: number;
    } | null>(null);
    const [linkDragState, setLinkDragState] = useState<{
        sourceNodeId: string;
        pointerId: number;
        sourceSide: "top" | "right" | "bottom" | "left";
        point: { x: number; y: number };
    } | null>(null);
    const [linkDragTarget, setLinkDragTarget] = useState<{
        nodeId: string;
        side: "top" | "right" | "bottom" | "left";
    } | null>(null);

    const selectedNode = useMemo(
        () =>
            graph.nodes.find((node) => node.id === graph.selectedNodeId) ??
            undefined,
        [graph.nodes, graph.selectedNodeId],
    );
    const selectedTemplate = selectedNode
        ? getWorkspaceNodeTemplate(selectedNode.templateNodeType)
        : undefined;
    const validation = validateWorkspaceGraph(graph);
    const flowPlan: WorkspaceFlowPlan = useMemo(
        () => planWorkspaceFlow(graph),
        [graph],
    );
    const flowSetupNodes = useMemo(
        () => getWorkspaceFlowSetupNodes(graph, flowPlan),
        [graph, flowPlan],
    );
    const flowSetupValidationContext = useMemo(
        () => ({
            runtimeFileNodeIds: new Set(
                Object.entries(runtimeFilesByNodeId)
                    .filter(([, file]) => Boolean(file))
                    .map(([nodeId]) => nodeId),
            ),
            storageAccountIds: new Set(
                storageAccounts.map((account) => account._id),
            ),
            socialAccountIds: new Set(
                socialAccounts.map((account) => account._id),
            ),
            storageAssetIds: new Set(storageAssets.map((asset) => asset._id)),
            thumbnailAssetIds: new Set(
                thumbnailAssets.map((asset) => asset._id),
            ),
            storageAssetMaskSetupIds: new Set(
                storageAssets
                    .filter((asset) => Boolean(asset.metadata?.videoEditSetup))
                    .map((asset) => asset._id),
            ),
        }),
        [
            runtimeFilesByNodeId,
            socialAccounts,
            storageAccounts,
            storageAssets,
            thumbnailAssets,
        ],
    );
    const flowSetupIssuesByNodeId = useMemo(
        () =>
            Object.fromEntries(
                flowSetupNodes.map(({ node }) => [
                    node.id,
                    getWorkspaceNodeSetupIssues({
                        node,
                        plan: flowPlan,
                        context: flowSetupValidationContext,
                    }),
                ]),
            ) as Record<string, string[]>,
        [flowPlan, flowSetupNodes, flowSetupValidationContext],
    );
    const flowSetupWarningsByNodeId = useMemo(
        () =>
            Object.fromEntries(
                flowSetupNodes.map(({ node }) => [
                    node.id,
                    getWorkspaceNodeSetupWarnings({
                        node,
                        graph,
                        plan: flowPlan,
                        context: flowSetupValidationContext,
                    }),
                ]),
            ) as Record<string, string[]>,
        [flowPlan, flowSetupNodes, flowSetupValidationContext, graph],
    );
    const flowSetupIssueCount = Object.values(flowSetupIssuesByNodeId).reduce(
        (total, issues) => total + issues.length,
        0,
    );
    const hasResumeCheckpoint = useMemo(() => {
        if (!flowPlan.ok) return false;
        return flowPlan.steps.some((step) => {
            if (step.kind === "use-existing-asset") {
                return Boolean(runtimeAssetIdsByNodeId[step.producerNodeId]);
            }
            if (step.kind === "upload-and-store") {
                return Boolean(runtimeAssetIdsByNodeId[step.producerNodeId]);
            }
            if (step.kind === "transcribe-chinese") {
                return Boolean(
                    runtimeTranscriptsByNodeId[step.transcriptionNodeId],
                );
            }
            if (step.kind === "translate-transcript") {
                return Boolean(
                    runtimeTranslationsByNodeId[step.translationNodeId],
                );
            }
            if (step.kind === "generate-voice") {
                return Boolean(runtimeArtifactsByNodeId[step.voiceNodeId]);
            }
            if (step.kind === "dub-video") {
                return Boolean(
                    runtimeArtifactsByNodeId[step.dubbingNodeId] &&
                    runtimeTranslationsByNodeId[step.dubbingNodeId],
                );
            }
            if (step.kind === "vip-process-video") {
                return Boolean(
                    runtimeArtifactsByNodeId[step.vipNodeId] &&
                        runtimeTranslationsByNodeId[step.vipNodeId] &&
                        runtimeVietnameseMetadataByNodeId[step.vipNodeId],
                );
            }
            if (step.kind === "mirror-video") {
                return Boolean(runtimeArtifactsByNodeId[step.mirrorNodeId]);
            }
            if (step.kind === "edit-video") {
                return Boolean(runtimeArtifactsByNodeId[step.editNodeId]);
            }
            if (step.kind === "store-artifact") {
                return Boolean(runtimeAssetIdsByNodeId[step.producerNodeId]);
            }
            if (step.kind === "download-local") {
                return false;
            }
            if (step.kind === "cleanup-assets") {
                return false;
            }
            return false;
        });
    }, [
        flowPlan,
        runtimeArtifactsByNodeId,
        runtimeAssetIdsByNodeId,
        runtimeVietnameseMetadataByNodeId,
        runtimeTranscriptsByNodeId,
        runtimeTranslationsByNodeId,
    ]);

    const groupedTemplates = useMemo(
        () =>
            CATEGORY_ORDER.map((category) => ({
                category,
                templates: WORKSPACE_NODE_TEMPLATES.filter(
                    (template) => template.category === category,
                ),
            })),
        [],
    );

    useEffect(() => {
        const parsedGraph = parseWorkspaceDraft(
            window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY),
        );
        const graphSignature = buildWorkspaceGraphSignature(parsedGraph);
        const snapshot = parseRuntimeResumeSnapshot(
            window.localStorage.getItem(WORKSPACE_RUNTIME_RESUME_STORAGE_KEY),
        );

        setGraph(parsedGraph);
        if (snapshot && snapshot.graphSignature === graphSignature) {
            const baseStatus = buildInitialNodeRunStatus(parsedGraph);
            const mergedStatus: Record<string, NodeRunState> = {
                ...baseStatus,
                ...snapshot.nodeRunStatus,
            };
            setNodeRunStatus(mergedStatus);
            setRuntimeArtifactsByNodeId(snapshot.runtimeArtifactsByNodeId ?? {});
            setRuntimeAssetIdsByNodeId(snapshot.runtimeAssetIdsByNodeId ?? {});
            setRuntimeVietnameseMetadataByNodeId(
                snapshot.runtimeVietnameseMetadataByNodeId ?? {},
            );
            setRunError(snapshot.runError ?? null);
            setRunResult(snapshot.runResult ?? null);
        } else {
            setNodeRunStatus(buildInitialNodeRunStatus(parsedGraph));
        }

        setHasHydratedDraft(true);
    }, []);

    useEffect(() => {
        if (!hasHydratedDraft) return;
        window.localStorage.setItem(
            WORKSPACE_DRAFT_STORAGE_KEY,
            serializeWorkspaceDraft(graph),
        );
    }, [graph, hasHydratedDraft]);

    useEffect(() => {
        if (!hasHydratedDraft) return;
        try {
            const snapshot: WorkspaceRuntimeResumeSnapshot = {
                version: 1,
                graphSignature: buildWorkspaceGraphSignature(graph),
                nodeRunStatus: buildNodeRunStatusResumeSnapshot(nodeRunStatus),
                runtimeArtifactsByNodeId:
                    buildRuntimeArtifactResumeSnapshot(runtimeArtifactsByNodeId),
                runtimeAssetIdsByNodeId,
                runtimeVietnameseMetadataByNodeId,
                runError: trimResumeText(runError),
                runResult: trimResumeText(runResult),
            };
            window.localStorage.setItem(
                WORKSPACE_RUNTIME_RESUME_STORAGE_KEY,
                JSON.stringify(snapshot),
            );
        } catch (error) {
            if (error instanceof DOMException && error.name === "QuotaExceededError") {
                window.localStorage.removeItem(
                    WORKSPACE_RUNTIME_RESUME_STORAGE_KEY,
                );
            }
        }
    }, [
        graph,
        hasHydratedDraft,
        nodeRunStatus,
        runError,
        runResult,
        runtimeArtifactsByNodeId,
        runtimeAssetIdsByNodeId,
        runtimeVietnameseMetadataByNodeId,
    ]);

    useEffect(() => {
        let isActive = true;

        async function loadRuntimeAccounts() {
            try {
                const [
                    storageResponse,
                    socialResponse,
                    assetsResponse,
                    thumbnailAssetsResponse,
                    aiProvidersResponse,
                ] = await Promise.all([
                    fetch("/api/storage/providers"),
                    fetch("/api/social/accounts"),
                    fetch("/api/storage/assets?limit=100"),
                    fetch("/api/storage/thumbnail-assets?limit=100"),
                    fetch("/api/ai-providers"),
                ]);
                const [
                    storagePayload,
                    socialPayload,
                    assetsPayload,
                    thumbnailAssetsPayload,
                    aiProvidersPayload,
                ] = await Promise.all([
                    storageResponse.json(),
                    socialResponse.json(),
                    assetsResponse.json(),
                    thumbnailAssetsResponse.json(),
                    aiProvidersResponse.json(),
                ]);

                if (!isActive) return;

                if (!storagePayload.ok) {
                    throw new Error(
                        storagePayload.error ?? "Cannot load storage accounts.",
                    );
                }
                if (!socialPayload.ok) {
                    throw new Error(
                        socialPayload.error ?? "Cannot load social accounts.",
                    );
                }
                if (!assetsPayload.ok) {
                    throw new Error(
                        assetsPayload.error ?? "Cannot load storage assets.",
                    );
                }
                if (!thumbnailAssetsPayload.ok) {
                    throw new Error(
                        thumbnailAssetsPayload.error ??
                            "Cannot load thumbnail assets.",
                    );
                }
                if (!aiProvidersPayload.ok) {
                    throw new Error(
                        aiProvidersPayload.error ?? "Cannot load AI providers.",
                    );
                }

                const activeStorageAccounts = (
                    storagePayload.data ?? []
                ).filter(
                    (account: WorkspaceStorageAccount) =>
                        account.status === "active" &&
                        (account.providerType === "telegram" ||
                            account.providerType === "drive"),
                );
                const connectedSocialAccounts = (
                    socialPayload.data ?? []
                ).filter(
                    (account: WorkspaceSocialAccount) =>
                        account.status === "connected",
                );
                const activeAiProviders = (
                    aiProvidersPayload.data ?? []
                ).filter(
                    (provider: WorkspaceAiProvider) =>
                        provider.status === "active",
                );

                setStorageAccounts(activeStorageAccounts);
                setSocialAccounts(connectedSocialAccounts);
                setAiProviders(activeAiProviders);
                setStorageAssets(assetsPayload.data ?? []);
                setThumbnailAssets(thumbnailAssetsPayload.data ?? []);
                setAccountsError(null);
            } catch (error) {
                if (!isActive) return;
                setAccountsError(
                    error instanceof Error
                        ? error.message
                        : "Cannot load Workspace runtime accounts.",
                );
            }
        }

        loadRuntimeAccounts();

        return () => {
            isActive = false;
        };
    }, []);

    const setNodeStatus = (
        nodeId: string,
        status: NodeRunStatus,
        detail: string,
    ) => {
        setNodeRunStatus((current) => ({
            ...current,
            [nodeId]: { status, detail },
        }));
    };

    const ensureFacebookPages = async (
        accountId: string,
    ): Promise<FacebookPagesResult> => {
        if (!accountId) {
            return { pages: [], configuredPageId: null };
        }

        const cachedPages = facebookPagesByAccount[accountId];
        if (cachedPages) {
            return {
                pages: cachedPages,
                configuredPageId: null,
            };
        }

        setLoadingFacebookAccountIds((previous) => ({
            ...previous,
            [accountId]: true,
        }));

        try {
            const data = await fetchFacebookPagesForAccount(accountId);
            setFacebookPagesByAccount((previous) => ({
                ...previous,
                [accountId]: data.pages,
            }));
            return data;
        } finally {
            setLoadingFacebookAccountIds((previous) => ({
                ...previous,
                [accountId]: false,
            }));
        }
    };

    const ensureAiProviderModels = async (providerId: string) => {
        if (!providerId) return [];
        const cachedModels = aiModelsByProviderId[providerId];
        if (cachedModels) return cachedModels;

        setLoadingAiModelProviderIds((previous) => ({
            ...previous,
            [providerId]: true,
        }));

        try {
            const response = await fetch(
                `/api/ai-providers/${providerId}/models`,
            );
            const payload = (await response.json()) as {
                ok: boolean;
                data?: WorkspaceAiModel[];
            };
            const models = payload.ok ? (payload.data ?? []) : [];
            setAiModelsByProviderId((previous) => ({
                ...previous,
                [providerId]: models,
            }));
            return models;
        } catch {
            setAiModelsByProviderId((previous) => ({
                ...previous,
                [providerId]: [],
            }));
            return [];
        } finally {
            setLoadingAiModelProviderIds((previous) => ({
                ...previous,
                [providerId]: false,
            }));
        }
    };

    const resetRunState = (nextGraph?: WorkspaceGraph, clearFiles = false) => {
        setRunError(null);
        setRunResult(null);
        if (clearFiles) {
            setRuntimeFilesByNodeId({});
            revokeRuntimeArtifactUrls(runtimeArtifactsByNodeId);
            setRuntimeArtifactsByNodeId({});
            setRuntimeAssetIdsByNodeId({});
            setRuntimeTranscriptsByNodeId({});
            setRuntimeTranslationsByNodeId({});
            setRuntimeVietnameseMetadataByNodeId({});
        }
        const target = nextGraph ?? graph;
        const initial: Record<string, NodeRunState> = {};
        for (const node of target.nodes) {
            initial[node.id] = { status: "idle", detail: "" };
        }
        setNodeRunStatus(initial);
    };

    const addNode = (template: WorkspaceNodeTemplate) => {
        setConnectionError(null);
        setGraph((current) => {
            const next = addWorkspaceNode(current, template, {
                x: 60 + current.nodes.length * 48,
                y: 80 + (current.nodes.length % 4) * 120,
            });
            return next;
        });
    };

    const applySeedTemplate = (seed: WorkspaceSeedTemplate) => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        const next = seed.buildGraph();
        setGraph(next);
        resetRunState(next, true);
    };

    const clearDraft = () => {
        if (
            !confirm(
                "Clear current Workspace draft and runtime state? This action cannot be undone.",
            )
        ) {
            return;
        }
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setIsFlowSetupOpen(false);
        window.localStorage.removeItem(WORKSPACE_RUNTIME_RESUME_STORAGE_KEY);
        const empty = createEmptyWorkspaceGraph("Workspace Draft");
        setGraph(empty);
        resetRunState(empty, true);
    };

    const updateNodeConfig = (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => {
        setGraph((current) =>
            updateWorkspaceNodeConfig(current, nodeId, patch),
        );
    };

    const setNodeFile = (nodeId: string, file: File | null) => {
        setRuntimeFilesByNodeId((current) => ({
            ...current,
            [nodeId]: file ?? undefined,
        }));
    };

    const applyCanvasZoom = (
        clientX: number,
        clientY: number,
        deltaY: number,
    ) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) return;

        setCanvasView((current) => {
            const zoomDirection = deltaY < 0 ? 1 : -1;
            const nextScale = Math.min(
                1.6,
                Math.max(
                    0.45,
                    Number((current.scale + zoomDirection * 0.08).toFixed(2)),
                ),
            );
            if (nextScale === current.scale) return current;

            const pointerX = clientX - rect.left;
            const pointerY = clientY - rect.top;
            const canvasX = (pointerX - current.x) / current.scale;
            const canvasY = (pointerY - current.y) / current.scale;

            return {
                x: pointerX - canvasX * nextScale,
                y: pointerY - canvasY * nextScale,
                scale: nextScale,
            };
        });
    };

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;

        const handleNativeWheel = (event: globalThis.WheelEvent) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            applyCanvasZoom(event.clientX, event.clientY, event.deltaY);
        };

        viewport.addEventListener("wheel", handleNativeWheel, {
            passive: false,
        });

        return () => {
            viewport.removeEventListener("wheel", handleNativeWheel);
        };
    }, []);

    const runWorkspaceFlow = async (mode: "fresh" | "resume" = "fresh") => {
        const plan = planWorkspaceFlow(graph);
        if (!plan.ok) {
            setRunError(plan.errors.join("\n"));
            return;
        }
        if (plan.steps.length === 0) {
            setRunError("Plan rỗng. Hãy thêm nodes vào graph.");
            return;
        }

        if (mode === "fresh") {
            const initialStatus: Record<string, NodeRunState> = {};
            for (const node of graph.nodes) {
                initialStatus[node.id] = { status: "idle", detail: "" };
            }
            setNodeRunStatus(initialStatus);
            revokeRuntimeArtifactUrls(runtimeArtifactsByNodeId);
            setRuntimeArtifactsByNodeId({});
            setRuntimeAssetIdsByNodeId({});
            setRuntimeTranscriptsByNodeId({});
            setRuntimeTranslationsByNodeId({});
            setRuntimeVietnameseMetadataByNodeId({});
        }
        setRunError(null);
        setRunResult(null);
        setIsRunningFlow(true);

        const totalSteps = plan.steps.length;
        const progressStepDescriptors = plan.steps.map((step) =>
            describeStep(step, graph.nodes),
        );
        const progressTaskId = startProgressTask({
            title: "Workspace flow",
            scope: "system",
            description: `Running ${totalSteps} step(s)...`,
            progress: 0,
            progressMode: "indeterminate",
            steps: progressStepDescriptors.map((descriptor) => ({
                id: descriptor.key,
                title: descriptor.label,
                description: descriptor.subtitle,
                progressMode: "indeterminate",
            })),
        });

        const assetByProducer: Record<string, string> =
            mode === "resume"
                ? Object.fromEntries(
                      Object.entries(runtimeAssetIdsByNodeId).filter(
                          (entry): entry is [string, string] =>
                              typeof entry[1] === "string",
                      ),
                  )
                : {};
        const transcriptByProducer: Record<string, ChineseTranscriptionResult> =
            mode === "resume"
                ? Object.fromEntries(
                      Object.entries(runtimeTranscriptsByNodeId).filter(
                          (
                              entry,
                          ): entry is [string, ChineseTranscriptionResult] =>
                              entry[1] !== undefined,
                      ),
                  )
                : {};
        const translationByProducer: Record<
            string,
            TranscriptTranslationResult
        > =
            mode === "resume"
                ? Object.fromEntries(
                      Object.entries(runtimeTranslationsByNodeId).filter(
                          (
                              entry,
                          ): entry is [string, TranscriptTranslationResult] =>
                              entry[1] !== undefined,
                      ),
                  )
                : {};
        const vietnameseMetadataByNodeId: Record<
            string,
            VietnameseVideoMetadataResult
        > =
            mode === "resume"
                ? Object.fromEntries(
                      Object.entries(runtimeVietnameseMetadataByNodeId).filter(
                          (
                              entry,
                          ): entry is [string, VietnameseVideoMetadataResult] =>
                              entry[1] !== undefined,
                      ),
                  )
                : {};
        const artifactByProducer: Record<string, WorkspaceRuntimeArtifact> =
            mode === "resume"
                ? Object.fromEntries(
                      Object.entries(runtimeArtifactsByNodeId).filter(
                          (
                              entry,
                          ): entry is [string, WorkspaceRuntimeArtifact] =>
                              entry[1] !== undefined,
                      ),
                  )
                : {};
        let completedPublishes = 0;
        let failedPublishes = 0;
        const successfulPublishNodeIds = new Set<string>();
        const summary: string[] = [];
        const resolvedUrlFilesByNodeId: Record<string, File> = {};
        const resolvedAssetDownloadsByNodeId: Record<
            string,
            {
                file: File;
                fileName: string;
                byteLength: number;
                mimeType: string;
                objectUrl: string;
            }
        > = {};
        const progressStepDetailByKey: Record<string, string> = {};

        let currentProgressStep: WorkspaceFlowStep | null = null;
        const advanceProgress = (
            description: string,
            status: "success" | "failed" | "skipped" = "success",
            stepDescription?: string,
        ) => {
            updateProgressTask(progressTaskId, {
                description,
            });
            if (currentProgressStep) {
                finishWorkspaceProgressStep(currentProgressStep, {
                    status,
                    description: stepDescription ?? description,
                });
            }
        };

        const getProgressDescriptor = (step: WorkspaceFlowStep) =>
            describeStep(step, graph.nodes);

        const markProgressStepRunning = (
            step: WorkspaceFlowStep,
            description?: string,
        ) => {
            const descriptor = getProgressDescriptor(step);
            progressStepDetailByKey[descriptor.key] =
                description ?? descriptor.subtitle;
            startProgressStep({
                taskId: progressTaskId,
                stepId: descriptor.key,
                description: description ?? descriptor.subtitle,
                progressMode: "indeterminate",
            });
        };

        const updateProgressStepDetail = (
            step: WorkspaceFlowStep,
            input: {
                description: string;
                progress?: number;
                progressMode?: "determinate" | "indeterminate";
            },
        ) => {
            const descriptor = getProgressDescriptor(step);
            progressStepDetailByKey[descriptor.key] = input.description;
            updateProgressStep(progressTaskId, descriptor.key, input);
        };

        const finishWorkspaceProgressStep = (
            step: WorkspaceFlowStep,
            input: {
                status: "success" | "failed" | "skipped";
                description?: string;
                error?: string;
            },
        ) => {
            const descriptor = getProgressDescriptor(step);
            finishProgressStep({
                taskId: progressTaskId,
                stepId: descriptor.key,
                ...input,
            });
        };

        const findNode = (nodeId: string) =>
            graph.nodes.find((node) => node.id === nodeId);

        const getResumeCheckpoint = (step: WorkspaceFlowStep) => {
            if (step.kind === "use-existing-asset") {
                return assetByProducer[step.producerNodeId]
                    ? "Asset đã sẵn sàng từ lần chạy trước."
                    : null;
            }
            if (step.kind === "upload-and-store") {
                return assetByProducer[step.producerNodeId]
                    ? "Storage asset đã được tạo từ lần chạy trước."
                    : null;
            }
            if (step.kind === "intake-url-and-store") {
                return assetByProducer[step.producerNodeId]
                    ? "Storage asset đã được tạo từ lần chạy trước."
                    : null;
            }
            if (step.kind === "transcribe-chinese") {
                return transcriptByProducer[step.transcriptionNodeId]
                    ? "Transcript đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "preprocess-video") {
                return artifactByProducer[step.preprocessNodeId]
                    ? "Processed video artifact đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "translate-transcript") {
                return translationByProducer[step.translationNodeId]
                    ? "Translation đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "generate-voice") {
                return artifactByProducer[step.voiceNodeId]
                    ? "Voice artifact đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "generate-vi-metadata") {
                return vietnameseMetadataByNodeId[step.metadataNodeId]
                    ? "Vietnamese metadata đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "dub-video") {
                return artifactByProducer[step.dubbingNodeId] &&
                    translationByProducer[step.dubbingNodeId]
                    ? "Dubbed video và translation đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "vip-process-video") {
                return artifactByProducer[step.vipNodeId] &&
                    translationByProducer[step.vipNodeId] &&
                    vietnameseMetadataByNodeId[step.vipNodeId]
                    ? "VIP artifact, translation và metadata đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "mirror-video") {
                return artifactByProducer[step.mirrorNodeId]
                    ? "Mirror artifact đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "edit-video") {
                return artifactByProducer[step.editNodeId]
                    ? "Edited video đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "store-artifact") {
                return assetByProducer[step.producerNodeId]
                    ? "Storage asset đã có từ lần chạy trước."
                    : null;
            }
            if (step.kind === "download-local") {
                return null;
            }
            if (step.kind === "cleanup-assets") {
                return null;
            }
            return null;
        };

        const markResumeCheckpoint = (
            step: WorkspaceFlowStep,
            detail: string,
        ) => {
            if (step.kind === "use-existing-asset") {
                setNodeStatus(step.nodeId, "success", detail);
            } else if (step.kind === "upload-and-store") {
                setNodeStatus(step.sourceFileNodeId, "success", detail);
                setNodeStatus(step.storageNodeId, "success", detail);
            } else if (step.kind === "intake-url-and-store") {
                setNodeStatus(step.sourceUrlNodeId, "success", detail);
                setNodeStatus(step.storageNodeId, "success", detail);
            } else if (step.kind === "transcribe-chinese") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.transcriptionNodeId, "success", detail);
            } else if (step.kind === "preprocess-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.preprocessNodeId, "success", detail);
            } else if (step.kind === "translate-transcript") {
                setNodeStatus(step.translationNodeId, "success", detail);
            } else if (step.kind === "generate-voice") {
                setNodeStatus(step.voiceNodeId, "success", detail);
            } else if (step.kind === "dub-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.dubbingNodeId, "success", detail);
            } else if (step.kind === "vip-process-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.vipNodeId, "success", detail);
            } else if (step.kind === "mirror-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.mirrorNodeId, "success", detail);
            } else if (step.kind === "edit-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.translationNodeId, "success", detail);
                setNodeStatus(step.editNodeId, "success", detail);
            } else if (step.kind === "store-artifact") {
                setNodeStatus(step.storageNodeId, "success", detail);
            } else if (step.kind === "download-local") {
                setNodeStatus(step.downloadNodeId, "success", detail);
            }
        };

        const getStepStatusKey = (step: WorkspaceFlowStep) => {
            if (step.kind === "use-existing-asset") return step.nodeId;
            if (step.kind === "upload-and-store") return step.storageNodeId;
            if (step.kind === "intake-url-and-store") return step.storageNodeId;
            if (step.kind === "preprocess-video") return step.preprocessNodeId;
            if (step.kind === "transcribe-chinese")
                return step.transcriptionNodeId;
            if (step.kind === "translate-transcript")
                return step.translationNodeId;
            if (step.kind === "generate-voice") return step.voiceNodeId;
            if (step.kind === "generate-vi-metadata")
                return step.metadataNodeId;
            if (step.kind === "dub-video") return step.dubbingNodeId;
            if (step.kind === "vip-process-video") return step.vipNodeId;
            if (step.kind === "mirror-video") return step.mirrorNodeId;
            if (step.kind === "edit-video") return step.editNodeId;
            if (step.kind === "store-artifact") return step.storageNodeId;
            if (step.kind === "download-local") return step.downloadNodeId;
            if (step.kind === "publish") return step.publishNodeId;
            if (step.kind === "cleanup-assets") return step.cleanupNodeId;
            return null;
        };

        const hasStoredArtifactCheckpoint = plan.steps.some(
            (
                step,
            ): step is Extract<WorkspaceFlowStep, { kind: "store-artifact" }> =>
                step.kind === "store-artifact" &&
                Boolean(assetByProducer[step.producerNodeId]) &&
                nodeRunStatus[step.storageNodeId]?.status === "success",
        );
        const hasAnyFailedStep = Object.values(nodeRunStatus).some(
            (state) => state.status === "failed",
        );
        const shouldUsePublishOnlyResume =
            mode === "resume" &&
            hasStoredArtifactCheckpoint &&
            hasAnyFailedStep;

        const resolveUrlSourceFile = async (
            sourceNode: WorkspaceNodeInstance,
        ) => {
            const cached = resolvedUrlFilesByNodeId[sourceNode.id];
            if (cached) {
                return cached;
            }
            const sourceUrl = getStringConfig(sourceNode, "url").trim();
            if (!sourceUrl) {
                setNodeStatus(sourceNode.id, "failed", "Chưa nhập source URL.");
                throw new Error(
                    `URL Video '${sourceNode.label}' chưa nhập source URL.`,
                );
            }

            setNodeStatus(sourceNode.id, "running", "Resolving source URL...");
            const resolvedFile = await fetchWorkspaceFile({
                url: "/api/video-intake/resolve-file",
                actionLabel: "Resolve URL video",
                onProgress: (progress) => {
                    if (
                        !currentProgressStep ||
                        progress.percent === undefined
                    ) {
                        return;
                    }
                    updateProgressStepDetail(currentProgressStep, {
                        progressMode: "determinate",
                        progress: progress.percent,
                        description: `Downloading resolved source · ${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes ?? 0)}.`,
                    });
                },
                init: {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        sourceUrl,
                        title: getStringConfig(sourceNode, "title").trim(),
                        qualityPreference: getStringConfig(
                            sourceNode,
                            "qualityPreference",
                            "best",
                        ),
                    }),
                },
            });
            resolvedUrlFilesByNodeId[sourceNode.id] = resolvedFile.file;
            setNodeStatus(
                sourceNode.id,
                "success",
                `${resolvedFile.fileName} · ${formatBytes(resolvedFile.byteLength)}.`,
            );
            return resolvedFile.file;
        };

        const resolveWorkspaceSourceVideoFile = async (input: {
            sourceNode: WorkspaceNodeInstance;
            consumerLabel: string;
        }) => {
            const { sourceNode, consumerLabel } = input;
            if (sourceNode.templateNodeType === "source.file") {
                const file = runtimeFilesByNodeId[sourceNode.id];
                if (!file) {
                    setNodeStatus(
                        sourceNode.id,
                        "failed",
                        "Chưa chọn file video.",
                    );
                    throw new Error(
                        `Upload Video '${sourceNode.label}' chưa chọn file cho ${consumerLabel}.`,
                    );
                }
                return {
                    file,
                    fileName: file.name,
                    byteLength: file.size,
                    mimeType: file.type || "video/mp4",
                    sourceStatus: "Source file used.",
                    objectUrl: URL.createObjectURL(file),
                };
            }
            if (sourceNode.templateNodeType === "source.url") {
                const file = await resolveUrlSourceFile(sourceNode);
                return {
                    file,
                    fileName: file.name,
                    byteLength: file.size,
                    mimeType: file.type || "video/mp4",
                    sourceStatus: "Resolved URL video used.",
                    objectUrl: URL.createObjectURL(file),
                };
            }
            if (sourceNode.templateNodeType === "source.asset") {
                const assetId = getStringConfig(sourceNode, "assetId").trim();
                if (!assetId) {
                    setNodeStatus(
                        sourceNode.id,
                        "failed",
                        "Chưa chọn Storage Library asset.",
                    );
                    throw new Error(
                        `Storage Asset '${sourceNode.label}' chưa chọn asset cho ${consumerLabel}.`,
                    );
                }
                const cached = resolvedAssetDownloadsByNodeId[sourceNode.id];
                if (cached) {
                    return {
                        ...cached,
                        sourceStatus: "Storage asset used.",
                    };
                }
                setNodeStatus(
                    sourceNode.id,
                    "running",
                    "Downloading asset source...",
                );
                const downloaded = await fetchWorkspaceFile({
                    url: `/api/storage/assets/${assetId}/download?disposition=inline`,
                    actionLabel: "Download storage asset source",
                    onProgress: (progress) => {
                        if (
                            !currentProgressStep ||
                            progress.percent === undefined
                        ) {
                            return;
                        }
                        updateProgressStepDetail(currentProgressStep, {
                            progressMode: "determinate",
                            progress: progress.percent,
                            description: `Downloading asset source · ${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes ?? 0)}.`,
                        });
                    },
                });
                resolvedAssetDownloadsByNodeId[sourceNode.id] = {
                    file: downloaded.file,
                    fileName: downloaded.fileName,
                    byteLength: downloaded.byteLength,
                    mimeType: downloaded.mimeType,
                    objectUrl: downloaded.objectUrl,
                };
                setNodeStatus(
                    sourceNode.id,
                    "success",
                    `${downloaded.fileName} · ${formatBytes(downloaded.byteLength)}.`,
                );
                return {
                    ...resolvedAssetDownloadsByNodeId[sourceNode.id],
                    sourceStatus: "Storage asset used.",
                };
            }

            const upstreamArtifact = artifactByProducer[sourceNode.id];
            if (!upstreamArtifact || upstreamArtifact.kind !== "video") {
                throw new Error(
                    `${consumerLabel} thiếu video artifact upstream từ '${sourceNode.label}'.`,
                );
            }
            if (upstreamArtifact.artifactId) {
                return {
                    artifactId: upstreamArtifact.artifactId,
                    fileName: upstreamArtifact.fileName,
                    byteLength: upstreamArtifact.byteLength,
                    mimeType: upstreamArtifact.mimeType,
                    sourceStatus: "Server-side video artifact used.",
                    objectUrl: upstreamArtifact.objectUrl ?? "",
                };
            }
            const file =
                upstreamArtifact.file ?? base64ToFile(upstreamArtifact);
            return {
                file,
                fileName: upstreamArtifact.fileName,
                byteLength: upstreamArtifact.byteLength,
                mimeType: upstreamArtifact.mimeType,
                sourceStatus: "Video artifact used.",
                objectUrl:
                    upstreamArtifact.objectUrl ?? URL.createObjectURL(file),
            };
        };

        const appendWorkspaceVideoInput = async (input: {
            formData: FormData;
            sourceNode: WorkspaceNodeInstance;
            consumerLabel: string;
        }) => {
            const { formData, sourceNode, consumerLabel } = input;
            if (sourceNode.templateNodeType === "source.file") {
                const file = runtimeFilesByNodeId[sourceNode.id];
                if (!file) {
                    setNodeStatus(
                        sourceNode.id,
                        "failed",
                        "Chưa chọn file video.",
                    );
                    throw new Error(
                        `Upload Video '${sourceNode.label}' chưa chọn file cho ${consumerLabel}.`,
                    );
                }
                formData.set("videoFile", file);
                return {
                    detail: file.name,
                    sourceStatus: "Source file used.",
                };
            }
            if (sourceNode.templateNodeType === "source.url") {
                const file = await resolveUrlSourceFile(sourceNode);
                formData.set("videoFile", file);
                return {
                    detail: file.name,
                    sourceStatus: "Resolved URL video used.",
                };
            }
            if (sourceNode.templateNodeType === "source.asset") {
                const assetId = getStringConfig(sourceNode, "assetId");
                if (!assetId) {
                    setNodeStatus(
                        sourceNode.id,
                        "failed",
                        "Chưa chọn Storage Library asset.",
                    );
                    throw new Error(
                        `Storage Asset '${sourceNode.label}' chưa chọn asset cho ${consumerLabel}.`,
                    );
                }
                formData.set("assetId", assetId);
                return {
                    detail: assetId,
                    sourceStatus: "Storage asset used.",
                };
            }

            const upstreamArtifact = artifactByProducer[sourceNode.id];
            if (!upstreamArtifact || upstreamArtifact.kind !== "video") {
                throw new Error(
                    `${consumerLabel} thiếu video artifact upstream từ '${sourceNode.label}'.`,
                );
            }
            if (upstreamArtifact.artifactId) {
                formData.set("artifactId", upstreamArtifact.artifactId);
            } else {
                formData.set("videoFile", base64ToFile(upstreamArtifact));
            }
            return {
                detail: upstreamArtifact.fileName,
                sourceStatus: upstreamArtifact.artifactId
                    ? "Server-side video artifact used."
                    : "Video artifact used.",
            };
        };

        let abortRemaining = false;

        for (const step of plan.steps) {
            if (step.kind === "publish") {
                // publishes can fail individually without aborting siblings
            } else if (abortRemaining) {
                continue;
            }
            currentProgressStep = step;
            markProgressStepRunning(step);

            if (mode === "resume") {
                const checkpoint = getResumeCheckpoint(step);
                if (checkpoint) {
                    markResumeCheckpoint(step, checkpoint);
                    advanceProgress(checkpoint);
                    continue;
                }
                if (shouldUsePublishOnlyResume && step.kind !== "publish") {
                    const statusKey = getStepStatusKey(step);
                    if (
                        statusKey &&
                        nodeRunStatus[statusKey]?.status === "success"
                    ) {
                        const detail =
                            nodeRunStatus[statusKey]?.detail ||
                            "Step đã hoàn tất từ lần chạy trước.";
                        markResumeCheckpoint(step, detail);
                        advanceProgress(detail);
                        continue;
                    }
                }
            }

            try {
                if (step.kind === "use-existing-asset") {
                    const node = findNode(step.nodeId);
                    if (!node) throw new Error(`Missing node ${step.nodeId}`);
                    const assetId = getStringConfig(node, "assetId");
                    if (!assetId) {
                        setNodeStatus(
                            node.id,
                            "failed",
                            "Chưa chọn Storage Library asset.",
                        );
                        throw new Error(
                            `Storage Asset '${node.label}' chưa chọn asset.`,
                        );
                    }
                    assetByProducer[step.producerNodeId] = assetId;
                    setRuntimeAssetIdsByNodeId((current) => ({
                        ...current,
                        [step.producerNodeId]: assetId,
                    }));
                    setNodeStatus(node.id, "success", `Using ${assetId}.`);
                    advanceProgress(`Using existing asset ${assetId}.`);
                } else if (step.kind === "upload-and-store") {
                    const fileNode = findNode(step.sourceFileNodeId);
                    const storageNode = findNode(step.storageNodeId);
                    if (!fileNode || !storageNode) {
                        throw new Error("Missing upload nodes.");
                    }
                    const file = runtimeFilesByNodeId[fileNode.id];
                    const storageAccountId = getStringConfig(
                        storageNode,
                        "storageAccountId",
                    );
                    const storageAccount = storageAccounts.find(
                        (account) => account._id === storageAccountId,
                    );
                    const tagsRaw = getStringConfig(
                        fileNode,
                        "tags",
                        "workspace,upload",
                    );
                    const tags = parseCommaList(tagsRaw);

                    if (!file) {
                        setNodeStatus(
                            fileNode.id,
                            "failed",
                            "Chưa chọn file video.",
                        );
                        setNodeStatus(
                            storageNode.id,
                            "skipped",
                            "Chưa có file để upload.",
                        );
                        throw new Error(
                            `Upload Video '${fileNode.label}' chưa chọn file.`,
                        );
                    }
                    if (!storageAccount) {
                        setNodeStatus(
                            fileNode.id,
                            "failed",
                            "Chưa chọn storage account.",
                        );
                        setNodeStatus(
                            storageNode.id,
                            "failed",
                            "Storage account không hợp lệ.",
                        );
                        throw new Error(
                            `Save to Storage '${storageNode.label}' cần storage account hợp lệ.`,
                        );
                    }
                    if (tags.length < 2) {
                        setNodeStatus(
                            fileNode.id,
                            "failed",
                            "Cần >= 2 trace tag.",
                        );
                        throw new Error(
                            `Upload Video '${fileNode.label}' cần ít nhất 2 tag (cách nhau bằng dấu phẩy).`,
                        );
                    }

                    const sourceTitle = file.name.replace(/\.[^.]+$/, "");
                    const title =
                        getStringConfig(fileNode, "title").trim() ||
                        sourceTitle;

                    setNodeStatus(
                        fileNode.id,
                        "running",
                        `Uploading ${file.name}...`,
                    );
                    setNodeStatus(
                        storageNode.id,
                        "running",
                        `Saving to ${storageAccount.label}...`,
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: `Uploading ${file.name} and saving to ${storageAccount.label}...`,
                    });

                    const formData = new FormData();
                    formData.set("videoFile", file);
                    formData.set(
                        "storageProvider",
                        storageAccount.providerType === "telegram"
                            ? "telegram"
                            : "drive",
                    );
                    formData.set(
                        "storageProviderAccountId",
                        storageAccount._id,
                    );
                    formData.set("tags", tags.join(","));
                    formData.set("title", title);
                    const sourceDescription = getStringConfig(
                        fileNode,
                        "description",
                    ).trim();
                    if (sourceDescription) {
                        formData.set("description", sourceDescription);
                    }
                    const localSetup = loadLocalVideoEditSetup(file);
                    if (localSetup) {
                        formData.set(
                            "videoEditSetupJson",
                            JSON.stringify(localSetup.videoEditSetup),
                        );
                    }
                    formData.set("contentIntent", "other");
                    formData.set("ownershipStatus", "unknown");

                    const uploadPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data?: { assetId?: string; runId?: string };
                    }>({
                        url: "/api/video-intake/local-runs",
                        actionLabel: "Upload to storage",
                        init: { method: "POST", body: formData },
                    });
                    if (!uploadPayload.data?.assetId) {
                        throw new Error(
                            "Upload to storage failed at /api/video-intake/local-runs: assetId missing.",
                        );
                    }

                    const newAssetId = uploadPayload.data.assetId as string;
                    assetByProducer[step.producerNodeId] = newAssetId;
                    setRuntimeAssetIdsByNodeId((current) => ({
                        ...current,
                        [step.producerNodeId]: newAssetId,
                    }));

                    setNodeStatus(
                        fileNode.id,
                        "success",
                        `Run ${uploadPayload.data.runId ?? ""}.`,
                    );
                    setNodeStatus(
                        storageNode.id,
                        "success",
                        `Asset ${newAssetId}.`,
                    );
                    summary.push(`Created asset ${newAssetId}.`);
                    advanceProgress(`Created asset ${newAssetId}.`);
                } else if (step.kind === "intake-url-and-store") {
                    const urlNode = findNode(step.sourceUrlNodeId);
                    const storageNode = findNode(step.storageNodeId);
                    if (!urlNode || !storageNode) {
                        throw new Error("Missing URL intake nodes.");
                    }
                    const sourceUrl = getStringConfig(urlNode, "url").trim();
                    const storageAccountId = getStringConfig(
                        storageNode,
                        "storageAccountId",
                    );
                    const storageAccount = storageAccounts.find(
                        (account) => account._id === storageAccountId,
                    );
                    const tagsRaw = getStringConfig(
                        urlNode,
                        "tags",
                        "workspace,url",
                    );
                    const tags = parseCommaList(tagsRaw);

                    if (!sourceUrl) {
                        setNodeStatus(
                            urlNode.id,
                            "failed",
                            "Chưa nhập source URL.",
                        );
                        setNodeStatus(
                            storageNode.id,
                            "skipped",
                            "Chưa có URL để intake.",
                        );
                        throw new Error(
                            `URL Video '${urlNode.label}' chưa nhập source URL.`,
                        );
                    }
                    if (!storageAccount) {
                        setNodeStatus(
                            urlNode.id,
                            "failed",
                            "Chưa chọn storage account.",
                        );
                        setNodeStatus(
                            storageNode.id,
                            "failed",
                            "Storage account không hợp lệ.",
                        );
                        throw new Error(
                            `Save to Storage '${storageNode.label}' cần storage account hợp lệ.`,
                        );
                    }
                    if (tags.length < 2) {
                        setNodeStatus(
                            urlNode.id,
                            "failed",
                            "Cần >= 2 trace tag.",
                        );
                        throw new Error(
                            `URL Video '${urlNode.label}' cần ít nhất 2 tag (cách nhau bằng dấu phẩy).`,
                        );
                    }

                    setNodeStatus(
                        urlNode.id,
                        "running",
                        "Resolving source URL...",
                    );
                    setNodeStatus(
                        storageNode.id,
                        "running",
                        `Saving to ${storageAccount.label}...`,
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: `Resolving source URL and saving to ${storageAccount.label}...`,
                    });

                    const payload = {
                        sourceUrl,
                        storageProvider:
                            storageAccount.providerType === "telegram"
                                ? "telegram"
                                : "drive",
                        storageProviderAccountId: storageAccount._id,
                        tags,
                        title:
                            getStringConfig(urlNode, "title").trim() ||
                            undefined,
                        description:
                            getStringConfig(urlNode, "description").trim() ||
                            undefined,
                        qualityPreference: getStringConfig(
                            urlNode,
                            "qualityPreference",
                            "best",
                        ),
                        contentIntent: "other",
                        ownershipStatus: getStringConfig(
                            urlNode,
                            "ownershipStatus",
                            "unknown",
                        ),
                    };

                    const intakePayload = await fetchWorkspaceJson<{
                        ok: true;
                        data?: { assetId?: string; runId?: string };
                    }>({
                        url: "/api/video-intake/runs",
                        actionLabel: "URL intake to storage",
                        init: {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify(payload),
                        },
                    });
                    if (!intakePayload.data?.assetId) {
                        throw new Error(
                            "URL intake to storage failed at /api/video-intake/runs: assetId missing.",
                        );
                    }

                    const newAssetId = intakePayload.data.assetId as string;
                    assetByProducer[step.producerNodeId] = newAssetId;
                    setRuntimeAssetIdsByNodeId((current) => ({
                        ...current,
                        [step.producerNodeId]: newAssetId,
                    }));
                    setNodeStatus(
                        urlNode.id,
                        "success",
                        `Run ${intakePayload.data.runId ?? ""}.`,
                    );
                    setNodeStatus(
                        storageNode.id,
                        "success",
                        `Asset ${newAssetId}.`,
                    );
                    summary.push(`Created asset ${newAssetId}.`);
                    advanceProgress(`Created asset ${newAssetId}.`);
                } else if (step.kind === "preprocess-video") {
                    const sourceNode = findNode(step.sourceNodeId);
                    const preprocessNode = findNode(step.preprocessNodeId);
                    if (!sourceNode || !preprocessNode) {
                        throw new Error("Missing preprocess nodes.");
                    }
                    const isPreprocessEnabled = getBooleanConfig(
                        preprocessNode,
                        "enabled",
                        true,
                    );

                    if (!isPreprocessEnabled) {
                        const sourceFile =
                            await resolveWorkspaceSourceVideoFile({
                                sourceNode,
                                consumerLabel: `Video Preprocess '${preprocessNode.label}'`,
                            });
                        const artifact: WorkspaceRuntimeArtifact = {
                            fileName: sourceFile.fileName,
                            mimeType: sourceFile.mimeType,
                            file: sourceFile.file,
                            objectUrl: sourceFile.objectUrl,
                            byteLength: sourceFile.byteLength,
                            kind: "video",
                            detail: "Preprocess disabled (passthrough source)",
                        };
                        artifactByProducer[step.preprocessNodeId] = artifact;
                        setRuntimeArtifactsByNodeId((current) => ({
                            ...current,
                            [preprocessNode.id]: artifact,
                        }));
                        setNodeStatus(
                            sourceNode.id,
                            "success",
                            sourceFile.sourceStatus,
                        );
                        setNodeStatus(
                            preprocessNode.id,
                            "success",
                            "Bypassed preprocess.",
                        );
                        summary.push(
                            "Preprocess disabled: passthrough source.",
                        );
                        advanceProgress(
                            `Preprocess ${preprocessNode.label} bypassed.`,
                        );
                        continue;
                    }

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `Video Preprocess '${preprocessNode.label}'`,
                    });
                    formData.set(
                        "videoSpeedFactor",
                        String(
                            getNumberConfig(preprocessNode, "speedFactor", 0.7),
                        ),
                    );
                    setNodeStatus(
                        preprocessNode.id,
                        "running",
                        "Preprocessing video speed with ffmpeg...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: "Preprocessing video speed with ffmpeg...",
                    });
                    const preprocessPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: {
                            fileName: string;
                            mimeType: string;
                            videoBase64?: string;
                            byteLength: number;
                            speedFactor: number;
                            artifactId?: string;
                            artifactExpiresAt?: string;
                        };
                    }>({
                        url: "/api/audio/video-preprocess",
                        actionLabel: "Video preprocess",
                        init: { method: "POST", body: formData },
                    });
                    const artifact: WorkspaceRuntimeArtifact = {
                        artifactId: preprocessPayload.data.artifactId,
                        artifactExpiresAt:
                            preprocessPayload.data.artifactExpiresAt,
                        fileName: preprocessPayload.data.fileName,
                        mimeType: preprocessPayload.data.mimeType,
                        base64: preprocessPayload.data.videoBase64,
                        byteLength: preprocessPayload.data.byteLength,
                        kind: "video",
                        detail: `${preprocessPayload.data.speedFactor.toFixed(2)}x processed video`,
                    };
                    artifactByProducer[step.preprocessNodeId] = artifact;
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [preprocessNode.id]: artifact,
                    }));
                    setNodeStatus(
                        sourceNode.id,
                        "success",
                        source.sourceStatus,
                    );
                    setNodeStatus(
                        preprocessNode.id,
                        "success",
                        `${formatBytes(preprocessPayload.data.byteLength)} MP4.`,
                    );
                    summary.push(
                        `Preprocessed video ready: ${formatBytes(preprocessPayload.data.byteLength)}.`,
                    );
                    advanceProgress(
                        `Preprocess ${preprocessNode.label} complete.`,
                    );
                } else if (step.kind === "transcribe-chinese") {
                    const fileNode = findNode(step.sourceNodeId);
                    const transcriptionNode = findNode(
                        step.transcriptionNodeId,
                    );
                    if (!fileNode || !transcriptionNode) {
                        throw new Error("Missing transcription nodes.");
                    }

                    setNodeStatus(
                        fileNode.id,
                        "running",
                        "Preparing video source...",
                    );
                    setNodeStatus(
                        transcriptionNode.id,
                        "running",
                        "Extracting audio and calling Groq...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description:
                            "Extracting audio and transcribing timestamps...",
                    });

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode: fileNode,
                        consumerLabel: `Audio Transcript '${transcriptionNode.label}'`,
                    });
                    formData.set(
                        "language",
                        getStringConfig(transcriptionNode, "language", "zh"),
                    );
                    formData.set(
                        "includeWordTimestamps",
                        String(
                            getBooleanConfig(
                                transcriptionNode,
                                "includeWordTimestamps",
                                true,
                            ),
                        ),
                    );
                    const prompt = getStringConfig(
                        transcriptionNode,
                        "prompt",
                    ).trim();
                    if (prompt) {
                        formData.set("prompt", prompt);
                    }

                    const transcriptionPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: ChineseTranscriptionResult;
                    }>({
                        url: "/api/audio/chinese-transcription",
                        actionLabel: "Audio transcription",
                        init: { method: "POST", body: formData },
                    });

                    transcriptByProducer[step.transcriptionNodeId] =
                        transcriptionPayload.data;
                    setRuntimeTranscriptsByNodeId((current) => ({
                        ...current,
                        [step.transcriptionNodeId]: transcriptionPayload.data,
                    }));
                    setNodeStatus(fileNode.id, "success", source.sourceStatus);
                    setNodeStatus(
                        transcriptionNode.id,
                        "success",
                        `${transcriptionPayload.data.segments.length} segment(s), ${transcriptionPayload.data.words.length} word(s).`,
                    );
                    summary.push(
                        `Transcript ready: ${transcriptionPayload.data.segments.length} segment(s).`,
                    );
                    advanceProgress(
                        `Transcript ${transcriptionNode.label} complete.`,
                    );
                } else if (step.kind === "translate-transcript") {
                    const transcriptionNode = findNode(
                        step.transcriptionNodeId,
                    );
                    const translationNode = findNode(step.translationNodeId);
                    if (!transcriptionNode || !translationNode) {
                        throw new Error("Missing translation nodes.");
                    }

                    const transcript =
                        transcriptByProducer[step.transcriptionNodeId];
                    if (!transcript) {
                        setNodeStatus(
                            translationNode.id,
                            "skipped",
                            "Chưa có transcript upstream.",
                        );
                        throw new Error(
                            `Translate Transcript '${translationNode.label}' thiếu transcript upstream.`,
                        );
                    }
                    const translationProviderId = getStringConfig(
                        translationNode,
                        "translationProviderId",
                    ).trim();
                    const effectiveTranslationProviderId =
                        translationProviderId ||
                        resolveDefaultAiProviderId(aiProviders);

                    setNodeStatus(
                        translationNode.id,
                        "running",
                        "Translating transcript segments with Groq...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: "Translating transcript segments...",
                    });

                    const translationPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: TranscriptTranslationResult;
                    }>({
                        url: "/api/audio/transcript-translation",
                        actionLabel: "Transcript translation",
                        init: {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                segments: transcript.segments,
                                sourceLanguage: transcript.language,
                                targetLanguage: getStringConfig(
                                    translationNode,
                                    "targetLanguage",
                                    "vi",
                                ),
                                model: getStringConfig(
                                    translationNode,
                                    "model",
                                    DEFAULT_TRANSLATION_MODEL,
                                ),
                                providerId:
                                    effectiveTranslationProviderId || undefined,
                            }),
                        },
                    });

                    translationByProducer[step.translationNodeId] =
                        translationPayload.data;
                    setRuntimeTranslationsByNodeId((current) => ({
                        ...current,
                        [step.translationNodeId]: translationPayload.data,
                    }));
                    setNodeStatus(
                        translationNode.id,
                        "success",
                        `${translationPayload.data.translatedSegments.length} translated segment(s).`,
                    );
                    summary.push(
                        `Translation ready: ${translationPayload.data.translatedSegments.length} segment(s).`,
                    );
                    advanceProgress(
                        `Translation ${translationNode.label} complete.`,
                    );
                } else if (step.kind === "generate-vi-metadata") {
                    const translationNode = findNode(step.translationNodeId);
                    const metadataNode = findNode(step.metadataNodeId);
                    if (!translationNode || !metadataNode) {
                        throw new Error("Missing metadata generation nodes.");
                    }
                    const translation =
                        translationByProducer[step.translationNodeId];
                    if (!translation) {
                        setNodeStatus(
                            metadataNode.id,
                            "skipped",
                            "Chưa có translated transcript upstream.",
                        );
                        throw new Error(
                            `Generate VI Metadata '${metadataNode.label}' thiếu translated transcript upstream.`,
                        );
                    }
                    setNodeStatus(
                        metadataNode.id,
                        "running",
                        "Generating Vietnamese metadata...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: "Generating Vietnamese metadata...",
                    });
                    const metadataPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: VietnameseVideoMetadataResult;
                    }>({
                        url: "/api/audio/video-metadata",
                        actionLabel: "Generate Vietnamese metadata",
                        init: {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                translatedSegments:
                                    translation.translatedSegments,
                                sourceTitle: getStringConfig(
                                    translationNode,
                                    "sourceTitle",
                                ),
                                sourceDescription: getStringConfig(
                                    translationNode,
                                    "sourceDescription",
                                ),
                                model: getStringConfig(
                                    metadataNode,
                                    "model",
                                    DEFAULT_TRANSLATION_MODEL,
                                ),
                                providerId:
                                    getStringConfig(
                                        metadataNode,
                                        "metadataProviderId",
                                    ).trim() ||
                                    resolveDefaultAiProviderId(aiProviders) ||
                                    undefined,
                            }),
                        },
                    });
                    vietnameseMetadataByNodeId[metadataNode.id] =
                        metadataPayload.data;
                    setRuntimeVietnameseMetadataByNodeId((current) => ({
                        ...current,
                        [metadataNode.id]: metadataPayload.data,
                    }));
                    setNodeStatus(
                        metadataNode.id,
                        "success",
                        "Metadata ready.",
                    );
                    summary.push(
                        `VI metadata: ${metadataPayload.data.hashtags.length} hashtag(s).`,
                    );
                    advanceProgress(`Metadata ${metadataNode.label} complete.`);
                } else if (step.kind === "generate-voice") {
                    const translationNode = findNode(step.translationNodeId);
                    const voiceNode = findNode(step.voiceNodeId);
                    if (!translationNode || !voiceNode) {
                        throw new Error("Missing voice generation nodes.");
                    }

                    const translation =
                        translationByProducer[step.translationNodeId];
                    if (!translation) {
                        setNodeStatus(
                            voiceNode.id,
                            "skipped",
                            "Chưa có translated transcript upstream.",
                        );
                        throw new Error(
                            `Voice Generation '${voiceNode.label}' thiếu translated transcript upstream.`,
                        );
                    }

                    setNodeStatus(
                        voiceNode.id,
                        "running",
                        "Generating Vietnamese voice with Piper...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description:
                            "Generating Vietnamese voice with Piper...",
                    });
                    const voicePayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: VoiceGenerationResult;
                    }>({
                        url: "/api/audio/voice-generation",
                        actionLabel: "Voice generation",
                        init: {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                segments: buildWordAwareVoiceSegments({
                                    translatedSegments:
                                        translation.translatedSegments,
                                    words:
                                        transcriptByProducer[
                                            step.transcriptionNodeId
                                        ]?.words ?? [],
                                }),
                                settings: {
                                    binaryPath: getStringConfig(
                                        voiceNode,
                                        "ttsBinaryPath",
                                        "piper",
                                    ),
                                    modelPath: getStringConfig(
                                        voiceNode,
                                        "ttsModelPath",
                                    ),
                                    configPath: getStringConfig(
                                        voiceNode,
                                        "ttsConfigPath",
                                    ),
                                    speaker: getNumberConfig(
                                        voiceNode,
                                        "ttsSpeaker",
                                        0,
                                    ),
                                    lengthScale: getNumberConfig(
                                        voiceNode,
                                        "ttsLengthScale",
                                        1,
                                    ),
                                    noiseScale: getNumberConfig(
                                        voiceNode,
                                        "ttsNoiseScale",
                                        DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
                                    ),
                                    noiseW: getNumberConfig(
                                        voiceNode,
                                        "ttsNoiseW",
                                        DEFAULT_PIPER_TTS_SETTINGS.noiseW,
                                    ),
                                    sentenceSilence: getNumberConfig(
                                        voiceNode,
                                        "ttsSentenceSilence",
                                        DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
                                    ),
                                    alignmentMode: getStringConfig(
                                        voiceNode,
                                        "ttsAlignmentMode",
                                        DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
                                    ),
                                    preserveTimestampGaps: getBooleanConfig(
                                        voiceNode,
                                        "ttsPreserveTimestampGaps",
                                        true,
                                    ),
                                },
                            }),
                        },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
                        fileName: voicePayload.data.fileName,
                        mimeType: voicePayload.data.mimeType,
                        base64: voicePayload.data.audioBase64,
                        byteLength: voicePayload.data.byteLength,
                        kind: "audio",
                        detail: `${voicePayload.data.segmentCount} voice segment(s)`,
                    };
                    artifactByProducer[step.voiceNodeId] = artifact;
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [voiceNode.id]: artifact,
                    }));
                    setNodeStatus(
                        voiceNode.id,
                        "success",
                        `${formatBytes(voicePayload.data.byteLength)} WAV.`,
                    );
                    summary.push(
                        `Voice ready: ${formatBytes(voicePayload.data.byteLength)}.`,
                    );
                    advanceProgress(`Voice ${voiceNode.label} complete.`);
                } else if (step.kind === "dub-video") {
                    const sourceNode = findNode(step.sourceNodeId);
                    const dubbingNode = findNode(step.dubbingNodeId);
                    if (!sourceNode || !dubbingNode) {
                        throw new Error("Missing video dubbing nodes.");
                    }

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `Video Dubbing '${dubbingNode.label}'`,
                    });

                    formData.set(
                        "language",
                        getStringConfig(dubbingNode, "language", "zh"),
                    );
                    formData.set(
                        "targetLanguage",
                        getStringConfig(dubbingNode, "targetLanguage", "vi"),
                    );
                    formData.set(
                        "model",
                        getStringConfig(
                            dubbingNode,
                            "model",
                            DEFAULT_TRANSLATION_MODEL,
                        ),
                    );
                    const translationProviderId = getStringConfig(
                        dubbingNode,
                        "translationProviderId",
                    ).trim();
                    const effectiveTranslationProviderId =
                        translationProviderId ||
                        resolveDefaultAiProviderId(aiProviders);
                    if (effectiveTranslationProviderId) {
                        formData.set(
                            "providerId",
                            effectiveTranslationProviderId,
                        );
                    }
                    formData.set(
                        "originalAudioVolume",
                        String(
                            getNumberConfig(
                                dubbingNode,
                                "originalAudioVolume",
                                0.1,
                            ),
                        ),
                    );
                    formData.set(
                        "voiceVolume",
                        String(getNumberConfig(dubbingNode, "voiceVolume", 1)),
                    );
                    formData.set(
                        "ttsBinaryPath",
                        getStringConfig(dubbingNode, "ttsBinaryPath", "piper"),
                    );
                    formData.set(
                        "ttsModelPath",
                        getStringConfig(dubbingNode, "ttsModelPath"),
                    );
                    formData.set(
                        "ttsConfigPath",
                        getStringConfig(dubbingNode, "ttsConfigPath"),
                    );
                    formData.set(
                        "ttsNoiseScale",
                        String(
                            getNumberConfig(
                                dubbingNode,
                                "ttsNoiseScale",
                                DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
                            ),
                        ),
                    );
                    formData.set(
                        "ttsNoiseW",
                        String(
                            getNumberConfig(
                                dubbingNode,
                                "ttsNoiseW",
                                DEFAULT_PIPER_TTS_SETTINGS.noiseW,
                            ),
                        ),
                    );
                    formData.set(
                        "ttsSentenceSilence",
                        String(
                            getNumberConfig(
                                dubbingNode,
                                "ttsSentenceSilence",
                                DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
                            ),
                        ),
                    );
                    const configuredAlignmentMode = getStringConfig(
                        dubbingNode,
                        "ttsAlignmentMode",
                        "strict",
                    );
                    const preprocessSpeedFactor =
                        sourceNode.templateNodeType === "video.preprocess"
                            ? getNumberConfig(sourceNode, "speedFactor", 1)
                            : 1;
                    const preprocessEnabled =
                        sourceNode.templateNodeType === "video.preprocess"
                            ? getBooleanConfig(sourceNode, "enabled", true)
                            : false;
                    const shouldForceStrictAlignment =
                        sourceNode.templateNodeType === "video.preprocess" &&
                        preprocessEnabled &&
                        Math.abs(preprocessSpeedFactor - 1) > 0.0001 &&
                        configuredAlignmentMode === "balanced";
                    const effectiveAlignmentMode = shouldForceStrictAlignment
                        ? "strict"
                        : configuredAlignmentMode;
                    formData.set("ttsAlignmentMode", effectiveAlignmentMode);
                    formData.set(
                        "ttsPreserveTimestampGaps",
                        String(
                            getBooleanConfig(
                                dubbingNode,
                                "ttsPreserveTimestampGaps",
                                true,
                            ),
                        ),
                    );

                    setNodeStatus(
                        dubbingNode.id,
                        "running",
                        "Transcribing, translating, generating voice and muxing MP4...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description:
                            "Transcribing, translating, generating voice, and muxing MP4...",
                    });
                    const dubbingPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: VideoDubbingResult;
                    }>({
                        url: "/api/audio/video-dubbing",
                        actionLabel: "Video dubbing",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
                        artifactId: dubbingPayload.data.artifactId,
                        artifactExpiresAt:
                            dubbingPayload.data.artifactExpiresAt,
                        fileName: dubbingPayload.data.fileName,
                        mimeType: dubbingPayload.data.mimeType,
                        base64: dubbingPayload.data.videoBase64,
                        byteLength: dubbingPayload.data.byteLength,
                        kind: "video",
                        detail: `${dubbingPayload.data.translation.translatedSegments.length} segment(s) dubbed`,
                    };
                    artifactByProducer[step.dubbingNodeId] = artifact;
                    translationByProducer[step.dubbingNodeId] =
                        dubbingPayload.data.translation;
                    setRuntimeTranslationsByNodeId((current) => ({
                        ...current,
                        [step.dubbingNodeId]: dubbingPayload.data.translation,
                    }));
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [dubbingNode.id]: artifact,
                    }));
                    setNodeStatus(
                        sourceNode.id,
                        "success",
                        source.sourceStatus,
                    );
                    setNodeStatus(
                        dubbingNode.id,
                        "success",
                        `${formatBytes(dubbingPayload.data.byteLength)} MP4 · ${effectiveAlignmentMode} alignment.`,
                    );
                    summary.push(
                        `Dubbed video ready: ${formatBytes(dubbingPayload.data.byteLength)}.`,
                    );
                    if (shouldForceStrictAlignment) {
                        summary.push(
                            `Auto-forced strict alignment for ${dubbingNode.label} because source came from preprocess ${preprocessSpeedFactor.toFixed(2)}x.`,
                        );
                    }
                    advanceProgress(
                        `Dubbing ${dubbingNode.label} complete.`,
                        "success",
                        buildDubbingProgressStepDescription({
                            nodeLabel: dubbingNode.label,
                            result: dubbingPayload.data,
                        }),
                    );
                } else if (step.kind === "vip-process-video") {
                    const sourceNode = findNode(step.sourceNodeId);
                    const vipNode = findNode(step.vipNodeId);
                    if (!sourceNode || !vipNode) {
                        throw new Error("Missing VIP processing nodes.");
                    }

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `VIP Processing '${vipNode.label}'`,
                    });
                    formData.set(
                        "vipResumeKey",
                        [
                            "workspace-vip",
                            vipNode.id,
                            sourceNode.id,
                            String(formData.get("assetId") ?? ""),
                            String(formData.get("artifactId") ?? ""),
                            source.detail,
                        ].join(":"),
                    );
                    const translationProviderId = getStringConfig(
                        vipNode,
                        "translationProviderId",
                    ).trim();
                    const effectiveTranslationProviderId =
                        translationProviderId ||
                        resolveDefaultAiProviderId(aiProviders);
                    if (effectiveTranslationProviderId) {
                        formData.set(
                            "providerId",
                            effectiveTranslationProviderId,
                        );
                    }
                    const metadataProviderId = getStringConfig(
                        vipNode,
                        "metadataProviderId",
                    ).trim();
                    if (metadataProviderId) {
                        formData.set("metadataProviderId", metadataProviderId);
                    }

                    formData.set(
                        "language",
                        getStringConfig(vipNode, "language", "zh"),
                    );
                    formData.set(
                        "targetLanguage",
                        getStringConfig(vipNode, "targetLanguage", "vi"),
                    );
                    formData.set(
                        "model",
                        getStringConfig(
                            vipNode,
                            "model",
                            DEFAULT_TRANSLATION_MODEL,
                        ),
                    );
                    formData.set(
                        "metadataModel",
                        getStringConfig(
                            vipNode,
                            "metadataModel",
                            DEFAULT_TRANSLATION_MODEL,
                        ),
                    );
                    formData.set(
                        "videoSpeedFactor",
                        String(getNumberConfig(vipNode, "speedFactor", 0.7)),
                    );
                    formData.set(
                        "originalAudioVolume",
                        String(
                            getNumberConfig(vipNode, "originalAudioVolume", 0.1),
                        ),
                    );
                    formData.set(
                        "voiceVolume",
                        String(getNumberConfig(vipNode, "voiceVolume", 1)),
                    );
                    formData.set(
                        "ttsBinaryPath",
                        getStringConfig(vipNode, "ttsBinaryPath", "piper"),
                    );
                    formData.set(
                        "ttsModelPath",
                        getStringConfig(vipNode, "ttsModelPath"),
                    );
                    formData.set(
                        "ttsConfigPath",
                        getStringConfig(vipNode, "ttsConfigPath"),
                    );
                    formData.set(
                        "ttsNoiseScale",
                        String(
                            getNumberConfig(
                                vipNode,
                                "ttsNoiseScale",
                                DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
                            ),
                        ),
                    );
                    formData.set(
                        "ttsNoiseW",
                        String(
                            getNumberConfig(
                                vipNode,
                                "ttsNoiseW",
                                DEFAULT_PIPER_TTS_SETTINGS.noiseW,
                            ),
                        ),
                    );
                    formData.set(
                        "ttsSentenceSilence",
                        String(
                            getNumberConfig(
                                vipNode,
                                "ttsSentenceSilence",
                                DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
                            ),
                        ),
                    );
                    formData.set(
                        "ttsAlignmentMode",
                        getStringConfig(vipNode, "ttsAlignmentMode", "strict"),
                    );
                    formData.set(
                        "ttsPreserveTimestampGaps",
                        String(
                            getBooleanConfig(
                                vipNode,
                                "ttsPreserveTimestampGaps",
                                true,
                            ),
                        ),
                    );
                    formData.set(
                        "mirrorEnabled",
                        String(getBooleanConfig(vipNode, "mirrorEnabled", true)),
                    );
                    const upstreamSourceAssetNode =
                        sourceNode.templateNodeType === "source.asset"
                            ? sourceNode
                            : findUpstreamSourceAssetNode(
                                  graph,
                                  sourceNode.id,
                              );
                    const sourceAssetSetupRaw = upstreamSourceAssetNode
                        ? (storageAssets.find(
                              (item) =>
                                  item._id ===
                                  getStringConfig(
                                      upstreamSourceAssetNode,
                                      "assetId",
                                  ),
                          )?.metadata?.videoEditSetup ?? null)
                        : null;
                    const sourceMirrorParity = upstreamSourceAssetNode
                        ? findMirrorParityToAncestorNode(
                              graph,
                              sourceNode.id,
                              upstreamSourceAssetNode.id,
                          )
                        : null;
                    const sourceAssetSetup = buildEffectiveMaskSetup(
                        vipNode,
                        sourceAssetSetupRaw,
                        {
                            mirrorSetupRegions:
                                (sourceMirrorParity ?? 0) % 2 === 1,
                        },
                    );
                    const maskConfig = resolveMaskRegionConfig(
                        vipNode,
                        sourceAssetSetup,
                    );
                    const rawVipBlurRegionsJson = getStringConfig(
                        vipNode,
                        "blurRegionsJson",
                    ).trim();
                    const usesSourceAssetSetup =
                        sourceNode.templateNodeType === "source.asset";
                    formData.set(
                        "useSourceAssetVideoEditSetup",
                        String(usesSourceAssetSetup),
                    );
                    if (rawVipBlurRegionsJson) {
                        formData.set("blurRegionsJson", rawVipBlurRegionsJson);
                    } else if (maskConfig.blurRegionsJson) {
                        formData.set(
                            "blurRegionsJson",
                            maskConfig.blurRegionsJson,
                        );
                    }
                    formData.set(
                        "blurEnabled",
                        String(maskConfig.blurEnabled),
                    );
                    formData.set(
                        "coverBoxEnabled",
                        String(maskConfig.coverBoxEnabled),
                    );
                    if (maskConfig.blurRegionsJson) {
                        formData.set(
                            "coverBoxesJson",
                            maskConfig.blurRegionsJson,
                        );
                    }
                    formData.set("regionX", String(maskConfig.regionX));
                    formData.set("regionY", String(maskConfig.regionY));
                    formData.set("regionWidth", String(maskConfig.regionWidth));
                    formData.set("regionHeight", String(maskConfig.regionHeight));
                    formData.set("timelineStart", String(maskConfig.timelineStart));
                    formData.set("timelineEnd", String(maskConfig.timelineEnd));
                    formData.set("blurStrength", String(maskConfig.blurStrength));
                    formData.set(
                        "subtitleFontFamily",
                        maskConfig.subtitleFontFamily,
                    );
                    formData.set(
                        "subtitleFontSize",
                        String(maskConfig.subtitleFontSize),
                    );
                    formData.set(
                        "subtitleMarginBottom",
                        String(maskConfig.subtitleMarginBottom),
                    );
                    formData.set(
                        "subtitleMarginLeft",
                        String(maskConfig.subtitleMarginLeft),
                    );
                    formData.set(
                        "subtitleMarginRight",
                        String(maskConfig.subtitleMarginRight),
                    );
                    formData.set(
                        "subtitleAlignment",
                        String(maskConfig.subtitleAlignment),
                    );
                    formData.set(
                        "subtitleBackgroundEnabled",
                        String(maskConfig.subtitleBackgroundEnabled),
                    );
                    formData.set(
                        "subtitleBackgroundColor",
                        maskConfig.subtitleBackgroundColor,
                    );
                    formData.set(
                        "subtitleBackgroundOpacity",
                        String(maskConfig.subtitleBackgroundOpacity),
                    );
                    formData.set(
                        "coverBoxColor",
                        maskConfig.subtitleBackgroundColor,
                    );
                    formData.set(
                        "coverBoxOpacity",
                        String(maskConfig.subtitleBackgroundOpacity),
                    );
                    formData.set(
                        "textOverlayEnabled",
                        String(maskConfig.textOverlayEnabled),
                    );
                    if (maskConfig.textOverlaysJson) {
                        formData.set(
                            "textOverlaysJson",
                            maskConfig.textOverlaysJson,
                        );
                    }

                    setNodeStatus(
                        vipNode.id,
                        "running",
                        "Running VIP pipeline: transcript -> translate -> voice -> final render -> metadata...",
                    );
                    const vipStageLogs: string[] = [];
                    const appendVipStageLog = (line: string) => {
                        vipStageLogs.push(line);
                        updateProgressStepDetail(step, {
                            progressMode: "indeterminate",
                            progress: 0,
                            description: vipStageLogs.join("\n"),
                        });
                    };
                    appendVipStageLog(
                        "Running transcript -> translate -> voice -> final render -> metadata...",
                    );
                    if (mode === "resume") {
                        appendVipStageLog(
                            "Continue mode: server-side VIP checkpoints will be reused when the source/config match.",
                        );
                    }
                    appendVipStageLog(
                        "Server-side VIP is running. Live sub-stage status is not streamed in current mode.",
                    );
                    appendVipStageLog(
                        "When done or failed, detailed stage results will be attached here.",
                    );
                    let vipPayload: {
                        ok: true;
                        data: VideoVipProcessingResult & {
                            artifactId?: string;
                            artifactExpiresAt?: string;
                        };
                    };
                    try {
                        vipPayload = await fetchWorkspaceJson<{
                            ok: true;
                            data: VideoVipProcessingResult & {
                                artifactId?: string;
                                artifactExpiresAt?: string;
                            };
                        }>({
                            url: "/api/audio/video-vip-processing",
                            actionLabel: "VIP processing",
                            init: { method: "POST", body: formData },
                        });
                    } catch (error) {
                        if (error instanceof WorkspaceApiError) {
                            if (error.status === 413) {
                                appendVipStageLog(
                                    "HTTP 413: request body too large before VIP API returned full result.",
                                );
                                appendVipStageLog(
                                    "Likely cause: upload body limit or provider upload limit (for Groq Whisper usually 25MB audio cap).",
                                );
                            }
                            for (const line of buildWorkspaceApiFailureDetailLines(
                                error.payload,
                            )) {
                                appendVipStageLog(line);
                            }
                        }
                        throw error;
                    }
                    if (vipPayload.data.checkpoint?.reusedStages.length) {
                        appendVipStageLog(
                            `Resumed VIP checkpoint: ${vipPayload.data.checkpoint.reusedStages.join(", ")}.`,
                        );
                    }

                    const artifact: WorkspaceRuntimeArtifact = {
                        artifactId: vipPayload.data.artifactId,
                        artifactExpiresAt: vipPayload.data.artifactExpiresAt,
                        fileName: vipPayload.data.fileName,
                        mimeType: vipPayload.data.mimeType,
                        base64: vipPayload.data.videoBase64,
                        byteLength: vipPayload.data.byteLength,
                        kind: "video",
                        detail: `${vipPayload.data.translation.translatedSegments.length} segment(s) VIP processed`,
                    };
                    artifactByProducer[step.vipNodeId] = artifact;
                    translationByProducer[step.vipNodeId] =
                        vipPayload.data.translation;
                    vietnameseMetadataByNodeId[step.vipNodeId] =
                        vipPayload.data.metadata;
                    setRuntimeTranslationsByNodeId((current) => ({
                        ...current,
                        [step.vipNodeId]: vipPayload.data.translation,
                    }));
                    setRuntimeVietnameseMetadataByNodeId((current) => ({
                        ...current,
                        [step.vipNodeId]: vipPayload.data.metadata,
                    }));
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [vipNode.id]: artifact,
                    }));
                    setNodeStatus(
                        sourceNode.id,
                        "success",
                        source.sourceStatus,
                    );
                    setNodeStatus(
                        vipNode.id,
                        "success",
                        `${formatBytes(vipPayload.data.byteLength)} MP4.`,
                    );
                    appendVipStageLog(
                        `Completed transcript stage (${formatDurationMs(vipPayload.data.stages.transcriptionDurationMs)}).`,
                    );
                    appendVipStageLog(
                        `Completed translation stage (${formatDurationMs(vipPayload.data.stages.translationDurationMs)}).`,
                    );
                    appendVipStageLog(
                        `Completed voice generation stage (${formatDurationMs(vipPayload.data.stages.voiceDurationMs)}).`,
                    );
                    for (const line of buildVoiceProcessingChunkLines(
                        vipPayload.data.voice.alignment,
                    )) {
                        appendVipStageLog(line);
                    }
                    appendVipStageLog(
                        `Completed final render stage (speed + mirror + blur + subtitles + audio mix) (${formatDurationMs(vipPayload.data.stages.finalRenderDurationMs)}).`,
                    );
                    appendVipStageLog(
                        `Completed metadata generation stage (${formatDurationMs(vipPayload.data.stages.metadataDurationMs)}).`,
                    );
                    summary.push(
                        `VIP video ready: ${formatBytes(vipPayload.data.byteLength)}.`,
                    );
                    summary.push(
                        `VIP metadata ready: ${vipPayload.data.metadata.hashtags.length} hashtag(s).`,
                    );
                    advanceProgress(
                        `VIP processing ${vipNode.label} complete.`,
                        "success",
                        buildVipProgressStepDescription({
                            nodeLabel: vipNode.label,
                            result: vipPayload.data,
                        }),
                    );
                } else if (step.kind === "mirror-video") {
                    const sourceNode = findNode(step.sourceNodeId);
                    const mirrorNode = findNode(step.mirrorNodeId);
                    if (!sourceNode || !mirrorNode) {
                        throw new Error("Missing mirror video nodes.");
                    }

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `Mirror Video '${mirrorNode.label}'`,
                    });
                    formData.set(
                        "axis",
                        getStringConfig(mirrorNode, "axis", "horizontal"),
                    );

                    setNodeStatus(
                        mirrorNode.id,
                        "running",
                        "Mirroring video horizontally with ffmpeg...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description:
                            "Mirroring video horizontally with ffmpeg...",
                    });
                    const mirrorPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: {
                            videoBase64: string;
                            mimeType: "video/mp4";
                            fileName: string;
                            byteLength: number;
                            transform: { axis: "horizontal"; filter: "hflip" };
                            artifactId?: string;
                            artifactExpiresAt?: string;
                        };
                    }>({
                        url: "/api/video-processing/mirror",
                        actionLabel: "Mirror video",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
                        artifactId: mirrorPayload.data.artifactId,
                        artifactExpiresAt:
                            mirrorPayload.data.artifactExpiresAt,
                        fileName: mirrorPayload.data.fileName,
                        mimeType: mirrorPayload.data.mimeType,
                        base64: mirrorPayload.data.videoBase64,
                        byteLength: mirrorPayload.data.byteLength,
                        kind: "video",
                        detail: `Mirror ${mirrorPayload.data.transform.axis}`,
                    };
                    artifactByProducer[step.mirrorNodeId] = artifact;
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [mirrorNode.id]: artifact,
                    }));
                    setNodeStatus(
                        sourceNode.id,
                        "success",
                        source.sourceStatus,
                    );
                    setNodeStatus(
                        mirrorNode.id,
                        "success",
                        `${formatBytes(mirrorPayload.data.byteLength)} MP4.`,
                    );
                    summary.push(
                        `Mirrored video ready: ${formatBytes(mirrorPayload.data.byteLength)}.`,
                    );
                    advanceProgress(`Mirror ${mirrorNode.label} complete.`);
                } else if (step.kind === "edit-video") {
                    const sourceNode = findNode(step.sourceNodeId);
                    const editNode = findNode(step.editNodeId);
                    const translationNode = findNode(step.translationNodeId);
                    if (!sourceNode || !editNode || !translationNode) {
                        throw new Error("Missing video edit nodes.");
                    }

                    const translation =
                        translationByProducer[step.translationNodeId];
                    if (!translation) {
                        setNodeStatus(
                            editNode.id,
                            "skipped",
                            "Chưa có translated transcript upstream.",
                        );
                        throw new Error(
                            `Mask Logo/Subtitles '${editNode.label}' thiếu translated transcript upstream.`,
                        );
                    }

                    const formData = new FormData();
                    const source = await resolveWorkspaceSourceVideoFile({
                        sourceNode,
                        consumerLabel: `Mask Logo/Subtitles '${editNode.label}'`,
                    });
                    if ("artifactId" in source && source.artifactId) {
                        formData.set("artifactId", source.artifactId);
                    } else if ("file" in source && source.file) {
                        formData.set("videoFile", source.file);
                    } else {
                        throw new Error(
                            `Mask Logo/Subtitles '${editNode.label}' không có video file hoặc artifactId.`,
                        );
                    }

                    const upstreamSourceAssetNode = findUpstreamSourceAssetNode(
                        graph,
                        sourceNode.id,
                    );
                    const sourceAssetSetupRaw = upstreamSourceAssetNode
                        ? (storageAssets.find(
                              (item) =>
                                  item._id ===
                                  getStringConfig(
                                      upstreamSourceAssetNode,
                                      "assetId",
                                  ),
                          )?.metadata?.videoEditSetup ?? null)
                        : null;
                    const sourceMirrorParity = upstreamSourceAssetNode
                        ? findMirrorParityToAncestorNode(
                              graph,
                              sourceNode.id,
                              upstreamSourceAssetNode.id,
                          )
                        : null;
                    const sourceAssetSetup = buildEffectiveMaskSetup(
                        editNode,
                        sourceAssetSetupRaw,
                        {
                            mirrorSetupRegions:
                                (sourceMirrorParity ?? 0) % 2 === 1,
                        },
                    );
                    const maskConfig = resolveMaskRegionConfig(
                        editNode,
                        sourceAssetSetup,
                    );
                    formData.set(
                        "mirrorEnabled",
                        String(maskConfig.mirrorEnabled),
                    );
                    formData.set(
                        "blurEnabled",
                        String(maskConfig.blurEnabled),
                    );
                    formData.set(
                        "coverBoxEnabled",
                        String(maskConfig.coverBoxEnabled),
                    );
                    formData.set(
                        "subtitleOverlayEnabled",
                        String(maskConfig.subtitleOverlayEnabled),
                    );
                    if (maskConfig.blurRegionsJson) {
                        formData.set(
                            "blurRegionsJson",
                            maskConfig.blurRegionsJson,
                        );
                        formData.set(
                            "coverBoxesJson",
                            maskConfig.blurRegionsJson,
                        );
                    } else {
                        formData.set("regionX", String(maskConfig.regionX));
                        formData.set("regionY", String(maskConfig.regionY));
                        formData.set(
                            "regionWidth",
                            String(maskConfig.regionWidth),
                        );
                        formData.set(
                            "regionHeight",
                            String(maskConfig.regionHeight),
                        );
                        formData.set(
                            "timelineStart",
                            String(maskConfig.timelineStart),
                        );
                        formData.set(
                            "timelineEnd",
                            String(maskConfig.timelineEnd),
                        );
                        formData.set(
                            "blurStrength",
                            String(maskConfig.blurStrength),
                        );
                    }
                    formData.set(
                        "subtitleFontFamily",
                        maskConfig.subtitleFontFamily,
                    );
                    formData.set(
                        "subtitleFontSize",
                        String(maskConfig.subtitleFontSize),
                    );
                    formData.set(
                        "subtitleMarginBottom",
                        String(maskConfig.subtitleMarginBottom),
                    );
                    formData.set(
                        "subtitleMarginLeft",
                        String(maskConfig.subtitleMarginLeft),
                    );
                    formData.set(
                        "subtitleMarginRight",
                        String(maskConfig.subtitleMarginRight),
                    );
                    formData.set(
                        "subtitleAlignment",
                        String(maskConfig.subtitleAlignment),
                    );
                    formData.set(
                        "subtitleBackgroundEnabled",
                        String(maskConfig.subtitleBackgroundEnabled),
                    );
                    formData.set(
                        "subtitleBackgroundColor",
                        maskConfig.subtitleBackgroundColor,
                    );
                    formData.set(
                        "subtitleBackgroundOpacity",
                        String(maskConfig.subtitleBackgroundOpacity),
                    );
                    formData.set(
                        "coverBoxColor",
                        maskConfig.subtitleBackgroundColor,
                    );
                    formData.set(
                        "coverBoxOpacity",
                        String(maskConfig.subtitleBackgroundOpacity),
                    );
                    formData.set(
                        "textOverlayEnabled",
                        String(maskConfig.textOverlayEnabled),
                    );
                    if (maskConfig.textOverlaysJson) {
                        formData.set(
                            "textOverlaysJson",
                            maskConfig.textOverlaysJson,
                        );
                    }
                    formData.set(
                        "translatedSegmentsJson",
                        JSON.stringify(translation.translatedSegments),
                    );
                    const sourceDimensions =
                        "file" in source && source.file
                            ? await probeVideoDimensionsFromFile(source.file)
                            : { width: 1920, height: 1080 };
                    formData.set(
                        "subtitlePlayResX",
                        String(sourceDimensions.width),
                    );
                    formData.set(
                        "subtitlePlayResY",
                        String(sourceDimensions.height),
                    );
                    formData.set(
                        "textOverlayPlayResX",
                        String(sourceDimensions.width),
                    );
                    formData.set(
                        "textOverlayPlayResY",
                        String(sourceDimensions.height),
                    );
                    formData.set("responseMode", "artifact");

                    setNodeStatus(
                        editNode.id,
                        "running",
                        "Blurring region and burning Vietnamese subtitles...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description:
                            "Blurring regions and burning Vietnamese subtitles...",
                    });
                    const editPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: {
                            videoBase64?: string;
                            artifactId?: string;
                            artifactExpiresAt?: string;
                            mimeType: "video/mp4";
                            fileName: string;
                            byteLength: number;
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
                    }>({
                        url: "/api/video-processing/edit",
                        actionLabel: "Video edit",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
                        artifactId: editPayload.data.artifactId,
                        artifactExpiresAt: editPayload.data.artifactExpiresAt,
                        fileName: editPayload.data.fileName,
                        mimeType: editPayload.data.mimeType,
                        base64: editPayload.data.videoBase64,
                        byteLength: editPayload.data.byteLength,
                        kind: "video",
                        detail: [
                            editPayload.data.transform.partialBlur
                                ? "Blur"
                                : "",
                            editPayload.data.transform.coverBox
                                ? "Cover box"
                                : "",
                            editPayload.data.transform.textOverlay
                                ? "Text overlay"
                                : "",
                            editPayload.data.transform.subtitleOverlay
                                ? "Subtitles"
                                : "",
                        ]
                            .filter(Boolean)
                            .join(" + "),
                    };
                    artifactByProducer[step.editNodeId] = artifact;
                    setRuntimeArtifactsByNodeId((current) => ({
                        ...current,
                        [editNode.id]: artifact,
                    }));
                    setNodeStatus(
                        sourceNode.id,
                        "success",
                        source.sourceStatus,
                    );
                    setNodeStatus(
                        translationNode.id,
                        "success",
                        `${translation.translatedSegments.length} translated segment(s) used.`,
                    );
                    setNodeStatus(
                        editNode.id,
                        "success",
                        `${formatBytes(editPayload.data.byteLength)} MP4.`,
                    );
                    summary.push(
                        `Edited video ready: ${formatBytes(editPayload.data.byteLength)}.`,
                    );
                    advanceProgress(`Video edit ${editNode.label} complete.`);
                } else if (step.kind === "store-artifact") {
                    const artifactNode = findNode(step.artifactNodeId);
                    const storageNode = findNode(step.storageNodeId);
                    if (!artifactNode || !storageNode) {
                        throw new Error("Missing artifact storage nodes.");
                    }
                    const artifact = artifactByProducer[step.artifactNodeId];
                    if (!artifact) {
                        setNodeStatus(
                            storageNode.id,
                            "skipped",
                            "Chưa có artifact upstream.",
                        );
                        throw new Error(
                            `Save to Storage '${storageNode.label}' thiếu generated artifact upstream.`,
                        );
                    }
                    const storageAccountId = getStringConfig(
                        storageNode,
                        "storageAccountId",
                    );
                    const storageAccount = storageAccounts.find(
                        (account) => account._id === storageAccountId,
                    );
                    if (!storageAccount) {
                        setNodeStatus(
                            storageNode.id,
                            "failed",
                            "Storage account không hợp lệ.",
                        );
                        throw new Error(
                            `Save to Storage '${storageNode.label}' cần storage account hợp lệ.`,
                        );
                    }

                    setNodeStatus(
                        storageNode.id,
                        "running",
                        `Saving generated video to ${storageAccount.label}...`,
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: `Saving generated video to ${storageAccount.label}...`,
                    });
                    const uploadForm = new FormData();
                    if (artifact.artifactId) {
                        uploadForm.set("artifactId", artifact.artifactId);
                    } else {
                        uploadForm.set("videoFile", base64ToFile(artifact));
                    }
                    uploadForm.set(
                        "storageProvider",
                        storageAccount.providerType === "telegram"
                            ? "telegram"
                            : "drive",
                    );
                    uploadForm.set(
                        "storageProviderAccountId",
                        storageAccount._id,
                    );
                    const upstreamAssetNode = findUpstreamSourceAssetNode(
                        graph,
                        artifactNode.id,
                    );
                    const upstreamAssetId = getStringConfig(
                        upstreamAssetNode ?? undefined,
                        "assetId",
                    );
                    const artifactFolder =
                        getAssetFolderName(
                            storageAssets.find(
                                (asset) => asset._id === upstreamAssetId,
                            ) ?? {},
                        ) || "workspace";
                    const upstreamMetadataNodeId =
                        findUpstreamMetadataNode(graph, storageNode.id)?.id ??
                        findUpstreamMetadataNode(graph, artifactNode.id)?.id;
                    const generatedMetadata =
                        (upstreamMetadataNodeId
                            ? vietnameseMetadataByNodeId[upstreamMetadataNodeId]
                            : undefined) ??
                        Object.values(vietnameseMetadataByNodeId)[0];
                    const upstreamSourceAssetTitle = storageAssets
                        .find((asset) => asset._id === upstreamAssetId)
                        ?.metadata?.title?.trim();
                    const upstreamSourceNodeTitle = getStringConfig(
                        findUpstreamNodeByTemplateType(graph, artifactNode.id, [
                            "source.file",
                            "source.url",
                        ]) ?? undefined,
                        "title",
                    ).trim();
                    const outputTitle =
                        generatedMetadata?.title?.trim() ||
                        upstreamSourceNodeTitle ||
                        upstreamSourceAssetTitle ||
                        stripFileExtension(artifact.fileName) ||
                        artifact.fileName;
                    uploadForm.set("folder", artifactFolder);
                    uploadForm.set(
                        "tags",
                        buildFolderAssetTags({
                            folder: artifactFolder,
                            lifecycle: "processed",
                        }).join(","),
                    );
                    uploadForm.set("title", outputTitle);
                    uploadForm.set("contentIntent", "other");
                    uploadForm.set("ownershipStatus", "unknown");

                    const uploadPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data?: { assetId?: string };
                    }>({
                        url: "/api/video-intake/local-runs",
                        actionLabel: "Store generated artifact",
                        init: { method: "POST", body: uploadForm },
                    });
                    if (!uploadPayload.data?.assetId) {
                        throw new Error(
                            "Store generated artifact failed at /api/video-intake/local-runs: assetId missing.",
                        );
                    }

                    const newAssetId = uploadPayload.data.assetId as string;
                    assetByProducer[step.producerNodeId] = newAssetId;
                    setRuntimeAssetIdsByNodeId((current) => ({
                        ...current,
                        [step.producerNodeId]: newAssetId,
                    }));

                    const upstreamAsset = storageAssets.find(
                        (asset) => asset._id === upstreamAssetId,
                    );
                    if (upstreamAssetId && upstreamAsset) {
                        const processedSourceTags =
                            buildRawSourceProcessedOutputTags({
                                folder: artifactFolder,
                                existingTags:
                                    upstreamAsset.metadata?.tags ?? [],
                            });
                        try {
                            await fetchWorkspaceJson<{
                                ok: true;
                                data?: { _id?: string };
                            }>({
                                url: `/api/storage/assets/${upstreamAssetId}`,
                                actionLabel:
                                    "Mark raw source with processed output",
                                init: {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        metadata: {
                                            tags: processedSourceTags,
                                        },
                                    }),
                                },
                            });
                            setStorageAssets((current) =>
                                current.map((asset) =>
                                    asset._id === upstreamAssetId
                                        ? {
                                              ...asset,
                                              metadata: {
                                                  ...asset.metadata,
                                                  tags: processedSourceTags,
                                              },
                                          }
                                        : asset,
                                ),
                            );
                        } catch (patchSourceTagsError) {
                            summary.push(
                                `Stored asset ${newAssetId} nhưng patch source tags thất bại: ${
                                    patchSourceTagsError instanceof Error
                                        ? patchSourceTagsError.message
                                        : "unknown error"
                                }.`,
                            );
                        }
                    }

                    if (generatedMetadata) {
                        try {
                            await fetchWorkspaceJson<{
                                ok: true;
                                data?: { _id?: string };
                            }>({
                                url: `/api/storage/assets/${newAssetId}`,
                                actionLabel: "Patch storage asset metadata",
                                init: {
                                    method: "PATCH",
                                    headers: {
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        metadata: {
                                            vietnameseTitle:
                                                generatedMetadata.title,
                                            vietnameseDescription:
                                                generatedMetadata.description,
                                            vietnameseHashtags:
                                                generatedMetadata.hashtags,
                                        },
                                    }),
                                },
                            });
                            setStorageAssets((current) =>
                                current.map((asset) =>
                                    asset._id === newAssetId
                                        ? {
                                              ...asset,
                                              metadata: {
                                                  ...asset.metadata,
                                                  vietnameseTitle:
                                                      generatedMetadata.title,
                                                  vietnameseDescription:
                                                      generatedMetadata.description,
                                                  vietnameseHashtags:
                                                      generatedMetadata.hashtags,
                                              },
                                          }
                                        : asset,
                                ),
                            );
                        } catch (patchMetadataError) {
                            summary.push(
                                `Stored asset ${newAssetId} nhưng patch VI metadata thất bại: ${
                                    patchMetadataError instanceof Error
                                        ? patchMetadataError.message
                                        : "unknown error"
                                }.`,
                            );
                        }
                    }

                    setNodeStatus(
                        storageNode.id,
                        "success",
                        `Asset ${newAssetId}.`,
                    );
                    summary.push(`Stored generated asset ${newAssetId}.`);
                    advanceProgress(`Stored generated asset ${newAssetId}.`);
                } else if (step.kind === "download-local") {
                    const downloadNode = findNode(step.downloadNodeId);
                    if (!downloadNode) {
                        throw new Error("Missing download node.");
                    }
                    const downloadModeRaw = getStringConfig(
                        downloadNode,
                        "downloadMode",
                        "downloads",
                    );
                    const downloadMode =
                        downloadModeRaw === "choose-folder"
                            ? "choose-folder"
                            : "downloads";

                    setNodeStatus(
                        downloadNode.id,
                        "running",
                        "Saving output to local machine...",
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: "Saving output to local machine...",
                    });

                    const assetId = assetByProducer[step.producerNodeId];
                    let downloaded: {
                        file: File;
                        fileName: string;
                        mimeType: string;
                        byteLength: number;
                    };
                    if (assetId) {
                        downloaded = await fetchWorkspaceFile({
                            url: `/api/storage/assets/${assetId}/download`,
                            actionLabel: "Save local storage asset",
                            onProgress: (progress) => {
                                if (progress.percent === undefined) return;
                                updateProgressStepDetail(step, {
                                    progressMode: "determinate",
                                    progress: progress.percent,
                                    description: `Saving storage asset · ${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes ?? 0)}.`,
                                });
                            },
                        });
                    } else {
                        const artifact = artifactByProducer[step.producerNodeId];
                        if (!artifact || artifact.kind !== "video") {
                            setNodeStatus(
                                downloadNode.id,
                                "skipped",
                                "Producer step chưa cung cấp video artifact.",
                            );
                            throw new Error(
                                `Save to Local '${downloadNode.label}' thiếu upstream video artifact.`,
                            );
                        }
                        downloaded = await resolveRuntimeArtifactFileForLocalSave({
                            artifact,
                            actionLabel: "Save local runtime artifact",
                            onProgress: (progress) => {
                                if (progress.percent === undefined) return;
                                updateProgressStepDetail(step, {
                                    progressMode: "determinate",
                                    progress: progress.percent,
                                    description: `Saving runtime artifact · ${formatBytes(progress.loadedBytes)} / ${formatBytes(progress.totalBytes ?? 0)}.`,
                                });
                            },
                        });
                    }
                    await saveWorkspaceFileToLocal({
                        file: downloaded.file,
                        mode: downloadMode,
                    });

                    setNodeStatus(
                        downloadNode.id,
                        "success",
                        `${downloaded.fileName} (${formatBytes(downloaded.byteLength)}).`,
                    );
                    summary.push(`Saved ${downloaded.fileName} to local.`);
                    advanceProgress(
                        `Saved ${downloaded.fileName} to local machine.`,
                    );
                } else if (step.kind === "publish") {
                    const publishNode = findNode(step.publishNodeId);
                    if (!publishNode) continue;
                    const assetId = assetByProducer[step.producerNodeId];
                    if (!assetId) {
                        setNodeStatus(
                            publishNode.id,
                            "skipped",
                            "Producer step chưa cung cấp asset.",
                        );
                        failedPublishes += 1;
                        advanceProgress(
                            `Skip publish ${publishNode.label}: thiếu asset.`,
                            "skipped",
                        );
                        continue;
                    }

                    const socialAccountId = getStringConfig(
                        publishNode,
                        "socialAccountId",
                    );
                    const socialAccount = socialAccounts.find(
                        (account) => account._id === socialAccountId,
                    );
                    if (!socialAccount) {
                        setNodeStatus(
                            publishNode.id,
                            "failed",
                            "Chưa chọn social account.",
                        );
                        failedPublishes += 1;
                        advanceProgress(
                            `Publish ${publishNode.label} thiếu social account.`,
                            "failed",
                        );
                        continue;
                    }

                    const allowedTypes = publishTypesForAccount(socialAccount);
                    let publishType = getNodePublishType(publishNode);
                    if (!allowedTypes.includes(publishType)) {
                        publishType =
                            allowedTypes[0] ??
                            DEFAULT_PUBLISH_TYPE_BY_PLATFORM[
                                socialAccount.platform
                            ];
                    }

                    const facebookPageId = getStringConfig(
                        publishNode,
                        "facebookPageId",
                    ).trim();
                    if (
                        (publishType === "facebook_reel" ||
                            publishType === "facebook_video") &&
                        !facebookPageId
                    ) {
                        setNodeStatus(
                            publishNode.id,
                            "failed",
                            "Facebook publish cần Page ID.",
                        );
                        failedPublishes += 1;
                        advanceProgress(
                            `Publish ${publishNode.label} thiếu Facebook Page ID.`,
                            "failed",
                        );
                        continue;
                    }

                    const privacyStatus = getNodePrivacy(publishNode);
                    const titleOverride = getStringConfig(
                        publishNode,
                        "title",
                    ).trim();
                    const captionRaw = getStringConfig(
                        publishNode,
                        "caption",
                    ).trim();
                    const thumbnailAssetId = getStringConfig(
                        publishNode,
                        "thumbnailAssetId",
                    ).trim();
                    const hashtagsRaw = getStringConfig(
                        publishNode,
                        "hashtags",
                    );
                    const hashtags = hashtagsRaw
                        ? parseCommaList(hashtagsRaw)
                        : undefined;
                    const upstreamMetadataNodeId = findUpstreamMetadataNode(
                        graph,
                        publishNode.id,
                    )?.id;
                    const fallbackMetadata =
                        (upstreamMetadataNodeId
                            ? vietnameseMetadataByNodeId[upstreamMetadataNodeId]
                            : undefined) ??
                        Object.values(vietnameseMetadataByNodeId)[0];

                    setNodeStatus(
                        publishNode.id,
                        "running",
                        `Publishing via ${socialAccount.label} (${publishType})...`,
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: `Publishing via ${socialAccount.label} (${publishType})...`,
                    });

                    const publishPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data?: {
                            _id?: string;
                            status?: string;
                            errorDetail?: string;
                        };
                    }>({
                        url: "/api/social/publish-records",
                        actionLabel: "Publish social",
                        init: {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                assetId,
                                socialAccountId: socialAccount._id,
                                publishType,
                                thumbnailAssetId:
                                    thumbnailAssetId || undefined,
                                facebookPageId: facebookPageId || undefined,
                                publishNow: true,
                                privacyStatus,
                                title:
                                    titleOverride ||
                                    fallbackMetadata?.title ||
                                    undefined,
                                caption:
                                    captionRaw ||
                                    fallbackMetadata?.description ||
                                    undefined,
                                hashtags:
                                    hashtags && hashtags.length > 0
                                        ? hashtags
                                        : fallbackMetadata?.hashtags,
                            }),
                        },
                    });

                    const finalStatus = publishPayload.data?.status;
                    if (finalStatus === "failed") {
                        const reason =
                            publishPayload.data?.errorDetail ??
                            "Publish failed.";
                        setNodeStatus(publishNode.id, "failed", reason);
                        failedPublishes += 1;
                        advanceProgress(
                            `Publish ${publishNode.label} failed: ${reason}.`,
                            "failed",
                        );
                    } else {
                        setNodeStatus(
                            publishNode.id,
                            "success",
                            `Publish ${publishPayload.data?._id ?? ""} status: ${
                                finalStatus ?? "unknown"
                            }.`,
                        );
                        completedPublishes += 1;
                        successfulPublishNodeIds.add(publishNode.id);
                        advanceProgress(
                            `Publish ${publishNode.label} status ${
                                finalStatus ?? "unknown"
                            }.`,
                        );
                    }
                } else if (step.kind === "cleanup-assets") {
                    const cleanupNode = findNode(step.cleanupNodeId);
                    if (!cleanupNode) {
                        throw new Error("Missing cleanup node.");
                    }
                    if (
                        step.publishNodeId &&
                        !successfulPublishNodeIds.has(step.publishNodeId)
                    ) {
                        setNodeStatus(
                            cleanupNode.id,
                            "skipped",
                            "Publish upstream chưa thành công.",
                        );
                        advanceProgress(
                            `Skip cleanup ${cleanupNode.label}: publish upstream chưa thành công.`,
                            "skipped",
                        );
                        continue;
                    }

                    const originalAssetNode = findUpstreamSourceAssetNode(
                        graph,
                        cleanupNode.id,
                    );
                    const originalAssetId = originalAssetNode
                        ? getStringConfig(originalAssetNode, "assetId").trim()
                        : "";
                    const processedAssetId = step.producerNodeId
                        ? assetByProducer[step.producerNodeId]
                        : undefined;
                    const deleteTargets = Array.from(
                        new Set(
                            [
                                getBooleanConfig(
                                    cleanupNode,
                                    "deleteOriginalAsset",
                                    false,
                                )
                                    ? originalAssetId
                                    : undefined,
                                getBooleanConfig(
                                    cleanupNode,
                                    "deleteProcessedAsset",
                                    false,
                                )
                                    ? processedAssetId
                                    : undefined,
                            ].filter((assetId): assetId is string =>
                                Boolean(assetId),
                            ),
                        ),
                    );

                    if (deleteTargets.length === 0) {
                        setNodeStatus(
                            cleanupNode.id,
                            "skipped",
                            "Chưa chọn asset nào để xóa.",
                        );
                        advanceProgress(
                            `Skip cleanup ${cleanupNode.label}: chưa chọn asset nào.`,
                            "skipped",
                        );
                        continue;
                    }

                    setNodeStatus(
                        cleanupNode.id,
                        "running",
                        `Deleting ${deleteTargets.length} asset(s)...`,
                    );
                    updateProgressStepDetail(step, {
                        progressMode: "indeterminate",
                        progress: 0,
                        description: `Deleting ${deleteTargets.length} selected asset(s)...`,
                    });

                    for (const assetId of deleteTargets) {
                        await fetchWorkspaceJson<{
                            ok: true;
                            data?: { _id?: string };
                        }>({
                            url: `/api/storage/assets/${assetId}`,
                            actionLabel: "Cleanup asset",
                            init: { method: "DELETE" },
                        });
                    }

                    setStorageAssets((current) =>
                        current.filter(
                            (asset) => !deleteTargets.includes(asset._id),
                        ),
                    );
                    setNodeStatus(
                        cleanupNode.id,
                        "success",
                        `Deleted ${deleteTargets.length} asset(s).`,
                    );
                    summary.push(
                        `Cleanup deleted ${deleteTargets.length} asset(s).`,
                    );
                    advanceProgress(
                        `Cleanup ${cleanupNode.label} deleted ${deleteTargets.length} asset(s).`,
                    );
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Workspace step failed.";
                const descriptor = getProgressDescriptor(step);
                const lastDetail = progressStepDetailByKey[descriptor.key];
                finishWorkspaceProgressStep(step, {
                    status: "failed",
                    description:
                        step.kind === "vip-process-video" && lastDetail
                            ? lastDetail
                            : message,
                    error: message,
                });
                if (
                    step.kind === "use-existing-asset" ||
                    step.kind === "upload-and-store" ||
                    step.kind === "transcribe-chinese" ||
                    step.kind === "translate-transcript" ||
                    step.kind === "generate-vi-metadata" ||
                    step.kind === "generate-voice" ||
                    step.kind === "dub-video" ||
                    step.kind === "vip-process-video" ||
                    step.kind === "mirror-video" ||
                    step.kind === "edit-video" ||
                    step.kind === "store-artifact" ||
                    step.kind === "download-local" ||
                    step.kind === "cleanup-assets"
                ) {
                    abortRemaining = true;
                    setRunError(message);
                    finishProgressTask({
                        id: progressTaskId,
                        status: "failed",
                        description: "Workspace flow failed.",
                        error: message,
                    });
                    setIsRunningFlow(false);
                    return;
                }
                // for publish step (caught externally above we already continued)
            }
        }

        const totalPublish = completedPublishes + failedPublishes;
        const summaryParts = [...summary];
        if (totalPublish > 0) {
            summaryParts.push(
                `${completedPublishes}/${totalPublish} publish thành công.`,
            );
        }
        const summaryMessage =
            summaryParts.join(" ") || "Workspace flow hoàn tất.";
        setRunResult(summaryMessage);
        finishProgressTask({
            id: progressTaskId,
            status: failedPublishes > 0 ? "failed" : "success",
            description: summaryMessage,
            error:
                failedPublishes > 0
                    ? `${failedPublishes} publish step(s) failed.`
                    : undefined,
        });
        setIsRunningFlow(false);
    };

    const openFlowSetup = () => {
        if (!flowPlan.ok) {
            setRunError(flowPlan.errors.join("\n"));
            return;
        }
        if (flowPlan.steps.length === 0) {
            setRunError("Plan rỗng. Hãy thêm nodes vào graph.");
            return;
        }
        setRunError(null);
        setIsFlowSetupOpen(true);
    };

    const runConfiguredFlow = () => {
        if (flowSetupIssueCount > 0) return;
        setIsFlowSetupOpen(false);
        void runWorkspaceFlow("fresh");
    };

    const getCanvasPoint = (event: PointerEvent<HTMLElement>) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        if (!rect) {
            return { x: event.clientX, y: event.clientY };
        }
        return {
            x: (event.clientX - rect.left - canvasView.x) / canvasView.scale,
            y: (event.clientY - rect.top - canvasView.y) / canvasView.scale,
        };
    };

    const startNodeDrag = (
        event: PointerEvent<HTMLButtonElement>,
        node: WorkspaceNodeInstance,
    ) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        const point = getCanvasPoint(event);
        setDragState({
            nodeId: node.id,
            pointerId: event.pointerId,
            offsetX: point.x - node.position.x,
            offsetY: point.y - node.position.y,
        });
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleNodeDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.stopPropagation();
        const point = getCanvasPoint(event);
        setGraph((current) =>
            moveWorkspaceNode(current, dragState.nodeId, {
                x: point.x - dragState.offsetX,
                y: point.y - dragState.offsetY,
            }),
        );
    };

    const endNodeDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        event.stopPropagation();
        setDragState(null);
    };

    const startCanvasPan = (event: PointerEvent<HTMLDivElement>) => {
        const target = event.target;
        if (
            event.button !== 0 ||
            linkDragState ||
            (target instanceof HTMLElement && target.closest("button"))
        ) {
            return;
        }
        event.preventDefault();
        setPanState({
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: canvasView.x,
            originY: canvasView.y,
        });
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleCanvasPan = (event: PointerEvent<HTMLDivElement>) => {
        if (!panState || panState.pointerId !== event.pointerId) return;
        setCanvasView((current) => ({
            ...current,
            x: panState.originX + event.clientX - panState.startX,
            y: panState.originY + event.clientY - panState.startY,
        }));
    };

    const endCanvasPan = (event: PointerEvent<HTMLDivElement>) => {
        if (!panState || panState.pointerId !== event.pointerId) return;
        setPanState(null);
    };

    const getClosestNodeHandleSide = (
        point: { x: number; y: number },
        node: WorkspaceNodeInstance,
    ): "top" | "right" | "bottom" | "left" => {
        const cx = node.position.x + NODE_WIDTH / 2;
        const cy = node.position.y + NODE_HEIGHT_OFFSET;
        const dx = point.x - cx;
        const dy = point.y - cy;
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx >= 0 ? "right" : "left";
        }
        return dy >= 0 ? "bottom" : "top";
    };

    const startLinkDrag = (
        sourceNodeId: string,
        sourceSide: "top" | "right" | "bottom" | "left",
        event: PointerEvent<HTMLButtonElement>,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        const point = getCanvasPoint(event);
        setLinkDragState({
            sourceNodeId,
            pointerId: event.pointerId,
            sourceSide,
            point,
        });
        setLinkDragTarget(null);
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const handleLinkDragMove = (event: PointerEvent<HTMLButtonElement>) => {
        if (!linkDragState || linkDragState.pointerId !== event.pointerId)
            return;
        event.preventDefault();
        event.stopPropagation();
        const point = getCanvasPoint(event);
        setLinkDragState((current) =>
            current ? { ...current, point } : current,
        );
        const targetNode = graph.nodes.find((node) => {
            if (node.id === linkDragState.sourceNodeId) return false;
            return (
                point.x >= node.position.x &&
                point.x <= node.position.x + NODE_WIDTH &&
                point.y >= node.position.y &&
                point.y <= node.position.y + NODE_HEIGHT
            );
        });
        if (!targetNode) {
            setLinkDragTarget(null);
            return;
        }
        setLinkDragTarget({
            nodeId: targetNode.id,
            side: getClosestNodeHandleSide(point, targetNode),
        });
    };

    const handleLinkDragEnd = (event: PointerEvent<HTMLButtonElement>) => {
        if (!linkDragState || linkDragState.pointerId !== event.pointerId)
            return;
        event.preventDefault();
        event.stopPropagation();
        if (linkDragTarget) {
            const validationResult = validateWorkspaceConnection(
                graph,
                linkDragState.sourceNodeId,
                linkDragTarget.nodeId,
            );
            if (validationResult.ok) {
                setGraph((current) =>
                    connectWorkspaceNodes(
                        current,
                        linkDragState.sourceNodeId,
                        linkDragTarget.nodeId,
                    ),
                );
                setConnectionError(null);
            } else {
                setConnectionError(
                    validationResult.error ??
                        "Không thể tạo kết nối giữa hai node này.",
                );
            }
        }
        setLinkDragState(null);
        setLinkDragTarget(null);
    };

    const connectFromPending = (targetNodeId: string) => {
        if (!pendingSourceNodeId) return;
        const validationResult = validateWorkspaceConnection(
            graph,
            pendingSourceNodeId,
            targetNodeId,
        );
        if (!validationResult.ok) {
            setConnectionError(
                validationResult.error ??
                    "Không thể tạo kết nối giữa hai node này.",
            );
            return;
        }
        setGraph((current) =>
            connectWorkspaceNodes(current, pendingSourceNodeId, targetNodeId),
        );
        setPendingSourceNodeId(null);
        setConnectionError(null);
    };

    const selectNode = (nodeId: string) => {
        setGraph((current) => selectWorkspaceNode(current, nodeId));
    };

    const deleteSelectedNode = () => {
        if (!selectedNode) return;
        setGraph((current) => deleteWorkspaceNode(current, selectedNode.id));
        setPendingSourceNodeId((current) =>
            current === selectedNode.id ? null : current,
        );
        setRuntimeFilesByNodeId((current) => {
            const next = { ...current };
            delete next[selectedNode.id];
            return next;
        });
        setNodeRunStatus((current) => {
            const next = { ...current };
            delete next[selectedNode.id];
            return next;
        });
    };

    return (
        <section className="flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-main bg-main">
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
            </header>

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
                <aside className="thin-scrollbar min-h-0 overflow-y-auto border-b border-main bg-secondary/25 p-4 lg:border-b-0 lg:border-r">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-semibold text-main">
                            Node Catalog
                        </p>
                        <span className="text-[10px] text-muted">
                            {WORKSPACE_NODE_TEMPLATES.length} nodes
                        </span>
                    </div>
                    <div className="mt-3 space-y-4">
                        {groupedTemplates.map((group) => (
                            <div key={group.category}>
                                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                                    {CATEGORY_LABELS[group.category]}
                                </p>
                                <div className="space-y-2">
                                    {group.templates.map((template) => (
                                        <button
                                            key={template.nodeType}
                                            type="button"
                                            onClick={() => addNode(template)}
                                            className={cn(
                                                "w-full border border-l-2 border-main bg-main px-3 py-2 text-left transition-colors hover:bg-secondary",
                                                templateAccent(
                                                    template.category,
                                                ),
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <span className="text-[12px] font-semibold text-main">
                                                    {template.label}
                                                </span>
                                                <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">
                                                {template.description}
                                            </p>
                                            <span
                                                className={cn(
                                                    "mt-2 inline-flex border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                                    statusClass(
                                                        template.status,
                                                    ),
                                                )}
                                            >
                                                {template.status}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="flex min-h-0 min-w-0 flex-col border-b border-main bg-secondary/20 lg:border-b-0">
                    <WorkspaceRunStatusPanel
                        accountsError={accountsError}
                        flowPlan={flowPlan}
                        nodes={graph.nodes}
                        nodeRunStatus={nodeRunStatus}
                        isRunningFlow={isRunningFlow}
                        runError={runError}
                        runResult={runResult}
                        canResume={Boolean(runError) && hasResumeCheckpoint}
                        onRun={openFlowSetup}
                        onResume={() => runWorkspaceFlow("resume")}
                        onClear={clearDraft}
                    />

                    {connectionError ? (
                        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-700">
                            {connectionError}
                        </div>
                    ) : null}

                    <div
                        ref={viewportRef}
                        className={cn(
                            "relative min-h-0 flex-1 select-none overflow-hidden bg-secondary/20",
                            panState ? "cursor-grabbing" : "cursor-grab",
                        )}
                        onPointerDown={startCanvasPan}
                        onPointerMove={handleCanvasPan}
                        onPointerUp={endCanvasPan}
                        onPointerCancel={endCanvasPan}
                    >
                        <div
                            className="workspace-canvas-grid absolute left-0 top-0"
                            style={{
                                width: CANVAS_WIDTH,
                                height: CANVAS_HEIGHT,
                                transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.scale})`,
                                transformOrigin: "0 0",
                            }}
                        >
                            <svg
                                className="absolute inset-0 h-full w-full"
                                aria-hidden="true"
                                width={CANVAS_WIDTH}
                                height={CANVAS_HEIGHT}
                            >
                                {graph.edges.map((edge) => {
                                    const fromNode = graph.nodes.find(
                                        (node) => node.id === edge.fromNodeId,
                                    );
                                    const toNode = graph.nodes.find(
                                        (node) => node.id === edge.toNodeId,
                                    );
                                    if (!fromNode || !toNode) return null;

                                    const startX =
                                        fromNode.position.x + NODE_WIDTH;
                                    const startY =
                                        fromNode.position.y +
                                        NODE_HEIGHT_OFFSET;
                                    const endX = toNode.position.x;
                                    const endY =
                                        toNode.position.y + NODE_HEIGHT_OFFSET;
                                    const midX = startX + (endX - startX) / 2;
                                    const midY = startY + (endY - startY) / 2;
                                    const edgePath = buildWorkspaceLinkPath({
                                        startX,
                                        startY,
                                        endX,
                                        endY,
                                    });

                                    return (
                                        <g key={edge.id} className="group/edge">
                                            <path
                                                d={edgePath}
                                                fill="none"
                                                stroke="transparent"
                                                strokeWidth={
                                                    14 / canvasView.scale
                                                }
                                                className="pointer-events-stroke"
                                            />
                                            <path
                                                d={edgePath}
                                                fill="none"
                                                stroke="var(--color-accent)"
                                                strokeOpacity="0.55"
                                                strokeWidth={
                                                    2 / canvasView.scale
                                                }
                                            />
                                            <g
                                                transform={`translate(${midX} ${midY})`}
                                                role="button"
                                                tabIndex={0}
                                                aria-label="Delete link"
                                                onPointerDown={(event) =>
                                                    event.stopPropagation()
                                                }
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setGraph((current) =>
                                                        deleteWorkspaceEdge(
                                                            current,
                                                            edge.id,
                                                        ),
                                                    );
                                                }}
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key !== "Enter" &&
                                                        event.key !== " "
                                                    ) {
                                                        return;
                                                    }
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    setGraph((current) =>
                                                        deleteWorkspaceEdge(
                                                            current,
                                                            edge.id,
                                                        ),
                                                    );
                                                }}
                                                className="workspace-edge-delete-control pointer-events-none cursor-pointer opacity-0 transition-opacity group-hover/edge:pointer-events-auto group-hover/edge:opacity-100"
                                            >
                                                <circle
                                                    r="16"
                                                    fill="transparent"
                                                />
                                                <circle
                                                    r="12"
                                                    fill="var(--danger-bg)"
                                                    stroke="var(--danger-border)"
                                                />
                                                <path
                                                    d="M -4 -4 L 4 4 M 4 -4 L -4 4"
                                                    fill="none"
                                                    stroke="var(--danger-text)"
                                                    strokeLinecap="round"
                                                    strokeWidth="1.5"
                                                />
                                            </g>
                                        </g>
                                    );
                                })}
                                {linkDragState
                                    ? (() => {
                                          const sourceNode = graph.nodes.find(
                                              (n) =>
                                                  n.id ===
                                                  linkDragState.sourceNodeId,
                                          );
                                          if (!sourceNode) return null;
                                          const sourceX =
                                              linkDragState.sourceSide ===
                                              "left"
                                                  ? sourceNode.position.x
                                                  : linkDragState.sourceSide ===
                                                      "right"
                                                    ? sourceNode.position.x +
                                                      NODE_WIDTH
                                                    : sourceNode.position.x +
                                                      NODE_WIDTH / 2;
                                          const sourceY =
                                              linkDragState.sourceSide === "top"
                                                  ? sourceNode.position.y
                                                  : linkDragState.sourceSide ===
                                                      "bottom"
                                                    ? sourceNode.position.y +
                                                      NODE_HEIGHT
                                                    : sourceNode.position.y +
                                                      NODE_HEIGHT_OFFSET;
                                          const dragPath =
                                              buildWorkspaceLinkPath({
                                                  startX: sourceX,
                                                  startY: sourceY,
                                                  endX: linkDragState.point.x,
                                                  endY: linkDragState.point.y,
                                              });
                                          return (
                                              <path
                                                  d={dragPath}
                                                  fill="none"
                                                  stroke="var(--color-accent)"
                                                  strokeDasharray={`${6 / canvasView.scale} ${4 / canvasView.scale}`}
                                                  strokeWidth={
                                                      2 / canvasView.scale
                                                  }
                                              />
                                          );
                                      })()
                                    : null}
                            </svg>

                            {graph.nodes.length === 0 ? (
                                <div className="absolute left-16 top-16 max-w-md border border-dashed border-main bg-main px-4 py-3">
                                    <p className="text-[16px] font-semibold text-main">
                                        Workspace draft is empty
                                    </p>
                                    <p className="mt-1 text-[14px] leading-5 text-muted">
                                        Add nodes from the catalog or seed a
                                        sample flow to start shaping the
                                        pipeline. Ex: Upload → Storage → Publish
                                        Social.
                                    </p>
                                </div>
                            ) : null}

                            {graph.nodes.map((node) => (
                                <CanvasNode
                                    key={node.id}
                                    node={node}
                                    runState={nodeRunStatus[node.id]}
                                    isSelected={
                                        node.id === graph.selectedNodeId
                                    }
                                    isPendingSource={
                                        node.id === pendingSourceNodeId
                                    }
                                    canConnect={
                                        Boolean(pendingSourceNodeId) &&
                                        pendingSourceNodeId !== node.id
                                    }
                                    activeSourceSide={
                                        linkDragState?.sourceNodeId === node.id
                                            ? linkDragState.sourceSide
                                            : null
                                    }
                                    activeTargetSide={
                                        linkDragTarget?.nodeId === node.id
                                            ? linkDragTarget.side
                                            : null
                                    }
                                    onSelect={() => selectNode(node.id)}
                                    onConnect={() =>
                                        connectFromPending(node.id)
                                    }
                                    onDragStart={(event) =>
                                        startNodeDrag(event, node)
                                    }
                                    onDragMove={handleNodeDrag}
                                    onDragEnd={endNodeDrag}
                                    onStartLinkDrag={startLinkDrag}
                                    onLinkDragMove={handleLinkDragMove}
                                    onLinkDragEnd={handleLinkDragEnd}
                                />
                            ))}
                        </div>
                    </div>
                </main>

                <InspectorPanel
                    graph={graph}
                    node={selectedNode}
                    template={selectedTemplate}
                    pendingSourceNodeId={pendingSourceNodeId}
                    validation={validation}
                    flowPlan={flowPlan}
                    storageAccounts={storageAccounts}
                    socialAccounts={socialAccounts}
                    aiProviders={aiProviders}
                    aiModelsByProviderId={aiModelsByProviderId}
                    storageAssets={storageAssets}
                    thumbnailAssets={thumbnailAssets}
                    runtimeFilesByNodeId={runtimeFilesByNodeId}
                    runtimeFile={
                        selectedNode
                            ? (runtimeFilesByNodeId[selectedNode.id] ?? null)
                            : null
                    }
                    runtimeArtifact={
                        selectedNode
                            ? (runtimeArtifactsByNodeId[selectedNode.id] ??
                              null)
                            : null
                    }
                    facebookPagesByAccount={facebookPagesByAccount}
                    loadingFacebookAccountIds={loadingFacebookAccountIds}
                    loadingAiModelProviderIds={loadingAiModelProviderIds}
                    runtimeVietnameseMetadataByNodeId={
                        runtimeVietnameseMetadataByNodeId
                    }
                    isRunningFlow={isRunningFlow}
                    seedTemplates={WORKSPACE_SEED_TEMPLATES}
                    onSetPendingSource={(nodeId) =>
                        setPendingSourceNodeId(nodeId)
                    }
                    onCancelPendingSource={() => setPendingSourceNodeId(null)}
                    onDeleteSelected={deleteSelectedNode}
                    onUpdateNodeConfig={updateNodeConfig}
                    onUpdateNodeFile={setNodeFile}
                    onApplySeed={applySeedTemplate}
                    onEnsureFacebookPages={ensureFacebookPages}
                    onEnsureAiProviderModels={ensureAiProviderModels}
                />
            </div>
            {isFlowSetupOpen ? (
                <WorkspaceFlowSetupModal
                    accountsError={accountsError}
                    flowPlan={flowPlan}
                    setupNodes={flowSetupNodes}
                    issuesByNodeId={flowSetupIssuesByNodeId}
                    warningsByNodeId={flowSetupWarningsByNodeId}
                    graph={graph}
                    storageAccounts={storageAccounts}
                    socialAccounts={socialAccounts}
                    aiProviders={aiProviders}
                    aiModelsByProviderId={aiModelsByProviderId}
                    storageAssets={storageAssets}
                    thumbnailAssets={thumbnailAssets}
                    runtimeFilesByNodeId={runtimeFilesByNodeId}
                    runtimeArtifactsByNodeId={runtimeArtifactsByNodeId}
                    facebookPagesByAccount={facebookPagesByAccount}
                    loadingFacebookAccountIds={loadingFacebookAccountIds}
                    loadingAiModelProviderIds={loadingAiModelProviderIds}
                    runtimeVietnameseMetadataByNodeId={
                        runtimeVietnameseMetadataByNodeId
                    }
                    isRunningFlow={isRunningFlow}
                    onClose={() => setIsFlowSetupOpen(false)}
                    onRun={runConfiguredFlow}
                    onUpdateNodeConfig={updateNodeConfig}
                    onUpdateNodeFile={setNodeFile}
                    onEnsureFacebookPages={ensureFacebookPages}
                    onEnsureAiProviderModels={ensureAiProviderModels}
                />
            ) : null}
        </section>
    );
}

function WorkspaceFlowSetupModal({
    accountsError,
    flowPlan,
    setupNodes,
    issuesByNodeId,
    warningsByNodeId,
    graph,
    storageAccounts,
    socialAccounts,
    aiProviders,
    aiModelsByProviderId,
    storageAssets,
    thumbnailAssets,
    runtimeFilesByNodeId,
    runtimeArtifactsByNodeId,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    loadingAiModelProviderIds,
    runtimeVietnameseMetadataByNodeId,
    isRunningFlow,
    onClose,
    onRun,
    onUpdateNodeConfig,
    onUpdateNodeFile,
    onEnsureFacebookPages,
    onEnsureAiProviderModels,
}: {
    accountsError: string | null;
    flowPlan: WorkspaceFlowPlan;
    setupNodes: WorkspaceFlowSetupNode[];
    issuesByNodeId: Record<string, string[]>;
    warningsByNodeId: Record<string, string[]>;
    graph: WorkspaceGraph;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    aiProviders: WorkspaceAiProvider[];
    aiModelsByProviderId: Record<string, WorkspaceAiModel[] | undefined>;
    storageAssets: WorkspaceAsset[];
    thumbnailAssets: WorkspaceThumbnailAsset[];
    runtimeFilesByNodeId: Record<string, File | undefined>;
    runtimeArtifactsByNodeId: Record<
        string,
        WorkspaceRuntimeArtifact | undefined
    >;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    loadingAiModelProviderIds: Record<string, boolean>;
    runtimeVietnameseMetadataByNodeId: Record<
        string,
        VietnameseVideoMetadataResult | undefined
    >;
    isRunningFlow: boolean;
    onClose: () => void;
    onRun: () => void;
    onUpdateNodeConfig: (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => void;
    onUpdateNodeFile: (nodeId: string, file: File | null) => void;
    onEnsureFacebookPages: (accountId: string) => Promise<FacebookPagesResult>;
    onEnsureAiProviderModels: (
        providerId: string,
    ) => Promise<WorkspaceAiModel[]>;
}) {
    const issueCount = Object.values(issuesByNodeId).reduce(
        (total, issues) => total + issues.length,
        0,
    );
    const warningCount = Object.values(warningsByNodeId).reduce(
        (total, warnings) => total + warnings.length,
        0,
    );
    const readyCount = setupNodes.filter(
        ({ node }) => (issuesByNodeId[node.id] ?? []).length === 0,
    ).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 md:p-6">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="workspace-flow-setup-title"
                className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden border border-main bg-main shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-main bg-secondary/45 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                            Pre-run configuration
                        </p>
                        <h2
                            id="workspace-flow-setup-title"
                            className="mt-1 text-[16px] font-semibold text-main"
                        >
                            Flow Setup
                        </h2>
                        <p className="mt-1 max-w-3xl text-[11px] leading-5 text-muted">
                            Review and configure every executable node before
                            the flow starts. Each card writes back to the same
                            node config used by the canvas Inspector.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close Flow Setup"
                        onClick={onClose}
                        disabled={isRunningFlow}
                        className="inline-flex items-center border border-main bg-main p-1.5 text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </header>

                <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-[260px_minmax(0,1fr)]">
                    <aside className="thin-scrollbar min-h-0 overflow-y-auto border border-main bg-secondary/20 p-3">
                        <p className="text-[11px] font-semibold text-main">
                            Run readiness
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <div className="border border-emerald-500/30 bg-emerald-500/10 p-2">
                                <p className="text-[18px] font-semibold text-emerald-700">
                                    {readyCount}
                                </p>
                                <p className="text-[10px] text-emerald-700">
                                    Ready
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "border p-2",
                                    issueCount > 0
                                        ? "border-amber-500/30 bg-amber-500/10"
                                        : "border-main bg-main",
                                )}
                            >
                                <p
                                    className={cn(
                                        "text-[18px] font-semibold",
                                        issueCount > 0
                                            ? "text-amber-700"
                                            : "text-main",
                                    )}
                                >
                                    {issueCount}
                                </p>
                                <p
                                    className={cn(
                                        "text-[10px]",
                                        issueCount > 0
                                            ? "text-amber-700"
                                            : "text-muted",
                                    )}
                                >
                                    Need attention
                                </p>
                            </div>
                            <div
                                className={cn(
                                    "border p-2",
                                    warningCount > 0
                                        ? "border-sky-500/30 bg-sky-500/10"
                                        : "border-main bg-main",
                                )}
                            >
                                <p
                                    className={cn(
                                        "text-[18px] font-semibold",
                                        warningCount > 0
                                            ? "text-sky-700"
                                            : "text-main",
                                    )}
                                >
                                    {warningCount}
                                </p>
                                <p
                                    className={cn(
                                        "text-[10px]",
                                        warningCount > 0
                                            ? "text-sky-700"
                                            : "text-muted",
                                    )}
                                >
                                    Warnings
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 border border-main bg-main p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                Current plan
                            </p>
                            <p className="mt-1 text-[12px] font-semibold text-main">
                                {flowPlan.steps.length} step(s)
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-muted">
                                {setupNodes.length} executable node(s) shown in
                                first-run order.
                            </p>
                        </div>

                        {accountsError ? (
                            <div className="mt-3 border border-rose-500/30 bg-rose-500/10 p-3 text-[10px] leading-4 text-rose-700">
                                Runtime accounts failed to load: {accountsError}
                            </div>
                        ) : null}

                        <div className="mt-3 space-y-2">
                            {setupNodes.map(({ node }, index) => {
                                const issues = issuesByNodeId[node.id] ?? [];
                                const warnings =
                                    warningsByNodeId[node.id] ?? [];
                                return (
                                    <div
                                        key={node.id}
                                        className="border border-main bg-main p-2"
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-main bg-secondary text-[10px] font-bold text-main">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="truncate text-[11px] font-semibold text-main">
                                                    {node.label}
                                                </p>
                                                <p className="truncate text-[10px] text-muted">
                                                    {node.id}
                                                </p>
                                            </div>
                                        </div>
                                        <span
                                            className={cn(
                                                "mt-2 inline-flex border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                                issues.length > 0
                                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                                    : warnings.length > 0
                                                      ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                                            )}
                                        >
                                            {issues.length > 0
                                                ? "needs input"
                                                : warnings.length > 0
                                                  ? "review"
                                                  : "ready"}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </aside>

                    <div className="thin-scrollbar min-h-0 space-y-3 overflow-y-auto pr-1">
                        {setupNodes.map(({ node, template }, index) => {
                            const issues = issuesByNodeId[node.id] ?? [];
                            const warnings = warningsByNodeId[node.id] ?? [];
                            return (
                                <article
                                    key={node.id}
                                    className="border border-main bg-main"
                                >
                                    <header className="flex flex-col gap-2 border-b border-main bg-secondary/30 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="border border-main bg-main px-1.5 py-0.5 text-[10px] font-bold text-main">
                                                    Node {index + 1}
                                                </span>
                                                <h3 className="text-[13px] font-semibold text-main">
                                                    {node.label}
                                                </h3>
                                            </div>
                                            <p className="mt-1 text-[10px] text-muted">
                                                {node.templateNodeType} ·{" "}
                                                {node.id}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                "inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                                                issues.length > 0
                                                    ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                                                    : warnings.length > 0
                                                      ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                                                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
                                            )}
                                        >
                                            {issues.length > 0
                                                ? "Needs input"
                                                : warnings.length > 0
                                                  ? "Review"
                                                  : "Ready"}
                                        </span>
                                    </header>
                                    {issues.length > 0 ? (
                                        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                Resolve before run
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {issues.map((issue) => (
                                                    <span
                                                        key={issue}
                                                        className="border border-amber-500/30 bg-main px-2 py-1 text-[10px] font-semibold text-amber-700"
                                                    >
                                                        {issue}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    {warnings.length > 0 ? (
                                        <div className="border-b border-sky-500/20 bg-sky-500/10 px-4 py-3">
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                                                Review before run
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {warnings.map((warning) => (
                                                    <span
                                                        key={warning}
                                                        className="border border-sky-500/30 bg-main px-2 py-1 text-[10px] font-semibold text-sky-700"
                                                    >
                                                        {warning}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                    <div className="p-4">
                                        <NodeRuntimeConfig
                                            node={node}
                                            graph={graph}
                                            storageAccounts={storageAccounts}
                                            socialAccounts={socialAccounts}
                                            aiProviders={aiProviders}
                                            aiModelsByProviderId={
                                                aiModelsByProviderId
                                            }
                                            storageAssets={storageAssets}
                                            thumbnailAssets={
                                                thumbnailAssets
                                            }
                                            runtimeFilesByNodeId={
                                                runtimeFilesByNodeId
                                            }
                                            runtimeFile={
                                                runtimeFilesByNodeId[node.id] ??
                                                null
                                            }
                                            runtimeArtifact={
                                                runtimeArtifactsByNodeId[
                                                    node.id
                                                ] ?? null
                                            }
                                            facebookPagesByAccount={
                                                facebookPagesByAccount
                                            }
                                            loadingFacebookAccountIds={
                                                loadingFacebookAccountIds
                                            }
                                            loadingAiModelProviderIds={
                                                loadingAiModelProviderIds
                                            }
                                            runtimeVietnameseMetadataByNodeId={
                                                runtimeVietnameseMetadataByNodeId
                                            }
                                            isRunningFlow={isRunningFlow}
                                            onUpdateNodeConfig={
                                                onUpdateNodeConfig
                                            }
                                            onUpdateNodeFile={onUpdateNodeFile}
                                            onEnsureFacebookPages={
                                                onEnsureFacebookPages
                                            }
                                            onEnsureAiProviderModels={
                                                onEnsureAiProviderModels
                                            }
                                        />
                                        <div className="mt-3 border border-main bg-secondary/15 px-3 py-2 text-[10px] leading-4 text-muted">
                                            {template.description}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </div>

                <footer className="flex flex-col gap-3 border-t border-main bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[11px] leading-4 text-muted">
                        {issueCount > 0
                            ? `Resolve ${issueCount} issue(s) before running this flow.`
                            : warningCount > 0
                              ? `Flow can run, but review ${warningCount} warning(s) first.`
                              : "All executable nodes are ready. You can run the flow now."}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isRunningFlow}
                            className="inline-flex items-center border border-main bg-main px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onRun}
                            disabled={
                                isRunningFlow ||
                                issueCount > 0 ||
                                !flowPlan.ok ||
                                setupNodes.length === 0
                            }
                            className="inline-flex items-center gap-1.5 border border-accent/35 bg-accent px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FastForward className="h-3.5 w-3.5" />
                            Run Flow
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}

function CanvasNode({
    node,
    runState,
    isSelected,
    isPendingSource,
    canConnect,
    activeSourceSide,
    activeTargetSide,
    onSelect,
    onConnect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onStartLinkDrag,
    onLinkDragMove,
    onLinkDragEnd,
}: {
    node: WorkspaceNodeInstance;
    runState: NodeRunState | undefined;
    isSelected: boolean;
    isPendingSource: boolean;
    canConnect: boolean;
    activeSourceSide: "top" | "right" | "bottom" | "left" | null;
    activeTargetSide: "top" | "right" | "bottom" | "left" | null;
    onSelect: () => void;
    onConnect: () => void;
    onDragStart: (event: PointerEvent<HTMLButtonElement>) => void;
    onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
    onStartLinkDrag: (
        sourceNodeId: string,
        sourceSide: "top" | "right" | "bottom" | "left",
        event: PointerEvent<HTMLButtonElement>,
    ) => void;
    onLinkDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onLinkDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
    const template = getWorkspaceNodeTemplate(node.templateNodeType);
    const status = runState?.status ?? "idle";

    return (
        <div
            data-workspace-node-id={node.id}
            className="absolute group"
            style={{ left: node.position.x, top: node.position.y }}
        >
            <button
                type="button"
                onClick={canConnect ? onConnect : onSelect}
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
                className={cn(
                    "h-20 w-48 cursor-move touch-none border border-l-2 bg-main px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md",
                    template
                        ? templateAccent(template.category)
                        : "border-l-muted",
                    isSelected && "ring-2 ring-accent/40",
                    isPendingSource && "ring-2 ring-emerald-500/40",
                )}
                title={runState?.detail || undefined}
            >
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <p className="truncate text-[12px] font-semibold text-main">
                            {node.label}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted">
                            {node.templateNodeType}
                        </p>
                    </div>
                    <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                </div>
                {template ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                            className={cn(
                                "border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                statusClass(template.status),
                            )}
                        >
                            {template.status}
                        </span>
                        {status !== "idle" ? (
                            <span
                                className={cn(
                                    "border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                    runStatusBadgeClass(status),
                                )}
                            >
                                {status}
                            </span>
                        ) : null}
                        {canConnect ? (
                            <span className="border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                                connect
                            </span>
                        ) : null}
                    </div>
                ) : null}
            </button>
            {(["top", "right", "bottom", "left"] as const).map((side) => {
                const isActiveSource = activeSourceSide === side;
                const isActiveTarget = activeTargetSide === side;
                const shouldRevealNodeHandles =
                    activeTargetSide !== null || activeSourceSide !== null;
                const positionClass =
                    side === "top"
                        ? "left-1/2 -top-2 -translate-x-1/2"
                        : side === "right"
                          ? "right-[-8px] top-1/2 -translate-y-1/2"
                          : side === "bottom"
                            ? "left-1/2 -bottom-2 -translate-x-1/2"
                            : "left-[-8px] top-1/2 -translate-y-1/2";
                return (
                    <button
                        key={side}
                        type="button"
                        aria-label={`Start link from ${side}`}
                        onPointerDown={(event) =>
                            onStartLinkDrag(node.id, side, event)
                        }
                        onPointerMove={onLinkDragMove}
                        onPointerUp={onLinkDragEnd}
                        onPointerCancel={onLinkDragEnd}
                        className={cn(
                            "absolute rounded-full bg-transparent",
                            shouldRevealNodeHandles ? "block" : "hidden",
                            "group-hover:block",
                            positionClass,
                        )}
                        style={{
                            width: NODE_HANDLE_HIT_SIZE,
                            height: NODE_HANDLE_HIT_SIZE,
                            padding:
                                (NODE_HANDLE_HIT_SIZE -
                                    NODE_HANDLE_VISUAL_SIZE) /
                                2,
                        }}
                    >
                        <span
                            className={cn(
                                "block rounded-full border border-slate-400 bg-white transition-colors",
                                "group-hover:border-slate-600",
                                isActiveSource || isActiveTarget
                                    ? "border-indigo-600 ring-1 ring-indigo-300"
                                    : "",
                            )}
                            style={{
                                width: NODE_HANDLE_VISUAL_SIZE,
                                height: NODE_HANDLE_VISUAL_SIZE,
                            }}
                        />
                    </button>
                );
            })}
        </div>
    );
}

function WorkspaceRunStatusPanel({
    accountsError,
    flowPlan,
    nodes,
    nodeRunStatus,
    isRunningFlow,
    runError,
    runResult,
    canResume,
    onRun,
    onResume,
    onClear,
}: {
    accountsError: string | null;
    flowPlan: WorkspaceFlowPlan;
    nodes: WorkspaceNodeInstance[];
    nodeRunStatus: Record<string, NodeRunState>;
    isRunningFlow: boolean;
    runError: string | null;
    runResult: string | null;
    canResume: boolean;
    onRun: () => void;
    onResume: () => void;
    onClear: () => void;
}) {
    const stepDescriptors = flowPlan.steps.map((step) =>
        describeStep(step, nodes),
    );

    return (
        <div className="border-b border-main bg-main px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-main">
                        Workspace Runtime
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                        Cấu hình mỗi node trong Inspector bên phải, sau đó chạy
                        flow.
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                        Plan:{" "}
                        <span
                            className={
                                flowPlan.ok
                                    ? "text-emerald-600"
                                    : "text-amber-700"
                            }
                        >
                            {flowPlan.ok
                                ? `${flowPlan.steps.length} step(s) ready`
                                : (flowPlan.errors[0] ?? "Flow chưa hợp lệ.")}
                        </span>
                    </p>
                </div>
                <div className="w-full shrink-0 xl:w-auto">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={isRunningFlow || !flowPlan.ok}
                            onClick={onRun}
                            className="inline-flex items-center gap-1.5 border border-accent/35 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <FastForward className="h-3.5 w-3.5" />
                            {isRunningFlow ? "Running Flow..." : "Run Flow"}
                        </button>
                        <button
                            type="button"
                            disabled={
                                isRunningFlow || !flowPlan.ok || !canResume
                            }
                            onClick={onResume}
                            className="inline-flex items-center gap-1.5 border border-emerald-500/35 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Bỏ qua các step đã có output trong lần chạy trước và chạy tiếp từ step lỗi."
                        >
                            <Workflow className="h-3.5 w-3.5" />
                            Continue Failed Flow
                        </button>
                        <button
                            type="button"
                            disabled={isRunningFlow}
                            onClick={onClear}
                            className="inline-flex items-center gap-1.5 border border-rose-500/35 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Clear
                        </button>
                    </div>
                </div>
            </div>

            {stepDescriptors.length > 0 ? (
                <div className="mt-2 grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                    {stepDescriptors.map((descriptor) => {
                        const state = nodeRunStatus[descriptor.statusKey];
                        const status = state?.status ?? "idle";
                        return (
                            <div
                                key={descriptor.key}
                                className="flex items-start justify-between gap-2 border border-main bg-secondary/20 px-2 py-1.5"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-[11px] font-semibold text-main">
                                        {descriptor.label}
                                    </p>
                                    <p className="mt-0.5 truncate text-[10px] text-muted">
                                        {state?.detail || descriptor.subtitle}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        "shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                        runStatusBadgeClass(status),
                                    )}
                                >
                                    {status}
                                </span>
                            </div>
                        );
                    })}
                </div>
            ) : null}

            {!flowPlan.ok && flowPlan.errors.length > 1 ? (
                <ul className="mt-2 list-disc space-y-0.5 border border-amber-500/30 bg-amber-500/10 px-5 py-2 text-[10px] leading-4 text-amber-700">
                    {flowPlan.errors.slice(1).map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}

            {accountsError ? (
                <p className="mt-2 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
                    {accountsError}
                </p>
            ) : null}
            {runError ? (
                <p className="mt-2 whitespace-pre-line border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700">
                    {runError}
                </p>
            ) : null}
            {runResult ? (
                <p className="mt-2 border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-700">
                    {runResult}
                </p>
            ) : null}
        </div>
    );
}

function describeStep(
    step: WorkspaceFlowStep,
    nodes: WorkspaceNodeInstance[],
): { key: string; statusKey: string; label: string; subtitle: string } {
    const findLabel = (id: string) =>
        nodes.find((node) => node.id === id)?.label ?? id;

    if (step.kind === "use-existing-asset") {
        return {
            key: `use-${step.nodeId}`,
            statusKey: step.nodeId,
            label: `Asset · ${findLabel(step.nodeId)}`,
            subtitle: "Use existing storage asset",
        };
    }
    if (step.kind === "upload-and-store") {
        return {
            key: `upload-${step.storageNodeId}`,
            statusKey: step.storageNodeId,
            label: `Upload · ${findLabel(step.sourceFileNodeId)} → ${findLabel(step.storageNodeId)}`,
            subtitle: "Upload local file and persist to storage",
        };
    }
    if (step.kind === "intake-url-and-store") {
        return {
            key: `url-intake-${step.storageNodeId}`,
            statusKey: step.storageNodeId,
            label: `URL Intake · ${findLabel(step.sourceUrlNodeId)} → ${findLabel(step.storageNodeId)}`,
            subtitle: "Resolve source URL and persist video to storage",
        };
    }
    if (step.kind === "transcribe-chinese") {
        return {
            key: `transcribe-${step.transcriptionNodeId}`,
            statusKey: step.transcriptionNodeId,
            label: `Transcript · ${findLabel(step.sourceNodeId)} → ${findLabel(step.transcriptionNodeId)}`,
            subtitle: "Extract audio and transcribe timestamps",
        };
    }
    if (step.kind === "preprocess-video") {
        return {
            key: `preprocess-${step.preprocessNodeId}`,
            statusKey: step.preprocessNodeId,
            label: `Preprocess · ${findLabel(step.sourceNodeId)} → ${findLabel(step.preprocessNodeId)}`,
            subtitle: "Adjust source video speed with ffmpeg",
        };
    }
    if (step.kind === "translate-transcript") {
        return {
            key: `translate-${step.translationNodeId}`,
            statusKey: step.translationNodeId,
            label: `Translate · ${findLabel(step.transcriptionNodeId)} → ${findLabel(step.translationNodeId)}`,
            subtitle: "Translate timestamped transcript to Vietnamese",
        };
    }
    if (step.kind === "generate-vi-metadata") {
        return {
            key: `vi-metadata-${step.metadataNodeId}`,
            statusKey: step.metadataNodeId,
            label: `VI Metadata · ${findLabel(step.translationNodeId)} → ${findLabel(step.metadataNodeId)}`,
            subtitle: "Generate Vietnamese title/description/hashtags",
        };
    }
    if (step.kind === "generate-voice") {
        return {
            key: `voice-${step.voiceNodeId}`,
            statusKey: step.voiceNodeId,
            label: `Voice · ${findLabel(step.translationNodeId)} → ${findLabel(step.voiceNodeId)}`,
            subtitle: "Generate Vietnamese voice-over WAV",
        };
    }
    if (step.kind === "dub-video") {
        return {
            key: `dub-${step.dubbingNodeId}`,
            statusKey: step.dubbingNodeId,
            label: `Dub · ${findLabel(step.sourceNodeId)} → ${findLabel(step.dubbingNodeId)}`,
            subtitle: "Transcribe, translate, generate voice, and mux MP4",
        };
    }
    if (step.kind === "vip-process-video") {
        return {
            key: `vip-${step.vipNodeId}`,
            statusKey: step.vipNodeId,
            label: `VIP · ${findLabel(step.sourceNodeId)} → ${findLabel(step.vipNodeId)}`,
            subtitle:
                "Preprocess, dub, mirror, blur/subtitles, and generate metadata",
        };
    }
    if (step.kind === "mirror-video") {
        return {
            key: `mirror-${step.mirrorNodeId}`,
            statusKey: step.mirrorNodeId,
            label: `Mirror · ${findLabel(step.sourceNodeId)} → ${findLabel(step.mirrorNodeId)}`,
            subtitle: "Flip video horizontally with ffmpeg",
        };
    }
    if (step.kind === "edit-video") {
        return {
            key: `edit-${step.editNodeId}`,
            statusKey: step.editNodeId,
            label: `Edit · ${findLabel(step.sourceNodeId)} + ${findLabel(step.translationNodeId)} → ${findLabel(step.editNodeId)}`,
            subtitle: "Blur region and burn Vietnamese subtitles with ffmpeg",
        };
    }
    if (step.kind === "store-artifact") {
        return {
            key: `store-artifact-${step.storageNodeId}`,
            statusKey: step.storageNodeId,
            label: `Store · ${findLabel(step.artifactNodeId)} → ${findLabel(step.storageNodeId)}`,
            subtitle: "Persist generated video artifact to storage",
        };
    }
    if (step.kind === "publish") {
        return {
            key: `publish-${step.publishNodeId}`,
            statusKey: step.publishNodeId,
            label: `Publish · ${findLabel(step.publishNodeId)}`,
            subtitle: `Publish from ${findLabel(step.producerNodeId)}`,
        };
    }
    if (step.kind === "download-local") {
        return {
            key: `download-local-${step.downloadNodeId}`,
            statusKey: step.downloadNodeId,
            label: `Save Local · ${findLabel(step.downloadNodeId)}`,
            subtitle: `Save from ${findLabel(step.producerNodeId)}`,
        };
    }
    if (step.kind === "cleanup-assets") {
        return {
            key: `cleanup-${step.cleanupNodeId}`,
            statusKey: step.cleanupNodeId,
            label: `Cleanup · ${findLabel(step.cleanupNodeId)}`,
            subtitle: step.publishNodeId
                ? "Delete selected assets after successful publish"
                : "Delete selected stored assets",
        };
    }

    return {
        key: "unknown-step",
        statusKey: "",
        label: "Unknown step",
        subtitle: "",
    };
}

function RuntimeSelect({
    label,
    value,
    disabled,
    onChange,
    children,
}: {
    label: string;
    value: string;
    disabled?: boolean;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {label}
            </span>
            <select
                value={value}
                disabled={disabled}
                onChange={(event) => onChange(event.currentTarget.value)}
                className="w-full border border-main bg-secondary/35 px-2 py-1.5 text-[11px] text-main"
            >
                {children}
            </select>
        </label>
    );
}

const SUBTITLE_BACKGROUND_COLOR_OPTIONS = [
    { value: "#000000", label: "Black" },
    { value: "#FFFFFF", label: "White" },
    { value: "#808080", label: "Gray" },
] as const;

function normalizeSubtitleBackgroundColor(value: string | undefined) {
    const normalized = (value || "").trim().toUpperCase();
    return SUBTITLE_BACKGROUND_COLOR_OPTIONS.some(
        (option) => option.value === normalized,
    )
        ? normalized
        : "#000000";
}

function RuntimeTextInput({
    label,
    value,
    disabled,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    disabled?: boolean;
    placeholder?: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold text-muted">
                {label}
            </span>
            <input
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(event) => onChange(event.currentTarget.value)}
                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
            />
        </label>
    );
}

function RuntimeNumberInput({
    label,
    value,
    disabled,
    placeholder,
    min,
    max,
    step,
    onCommit,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    placeholder?: string;
    min: number;
    max: number;
    step?: number;
    onCommit: (value: number) => void;
}) {
    const [draft, setDraft] = useState(String(value));

    useEffect(() => {
        setDraft(String(value));
    }, [value]);

    const commitDraft = () => {
        const parsed = Number(draft);
        if (!Number.isFinite(parsed)) {
            setDraft(String(value));
            return;
        }
        const nextValue = clampNumber(parsed, min, max);
        setDraft(String(nextValue));
        onCommit(nextValue);
    };

    return (
        <label className="block min-w-0">
            <span className="mb-1 block text-[10px] font-semibold text-muted">
                {label}
            </span>
            <input
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step={step}
                value={draft}
                disabled={disabled}
                placeholder={placeholder}
                onChange={(event) => setDraft(event.currentTarget.value)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                    if (event.key === "Enter") {
                        event.currentTarget.blur();
                    }
                }}
                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main placeholder:text-muted/60"
            />
        </label>
    );
}

function RuntimeArtifactPanel({
    artifact,
}: {
    artifact: WorkspaceRuntimeArtifact;
}) {
    const artifactUrl = artifactDataUrl(artifact);

    return (
        <div className="space-y-2 border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="text-[11px] font-semibold text-emerald-700">
                {artifact.detail} · {formatBytes(artifact.byteLength)}
            </p>
            {artifactUrl ? (
                <>
                    {artifact.kind === "audio" ? (
                        <audio controls src={artifactUrl} className="w-full" />
                    ) : (
                        <video
                            controls
                            src={artifactUrl}
                            className="max-h-56 w-full bg-black"
                        />
                    )}
                    <a
                        href={artifactUrl}
                        download={artifact.fileName}
                        className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                    >
                        Download {artifact.fileName}
                    </a>
                </>
            ) : (
                <p className="border border-main bg-main px-2 py-1.5 text-[10px] leading-4 text-muted">
                    Server-side artifact ready. Preview/download appears after
                    the artifact is persisted or returned inline.
                </p>
            )}
        </div>
    );
}

function NodeRuntimeConfig({
    node,
    graph,
    storageAccounts,
    socialAccounts,
    aiProviders,
    aiModelsByProviderId,
    storageAssets,
    thumbnailAssets,
    runtimeFilesByNodeId = {},
    runtimeFile,
    runtimeArtifact,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    loadingAiModelProviderIds,
    runtimeVietnameseMetadataByNodeId,
    isRunningFlow,
    onUpdateNodeConfig,
    onUpdateNodeFile,
    onEnsureFacebookPages,
    onEnsureAiProviderModels,
}: {
    node: WorkspaceNodeInstance;
    graph: WorkspaceGraph;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    aiProviders: WorkspaceAiProvider[];
    aiModelsByProviderId: Record<string, WorkspaceAiModel[] | undefined>;
    storageAssets: WorkspaceAsset[];
    thumbnailAssets: WorkspaceThumbnailAsset[];
    runtimeFilesByNodeId: Record<string, File | undefined>;
    runtimeFile: File | null;
    runtimeArtifact: WorkspaceRuntimeArtifact | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    loadingAiModelProviderIds: Record<string, boolean>;
    runtimeVietnameseMetadataByNodeId: Record<
        string,
        VietnameseVideoMetadataResult | undefined
    >;
    isRunningFlow: boolean;
    onUpdateNodeConfig: (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => void;
    onUpdateNodeFile: (nodeId: string, file: File | null) => void;
    onEnsureFacebookPages: (accountId: string) => Promise<FacebookPagesResult>;
    onEnsureAiProviderModels: (
        providerId: string,
    ) => Promise<WorkspaceAiModel[]>;
}) {
    const setConfig = (patch: WorkspaceNodeInstance["config"]) =>
        onUpdateNodeConfig(node.id, patch);
    const upstreamSourceFileNode = findUpstreamSourceFileNode(graph, node.id);
    const upstreamRuntimeFile = upstreamSourceFileNode
        ? (runtimeFilesByNodeId[upstreamSourceFileNode.id] ?? null)
        : null;
    const upstreamLocalSetup = loadLocalVideoEditSetup(upstreamRuntimeFile);

    if (node.templateNodeType === "source.file") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                            Video file
                        </span>
                        <input
                            type="file"
                            accept="video/*,.mp4,.webm,.mov"
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                onUpdateNodeFile(
                                    node.id,
                                    event.currentTarget.files?.[0] ?? null,
                                )
                            }
                            className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                        />
                        {runtimeFile ? (
                            <span className="mt-1 block truncate text-[10px] text-muted">
                                {runtimeFile.name}
                            </span>
                        ) : null}
                        {loadLocalVideoEditSetup(runtimeFile) ? (
                            <span className="mt-1 block border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-700">
                                Video Tools Lab setup found
                            </span>
                        ) : null}
                    </label>
                    <RuntimeTextInput
                        label="Title"
                        value={getStringConfig(node, "title")}
                        disabled={isRunningFlow}
                        placeholder="Defaults to filename"
                        onChange={(value) => setConfig({ title: value })}
                    />
                    <RuntimeTextInput
                        label="Description"
                        value={getStringConfig(node, "description")}
                        disabled={isRunningFlow}
                        placeholder="Optional source description"
                        onChange={(value) => setConfig({ description: value })}
                    />
                    <RuntimeTextInput
                        label="Trace tags"
                        value={getStringConfig(
                            node,
                            "tags",
                            "workspace,upload",
                        )}
                        disabled={isRunningFlow}
                        placeholder="workspace,upload"
                        onChange={(value) => setConfig({ tags: value })}
                    />
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "source.url") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeTextInput
                        label="Source URL"
                        value={getStringConfig(node, "url")}
                        disabled={isRunningFlow}
                        placeholder="https://..."
                        onChange={(value) => setConfig({ url: value })}
                    />
                    <RuntimeTextInput
                        label="Title"
                        value={getStringConfig(node, "title")}
                        disabled={isRunningFlow}
                        placeholder="Optional title"
                        onChange={(value) => setConfig({ title: value })}
                    />
                    <RuntimeTextInput
                        label="Description"
                        value={getStringConfig(node, "description")}
                        disabled={isRunningFlow}
                        placeholder="Optional source description"
                        onChange={(value) => setConfig({ description: value })}
                    />
                    <RuntimeTextInput
                        label="Trace tags"
                        value={getStringConfig(node, "tags", "workspace,url")}
                        disabled={isRunningFlow}
                        placeholder="workspace,url"
                        onChange={(value) => setConfig({ tags: value })}
                    />
                    <RuntimeSelect
                        label="Quality preference"
                        value={getStringConfig(
                            node,
                            "qualityPreference",
                            "best",
                        )}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ qualityPreference: value })
                        }
                    >
                        <option value="best">best</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                        <option value="360p">360p</option>
                    </RuntimeSelect>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "source.asset") {
        const selectedAssetId = getStringConfig(node, "assetId");
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <WorkspaceStorageAssetPicker
                        assets={storageAssets}
                        selectedAssetId={selectedAssetId}
                        disabled={isRunningFlow}
                        onSelect={(assetId) => setConfig({ assetId })}
                    />
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "edit.mask-region") {
        const upstreamVideoNode = findMaskUpstreamVideoNode(graph, node.id);
        const upstreamSourceAssetNode = upstreamVideoNode
            ? findUpstreamSourceAssetNode(graph, upstreamVideoNode.id)
            : findUpstreamSourceAssetNode(graph, node.id);
        const upstreamSourceAsset = upstreamSourceAssetNode
            ? storageAssets.find(
                  (asset) =>
                      asset._id ===
                      getStringConfig(upstreamSourceAssetNode, "assetId"),
              )
            : undefined;
        const sourceAssetSetupRaw =
            upstreamSourceAsset?.metadata?.videoEditSetup ??
            upstreamLocalSetup?.videoEditSetup ??
            null;
        const sourceMirrorParity =
            upstreamVideoNode && upstreamSourceAssetNode
                ? findMirrorParityToAncestorNode(
                      graph,
                      upstreamVideoNode.id,
                      upstreamSourceAssetNode.id,
                  )
                : null;
        const shouldMirrorSetupRegions = (sourceMirrorParity ?? 0) % 2 === 1;
        const sourceAssetSetup = buildEffectiveMaskSetup(
            node,
            sourceAssetSetupRaw,
            { mirrorSetupRegions: shouldMirrorSetupRegions },
        );
        const maskConfig = resolveMaskRegionConfig(node, sourceAssetSetup);
        const setupAssetLabel =
            upstreamSourceAsset?.metadata?.title ??
            upstreamSourceAsset?.providerAssetId ??
            upstreamSourceAsset?._id ??
            upstreamLocalSetup?.fileName ??
            "";

        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    {sourceAssetSetup ? (
                        <div className="border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                            <p className="text-[10px] font-semibold text-emerald-700">
                                Using saved video setup from Storage Asset:{" "}
                                {setupAssetLabel}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-emerald-700/90">
                                Node values keep user overrides first; untouched
                                default fields fallback to this saved setup.
                            </p>
                            {shouldMirrorSetupRegions ? (
                                <p className="mt-1 text-[10px] leading-4 text-emerald-700/90">
                                    Upstream video path has Mirror transform, so
                                    fallback blur regions from this setup are
                                    auto mirrored horizontally to match runtime
                                    video.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Mirror output video
                            </span>
                            <span className="block text-[10px] text-muted">
                                Hflip output trong edit request (sau blur, trước
                                subtitle burn).
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={maskConfig.mirrorEnabled}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    mirrorEnabled: event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Blur regions JSON (multi-region)
                            </span>
                            <textarea
                                value={maskConfig.blurRegionsJson}
                                disabled={isRunningFlow}
                                onChange={(event) =>
                                    setConfig({
                                        blurRegionsJson:
                                            event.currentTarget.value,
                                    })
                                }
                                placeholder='[{"x":0,"y":84,"width":100,"height":16,"start":0,"end":36000,"strength":30}]'
                                className="min-h-16 w-full border border-main bg-main px-2 py-1.5 font-mono text-[10px] leading-4 text-main placeholder:text-muted/60"
                            />
                        </label>
                        <RuntimeTextInput
                            label="Region X %"
                            value={String(maskConfig.regionX)}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ regionX: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region Y %"
                            value={String(maskConfig.regionY)}
                            disabled={isRunningFlow}
                            placeholder="84"
                            onChange={(value) =>
                                setConfig({ regionY: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region width %"
                            value={String(maskConfig.regionWidth)}
                            disabled={isRunningFlow}
                            placeholder="100"
                            onChange={(value) =>
                                setConfig({ regionWidth: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region height %"
                            value={String(maskConfig.regionHeight)}
                            disabled={isRunningFlow}
                            placeholder="16"
                            onChange={(value) =>
                                setConfig({ regionHeight: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Start seconds"
                            value={String(maskConfig.timelineStart)}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ timelineStart: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="End seconds"
                            value={String(maskConfig.timelineEnd)}
                            disabled={isRunningFlow}
                            placeholder="36000"
                            onChange={(value) =>
                                setConfig({ timelineEnd: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Blur strength"
                            value={String(maskConfig.blurStrength)}
                            disabled={isRunningFlow}
                            placeholder="18"
                            onChange={(value) =>
                                setConfig({ blurStrength: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle font"
                            value={maskConfig.subtitleFontFamily}
                            disabled={isRunningFlow}
                            placeholder="Arial"
                            onChange={(value) =>
                                setConfig({ subtitleFontFamily: value })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle size"
                            value={String(maskConfig.subtitleFontSize)}
                            disabled={isRunningFlow}
                            placeholder="100"
                            onChange={(value) =>
                                setConfig({ subtitleFontSize: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle left margin"
                            value={String(maskConfig.subtitleMarginLeft)}
                            disabled={isRunningFlow}
                            placeholder="60"
                            onChange={(value) =>
                                setConfig({ subtitleMarginLeft: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle right margin"
                            value={String(maskConfig.subtitleMarginRight)}
                            disabled={isRunningFlow}
                            placeholder="60"
                            onChange={(value) =>
                                setConfig({
                                    subtitleMarginRight: Number(value),
                                })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle alignment (1..9)"
                            value={String(maskConfig.subtitleAlignment)}
                            disabled={isRunningFlow}
                            placeholder="2"
                            onChange={(value) =>
                                setConfig({ subtitleAlignment: Number(value) })
                            }
                        />
                        <RuntimeSelect
                            label="Subtitle background color"
                            value={normalizeSubtitleBackgroundColor(
                                maskConfig.subtitleBackgroundColor,
                            )}
                            disabled={isRunningFlow}
                            onChange={(value) =>
                                setConfig({ subtitleBackgroundColor: value })
                            }
                        >
                            {SUBTITLE_BACKGROUND_COLOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </RuntimeSelect>
                        <RuntimeTextInput
                            label="Subtitle background opacity %"
                            value={String(maskConfig.subtitleBackgroundOpacity)}
                            disabled={isRunningFlow}
                            placeholder="65"
                            onChange={(value) =>
                                setConfig({
                                    subtitleBackgroundOpacity: Number(value),
                                })
                            }
                        />
                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2 sm:col-span-2">
                            <span className="block text-[11px] font-semibold text-main">
                                Subtitle background enabled
                            </span>
                            <input
                                type="checkbox"
                                checked={maskConfig.subtitleBackgroundEnabled}
                                disabled={isRunningFlow}
                                onChange={(event) =>
                                    setConfig({
                                        subtitleBackgroundEnabled:
                                            event.currentTarget.checked,
                                    })
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>
                        <RuntimeTextInput
                            label="Subtitle Y margin"
                            value={String(maskConfig.subtitleMarginBottom)}
                            disabled={isRunningFlow}
                            placeholder="280"
                            onChange={(value) =>
                                setConfig({
                                    subtitleMarginBottom: Number(value),
                                })
                            }
                        />
                    </div>
                    {runtimeArtifact ? (
                        <RuntimeArtifactPanel artifact={runtimeArtifact} />
                    ) : (
                        <div className="flex items-start gap-2 border border-main bg-main px-3 py-2">
                            <Captions className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                            <p className="text-[10px] leading-4 text-muted">
                                Node này cần một video upstream và Translate
                                Transcript upstream; blur luôn được burn chung
                                với phụ đề tiếng Việt theo timestamps.
                            </p>
                        </div>
                    )}
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "edit.mirror") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Axis"
                        value={getStringConfig(node, "axis", "horizontal")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ axis: value })}
                    >
                        <option value="horizontal">horizontal</option>
                    </RuntimeSelect>
                    <div className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                        MVP hiện hỗ trợ lật ngang bằng ffmpeg `hflip`.
                    </div>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "storage.upload") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Storage account"
                        value={getStringConfig(node, "storageAccountId")}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ storageAccountId: value })
                        }
                    >
                        <option value="">Select storage</option>
                        {storageAccounts.map((account) => (
                            <option key={account._id} value={account._id}>
                                {account.label} ({account.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "output.download-local") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Save mode"
                        value={getStringConfig(node, "downloadMode", "downloads")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ downloadMode: value })}
                    >
                        <option value="downloads">Browser Downloads folder</option>
                        <option value="choose-folder">
                            Choose folder on every run
                        </option>
                    </RuntimeSelect>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "social.publish") {
        const upstreamAssetNode = findUpstreamSourceAssetNode(graph, node.id);
        const upstreamMetadataNode = findUpstreamMetadataNode(graph, node.id);
        const upstreamAssetId = upstreamAssetNode
            ? getStringConfig(upstreamAssetNode, "assetId")
            : "";
        const upstreamAsset = storageAssets.find(
            (asset) => asset._id === upstreamAssetId,
        );
        const runtimeGeneratedMetadata = upstreamMetadataNode
            ? runtimeVietnameseMetadataByNodeId[upstreamMetadataNode.id]
            : undefined;
        const metadataTitle =
            runtimeGeneratedMetadata?.title ??
            upstreamAsset?.metadata?.vietnameseTitle ??
            upstreamAsset?.metadata?.title ??
            "";
        const metadataCaption =
            runtimeGeneratedMetadata?.description ??
            upstreamAsset?.metadata?.vietnameseDescription ??
            upstreamAsset?.metadata?.description ??
            "";
        const metadataHashtags = (
            runtimeGeneratedMetadata?.hashtags ??
            upstreamAsset?.metadata?.vietnameseHashtags ??
            []
        ).join(",");
        const hasTitleOverride = Object.prototype.hasOwnProperty.call(
            node.config,
            "title",
        );
        const hasCaptionOverride = Object.prototype.hasOwnProperty.call(
            node.config,
            "caption",
        );
        const hasHashtagsOverride = Object.prototype.hasOwnProperty.call(
            node.config,
            "hashtags",
        );
        const selectedSocialAccountId = getStringConfig(
            node,
            "socialAccountId",
        );
        const selectedSocialAccount = socialAccounts.find(
            (account) => account._id === selectedSocialAccountId,
        );
        const allowedTypes = publishTypesForAccount(selectedSocialAccount);
        const currentPublishType = getNodePublishType(node);
        const effectivePublishType = allowedTypes.includes(currentPublishType)
            ? currentPublishType
            : (allowedTypes[0] ?? currentPublishType);
        const isFacebook =
            effectivePublishType === "facebook_reel" ||
            effectivePublishType === "facebook_video";
        const facebookPages = selectedSocialAccountId
            ? (facebookPagesByAccount[selectedSocialAccountId] ?? [])
            : [];
        const isLoadingFacebookPages = selectedSocialAccountId
            ? Boolean(loadingFacebookAccountIds[selectedSocialAccountId])
            : false;

        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Social account"
                        value={selectedSocialAccountId}
                        disabled={isRunningFlow}
                        onChange={async (value) => {
                            const nextAccount = socialAccounts.find(
                                (account) => account._id === value,
                            );
                            const nextAllowed =
                                publishTypesForAccount(nextAccount);
                            const nextPublishType =
                                nextAllowed[0] ?? "youtube_short";
                            const needsFacebookPage =
                                nextPublishType === "facebook_reel" ||
                                nextPublishType === "facebook_video";
                            let defaultFacebookPageId = "";

                            if (needsFacebookPage && value) {
                                try {
                                    const facebookData =
                                        await onEnsureFacebookPages(value);
                                    defaultFacebookPageId =
                                        facebookData.configuredPageId ??
                                        facebookData.pages[0]?.id ??
                                        "";
                                } catch {
                                    defaultFacebookPageId = "";
                                }
                            }

                            setConfig({
                                socialAccountId: value,
                                publishType: nextPublishType,
                                facebookPageId: defaultFacebookPageId,
                            });
                        }}
                    >
                        <option value="">Select social</option>
                        {socialAccounts.map((account) => (
                            <option key={account._id} value={account._id}>
                                {account.label} ({account.platform})
                            </option>
                        ))}
                    </RuntimeSelect>
                    <RuntimeSelect
                        label="Publish type"
                        value={effectivePublishType}
                        disabled={isRunningFlow || allowedTypes.length === 0}
                        onChange={async (value) => {
                            const isFacebookValue =
                                value === "facebook_reel" ||
                                value === "facebook_video";
                            let nextFacebookPageId = isFacebookValue
                                ? getStringConfig(node, "facebookPageId")
                                : "";

                            if (
                                isFacebookValue &&
                                !nextFacebookPageId &&
                                selectedSocialAccountId
                            ) {
                                try {
                                    const facebookData =
                                        await onEnsureFacebookPages(
                                            selectedSocialAccountId,
                                        );
                                    nextFacebookPageId =
                                        facebookData.configuredPageId ??
                                        facebookData.pages[0]?.id ??
                                        "";
                                } catch {
                                    nextFacebookPageId = "";
                                }
                            }

                            setConfig({
                                publishType: value,
                                facebookPageId: nextFacebookPageId,
                            });
                        }}
                    >
                        {allowedTypes.map((publishType) => (
                            <option key={publishType} value={publishType}>
                                {publishType}
                            </option>
                        ))}
                    </RuntimeSelect>
                    <RuntimeSelect
                        label="YouTube privacy"
                        value={getNodePrivacy(node)}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ privacyStatus: value })
                        }
                    >
                        <option value="private">private</option>
                        <option value="unlisted">unlisted</option>
                        <option value="public">public</option>
                    </RuntimeSelect>
                    {isFacebook ? (
                        <RuntimeSelect
                            label="Facebook Page"
                            value={getStringConfig(node, "facebookPageId")}
                            disabled={isRunningFlow || isLoadingFacebookPages}
                            onChange={(value) =>
                                setConfig({ facebookPageId: value })
                            }
                        >
                            <option value="">
                                {isLoadingFacebookPages
                                    ? "Loading pages..."
                                    : "Select Facebook Page"}
                            </option>
                            {facebookPages.map((page) => (
                                <option key={page.id} value={page.id}>
                                    {page.name} ({page.id})
                                </option>
                            ))}
                        </RuntimeSelect>
                    ) : null}
                    <RuntimeTextInput
                        label="Title (override)"
                        value={
                            hasTitleOverride
                                ? getStringConfig(node, "title")
                                : metadataTitle
                        }
                        disabled={isRunningFlow}
                        placeholder="Optional title override"
                        onChange={(value) => setConfig({ title: value })}
                    />
                    <RuntimeTextInput
                        label="Caption"
                        value={
                            hasCaptionOverride
                                ? getStringConfig(node, "caption")
                                : metadataCaption
                        }
                        disabled={isRunningFlow}
                        placeholder="Optional publish caption"
                        onChange={(value) => setConfig({ caption: value })}
                    />
                    <RuntimeTextInput
                        label="Hashtags"
                        value={
                            hasHashtagsOverride
                                ? getStringConfig(node, "hashtags")
                                : metadataHashtags
                        }
                        disabled={isRunningFlow}
                        placeholder="#tag1,#tag2 (optional)"
                        onChange={(value) => setConfig({ hashtags: value })}
                    />
                    <WorkspaceThumbnailAssetPicker
                        assets={thumbnailAssets}
                        selectedAssetId={getStringConfig(
                            node,
                            "thumbnailAssetId",
                        )}
                        disabled={isRunningFlow}
                        onSelect={(assetId) =>
                            setConfig({ thumbnailAssetId: assetId })
                        }
                    />
                    <p className="text-[10px] leading-4 text-muted">
                        Nếu để trống Title/Caption/Hashtags, Publish sẽ tự lấy
                        từ node Generate VI metadata (khi có output); nếu chưa
                        có thì fallback metadata của asset upstream.
                    </p>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "audio.chinese-transcribe") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Language hint"
                        value={getStringConfig(node, "language", "zh")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ language: value })}
                    >
                        <option value="zh">Mandarin (zh)</option>
                        <option value="vi">Vietnamese (vi)</option>
                        <option value="en">English (en)</option>
                        <option value="ja">Japanese (ja)</option>
                        <option value="ko">Korean (ko)</option>
                    </RuntimeSelect>
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Word timestamps
                            </span>
                            <span className="block text-[10px] text-muted">
                                Segment timestamps luôn bật.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "includeWordTimestamps",
                                true,
                            )}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    includeWordTimestamps:
                                        event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <RuntimeTextInput
                        label="Prompt"
                        value={getStringConfig(node, "prompt")}
                        disabled={isRunningFlow}
                        placeholder="Names, terms, source context..."
                        onChange={(value) => setConfig({ prompt: value })}
                    />
                    <div className="flex items-start gap-2 border border-main bg-main px-3 py-2">
                        <Captions className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                        <p className="text-[10px] leading-4 text-muted">
                            Node này chạy trực tiếp từ Upload Video upstream và
                            không persist transcript vào MongoDB trong MVP.
                        </p>
                    </div>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "video.preprocess") {
        const isPreprocessEnabled = getBooleanConfig(node, "enabled", true);
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Enable preprocess
                            </span>
                            <span className="block text-[10px] text-muted">
                                Tắt để passthrough source video không đổi tốc
                                độ.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={isPreprocessEnabled}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    enabled: event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <RuntimeNumberInput
                        label="Video speed"
                        value={getNumberConfig(node, "speedFactor", 0.7)}
                        disabled={isRunningFlow}
                        placeholder="0.7"
                        min={0.5}
                        max={2}
                        step={0.1}
                        onCommit={(value) => setConfig({ speedFactor: value })}
                    />
                    <p className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                        {isPreprocessEnabled
                            ? "Node này tạo video artifact mới để các bước transcript, dubbing hoặc edit downstream dùng lại."
                            : "Preprocess đang tắt: flow sẽ dùng trực tiếp source video làm passthrough artifact cho downstream."}
                    </p>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "cleanup.delete-assets") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Delete original asset
                            </span>
                            <span className="block text-[10px] text-muted">
                                Xóa video gốc upstream khi cleanup chạy.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "deleteOriginalAsset",
                                false,
                            )}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    deleteOriginalAsset:
                                        event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Delete processed asset
                            </span>
                            <span className="block text-[10px] text-muted">
                                Xóa asset processed cuối cùng upstream.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "deleteProcessedAsset",
                                false,
                            )}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    deleteProcessedAsset:
                                        event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <p className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                        Nếu node này nằm sau Publish Social, cleanup chỉ chạy
                        khi publish upstream thành công. Bản V1 chỉ xóa video
                        gốc và asset processed cuối cùng đã lưu vào Storage.
                    </p>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "text.translate-transcript") {
        const selectedTranslationProviderId = getStringConfig(
            node,
            "translationProviderId",
        );
        const translationModels = selectedTranslationProviderId
            ? (aiModelsByProviderId[selectedTranslationProviderId] ?? [])
            : [];
        const isLoadingTranslationModels = selectedTranslationProviderId
            ? Boolean(loadingAiModelProviderIds[selectedTranslationProviderId])
            : false;
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="AI Provider"
                        value={selectedTranslationProviderId}
                        disabled={isRunningFlow}
                        onChange={async (value) => {
                            setConfig({
                                translationProviderId: value,
                                model: value ? "" : DEFAULT_TRANSLATION_MODEL,
                            });
                            if (value) {
                                const models =
                                    await onEnsureAiProviderModels(value);
                                if (models[0]) {
                                    const preferredModelId =
                                        models.find(
                                            (model) =>
                                                model.id ===
                                                DEFAULT_TRANSLATION_MODEL,
                                        )?.id ?? models[0].id;
                                    setConfig({
                                        translationProviderId: value,
                                        model: preferredModelId,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL} (
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE})
                        </option>
                        {aiProviders.map((provider) => (
                            <option key={provider._id} value={provider._id}>
                                {provider.label} ({provider.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                    {selectedTranslationProviderId &&
                    translationModels.length > 0 ? (
                        <RuntimeSelect
                            label={`Model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                            value={getStringConfig(node, "model")}
                            disabled={
                                isRunningFlow || isLoadingTranslationModels
                            }
                            onChange={(value) => setConfig({ model: value })}
                        >
                            {translationModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </RuntimeSelect>
                    ) : (
                        <RuntimeTextInput
                            label={`Model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                            value={getStringConfig(
                                node,
                                "model",
                                DEFAULT_TRANSLATION_MODEL,
                            )}
                            disabled={isRunningFlow}
                            placeholder="cx/gpt-5.3-codex-low"
                            onChange={(value) => setConfig({ model: value })}
                        />
                    )}
                    <RuntimeSelect
                        label="Target language"
                        value={getStringConfig(node, "targetLanguage", "vi")}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ targetLanguage: value })
                        }
                    >
                        <option value="vi">Vietnamese (vi)</option>
                        <option value="en">English (en)</option>
                        <option value="zh">Mandarin (zh)</option>
                    </RuntimeSelect>
                    <div className="flex items-start gap-2 border border-main bg-main px-3 py-2">
                        <Captions className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                        <p className="text-[10px] leading-4 text-muted">
                            Node này giữ nguyên segment id và timestamp để dùng
                            tiếp cho subtitle hoặc voice-over.
                        </p>
                    </div>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "text.generate-vi-metadata") {
        const selectedMetadataProviderId = getStringConfig(
            node,
            "metadataProviderId",
        );
        const metadataModels = selectedMetadataProviderId
            ? (aiModelsByProviderId[selectedMetadataProviderId] ?? [])
            : [];
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="AI Provider"
                        value={selectedMetadataProviderId}
                        disabled={isRunningFlow}
                        onChange={async (value) => {
                            setConfig({
                                metadataProviderId: value,
                                model: value ? "" : DEFAULT_TRANSLATION_MODEL,
                            });
                            if (value) {
                                const models =
                                    await onEnsureAiProviderModels(value);
                                if (models[0]) {
                                    const preferredModelId =
                                        models.find(
                                            (model) =>
                                                model.id ===
                                                DEFAULT_TRANSLATION_MODEL,
                                        )?.id ?? models[0].id;
                                    setConfig({
                                        metadataProviderId: value,
                                        model: preferredModelId,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL} (
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE})
                        </option>
                        {aiProviders.map((provider) => (
                            <option key={provider._id} value={provider._id}>
                                {provider.label} ({provider.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                    {selectedMetadataProviderId && metadataModels.length > 0 ? (
                        <RuntimeSelect
                            label="Model"
                            value={getStringConfig(node, "model")}
                            disabled={isRunningFlow}
                            onChange={(value) => setConfig({ model: value })}
                        >
                            {metadataModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </RuntimeSelect>
                    ) : (
                        <RuntimeTextInput
                            label="Model"
                            value={getStringConfig(
                                node,
                                "model",
                                DEFAULT_TRANSLATION_MODEL,
                            )}
                            disabled={isRunningFlow}
                            placeholder="cx/gpt-5.3-codex-low"
                            onChange={(value) => setConfig({ model: value })}
                        />
                    )}
                    <p className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                        Node lá: chạy để sinh title + description + hashtags
                        tiếng Việt cho publish fallback.
                    </p>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "video.vip-processing") {
        const selectedTranslationProviderId = getStringConfig(
            node,
            "translationProviderId",
        );
        const translationModels = selectedTranslationProviderId
            ? (aiModelsByProviderId[selectedTranslationProviderId] ?? [])
            : [];
        const isLoadingTranslationModels = selectedTranslationProviderId
            ? Boolean(loadingAiModelProviderIds[selectedTranslationProviderId])
            : false;
        const selectedMetadataProviderId = getStringConfig(
            node,
            "metadataProviderId",
        );
        const metadataModels = selectedMetadataProviderId
            ? (aiModelsByProviderId[selectedMetadataProviderId] ?? [])
            : [];
        const isLoadingMetadataModels = selectedMetadataProviderId
            ? Boolean(loadingAiModelProviderIds[selectedMetadataProviderId])
            : false;
        const upstreamSourceAssetNode = findUpstreamSourceAssetNode(graph, node.id);
        const upstreamSourceAsset = upstreamSourceAssetNode
            ? storageAssets.find(
                  (asset) =>
                      asset._id ===
                      getStringConfig(upstreamSourceAssetNode, "assetId"),
              )
            : undefined;
        const sourceAssetSetupRaw =
            upstreamSourceAsset?.metadata?.videoEditSetup ??
            upstreamLocalSetup?.videoEditSetup ??
            null;
        const sourceMirrorParity = upstreamSourceAssetNode
            ? findMirrorParityToAncestorNode(
                  graph,
                  node.id,
                  upstreamSourceAssetNode.id,
              )
            : null;
        const shouldMirrorSetupRegions = (sourceMirrorParity ?? 0) % 2 === 1;
        const sourceAssetSetup = buildEffectiveMaskSetup(
            node,
            sourceAssetSetupRaw,
            { mirrorSetupRegions: shouldMirrorSetupRegions },
        );
        const maskConfig = resolveMaskRegionConfig(node, sourceAssetSetup);
        const setupAssetLabel =
            upstreamSourceAsset?.metadata?.title ??
            upstreamSourceAsset?.providerAssetId ??
            upstreamSourceAsset?._id ??
            upstreamLocalSetup?.fileName ??
            "";

        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    {sourceAssetSetup ? (
                        <div className="border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                            <p className="text-[10px] font-semibold text-emerald-700">
                                Using saved video setup from Storage Asset:{" "}
                                {setupAssetLabel}
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-emerald-700/90">
                                Node values keep user overrides first; untouched
                                default fields fallback to this saved setup.
                            </p>
                            {shouldMirrorSetupRegions ? (
                                <p className="mt-1 text-[10px] leading-4 text-emerald-700/90">
                                    Upstream video path has Mirror transform, so
                                    fallback blur regions from this setup are
                                    auto mirrored horizontally to match runtime
                                    video.
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                    <RuntimeSelect
                        label="Language hint"
                        value={getStringConfig(node, "language", "zh")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ language: value })}
                    >
                        <option value="zh">Mandarin (zh)</option>
                        <option value="en">English (en)</option>
                        <option value="vi">Vietnamese (vi)</option>
                    </RuntimeSelect>
                    <RuntimeSelect
                        label="AI Provider (translation)"
                        value={selectedTranslationProviderId}
                        disabled={isRunningFlow}
                        onChange={async (value) => {
                            setConfig({
                                translationProviderId: value,
                                model: value ? "" : DEFAULT_TRANSLATION_MODEL,
                            });
                            if (value) {
                                const models =
                                    await onEnsureAiProviderModels(value);
                                if (models[0]) {
                                    const preferredModelId =
                                        models.find(
                                            (model) =>
                                                model.id ===
                                                DEFAULT_TRANSLATION_MODEL,
                                        )?.id ?? models[0].id;
                                    setConfig({
                                        translationProviderId: value,
                                        model: preferredModelId,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL} (
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE})
                        </option>
                        {aiProviders.map((provider) => (
                            <option key={provider._id} value={provider._id}>
                                {provider.label} ({provider.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                    {selectedTranslationProviderId &&
                    translationModels.length > 0 ? (
                        <RuntimeSelect
                            label={`Translation model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                            value={getStringConfig(node, "model")}
                            disabled={isRunningFlow || isLoadingTranslationModels}
                            onChange={(value) => setConfig({ model: value })}
                        >
                            {translationModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </RuntimeSelect>
                    ) : (
                        <RuntimeTextInput
                            label={`Translation model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                            value={getStringConfig(
                                node,
                                "model",
                                DEFAULT_TRANSLATION_MODEL,
                            )}
                            disabled={isRunningFlow}
                            placeholder="cx/gpt-5.3-codex-low"
                            onChange={(value) => setConfig({ model: value })}
                        />
                    )}
                    <RuntimeSelect
                        label="Target language"
                        value={getStringConfig(node, "targetLanguage", "vi")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ targetLanguage: value })}
                    >
                        <option value="vi">Vietnamese (vi)</option>
                        <option value="en">English (en)</option>
                    </RuntimeSelect>

                    <RuntimeSelect
                        label="AI Provider (metadata)"
                        value={selectedMetadataProviderId}
                        disabled={isRunningFlow}
                        onChange={async (value) => {
                            setConfig({
                                metadataProviderId: value,
                                metadataModel: value
                                    ? ""
                                    : DEFAULT_TRANSLATION_MODEL,
                            });
                            if (value) {
                                const models =
                                    await onEnsureAiProviderModels(value);
                                if (models[0]) {
                                    const preferredModelId =
                                        models.find(
                                            (model) =>
                                                model.id ===
                                                DEFAULT_TRANSLATION_MODEL,
                                        )?.id ?? models[0].id;
                                    setConfig({
                                        metadataProviderId: value,
                                        metadataModel: preferredModelId,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL} (
                            {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE})
                        </option>
                        {aiProviders.map((provider) => (
                            <option key={provider._id} value={provider._id}>
                                {provider.label} ({provider.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                    {selectedMetadataProviderId && metadataModels.length > 0 ? (
                        <RuntimeSelect
                            label={`Metadata model${isLoadingMetadataModels ? " (loading...)" : ""}`}
                            value={getStringConfig(node, "metadataModel")}
                            disabled={isRunningFlow || isLoadingMetadataModels}
                            onChange={(value) =>
                                setConfig({ metadataModel: value })
                            }
                        >
                            {metadataModels.map((model) => (
                                <option key={model.id} value={model.id}>
                                    {model.name}
                                </option>
                            ))}
                        </RuntimeSelect>
                    ) : (
                        <RuntimeTextInput
                            label={`Metadata model${isLoadingMetadataModels ? " (loading...)" : ""}`}
                            value={getStringConfig(
                                node,
                                "metadataModel",
                                DEFAULT_TRANSLATION_MODEL,
                            )}
                            disabled={isRunningFlow}
                            placeholder="cx/gpt-5.3-codex-low"
                            onChange={(value) =>
                                setConfig({ metadataModel: value })
                            }
                        />
                    )}

                    <div className="grid gap-2 sm:grid-cols-3">
                        <RuntimeTextInput
                            label="Speed factor"
                            value={String(getNumberConfig(node, "speedFactor", 0.7))}
                            disabled={isRunningFlow}
                            placeholder="0.7"
                            onChange={(value) =>
                                setConfig({ speedFactor: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Original volume"
                            value={String(
                                getNumberConfig(node, "originalAudioVolume", 0.1),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.1"
                            onChange={(value) =>
                                setConfig({ originalAudioVolume: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Voice volume"
                            value={String(getNumberConfig(node, "voiceVolume", 1))}
                            disabled={isRunningFlow}
                            placeholder="1"
                            onChange={(value) =>
                                setConfig({ voiceVolume: Number(value) })
                            }
                        />
                    </div>

                    <RuntimeTextInput
                        label="Piper executable"
                        value={getStringConfig(node, "ttsBinaryPath", "piper")}
                        disabled={isRunningFlow}
                        placeholder="piper"
                        onChange={(value) => setConfig({ ttsBinaryPath: value })}
                    />
                    <RuntimeTextInput
                        label="ONNX model"
                        value={getStringConfig(node, "ttsModelPath")}
                        disabled={isRunningFlow}
                        placeholder="auto: piper/model.onnx"
                        onChange={(value) => setConfig({ ttsModelPath: value })}
                    />
                    <RuntimeTextInput
                        label="Config JSON"
                        value={getStringConfig(node, "ttsConfigPath")}
                        disabled={isRunningFlow}
                        placeholder="auto: piper/model.onnx.json"
                        onChange={(value) => setConfig({ ttsConfigPath: value })}
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                        <RuntimeTextInput
                            label="Noise scale"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsNoiseScale",
                                    DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.667"
                            onChange={(value) =>
                                setConfig({ ttsNoiseScale: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Noise W"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsNoiseW",
                                    DEFAULT_PIPER_TTS_SETTINGS.noiseW,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.8"
                            onChange={(value) =>
                                setConfig({ ttsNoiseW: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Sentence silence"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsSentenceSilence",
                                    DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.2"
                            onChange={(value) =>
                                setConfig({ ttsSentenceSilence: Number(value) })
                            }
                        />
                    </div>
                    <RuntimeSelect
                        label="Alignment mode"
                        value={getStringConfig(node, "ttsAlignmentMode", "strict")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ ttsAlignmentMode: value })}
                    >
                        <option value="strict">strict</option>
                        <option value="balanced">balanced</option>
                    </RuntimeSelect>
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span className="block text-[11px] font-semibold text-main">
                            Balanced timing
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "ttsPreserveTimestampGaps",
                                true,
                            )}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    ttsPreserveTimestampGaps:
                                        event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span className="block text-[11px] font-semibold text-main">
                            Mirror output video
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(node, "mirrorEnabled", true)}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    mirrorEnabled: event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <label className="block sm:col-span-2">
                            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                                Blur regions JSON (multi-region)
                            </span>
                            <textarea
                                value={maskConfig.blurRegionsJson}
                                disabled={isRunningFlow}
                                onChange={(event) =>
                                    setConfig({
                                        blurRegionsJson: event.currentTarget.value,
                                    })
                                }
                                placeholder='[{"x":0,"y":84,"width":100,"height":16,"start":0,"end":36000,"strength":30}]'
                                className="min-h-16 w-full border border-main bg-main px-2 py-1.5 font-mono text-[10px] leading-4 text-main placeholder:text-muted/60"
                            />
                        </label>
                        <RuntimeTextInput
                            label="Region X %"
                            value={String(maskConfig.regionX)}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ regionX: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region Y %"
                            value={String(maskConfig.regionY)}
                            disabled={isRunningFlow}
                            placeholder="84"
                            onChange={(value) =>
                                setConfig({ regionY: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region width %"
                            value={String(maskConfig.regionWidth)}
                            disabled={isRunningFlow}
                            placeholder="100"
                            onChange={(value) =>
                                setConfig({ regionWidth: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region height %"
                            value={String(maskConfig.regionHeight)}
                            disabled={isRunningFlow}
                            placeholder="16"
                            onChange={(value) =>
                                setConfig({ regionHeight: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Start seconds"
                            value={String(maskConfig.timelineStart)}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ timelineStart: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="End seconds"
                            value={String(maskConfig.timelineEnd)}
                            disabled={isRunningFlow}
                            placeholder="36000"
                            onChange={(value) =>
                                setConfig({ timelineEnd: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Blur strength"
                            value={String(maskConfig.blurStrength)}
                            disabled={isRunningFlow}
                            placeholder="50"
                            onChange={(value) =>
                                setConfig({ blurStrength: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle font"
                            value={maskConfig.subtitleFontFamily}
                            disabled={isRunningFlow}
                            placeholder="Arial"
                            onChange={(value) =>
                                setConfig({ subtitleFontFamily: value })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle size"
                            value={String(maskConfig.subtitleFontSize)}
                            disabled={isRunningFlow}
                            placeholder="55"
                            onChange={(value) =>
                                setConfig({ subtitleFontSize: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle Y margin"
                            value={String(maskConfig.subtitleMarginBottom)}
                            disabled={isRunningFlow}
                            placeholder="150"
                            onChange={(value) =>
                                setConfig({ subtitleMarginBottom: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle left margin"
                            value={String(maskConfig.subtitleMarginLeft)}
                            disabled={isRunningFlow}
                            placeholder="60"
                            onChange={(value) =>
                                setConfig({ subtitleMarginLeft: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle right margin"
                            value={String(maskConfig.subtitleMarginRight)}
                            disabled={isRunningFlow}
                            placeholder="60"
                            onChange={(value) =>
                                setConfig({ subtitleMarginRight: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle alignment (1..9)"
                            value={String(maskConfig.subtitleAlignment)}
                            disabled={isRunningFlow}
                            placeholder="2"
                            onChange={(value) =>
                                setConfig({ subtitleAlignment: Number(value) })
                            }
                        />
                        <RuntimeSelect
                            label="Subtitle background color"
                            value={normalizeSubtitleBackgroundColor(
                                maskConfig.subtitleBackgroundColor,
                            )}
                            disabled={isRunningFlow}
                            onChange={(value) =>
                                setConfig({ subtitleBackgroundColor: value })
                            }
                        >
                            {SUBTITLE_BACKGROUND_COLOR_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </RuntimeSelect>
                        <RuntimeTextInput
                            label="Subtitle background opacity %"
                            value={String(maskConfig.subtitleBackgroundOpacity)}
                            disabled={isRunningFlow}
                            placeholder="65"
                            onChange={(value) =>
                                setConfig({
                                    subtitleBackgroundOpacity: Number(value),
                                })
                            }
                        />
                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2 sm:col-span-2">
                            <span className="block text-[11px] font-semibold text-main">
                                Subtitle background enabled
                            </span>
                            <input
                                type="checkbox"
                                checked={getBooleanConfig(
                                    node,
                                    "subtitleBackgroundEnabled",
                                    maskConfig.subtitleBackgroundEnabled,
                                )}
                                disabled={isRunningFlow}
                                onChange={(event) =>
                                    setConfig({
                                        subtitleBackgroundEnabled:
                                            event.currentTarget.checked,
                                    })
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>
                    </div>
                    {runtimeArtifact ? (
                        <RuntimeArtifactPanel artifact={runtimeArtifact} />
                    ) : (
                        <div className="flex items-start gap-2 border border-main bg-main px-3 py-2">
                            <Volume2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                            <p className="text-[10px] leading-4 text-muted">
                                VIP node chạy pipeline tổng hợp trong một step:
                                preprocess, dubbing, mirror + blur/subtitles,
                                và generate VI metadata.
                            </p>
                        </div>
                    )}
                </div>
            </InspectorSection>
        );
    }

    if (
        node.templateNodeType === "audio.voice-generation" ||
        node.templateNodeType === "audio.video-dubbing"
    ) {
        const isDubbing = node.templateNodeType === "audio.video-dubbing";
        const selectedTranslationProviderId = getStringConfig(
            node,
            "translationProviderId",
        );
        const translationModels = selectedTranslationProviderId
            ? (aiModelsByProviderId[selectedTranslationProviderId] ?? [])
            : [];
        const isLoadingTranslationModels = selectedTranslationProviderId
            ? Boolean(loadingAiModelProviderIds[selectedTranslationProviderId])
            : false;
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    {isDubbing ? (
                        <>
                            <RuntimeSelect
                                label="Language hint"
                                value={getStringConfig(node, "language", "zh")}
                                disabled={isRunningFlow}
                                onChange={(value) =>
                                    setConfig({ language: value })
                                }
                            >
                                <option value="zh">Mandarin (zh)</option>
                                <option value="en">English (en)</option>
                                <option value="vi">Vietnamese (vi)</option>
                            </RuntimeSelect>
                            <RuntimeSelect
                                label="AI Provider"
                                value={selectedTranslationProviderId}
                                disabled={isRunningFlow}
                                onChange={async (value) => {
                                    setConfig({
                                        translationProviderId: value,
                                        model: value
                                            ? ""
                                            : DEFAULT_TRANSLATION_MODEL,
                                    });
                                    if (value) {
                                        const models =
                                            await onEnsureAiProviderModels(
                                                value,
                                            );
                                        if (models[0]) {
                                            const preferredModelId =
                                                models.find(
                                                    (model) =>
                                                        model.id ===
                                                        DEFAULT_TRANSLATION_MODEL,
                                                )?.id ?? models[0].id;
                                            setConfig({
                                                translationProviderId: value,
                                                model: preferredModelId,
                                            });
                                        }
                                    }
                                }}
                            >
                                <option value="">
                                    {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_LABEL} (
                                    {DEFAULT_OPENAI_COMPATIBLE_PROVIDER_TYPE})
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
                            </RuntimeSelect>
                            {selectedTranslationProviderId &&
                            translationModels.length > 0 ? (
                                <RuntimeSelect
                                    label={`Model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                                    value={getStringConfig(node, "model")}
                                    disabled={
                                        isRunningFlow ||
                                        isLoadingTranslationModels
                                    }
                                    onChange={(value) =>
                                        setConfig({ model: value })
                                    }
                                >
                                    {translationModels.map((model) => (
                                        <option key={model.id} value={model.id}>
                                            {model.name}
                                        </option>
                                    ))}
                                </RuntimeSelect>
                            ) : (
                                <RuntimeTextInput
                                    label={`Model${isLoadingTranslationModels ? " (loading...)" : ""}`}
                                    value={getStringConfig(
                                        node,
                                        "model",
                                        DEFAULT_TRANSLATION_MODEL,
                                    )}
                                    disabled={isRunningFlow}
                                    placeholder="cx/gpt-5.3-codex-low"
                                    onChange={(value) =>
                                        setConfig({ model: value })
                                    }
                                />
                            )}
                            <RuntimeSelect
                                label="Target language"
                                value={getStringConfig(
                                    node,
                                    "targetLanguage",
                                    "vi",
                                )}
                                disabled={isRunningFlow}
                                onChange={(value) =>
                                    setConfig({ targetLanguage: value })
                                }
                            >
                                <option value="vi">Vietnamese (vi)</option>
                                <option value="en">English (en)</option>
                            </RuntimeSelect>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <RuntimeTextInput
                                    label="Original volume"
                                    value={String(
                                        getNumberConfig(
                                            node,
                                            "originalAudioVolume",
                                            0.1,
                                        ),
                                    )}
                                    disabled={isRunningFlow}
                                    placeholder="0.1"
                                    onChange={(value) =>
                                        setConfig({
                                            originalAudioVolume: Number(value),
                                        })
                                    }
                                />
                                <RuntimeTextInput
                                    label="Voice volume"
                                    value={String(
                                        getNumberConfig(node, "voiceVolume", 1),
                                    )}
                                    disabled={isRunningFlow}
                                    placeholder="1"
                                    onChange={(value) =>
                                        setConfig({
                                            voiceVolume: Number(value),
                                        })
                                    }
                                />
                            </div>
                        </>
                    ) : null}
                    <RuntimeTextInput
                        label="Piper executable"
                        value={getStringConfig(node, "ttsBinaryPath", "piper")}
                        disabled={isRunningFlow}
                        placeholder="piper"
                        onChange={(value) =>
                            setConfig({ ttsBinaryPath: value })
                        }
                    />
                    <RuntimeTextInput
                        label="ONNX model"
                        value={getStringConfig(node, "ttsModelPath")}
                        disabled={isRunningFlow}
                        placeholder="auto: piper/model.onnx"
                        onChange={(value) => setConfig({ ttsModelPath: value })}
                    />
                    <RuntimeTextInput
                        label="Config JSON"
                        value={getStringConfig(node, "ttsConfigPath")}
                        disabled={isRunningFlow}
                        placeholder="auto: piper/model.onnx.json"
                        onChange={(value) =>
                            setConfig({ ttsConfigPath: value })
                        }
                    />
                    <div className="grid gap-2 sm:grid-cols-3">
                        <RuntimeTextInput
                            label="Noise scale"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsNoiseScale",
                                    DEFAULT_PIPER_TTS_SETTINGS.noiseScale,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.667"
                            onChange={(value) =>
                                setConfig({ ttsNoiseScale: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Noise W"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsNoiseW",
                                    DEFAULT_PIPER_TTS_SETTINGS.noiseW,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.8"
                            onChange={(value) =>
                                setConfig({ ttsNoiseW: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Sentence silence"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "ttsSentenceSilence",
                                    DEFAULT_PIPER_TTS_SETTINGS.sentenceSilence,
                                ),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0.2"
                            onChange={(value) =>
                                setConfig({
                                    ttsSentenceSilence: Number(value),
                                })
                            }
                        />
                    </div>
                    <RuntimeSelect
                        label="Alignment mode"
                        value={getStringConfig(
                            node,
                            "ttsAlignmentMode",
                            "strict",
                        )}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ ttsAlignmentMode: value })
                        }
                    >
                        <option value="strict">strict</option>
                        <option value="balanced">balanced</option>
                    </RuntimeSelect>
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Balanced timing
                            </span>
                            <span className="block text-[10px] text-muted">
                                Giữ thứ tự/timeline tương đối, nhưng giới hạn
                                pause dài và speed-up quá mạnh.
                            </span>
                            {isDubbing ? (
                                <span className="mt-1 block text-[10px] text-muted">
                                    Nếu source đi qua Video Preprocess khác 1x,
                                    runtime sẽ tự dùng strict alignment để tránh
                                    voice kết thúc sớm hơn timeline.
                                </span>
                            ) : null}
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "ttsPreserveTimestampGaps",
                                true,
                            )}
                            disabled={isRunningFlow}
                            onChange={(event) =>
                                setConfig({
                                    ttsPreserveTimestampGaps:
                                        event.currentTarget.checked,
                                })
                            }
                            className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                    </label>
                    {runtimeArtifact ? (
                        <RuntimeArtifactPanel artifact={runtimeArtifact} />
                    ) : (
                        <div className="flex items-start gap-2 border border-main bg-main px-3 py-2">
                            <Volume2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" />
                            <p className="text-[10px] leading-4 text-muted">
                                {isDubbing
                                    ? "Node này tự chạy transcript, translate, voice generation và mux MP4. Nối sang Save to Storage để persist artifact."
                                    : "Node này cần translated transcript upstream và tạo WAV preview/download trong Workspace."}
                            </p>
                        </div>
                    )}
                </div>
            </InspectorSection>
        );
    }

    return null;
}

function InspectorPanel({
    graph,
    node,
    template,
    pendingSourceNodeId,
    validation,
    flowPlan,
    storageAccounts,
    socialAccounts,
    aiProviders,
    aiModelsByProviderId,
    storageAssets,
    thumbnailAssets,
    runtimeFilesByNodeId,
    runtimeFile,
    runtimeArtifact,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    loadingAiModelProviderIds,
    runtimeVietnameseMetadataByNodeId,
    isRunningFlow,
    seedTemplates,
    onSetPendingSource,
    onCancelPendingSource,
    onDeleteSelected,
    onUpdateNodeConfig,
    onUpdateNodeFile,
    onApplySeed,
    onEnsureFacebookPages,
    onEnsureAiProviderModels,
}: {
    graph: WorkspaceGraph;
    node: WorkspaceNodeInstance | undefined;
    template: WorkspaceNodeTemplate | undefined;
    pendingSourceNodeId: string | null;
    validation: { ok: boolean; errors: string[] };
    flowPlan: WorkspaceFlowPlan;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    aiProviders: WorkspaceAiProvider[];
    aiModelsByProviderId: Record<string, WorkspaceAiModel[] | undefined>;
    storageAssets: WorkspaceAsset[];
    thumbnailAssets: WorkspaceThumbnailAsset[];
    runtimeFilesByNodeId: Record<string, File | undefined>;
    runtimeFile: File | null;
    runtimeArtifact: WorkspaceRuntimeArtifact | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    loadingAiModelProviderIds: Record<string, boolean>;
    runtimeVietnameseMetadataByNodeId: Record<
        string,
        VietnameseVideoMetadataResult | undefined
    >;
    isRunningFlow: boolean;
    seedTemplates: WorkspaceSeedTemplate[];
    onSetPendingSource: (nodeId: string) => void;
    onCancelPendingSource: () => void;
    onDeleteSelected: () => void;
    onUpdateNodeConfig: (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => void;
    onUpdateNodeFile: (nodeId: string, file: File | null) => void;
    onApplySeed: (seed: WorkspaceSeedTemplate) => void;
    onEnsureFacebookPages: (accountId: string) => Promise<FacebookPagesResult>;
    onEnsureAiProviderModels: (
        providerId: string,
    ) => Promise<WorkspaceAiModel[]>;
}) {
    return (
        <aside className="thin-scrollbar min-h-0 overflow-y-auto border-t border-main bg-main p-4 lg:border-l lg:border-t-0 lg:border-[var(--border-color)]">
            <p className="text-[12px] font-semibold text-main">Inspector</p>

            {pendingSourceNodeId ? (
                <div className="mt-3 border border-accent/30 bg-accent/10 px-3 py-2">
                    <p className="text-[11px] font-semibold text-main">
                        Linking from {pendingSourceNodeId}
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                        Click another node on canvas to create an edge from the
                        selected source.
                    </p>
                    <button
                        type="button"
                        onClick={onCancelPendingSource}
                        className="mt-2 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                    >
                        Cancel link
                    </button>
                </div>
            ) : null}

            {!node || !template ? (
                <div className="mt-3 space-y-4">
                    <div className="border border-dashed border-main bg-secondary/30 px-3 py-3">
                        <p className="text-[12px] font-medium text-main">
                            Select a node
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-muted">
                            Node contract, ports, config fields and traceability
                            notes will appear here.
                        </p>
                    </div>
                    <InspectorSection title="Flow Seeds">
                        <div className="space-y-2">
                            {seedTemplates.map((seed) => (
                                <button
                                    key={seed.id}
                                    type="button"
                                    onClick={() => onApplySeed(seed)}
                                    className="w-full border border-main bg-main px-2.5 py-2 text-left hover:bg-secondary"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <Sprout className="h-3.5 w-3.5 text-muted" />
                                        <p className="text-[11px] font-semibold text-main">
                                            {seed.label}
                                        </p>
                                    </div>
                                    <p className="mt-1 text-[10px] leading-4 text-muted">
                                        {seed.description}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </InspectorSection>
                </div>
            ) : (
                <div className="mt-3 space-y-4">
                    <div>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                    <p className="truncate text-[14px] font-semibold text-main">
                                        {node.label}
                                    </p>
                                    {node.templateNodeType ===
                                        "audio.voice-generation" ||
                                    node.templateNodeType ===
                                        "audio.video-dubbing" ? (
                                        <PiperTtsSetupInfo />
                                    ) : null}
                                </div>
                                <p className="mt-1 text-[11px] text-muted">
                                    {template.nodeType} · v{template.version}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    "shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                    statusClass(template.status),
                                )}
                            >
                                {template.status}
                            </span>
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-muted">
                            {template.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => onSetPendingSource(node.id)}
                            className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75"
                        >
                            <Link2 className="h-3.5 w-3.5" />
                            Link from node
                        </button>
                        <button
                            type="button"
                            onClick={onDeleteSelected}
                            className="inline-flex items-center gap-1.5 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                        </button>
                    </div>

                    <NodeRuntimeConfig
                        node={node}
                        graph={graph}
                        storageAccounts={storageAccounts}
                        socialAccounts={socialAccounts}
                        aiProviders={aiProviders}
                        aiModelsByProviderId={aiModelsByProviderId}
                        storageAssets={storageAssets}
                        thumbnailAssets={thumbnailAssets}
                        runtimeFilesByNodeId={runtimeFilesByNodeId}
                        runtimeFile={runtimeFile}
                        runtimeArtifact={runtimeArtifact}
                        facebookPagesByAccount={facebookPagesByAccount}
                        loadingFacebookAccountIds={loadingFacebookAccountIds}
                        loadingAiModelProviderIds={loadingAiModelProviderIds}
                        runtimeVietnameseMetadataByNodeId={
                            runtimeVietnameseMetadataByNodeId
                        }
                        isRunningFlow={isRunningFlow}
                        onUpdateNodeConfig={onUpdateNodeConfig}
                        onUpdateNodeFile={onUpdateNodeFile}
                        onEnsureFacebookPages={onEnsureFacebookPages}
                        onEnsureAiProviderModels={onEnsureAiProviderModels}
                    />

                    <InspectorSection title="Ports">
                        <PortList title="Inputs" ports={template.inputPorts} />
                        <PortList
                            title="Outputs"
                            ports={template.outputPorts}
                        />
                    </InspectorSection>

                    <InspectorSection title="Config Schema">
                        {template.configFields.length === 0 ? (
                            <p className="text-[11px] text-muted">
                                No config fields.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {template.configFields.map((field) => (
                                    <div
                                        key={field.key}
                                        className="border border-main bg-secondary/25 px-2 py-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-medium text-main">
                                                {field.label}
                                            </span>
                                            <span className="text-[10px] text-muted">
                                                {field.type}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[10px] text-muted">
                                            {field.required
                                                ? "required"
                                                : "optional"}
                                            {field.defaultValue !== undefined
                                                ? ` · default: ${String(field.defaultValue)}`
                                                : ""}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </InspectorSection>

                    <InspectorSection title="Runtime Contract">
                        <dl className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                <dt className="text-muted">Timeout</dt>
                                <dd className="font-semibold text-main">
                                    {formatTimeout(template.timeoutMs)}
                                </dd>
                            </div>
                            <div className="border border-main bg-secondary/25 px-2 py-1.5">
                                <dt className="text-muted">Retry</dt>
                                <dd className="font-semibold text-main">
                                    {template.retryPolicy.maxAttempts} ·{" "}
                                    {template.retryPolicy.backoff}
                                </dd>
                            </div>
                            <div className="col-span-2 border border-main bg-secondary/25 px-2 py-1.5">
                                <dt className="text-muted">Idempotency</dt>
                                <dd className="font-semibold text-main">
                                    {template.idempotencyStrategy}
                                </dd>
                            </div>
                        </dl>
                    </InspectorSection>

                    <InspectorSection title="Observability">
                        <p className="text-[11px] leading-5 text-muted">
                            {template.observabilityHooks.join(" · ")}
                        </p>
                    </InspectorSection>

                    <InspectorSection title="Traceability">
                        <p className="text-[11px] leading-5 text-muted">
                            {template.traceabilityNotes}
                        </p>
                    </InspectorSection>
                </div>
            )}

            {!flowPlan.ok && flowPlan.errors.length > 0 ? (
                <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold text-main">
                        Flow plan issues
                    </p>
                    <ul className="mt-1 space-y-1 text-[10px] leading-4 text-muted">
                        {flowPlan.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {!validation.ok ? (
                <div className="mt-4 border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                    <p className="text-[11px] font-semibold text-main">
                        Graph issues
                    </p>
                    <ul className="mt-1 space-y-1 text-[10px] leading-4 text-muted">
                        {validation.errors.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </aside>
    );
}

function PiperTtsSetupInfo() {
    return (
        <div className="group relative inline-flex shrink-0">
            <button
                type="button"
                aria-label="Piper TTS setup"
                className="inline-flex h-4 w-4 items-center justify-center border border-main bg-main text-muted hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
                <Info className="h-3 w-3" />
            </button>
            <div className="pointer-events-none absolute right-0 top-6 z-30 hidden w-[300px] border border-main bg-main p-3 shadow-lg group-focus-within:block group-hover:block">
                <p className="text-[10px] font-bold uppercase text-muted">
                    Piper TTS setup
                </p>
                <div className="mt-2 space-y-1.5">
                    {PIPER_TTS_SETUP_ROWS.map(([label, value]) => (
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
                    ))}
                </div>
            </div>
        </div>
    );
}

function InspectorSection({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {title}
            </p>
            {children}
        </div>
    );
}

function PortList({
    title,
    ports,
}: {
    title: string;
    ports: WorkspaceNodeTemplate["inputPorts"];
}) {
    return (
        <div className="mb-2 last:mb-0">
            <p className="mb-1 text-[11px] font-medium text-main">{title}</p>
            {ports.length === 0 ? (
                <p className="text-[10px] text-muted">None</p>
            ) : (
                <div className="space-y-1">
                    {ports.map((port) => (
                        <div
                            key={port.id}
                            className="flex items-center justify-between gap-2 border border-main bg-secondary/25 px-2 py-1"
                        >
                            <span className="text-[10px] text-main">
                                {port.label}
                            </span>
                            <span className="text-[10px] text-muted">
                                {port.dataType}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function WorkspaceStorageAssetPicker({
    assets,
    selectedAssetId,
    disabled,
    onSelect,
}: {
    assets: WorkspaceAsset[];
    selectedAssetId: string;
    disabled: boolean;
    onSelect: (assetId: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const selectedAsset = assets.find((asset) => asset._id === selectedAssetId);
    const visibleAssets = assets.filter((asset) =>
        matchesVideoAssetSearch(asset, searchQuery),
    );

    return (
        <div>
            <span className="mb-1 block text-[10px] font-semibold text-muted">
                Storage Library asset
            </span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between border border-main bg-main px-3 py-2 text-left text-[12px] text-main"
            >
                <span className="truncate">
                    {selectedAsset?.metadata?.title ??
                        selectedAsset?._id ??
                        "Select existing video"}
                </span>
                <span className="ml-2 text-[11px] text-muted">
                    {isOpen ? "Close" : "Browse"}
                </span>
            </button>
            {isOpen ? (
                <div className="mt-2 max-h-56 overflow-y-auto border border-main bg-main">
                    <div className="border-b border-main p-2">
                        <input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
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
                                    selectedAssetId === asset._id;
                                const isPreviewing =
                                    previewAssetId === asset._id;
                                return (
                                    <div
                                        key={asset._id}
                                        className={`border p-2 ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main"}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onSelect(asset._id);
                                                    setIsOpen(false);
                                                }}
                                                className="min-w-0 flex-1 text-left hover:opacity-90"
                                            >
                                                <p className="truncate text-[12px] font-semibold text-main">
                                                    {asset.metadata?.title ??
                                                        asset.providerAssetId ??
                                                        asset._id}
                                                </p>
                                                <p className="mt-1 truncate text-[10px] text-muted">
                                                    {[
                                                        getAssetFolderName(
                                                            asset,
                                                        ),
                                                        ...(asset.metadata
                                                            ?.tags ?? []),
                                                        asset.storageProvider,
                                                        asset.createdAt
                                                            ? new Date(
                                                                  asset.createdAt,
                                                              ).toLocaleDateString(
                                                                  "vi-VN",
                                                              )
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </p>
                                                <div className="mt-1">
                                                    <AssetLifecycleBadges
                                                        tags={
                                                            asset.metadata?.tags
                                                        }
                                                    />
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewAssetId((prev) =>
                                                        prev === asset._id
                                                            ? null
                                                            : asset._id,
                                                    )
                                                }
                                                className="shrink-0 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                            >
                                                {isPreviewing
                                                    ? "Hide"
                                                    : "Preview"}
                                            </button>
                                        </div>
                                        {isPreviewing ? (
                                            <div className="mt-2 overflow-hidden border border-main bg-black">
                                                <video
                                                    src={`/api/storage/assets/${asset._id}/download?disposition=inline`}
                                                    controls
                                                    preload="metadata"
                                                    className="h-24 w-full object-cover"
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
    );
}

function WorkspaceThumbnailAssetPicker({
    assets,
    selectedAssetId,
    disabled,
    onSelect,
}: {
    assets: WorkspaceThumbnailAsset[];
    selectedAssetId: string;
    disabled: boolean;
    onSelect: (assetId: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const selectedAsset = assets.find((asset) => asset._id === selectedAssetId);
    const visibleAssets = assets.filter((asset) =>
        matchesThumbnailAssetSearch(asset, searchQuery),
    );

    return (
        <div>
            <span className="mb-1 block text-[10px] font-semibold text-muted">
                Thumbnail Library asset
            </span>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex w-full items-center justify-between border border-main bg-main px-3 py-2 text-left text-[12px] text-main"
            >
                <span className="truncate">
                    {selectedAsset?.metadata?.title?.trim() ||
                        selectedAsset?._id ||
                        "Select existing thumbnail"}
                </span>
                <span className="ml-2 text-[11px] text-muted">
                    {isOpen ? "Close" : "Browse"}
                </span>
            </button>
            {isOpen ? (
                <div className="mt-2 max-h-64 overflow-y-auto border border-main bg-main">
                    <div className="border-b border-main p-2">
                        <input
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            placeholder="Search title, folder, tags..."
                            className="w-full border border-main bg-main px-2 py-1 text-[11px] text-main outline-none transition-colors focus:border-accent"
                        />
                    </div>
                    {visibleAssets.length === 0 ? (
                        <p className="px-3 py-4 text-[11px] text-muted">
                            No matching thumbnail.
                        </p>
                    ) : (
                        <div className="space-y-2 p-2">
                            {visibleAssets.map((asset) => {
                                const isSelected =
                                    selectedAssetId === asset._id;
                                return (
                                    <button
                                        key={asset._id}
                                        type="button"
                                        onClick={() => {
                                            onSelect(asset._id);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full border p-2 text-left",
                                            isSelected
                                                ? "border-accent bg-secondary/35"
                                                : "border-main bg-main hover:bg-secondary/20",
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            <div className="h-14 w-24 shrink-0 overflow-hidden border border-main bg-secondary/20">
                                                <img
                                                    src={`/api/storage/thumbnail-assets/${asset._id}/download?disposition=inline`}
                                                    alt={
                                                        asset.metadata?.title?.trim() ||
                                                        "Thumbnail preview"
                                                    }
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[12px] font-semibold text-main">
                                                    {asset.metadata?.title?.trim() ||
                                                        "Untitled thumbnail"}
                                                </p>
                                                <p className="mt-1 truncate text-[10px] text-muted">
                                                    {[
                                                        asset.metadata?.folder?.trim() ||
                                                            null,
                                                        ...(asset.metadata?.tags ??
                                                            []),
                                                        asset.storageProvider ||
                                                            null,
                                                        asset.createdAt
                                                            ? new Date(
                                                                  asset.createdAt,
                                                              ).toLocaleDateString(
                                                                  "vi-VN",
                                                              )
                                                            : null,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" · ") ||
                                                        asset._id}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    );
}
