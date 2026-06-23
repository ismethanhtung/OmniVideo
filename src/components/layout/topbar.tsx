"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
} from "react";
import {
    AlertTriangle,
    CheckCircle2,
    FastForward,
    Moon,
    Gauge,
    Lightbulb,
    Orbit,
    Pencil,
    RefreshCw,
    RotateCcw,
    Rocket,
    Server,
    Sun,
    X,
} from "lucide-react";

import { getNavItem } from "@/components/layout/navigation";
import type { AppSectionId } from "@/components/layout/types";
import {
    VIEW_MODE_LOCKED_NOTE,
    type AppAccessState,
} from "@/lib/access-control/access-control";
import { fetchAppAccessState } from "@/lib/access-control/client";
import {
    clearFinishedProgressTasks,
    dismissProgressTask,
    getProgressTasksSnapshot,
    subscribeProgressTasks,
    type ProgressTaskStep,
    type ProgressTask,
} from "@/lib/ui/progress-center";
import {
    buildProgressStatusMap,
    collectNewlyFinishedProgressTasks,
    getProgressNotificationChannel,
} from "@/lib/ui/progress-notifications";
import { INSPIRATION_VAULT_UPDATED_EVENT } from "@/lib/inspiration-vault/inspiration-vault";
import { createInspirationVaultItemFromApi } from "@/lib/inspiration-vault/client";
import {
    REMOTE_VIP_WORKER_CONFIG_STORAGE_KEY,
    readRemoteVipWorkerBrowserConfig,
    writeRemoteVipWorkerBrowserConfig,
} from "@/lib/workspace/remote-vip-worker-config";
import { dispatchWorkspaceVipTranslationCorrection } from "@/lib/workspace/vip-translation-correction-events";

type TopbarProps = {
    activeSection: AppSectionId;
    onRefreshView: () => void;
    themeMode: "light" | "dark";
    onToggleTheme: () => void;
};

const HIGH_PROGRESS_VOICE_SPEED_FACTOR = 1.35;

