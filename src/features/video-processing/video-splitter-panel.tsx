"use client";

import { useState } from "react";
import { Briefcase, Merge, Scissors, Download } from "lucide-react";

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
    const Icon = section.icon ?? Briefcase;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [mergeFiles, setMergeFiles] = useState<File[]>([]);
    const [mode, setMode] = useState<SplitMode>("interval");
    const [intervalMinutes, setIntervalMinutes] = useState(30);
    const [headMinutes, setHeadMinutes] = useState(15);
    const [splitParts, setSplitParts] = useState(2);
    const [state, setState] = useState<SubmitState>({
        status: "idle",
        message:
            "Use Split for chunking and Merge for combining parts. Merge uses stream-copy to keep CPU/RAM low.",
    });

    const appendMergeFile = (file: File | null) => {
        if (!file) return;
        setMergeFiles((previous) => [...previous, file]);
    };

    const runSplit = async () => {
        if (!videoFile) {
            setState({
                status: "failed",
                message: "Vui lòng chọn video local trước khi chạy split.",
                errorCode: "VAL_VIDEO_REQUIRED",
            });
            return;
        }

        setState({ status: "running", message: "Đang chuẩn bị split..." });
        const taskId = startProgressTask({
            title: "Video split",
            description: "Uploading source video...",
            scope: "system",
            progress: 20,
        });

        try {
            const formData = new FormData();
            formData.set("videoFile", videoFile);
            formData.set("mode", mode);
            if (mode === "interval")
                formData.set("intervalMinutes", String(intervalMinutes));
            else if (mode === "parts")
                formData.set("splitParts", String(splitParts));
            else formData.set("headMinutes", String(headMinutes));

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
            };

            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(payload.error || "Video split failed.");
            }

            const link = document.createElement("a");
            link.href = payload.data.downloadUrl;
            link.setAttribute("download", "");
            document.body.appendChild(link);
            link.click();
            link.remove();

            setState({
                status: "success",
                message:
                    "Split hoàn tất. Đã gửi request tải ZIP về browser. Nếu chưa thấy download, bấm link trực tiếp.",
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

    const runMerge = async () => {
        if (mergeFiles.length < 2) {
            setState({
                status: "failed",
                message: "Vui lòng chọn ít nhất 2 video để merge.",
                errorCode: "VAL_VIDEO_FILES_MIN_REQUIRED",
            });
            return;
        }

        setState({ status: "running", message: "Đang chuẩn bị merge..." });
        const taskId = startProgressTask({
            title: "Video merge",
            description: "Uploading video parts...",
            scope: "system",
            progress: 20,
        });

        try {
            const formData = new FormData();
            for (const file of mergeFiles) formData.append("videoFiles", file);

            updateProgressTask(taskId, {
                description: "Merging videos with ffmpeg concat copy...",
                progress: 70,
            });
            const response = await fetch("/api/video-processing/merge", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: {
                    inputCount: number;
                    fileName: string;
                    downloadUrl: string;
                };
                error?: string;
            };

            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(payload.error || "Video merge failed.");
            }

            const link = document.createElement("a");
            link.href = payload.data.downloadUrl;
            link.setAttribute("download", "");
            document.body.appendChild(link);
            link.click();
            link.remove();

            setState({
                status: "success",
                message:
                    "Merge hoàn tất. Đã gửi request tải file MP4 merged về browser.",
                downloadUrl: payload.data.downloadUrl,
                archiveName: payload.data.fileName,
                outputCount: payload.data.inputCount,
            });
            finishProgressTask({
                id: taskId,
                status: "success",
                description: "Merged video ready.",
            });
        } catch (error) {
            setState({
                status: "failed",
                message:
                    error instanceof Error
                        ? error.message
                        : "Video merge failed.",
            });
            finishProgressTask({
                id: taskId,
                status: "failed",
                description: "Video merge failed.",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
    };

    return (
        <section className="space-y-4 border border-main bg-main p-4 md:p-5">
            <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                <div className="space-y-4">
                    <article className="space-y-3 border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <Scissors className="h-4 w-4 text-main" />
                            <p className="text-[12px] font-semibold text-main">
                                Split Video
                            </p>
                        </div>
                        <label className="block">
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
                                    <option value={3}>3 minutes</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                </select>
                            </label>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void runSplit()}
                            disabled={state.status === "running"}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Split + Download ZIP
                        </button>
                    </article>

                    <article className="space-y-3 border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <Merge className="h-4 w-4 text-main" />
                            <p className="text-[12px] font-semibold text-main">
                                Merge Videos
                            </p>
                        </div>
                        <label className="block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video files (2+)
                            </span>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={(event) => {
                                    appendMergeFile(
                                        event.currentTarget.files?.[0] ?? null,
                                    );
                                    event.currentTarget.value = "";
                                }}
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-muted">
                                {mergeFiles.length > 0
                                    ? `${mergeFiles.length} file(s) added`
                                    : "Chưa chọn file merge"}
                            </p>
                            {mergeFiles.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setMergeFiles([])}
                                    className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                >
                                    Clear queue
                                </button>
                            ) : null}
                        </div>
                        <button
                            type="button"
                            onClick={() => void runMerge()}
                            disabled={state.status === "running"}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Merge + Download MP4
                        </button>
                    </article>
                </div>

                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Run Output
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-muted">
                            Kết quả, trạng thái và link tải trực tiếp.
                        </p>
                    </div>

                    <section className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Merge Queue
                        </p>
                        {mergeFiles.length === 0 ? (
                            <p className="mt-1 text-[11px] text-muted">
                                Chưa có file nào trong hàng đợi merge.
                            </p>
                        ) : (
                            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto border border-main bg-main p-2">
                                {mergeFiles.map((file, index) => (
                                    <p
                                        key={`${file.name}-${index}-${file.size}`}
                                        className="truncate text-[11px] text-main"
                                    >
                                        {index + 1}. {file.name}
                                    </p>
                                ))}
                            </div>
                        )}
                    </section>
                    <section className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2 text-[11px]">
                            <StatusText
                                status={
                                    state.status === "idle"
                                        ? "neutral"
                                        : state.status
                                }
                                className="text-[11px]"
                            />
                            <p className="text-[11px] text-muted">
                                {state.message}
                            </p>
                        </div>
                        {state.status === "success" ? (
                            <div className="mt-3 space-y-1 text-[11px] text-main">
                                <p>
                                    Artifact:{" "}
                                    <span className="font-semibold">
                                        {state.archiveName}
                                    </span>
                                </p>
                                <p>
                                    Count:{" "}
                                    <span className="font-semibold">
                                        {state.outputCount}
                                    </span>
                                </p>
                                <a
                                    href={state.downloadUrl}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
                                >
                                    <Download className="h-3.5 w-3.5" />{" "}
                                    Download trực tiếp
                                </a>
                            </div>
                        ) : null}
                    </section>
                </aside>
            </div>
        </section>
    );
}
