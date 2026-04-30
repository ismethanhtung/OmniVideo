"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Trash2, Upload } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";
import { TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES } from "@/lib/storage/telegram-download";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";
import {
    needsDriveConfirmationForLargeLocalFile,
    pickBestDriveFallbackAccount,
} from "@/lib/video-intake/local-upload-routing";

type UploadProviderType = "telegram" | "drive";

type LocalIntakeApiResult = {
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
        title?: string | null;
        storageProvider?: string;
        fileName?: string;
        fileSizeBytes?: number;
    };
    outputSummary?: {
        assetId?: string;
        errorCode?: string;
        errorMessage?: string;
        storageProviderLabel?: string | null;
    } | null;
    assetSummary?: {
        _id: string;
        storageProvider: string;
        storagePointer?: Record<string, unknown>;
        providerAssetId?: string | null;
        sizeBytes?: number | null;
        durationMs?: number | null;
        metadata?: {
            sourceUrl?: string;
            title?: string | null;
            requestedQuality?: string;
            actualQuality?: string | null;
            resolution?: string | null;
        };
        createdFrom?: {
            sourceId?: string;
            storageProviderLabel?: string | null;
        };
    } | null;
    createdAt?: string;
};

type IntakeStepRun = {
    _id: string;
    nodeId: string;
    status: "running" | "failed" | "success";
    errorCode?: string | null;
    errorDetail?: string | null;
};

