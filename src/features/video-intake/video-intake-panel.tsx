"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";
import { getTelegramDownloadBlockedReason } from "@/lib/storage/telegram-download";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";

type UploadProviderType = "telegram" | "drive";
type IntakeQualityPreference = "best" | "1080p" | "720p" | "480p" | "360p";

type YtDlpFormatSummary = {
    formatId: string;
    ext?: string;
    formatNote?: string;
    resolution?: string;
    width?: number;
    height?: number;
    fps?: number;
    filesize?: number;
    filesizeApprox?: number;
    protocol?: string;
    tbr?: number;
    vbr?: number;
    abr?: number;
    vcodec?: string;
    acodec?: string;
    hasAudio: boolean;
    hasVideo: boolean;
};

type FormatListState =
    | {
          status: "idle";
          message: string;
          formats: YtDlpFormatSummary[];
          recommended?: string;
      }
    | {
          status: "loading";
          message: string;
          formats: YtDlpFormatSummary[];
          recommended?: string;
      }
    | {
          status: "success";
          message: string;
          formats: YtDlpFormatSummary[];
          recommended?: string;
      }
    | {
          status: "failed";
          message: string;
          formats: YtDlpFormatSummary[];
          recommended?: string;
      };

type IntakeApiResult = {
    ok: boolean;
    data?: {
        runId: string;
        sourceId?: string;
        assetId?: string;
        status: "success" | "failed";
        storageProvider: UploadProviderType;
        storageProviderAccountId?: string;
        storagePointer?: Record<string, unknown>;
        errorCode?: string;
        errorMessage?: string;
    };
    errorCode?: string;
    error?: string;
};

type IntakeStepRun = {
    _id: string;
    jobRunId: string;
    nodeId: string;
    nodeType: string;
    status: "running" | "failed" | "success";
    errorCode?: string | null;
    errorDetail?: string | null;
    startedAt?: string;
    endedAt?: string | null;
};

type StorageProviderAccount = {
    _id: string;
    providerType: UploadProviderType | "s3" | "local" | "other";
    label: string;
    status: "active" | "paused" | "error";
    priority: number;
};

type IntakeRunHistory = {
    _id: string;
    status: "running" | "failed" | "success" | "queued";
    inputSnapshot?: {
        sourceUrl?: string;
        title?: string | null;
        storageProvider?: string;
        storageProviderAccountId?: string | null;
    };
    outputSummary?: {
        assetId?: string;
        errorCode?: string;
        errorMessage?: string;
        storageProviderLabel?: string | null;
    } | null;
    assetSummary?: {
        _id: string;
        status?: string;
        storageProvider: string;
        storagePointer?: Record<string, unknown>;
        publicUrl?: string | null;
        providerAssetId?: string | null;
        mimeType?: string | null;
        sizeBytes?: number | null;
        durationMs?: number | null;
        metadata?: {
            sourceUrl?: string;
            originPlatform?: string;
            title?: string | null;
            resolver?: string;
            requestedQuality?: string;
            actualQuality?: string | null;
            formatId?: string | null;
            formatNote?: string | null;
            resolution?: string | null;
            height?: number | null;
            width?: number | null;
            ext?: string | null;
            vcodec?: string | null;
            acodec?: string | null;
        };
        createdFrom?: {
            sourceId?: string;
            jobRunId?: string;
            storageProviderAccountId?: string | null;
            storageProviderLabel?: string | null;
        };
        createdAt?: string;
    } | null;
    durationMs?: number | null;
    createdAt?: string;
};

type Pagination = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
};

type ApiResponse<T> = {
    ok: boolean;
    data?: T;
    pagination?: Pagination;
    errorCode?: string;
    error?: string;
};

type RunDetailResponse = {
    run: {
        _id: string;
        status: "queued" | "running" | "failed" | "success";
        outputSummary?: {
            errorCode?: string;
            errorMessage?: string;
        } | null;
    };
    stepRuns: IntakeStepRun[];
};

type VideoIntakePanelProps = {
    section: LeftbarNavItem;
};

type SubmitState =
    | { status: "idle"; message: string }
    | { status: "running"; message: string }
    | { status: "success"; message: string; result: IntakeApiResult["data"] }
    | { status: "failed"; message: string; errorCode?: string };

