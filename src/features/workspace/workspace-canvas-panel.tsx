"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";
import {
    CheckCircle2,
    GitBranch,
    Layers,
    Link2,
    Move,
    Plus,
    Send,
    Trash2,
    UploadCloud,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";
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
    getWorkspaceExecutableUploadToSocialPlan,
    getWorkspaceNodeTemplate,
    moveWorkspaceNode,
    parseWorkspaceDraft,
    selectWorkspaceNode,
    serializeWorkspaceDraft,
    validateWorkspaceConnection,
    validateWorkspaceGraph,
    type WorkspaceExecutableUploadToSocialPlan,
    type WorkspaceGraph,
    type WorkspaceNodeCategory,
    type WorkspaceNodeInstance,
    type WorkspaceNodeTemplate,
} from "@/lib/workspace/workspace-graph";

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

type WorkspaceRunStep = {
    id: string;
    label: string;
    status: "idle" | "running" | "success" | "failed";
    detail: string;
};

const INITIAL_RUN_STEPS: WorkspaceRunStep[] = [
    {
        id: "source-file",
        label: "Upload Video",
        status: "idle",
        detail: "Waiting for file input.",
    },
    {
        id: "storage-upload",
        label: "Save to Storage",
        status: "idle",
        detail: "Waiting for upload result.",
    },
    {
        id: "social-publish",
        label: "Publish Social",
        status: "idle",
        detail: "Waiting for asset id.",
    },
];

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