type RunDetailResponse = {
    run: {
        _id: string;
        status: "queued" | "running" | "failed" | "success";
    };
    stepRuns: IntakeStepRun[];
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

type LocalUploadIntakePanelProps = {
    section: LeftbarNavItem;
};

type SubmitState =
    | { status: "idle"; message: string }
    | { status: "running"; message: string }
    | {
          status: "success";
          message: string;
          result: LocalIntakeApiResult["data"];
      }
    | { status: "failed"; message: string; errorCode?: string };

type DriveFallbackConfirmation = {
    fileSizeBytes: number;
    fromAccount: StorageProviderAccount & { providerType: UploadProviderType };
    targetDriveAccount: StorageProviderAccount & {
        providerType: UploadProviderType;
    };
};

const DEFAULT_PAGINATION: Pagination = {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
};

const LOCAL_PIPELINE_STEPS = [
    {
        nodeId: "validate-local-file",
        label: "Validate local file",
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

function formatBytes(size?: number) {
    if (!size || size <= 0) {
        return "-";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unit = 0;

    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }

    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(precision)} ${units[unit]}`;
}

export function LocalUploadIntakePanel({
    section,
}: LocalUploadIntakePanelProps) {
    const Icon = section.icon;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [tags, setTags] = useState("local, raw");
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
    const [driveFallbackConfirmation, setDriveFallbackConfirmation] =
        useState<DriveFallbackConfirmation | null>(null);

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
                `/api/video-intake/local-runs?page=${page}&pageSize=10`,
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
                    payload.error ?? "Could not load local intake history.",
                );
                return;
            }

            setHistory(payload.data ?? []);
            setHistoryPagination(payload.pagination ?? DEFAULT_PAGINATION);
        } catch {
            setHistoryError("Could not load local intake history.");
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

    useEffect(() => {
        void loadStorageAccounts();
        void loadHistory(1);
    }, [loadHistory, loadStorageAccounts]);

    useEffect(() => {
        if (!storageProviderAccountId && uploadAccounts.length > 0) {
            setStorageProviderAccountId(uploadAccounts[0]._id);
        }
    }, [storageProviderAccountId, uploadAccounts]);

    const stepTimeline = LOCAL_PIPELINE_STEPS.map((step) => {
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

    const runLocalIntake = async (
        targetAccount: StorageProviderAccount & {
            providerType: UploadProviderType;
        },
    ) => {
        if (!videoFile) {
            setState({
                status: "failed",
                message: "Select a local video file first.",
                errorCode: "VAL_LOCAL_FILE_REQUIRED",
            });
            return;
        }

        setState({
            status: "running",
            message: "Uploading local file and running pipeline...",
        });
        const progressTaskId = startProgressTask({
            title: "Local upload intake",
            description: `Uploading ${videoFile.name} to ${targetAccount.label}.`,
            scope: "upload",
            progress: 10,
        });

        try {
            const formData = new FormData();
            formData.append("videoFile", videoFile);
            formData.append("title", title.trim() || videoFile.name);
            formData.append("tags", tags);
            formData.append("storageProvider", targetAccount.providerType);
            formData.append("storageProviderAccountId", targetAccount._id);
            formData.append("contentIntent", "other");
            formData.append("ownershipStatus", "unknown");
            updateProgressTask(progressTaskId, {
                progress: 25,
                description: "Sending file to intake API...",
            });

            const response = await fetch("/api/video-intake/local-runs", {
                method: "POST",
                body: formData,
            });
            updateProgressTask(progressTaskId, {
                progress: 75,
                description: "Pipeline response received; refreshing run history...",
            });
            const payload = (await response.json()) as LocalIntakeApiResult;

            if (!response.ok || !payload.ok) {
                setState({
                    status: "failed",
                    message: payload.error ?? "Local upload intake failed.",
                    errorCode: payload.errorCode ?? payload.data?.errorCode,
                });
                if (payload.data?.runId) {
                    await loadRunDetail(payload.data.runId);
                }
                await loadHistory(1);
                finishProgressTask({
                    id: progressTaskId,
                    status: "failed",
                    description: "Local upload intake failed.",
                    error: payload.error ?? payload.data?.errorMessage,
                });
                return;
            }

            setState({
                status: "success",
                message: "Local upload pipeline completed.",
                result: payload.data,
            });
            if (payload.data?.runId) {
                await loadRunDetail(payload.data.runId);
            }
            await loadHistory(1);
            finishProgressTask({
                id: progressTaskId,
                status: "success",
                description: "Local upload pipeline completed.",
            });
        } catch (error) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "Local upload intake failed.";
            setState({
                status: "failed",
                message: errorMessage,
            });
            finishProgressTask({
                id: progressTaskId,
                status: "failed",
                description: "Local upload intake failed.",
                error: errorMessage,
            });
        }
    };

    const requestRunLocalIntake = async () => {
        if (!videoFile) {
            setState({
                status: "failed",
                message: "Select a local video file first.",
                errorCode: "VAL_LOCAL_FILE_REQUIRED",
            });
            return;
        }

        if (!selectedAccount) {
            setState({
                status: "failed",
                message:
                    "Create and activate a Telegram or Google Drive storage account first.",
                errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
            });
            return;
        }

        const needsDriveConfirm = needsDriveConfirmationForLargeLocalFile({
            fileSizeBytes: videoFile.size,
            selectedProviderType: selectedAccount.providerType,
        });

        if (!needsDriveConfirm) {
            await runLocalIntake(selectedAccount);
            return;
        }

        const fallbackDrive = pickBestDriveFallbackAccount(uploadAccounts);

        if (!fallbackDrive) {
            setState({
                status: "failed",
                message:
                    "File is larger than 20MB. Telegram is not recommended and no active Drive account is available for fallback.",
                errorCode: "VAL_DRIVE_FALLBACK_ACCOUNT_REQUIRED",
            });
            return;
        }

        setDriveFallbackConfirmation({
            fileSizeBytes: videoFile.size,
            fromAccount: selectedAccount,
            targetDriveAccount: fallbackDrive,
        });
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
                        void requestRunLocalIntake();
                    }}
                >
                    <div className="border-b border-main bg-secondary/35 px-4 py-3">
                        <p className="text-[12px] font-semibold text-main">
                            Input Node
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Upload file video local trực tiếp lên storage
                            account và lưu trace đầy đủ vào MongoDB.
                        </p>
                    </div>

                    <div className="space-y-4 px-4 py-4">
                        <label className="block">
                            <span className="text-[12px] font-medium text-main">
                                Video File
                            </span>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(event) =>
                                    setVideoFile(
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors file:mr-3 file:border-0 file:bg-secondary file:px-2.5 file:py-1.5 file:text-[11px] file:font-semibold file:text-main focus:border-accent"
                            />
                            {videoFile ? (
                                <p className="mt-2 text-[11px] text-muted">
                                    {videoFile.name} ·{" "}
                                    {videoFile.type || "video"} ·{" "}
                                    {formatBytes(videoFile.size)}
                                </p>
                            ) : null}
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

                        <button
                            type="submit"
                            disabled={
                                state.status === "running" ||
                                !selectedAccount ||
                                !videoFile
                            }
                            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            {state.status === "running"
                                ? "Uploading..."
                                : "Run Local Upload Pipeline"}
                        </button>
                    </div>
                </form>

                <aside className="border border-main bg-secondary/25">
                    <div className="border-b border-main bg-secondary/35 px-4 py-3">
                        <p className="text-[12px] font-semibold text-main">
                            Run Status
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Step trace local upload trong `job_runs`,
                            `step_runs`, `run_events`.
                        </p>
                    </div>

                    <div className="space-y-3 px-4 py-4">
                        <div className="text-[10px] font-bold uppercase tracking-wide">
                            <StatusText status={state.status} />
                        </div>
                        <p className="text-[12px] leading-5 text-main">
                            {state.message}
                        </p>
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

            {driveFallbackConfirmation ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
                    <div className="w-full max-w-lg border border-main bg-main shadow-xl">
                        <div className="border-b border-main bg-secondary/35 px-4 py-3">
                            <p className="text-[12px] font-semibold text-main">
                                Confirm Drive Fallback
                            </p>
                            <p className="mt-1 text-[11px] text-muted">
                                File lớn hơn ngưỡng Telegram (
                                {formatBytes(TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES)}
                                ).
                            </p>
                        </div>

                        <div className="space-y-3 px-4 py-4 text-[12px] text-main">
                            <p>
                                File size:{" "}
                                <span className="font-mono">
                                    {formatBytes(
                                        driveFallbackConfirmation.fileSizeBytes,
                                    )}
                                </span>
                            </p>
                            <p>
                                Chuyển upload từ{" "}
                                <span className="font-semibold">
                                    {
                                        driveFallbackConfirmation.fromAccount
                                            .label
                                    }
                                </span>{" "}
                                sang{" "}
                                <span className="font-semibold">
                                    {
                                        driveFallbackConfirmation
                                            .targetDriveAccount.label
                                    }
                                </span>
                                ?
                            </p>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setDriveFallbackConfirmation(null)
                                    }
                                    className="border border-main bg-main px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const targetAccount =
                                            driveFallbackConfirmation.fromAccount;
                                        setDriveFallbackConfirmation(null);
                                        setStorageProviderAccountId(
                                            targetAccount._id,
                                        );
                                        void runLocalIntake(targetAccount);
                                    }}
                                    className="border border-main bg-main px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                                >
                                    Upload anyway
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const targetAccount =
                                            driveFallbackConfirmation.targetDriveAccount;
                                        setDriveFallbackConfirmation(null);
                                        setStorageProviderAccountId(
                                            targetAccount._id,
                                        );
                                        void runLocalIntake(targetAccount);
                                    }}
                                    className="border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                >
                                    Confirm and Upload to Drive
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="border-t border-main px-5 py-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-[12px] font-semibold text-main">
                            Local Intake Run History
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Recent local upload runs from `job_runs`.
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
                                <th className="px-4 py-2 font-semibold">Video</th>
                                <th className="px-4 py-2 font-semibold">
                                    Status
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    File
                                </th>
                                <th className="px-4 py-2 font-semibold">
                                    Storage
                                </th>
                                <th className="px-4 py-2 font-semibold">Result</th>
                                <th className="px-4 py-2 font-semibold">Detail</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 ? (
                                <tr>
                                    <td
                                        className="px-4 py-6 text-muted"
                                        colSpan={6}
                                    >
                                        Chưa có local upload run nào.
                                    </td>
                                </tr>
                            ) : (
                                history.map((run) => (
                                    <tr
                                        key={run._id}
                                        className="border-b border-main last:border-b-0"
                                    >
                                        <td className="w-[150px] p-0">
                                            {run.assetSummary ? (
                                                <video
                                                    preload="metadata"
                                                    muted
                                                    className="h-20 w-full bg-black object-cover"
                                                    src={`/api/storage/assets/${run.assetSummary._id}/download?disposition=inline`}
                                                />
                                            ) : (
                                                <div className="flex h-20 w-full items-center justify-center bg-secondary text-[10px] text-muted">
                                                    No preview
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px]">
                                            <StatusText status={run.status} />
                                        </td>
                                        <td className="max-w-[360px] px-4 py-3">
                                            <p className="truncate text-main">
                                                {run.inputSnapshot?.title ??
                                                    run.inputSnapshot
                                                        ?.fileName ??
                                                    "-"}
                                            </p>
                                            <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                {run.inputSnapshot?.fileName ??
                                                    "-"}{" "}
                                                ·{" "}
                                                {formatBytes(
                                                    run.inputSnapshot
                                                        ?.fileSizeBytes,
                                                )}
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
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedRun(run)
                                                    }
                                                    className="border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                >
                                                    Detail
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void deleteRun(run);
                                                    }}
                                                    disabled={historyLoading}
                                                    className="btn-danger inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Delete
                                                </button>
                                            </div>
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
            {selectedRun ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-main bg-main shadow-xl">
                        <div className="flex items-start justify-between gap-4 border-b border-main bg-secondary/35 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-main">
                                    {selectedRun.inputSnapshot?.title ??
                                        selectedRun.inputSnapshot?.fileName ??
                                        selectedRun._id}
                                </p>
                                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                    {selectedRun.inputSnapshot?.fileName ?? "-"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedRun(null)}
                                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                            >
                                Close
                            </button>
                        </div>
                        <div className="space-y-3 px-4 py-4">
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <InfoCell label="Run ID" value={selectedRun._id} mono />
                                <InfoCell label="Status" value={selectedRun.status} />
                                <InfoCell
                                    label="Created"
                                    value={formatDate(selectedRun.createdAt)}
                                />
                                <InfoCell
                                    label="Asset ID"
                                    value={selectedRun.outputSummary?.assetId}
                                    mono
                                />
                                <InfoCell
                                    label="Storage"
                                    value={
                                        selectedRun.outputSummary
                                            ?.storageProviderLabel ??
                                        selectedRun.inputSnapshot
                                            ?.storageProvider
                                    }
                                />
                                <InfoCell
                                    label="File Size"
                                    value={formatBytes(
                                        selectedRun.inputSnapshot?.fileSizeBytes,
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function InfoCell({
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
            <p className={`mt-1 truncate text-[12px] text-main ${mono ? "font-mono text-[11px]" : ""}`}>
                {value ?? "-"}
            </p>
        </div>
    );
}