function isUploadProvider(
    provider: StorageProviderAccount,
): provider is StorageProviderAccount & { providerType: UploadProviderType } {
    return (
        provider.providerType === "telegram" ||
        provider.providerType === "drive"
    );
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatBytes(size?: number | null) {
    if (!size || size <= 0) {
        return "-";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatDuration(durationMs?: number | null) {
    if (!durationMs || durationMs <= 0) {
        return "-";
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function formatFormatSize(format: YtDlpFormatSummary) {
    return formatBytes(format.filesize ?? format.filesizeApprox);
}

function formatCodecSummary(format: YtDlpFormatSummary) {
    if (format.hasAudio && format.hasVideo) {
        return `${format.vcodec ?? "video"} + ${format.acodec ?? "audio"}`;
    }
    if (format.hasAudio) {
        return format.acodec ?? "audio only";
    }
    if (format.hasVideo) {
        return format.vcodec ?? "video only";
    }
    return "-";
}

const DEFAULT_PAGINATION: Pagination = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
};
const HISTORY_PAGE_SIZE = 10;
const PIPELINE_STEP_ORDER = [
    {
        nodeId: "validate-source-url",
        label: "Validate source URL",
    },
    {
        nodeId: "resolve-media-url",
        label: "Resolve media URL",
    },
    {
        nodeId: "upload-storage",
        label: "Upload storage",
    },
    {
        nodeId: "persist-asset-metadata",
        label: "Persist asset metadata",
    },
] as const;

export function VideoIntakePanel({ section }: VideoIntakePanelProps) {
    const Icon = section.icon;
    const [sourceUrl, setSourceUrl] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [tags, setTags] = useState("intake, raw");
    const [qualityPreference, setQualityPreference] =
        useState<IntakeQualityPreference>("best");
    const [formatSelector, setFormatSelector] = useState("");
    const [formatList, setFormatList] = useState<FormatListState>({
        status: "idle",
        message: "Load formats to inspect yt-dlp options.",
        formats: [],
    });
    const [storageProviderAccountId, setStorageProviderAccountId] =
        useState("");
    const [storageAccounts, setStorageAccounts] = useState<
        StorageProviderAccount[]
    >([]);
    const [history, setHistory] = useState<IntakeRunHistory[]>([]);
    const [historyPagination, setHistoryPagination] =
        useState<Pagination>(DEFAULT_PAGINATION);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [runDetail, setRunDetail] = useState<RunDetailResponse | null>(null);
    const [runDetailLoading, setRunDetailLoading] = useState(false);
    const [selectedRun, setSelectedRun] = useState<IntakeRunHistory | null>(
        null,
    );
    const [state, setState] = useState<SubmitState>({
        status: "idle",
        message: "Ready.",
    });

    const uploadAccounts = useMemo(
        () =>
            storageAccounts
                .filter((account) => account.status === "active")
                .filter(isUploadProvider)
                .sort(
                    (a, b) =>
                        b.priority - a.priority ||
                        a.label.localeCompare(b.label),
                ),
        [storageAccounts],
    );

    const selectedAccount = uploadAccounts.find(
        (account) => account._id === storageProviderAccountId,
    );

    const loadStorageAccounts = useCallback(async () => {
        try {
            const response = await fetch("/api/storage/providers", {
                method: "GET",
                cache: "no-store",
            });
            const payload = (await response.json()) as ApiResponse<
                StorageProviderAccount[]
            >;

            if (!response.ok || !payload.ok) {
                setState({
                    status: "failed",
                    message:
                        payload.error ?? "Could not load storage providers.",
                    errorCode: payload.errorCode,
                });
                return;
            }

            setStorageAccounts(payload.data ?? []);
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load storage providers.",
            });
        }
    }, []);

    const loadHistory = useCallback(async (page: number) => {
        setHistoryLoading(true);
        setHistoryError(null);

        try {
            const response = await fetch(
                `/api/video-intake/runs?page=${page}&pageSize=${HISTORY_PAGE_SIZE}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );
            const payload = (await response.json()) as ApiResponse<
                IntakeRunHistory[]
            >;

            if (!response.ok || !payload.ok) {
                setHistoryError(
                    payload.error ?? "Could not load intake history.",
                );
                return;
            }

            setHistory(payload.data ?? []);
            setHistoryPagination(payload.pagination ?? DEFAULT_PAGINATION);
        } catch {
            setHistoryError("Could not load intake history.");
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    const loadRunDetail = useCallback(async (runId: string) => {
        setRunDetailLoading(true);

        try {
            const response = await fetch(`/api/video-intake/runs/${runId}`, {
                method: "GET",
                cache: "no-store",
            });
            const payload =
                (await response.json()) as ApiResponse<RunDetailResponse>;

            if (!response.ok || !payload.ok || !payload.data) {
                setRunDetail(null);
                return;
            }

            setRunDetail(payload.data);
        } catch {
            setRunDetail(null);
        } finally {
            setRunDetailLoading(false);
        }
    }, []);

    const loadFormats = async () => {
        const trimmedUrl = sourceUrl.trim();
        if (!trimmedUrl) {
            setFormatList({
                status: "failed",
                message: "Enter a video URL before loading formats.",
                formats: [],
            });
            return;
        }

        setFormatList((current) => ({
            ...current,
            status: "loading",
            message: "Loading yt-dlp formats...",
        }));

        try {
            const response = await fetch("/api/video-intake/formats", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: trimmedUrl,
                    qualityPreference,
                }),
            });
            const payload = (await response.json()) as ApiResponse<{
                formats: YtDlpFormatSummary[];
                recommendedFormatSelector?: string;
            }>;

            if (!response.ok || !payload.ok || !payload.data) {
                setFormatList({
                    status: "failed",
                    message: payload.error ?? "Could not load yt-dlp formats.",
                    formats: [],
                });
                return;
            }

            setFormatList({
                status: "success",
                message: `${payload.data.formats.length} formats available.`,
                formats: payload.data.formats,
                recommended: payload.data.recommendedFormatSelector,
            });
            if (
                !formatSelector.trim() &&
                payload.data.recommendedFormatSelector
            ) {
                setFormatSelector(payload.data.recommendedFormatSelector);
            }
        } catch (error) {
            setFormatList({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Could not load yt-dlp formats.",
                formats: [],
            });
        }
    };

    const runIntake = async () => {
        if (!selectedAccount) {
            setState({
                status: "failed",
                message:
                    "Create and activate a Telegram or Google Drive storage account first.",
                errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
            });
            return;
        }

        setState({
            status: "running",
            message: "Running node pipeline...",
        });
        const progressTaskId = startProgressTask({
            title: "Video intake run",
            description: "Submitting URL intake pipeline...",
            scope: "upload",
            progress: 10,
        });

        try {
            updateProgressTask(progressTaskId, {
                description: "Resolving source and running storage upload...",
                progress: 45,
            });
            const response = await fetch("/api/video-intake/runs", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    sourceUrl,
                    title: title.trim() || undefined,
                    description: description.trim() || undefined,
                    storageProvider: selectedAccount.providerType,
                    storageProviderAccountId: selectedAccount._id,
                    tags: tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    qualityPreference,
                    formatSelector: formatSelector.trim() || undefined,
                    contentIntent: "other",
                    ownershipStatus: "unknown",
                }),
            });

            const payload = (await response.json()) as IntakeApiResult;

            if (!response.ok || !payload.ok) {
                setState({
                    status: "failed",
                    message: payload.error ?? "Video intake failed.",
                    errorCode: payload.errorCode ?? payload.data?.errorCode,
                });
                if (payload.data?.runId) {
                    await loadRunDetail(payload.data.runId);
                }
                await loadHistory(1);
                finishProgressTask({
                    id: progressTaskId,
                    status: "failed",
                    description: payload.error ?? "Video intake failed.",
                    error: payload.errorCode ?? payload.data?.errorCode,
                });
                return;
            }

            setState({
                status: "success",
                message: "Pipeline completed.",
                result: payload.data,
            });
            if (payload.data?.runId) {
                await loadRunDetail(payload.data.runId);
            }
            await loadHistory(1);
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Video intake completed.",
            });
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Video intake failed.",
            });
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Video intake failed.",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };

    const retryRun = async (run: IntakeRunHistory) => {
        const retrySourceUrl = run.inputSnapshot?.sourceUrl?.trim();
        if (!retrySourceUrl) {
            setState({
                status: "failed",
                message: "Retry failed: missing source URL from selected run.",
                errorCode: "VAL_SOURCE_URL_REQUIRED",
            });
            return;
        }

        const retryAccountId = run.inputSnapshot?.storageProviderAccountId;
        if (retryAccountId) {
            setStorageProviderAccountId(retryAccountId);
        }
        if (run.inputSnapshot?.title) {
            setTitle(run.inputSnapshot.title);
        }
        setSourceUrl(retrySourceUrl);

        const fallbackAccount = selectedAccount ?? uploadAccounts[0];
        const retryAccount =
            uploadAccounts.find((account) => account._id === retryAccountId) ??
            fallbackAccount;

        if (!retryAccount) {
            setState({
                status: "failed",
                message:
                    "Retry failed: no active Telegram/Drive account available.",
                errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
            });
            return;
        }

        setState({
            status: "running",
            message: "Retrying pipeline run...",
        });
        const progressTaskId = startProgressTask({
            title: "Video intake retry",
            description: "Retrying URL intake pipeline...",
            scope: "upload",
            progress: 10,
        });

        try {
            updateProgressTask(progressTaskId, {
                description: "Running retry pipeline...",
                progress: 45,
            });
            const response = await fetch("/api/video-intake/runs", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    sourceUrl: retrySourceUrl,
                    title: run.inputSnapshot?.title?.trim() || undefined,
                    description: description.trim() || undefined,
                    storageProvider: retryAccount.providerType,
                    storageProviderAccountId: retryAccount._id,
                    tags: tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    qualityPreference,
                    formatSelector: formatSelector.trim() || undefined,
                    contentIntent: "other",
                    ownershipStatus: "unknown",
                }),
            });

            const payload = (await response.json()) as IntakeApiResult;

            if (!response.ok || !payload.ok) {
                setState({
                    status: "failed",
                    message: payload.error ?? "Video intake failed.",
                    errorCode: payload.errorCode ?? payload.data?.errorCode,
                });
                if (payload.data?.runId) {
                    await loadRunDetail(payload.data.runId);
                }
                await loadHistory(1);
                finishProgressTask({
                    id: progressTaskId,
                    status: "failed",
                    description: payload.error ?? "Video intake retry failed.",
                    error: payload.errorCode ?? payload.data?.errorCode,
                });
                return;
            }

            setState({
                status: "success",
                message: "Retry completed.",
                result: payload.data,
            });
            if (payload.data?.runId) {
                await loadRunDetail(payload.data.runId);
            }
            await loadHistory(1);
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Video intake retry completed.",
            });
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Video intake retry failed.",
            });
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Video intake retry failed.",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };

    const deleteFailedRuns = async () => {
        if (!confirm("Delete all failed URL intake runs and their traces?")) {
            return;
        }

        setHistoryLoading(true);
        setHistoryError(null);

        try {
            const response = await fetch(
                "/api/video-intake/runs?status=failed",
                {
                    method: "DELETE",
                },
            );
            const payload = (await response.json()) as ApiResponse<{
                deletedRuns: number;
            }>;

            if (!response.ok || !payload.ok) {
                setHistoryError(
                    payload.error ?? "Could not delete failed intake runs.",
                );
                return;
            }

            setSelectedRun(null);
            await loadHistory(1);
        } catch {
            setHistoryError("Could not delete failed intake runs.");
        } finally {
            setHistoryLoading(false);
        }
    };

    const deleteRun = async (run: IntakeRunHistory) => {
        if (!confirm(`Delete run "${run._id}"?`)) {
            return;
        }

        setHistoryLoading(true);
        setHistoryError(null);
        try {
            const response = await fetch(`/api/video-intake/runs/${run._id}`, {
                method: "DELETE",
            });
            const payload = (await response.json()) as ApiResponse<{
                deletedRuns: number;
            }>;

            if (!response.ok || !payload.ok) {
                setHistoryError(payload.error ?? "Could not delete run.");
                return;
            }

            if (selectedRun?._id === run._id) {
                setSelectedRun(null);
            }
            await loadHistory(historyPagination.page);
        } catch {
            setHistoryError("Could not delete run.");
        } finally {
            setHistoryLoading(false);
        }
    };

    useEffect(() => {
        void loadStorageAccounts();
        void loadHistory(1);
    }, [loadStorageAccounts, loadHistory]);

    const stepTimeline = PIPELINE_STEP_ORDER.map((step) => {
        const matched = runDetail?.stepRuns.find(
            (stepRun) => stepRun.nodeId === step.nodeId,
        );

        return {
            ...step,
            status: matched?.status ?? "pending",
            errorCode: matched?.errorCode ?? null,
            errorDetail: matched?.errorDetail ?? null,
        };
    });

    useEffect(() => {
        if (!storageProviderAccountId && uploadAccounts.length > 0) {
            setStorageProviderAccountId(uploadAccounts[0]._id);
        }
    }, [storageProviderAccountId, uploadAccounts]);

    const isResolverFailure =
        state.status === "failed" &&
        (state.errorCode === "VID_RESOLVER_REQUIRED" ||
            state.errorCode === "VID_RESOLVER_RUNTIME_MISSING" ||
            state.errorCode === "VID_RESOLVER_FAILED");

    return (
        <section className="overflow-hidden border border-main bg-main">
            <header className="border-b border-main bg-secondary/45 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted" />
                    <h1 className="text-[15px] font-semibold text-main">
                        {section.label}
                    </h1>
                </div>
                <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
                    {section.description}
                </p>
            </header>

            <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <form
                    className="border border-main"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void runIntake();
                    }}
                >
                    <div className="border-b border-main bg-secondary/35 px-4 py-3">
                        <p className="text-[12px] font-semibold text-main">
                            Input Node
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            URL page sẽ cần resolver service; direct
                            `.mp4/.webm/.mov` có thể đi thẳng qua storage node.
                        </p>
                    </div>

                    <div className="space-y-4 px-4 py-4">
                        <label className="block">
                            <span className="text-[12px] font-medium text-main">
                                Video URL
                            </span>
                            <input
                                value={sourceUrl}
                                onChange={(event) =>
                                    setSourceUrl(event.target.value)
                                }
                                placeholder="https://..."
                                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                            />
                        </label>

                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Title optional
                                </span>
                                <input
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    placeholder="Short internal title"
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                                />
                            </label>

                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Storage Provider
                                </span>
                                <select
                                    value={storageProviderAccountId}
                                    onChange={(event) =>
                                        setStorageProviderAccountId(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    {uploadAccounts.length === 0 ? (
                                        <option value="">
                                            No active Telegram/Drive account
                                        </option>
                                    ) : (
                                        uploadAccounts.map((account) => (
                                            <option
                                                key={account._id}
                                                value={account._id}
                                            >
                                                {account.label} ·{" "}
                                                {account.providerType}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </label>
                        </div>
                        <label className="block">
                            <span className="text-[12px] font-medium text-main">
                                Description optional
                            </span>
                            <input
                                value={description}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                placeholder="Optional source description"
                                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                            />
                        </label>
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Quality Preference
                                </span>
                                <select
                                    value={qualityPreference}
                                    onChange={(event) =>
                                        setQualityPreference(
                                            event.target
                                                .value as IntakeQualityPreference,
                                        )
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    <option value="best">Best available</option>
                                    <option value="1080p">
                                        1080p or lower
                                    </option>
                                    <option value="720p">720p or lower</option>
                                    <option value="480p">480p or lower</option>
                                    <option value="360p">360p or lower</option>
                                </select>
                            </label>

                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Tags comma-separated
                                </span>
                                <input
                                    value={tags}
                                    onChange={(event) =>
                                        setTags(event.target.value)
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                        </div>

                        <div className="border border-main bg-secondary/20 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[12px] font-medium text-main">
                                    yt-dlp Format Selector
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void loadFormats()}
                                    disabled={formatList.status === "loading"}
                                    className="border border-main bg-main px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {formatList.status === "loading"
                                        ? "Loading..."
                                        : "Load Formats"}
                                </button>
                            </div>
                            <input
                                value={formatSelector}
                                onChange={(event) =>
                                    setFormatSelector(event.target.value)
                                }
                                placeholder="bv*+ba/best with audio"
                                className="mt-2 w-full border border-main bg-main px-3 py-2 font-mono text-[11px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                            />
                            <p className="mt-2 text-[11px] leading-5 text-muted">
                                {formatList.message}
                            </p>
                            {formatList.recommended ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setFormatSelector(
                                            formatList.recommended ?? "",
                                        )
                                    }
                                    className="mt-2 border border-main bg-main px-2 py-1 font-mono text-[10px] text-main transition-colors hover:bg-secondary"
                                >
                                    Use recommended: {formatList.recommended}
                                </button>
                            ) : null}
                            {formatList.formats.length > 0 ? (
                                <div className="mt-3 max-h-64 overflow-auto border border-main bg-main">
                                    <table className="w-full min-w-[680px] text-left text-[11px]">
                                        <thead className="sticky top-0 bg-secondary text-muted">
                                            <tr>
                                                <th className="px-2 py-2 font-medium">
                                                    ID
                                                </th>
                                                <th className="px-2 py-2 font-medium">
                                                    Type
                                                </th>
                                                <th className="px-2 py-2 font-medium">
                                                    Resolution
                                                </th>
                                                <th className="px-2 py-2 font-medium">
                                                    Codec
                                                </th>
                                                <th className="px-2 py-2 font-medium">
                                                    Size
                                                </th>
                                                <th className="px-2 py-2 font-medium">
                                                    Select
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formatList.formats.map(
                                                (format) => {
                                                    const type = format.hasAudio
                                                        ? format.hasVideo
                                                            ? "A+V"
                                                            : "Audio"
                                                        : format.hasVideo
                                                          ? "Video"
                                                          : "-";

                                                    return (
                                                        <tr
                                                            key={
                                                                format.formatId
                                                            }
                                                            className="border-t border-main"
                                                        >
                                                            <td className="px-2 py-2 font-mono text-main">
                                                                {
                                                                    format.formatId
                                                                }
                                                            </td>
                                                            <td className="px-2 py-2 text-muted">
                                                                {type}
                                                            </td>
                                                            <td className="px-2 py-2 text-muted">
                                                                {format.resolution ??
                                                                    (format.height
                                                                        ? `${format.height}p`
                                                                        : "-")}
                                                            </td>
                                                            <td className="px-2 py-2 text-muted">
                                                                {formatCodecSummary(
                                                                    format,
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2 text-muted">
                                                                {formatFormatSize(
                                                                    format,
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setFormatSelector(
                                                                            format.formatId,
                                                                        )
                                                                    }
                                                                    className="border border-main px-2 py-1 font-mono text-[10px] text-main transition-colors hover:bg-secondary"
                                                                >
                                                                    {
                                                                        format.formatId
                                                                    }
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                },
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : null}
                        </div>

                        <button
                            type="submit"
                            disabled={
                                state.status === "running" || !selectedAccount
                            }
                            className="border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {state.status === "running"
                                ? "Running..."
                                : "Run Intake Pipeline"}
                        </button>
                    </div>
                </form>

                <aside className="border border-main bg-secondary/25">
                    <div className="border-b border-main bg-secondary/35 px-4 py-3">
                        <p className="text-[12px] font-semibold text-main">
                            Run Status
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Node trace được lưu trong MongoDB.
                        </p>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-wide">
                            <StatusText status={state.status} />
                        </div>
                        <p
                            className={cn(
                                "text-[12px] leading-5",
                                state.status === "failed"
                                    ? "font-semibold text-rose-700"
                                    : "text-main",
                            )}
                        >
                            {state.message}
                        </p>
                        {isResolverFailure ? (
                            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                                Public page URLs use the built-in resolver first
                                without browser cookies. If resolution still
                                fails, the platform may be blocking extraction
                                or may require a format that cannot be streamed
                                as one direct media URL.
                            </p>
                        ) : null}
                        {state.status === "failed" && state.errorCode ? (
                            <p className="font-mono text-[11px] text-rose-700">
                                {state.errorCode}
                            </p>
                        ) : null}
                        {state.status === "success" && state.result ? (
                            <div className="space-y-2 border border-main bg-main p-3 text-[11px] text-muted">
                                <p>
                                    Run:{" "}
                                    <span className="font-mono text-main">
                                        {state.result.runId}
                                    </span>
                                </p>
                                <p>
                                    Asset:{" "}
                                    <span className="font-mono text-main">
                                        {state.result.assetId ?? "-"}
                                    </span>
                                </p>
                                <p>
                                    Provider:{" "}
                                    <span className="font-mono text-main">
                                        {selectedAccount?.label ??
                                            state.result.storageProvider}
                                    </span>
                                </p>
                            </div>
                        ) : null}
                        <div className="border-t border-main pt-3">
                            <p className="mb-2 text-[11px] font-semibold text-main">
                                Step Trace
                            </p>
                            <div className="space-y-2">
                                {stepTimeline.map((step) => (
                                    <div
                                        key={step.nodeId}
                                        className="border border-main bg-main px-3 py-2 text-[11px]"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-main">
                                                {step.label}
                                            </span>
                                            <span className="font-mono">
                                                <StatusText
                                                    status={step.status}
                                                />
                                            </span>
                                        </div>
                                        {step.errorCode ? (
                                            <p className="mt-1 font-mono text-muted">
                                                {step.errorCode}
                                            </p>
                                        ) : null}
                                        {step.errorDetail ? (
                                            <p className="mt-1 text-muted">
                                                {step.errorDetail}
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            {runDetailLoading ? (
                                <p className="mt-2 text-[11px] text-muted">
                                    Loading step trace...
                                </p>
                            ) : null}
                        </div>
                    </div>
                </aside>
            </div>

            <div className="border-t border-main px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-semibold text-main">
                            Intake Run History
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Recent pipeline runs from `job_runs`.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void deleteFailedRuns();
                            }}
                            disabled={historyLoading}
                            className="btn-danger inline-flex items-center gap-2 border px-3 py-1.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete Failed
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void loadHistory(historyPagination.page);
                            }}
                            disabled={historyLoading}
                            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                className={`h-3.5 w-3.5 ${historyLoading ? "animate-spin" : ""}`}
                            />
                            {historyLoading ? "Refreshing..." : "Refresh"}
                        </button>
                    </div>
                </div>

                {historyError ? (
                    <p className="mb-3 border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                        {historyError}
                    </p>
                ) : null}

                <div className="overflow-x-auto border border-main">
                    <table className="w-full border-collapse text-left text-[12px]">
                        <thead className="border-b border-main bg-secondary/45 text-muted">
                            <tr>
                                <th className="px-4 py-2 font-semibold">
                                    Video
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Status
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Source
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Storage
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Quality
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Size
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Duration
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Detail
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td
                                        className="px-4 py-6 text-muted"
                                        colSpan={8}
                                    >
                                        Chưa có intake run nào.
                                    </td>
                                </tr>
                            ) : (
                                history.map((run) => {
                                    const downloadBlockedReason =
                                        run.assetSummary
                                            ? getTelegramDownloadBlockedReason({
                                                  storageProvider:
                                                      run.assetSummary
                                                          .storageProvider,
                                                  sizeBytes:
                                                      run.assetSummary
                                                          .sizeBytes,
                                              })
                                            : "No asset preview.";

                                    return (
                                        <tr
                                            key={run._id}
                                            className="border-b border-main last:border-b-0"
                                        >
                                            <td className="w-[120px] p-0">
                                                {run.assetSummary &&
                                                !downloadBlockedReason ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedRun(run)
                                                        }
                                                        className="flex h-16 w-full items-center justify-center bg-black text-[10px] font-semibold text-white/80 transition-colors hover:bg-neutral-800"
                                                    >
                                                        Preview
                                                    </button>
                                                ) : (
                                                    <div className="flex h-16 w-full items-center justify-center bg-secondary text-[10px] text-muted">
                                                        No preview
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-mono text-[11px]">
                                                <StatusText
                                                    status={run.status}
                                                />
                                            </td>
                                            <td className="max-w-[360px] px-4 py-3">
                                                <p className="truncate text-main">
                                                    {run.inputSnapshot?.title ??
                                                        run.inputSnapshot
                                                            ?.sourceUrl ??
                                                        "-"}
                                                </p>
                                                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                    {run.inputSnapshot
                                                        ?.sourceUrl ?? "-"}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                {run.outputSummary
                                                    ?.storageProviderLabel ??
                                                    run.assetSummary
                                                        ?.createdFrom
                                                        ?.storageProviderLabel ??
                                                    run.inputSnapshot
                                                        ?.storageProvider ??
                                                    "-"}
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                <p className="text-main">
                                                    {run.assetSummary?.metadata
                                                        ?.actualQuality ?? "-"}
                                                </p>
                                                <p className="mt-1 text-[11px] text-muted">
                                                    {run.assetSummary?.metadata
                                                        ?.requestedQuality ??
                                                        ""}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                {formatBytes(
                                                    run.assetSummary?.sizeBytes,
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                {formatDuration(
                                                    run.assetSummary
                                                        ?.durationMs ??
                                                        run.durationMs,
                                                )}
                                            </td>
                                            <td className="max-w-[320px] px-4 py-3">
                                                {run.outputSummary
                                                    ?.errorMessage ? (
                                                    <p className="mt-1 truncate text-[11px] text-muted">
                                                        {
                                                            run.outputSummary
                                                                .errorMessage
                                                        }
                                                    </p>
                                                ) : null}
                                                <div className="mt-2 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setSelectedRun(run)
                                                        }
                                                        className="border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                    >
                                                        Detail
                                                    </button>
                                                    {run.status === "failed" ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                void retryRun(
                                                                    run,
                                                                );
                                                            }}
                                                            className="border border-main bg-main px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                                                        >
                                                            Again
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            void deleteRun(run);
                                                        }}
                                                        disabled={
                                                            historyLoading
                                                        }
                                                        className="btn-danger inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 flex items-center justify-between">
                    <p className="text-[11px] text-muted">
                        Page {historyPagination.page} /{" "}
                        {historyPagination.totalPages} ·{" "}
                        {historyPagination.total} runs
                    </p>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void loadHistory(historyPagination.page - 1);
                            }}
                            disabled={
                                historyLoading || historyPagination.page <= 1
                            }
                            className="border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                void loadHistory(historyPagination.page + 1);
                            }}
                            disabled={
                                historyLoading ||
                                historyPagination.page >=
                                    historyPagination.totalPages
                            }
                            className="border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {selectedRun ? (
                <IntakeRunDetailModal
                    run={selectedRun}
                    onClose={() => setSelectedRun(null)}
                />
            ) : null}
        </section>
    );
}

function IntakeRunDetailModal({
    run,
    onClose,
}: {
    run: IntakeRunHistory;
    onClose: () => void;
}) {
    const asset = run.assetSummary;
    const downloadBlockedReason = asset
        ? getTelegramDownloadBlockedReason({
              storageProvider: asset.storageProvider,
              sizeBytes: asset.sizeBytes,
          })
        : "No stored asset is linked to this run.";

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-main bg-main shadow-xl">
                <div className="flex items-start justify-between gap-4 border-b border-main bg-secondary/35 px-4 py-3">
                    <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-main">
                            {run.inputSnapshot?.title ??
                                asset?.metadata?.title ??
                                run._id}
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-muted">
                            {run.inputSnapshot?.sourceUrl ??
                                asset?.metadata?.sourceUrl ??
                                "-"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    >
                        Close
                    </button>
                </div>

                <div className="space-y-3 px-4 py-4">
                    {asset && !downloadBlockedReason ? (
                        <div className="border border-main bg-secondary/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                Inline Video Preview
                            </p>
                            <video
                                controls
                                preload="metadata"
                                className="mt-2 w-full border border-main bg-black"
                                src={`/api/storage/assets/${asset._id}/download?disposition=inline`}
                            />
                        </div>
                    ) : (
                        <div className="border border-main bg-secondary/20 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                Inline Video Preview
                            </p>
                            <p className="mt-2 text-[11px] text-muted">
                                {downloadBlockedReason}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        <DetailCell label="Run Status" value={run.status} />
                        <DetailCell
                            label="Provider"
                            value={
                                asset?.storageProvider ??
                                run.inputSnapshot?.storageProvider
                            }
                        />
                        <DetailCell
                            label="Account"
                            value={
                                run.outputSummary?.storageProviderLabel ??
                                asset?.createdFrom?.storageProviderLabel
                            }
                        />
                        <DetailCell
                            label="Requested Quality"
                            value={asset?.metadata?.requestedQuality}
                        />
                        <DetailCell
                            label="Actual Quality"
                            value={asset?.metadata?.actualQuality}
                        />
                        <DetailCell
                            label="Resolution"
                            value={asset?.metadata?.resolution}
                        />
                        <DetailCell
                            label="Size"
                            value={formatBytes(asset?.sizeBytes)}
                        />
                        <DetailCell
                            label="Duration"
                            value={formatDuration(
                                asset?.durationMs ?? run.durationMs,
                            )}
                        />
                        <DetailCell
                            label="Error Code"
                            value={run.outputSummary?.errorCode}
                            mono
                        />
                        <DetailCell
                            label="Provider Asset ID"
                            value={asset?.providerAssetId}
                            mono
                        />
                        <DetailCell label="Run ID" value={run._id} mono />
                        <DetailCell
                            label="Asset ID"
                            value={run.outputSummary?.assetId ?? asset?._id}
                            mono
                        />
                        <DetailCell
                            label="Source ID"
                            value={asset?.createdFrom?.sourceId}
                            mono
                        />
                        <DetailCell
                            label="Created"
                            value={formatDate(run.createdAt)}
                        />
                    </div>

                    {run.outputSummary?.errorMessage ? (
                        <div className="border border-main bg-main px-3 py-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                Error Message
                            </p>
                            <p className="mt-1 text-[12px] leading-5 text-main">
                                {run.outputSummary.errorMessage}
                            </p>
                        </div>
                    ) : null}

                    <div className="border border-main bg-main px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                            Storage Pointer
                        </p>
                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-main">
                            {JSON.stringify(
                                asset?.storagePointer ?? {},
                                null,
                                2,
                            )}
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DetailCell({
    label,
    value,
    mono = false,
}: {
    label: string;
    value?: string | number | null;
    mono?: boolean;
}) {
    return (
        <div className="border border-main bg-secondary/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {label}
            </p>
            <p
                className={`mt-1 truncate text-[12px] text-main ${
                    mono ? "font-mono text-[11px]" : ""
                }`}
            >
                {value ?? "-"}
            </p>
        </div>
    );
}
