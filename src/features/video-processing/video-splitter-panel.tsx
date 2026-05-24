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

type SplitMode = "interval" | "parts" | "head";

export function VideoSplitterPanel({ section }: VideoSplitterPanelProps) {
    const Icon = section.icon ?? Scissors;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [mode, setMode] = useState<SplitMode>("interval");
    const [intervalMinutes, setIntervalMinutes] = useState(30);
    const [headMinutes, setHeadMinutes] = useState(15);
    const [splitParts, setSplitParts] = useState(2);
    const [state, setState] = useState<SubmitState>({
        status: "idle",
        message:
            "Chọn video local, chia theo block 30p/45p/1h, chia đều theo số phần, hoặc trích đoạn đầu 15p/30p. Video gốc được giữ nguyên.",
    });

    const runSplit = async () => {
        if (!videoFile) {
            setState({
                status: "failed",
                message: "Vui lòng chọn video local trước khi chạy split.",
                errorCode: "VAL_VIDEO_REQUIRED",
            });
            return;
        }

        setState({
            status: "running",
            message: "Đang chuẩn bị split...",
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
            } else if (mode === "parts") {
                formData.set("splitParts", String(splitParts));
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
                    "Split hoàn tất. Đã gửi request tải ZIP về browser. Nếu chưa thấy download, bấm link trực tiếp bên dưới.",
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
        <section className="border border-main bg-main">
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
                <div className="grid shrink-0 grid-cols-3 gap-2 text-[10px] text-muted">
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Split modes</p>
                        <p>Interval / Parts / Head clip</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">
                            Interval presets
                        </p>
                        <p>30m · 45m · 60m</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Output</p>
                        <p>ZIP + direct download</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 p-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Source Video
                        </p>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video file
                            </span>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(event) =>
                                    setVideoFile(
                                        event.currentTarget.files?.[0] ?? null,
                                    )
                                }
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        <p className="mt-2 text-[11px] text-muted">
                            {videoFile
                                ? `${videoFile.name} · ${(videoFile.size / 1024 / 1024).toFixed(2)} MB`
                                : "Không có tệp nào được chọn"}
                        </p>
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Split mode
                            </span>
                            <select
                                value={mode}
                                onChange={(event) =>
                                    setMode(
                                        event.currentTarget.value as SplitMode,
                                    )
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                            >
                                <option value="interval">
                                    Chia theo block thời lượng
                                </option>
                                <option value="parts">
                                    Chia đều theo số phần
                                </option>
                                <option value="head">Chỉ cắt đoạn đầu</option>
                            </select>
                        </label>

                        {mode === "interval" ? (
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Block duration
                                </span>
                                <select
                                    value={intervalMinutes}
                                    onChange={(event) =>
                                        setIntervalMinutes(
                                            Number(event.currentTarget.value),
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                >
                                    <option value={30}>30 minutes</option>
                                    <option value={45}>45 minutes</option>
                                    <option value={60}>60 minutes</option>
                                </select>
                            </label>
                        ) : null}

                        {mode === "parts" ? (
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Number of parts
                                </span>
                                <input
                                    type="number"
                                    min={2}
                                    max={60}
                                    step={1}
                                    value={splitParts}
                                    onChange={(event) =>
                                        setSplitParts(
                                            Number(event.currentTarget.value) ||
                                                2,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                />
                                <p className="mt-1 text-[10px] leading-4 text-muted">
                                    Nhập số phần cần cắt (2-60), hệ thống tự
                                    chia đều theo tổng thời lượng.
                                </p>
                            </label>
                        ) : null}

                        {mode === "head" ? (
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Head clip duration
                                </span>
                                <select
                                    value={headMinutes}
                                    onChange={(event) =>
                                        setHeadMinutes(
                                            Number(event.currentTarget.value),
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                >
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                </select>
                            </label>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => void runSplit()}
                            disabled={state.status === "running"}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {state.status === "running"
                                ? "Đang split..."
                                : "Split + Download ZIP"}
                        </button>
                    </div>
                </aside>

                <div className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Output package
                        </p>
                        <p className="mt-1 text-[10px] leading-4 text-muted">
                            Các file split giữ tên gốc + hậu tố part. Ví dụ:
                            `ten-goc-part-001.mp4`.
                        </p>
                        <div className="mt-3 border border-main bg-main p-3 text-[11px] leading-5 text-main">
                            <p>
                                Tên nguồn:{" "}
                                {videoFile?.name ?? "chưa chọn video"}
                            </p>
                            <p>
                                Quy ước ZIP:{" "}
                                <span className="font-semibold">
                                    {"<ten-goc>.zip"}
                                </span>
                            </p>
                            <p>
                                Quy ước phần:{" "}
                                <span className="font-semibold">
                                    {"<ten-goc>-part-001.mp4"}
                                </span>
                            </p>
                        </div>
                    </div>

                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Run Status
                        </p>
                        <div className="mt-2 text-[10px] font-bold uppercase tracking-wide">
                            <StatusText status={state.status} />
                        </div>
                        <p className="mt-2 text-[11px] leading-5 text-main">
                            {state.message}
                        </p>
                        {state.status === "success" ? (
                            <div className="mt-3 space-y-2 border border-main bg-main p-3 text-[11px] text-main">
                                <p>
                                    Số file output:{" "}
                                    <span className="font-semibold">
                                        {state.outputCount}
                                    </span>
                                </p>
                                <p>
                                    Gói tải:{" "}
                                    <span className="font-semibold">
                                        {state.archiveName}
                                    </span>
                                </p>
                                <a
                                    href={state.downloadUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent underline underline-offset-2"
                                >
                                    <Download className="h-3.5 w-3.5" />
                                    Download trực tiếp
                                </a>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
}
