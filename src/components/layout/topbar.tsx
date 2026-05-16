"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Moon,
    Gauge,
    Lightbulb,
    Orbit,
    RefreshCw,
    Rocket,
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
import { INSPIRATION_VAULT_UPDATED_EVENT } from "@/lib/inspiration-vault/inspiration-vault";
import { createInspirationVaultItemFromApi } from "@/lib/inspiration-vault/client";

type TopbarProps = {
    activeSection: AppSectionId;
    onRefreshView: () => void;
    themeMode: "light" | "dark";
    onToggleTheme: () => void;
};

export function Topbar({
    activeSection,
    onRefreshView,
    themeMode,
    onToggleTheme,
}: TopbarProps) {
    const currentSection = getNavItem(activeSection);
    const [showProgress, setShowProgress] = useState(false);
    const [showSystemSnapshot, setShowSystemSnapshot] = useState(false);
    const [showOwnerAccess, setShowOwnerAccess] = useState(false);
    const [appAccess, setAppAccess] = useState<AppAccessState | null>(null);
    const [quickCapture, setQuickCapture] = useState("");
    const [quickCaptureStatus, setQuickCaptureStatus] = useState<
        "idle" | "saving" | "saved" | "empty" | "error" | "locked"
    >("idle");
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
                    <Rocket
                        className={`h-3.5 w-3.5 ${activeCount > 0 ? "text-accent" : ""}`}
                    />
                    Progress
                    <span className="text-[10px]">{activeCount}</span>
                </button>
                <button
                    type="button"
                    onClick={() => setShowSystemSnapshot(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    aria-label="Open system snapshot"
                >
                    <Gauge className="h-3.5 w-3.5" />
                    System
                </button>
                <button
                    type="button"
                    onClick={onRefreshView}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                >
                    <Orbit className="h-3.5 w-3.5" />
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
                />
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

function ProgressModal({
    tasks,
    onClose,
}: {
    tasks: ProgressTask[];
    onClose: () => void;
}) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 md:p-6">
            <section className="flex max-h-[90vh] w-full max-w-4xl flex-col border border-main bg-main shadow-xl">
                <header className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
                    <div>
                        <p className="text-[14px] font-semibold text-main">
                            Background Progress
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                            Upload, download, and publish jobs currently running
                            in this workspace.
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
                    <button
                        type="button"
                        onClick={clearFinishedProgressTasks}
                        className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                    >
                        Clear finished
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto">
                    {tasks.length === 0 ? (
                        <p className="px-4 py-8 text-[12px] text-muted">
                            Không có tác vụ nền nào đang chạy.
                        </p>
                    ) : (
                        <div className="divide-y divide-[var(--border)]">
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
                                    {task.steps.length > 0 ? (
                                        <div className="mt-3 border border-main bg-secondary/15">
                                            <div className="flex items-center justify-between gap-2 border-b border-main px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                                                    Flow steps
                                                </p>
                                                <p className="text-[10px] text-muted">
                                                    {formatStepSummary(
                                                        task.steps,
                                                    )}
                                                </p>
                                            </div>
                                            <div className="divide-y divide-[var(--border)]">
                                                {task.steps.map((step) => (
                                                    <ProgressStepRow
                                                        key={step.id}
                                                        step={step}
                                                        now={now}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : null}
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
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
                            {step.description ?? "Waiting to start."}
                        </p>
                    </div>
                </div>
                <div className="shrink-0 text-right text-[10px] text-muted">
                    <p className="font-mono uppercase tracking-wide">
                        {step.status}
                    </p>
                    <p className="mt-0.5">
                        {step.startedAt
                            ? formatDurationMs(
                                  step.startedAt,
                                  step.finishedAt ?? now,
                              )
                            : "--:--"}
                    </p>
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
