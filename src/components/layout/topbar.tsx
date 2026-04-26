"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Moon,
    RefreshCw,
    Sun,
    X,
} from "lucide-react";

import { getNavItem } from "@/components/layout/navigation";
import type { AppSectionId } from "@/components/layout/types";
import {
    clearFinishedProgressTasks,
    dismissProgressTask,
    getProgressTasksSnapshot,
    subscribeProgressTasks,
    type ProgressTask,
} from "@/lib/ui/progress-center";

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
                <button
                    type="button"
                    onClick={() => setShowProgress(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                    aria-label="Open background progress"
                >
                    <Activity
                        className={`h-3.5 w-3.5 ${activeCount > 0 ? "text-accent" : ""}`}
                    />
                    Progress
                    <span className="text-[10px]">{activeCount}</span>
                </button>
                <button
                    type="button"
                    onClick={onRefreshView}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
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
        </header>
    );
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
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 md:p-6">
            <section className="flex max-h-[90vh] w-full max-w-3xl flex-col border border-main bg-main shadow-xl">
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
                                    <div className="mt-3 h-2 overflow-hidden border border-main bg-secondary">
                                        <div
                                            className={`h-full ${
                                                task.status === "failed"
                                                    ? "bg-rose-500"
                                                    : "bg-emerald-500"
                                            } transition-all`}
                                            style={{
                                                width: `${task.progress}%`,
                                            }}
                                        />
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted">
                                        <span>{task.progress}%</span>
                                        <span>
                                            {task.status} · updated{" "}
                                            {formatProgressTime(task.updatedAt)}{" "}
                                            · duration{" "}
                                            {formatDurationMs(
                                                task.startedAt,
                                                task.finishedAt ??
                                                    task.updatedAt,
                                            )}
                                        </span>
                                    </div>
                                    {task.error ? (
                                        <p className="mt-2 text-[11px] leading-5 text-rose-600">
                                            {task.error}
                                        </p>
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

function TaskStatusIcon({ task }: { task: ProgressTask }) {
    if (task.status === "success") {
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
    }

    if (task.status === "failed") {
        return <AlertTriangle className="h-4 w-4 text-rose-600" />;
    }

    return <RefreshCw className="h-4 w-4 animate-spin text-accent" />;
}
