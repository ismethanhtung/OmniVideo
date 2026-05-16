"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import {
    Layers,
    Link2,
    Plus,
    Captions,
    Info,
    Trash2,
    Volume2,
    Workflow,
    Play,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";
import {
    fetchFacebookPagesForAccount,
    type FacebookPageOption,
} from "@/lib/social/facebook-pages-client";
import {
    WORKSPACE_DRAFT_STORAGE_KEY,
    WORKSPACE_NODE_TEMPLATES,
    addWorkspaceNode,
    connectWorkspaceNodes,
    createEmptyWorkspaceGraph,
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
import { buildWordAwareVoiceSegments } from "@/lib/multilingual-audio/voice-segment-timing";

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
        } | null;
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
    fileName: string;
    mimeType: string;
    base64?: string;
    file?: File;
    objectUrl?: string;
    byteLength: number;
    kind: "audio" | "video";
    detail: string;
};

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
};

const CATEGORY_ORDER: WorkspaceNodeCategory[] = [
    "input",
    "processing",
    "output",
];
const CANVAS_WIDTH = 2400;
const CANVAS_HEIGHT = 1400;
const NODE_WIDTH = 192;
const NODE_HEIGHT_OFFSET = 44;

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

function artifactDataUrl(artifact: WorkspaceRuntimeArtifact) {
    if (artifact.objectUrl) return artifact.objectUrl;
    if (!artifact.base64) return "";
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
            `Runtime artifact '${artifact.fileName}' không có file/base64 để upload.`,
        );
    }
    const binary = atob(artifact.base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return new File([bytes], artifact.fileName, { type: artifact.mimeType });
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
        throw new Error(
            `${input.actionLabel} failed at ${input.url}: ${getWorkspaceApiErrorMessage(
                payload,
                "Unexpected API error.",
                response.status,
            )}`,
        );
    }

    return payload as T;
}

