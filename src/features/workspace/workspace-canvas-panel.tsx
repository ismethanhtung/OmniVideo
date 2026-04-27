"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import {
    CheckCircle2,
    GitBranch,
    Layers,
    Link2,
    Send,
    Plus,
    Captions,
    Trash2,
    UploadCloud,
    Workflow,
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
    createDouyinReworkSampleGraph,
    createEmptyWorkspaceGraph,
    createAssetToSocialSampleGraph,
    createUploadToStorageSampleGraph,
    createUploadToSocialSampleGraph,
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
    DEFAULT_TRANSLATION_MODEL,
    GROQ_TRANSLATION_MODELS,
    type ChineseTranscriptionResult,
    type TranscriptTranslationResult,
} from "@/lib/multilingual-audio/types";

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

type WorkspaceAsset = {
    _id: string;
    storageProvider: string;
    providerAssetId?: string | null;
    metadata?: {
        title?: string | null;
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
                const [storageResponse, socialResponse, assetsResponse] =
                    await Promise.all([
                        fetch("/api/storage/providers"),
                        fetch("/api/social/accounts"),
                        fetch("/api/storage/assets?limit=100"),
                    ]);
                const [storagePayload, socialPayload, assetsPayload] =
                    await Promise.all([
                        storageResponse.json(),
                        socialResponse.json(),
                        assetsResponse.json(),
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

                setStorageAccounts(activeStorageAccounts);
                setSocialAccounts(connectedSocialAccounts);
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

    const resetRunState = (nextGraph?: WorkspaceGraph, clearFiles = false) => {
        setRunError(null);
        setRunResult(null);
        if (clearFiles) {
            setRuntimeFilesByNodeId({});
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

    const seedSample = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        const next = createDouyinReworkSampleGraph();
        setGraph(next);
        resetRunState(next, true);
    };

    const seedExecutableFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        const next = createUploadToSocialSampleGraph();
        setGraph(next);
        resetRunState(next, true);
    };

    const seedUploadOnlyFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        const next = createUploadToStorageSampleGraph();
        setGraph(next);
        resetRunState(next, true);
    };

    const seedAssetPublishFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        const next = createAssetToSocialSampleGraph();
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

    const runWorkspaceFlow = async () => {
        const plan = planWorkspaceFlow(graph);
        if (!plan.ok) {
            setRunError(plan.errors.join("\n"));
            return;
        }
        if (plan.steps.length === 0) {
            setRunError("Plan rỗng. Hãy thêm nodes vào graph.");
            return;
        }

        const initialStatus: Record<string, NodeRunState> = {};
        for (const node of graph.nodes) {
            initialStatus[node.id] = { status: "idle", detail: "" };
        }
        setNodeRunStatus(initialStatus);
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

        const assetByProducer: Record<string, string> = {};
        const transcriptByProducer: Record<string, ChineseTranscriptionResult> =
            {};
        let stepIndex = 0;
        let completedPublishes = 0;
        let failedPublishes = 0;
        const summary: string[] = [];

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

        let abortRemaining = false;

        for (const step of plan.steps) {
            if (step.kind === "publish") {
                // publishes can fail individually without aborting siblings
            } else if (abortRemaining) {
                continue;
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
                    formData.set("contentIntent", "other");
                    formData.set("ownershipStatus", "unknown");

                    const uploadResponse = await fetch(
                        "/api/video-intake/local-runs",
                        { method: "POST", body: formData },
                    );
                    const uploadPayload = await uploadResponse.json();

                    if (!uploadPayload.ok || !uploadPayload.data?.assetId) {
                        const reason =
                            uploadPayload.error ??
                            uploadPayload.errorCode ??
                            "Workspace upload step failed.";
                        setNodeStatus(fileNode.id, "failed", reason);
                        setNodeStatus(storageNode.id, "failed", reason);
                        throw new Error(reason);
                    }

                    const newAssetId = uploadPayload.data.assetId as string;
                    assetByProducer[step.producerNodeId] = newAssetId;
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
                } else if (step.kind === "transcribe-chinese") {
                    const fileNode = findNode(step.sourceFileNodeId);
                    const transcriptionNode = findNode(
                        step.transcriptionNodeId,
                    );
                    if (!fileNode || !transcriptionNode) {
                        throw new Error("Missing transcription nodes.");
                    }

                    const file = runtimeFilesByNodeId[fileNode.id];
                    if (!file) {
                        setNodeStatus(
                            fileNode.id,
                            "failed",
                            "Chưa chọn file video.",
                        );
                        setNodeStatus(
                            transcriptionNode.id,
                            "skipped",
                            "Chưa có file để transcribe.",
                        );
                        throw new Error(
                            `Upload Video '${fileNode.label}' chưa chọn file.`,
                        );
                    }

                    setNodeStatus(
                        fileNode.id,
                        "running",
                        `Preparing ${file.name}...`,
                    );
                    setNodeStatus(
                        transcriptionNode.id,
                        "running",
                        "Extracting audio and calling Groq...",
                    );

                    const formData = new FormData();
                    formData.set("videoFile", file);
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

                    const transcriptionResponse = await fetch(
                        "/api/audio/chinese-transcription",
                        { method: "POST", body: formData },
                    );
                    const transcriptionPayload =
                        (await transcriptionResponse.json()) as
                            | {
                                  ok: true;
                                  data: ChineseTranscriptionResult;
                              }
                            | {
                                  ok: false;
                                  errorCode?: string;
                                  error?: string;
                              };

                    if (!transcriptionPayload.ok) {
                        const reason =
                            transcriptionPayload.error ??
                            transcriptionPayload.errorCode ??
                            "Workspace transcription step failed.";
                        setNodeStatus(transcriptionNode.id, "failed", reason);
                        throw new Error(reason);
                    }

                    transcriptByProducer[step.transcriptionNodeId] =
                        transcriptionPayload.data;
                    setNodeStatus(fileNode.id, "success", file.name);
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

                    setNodeStatus(
                        translationNode.id,
                        "running",
                        "Translating transcript segments with Groq...",
                    );

                    const translationResponse = await fetch(
                        "/api/audio/transcript-translation",
                        {
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
                            }),
                        },
                    );
                    const translationPayload =
                        (await translationResponse.json()) as
                            | {
                                  ok: true;
                                  data: TranscriptTranslationResult;
                              }
                            | {
                                  ok: false;
                                  errorCode?: string;
                                  error?: string;
                              };

                    if (!translationPayload.ok) {
                        const reason =
                            translationPayload.error ??
                            translationPayload.errorCode ??
                            "Workspace translation step failed.";
                        setNodeStatus(translationNode.id, "failed", reason);
                        throw new Error(reason);
                    }

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

                    setNodeStatus(
                        publishNode.id,
                        "running",
                        `Publishing via ${socialAccount.label} (${publishType})...`,
                    );

                    const publishResponse = await fetch(
                        "/api/social/publish-records",
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                assetId,
                                socialAccountId: socialAccount._id,
                                publishType,
                                facebookPageId: facebookPageId || undefined,
                                publishNow: true,
                                privacyStatus,
                                title: titleOverride || undefined,
                                caption: captionRaw || undefined,
                                hashtags,
                            }),
                        },
                    );
                    const publishPayload = await publishResponse.json();

                    if (!publishPayload.ok) {
                        const reason =
                            publishPayload.error ??
                            publishPayload.errorCode ??
                            "Workspace publish step failed.";
                        setNodeStatus(publishNode.id, "failed", reason);
                        failedPublishes += 1;
                        advanceProgress(
                            `Publish ${publishNode.label} failed: ${reason}.`,
                        );
                        continue;
                    }

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
                    step.kind === "translate-transcript"
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
                <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={seedSample}
                        className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary"
                    >
                        <GitBranch className="h-3.5 w-3.5" />
                        Seed Douyin Flow
                    </button>
                    <button
                        type="button"
                        onClick={seedExecutableFlow}
                        className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary"
                    >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Seed Upload Social
                    </button>
                    <button
                        type="button"
                        onClick={seedUploadOnlyFlow}
                        className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary"
                    >
                        <UploadCloud className="h-3.5 w-3.5" />
                        Seed Upload Only
                    </button>
                    <button
                        type="button"
                        onClick={seedAssetPublishFlow}
                        className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary"
                    >
                        <Send className="h-3.5 w-3.5" />
                        Seed Asset Publish
                    </button>
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
                        onRun={runWorkspaceFlow}
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
                    node={selectedNode}
                    template={selectedTemplate}
                    pendingSourceNodeId={pendingSourceNodeId}
                    validation={validation}
                    flowPlan={flowPlan}
                    storageAccounts={storageAccounts}
                    socialAccounts={socialAccounts}
                    storageAssets={storageAssets}
                    runtimeFile={
                        selectedNode
                            ? (runtimeFilesByNodeId[selectedNode.id] ?? null)
                            : null
                    }
                    facebookPagesByAccount={facebookPagesByAccount}
                    loadingFacebookAccountIds={loadingFacebookAccountIds}
                    isRunningFlow={isRunningFlow}
                    onSetPendingSource={(nodeId) =>
                        setPendingSourceNodeId(nodeId)
                    }
                    onCancelPendingSource={() => setPendingSourceNodeId(null)}
                    onDeleteSelected={deleteSelectedNode}
                    onUpdateNodeConfig={updateNodeConfig}
                    onUpdateNodeFile={setNodeFile}
                    onEnsureFacebookPages={ensureFacebookPages}
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
    onRun,
    onClear,
}: {
    accountsError: string | null;
    flowPlan: WorkspaceFlowPlan;
    nodes: WorkspaceNodeInstance[];
    nodeRunStatus: Record<string, NodeRunState>;
    isRunningFlow: boolean;
    runError: string | null;
    runResult: string | null;
    onRun: () => void;
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
                        flow. Mỗi Publish Social node giữ social account/publish
                        type/Page riêng.
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
                            <Workflow className="h-3.5 w-3.5" />
                            {isRunningFlow
                                ? "Running Flow..."
                                : "Run Workspace Flow"}
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
    if (step.kind === "transcribe-chinese") {
        return {
            key: `transcribe-${step.transcriptionNodeId}`,
            statusKey: step.transcriptionNodeId,
            label: `Transcript · ${findLabel(step.sourceFileNodeId)} → ${findLabel(step.transcriptionNodeId)}`,
            subtitle: "Extract audio and transcribe timestamps",
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
    return {
        key: `publish-${step.publishNodeId}`,
        statusKey: step.publishNodeId,
        label: `Publish · ${findLabel(step.publishNodeId)}`,
        subtitle: `Publish from ${findLabel(step.producerNodeId)}`,
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
    storageAccounts,
    socialAccounts,
    storageAssets,
    runtimeFile,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    isRunningFlow,
    onUpdateNodeConfig,
    onUpdateNodeFile,
    onEnsureFacebookPages,
}: {
    node: WorkspaceNodeInstance;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    storageAssets: WorkspaceAsset[];
    runtimeFile: File | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    isRunningFlow: boolean;
    onUpdateNodeConfig: (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => void;
    onUpdateNodeFile: (nodeId: string, file: File | null) => void;
    onEnsureFacebookPages: (accountId: string) => Promise<FacebookPagesResult>;
}) {
    const setConfig = (patch: WorkspaceNodeInstance["config"]) =>
        onUpdateNodeConfig(node.id, patch);

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
                        value={getStringConfig(node, "title")}
                        disabled={isRunningFlow}
                        placeholder="Optional title override"
                        onChange={(value) => setConfig({ title: value })}
                    />
                    <RuntimeTextInput
                        label="Caption"
                        value={getStringConfig(node, "caption")}
                        disabled={isRunningFlow}
                        placeholder="Optional publish caption"
                        onChange={(value) => setConfig({ caption: value })}
                    />
                    <RuntimeTextInput
                        label="Hashtags"
                        value={getStringConfig(node, "hashtags")}
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
                        <option value="zh">Chinese (zh)</option>
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
                        placeholder="Names, terms, Chinese context..."
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

    if (node.templateNodeType === "text.translate-transcript") {
        return (
            <InspectorSection title="Runtime Config">
                <div className="space-y-2 border border-main bg-secondary/20 p-2">
                    <RuntimeSelect
                        label="Groq model"
                        value={getStringConfig(
                            node,
                            "model",
                            DEFAULT_TRANSLATION_MODEL,
                        )}
                        disabled={isRunningFlow}
                        onChange={(value) => setConfig({ model: value })}
                    >
                        {GROQ_TRANSLATION_MODELS.map((model) => (
                            <option key={model.id} value={model.id}>
                                {model.label}
                            </option>
                        ))}
                    </RuntimeSelect>
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
                        <option value="zh">Chinese (zh)</option>
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

    return null;
}

function InspectorPanel({
    node,
    template,
    pendingSourceNodeId,
    validation,
    flowPlan,
    storageAccounts,
    socialAccounts,
    storageAssets,
    runtimeFile,
    facebookPagesByAccount,
    loadingFacebookAccountIds,
    isRunningFlow,
    onSetPendingSource,
    onCancelPendingSource,
    onDeleteSelected,
    onUpdateNodeConfig,
    onUpdateNodeFile,
    onEnsureFacebookPages,
}: {
    node: WorkspaceNodeInstance | undefined;
    template: WorkspaceNodeTemplate | undefined;
    pendingSourceNodeId: string | null;
    validation: { ok: boolean; errors: string[] };
    flowPlan: WorkspaceFlowPlan;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    storageAssets: WorkspaceAsset[];
    runtimeFile: File | null;
    facebookPagesByAccount: Record<string, FacebookPageOption[]>;
    loadingFacebookAccountIds: Record<string, boolean>;
    isRunningFlow: boolean;
    onSetPendingSource: (nodeId: string) => void;
    onCancelPendingSource: () => void;
    onDeleteSelected: () => void;
    onUpdateNodeConfig: (
        nodeId: string,
        patch: WorkspaceNodeInstance["config"],
    ) => void;
    onUpdateNodeFile: (nodeId: string, file: File | null) => void;
    onEnsureFacebookPages: (accountId: string) => Promise<FacebookPagesResult>;
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
                <div className="mt-3 border border-dashed border-main bg-secondary/30 px-3 py-3">
                    <p className="text-[12px] font-medium text-main">
                        Select a node
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-muted">
                        Node contract, ports, config fields and traceability
                        notes will appear here.
                    </p>
                </div>
            ) : (
                <div className="mt-3 space-y-4">
                    <div>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate text-[14px] font-semibold text-main">
                                    {node.label}
                                </p>
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
                        storageAccounts={storageAccounts}
                        socialAccounts={socialAccounts}
                        storageAssets={storageAssets}
                        runtimeFile={runtimeFile}
                        facebookPagesByAccount={facebookPagesByAccount}
                        loadingFacebookAccountIds={loadingFacebookAccountIds}
                        isRunningFlow={isRunningFlow}
                        onUpdateNodeConfig={onUpdateNodeConfig}
                        onUpdateNodeFile={onUpdateNodeFile}
                        onEnsureFacebookPages={onEnsureFacebookPages}
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
