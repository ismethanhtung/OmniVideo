"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";

type UploadProviderType = "telegram" | "drive";
type IntakeQualityPreference = "best" | "1080p" | "720p" | "480p" | "360p";

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

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
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
    const [tags, setTags] = useState("intake, raw");
    const [qualityPreference, setQualityPreference] =
        useState<IntakeQualityPreference>("best");
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

        try {
            const response = await fetch("/api/video-intake/runs", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({
                    sourceUrl,
                    title: title.trim() || undefined,
                    storageProvider: selectedAccount.providerType,
                    storageProviderAccountId: selectedAccount._id,
                    tags: tags
                        .split(",")
                        .map((tag) => tag.trim())
                        .filter(Boolean),
                    qualityPreference,
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
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Video intake failed.",
            });
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
                            Node trace được lưu trong `job_runs`, `step_runs`,
                            `run_events`.
                        </p>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-wide">
                            <StatusText status={state.status} />
                        </div>
                        <p className="text-[12px] leading-5 text-main">
                            {state.message}
                        </p>
                        {isResolverFailure ? (
                            <p className="border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
                                YouTube/TikTok/Facebook page URLs need a
                                resolver service that extracts a direct media
                                URL. OmniVideo now tries the built-in resolver
                                first; if resolution still fails, the source
                                platform is blocking extraction or the local
                                resolver runtime is unhealthy.
                            </p>
                        ) : null}
                        {state.status === "failed" && state.errorCode ? (
                            <p className="font-mono text-[11px] text-muted">
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
                                                <StatusText status={step.status} />
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
                                    Created
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
                                    Result
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td
                                        className="px-4 py-6 text-muted"
                                        colSpan={5}
                                    >
                                        Chưa có intake run nào.
                                    </td>
                                </tr>
                            ) : (
                                history.map((run) => (
                                    <tr
                                        key={run._id}
                                        className="border-b border-main last:border-b-0"
                                    >
                                        <td className="whitespace-nowrap px-4 py-3 text-muted">
                                            {formatDate(run.createdAt)}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px]">
                                            <StatusText status={run.status} />
                                        </td>
                                        <td className="max-w-[360px] px-4 py-3">
                                            <p className="truncate text-main">
                                                {run.inputSnapshot?.title ??
                                                    run.inputSnapshot
                                                        ?.sourceUrl ??
                                                    "-"}
                                            </p>
                                            <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                {run.inputSnapshot?.sourceUrl ??
                                                    "-"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {run.outputSummary
                                                ?.storageProviderLabel ??
                                                run.inputSnapshot
                                                    ?.storageProvider ??
                                                "-"}
                                        </td>
                                        <td className="max-w-[320px] px-4 py-3">
                                            <p className="truncate font-mono text-[11px] text-muted">
                                                {run.outputSummary?.assetId ??
                                                    run.outputSummary
                                                        ?.errorCode ??
                                                    "-"}
                                            </p>
                                            {run.outputSummary?.errorMessage ? (
                                                <p className="mt-1 truncate text-[11px] text-muted">
                                                    {
                                                        run.outputSummary
                                                            .errorMessage
                                                    }
                                                </p>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))
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
        </section>
    );
}