export function Topbar({
    activeSection,
    onRefreshView,
    themeMode,
    onToggleTheme,
}: TopbarProps) {
    const currentSection = getNavItem(activeSection);
    const [showProgress, setShowProgress] = useState(false);
    const [showServerStatus, setShowServerStatus] = useState(false);
    const [showSystemSnapshot, setShowSystemSnapshot] = useState(false);
    const [showOwnerAccess, setShowOwnerAccess] = useState(false);
    const [appAccess, setAppAccess] = useState<AppAccessState | null>(null);
    const [quickCapture, setQuickCapture] = useState("");
    const [quickCaptureStatus, setQuickCaptureStatus] = useState<
        "idle" | "saving" | "saved" | "empty" | "error" | "locked"
    >("idle");
    const [completionToasts, setCompletionToasts] = useState<ProgressTask[]>(
        [],
    );
    const [notificationPermission, setNotificationPermission] = useState<
        NotificationPermission | "unsupported"
    >("unsupported");
    const previousProgressStatusesRef = useRef(
        new Map<string, ProgressTask["status"]>(),
    );
    const hasSeededProgressStatusesRef = useRef(false);
    const progressTasks = useSyncExternalStore(
        subscribeProgressTasks,
        getProgressTasksSnapshot,
        getProgressTasksSnapshot,
    );
    const activeCount = useMemo(
        () =>
            progressTasks.filter(
                (task) => task.status === "queued" || task.status === "running",
            ).length,
        [progressTasks],
    );
    const isReadOnlyDemo = Boolean(
        appAccess?.isPublicDemo && !appAccess.isOwner,
    );

    const loadAppAccess = useCallback(async () => {
        try {
            setAppAccess(await fetchAppAccessState());
        } catch {
            setAppAccess(null);
        }
    }, []);

    useEffect(() => {
        void loadAppAccess();
    }, [loadAppAccess]);

    useEffect(() => {
        setNotificationPermission(
            typeof Notification === "undefined"
                ? "unsupported"
                : Notification.permission,
        );
    }, []);

    useEffect(() => {
        if (!hasSeededProgressStatusesRef.current) {
            const seededStatuses = buildProgressStatusMap(progressTasks);
            previousProgressStatusesRef.current.clear();
            for (const [taskId, status] of seededStatuses) {
                previousProgressStatusesRef.current.set(taskId, status);
            }
            hasSeededProgressStatusesRef.current = true;
            return;
        }

        const newlyFinished = collectNewlyFinishedProgressTasks({
            previousStatuses: previousProgressStatusesRef.current,
            tasks: progressTasks,
        });

        for (const task of newlyFinished) {
            const channel = getProgressNotificationChannel({
                visibilityState: document.visibilityState,
                browserPermission:
                    typeof Notification === "undefined"
                        ? undefined
                        : Notification.permission,
            });

            if (channel === "browser") {
                new Notification(task.title, {
                    body:
                        task.description ??
                        (task.status === "success"
                            ? "Task completed."
                            : "Task failed."),
                });
            } else if (channel === "toast") {
                setCompletionToasts((current) => [...current, task]);
            }
        }

        const nextStatuses = buildProgressStatusMap(progressTasks);
        previousProgressStatusesRef.current.clear();
        for (const [taskId, status] of nextStatuses) {
            previousProgressStatusesRef.current.set(taskId, status);
        }
    }, [progressTasks]);

    useEffect(() => {
        if (completionToasts.length === 0) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setCompletionToasts((current) => current.slice(1));
        }, 4500);

        return () => window.clearTimeout(timeoutId);
    }, [completionToasts]);

    const submitQuickCapture = async () => {
        if (isReadOnlyDemo) {
            setQuickCaptureStatus("locked");
            return;
        }

        if (!quickCapture.trim()) {
            setQuickCaptureStatus("empty");
            return;
        }

        try {
            setQuickCaptureStatus("saving");
            const item = await createInspirationVaultItemFromApi(quickCapture);
            setQuickCapture("");
            setQuickCaptureStatus("saved");
            window.dispatchEvent(
                new CustomEvent(INSPIRATION_VAULT_UPDATED_EVENT, {
                    detail: item,
                }),
            );
        } catch {
            setQuickCaptureStatus("error");
            return;
        }
    };

    return (
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-main bg-main px-3 md:px-5">
            <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-main">
                    {currentSection?.label ?? "OmniVideo"}
                </p>
                <p className="hidden truncate text-[10px] text-muted md:block">
                    {currentSection?.description ?? "Workspace navigation"}
                </p>
            </div>

            <div className="ml-2 flex min-w-0 items-center gap-2 overflow-x-auto thin-scrollbar">
                <form
                    className="flex min-w-[180px] max-w-[360px] flex-1 items-center gap-1.5"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submitQuickCapture();
                    }}
                    title="Quick capture to Inspiration Vault"
                >
                    <div className="relative min-w-0 flex-1">
                        <Lightbulb className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                        <input
                            type="text"
                            value={quickCapture}
                            onChange={(event) => {
                                setQuickCapture(event.target.value);
                                setQuickCaptureStatus("idle");
                            }}
                            placeholder={
                                quickCaptureStatus === "saved"
                                    ? "Saved to Inspiration Vault"
                                    : quickCaptureStatus === "saving"
                                      ? "Saving..."
                                      : quickCaptureStatus === "locked"
                                        ? VIEW_MODE_LOCKED_NOTE
                                        : quickCaptureStatus === "empty"
                                          ? "Paste link or keyword first"
                                          : quickCaptureStatus === "error"
                                            ? "Could not save"
                                            : "Capture link / keyword..."
                            }
                            readOnly={isReadOnlyDemo}
                            onClick={() => {
                                if (isReadOnlyDemo) {
                                    setQuickCaptureStatus("locked");
                                }
                            }}
                            onFocus={() => {
                                if (isReadOnlyDemo) {
                                    setQuickCaptureStatus("locked");
                                }
                            }}
                            className={`h-7 w-full border border-main bg-secondary/45 pl-7 pr-2 text-[11px] font-medium text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25 ${
                                quickCaptureStatus === "locked" ||
                                quickCaptureStatus === "error"
                                    ? "border-red-500/40 text-red-500 placeholder:text-red-500"
                                    : ""
                            }`}
                        />
                    </div>
                </form>
                {appAccess?.isPublicDemo ? (
                    <button
                        type="button"
                        onClick={() => setShowOwnerAccess(true)}
                        className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                        aria-label="Open owner access"
                    >
                        {appAccess.isOwner ? "Owner" : "View Mode"}
                    </button>
                ) : null}
                <button
                    type="button"
                    onClick={() => setShowProgress(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    aria-label="Open background progress"
                >
                    Progress
                    <span className="text-[10px]">{activeCount}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowServerStatus(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    aria-label="Open server status"
                >
                    Server
                </button>
                <button
                    type="button"
                    onClick={() => setShowSystemSnapshot(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    aria-label="Open system snapshot"
                >
                    System
                </button>
                <button
                    type="button"
                    onClick={onRefreshView}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                >
                    Refresh
                </button>
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-secondary px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                    aria-label="Toggle dark and light mode"
                >
                    {themeMode === "dark" ? (
                        <Moon className="h-3.5 w-3.5" />
                    ) : (
                        <Sun className="h-3.5 w-3.5" />
                    )}
                    {themeMode === "dark" ? "Dark" : "Light"}
                </button>
            </div>

            {showProgress ? (
                <ProgressModal
                    tasks={progressTasks}
                    onClose={() => setShowProgress(false)}
                    notificationPermission={notificationPermission}
                    onRequestNotificationPermission={async () => {
                        if (typeof Notification === "undefined") {
                            setNotificationPermission("unsupported");
                            return;
                        }

                        const permission =
                            await Notification.requestPermission();
                        setNotificationPermission(permission);
                    }}
                    onSendTestNotification={() => {
                        if (
                            typeof Notification === "undefined" ||
                            Notification.permission !== "granted"
                        ) {
                            return;
                        }

                        new Notification("OmniVideo notifications", {
                            body: "Thông báo ngoài tab đang hoạt động.",
                        });
                    }}
                />
            ) : null}
            {showServerStatus ? (
                <ServerStatusModal onClose={() => setShowServerStatus(false)} />
            ) : null}
            {showSystemSnapshot ? (
                <SystemSnapshotModal
                    onClose={() => setShowSystemSnapshot(false)}
                />
            ) : null}
            {showOwnerAccess ? (
                <OwnerAccessModal
                    access={appAccess}
                    onClose={() => setShowOwnerAccess(false)}
                    onAccessChanged={() => void loadAppAccess()}
                />
            ) : null}
            <CompletionToastStack
                tasks={completionToasts}
                onDismiss={(taskId) =>
                    setCompletionToasts((current) =>
                        current.filter((task) => task.id !== taskId),
                    )
                }
            />
        </header>
    );
}

function OwnerAccessModal({
    access,
    onClose,
    onAccessChanged,
}: {
    access: AppAccessState | null;
    onClose: () => void;
    onAccessChanged: () => void;
}) {
    const [token, setToken] = useState("");
    const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");

    const submitOwnerToken = async () => {
        setStatus("saving");
        const response = await fetch("/api/app/access", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });

        if (!response.ok) {
            setStatus("error");
            return;
        }

        setStatus("idle");
        setToken("");
        onAccessChanged();
    };

    const clearOwnerToken = async () => {
        await fetch("/api/app/access", { method: "DELETE" });
        onAccessChanged();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/20 p-4">
            <div className="w-full max-w-sm border border-main bg-main p-4 shadow-xl">
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[13px] font-semibold text-main">
                            Owner Access
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            {access?.isOwner
                                ? "Owner mode is active for this browser."
                                : VIEW_MODE_LOCKED_NOTE}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="border border-main bg-main px-2 py-1 text-[11px] font-semibold text-muted hover:bg-secondary hover:text-main"
                    >
                        Close
                    </button>
                </div>
                {access?.isOwner ? (
                    <button
                        type="button"
                        onClick={() => void clearOwnerToken()}
                        className="w-full border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main hover:bg-secondary/75"
                    >
                        Lock owner access
                    </button>
                ) : (
                    <div className="space-y-2">
                        <input
                            type="password"
                            value={token}
                            onChange={(event) => {
                                setToken(event.target.value);
                                setStatus("idle");
                            }}
                            placeholder="Owner token"
                            className="h-9 w-full border border-main bg-secondary/45 px-3 text-[12px] font-medium text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
                        />
                        {status === "error" ? (
                            <p className="text-[11px] font-semibold text-red-500">
                                Invalid owner token.
                            </p>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void submitOwnerToken()}
                            disabled={!token.trim() || status === "saving"}
                            className="w-full border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {status === "saving" ? "Unlocking..." : "Unlock"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

type RemoteVipWorkerStatus = {
    jobs?: Array<{
        jobId?: string;
        status?: string;
        stage?: string;
        stageStartedAt?: string;
        message?: string;
        metrics?: Record<string, unknown>;
        startedAt?: string;
        updatedAt?: string;
        error?: string;
        errorCode?: string;
    }>;
    activeProcesses?: Array<{
        id?: string;
        pid?: number;
        kind?: string;
        command?: string;
        argsPreview?: string[];
        startedAt?: string;
        elapsedMs?: number;
    }>;
    systemProcesses?: Array<{
        pid: number;
        elapsed: string;
        cpuPercent: number;
        memoryPercent: number;
        kind: string;
        command: string;
    }>;
    ec2?: {
        instanceId?: string;
        instanceType?: string;
        availabilityZone?: string;
        region?: string;
        privateIp?: string;
        publicIp?: string;
    } | null;
    top?: {
        capturedAt: string;
        lines: string[];
    } | null;
    cancelledJobs?: string[];
    killedProcesses?: Array<{
        pid?: number;
        kind?: string;
        elapsedMs?: number;
    }>;
    killedSystemProcesses?: Array<{
        pid: number;
        kind: string;
        elapsed: string;
    }>;
};

type ParsedProgressSegment = {
    id?: number;
    start?: number;
    end?: number;
    sourceText?: string;
    translatedText: string;
    speedFactor?: number;
    rawDurationSeconds?: number;
    targetDurationSeconds?: number;
    warningCodes: string[];
    rawLine: string;
};

let cachedServerStatus: RemoteVipWorkerStatus | null = null;

function buildServerStatusRequest(input: {
    endpoint: string;
    token: string;
    method?: "GET" | "DELETE";
}) {
    const endpoint = input.endpoint.trim();
    const token = input.token.trim();
    const url = endpoint
        ? `/api/audio/remote-vip-worker?endpoint=${encodeURIComponent(endpoint)}`
        : "/api/audio/remote-vip-worker";
    return {
        url,
        init: {
            method: input.method ?? "GET",
            headers: token
                ? { "X-OmniVideo-Remote-Vip-Token": token }
                : undefined,
        } satisfies RequestInit,
    };
}

function formatServerMetricValue(value: unknown) {
    if (typeof value === "number") {
        return Number.isInteger(value) ? String(value) : value.toFixed(2);
    }
    if (typeof value === "string" || typeof value === "boolean") {
        return String(value);
    }
    return "";
}

function formatRemoteWorkerProxyError(
    payload: {
        error?: string;
        detail?: string;
        timeoutMs?: number;
    } | null,
    fallback: string,
) {
    const base = payload?.error ?? fallback;
    const suffixParts: string[] = [];
    if (payload?.detail?.trim()) {
        suffixParts.push(`detail: ${payload.detail.trim()}`);
    }
    if (typeof payload?.timeoutMs === "number" && payload.timeoutMs > 0) {
        suffixParts.push(`timeout: ${payload.timeoutMs}ms`);
    }
    return suffixParts.length ? `${base} (${suffixParts.join("; ")})` : base;
}

function ServerStatusModal({ onClose }: { onClose: () => void }) {
    const [status, setStatus] = useState<RemoteVipWorkerStatus | null>(
        cachedServerStatus,
    );
    const [loading, setLoading] = useState(false);
    const [killing, setKilling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [autoRefreshPaused, setAutoRefreshPaused] = useState(false);
    const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
    const [workerEndpoint, setWorkerEndpoint] = useState("");
    const [workerToken, setWorkerToken] = useState("");
    const [hasLoadedWorkerConfig, setHasLoadedWorkerConfig] = useState(false);

    useEffect(() => {
        const config = readRemoteVipWorkerBrowserConfig();
        setWorkerEndpoint(config.endpoint);
        setWorkerToken(config.token);
        setHasLoadedWorkerConfig(true);
    }, []);

    useEffect(() => {
        if (!hasLoadedWorkerConfig) {
            return;
        }
        writeRemoteVipWorkerBrowserConfig({
            endpoint: workerEndpoint,
            token: workerToken,
        });
    }, [hasLoadedWorkerConfig, workerEndpoint, workerToken]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const request = buildServerStatusRequest({
                endpoint: workerEndpoint,
                token: workerToken,
            });
            const response = await fetch(request.url, request.init);
            const payload = (await response.json().catch(() => null)) as {
                ok?: boolean;
                data?: RemoteVipWorkerStatus;
                error?: string;
                detail?: string;
                timeoutMs?: number;
            } | null;
            if (!response.ok || payload?.ok === false) {
                throw new Error(
                    formatRemoteWorkerProxyError(
                        payload,
                        `Remote VIP worker status failed with HTTP ${response.status}.`,
                    ),
                );
            }
            const nextStatus = payload?.data ?? {};
            cachedServerStatus = nextStatus;
            setStatus(nextStatus);
            setAutoRefreshPaused(false);
            setLastLoadedAt(Date.now());
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Remote VIP worker status failed.",
            );
            setAutoRefreshPaused(true);
        } finally {
            setLoading(false);
        }
    }, [workerEndpoint, workerToken]);

    useEffect(() => {
        if (!hasLoadedWorkerConfig) {
            return;
        }
        void load();
    }, [hasLoadedWorkerConfig, load]);

    useEffect(() => {
        if (!hasLoadedWorkerConfig) {
            return;
        }
        if (autoRefreshPaused) {
            return;
        }
        const intervalId = window.setInterval(() => {
            void load();
        }, 5000);
        return () => window.clearInterval(intervalId);
    }, [autoRefreshPaused, hasLoadedWorkerConfig, load]);

    const killActive = async () => {
        const confirmed = window.confirm(
            "Kill active remote VIP jobs and Piper/ffmpeg processes?",
        );
        if (!confirmed) return;
        setKilling(true);
        setError(null);
        try {
            const request = buildServerStatusRequest({
                endpoint: workerEndpoint,
                token: workerToken,
                method: "DELETE",
            });
            const response = await fetch(request.url, request.init);
            const payload = (await response.json().catch(() => null)) as {
                ok?: boolean;
                data?: RemoteVipWorkerStatus;
                error?: string;
                detail?: string;
                timeoutMs?: number;
            } | null;
            if (!response.ok || payload?.ok === false) {
                throw new Error(
                    formatRemoteWorkerProxyError(
                        payload,
                        `Remote VIP worker kill failed with HTTP ${response.status}.`,
                    ),
                );
            }
            const nextStatus = payload?.data ?? {};
            cachedServerStatus = nextStatus;
            setStatus(nextStatus);
            setLastLoadedAt(Date.now());
        } catch (killError) {
            setError(
                killError instanceof Error
                    ? killError.message
                    : "Remote VIP worker kill failed.",
            );
        } finally {
            setKilling(false);
        }
    };

    const jobs = status?.jobs ?? [];
    const processes = status?.activeProcesses ?? [];
    const systemProcesses = status?.systemProcesses ?? [];
    const ec2 = status?.ec2 ?? null;
    const top = status?.top ?? null;
    const cancelledJobs = status?.cancelledJobs ?? [];
    const killedProcesses = status?.killedProcesses ?? [];
    const killedSystemProcesses = status?.killedSystemProcesses ?? [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 md:p-6">
            <section className="flex max-h-[90vh] w-full max-w-5xl flex-col border border-main bg-main shadow-xl">
                <header className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
                    <div>
                        <p className="text-[14px] font-semibold text-main">
                            Server
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Remote VIP worker jobs and Piper/ffmpeg
                            subprocesses.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center border border-main bg-main p-1.5 text-main hover:bg-secondary"
                        aria-label="Close server modal"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </header>

                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main px-4 py-2">
                    <span className="text-[11px] text-muted">
                        {jobs.length} job(s) ·{" "}
                        {processes.length + systemProcesses.length} process(es)
                        {ec2?.instanceId ? ` · ${ec2.instanceId}` : ""}
                        {lastLoadedAt
                            ? ` · Updated ${formatProgressTime(lastLoadedAt)}`
                            : ""}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void load()}
                            disabled={loading}
                            className="inline-flex items-center gap-1 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary disabled:opacity-50"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            {loading
                                ? "Checking..."
                                : autoRefreshPaused
                                  ? "Retry"
                                  : "Refresh"}
                        </button>
                        <button
                            type="button"
                            onClick={() => void killActive()}
                            disabled={
                                killing ||
                                (jobs.length === 0 &&
                                    processes.length === 0 &&
                                    systemProcesses.length === 0)
                            }
                            className="inline-flex items-center gap-1 border border-red-500/50 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-600 hover:text-white disabled:opacity-50"
                        >
                            <X className="h-3.5 w-3.5" />
                            {killing ? "Killing..." : "Kill active"}
                        </button>
                    </div>
                </div>

                <div className="grid gap-2 border-b border-main px-4 py-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)]">
                    <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Remote worker URL
                        </span>
                        <input
                            type="url"
                            value={workerEndpoint}
                            onChange={(event) =>
                                setWorkerEndpoint(event.target.value)
                            }
                            placeholder="http://16.163.29.17:8787"
                            className="h-8 w-full border border-main bg-secondary/35 px-2.5 font-mono text-[11px] text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Worker token
                        </span>
                        <input
                            type="password"
                            value={workerToken}
                            onChange={(event) =>
                                setWorkerToken(event.target.value)
                            }
                            placeholder="Paste worker token"
                            className="h-8 w-full border border-main bg-secondary/35 px-2.5 font-mono text-[11px] text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
                        />
                    </label>
                    <p className="text-[10px] leading-4 text-muted lg:col-span-2">
                        Saved in this browser. If empty, the app falls back to
                        Vercel/server environment variables.
                    </p>
                </div>

                {error ? (
                    <p className="border-b border-main px-4 py-2 text-[11px] font-semibold text-red-500">
                        {error}
                        {autoRefreshPaused
                            ? " Auto-refresh is paused until you retry."
                            : ""}
                    </p>
                ) : null}
                {cancelledJobs.length > 0 ||
                killedProcesses.length > 0 ||
                killedSystemProcesses.length > 0 ? (
                    <p className="border-b border-main px-4 py-2 text-[11px] font-semibold text-emerald-700">
                        Cancelled {cancelledJobs.length} job(s), killed{" "}
                        {killedProcesses.length + killedSystemProcesses.length}{" "}
                        process(es).
                    </p>
                ) : null}

                <div className="min-h-0 overflow-y-auto px-4 py-3">
                    {ec2 ? (
                        <section className="mb-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase text-muted">
                                EC2 Instance
                            </p>
                            <div className="grid gap-2 border border-main p-3 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
                                <ServerStatusField
                                    label="Instance"
                                    value={ec2.instanceId}
                                />
                                <ServerStatusField
                                    label="Type"
                                    value={ec2.instanceType}
                                />
                                <ServerStatusField
                                    label="Region / AZ"
                                    value={[ec2.region, ec2.availabilityZone]
                                        .filter(Boolean)
                                        .join(" / ")}
                                />
                                <ServerStatusField
                                    label="Public IP"
                                    value={ec2.publicIp}
                                />
                                <ServerStatusField
                                    label="Private IP"
                                    value={ec2.privateIp}
                                />
                            </div>
                        </section>
                    ) : null}

                    {top?.lines?.length ? (
                        <section className="mb-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <p className="text-[11px] font-semibold uppercase text-muted">
                                    Top Snapshot
                                </p>
                                <span className="text-[10px] text-muted">
                                    {formatProgressTime(
                                        new Date(top.capturedAt).getTime(),
                                    )}
                                </span>
                            </div>
                            <pre className="max-h-80 overflow-auto border border-main bg-secondary/20 p-3 font-mono text-[10px] leading-4 text-main">
                                {top.lines.join("\n")}
                            </pre>
                        </section>
                    ) : null}

                    {jobs.length === 0 &&
                    processes.length === 0 &&
                    systemProcesses.length === 0 ? (
                        <p className="py-8 text-[12px] text-muted">
                            No active remote VIP worker jobs or child processes.
                        </p>
                    ) : null}

                    {jobs.length > 0 ? (
                        <section className="mb-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase text-muted">
                                Jobs
                            </p>
                            <div className="divide-y divide-soft border border-main">
                                {jobs.map((job) => {
                                    const metrics = job.metrics
                                        ? Object.entries(job.metrics)
                                              .map(([key, value]) => {
                                                  const formatted =
                                                      formatServerMetricValue(
                                                          value,
                                                      );
                                                  return formatted
                                                      ? `${key}=${formatted}`
                                                      : "";
                                              })
                                              .filter(Boolean)
                                              .join(", ")
                                        : "";
                                    return (
                                        <article
                                            key={
                                                job.jobId ??
                                                `${job.stage}-${job.startedAt}`
                                            }
                                            className="px-3 py-2"
                                        >
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-[11px] font-semibold text-main">
                                                    {job.status ?? "unknown"}
                                                </span>
                                                <span className="text-[11px] text-muted">
                                                    {job.stage ?? "stage?"}
                                                </span>
                                                <span className="font-mono text-[10px] text-muted">
                                                    {job.jobId ?? "unknown-job"}
                                                </span>
                                            </div>
                                            {job.message ? (
                                                <p className="mt-1 text-[11px] text-muted">
                                                    {job.message}
                                                </p>
                                            ) : null}
                                            {metrics ? (
                                                <p className="mt-1 font-mono text-[10px] text-muted">
                                                    {metrics}
                                                </p>
                                            ) : null}
                                            {job.error ? (
                                                <p className="mt-1 text-[11px] font-semibold text-red-500">
                                                    {job.errorCode
                                                        ? `${job.errorCode}: `
                                                        : ""}
                                                    {job.error}
                                                </p>
                                            ) : null}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {processes.length > 0 ? (
                        <section>
                            <p className="mb-2 text-[11px] font-semibold uppercase text-muted">
                                Processes
                            </p>
                            <div className="divide-y divide-soft border border-main">
                                {processes.map((process) => (
                                    <article
                                        key={
                                            process.id ??
                                            process.pid ??
                                            process.startedAt
                                        }
                                        className="px-3 py-2"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-semibold text-main">
                                                PID {process.pid ?? "?"}
                                            </span>
                                            <span className="text-[11px] text-muted">
                                                {process.kind ?? "process"}
                                            </span>
                                            <span className="text-[10px] text-muted">
                                                {Math.round(
                                                    (process.elapsedMs ?? 0) /
                                                        1000,
                                                )}
                                                s
                                            </span>
                                        </div>
                                        <p className="mt-1 break-all font-mono text-[10px] leading-4 text-muted">
                                            {[
                                                process.command,
                                                ...(process.argsPreview ?? []),
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {systemProcesses.length > 0 ? (
                        <section className="mt-4">
                            <p className="mb-2 text-[11px] font-semibold uppercase text-muted">
                                System Processes
                            </p>
                            <div className="divide-y divide-soft border border-main">
                                {systemProcesses.map((process) => (
                                    <article
                                        key={process.pid}
                                        className="px-3 py-2"
                                    >
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-[11px] font-semibold text-main">
                                                PID {process.pid}
                                            </span>
                                            <span className="text-[11px] text-muted">
                                                {process.kind}
                                            </span>
                                            <span className="text-[10px] text-muted">
                                                {process.elapsed}
                                            </span>
                                            <span className="text-[10px] font-semibold text-main">
                                                CPU{" "}
                                                {process.cpuPercent.toFixed(1)}%
                                            </span>
                                            <span className="text-[10px] text-muted">
                                                MEM{" "}
                                                {process.memoryPercent.toFixed(
                                                    1,
                                                )}
                                                %
                                            </span>
                                        </div>
                                        <p className="mt-1 break-all font-mono text-[10px] leading-4 text-muted">
                                            {process.command}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function ServerStatusField({
    label,
    value,
}: {
    label: string;
    value?: string;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] uppercase text-muted">{label}</p>
            <p className="truncate font-mono text-[11px] font-semibold text-main">
                {value || "-"}
            </p>
        </div>
    );
}

type SystemSnapshot = {
    capturedAt: string;
    process: {
        pid: number;
        nodeVersion: string;
        uptimeSec: number;
        memory: Record<string, number>;
        cpuUsage: Record<string, number>;
        threadpoolSize: number;
        platform: string;
        arch: string;
    };
    system: {
        hostname: string;
        uptimeSec: number;
        loadAvg: number[];
        cpu: {
            model: string;
            cores: number;
            usagePercentApprox: number | null;
        };
        memory: {
            totalBytes: number;
            freeBytes: number;
            usedBytes: number;
            usedPercent: number;
        };
        networkInterfaces: Array<{
            name: string;
            addresses: Array<{
                family: string | number;
                internal: boolean;
                address: string;
                mac: string;
            }>;
        }>;
    };
};

let cachedSystemSnapshot: SystemSnapshot | null = null;

function SystemSnapshotModal({ onClose }: { onClose: () => void }) {
    const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(
        cachedSystemSnapshot,
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(
        async (force = false) => {
            if (snapshot && !force) {
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await fetch("/api/system/snapshot", {
                    method: "GET",
                    cache: "no-store",
                });
                const payload = (await response.json()) as {
                    ok: boolean;
                    data?: SystemSnapshot;
                    error?: string;
                };
                if (!response.ok || !payload.ok || !payload.data) {
                    setError(
                        payload.error ?? "Could not load system snapshot.",
                    );
                    return;
                }
                cachedSystemSnapshot = payload.data;
                setSnapshot(payload.data);
            } catch {
                setError("Could not load system snapshot.");
            } finally {
                setLoading(false);
            }
        },
        [snapshot],
    );

    useEffect(() => {
        if (!cachedSystemSnapshot) {
            void load(false);
        }
    }, [load]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 md:p-6">
            <section className="flex max-h-[90vh] w-full max-w-5xl flex-col border border-main bg-main shadow-xl">
                <header className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
                    <div>
                        <p className="text-[14px] font-semibold text-main">
                            System Snapshot
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Load-once overview of app/runtime resource usage.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void load(true)}
                            className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                        >
                            Reload
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center border border-main bg-main p-1.5 text-main hover:bg-secondary"
                            aria-label="Close system snapshot modal"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </header>
                <div className="min-h-0 overflow-y-auto px-4 py-4 text-[12px]">
                    {error ? <p className="text-amber-700">{error}</p> : null}
                    {loading ? (
                        <p className="text-[12px] text-muted">
                            Loading system snapshot...
                        </p>
                    ) : null}
                    {snapshot ? (
                        <div className="space-y-4">
                            <div className="grid gap-3 lg:grid-cols-2">
                                <section className="border border-main bg-main">
                                    <div className="border-b border-main bg-secondary/25 px-3 py-2">
                                        <p className="text-[11px] font-semibold text-main">
                                            Overview
                                        </p>
                                    </div>
                                    <table className="w-full border-collapse text-[12px]">
                                        <tbody>
                                            <TableRow
                                                label="Captured"
                                                value={formatProgressTime(
                                                    new Date(
                                                        snapshot.capturedAt,
                                                    ).getTime(),
                                                )}
                                            />
                                            <TableRow
                                                label="Host"
                                                value={snapshot.system.hostname}
                                            />
                                            <TableRow
                                                label="Node / PID"
                                                value={`${snapshot.process.nodeVersion} / ${snapshot.process.pid}`}
                                            />
                                            <TableRow
                                                label="App Uptime"
                                                value={formatSeconds(
                                                    snapshot.process.uptimeSec,
                                                )}
                                            />
                                            <TableRow
                                                label="System Uptime"
                                                value={formatSeconds(
                                                    snapshot.system.uptimeSec,
                                                )}
                                            />
                                        </tbody>
                                    </table>
                                </section>

                                <section className="border border-main bg-main">
                                    <div className="border-b border-main bg-secondary/25 px-3 py-2">
                                        <p className="text-[11px] font-semibold text-main">
                                            Resources
                                        </p>
                                    </div>
                                    <table className="w-full border-collapse text-[12px]">
                                        <tbody>
                                            <TableRow
                                                label="CPU"
                                                value={`${snapshot.system.cpu.usagePercentApprox ?? "-"}% · ${snapshot.system.cpu.cores} cores`}
                                            />
                                            <TableRow
                                                label="Memory"
                                                value={`${formatBytes(snapshot.system.memory.usedBytes)} / ${formatBytes(snapshot.system.memory.totalBytes)} (${snapshot.system.memory.usedPercent}%)`}
                                                tone={
                                                    snapshot.system.memory
                                                        .usedPercent >= 95
                                                        ? "warn"
                                                        : "normal"
                                                }
                                            />
                                            <TableRow
                                                label="App RSS"
                                                value={formatBytes(
                                                    snapshot.process.memory.rss,
                                                )}
                                            />
                                            <TableRow
                                                label="Load Avg"
                                                value={snapshot.system.loadAvg
                                                    .map((v) => v.toFixed(2))
                                                    .join(" / ")}
                                            />
                                            <TableRow
                                                label="Threadpool"
                                                value={String(
                                                    snapshot.process
                                                        .threadpoolSize,
                                                )}
                                            />
                                        </tbody>
                                    </table>
                                </section>
                            </div>

                            <section className="border border-main bg-main">
                                <div className="border-b border-main bg-secondary/25 px-3 py-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Network
                                    </p>
                                </div>
                                <div className="px-3 py-2">
                                    {snapshot.system.networkInterfaces
                                        .length === 0 ? (
                                        <p className="text-[11px] text-muted">
                                            No network interface data.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {snapshot.system.networkInterfaces.map(
                                                (net) => (
                                                    <div
                                                        key={net.name}
                                                        className="rounded-sm bg-secondary/20 px-2 py-1.5"
                                                    >
                                                        <p className="text-[11px] font-medium text-main">
                                                            {net.name}
                                                        </p>
                                                        <p className="mt-0.5 text-[10px] text-muted">
                                                            {net.addresses
                                                                .map(
                                                                    (addr) =>
                                                                        `${addr.family}: ${addr.address}${addr.internal ? " (internal)" : ""}`,
                                                                )
                                                                .join(" | ")}
                                                        </p>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );
}

function TableRow({
    label,
    value,
    tone = "normal",
}: {
    label: string;
    value: string;
    tone?: "normal" | "warn";
}) {
    return (
        <tr className="border-b border-main last:border-b-0">
            <th className="w-[35%] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-muted">
                {label}
            </th>
            <td
                className={`px-3 py-2 text-right text-[12px] ${
                    tone === "warn" ? "text-amber-700" : "text-main"
                }`}
            >
                {value}
            </td>
        </tr>
    );
}

function formatBytes(size: number) {
    if (!Number.isFinite(size) || size <= 0) {
        return "-";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function formatSeconds(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

function formatProgressTime(value: number) {
    return new Intl.DateTimeFormat("vi-VN", {
        timeStyle: "medium",
    }).format(new Date(value));
}

function formatDurationMs(from: number, to: number) {
    const totalSeconds = Math.max(0, Math.round((to - from) / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDurationValueMs(durationMs: number) {
    const safeMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
    const totalSeconds = Math.round(safeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSegmentTimestamp(seconds: number) {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const rest = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function ProgressModal({
    tasks,
    onClose,
    notificationPermission,
    onRequestNotificationPermission,
    onSendTestNotification,
}: {
    tasks: ProgressTask[];
    onClose: () => void;
    notificationPermission: NotificationPermission | "unsupported";
    onRequestNotificationPermission: () => Promise<void>;
    onSendTestNotification: () => void;
}) {
    const [now, setNow] = useState(() => Date.now());
    const [isClearingCheckpoints, setIsClearingCheckpoints] = useState(false);

    const handleClearCheckpoints = async () => {
        const confirmed = window.confirm(
            "Bạn có chắc chắn muốn xoá toàn bộ checkpoints không? Flow VIP sẽ chạy lại từ đầu thay vì tiếp tục từ checkpoint.",
        );
        if (!confirmed) return;

        setIsClearingCheckpoints(true);
        try {
            const res = await fetch("/api/audio/video-vip-processing", {
                method: "DELETE",
            });
            if (!res.ok) {
                throw new Error("HTTP error " + res.status);
            }
            const data = await res.json();
            if (data.ok) {
                alert("Đã xoá toàn bộ checkpoints thành công!");
            } else {
                alert(
                    "Xoá checkpoints thất bại: " +
                        (data.error || "Lỗi không xác định"),
                );
            }
        } catch (error) {
            alert(
                "Lỗi khi kết nối tới server: " +
                    (error instanceof Error ? error.message : String(error)),
            );
        } finally {
            setIsClearingCheckpoints(false);
        }
    };

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 md:p-6">
            <section className="flex max-h-[90vh] w-full max-w-6xl flex-col border border-main bg-main shadow-xl">
                <header className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
                    <div>
                        <p className="text-[14px] font-semibold text-main">
                            Background Progress
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Recent upload, download, and publish jobs in this
                            workspace.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center border border-main bg-main p-1.5 text-main hover:bg-secondary"
                        aria-label="Close progress modal"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </header>

                <div className="flex items-center justify-between gap-2 border-b border-main px-4 py-2">
                    <span className="text-[11px] text-muted">
                        {tasks.length} task(s)
                    </span>
                    <div className="flex items-center gap-2">
                        {notificationPermission === "default" ? (
                            <button
                                type="button"
                                onClick={() =>
                                    void onRequestNotificationPermission()
                                }
                                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                            >
                                Enable notifications
                            </button>
                        ) : notificationPermission === "granted" ? (
                            <>
                                <span className="text-[11px] font-semibold text-emerald-700">
                                    Notifications enabled
                                </span>
                                <button
                                    type="button"
                                    onClick={onSendTestNotification}
                                    className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                                >
                                    Send test notification
                                </button>
                            </>
                        ) : null}
                        <button
                            type="button"
                            onClick={clearFinishedProgressTasks}
                            className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                        >
                            Clear finished
                        </button>
                        <button
                            type="button"
                            onClick={handleClearCheckpoints}
                            disabled={isClearingCheckpoints}
                            className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary disabled:opacity-50"
                        >
                            {isClearingCheckpoints
                                ? "Clearing..."
                                : "Clear checkpoints"}
                        </button>
                    </div>
                </div>
                {notificationPermission === "granted" ? (
                    <p className="border-b border-main px-4 py-2 text-[11px] text-muted">
                        Khi tab OmniVideo đang ở nền, thông báo ngoài app chỉ
                        hiện lúc một task mới hoàn tất.
                    </p>
                ) : null}

                <div className="min-h-0 overflow-y-auto">
                    {tasks.length === 0 ? (
                        <p className="px-4 py-8 text-[12px] text-muted">
                            Không có tác vụ nền nào đang chạy.
                        </p>
                    ) : (
                        <div className="divide-y divide-soft">
                            {tasks.map((task) => (
                                <article key={task.id} className="px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-[12px] font-semibold text-main">
                                                {task.title}
                                            </p>
                                            <p className="mt-1 text-[11px] leading-5 text-muted">
                                                {task.description ?? task.scope}
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted">
                                                Scope: {task.scope} · Started:{" "}
                                                {formatProgressTime(
                                                    task.startedAt,
                                                )}
                                                {task.finishedAt
                                                    ? ` · Finished: ${formatProgressTime(task.finishedAt)}`
                                                    : ""}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <TaskStatusIcon task={task} />
                                            {task.status === "success" ||
                                            task.status === "failed" ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        dismissProgressTask(
                                                            task.id,
                                                        )
                                                    }
                                                    className="border border-main bg-main p-1 text-main hover:bg-secondary"
                                                    aria-label="Dismiss task"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                    <TaskProgressBar task={task} />
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
                                        <span>
                                            {task.progressMode === "determinate"
                                                ? `${task.progress}%`
                                                : formatStepSummary(task.steps)}
                                        </span>
                                        <span>
                                            {task.status} · updated{" "}
                                            {formatProgressTime(task.updatedAt)}{" "}
                                            · duration{" "}
                                            {formatDurationMs(
                                                task.startedAt,
                                                task.finishedAt ?? now,
                                            )}
                                        </span>
                                    </div>
                                    {task.error ? (
                                        <p className="mt-2 text-[11px] leading-5 text-rose-600">
                                            {task.error}
                                        </p>
                                    ) : null}
                                    <ProgressTaskDetails
                                        task={task}
                                        now={now}
                                    />
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

function CompletionToastStack({
    tasks,
    onDismiss,
}: {
    tasks: ProgressTask[];
    onDismiss: (taskId: string) => void;
}) {
    if (tasks.length === 0) {
        return null;
    }

    return (
        <div className="fixed right-4 top-16 z-40 flex w-full max-w-sm flex-col gap-2">
            {tasks.map((task) => (
                <div
                    key={task.id}
                    className="border border-main bg-main p-3 shadow-lg"
                >
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-main">
                                {task.title}
                            </p>
                            <p className="mt-1 text-[11px] text-muted">
                                {task.description ??
                                    (task.status === "success"
                                        ? "Task completed."
                                        : "Task failed.")}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onDismiss(task.id)}
                            className="border border-main bg-main p-1 text-main hover:bg-secondary"
                            aria-label="Dismiss completion toast"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function formatStepSummary(steps: ProgressTaskStep[]) {
    if (steps.length === 0) {
        return "No step timeline";
    }

    const successCount = steps.filter(
        (step) => step.status === "success",
    ).length;
    const failedCount = steps.filter((step) => step.status === "failed").length;
    const runningCount = steps.filter(
        (step) => step.status === "running",
    ).length;
    const pieces = [`${successCount}/${steps.length} complete`];
    if (runningCount > 0) pieces.push(`${runningCount} running`);
    if (failedCount > 0) pieces.push(`${failedCount} failed`);
    return pieces.join(" · ");
}

function parseStepDescription(description: string | null | undefined) {
    const fallback = "Waiting to start.";
    if (!description) {
        return {
            summary: fallback,
            extra: null as string | null,
            metadataLines: [] as string[],
            timelineHeader: null as string | null,
            timelineLines: [] as string[],
            tail: null as string | null,
        };
    }

    const lines = description
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        return {
            summary: fallback,
            extra: null,
            metadataLines: [],
            timelineHeader: null,
            timelineLines: [],
            tail: null,
        };
    }

    const summary = lines[0];
    const timelineHeaderIndex = lines.findIndex(
        (line, index) => index > 0 && /^Segments\s*\(/iu.test(line),
    );
    const metadataHeaderIndex = lines.findIndex(
        (line, index) => index > 0 && /^Metadata:$/iu.test(line),
    );
    if (timelineHeaderIndex === -1) {
        return {
            summary,
            extra:
                metadataHeaderIndex === -1
                    ? lines.slice(1).join(" ")
                    : lines.slice(1, metadataHeaderIndex).join(" "),
            metadataLines:
                metadataHeaderIndex === -1
                    ? []
                    : lines.slice(metadataHeaderIndex + 1),
            timelineHeader: null,
            timelineLines: [],
            tail: null,
        };
    }

    const timelineHeader = lines[timelineHeaderIndex];
    const metadataLines =
        metadataHeaderIndex !== -1 && metadataHeaderIndex < timelineHeaderIndex
            ? lines.slice(metadataHeaderIndex + 1, timelineHeaderIndex)
            : [];
    const timelineLines: string[] = [];
    const tailLines: string[] = [];
    for (const line of lines.slice(timelineHeaderIndex + 1)) {
        if (/^\[[^\]]+\]\s+/u.test(line) || line.startsWith("SEGMENT_JSON ")) {
            timelineLines.push(line);
            continue;
        }
        tailLines.push(line);
    }

    return {
        summary,
        extra:
            metadataHeaderIndex === -1
                ? lines.slice(1, timelineHeaderIndex).join(" ")
                : lines.slice(1, metadataHeaderIndex).join(" "),
        metadataLines,
        timelineHeader,
        timelineLines,
        tail: tailLines.join(" "),
    };
}

function parseProgressSegmentLine(line: string): ParsedProgressSegment {
    if (line.startsWith("SEGMENT_JSON ")) {
        try {
            const parsed = JSON.parse(line.slice("SEGMENT_JSON ".length)) as {
                id?: unknown;
                start?: unknown;
                end?: unknown;
                sourceText?: unknown;
                translatedText?: unknown;
                speedFactor?: unknown;
                rawDurationSeconds?: unknown;
                targetDurationSeconds?: unknown;
                warningCodes?: unknown;
            };
            return {
                id: typeof parsed.id === "number" ? parsed.id : undefined,
                start:
                    typeof parsed.start === "number" ? parsed.start : undefined,
                end: typeof parsed.end === "number" ? parsed.end : undefined,
                sourceText:
                    typeof parsed.sourceText === "string"
                        ? parsed.sourceText
                        : undefined,
                translatedText:
                    typeof parsed.translatedText === "string"
                        ? parsed.translatedText
                        : "",
                speedFactor:
                    typeof parsed.speedFactor === "number"
                        ? parsed.speedFactor
                        : undefined,
                rawDurationSeconds:
                    typeof parsed.rawDurationSeconds === "number"
                        ? parsed.rawDurationSeconds
                        : undefined,
                targetDurationSeconds:
                    typeof parsed.targetDurationSeconds === "number"
                        ? parsed.targetDurationSeconds
                        : undefined,
                warningCodes: Array.isArray(parsed.warningCodes)
                    ? parsed.warningCodes.filter(
                          (entry): entry is string => typeof entry === "string",
                      )
                    : [],
                rawLine: line,
            };
        } catch {
            return { translatedText: line, warningCodes: [], rawLine: line };
        }
    }

    const match = /^\[([^\]]+)\]\s+(.+)$/u.exec(line);
    return {
        translatedText: match?.[2] ?? line,
        warningCodes: [],
        rawLine: line,
    };
}

function ProgressTaskDetails({
    task,
    now,
}: {
    task: ProgressTask;
    now: number;
}) {
    if (task.steps.length === 0) {
        return null;
    }

    const richStep = task.steps
        .map((step) => ({
            step,
            detail: parseStepDescription(step.description),
        }))
        .find(
            ({ detail }) =>
                detail.metadataLines.length > 0 ||
                detail.timelineLines.length > 0,
        );

    return (
        <div
            className={`mt-3 grid min-h-0 gap-3 ${
                richStep
                    ? "xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]"
                    : ""
            }`}
        >
            <div className="space-y-3">
                <div className="border border-main bg-secondary/15">
                    <div className="flex items-center justify-between gap-2 border-b border-main px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                            Flow steps
                        </p>
                        <p className="text-[10px] text-muted">
                            {formatStepSummary(task.steps)}
                        </p>
                    </div>
                    <div className="divide-y divide-soft">
                        {task.steps.map((step) => (
                            <ProgressStepRow
                                key={step.id}
                                step={step}
                                now={now}
                            />
                        ))}
                    </div>
                </div>
                {richStep ? (
                    <ProgressRichStepPanel
                        step={richStep.step}
                        detail={richStep.detail}
                    />
                ) : null}
            </div>
            {richStep?.detail.timelineHeader &&
            richStep.detail.timelineLines.length > 0 ? (
                <div className="relative min-h-0">
                    <ProgressSegmentsPanel
                        step={richStep.step}
                        header={richStep.detail.timelineHeader}
                        lines={richStep.detail.timelineLines}
                    />
                </div>
            ) : null}
        </div>
    );
}

function ProgressRichStepPanel({
    step,
    detail,
}: {
    step: ProgressTaskStep;
    detail: ReturnType<typeof parseStepDescription>;
}) {
    return (
        <aside className="border border-main bg-main">
            <div className="border-b border-main bg-secondary/25 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Dubbing details
                </p>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-main">
                    {step.title}
                </p>
            </div>
            <div className="space-y-3 p-3">
                {detail.metadataLines.length > 0 ? (
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {detail.metadataLines.map((line, index) => {
                            const [label, ...valueParts] = line.split(":");
                            const normalizedLabel =
                                label === "Measured stages" ? "Stages" : label;
                            const value = valueParts
                                .join(":")
                                .trim()
                                .replace(/\bvoice render\b/gu, "voice")
                                .replace(
                                    /\bfinal video render\b/gu,
                                    "render (speed+mix+mirror+blur+sub)",
                                );
                            return (
                                <div
                                    key={`${step.id}-metadata-${index}`}
                                    className="border border-main bg-secondary/15 px-2 py-1.5"
                                >
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">
                                        {value ? normalizedLabel : "Detail"}
                                    </p>
                                    <p className="mt-0.5 break-words text-[10px] leading-4 text-main">
                                        {value || line}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </aside>
    );
}

function ProgressSegmentsPanel({
    step,
    header,
    lines,
}: {
    step: ProgressTaskStep;
    header: string;
    lines: string[];
}) {
    const [showSourceText, setShowSourceText] = useState(false);
    const [isEditingTranslations, setIsEditingTranslations] = useState(false);
    const [editedTextBySegmentId, setEditedTextBySegmentId] = useState<
        Record<string, string | undefined>
    >({});
    const segments = lines.map(parseProgressSegmentLine);
    const vipStepId = step.id.split(":")[0] ?? "";
    const vipNodeId = vipStepId.startsWith("vip-")
        ? vipStepId.slice("vip-".length)
        : "";
    const editableSegments = segments.filter(
        (
            segment,
        ): segment is ParsedProgressSegment & {
            id: number;
        } => typeof segment.id === "number",
    );
    const canEditVipTranslations =
        step.status === "success" &&
        vipNodeId.length > 0 &&
        editableSegments.length > 0;
    const segmentSignature = lines.join("\n");
    const changedCount = editableSegments.filter((segment) => {
        const edited = editedTextBySegmentId[String(segment.id)];
        return (
            edited !== undefined &&
            edited.trim() !== segment.translatedText.trim()
        );
    }).length;
    const hasEmptyEditedText = editableSegments.some((segment) => {
        const edited = editedTextBySegmentId[String(segment.id)];
        return edited !== undefined && edited.trim().length === 0;
    });

    useEffect(() => {
        setIsEditingTranslations(false);
        setEditedTextBySegmentId({});
    }, [step.id, segmentSignature]);

    const updateEditedSegmentText = (segmentId: number, value: string) => {
        setEditedTextBySegmentId((current) => {
            const next = { ...current };
            const original = editableSegments.find(
                (segment) => segment.id === segmentId,
            )?.translatedText;
            if (original !== undefined && value.trim() === original.trim()) {
                delete next[String(segmentId)];
            } else {
                next[String(segmentId)] = value;
            }
            return next;
        });
    };

    const runCorrectedVip = () => {
        if (
            !canEditVipTranslations ||
            changedCount === 0 ||
            hasEmptyEditedText
        ) {
            return;
        }
        dispatchWorkspaceVipTranslationCorrection({
            vipNodeId,
            segments: editableSegments.map((segment) => ({
                id: segment.id,
                translatedText:
                    editedTextBySegmentId[String(segment.id)] ??
                    segment.translatedText,
            })),
        });
        setIsEditingTranslations(false);
    };

    return (
        <section className="flex max-h-[32rem] min-h-0 flex-col border border-main bg-main xl:absolute xl:inset-0 xl:max-h-none">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main bg-secondary/25 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {header}
                </p>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {isEditingTranslations ? (
                        <span
                            className={`border px-2 py-1 text-[10px] font-semibold ${
                                hasEmptyEditedText
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                                    : "border-main bg-main text-muted"
                            }`}
                        >
                            {hasEmptyEditedText
                                ? "Empty segment"
                                : `${changedCount} edited`}
                        </span>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => setShowSourceText((current) => !current)}
                        className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                    >
                        {showSourceText ? "Hide source" : "Show source"}
                    </button>
                    {canEditVipTranslations ? (
                        <button
                            type="button"
                            onClick={() =>
                                setIsEditingTranslations((current) => !current)
                            }
                            className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                            title="Edit translated segment text"
                        >
                            <Pencil className="h-3 w-3" />
                            {isEditingTranslations ? "Done" : "Edit"}
                        </button>
                    ) : null}
                    {isEditingTranslations ? (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditedTextBySegmentId({})}
                                disabled={changedCount === 0}
                                className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                title="Reset edited segment text"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </button>
                            <button
                                type="button"
                                onClick={runCorrectedVip}
                                disabled={
                                    changedCount === 0 || hasEmptyEditedText
                                }
                                className="inline-flex items-center gap-1 border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                title="Run corrected VIP"
                            >
                                <FastForward className="h-3 w-3" />
                                Run corrected VIP
                            </button>
                        </>
                    ) : null}
                </div>
            </div>
            <div className="min-h-0 flex-1 divide-y divide-soft overflow-y-auto">
                {segments.map((segment, index) => {
                    const editableSegmentId =
                        typeof segment.id === "number" ? segment.id : null;
                    const isHighSpeed =
                        typeof segment.speedFactor === "number" &&
                        segment.speedFactor >= HIGH_PROGRESS_VOICE_SPEED_FACTOR;
                    const hasWarnings = segment.warningCodes.length > 0;
                    const tone = hasWarnings
                        ? "border-l-4 border-l-amber-500 bg-amber-500/10"
                        : isHighSpeed
                          ? "border-l-4 border-l-rose-500 bg-rose-500/10"
                          : "";

                    return (
                        <article
                            key={`${segment.id ?? index}-${index}`}
                            className={`px-2.5 py-1.5 ${tone}`}
                        >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="font-mono text-[10px] font-semibold text-main">
                                    #{segment.id ?? index + 1}
                                </span>
                                {segment.start !== undefined &&
                                segment.end !== undefined ? (
                                    <span className="font-mono text-[10px] text-muted">
                                        {formatSegmentTimestamp(segment.start)}{" "}
                                        {"->"}{" "}
                                        {formatSegmentTimestamp(segment.end)}
                                    </span>
                                ) : null}
                                {typeof segment.speedFactor === "number" ? (
                                    <span
                                        className={`border px-1.5 py-0.5 text-[9px] font-bold ${
                                            isHighSpeed || hasWarnings
                                                ? "border-rose-500/40 bg-rose-500/10 text-rose-700"
                                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                        }`}
                                    >
                                        {segment.speedFactor.toFixed(2)}x
                                    </span>
                                ) : null}
                                {hasWarnings ? (
                                    <span className="text-[9px] font-semibold text-amber-700">
                                        {segment.warningCodes.join(", ")}
                                    </span>
                                ) : null}
                                {segment.rawDurationSeconds !== undefined &&
                                segment.targetDurationSeconds !== undefined ? (
                                    <span className="font-mono text-[9px] text-muted">
                                        raw{" "}
                                        {segment.rawDurationSeconds.toFixed(2)}s
                                        / target{" "}
                                        {segment.targetDurationSeconds.toFixed(
                                            2,
                                        )}
                                        s
                                    </span>
                                ) : null}
                            </div>
                            <div
                                className={`mt-1 grid gap-1 ${
                                    showSourceText && segment.sourceText
                                        ? "sm:grid-cols-2"
                                        : ""
                                }`}
                            >
                                {isEditingTranslations &&
                                editableSegmentId !== null ? (
                                    <textarea
                                        value={
                                            editedTextBySegmentId[
                                                String(editableSegmentId)
                                            ] ??
                                            segment.translatedText ??
                                            segment.rawLine
                                        }
                                        onChange={(event) =>
                                            updateEditedSegmentText(
                                                editableSegmentId,
                                                event.currentTarget.value,
                                            )
                                        }
                                        className=" w-full resize-y border border-main bg-secondary/35 px-2 py-1 text-[10px] leading-3.5 text-main"
                                    />
                                ) : (
                                    <p className="text-[10px] leading-3.5 text-main">
                                        {segment.translatedText ||
                                            segment.rawLine}
                                    </p>
                                )}
                                {showSourceText && segment.sourceText ? (
                                    <p className="border-l border-main pl-2 text-[9px] leading-3.5 text-muted">
                                        {segment.sourceText}
                                    </p>
                                ) : null}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

function TaskProgressBar({ task }: { task: ProgressTask }) {
    const isFinished = task.status === "success" || task.status === "failed";
    return (
        <div className="mt-3 h-2 overflow-hidden border border-main bg-secondary">
            {task.progressMode === "determinate" || isFinished ? (
                <div
                    className={`h-full ${
                        task.status === "failed"
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                    } transition-all`}
                    style={{
                        width: `${isFinished ? 100 : task.progress}%`,
                    }}
                />
            ) : (
                <div
                    className={`h-full w-full animate-pulse ${
                        task.status === "failed"
                            ? "bg-rose-500/35"
                            : "bg-accent/35"
                    }`}
                />
            )}
        </div>
    );
}

function ProgressStepRow({
    step,
    now,
}: {
    step: ProgressTaskStep;
    now: number;
}) {
    const parsedDescription = parseStepDescription(step.description);
    const durationLabel =
        typeof step.durationMs === "number"
            ? formatDurationValueMs(step.durationMs)
            : step.startedAt
              ? formatDurationMs(step.startedAt, step.finishedAt ?? now)
              : "--:--";

    return (
        <div className="px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-2">
                    <StepStatusIcon step={step} />
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-semibold text-main">
                            {step.title}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-4 text-muted">
                            {parsedDescription.summary}
                        </p>
                        {parsedDescription.extra ? (
                            <p className="mt-1 text-[10px] leading-4 text-muted">
                                {parsedDescription.extra}
                            </p>
                        ) : null}
                    </div>
                </div>
                <div className="shrink-0 text-right text-[10px] text-muted">
                    <p className="font-mono uppercase tracking-wide">
                        {step.status}
                    </p>
                    <p className="mt-0.5">{durationLabel}</p>
                </div>
            </div>

            {step.progressMode === "determinate" &&
            (step.status === "running" || step.progress > 0) ? (
                <div className="mt-2">
                    <div className="h-1.5 overflow-hidden border border-main bg-secondary">
                        <div
                            className={`h-full ${
                                step.status === "failed"
                                    ? "bg-rose-500"
                                    : "bg-accent"
                            } transition-all`}
                            style={{ width: `${step.progress}%` }}
                        />
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                        {step.progress}% measured progress
                    </p>
                </div>
            ) : null}

            {step.error ? (
                <p className="mt-1.5 text-[10px] leading-4 text-rose-600">
                    {step.error}
                </p>
            ) : null}
        </div>
    );
}

function TaskStatusIcon({ task }: { task: ProgressTask }) {
    if (task.status === "success") {
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }

    if (task.status === "failed") {
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    }

    return <RefreshCw className="h-4 w-4 animate-spin text-accent" />;
}

function StepStatusIcon({ step }: { step: ProgressTaskStep }) {
    if (step.status === "success") {
        return <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />;
    }

    if (step.status === "failed") {
        return <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-rose-600" />;
    }

    if (step.status === "running") {
        return (
            <RefreshCw className="mt-0.5 h-3.5 w-3.5 animate-spin text-accent" />
        );
    }

    return <Gauge className="mt-0.5 h-3.5 w-3.5 text-muted" />;
}
