"use client";

import { useState } from "react";
import { Download, Scissors } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";
import {
    finishProgressTask,
    startProgressTask,
    updateProgressTask,
} from "@/lib/ui/progress-center";

type VideoSplitterPanelProps = {
    section: LeftbarNavItem;
};

type SubmitState =
    | { status: "idle"; message: string }
    | { status: "running"; message: string }
    | {
          status: "success";
          message: string;
          downloadUrl: string;
          archiveName: string;
          outputCount: number;
      }
    | { status: "failed"; message: string; errorCode?: string };

type SplitMode = "interval" | "head";

export function VideoSplitterPanel({ section }: VideoSplitterPanelProps) {
    const Icon = section.icon ?? Scissors;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [mode, setMode] = useState<SplitMode>("interval");
    const [intervalMinutes, setIntervalMinutes] = useState(30);
    const [headMinutes, setHeadMinutes] = useState(15);
    const [state, setState] = useState<SubmitState>({
        status: "idle",
        message:
            "Chọn video local, chia theo block 30p/1h hoặc trích đoạn đầu 15p/30p.",
    });

    const runSplit = async () => {
        if (!videoFile) {
            setState({
                status: "failed",
                message: "Please choose a local video file first.",
                errorCode: "VAL_VIDEO_REQUIRED",
            });
            return;
        }

        setState({
            status: "running",
            message: "Preparing split job...",
        });
        const taskId = startProgressTask({
            title: "Video splitter",
            description: "Uploading source video...",
            scope: "video-split",
            progress: 20,
        });

        try {
            const formData = new FormData();
            formData.set("videoFile", videoFile);
            formData.set("mode", mode);
            if (mode === "interval") {
                formData.set("intervalMinutes", String(intervalMinutes));
            } else {
                formData.set("headMinutes", String(headMinutes));
            }

            updateProgressTask(taskId, {
                description: "Splitting video with ffmpeg...",
                progress: 70,
            });
            const response = await fetch("/api/video-processing/split", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: {
                    outputCount: number;
                    archiveName: string;
                    downloadUrl: string;
                };
                error?: string;
                errorCode?: string;
            };

            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(payload.error || "Video split failed.");
            }

            updateProgressTask(taskId, {
                description: "Sending zip download to browser...",
                progress: 95,
            });
            const link = document.createElement("a");
            link.href = payload.data.downloadUrl;
            link.setAttribute("download", "");
            document.body.appendChild(link);
            link.click();
            link.remove();

            setState({
                status: "success",
                message:
                    "Split finished. Download request sent to browser. Use direct link below if needed.",
                downloadUrl: payload.data.downloadUrl,
                archiveName: payload.data.archiveName,
                outputCount: payload.data.outputCount,
            });
            finishProgressTask({
                id: taskId,
                status: "success",
                description: "Video split package ready.",
            });
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Video split failed.",
            });
            finishProgressTask({
                id: taskId,
                status: "failed",
                description: "Video split failed.",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };

    return (
        <section className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="space-y-3 border border-main bg-main p-4">
                    <label className="block text-xs font-semibold text-main">
                        Source video (local file)
                    </label>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={(event) =>
                            setVideoFile(event.currentTarget.files?.[0] ?? null)
                        }
                        className="w-full border border-main bg-secondary px-3 py-2 text-xs text-main"
                    />
                    {videoFile ? (
                        <p className="text-[11px] text-muted">
                            Selected: {videoFile.name}
                        </p>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-1 block text-[11px] font-semibold text-main">
                                Split mode
                            </span>
                            <select
                                value={mode}
                                onChange={(event) =>
                                    setMode(
                                        event.currentTarget.value as SplitMode,
                                    )
                                }
                                className="w-full border border-main bg-secondary px-2 py-1.5 text-xs text-main"
                            >
                                <option value="interval">
                                    Split by interval
                                </option>
                                <option value="head">Clip head only</option>
                            </select>
                        </label>
                        {mode === "interval" ? (
                            <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-main">
                                    Interval minutes
                                </span>
                                <select
                                    value={intervalMinutes}
                                    onChange={(event) =>
                                        setIntervalMinutes(
                                            Number(event.currentTarget.value),
                                        )
                                    }
                                    className="w-full border border-main bg-secondary px-2 py-1.5 text-xs text-main"
                                >
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </label>
                        ) : (
                            <label className="block">
                                <span className="mb-1 block text-[11px] font-semibold text-main">
                                    Head clip minutes
                                </span>
                                <select
                                    value={headMinutes}
                                    onChange={(event) =>
                                        setHeadMinutes(
                                            Number(event.currentTarget.value),
                                        )
                                    }
                                    className="w-full border border-main bg-secondary px-2 py-1.5 text-xs text-main"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                </select>
                            </label>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void runSplit()}
                            disabled={state.status === "running"}
                            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-2 text-xs font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Scissors className="h-4 w-4" />
                            {state.status === "running"
                                ? "Splitting..."
                                : "Split & Download ZIP"}
                        </button>
                    </div>
                </div>

                <aside className="space-y-3 border border-main bg-main p-4">
                    <p className="text-xs font-semibold text-main">
                        Run Status
                    </p>
                    <div className="text-[10px] font-bold uppercase tracking-wide">
                        <StatusText status={state.status} />
                    </div>
                    <p className="text-xs leading-5 text-main">
                        {state.message}
                    </p>
                    {state.status === "success" ? (
                        <div className="space-y-2 text-xs text-main">
                            <p>
                                Output files:{" "}
                                <span className="font-semibold">
                                    {state.outputCount}
                                </span>
                            </p>
                            <p>
                                Package:{" "}
                                <span className="font-semibold">
                                    {state.archiveName}
                                </span>
                            </p>
                            <a
                                href={state.downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 underline underline-offset-2"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Open direct download link
                            </a>
                        </div>
                    ) : null}
                </aside>
            </div>
        </section>
    );
}