async function fetchWorkspaceFile(input: {
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

    const blob = await response.blob();
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
    const [canvasView, setCanvasView] = useState({ x: 32, y: 32, scale: 0.88 });
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
            if (step.kind === "mirror-video") {
                return Boolean(runtimeArtifactsByNodeId[step.mirrorNodeId]);
            }
            if (step.kind === "edit-video") {
                return Boolean(runtimeArtifactsByNodeId[step.editNodeId]);
            }
            if (step.kind === "store-artifact") {
                return Boolean(runtimeAssetIdsByNodeId[step.producerNodeId]);
            }
            return false;
        });
    }, [
        flowPlan,
        runtimeArtifactsByNodeId,
        runtimeAssetIdsByNodeId,
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
        setGraph(
            parseWorkspaceDraft(
                window.localStorage.getItem(WORKSPACE_DRAFT_STORAGE_KEY),
            ),
        );
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
        let isActive = true;

        async function loadRuntimeAccounts() {
            try {
                const [
                    storageResponse,
                    socialResponse,
                    assetsResponse,
                    aiProvidersResponse,
                ] = await Promise.all([
                    fetch("/api/storage/providers"),
                    fetch("/api/social/accounts"),
                    fetch("/api/storage/assets?limit=100"),
                    fetch("/api/ai-providers"),
                ]);
                const [
                    storagePayload,
                    socialPayload,
                    assetsPayload,
                    aiProvidersPayload,
                ] = await Promise.all([
                    storageResponse.json(),
                    socialResponse.json(),
                    assetsResponse.json(),
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
        setPendingSourceNodeId(null);
        setConnectionError(null);
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
        const progressTaskId = startProgressTask({
            title: "Workspace flow",
            scope: "system",
            description: `Running ${totalSteps} step(s)...`,
            progress: 0,
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
        let stepIndex = 0;
        let completedPublishes = 0;
        let failedPublishes = 0;
        const summary: string[] = [];
        const resolvedUrlFilesByNodeId: Record<string, File> = {};

        const advanceProgress = (description: string) => {
            stepIndex += 1;
            updateProgressTask(progressTaskId, {
                progress: Math.min(
                    95,
                    Math.round((stepIndex / totalSteps) * 95),
                ),
                description,
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
            } else if (step.kind === "mirror-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.mirrorNodeId, "success", detail);
            } else if (step.kind === "edit-video") {
                setNodeStatus(step.sourceNodeId, "success", detail);
                setNodeStatus(step.translationNodeId, "success", detail);
                setNodeStatus(step.editNodeId, "success", detail);
            } else if (step.kind === "store-artifact") {
                setNodeStatus(step.storageNodeId, "success", detail);
            }
        };

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
            formData.set("videoFile", base64ToFile(upstreamArtifact));
            return {
                detail: upstreamArtifact.fileName,
                sourceStatus: "Video artifact used.",
            };
        };

        let abortRemaining = false;

        for (const step of plan.steps) {
            if (step.kind === "publish") {
                // publishes can fail individually without aborting siblings
            } else if (abortRemaining) {
                continue;
            }

            if (mode === "resume") {
                const checkpoint = getResumeCheckpoint(step);
                if (checkpoint) {
                    markResumeCheckpoint(step, checkpoint);
                    advanceProgress(checkpoint);
                    continue;
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

                    const formData = new FormData();
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `Video Preprocess '${preprocessNode.label}'`,
                    });
                    formData.set(
                        "videoSpeedFactor",
                        String(getNumberConfig(preprocessNode, "speedFactor", 0.7)),
                    );
                    setNodeStatus(
                        preprocessNode.id,
                        "running",
                        "Preprocessing video speed with ffmpeg...",
                    );
                    const preprocessPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: {
                            fileName: string;
                            mimeType: string;
                            videoBase64: string;
                            byteLength: number;
                            speedFactor: number;
                        };
                    }>({
                        url: "/api/audio/video-preprocess",
                        actionLabel: "Video preprocess",
                        init: { method: "POST", body: formData },
                    });
                    const artifact: WorkspaceRuntimeArtifact = {
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
                    setNodeStatus(sourceNode.id, "success", source.sourceStatus);
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

                    setNodeStatus(
                        translationNode.id,
                        "running",
                        "Translating transcript segments with Groq...",
                    );

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
                                providerId: translationProviderId || undefined,
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
                                    ).trim() || undefined,
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
                    if (translationProviderId) {
                        formData.set("providerId", translationProviderId);
                    }
                    formData.set(
                        "originalAudioVolume",
                        String(
                            getNumberConfig(
                                dubbingNode,
                                "originalAudioVolume",
                                0.18,
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
                    formData.set(
                        "ttsAlignmentMode",
                        getStringConfig(
                            dubbingNode,
                            "ttsAlignmentMode",
                            DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
                        ),
                    );
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
                    const dubbingPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: VideoDubbingResult;
                    }>({
                        url: "/api/audio/video-dubbing",
                        actionLabel: "Video dubbing",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
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
                        `${formatBytes(dubbingPayload.data.byteLength)} MP4.`,
                    );
                    summary.push(
                        `Dubbed video ready: ${formatBytes(dubbingPayload.data.byteLength)}.`,
                    );
                    advanceProgress(`Dubbing ${dubbingNode.label} complete.`);
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
                    const mirrorPayload = await fetchWorkspaceJson<{
                        ok: true;
                        data: {
                            videoBase64: string;
                            mimeType: "video/mp4";
                            fileName: string;
                            byteLength: number;
                            transform: { axis: "horizontal"; filter: "hflip" };
                        };
                    }>({
                        url: "/api/video-processing/mirror",
                        actionLabel: "Mirror video",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
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
                    const source = await appendWorkspaceVideoInput({
                        formData,
                        sourceNode,
                        consumerLabel: `Mask Logo/Subtitles '${editNode.label}'`,
                    });

                    formData.set(
                        "mirrorEnabled",
                        String(
                            getBooleanConfig(editNode, "mirrorEnabled", false),
                        ),
                    );
                    formData.set("blurEnabled", "true");
                    formData.set("subtitleOverlayEnabled", "true");
                    const sourceAssetSetup =
                        sourceNode.templateNodeType === "source.asset"
                            ? (storageAssets.find(
                                  (item) =>
                                      item._id ===
                                      getStringConfig(sourceNode, "assetId"),
                              )?.metadata?.videoEditSetup ?? null)
                            : null;
                    const blurRegionsJson = getStringConfig(
                        editNode,
                        "blurRegionsJson",
                    ).trim();
                    const setupBlurRegionsJson =
                        sourceAssetSetup?.blurRegions &&
                        sourceAssetSetup.blurRegions.length > 0
                            ? JSON.stringify(sourceAssetSetup.blurRegions)
                            : "";
                    if (blurRegionsJson) {
                        formData.set("blurRegionsJson", blurRegionsJson);
                    } else if (setupBlurRegionsJson) {
                        formData.set("blurRegionsJson", setupBlurRegionsJson);
                    } else {
                        formData.set(
                            "regionX",
                            String(getNumberConfig(editNode, "regionX", 0)),
                        );
                        formData.set(
                            "regionY",
                            String(getNumberConfig(editNode, "regionY", 84)),
                        );
                        formData.set(
                            "regionWidth",
                            String(
                                getNumberConfig(editNode, "regionWidth", 100),
                            ),
                        );
                        formData.set(
                            "regionHeight",
                            String(
                                getNumberConfig(editNode, "regionHeight", 16),
                            ),
                        );
                        formData.set(
                            "timelineStart",
                            String(
                                getNumberConfig(editNode, "timelineStart", 0),
                            ),
                        );
                        formData.set(
                            "timelineEnd",
                            String(
                                getNumberConfig(editNode, "timelineEnd", 36000),
                            ),
                        );
                        formData.set(
                            "blurStrength",
                            String(
                                getNumberConfig(editNode, "blurStrength", 50),
                            ),
                        );
                    }
                    formData.set(
                        "subtitleFontFamily",
                        getStringConfig(
                            editNode,
                            "subtitleFontFamily",
                            sourceAssetSetup?.subtitleFontFamily ?? "Arial",
                        ),
                    );
                    formData.set(
                        "subtitleFontSize",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleFontSize",
                                sourceAssetSetup?.subtitleFontSize ?? 55,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleMarginBottom",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleMarginBottom",
                                sourceAssetSetup?.subtitleMarginBottom ?? 150,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleMarginLeft",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleMarginLeft",
                                sourceAssetSetup?.subtitleMarginLeft ?? 60,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleMarginRight",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleMarginRight",
                                sourceAssetSetup?.subtitleMarginRight ?? 60,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleAlignment",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleAlignment",
                                sourceAssetSetup?.subtitleAlignment ?? 2,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleBackgroundEnabled",
                        String(
                            getBooleanConfig(
                                editNode,
                                "subtitleBackgroundEnabled",
                                sourceAssetSetup?.subtitleBackgroundEnabled ??
                                    true,
                            ),
                        ),
                    );
                    formData.set(
                        "subtitleBackgroundColor",
                        getStringConfig(
                            editNode,
                            "subtitleBackgroundColor",
                            sourceAssetSetup?.subtitleBackgroundColor ??
                                "#000000",
                        ),
                    );
                    formData.set(
                        "subtitleBackgroundOpacity",
                        String(
                            getNumberConfig(
                                editNode,
                                "subtitleBackgroundOpacity",
                                sourceAssetSetup?.subtitleBackgroundOpacity ??
                                    65,
                            ),
                        ),
                    );
                    formData.set(
                        "translatedSegmentsJson",
                        JSON.stringify(translation.translatedSegments),
                    );
                    formData.set("responseMode", "binary");

                    setNodeStatus(
                        editNode.id,
                        "running",
                        "Blurring region and burning Vietnamese subtitles...",
                    );
                    const editFile = await fetchWorkspaceFile({
                        url: "/api/video-processing/edit",
                        actionLabel: "Video edit",
                        init: { method: "POST", body: formData },
                    });

                    const artifact: WorkspaceRuntimeArtifact = {
                        fileName: editFile.fileName,
                        mimeType: editFile.mimeType,
                        file: editFile.file,
                        objectUrl: editFile.objectUrl,
                        byteLength: editFile.byteLength,
                        kind: "video",
                        detail: `Blur + subtitles (${translation.translatedSegments.length} segment(s))`,
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
                        `${formatBytes(editFile.byteLength)} MP4.`,
                    );
                    summary.push(
                        `Edited video ready: ${formatBytes(editFile.byteLength)}.`,
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
                    const uploadForm = new FormData();
                    uploadForm.set("videoFile", base64ToFile(artifact));
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
                    uploadForm.set(
                        "tags",
                        artifactNode.templateNodeType === "edit.mirror"
                            ? "workspace,mirror"
                            : "workspace,dubbing",
                    );
                    uploadForm.set("title", artifact.fileName);
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
                    setNodeStatus(
                        storageNode.id,
                        "success",
                        `Asset ${newAssetId}.`,
                    );
                    summary.push(`Stored generated asset ${newAssetId}.`);
                    advanceProgress(`Stored generated asset ${newAssetId}.`);
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
                    const hashtagsRaw = getStringConfig(
                        publishNode,
                        "hashtags",
                    );
                    const hashtags = hashtagsRaw
                        ? parseCommaList(hashtagsRaw)
                        : undefined;
                    const fallbackMetadata = Object.values(
                        vietnameseMetadataByNodeId,
                    )[0];

                    setNodeStatus(
                        publishNode.id,
                        "running",
                        `Publishing via ${socialAccount.label} (${publishType})...`,
                    );

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
                        advanceProgress(
                            `Publish ${publishNode.label} status ${
                                finalStatus ?? "unknown"
                            }.`,
                        );
                    }
                }
            } catch (error) {
                const message =
                    error instanceof Error
                        ? error.message
                        : "Workspace step failed.";
                if (
                    step.kind === "use-existing-asset" ||
                    step.kind === "upload-and-store" ||
                    step.kind === "transcribe-chinese" ||
                    step.kind === "translate-transcript" ||
                    step.kind === "generate-vi-metadata" ||
                    step.kind === "generate-voice" ||
                    step.kind === "dub-video" ||
                    step.kind === "mirror-video" ||
                    step.kind === "edit-video" ||
                    step.kind === "store-artifact"
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
                        onRun={() => runWorkspaceFlow("fresh")}
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
                            className="absolute left-0 top-0"
                            style={{
                                width: CANVAS_WIDTH,
                                height: CANVAS_HEIGHT,
                                transform: `translate(${canvasView.x}px, ${canvasView.y}px) scale(${canvasView.scale})`,
                                transformOrigin: "0 0",
                            }}
                        >
                            <svg
                                className="pointer-events-none absolute inset-0 h-full w-full"
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

                                    return (
                                        <path
                                            key={edge.id}
                                            d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                                            fill="none"
                                            stroke="var(--color-accent)"
                                            strokeOpacity="0.55"
                                            strokeWidth={2 / canvasView.scale}
                                        />
                                    );
                                })}
                            </svg>

                            {graph.nodes.length === 0 ? (
                                <div className="absolute left-8 top-8 max-w-md border border-dashed border-main bg-main px-4 py-3">
                                    <p className="text-[12px] font-semibold text-main">
                                        Workspace draft is empty
                                    </p>
                                    <p className="mt-1 text-[11px] leading-5 text-muted">
                                        Add nodes from the catalog or seed a
                                        sample flow to start shaping the
                                        pipeline. Bạn có thể nối tự do, ví dụ
                                        Upload → Storage → 2 Publish Social khác
                                        platform.
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
                                    onSelect={() => selectNode(node.id)}
                                    onConnect={() =>
                                        connectFromPending(node.id)
                                    }
                                    onDragStart={(event) =>
                                        startNodeDrag(event, node)
                                    }
                                    onDragMove={handleNodeDrag}
                                    onDragEnd={endNodeDrag}
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
        </section>
    );
}

function CanvasNode({
    node,
    runState,
    isSelected,
    isPendingSource,
    canConnect,
    onSelect,
    onConnect,
    onDragStart,
    onDragMove,
    onDragEnd,
}: {
    node: WorkspaceNodeInstance;
    runState: NodeRunState | undefined;
    isSelected: boolean;
    isPendingSource: boolean;
    canConnect: boolean;
    onSelect: () => void;
    onConnect: () => void;
    onDragStart: (event: PointerEvent<HTMLButtonElement>) => void;
    onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
    onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
}) {
    const template = getWorkspaceNodeTemplate(node.templateNodeType);
    const status = runState?.status ?? "idle";

    return (
        <button
            type="button"
            onClick={canConnect ? onConnect : onSelect}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            className={cn(
                "absolute w-48 cursor-move touch-none border border-l-2 bg-main px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md",
                template ? templateAccent(template.category) : "border-l-muted",
                isSelected && "ring-2 ring-accent/40",
                isPendingSource && "ring-2 ring-emerald-500/40",
            )}
            style={{ left: node.position.x, top: node.position.y }}
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
                            <Play className="h-3.5 w-3.5" />
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

function NodeRuntimeConfig({
    node,
    graph,
    storageAccounts,
    socialAccounts,
    aiProviders,
    aiModelsByProviderId,
    storageAssets,
    runtimeFile,
    runtimeArtifact,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    loadingAiModelProviderIds,
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
    runtimeFile: File | null;
    runtimeArtifact: WorkspaceRuntimeArtifact | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    loadingAiModelProviderIds: Record<string, boolean>;
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

    const findUpstreamSourceAsset = (targetNodeId: string) => {
        const visited = new Set<string>();
        const stack = graph.edges
            .filter((edge) => edge.toNodeId === targetNodeId)
            .map((edge) => edge.fromNodeId);
        while (stack.length > 0) {
            const current = stack.pop() as string;
            if (visited.has(current)) continue;
            visited.add(current);
            const currentNode = graph.nodes.find(
                (entry) => entry.id === current,
            );
            if (!currentNode) continue;
            if (currentNode.templateNodeType === "source.asset") {
                return currentNode;
            }
            for (const edge of graph.edges) {
                if (edge.toNodeId === currentNode.id) {
                    stack.push(edge.fromNodeId);
                }
            }
        }
        return null;
    };

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
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Storage Library asset"
                        value={getStringConfig(node, "assetId")}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ assetId: value })}
                    >
                        <option value="">Select existing video</option>
                        {storageAssets.map((asset) => (
                            <option key={asset._id} value={asset._id}>
                                {asset.metadata?.title ??
                                    asset.providerAssetId ??
                                    asset._id}{" "}
                                ({asset.storageProvider})
                            </option>
                        ))}
                    </RuntimeSelect>
                </div>
            </InspectorSection>
        );
    }

    if (node.templateNodeType === "edit.mask-region") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                        <span>
                            <span className="block text-[11px] font-semibold text-main">
                                Mirror before blur
                            </span>
                            <span className="block text-[10px] text-muted">
                                Kết hợp hflip trong cùng edit request.
                            </span>
                        </span>
                        <input
                            type="checkbox"
                            checked={getBooleanConfig(
                                node,
                                "mirrorEnabled",
                                false,
                            )}
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
                                value={getStringConfig(node, "blurRegionsJson")}
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
                            value={String(getNumberConfig(node, "regionX", 0))}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ regionX: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region Y %"
                            value={String(getNumberConfig(node, "regionY", 84))}
                            disabled={isRunningFlow}
                            placeholder="84"
                            onChange={(value) =>
                                setConfig({ regionY: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region width %"
                            value={String(
                                getNumberConfig(node, "regionWidth", 100),
                            )}
                            disabled={isRunningFlow}
                            placeholder="100"
                            onChange={(value) =>
                                setConfig({ regionWidth: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Region height %"
                            value={String(
                                getNumberConfig(node, "regionHeight", 16),
                            )}
                            disabled={isRunningFlow}
                            placeholder="16"
                            onChange={(value) =>
                                setConfig({ regionHeight: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Start seconds"
                            value={String(
                                getNumberConfig(node, "timelineStart", 0),
                            )}
                            disabled={isRunningFlow}
                            placeholder="0"
                            onChange={(value) =>
                                setConfig({ timelineStart: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="End seconds"
                            value={String(
                                getNumberConfig(node, "timelineEnd", 36000),
                            )}
                            disabled={isRunningFlow}
                            placeholder="36000"
                            onChange={(value) =>
                                setConfig({ timelineEnd: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Blur strength"
                            value={String(
                                getNumberConfig(node, "blurStrength", 50),
                            )}
                            disabled={isRunningFlow}
                            placeholder="18"
                            onChange={(value) =>
                                setConfig({ blurStrength: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle font"
                            value={getStringConfig(
                                node,
                                "subtitleFontFamily",
                                "Arial",
                            )}
                            disabled={isRunningFlow}
                            placeholder="Arial"
                            onChange={(value) =>
                                setConfig({ subtitleFontFamily: value })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle size"
                            value={String(
                                getNumberConfig(node, "subtitleFontSize", 55),
                            )}
                            disabled={isRunningFlow}
                            placeholder="100"
                            onChange={(value) =>
                                setConfig({ subtitleFontSize: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle left margin"
                            value={String(
                                getNumberConfig(node, "subtitleMarginLeft", 60),
                            )}
                            disabled={isRunningFlow}
                            placeholder="60"
                            onChange={(value) =>
                                setConfig({ subtitleMarginLeft: Number(value) })
                            }
                        />
                        <RuntimeTextInput
                            label="Subtitle right margin"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "subtitleMarginRight",
                                    60,
                                ),
                            )}
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
                            value={String(
                                getNumberConfig(node, "subtitleAlignment", 2),
                            )}
                            disabled={isRunningFlow}
                            placeholder="2"
                            onChange={(value) =>
                                setConfig({ subtitleAlignment: Number(value) })
                            }
                        />
                        <RuntimeSelect
                            label="Subtitle background color"
                            value={normalizeSubtitleBackgroundColor(
                                getStringConfig(
                                    node,
                                    "subtitleBackgroundColor",
                                    "#000000",
                                ),
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
                            value={String(
                                getNumberConfig(
                                    node,
                                    "subtitleBackgroundOpacity",
                                    65,
                                ),
                            )}
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
                                    true,
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
                        <RuntimeTextInput
                            label="Subtitle Y margin"
                            value={String(
                                getNumberConfig(
                                    node,
                                    "subtitleMarginBottom",
                                    150,
                                ),
                            )}
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
                        <div className="space-y-2 border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <p className="text-[11px] font-semibold text-emerald-700">
                                {runtimeArtifact.detail} ·{" "}
                                {formatBytes(runtimeArtifact.byteLength)}
                            </p>
                            <video
                                controls
                                src={artifactDataUrl(runtimeArtifact)}
                                className="max-h-56 w-full bg-black"
                            />
                            <a
                                href={artifactDataUrl(runtimeArtifact)}
                                download={runtimeArtifact.fileName}
                                className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                            >
                                Download {runtimeArtifact.fileName}
                            </a>
                        </div>
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

    if (node.templateNodeType === "social.publish") {
        const upstreamAssetNode = findUpstreamSourceAsset(node.id);
        const upstreamAssetId = upstreamAssetNode
            ? getStringConfig(upstreamAssetNode, "assetId")
            : "";
        const upstreamAsset = storageAssets.find(
            (asset) => asset._id === upstreamAssetId,
        );
        const metadataTitle =
            upstreamAsset?.metadata?.vietnameseTitle ??
            upstreamAsset?.metadata?.title ??
            "";
        const metadataCaption =
            upstreamAsset?.metadata?.vietnameseDescription ??
            upstreamAsset?.metadata?.description ??
            "";
        const metadataHashtags = (
            upstreamAsset?.metadata?.vietnameseHashtags ?? []
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
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeTextInput
                        label="Video speed"
                        value={String(
                            getNumberConfig(node, "speedFactor", 0.7),
                        )}
                        disabled={isRunningFlow}
                        placeholder="0.7"
                        onChange={(value) =>
                            setConfig({ speedFactor: Number(value) })
                        }
                    />
                    <p className="border border-main bg-main px-3 py-2 text-[10px] leading-4 text-muted">
                        Node này tạo video artifact mới để các bước transcript,
                        dubbing hoặc edit downstream dùng lại.
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
                                    setConfig({
                                        translationProviderId: value,
                                        model: models[0].id,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">Default (env GROQ_API_KEY)</option>
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
                            placeholder="llama-3.1-8b-instant"
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
                                    setConfig({
                                        metadataProviderId: value,
                                        model: models[0].id,
                                    });
                                }
                            }
                        }}
                    >
                        <option value="">Default (env GROQ_API_KEY)</option>
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
                            placeholder="llama-3.1-8b-instant"
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
                                            setConfig({
                                                translationProviderId: value,
                                                model: models[0].id,
                                            });
                                        }
                                    }
                                }}
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
                                    placeholder="llama-3.1-8b-instant"
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
                                            0.18,
                                        ),
                                    )}
                                    disabled={isRunningFlow}
                                    placeholder="0.18"
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
                            DEFAULT_PIPER_TTS_SETTINGS.alignmentMode,
                        )}
                        disabled={isRunningFlow}
                        onChange={(value) =>
                            setConfig({ ttsAlignmentMode: value })
                        }
                    >
                        <option value="balanced">balanced</option>
                        <option value="strict">strict</option>
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
                        <div className="space-y-2 border border-emerald-500/30 bg-emerald-500/10 p-3">
                            <p className="text-[11px] font-semibold text-emerald-700">
                                {runtimeArtifact.detail} ·{" "}
                                {formatBytes(runtimeArtifact.byteLength)}
                            </p>
                            {runtimeArtifact.kind === "audio" ? (
                                <audio
                                    controls
                                    src={artifactDataUrl(runtimeArtifact)}
                                    className="w-full"
                                />
                            ) : (
                                <video
                                    controls
                                    src={artifactDataUrl(runtimeArtifact)}
                                    className="max-h-56 w-full bg-black"
                                />
                            )}
                            <a
                                href={artifactDataUrl(runtimeArtifact)}
                                download={runtimeArtifact.fileName}
                                className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                            >
                                Download {runtimeArtifact.fileName}
                            </a>
                        </div>
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
    runtimeFile,
    runtimeArtifact,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    loadingAiModelProviderIds,
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
    runtimeFile: File | null;
    runtimeArtifact: WorkspaceRuntimeArtifact | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    loadingAiModelProviderIds: Record<string, boolean>;
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
                                        <Workflow className="h-3.5 w-3.5 text-muted" />
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
                        runtimeFile={runtimeFile}
                        runtimeArtifact={runtimeArtifact}
                        facebookPagesByAccount={facebookPagesByAccount}
                        loadingFacebookAccountIds={loadingFacebookAccountIds}
                        loadingAiModelProviderIds={loadingAiModelProviderIds}
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