function templateAccent(category: WorkspaceNodeCategory) {
    if (category === "input") {
        return "border-l-blue-500";
    }
    if (category === "output") {
        return "border-l-emerald-500";
    }

    return "border-l-violet-500";
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
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [selectedStorageAccountId, setSelectedStorageAccountId] =
        useState("");
    const [selectedSocialAccountId, setSelectedSocialAccountId] = useState("");
    const [selectedPublishType, setSelectedPublishType] =
        useState<WorkspacePublishType>("youtube_short");
    const [facebookPageId, setFacebookPageId] = useState("");
    const [privacyStatus, setPrivacyStatus] = useState<
        "private" | "unlisted" | "public"
    >("private");
    const [runTitle, setRunTitle] = useState("");
    const [runCaption, setRunCaption] = useState("");
    const [runTags, setRunTags] = useState("workspace,upload");
    const [runSteps, setRunSteps] =
        useState<WorkspaceRunStep[]>(INITIAL_RUN_STEPS);
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
    const validation = useMemo(() => validateWorkspaceGraph(graph), [graph]);
    const selectedNode = graph.nodes.find(
        (node) => node.id === graph.selectedNodeId,
    );
    const selectedTemplate = selectedNode
        ? getWorkspaceNodeTemplate(selectedNode.templateNodeType)
        : undefined;
    const executablePlan = useMemo(
        () => getWorkspaceExecutableUploadToSocialPlan(graph),
        [graph],
    );
    const selectedStorageAccount = storageAccounts.find(
        (account) => account._id === selectedStorageAccountId,
    );
    const selectedSocialAccount = socialAccounts.find(
        (account) => account._id === selectedSocialAccountId,
    );
    const publishTypesForSelectedAccount = selectedSocialAccount
        ?.supportedFormats.length
        ? selectedSocialAccount.supportedFormats
        : selectedSocialAccount
          ? [DEFAULT_PUBLISH_TYPE_BY_PLATFORM[selectedSocialAccount.platform]]
          : [];
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
        if (!hasHydratedDraft) {
            return;
        }

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

                if (!isActive) {
                    return;
                }

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
                setSelectedStorageAccountId(
                    (current) => current || activeStorageAccounts[0]?._id || "",
                );
                setSelectedSocialAccountId(
                    (current) =>
                        current || connectedSocialAccounts[0]?._id || "",
                );
                setSelectedAssetId(
                    (current) => current || assetsPayload.data?.[0]?._id || "",
                );
                setAccountsError(null);
            } catch (error) {
                if (!isActive) {
                    return;
                }
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

    useEffect(() => {
        if (!selectedSocialAccount) {
            return;
        }

        const supported = selectedSocialAccount.supportedFormats.length
            ? selectedSocialAccount.supportedFormats
            : [
                  DEFAULT_PUBLISH_TYPE_BY_PLATFORM[
                      selectedSocialAccount.platform
                  ],
              ];

        if (!supported.includes(selectedPublishType)) {
            setSelectedPublishType(supported[0]);
        }
    }, [selectedPublishType, selectedSocialAccount]);

    const addNode = (template: WorkspaceNodeTemplate) => {
        setConnectionError(null);
        setGraph((current) =>
            addWorkspaceNode(current, template, {
                x: 60 + current.nodes.length * 48,
                y: 80 + (current.nodes.length % 4) * 120,
            }),
        );
    };

    const seedSample = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setGraph(createDouyinReworkSampleGraph());
    };

    const seedExecutableFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setRunError(null);
        setRunResult(null);
        setRunSteps(INITIAL_RUN_STEPS);
        setGraph(createUploadToSocialSampleGraph());
    };

    const seedUploadOnlyFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setRunError(null);
        setRunResult(null);
        setRunSteps(INITIAL_RUN_STEPS);
        setGraph(createUploadToStorageSampleGraph());
    };

    const seedAssetPublishFlow = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setRunError(null);
        setRunResult(null);
        setRunSteps(INITIAL_RUN_STEPS);
        setGraph(createAssetToSocialSampleGraph());
    };

    const clearDraft = () => {
        setPendingSourceNodeId(null);
        setConnectionError(null);
        setGraph(createEmptyWorkspaceGraph("Workspace Draft"));
    };

    const applyCanvasZoom = (
        clientX: number,
        clientY: number,
        deltaY: number,
    ) => {
        const rect = viewportRef.current?.getBoundingClientRect();

        if (!rect) {
            return;
        }

        setCanvasView((current) => {
            const zoomDirection = deltaY < 0 ? 1 : -1;
            const nextScale = Math.min(
                1.6,
                Math.max(
                    0.45,
                    Number((current.scale + zoomDirection * 0.08).toFixed(2)),
                ),
            );

            if (nextScale === current.scale) {
                return current;
            }

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

        if (!viewport) {
            return;
        }

        const handleNativeWheel = (event: globalThis.WheelEvent) => {
            if (!event.ctrlKey) {
                return;
            }

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

    const updateRunStep = (
        stepId: string,
        status: WorkspaceRunStep["status"],
        detail: string,
    ) => {
        setRunSteps((current) =>
            current.map((step) =>
                step.id === stepId
                    ? {
                          ...step,
                          status,
                          detail,
                      }
                    : step,
            ),
        );
    };

    const parseCommaList = (value: string) =>
        value
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean);

    const runWorkspaceFlow = async () => {
        setRunError(null);
        setRunResult(null);
        setRunSteps(INITIAL_RUN_STEPS);

        if (!executablePlan.ok) {
            setRunError(
                executablePlan.error ?? "Current graph is not executable.",
            );
            return;
        }
        const requiresUpload =
            executablePlan.mode === "upload-to-storage" ||
            executablePlan.mode === "upload-to-social";
        const requiresPublish =
            executablePlan.mode === "asset-to-social" ||
            executablePlan.mode === "upload-to-social";

        if (requiresUpload && !selectedFile) {
            setRunError("Hãy chọn video file trước khi chạy flow.");
            return;
        }
        if (requiresUpload && !selectedStorageAccount) {
            setRunError("Hãy chọn storage account active.");
            return;
        }
        if (requiresPublish && !selectedSocialAccount) {
            setRunError("Hãy chọn social account connected.");
            return;
        }
        if (executablePlan.mode === "asset-to-social" && !selectedAssetId) {
            setRunError("Hãy chọn video có sẵn từ Storage Library.");
            return;
        }
        if (
            requiresPublish &&
            (selectedPublishType === "facebook_reel" ||
                selectedPublishType === "facebook_video") &&
            !facebookPageId.trim()
        ) {
            setRunError("Facebook publish cần Facebook Page ID.");
            return;
        }

        const tags = parseCommaList(runTags);
        if (tags.length < 2) {
            setRunError("Source tags cần tối thiểu 2 tag để giữ traceability.");
            return;
        }

        setIsRunningFlow(true);
        const progressTaskId = startProgressTask({
            title: "Workspace Flow",
            description: executablePlan.mode
                ? `Running ${executablePlan.mode} graph.`
                : "Running Workspace graph.",
            scope: "system",
            progress: 5,
        });

        try {
            let assetId = selectedAssetId;
            const sourceTitle = selectedFile?.name ?? "storage-library-asset";

            if (requiresUpload) {
                updateProgressTask(progressTaskId, {
                    progress: 15,
                    description: `Uploading ${selectedFile?.name}...`,
                });
                updateRunStep(
                    "source-file",
                    "running",
                    `Uploading ${selectedFile?.name}...`,
                );
                updateRunStep(
                    "storage-upload",
                    "running",
                    `Saving to ${selectedStorageAccount?.label}...`,
                );

                const formData = new FormData();
                formData.set("videoFile", selectedFile as File);
                formData.set(
                    "storageProvider",
                    selectedStorageAccount?.providerType === "telegram"
                        ? "telegram"
                        : "drive",
                );
                formData.set(
                    "storageProviderAccountId",
                    selectedStorageAccount?._id ?? "",
                );
                formData.set("tags", tags.join(","));
                formData.set("title", runTitle.trim() || sourceTitle);
                formData.set("contentIntent", "other");
                formData.set("ownershipStatus", "unknown");

                const uploadResponse = await fetch(
                    "/api/video-intake/local-runs",
                    {
                        method: "POST",
                        body: formData,
                    },
                );
                const uploadPayload = await uploadResponse.json();

                if (!uploadPayload.ok || !uploadPayload.data?.assetId) {
                    throw new Error(
                        uploadPayload.error ??
                            uploadPayload.errorCode ??
                            "Workspace upload step failed.",
                    );
                }

                assetId = uploadPayload.data.assetId;
                updateProgressTask(progressTaskId, {
                    progress: requiresPublish ? 55 : 90,
                    description: `Created asset ${assetId}.`,
                });
                updateRunStep(
                    "source-file",
                    "success",
                    `Run ${uploadPayload.data.runId} accepted file input.`,
                );
                updateRunStep(
                    "storage-upload",
                    "success",
                    `Created asset ${assetId}.`,
                );
            } else {
                updateProgressTask(progressTaskId, {
                    progress: 35,
                    description: `Using existing asset ${assetId}.`,
                });
                updateRunStep(
                    "source-file",
                    "success",
                    `Using existing asset ${assetId}.`,
                );
                updateRunStep(
                    "storage-upload",
                    "success",
                    "Storage upload skipped.",
                );
            }

            if (!requiresPublish) {
                updateRunStep(
                    "social-publish",
                    "success",
                    "Publish skipped by graph.",
                );
                setRunResult(`Flow completed. Created asset ${assetId}.`);
                finishProgressTask({
                    id: progressTaskId,
                    status: "success",
                    description: `Workspace upload flow completed. Asset ${assetId}.`,
                });
                return;
            }

            updateProgressTask(progressTaskId, {
                progress: 70,
                description: `Publishing asset ${assetId}...`,
            });
            updateRunStep(
                "social-publish",
                "running",
                `Publishing with ${selectedSocialAccount?.label}...`,
            );

            const publishResponse = await fetch("/api/social/publish-records", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    assetId,
                    socialAccountId: selectedSocialAccount?._id,
                    publishType: selectedPublishType,
                    facebookPageId: facebookPageId.trim() || undefined,
                    publishNow: true,
                    privacyStatus,
                    title: runTitle.trim() || sourceTitle,
                    caption: runCaption.trim() || undefined,
                    hashtags: tags,
                }),
            });
            const publishPayload = await publishResponse.json();

            if (!publishPayload.ok) {
                throw new Error(
                    publishPayload.error ??
                        publishPayload.errorCode ??
                        "Workspace publish step failed.",
                );
            }

            updateRunStep(
                "social-publish",
                publishPayload.data?.status === "failed" ? "failed" : "success",
                `Publish record ${publishPayload.data?._id ?? "created"} status: ${
                    publishPayload.data?.status ?? "unknown"
                }.`,
            );
            setRunResult(
                `Flow completed. Asset ${assetId}; publish status ${
                    publishPayload.data?.status ?? "unknown"
                }.`,
            );
            finishProgressTask({
                id: progressTaskId,
                status:
                    publishPayload.data?.status === "failed"
                        ? "failed"
                        : "success",
                description: `Workspace flow completed. Publish status ${
                    publishPayload.data?.status ?? "unknown"
                }.`,
                error:
                    publishPayload.data?.status === "failed"
                        ? (publishPayload.data?.errorDetail ??
                          "Publish failed.")
                        : undefined,
            });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Workspace flow failed.";
            setRunError(message);
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Workspace flow failed.",
                error: message,
            });
            setRunSteps((current) =>
                current.map((step) =>
                    step.status === "running"
                        ? {
                              ...step,
                              status: "failed",
                              detail: message,
                          }
                        : step,
                ),
            );
        } finally {
            setIsRunningFlow(false);
        }
    };

    const getCanvasPoint = (event: PointerEvent<HTMLElement>) => {
        const rect = viewportRef.current?.getBoundingClientRect();

        if (!rect) {
            return { x: 0, y: 0 };
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
        if (event.button !== 0) {
            return;
        }

        event.stopPropagation();
        const point = getCanvasPoint(event);
        setDragState({
            nodeId: node.id,
            pointerId: event.pointerId,
            offsetX: point.x - node.position.x,
            offsetY: point.y - node.position.y,
        });
        event.currentTarget.setPointerCapture(event.pointerId);
        selectNode(node.id);
    };

    const handleNodeDrag = (event: PointerEvent<HTMLButtonElement>) => {
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

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
        if (!dragState || dragState.pointerId !== event.pointerId) {
            return;
        }

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
        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        setCanvasView((current) => ({
            ...current,
            x: panState.originX + event.clientX - panState.startX,
            y: panState.originY + event.clientY - panState.startY,
        }));
    };

    const endCanvasPan = (event: PointerEvent<HTMLDivElement>) => {
        if (!panState || panState.pointerId !== event.pointerId) {
            return;
        }

        setPanState(null);
    };

    const connectFromPending = (targetNodeId: string) => {
        if (!pendingSourceNodeId) {
            return;
        }

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
        if (!selectedNode) {
            return;
        }
        setGraph((current) => deleteWorkspaceNode(current, selectedNode.id));
        setPendingSourceNodeId((current) =>
            current === selectedNode.id ? null : current,
        );
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

            <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_320px]">
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
                        executablePlan={executablePlan}
                        runSteps={runSteps}
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

                                    if (!fromNode || !toNode) {
                                        return null;
                                    }

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
                                        Add nodes from the catalog or seed the
                                        sample flow to start shaping the
                                        pipeline.
                                    </p>
                                </div>
                            ) : null}

                            {graph.nodes.map((node) => (
                                <CanvasNode
                                    key={node.id}
                                    node={node}
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
                    onSetPendingSource={(nodeId) =>
                        setPendingSourceNodeId(nodeId)
                    }
                    onCancelPendingSource={() => setPendingSourceNodeId(null)}
                    onDeleteSelected={deleteSelectedNode}
                    executablePlan={executablePlan}
                    storageAccounts={storageAccounts}
                    socialAccounts={socialAccounts}
                    storageAssets={storageAssets}
                    selectedFile={selectedFile}
                    selectedAssetId={selectedAssetId}
                    selectedStorageAccountId={selectedStorageAccountId}
                    selectedSocialAccountId={selectedSocialAccountId}
                    selectedPublishType={selectedPublishType}
                    publishTypesForSelectedAccount={
                        publishTypesForSelectedAccount
                    }
                    facebookPageId={facebookPageId}
                    privacyStatus={privacyStatus}
                    runTitle={runTitle}
                    runCaption={runCaption}
                    runTags={runTags}
                    isRunningFlow={isRunningFlow}
                    onFileChange={setSelectedFile}
                    onAssetChange={setSelectedAssetId}
                    onStorageAccountChange={setSelectedStorageAccountId}
                    onSocialAccountChange={setSelectedSocialAccountId}
                    onPublishTypeChange={setSelectedPublishType}
                    onFacebookPageIdChange={setFacebookPageId}
                    onPrivacyStatusChange={setPrivacyStatus}
                    onTitleChange={setRunTitle}
                    onCaptionChange={setRunCaption}
                    onTagsChange={setRunTags}
                />
            </div>
        </section>
    );
}

function CanvasNode({
    node,
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
    executablePlan,
    runSteps,
    isRunningFlow,
    runError,
    runResult,
    onRun,
    onClear,
}: {
    accountsError: string | null;
    executablePlan: WorkspaceExecutableUploadToSocialPlan;
    runSteps: WorkspaceRunStep[];
    isRunningFlow: boolean;
    runError: string | null;
    runResult: string | null;
    onRun: () => void;
    onClear: () => void;
}) {
    return (
        <div className="border-b border-main bg-main px-4 py-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-main">
                        Workspace Runtime
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                        Cấu hình từng node trong Inspector bên phải, sau đó chạy
                        flow hiện tại.
                    </p>
                    <p className="mt-1 text-[10px] leading-4 text-muted">
                        Executable graph:{" "}
                        <span
                            className={
                                executablePlan.ok
                                    ? "text-emerald-600"
                                    : "text-amber-700"
                            }
                        >
                            {executablePlan.ok
                                ? executablePlan.mode
                                : executablePlan.error}
                        </span>
                    </p>
                </div>
                <div className="w-full shrink-0 xl:w-auto">
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            disabled={isRunningFlow}
                            onClick={onRun}
                            className="inline-flex items-center gap-1.5 border border-accent/35 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Send className="h-3.5 w-3.5" />
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

            {accountsError ? (
                <p className="mt-2 border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
                    {accountsError}
                </p>
            ) : null}
            {runError ? (
                <p className="mt-2 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-700">
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

function NodeRuntimeConfig({
    node,
    executablePlan,
    storageAccounts,
    socialAccounts,
    storageAssets,
    selectedFile,
    selectedAssetId,
    selectedStorageAccountId,
    selectedSocialAccountId,
    selectedPublishType,
    publishTypesForSelectedAccount,
    facebookPageId,
    privacyStatus,
    runTitle,
    runCaption,
    runTags,
    isRunningFlow,
    onFileChange,
    onAssetChange,
    onStorageAccountChange,
    onSocialAccountChange,
    onPublishTypeChange,
    onFacebookPageIdChange,
    onPrivacyStatusChange,
    onTitleChange,
    onCaptionChange,
    onTagsChange,
}: {
    node: WorkspaceNodeInstance;
    executablePlan: WorkspaceExecutableUploadToSocialPlan;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    storageAssets: WorkspaceAsset[];
    selectedFile: File | null;
    selectedAssetId: string;
    selectedStorageAccountId: string;
    selectedSocialAccountId: string;
    selectedPublishType: WorkspacePublishType;
    publishTypesForSelectedAccount: WorkspacePublishType[];
    facebookPageId: string;
    privacyStatus: "private" | "unlisted" | "public";
    runTitle: string;
    runCaption: string;
    runTags: string;
    isRunningFlow: boolean;
    onFileChange: (file: File | null) => void;
    onAssetChange: (assetId: string) => void;
    onStorageAccountChange: (accountId: string) => void;
    onSocialAccountChange: (accountId: string) => void;
    onPublishTypeChange: (publishType: WorkspacePublishType) => void;
    onFacebookPageIdChange: (value: string) => void;
    onPrivacyStatusChange: (value: "private" | "unlisted" | "public") => void;
    onTitleChange: (value: string) => void;
    onCaptionChange: (value: string) => void;
    onTagsChange: (value: string) => void;
}) {
    return (
        <InspectorSection title="Runtime Config">
            <div className="space-y-2 border border-main bg-secondary/20 p-2">
                {node.templateNodeType === "source.file" ? (
                    <>
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video file
                            </span>
                            <input
                                type="file"
                                accept="video/*,.mp4,.webm,.mov"
                                disabled={isRunningFlow}
                                onChange={(event) =>
                                    onFileChange(
                                        event.currentTarget.files?.[0] ?? null,
                                    )
                                }
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                            {selectedFile ? (
                                <span className="mt-1 block truncate text-[10px] text-muted">
                                    {selectedFile.name}
                                </span>
                            ) : null}
                        </label>
                        <RuntimeTextInput
                            label="Title"
                            value={runTitle}
                            disabled={isRunningFlow}
                            placeholder="Defaults to filename"
                            onChange={onTitleChange}
                        />
                        <RuntimeTextInput
                            label="Trace tags"
                            value={runTags}
                            disabled={isRunningFlow}
                            placeholder="workspace,upload"
                            onChange={onTagsChange}
                        />
                    </>
                ) : null}

                {node.templateNodeType === "source.asset" ? (
                    <RuntimeSelect
                        label="Storage Library asset"
                        value={selectedAssetId}
                        disabled={isRunningFlow}
                        onChange={onAssetChange}
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
                ) : null}

                {node.templateNodeType === "storage.upload" ? (
                    <RuntimeSelect
                        label="Storage account"
                        value={selectedStorageAccountId}
                        disabled={isRunningFlow}
                        onChange={onStorageAccountChange}
                    >
                        <option value="">Select storage</option>
                        {storageAccounts.map((account) => (
                            <option key={account._id} value={account._id}>
                                {account.label} ({account.providerType})
                            </option>
                        ))}
                    </RuntimeSelect>
                ) : null}

                {node.templateNodeType === "social.publish" ? (
                    <>
                        <RuntimeSelect
                            label="Social account"
                            value={selectedSocialAccountId}
                            disabled={isRunningFlow}
                            onChange={onSocialAccountChange}
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
                            value={selectedPublishType}
                            disabled={
                                isRunningFlow ||
                                publishTypesForSelectedAccount.length === 0
                            }
                            onChange={(value) =>
                                onPublishTypeChange(
                                    value as WorkspacePublishType,
                                )
                            }
                        >
                            {publishTypesForSelectedAccount.map(
                                (publishType) => (
                                    <option
                                        key={publishType}
                                        value={publishType}
                                    >
                                        {publishType}
                                    </option>
                                ),
                            )}
                        </RuntimeSelect>
                        <RuntimeSelect
                            label="YouTube privacy"
                            value={privacyStatus}
                            disabled={isRunningFlow}
                            onChange={(value) =>
                                onPrivacyStatusChange(
                                    value as "private" | "unlisted" | "public",
                                )
                            }
                        >
                            <option value="private">private</option>
                            <option value="unlisted">unlisted</option>
                            <option value="public">public</option>
                        </RuntimeSelect>
                        <RuntimeTextInput
                            label="Facebook Page ID"
                            value={facebookPageId}
                            disabled={isRunningFlow}
                            placeholder="Required for Facebook"
                            onChange={onFacebookPageIdChange}
                        />
                        <RuntimeTextInput
                            label="Caption"
                            value={runCaption}
                            disabled={isRunningFlow}
                            placeholder="Optional publish caption"
                            onChange={onCaptionChange}
                        />
                    </>
                ) : null}

                <p className="text-[10px] leading-4 text-muted">
                    Current executable mode:{" "}
                    <span
                        className={
                            executablePlan.ok
                                ? "text-emerald-600"
                                : "text-amber-700"
                        }
                    >
                        {executablePlan.ok
                            ? executablePlan.mode
                            : executablePlan.error}
                    </span>
                </p>
            </div>
        </InspectorSection>
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

function InspectorPanel({
    node,
    template,
    pendingSourceNodeId,
    validation,
    onSetPendingSource,
    onCancelPendingSource,
    onDeleteSelected,
    executablePlan,
    storageAccounts,
    socialAccounts,
    storageAssets,
    selectedFile,
    selectedAssetId,
    selectedStorageAccountId,
    selectedSocialAccountId,
    selectedPublishType,
    publishTypesForSelectedAccount,
    facebookPageId,
    privacyStatus,
    runTitle,
    runCaption,
    runTags,
    isRunningFlow,
    onFileChange,
    onAssetChange,
    onStorageAccountChange,
    onSocialAccountChange,
    onPublishTypeChange,
    onFacebookPageIdChange,
    onPrivacyStatusChange,
    onTitleChange,
    onCaptionChange,
    onTagsChange,
}: {
    node: WorkspaceNodeInstance | undefined;
    template: WorkspaceNodeTemplate | undefined;
    pendingSourceNodeId: string | null;
    validation: { ok: boolean; errors: string[] };
    onSetPendingSource: (nodeId: string) => void;
    onCancelPendingSource: () => void;
    onDeleteSelected: () => void;
    executablePlan: WorkspaceExecutableUploadToSocialPlan;
    storageAccounts: WorkspaceStorageAccount[];
    socialAccounts: WorkspaceSocialAccount[];
    storageAssets: WorkspaceAsset[];
    selectedFile: File | null;
    selectedAssetId: string;
    selectedStorageAccountId: string;
    selectedSocialAccountId: string;
    selectedPublishType: WorkspacePublishType;
    publishTypesForSelectedAccount: WorkspacePublishType[];
    facebookPageId: string;
    privacyStatus: "private" | "unlisted" | "public";
    runTitle: string;
    runCaption: string;
    runTags: string;
    isRunningFlow: boolean;
    onFileChange: (file: File | null) => void;
    onAssetChange: (assetId: string) => void;
    onStorageAccountChange: (accountId: string) => void;
    onSocialAccountChange: (accountId: string) => void;
    onPublishTypeChange: (publishType: WorkspacePublishType) => void;
    onFacebookPageIdChange: (value: string) => void;
    onPrivacyStatusChange: (value: "private" | "unlisted" | "public") => void;
    onTitleChange: (value: string) => void;
    onCaptionChange: (value: string) => void;
    onTagsChange: (value: string) => void;
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
                        executablePlan={executablePlan}
                        storageAccounts={storageAccounts}
                        socialAccounts={socialAccounts}
                        storageAssets={storageAssets}
                        selectedFile={selectedFile}
                        selectedAssetId={selectedAssetId}
                        selectedStorageAccountId={selectedStorageAccountId}
                        selectedSocialAccountId={selectedSocialAccountId}
                        selectedPublishType={selectedPublishType}
                        publishTypesForSelectedAccount={
                            publishTypesForSelectedAccount
                        }
                        facebookPageId={facebookPageId}
                        privacyStatus={privacyStatus}
                        runTitle={runTitle}
                        runCaption={runCaption}
                        runTags={runTags}
                        isRunningFlow={isRunningFlow}
                        onFileChange={onFileChange}
                        onAssetChange={onAssetChange}
                        onStorageAccountChange={onStorageAccountChange}
                        onSocialAccountChange={onSocialAccountChange}
                        onPublishTypeChange={onPublishTypeChange}
                        onFacebookPageIdChange={onFacebookPageIdChange}
                        onPrivacyStatusChange={onPrivacyStatusChange}
                        onTitleChange={onTitleChange}
                        onCaptionChange={onCaptionChange}
                        onTagsChange={onTagsChange}
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
