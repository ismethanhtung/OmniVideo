"use client";

import { useEffect, useState } from "react";
import { Briefcase, Merge, Scissors, Download, GripVertical, X } from "lucide-react";

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

type SplitMode = "interval" | "parts" | "head" | "short";

type MergeVideoMetadata =
    | {
          status: "ready";
          width: number;
          height: number;
          durationSeconds: number;
      }
    | { status: "error" };

const SPLIT_MODE_OPTIONS: Array<{ value: SplitMode; label: string }> = [
    { value: "interval", label: "Block" },
    { value: "parts", label: "Parts" },
    { value: "head", label: "Head clip" },
    { value: "short", label: "YouTube Short 9:16" },
];

function formatAspectRatio(width: number, height: number) {
    if (!width || !height) return "Unknown ratio";
    const divisor = (left: number, right: number): number =>
        right === 0 ? left : divisor(right, left % right);
    const factor = divisor(width, height);
    return `${width / factor}:${height / factor}`;
}

export function VideoSplitterPanel({ section }: VideoSplitterPanelProps) {
    const Icon = section.icon ?? Briefcase;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [mergeFiles, setMergeFiles] = useState<File[]>([]);
    const [mergePreviewUrls, setMergePreviewUrls] = useState<string[]>([]);
    const [mergeVideoMetadata, setMergeVideoMetadata] = useState<
        Record<string, MergeVideoMetadata>
    >({});
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);
    const [draggedMergeIndex, setDraggedMergeIndex] = useState<number | null>(
        null,
    );
    const [mode, setMode] = useState<SplitMode>("interval");
    const [intervalMinutes, setIntervalMinutes] = useState(30);
    const [headMinutes, setHeadMinutes] = useState(15);
    const [shortStartSeconds, setShortStartSeconds] = useState(0);
    const [shortDurationSeconds, setShortDurationSeconds] = useState(60);
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

    const moveMergeFile = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        setMergeFiles((previous) => {
            const next = [...previous];
            const [file] = next.splice(fromIndex, 1);
            if (!file) return previous;
            next.splice(toIndex, 0, file);
            return next;
        });
    };

    const removeMergeFile = (index: number) => {
        setMergeFiles((previous) =>
            previous.filter((_, fileIndex) => fileIndex !== index),
        );
    };

    useEffect(() => {
        const urls = mergeFiles.map((file) => URL.createObjectURL(file));
        let isCurrent = true;
        setMergePreviewUrls(urls);
        setMergeVideoMetadata({});
        setActivePreviewIndex(0);
        urls.forEach((url) => {
            const video = document.createElement("video");
            video.preload = "metadata";
            video.onloadedmetadata = () => {
                if (!isCurrent || !video.videoWidth || !video.videoHeight)
                    return;
                setMergeVideoMetadata((previous) => ({
                    ...previous,
                    [url]: {
                        status: "ready",
                        width: video.videoWidth,
                        height: video.videoHeight,
                        durationSeconds: video.duration,
                    },
                }));
            };
            video.onerror = () => {
                if (!isCurrent) return;
                setMergeVideoMetadata((previous) => ({
                    ...previous,
                    [url]: { status: "error" },
                }));
            };
            video.src = url;
        });
        return () => {
            isCurrent = false;
            urls.forEach((url) => URL.revokeObjectURL(url));
        };
    }, [mergeFiles]);

    const referenceMergeFormat = mergePreviewUrls
        .map((url) => mergeVideoMetadata[url])
        .find(
            (metadata): metadata is Extract<MergeVideoMetadata, { status: "ready" }> =>
                metadata?.status === "ready",
        );

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
            message:
                mode === "short"
                    ? "Đang chuẩn bị YouTube Short..."
                    : "Đang chuẩn bị split...",
        });
        const taskId = startProgressTask({
            title: mode === "short" ? "YouTube Short" : "Video split",
            description: "Uploading source video...",
            scope: "system",
            progress: 20,
        });

        try {
            const formData = new FormData();
            formData.set("videoFile", videoFile);
            if (mode === "short") {
                if (
                    !Number.isFinite(shortStartSeconds) ||
                    !Number.isFinite(shortDurationSeconds) ||
                    shortStartSeconds < 0 ||
                    shortDurationSeconds <= 0
                ) {
                    throw new Error(
                        "YouTube Short cần start >= 0 và duration > 0 giây.",
                    );
                }
                formData.set("responseMode", "binary");
                formData.set("shortClipEnabled", "true");
                formData.set("shortClipStart", String(shortStartSeconds));
                formData.set(
                    "shortClipDuration",
                    String(shortDurationSeconds),
                );

                updateProgressTask(taskId, {
                    description: "Rendering 9:16 short with ffmpeg...",
                    progress: 70,
                });
                const response = await fetch("/api/video-processing/edit", {
                    method: "POST",
                    body: formData,
                });
                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(text || "YouTube Short render failed.");
                }
                const blob = await response.blob();
                const fileName = decodeURIComponent(
                    response.headers.get("X-OmniVideo-File-Name") ||
                        "youtube-short.mp4",
                );
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = downloadUrl;
                link.setAttribute("download", fileName);
                document.body.appendChild(link);
                link.click();
                link.remove();

                setState({
                    status: "success",
                    message:
                        "YouTube Short hoàn tất. Đã gửi request tải MP4 về browser.",
                    downloadUrl,
                    archiveName: fileName,
                    outputCount: 1,
                });
                finishProgressTask({
                    id: taskId,
                    status: "success",
                    description: "YouTube Short MP4 ready.",
                });
                return;
            }

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
                                <option value="short">
                                    YouTube Short 9:16
                                </option>
                            </select>
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                            {SPLIT_MODE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setMode(option.value)}
                                    className={`border px-2 py-1.5 text-left text-[10px] font-semibold ${
                                        mode === option.value
                                            ? "border-accent bg-accent/10 text-accent"
                                            : "border-main bg-main text-main hover:bg-secondary"
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
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
                        {mode === "short" ? (
                            <div className="space-y-2">
                                <div className="flex items-center gap-1">
                                    {[60, 120, 180].map((seconds) => (
                                        <button
                                            key={seconds}
                                            type="button"
                                            onClick={() =>
                                                setShortDurationSeconds(seconds)
                                            }
                                            className={`border border-main px-2 py-1 text-[10px] font-semibold ${
                                                shortDurationSeconds === seconds
                                                    ? "bg-accent text-on-accent"
                                                    : "bg-main text-main hover:bg-secondary"
                                            }`}
                                        >
                                            {seconds / 60}m
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Start (seconds)
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={shortStartSeconds}
                                            onChange={(event) =>
                                                setShortStartSeconds(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Duration (seconds)
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            value={shortDurationSeconds}
                                            onChange={(event) =>
                                                setShortDurationSeconds(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void runSplit()}
                            disabled={state.status === "running"}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {mode === "short"
                                ? "Render Short + Download MP4"
                                : "Split + Download ZIP"}
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
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Merge Queue
                            </p>
                            <p className="text-[10px] text-muted">
                                Kéo thả để đổi thứ tự
                            </p>
                        </div>
                        {mergeFiles.length === 0 ? (
                            <p className="mt-1 text-[11px] text-muted">
                                Chưa có file nào trong hàng đợi merge.
                            </p>
                        ) : (
                            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto border border-main bg-main p-2">
                                {mergeFiles.map((file, index) => {
                                    const metadata = mergePreviewUrls[index]
                                        ? mergeVideoMetadata[
                                              mergePreviewUrls[index]
                                          ]
                                        : undefined;
                                    return (
                                    <div
                                        key={`${file.name}-${index}-${file.size}`}
                                        draggable
                                        onDragStart={(event) => {
                                            setDraggedMergeIndex(index);
                                            event.dataTransfer.effectAllowed =
                                                "move";
                                        }}
                                        onDragOver={(event) => {
                                            event.preventDefault();
                                            event.dataTransfer.dropEffect =
                                                "move";
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (draggedMergeIndex === null)
                                                return;
                                            moveMergeFile(
                                                draggedMergeIndex,
                                                index,
                                            );
                                            setDraggedMergeIndex(null);
                                        }}
                                        onDragEnd={() =>
                                            setDraggedMergeIndex(null)
                                        }
                                        className={`flex items-center gap-1.5 border px-2 py-1.5 text-[11px] text-main ${
                                            draggedMergeIndex === index
                                                ? "border-accent bg-accent/10"
                                                : "border-transparent bg-secondary/20"
                                        }`}
                                    >
                                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted" />
                                        <span className="w-4 shrink-0 font-semibold text-muted">
                                            {index + 1}.
                                        </span>
                                        <span className="min-w-0 flex-1 truncate">
                                            {file.name}
                                        </span>
                                        {metadata?.status === "ready" ? (
                                            <span className="shrink-0 text-[9px] text-muted">
                                                {metadata.width}×
                                                {metadata.height}
                                            </span>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={() => removeMergeFile(index)}
                                            className="shrink-0 p-0.5 text-muted hover:text-rose-600"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                    <section className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Merge Preview
                            </p>
                            {mergeFiles.length > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setActivePreviewIndex(0)}
                                    className="text-[10px] font-semibold text-accent hover:underline"
                                >
                                    Preview from first
                                </button>
                            ) : null}
                        </div>
                        {mergeFiles.length === 0 ||
                        !mergePreviewUrls[activePreviewIndex] ? (
                            <p className="mt-1 text-[11px] leading-5 text-muted">
                                Add videos to preview their merge order locally.
                            </p>
                        ) : (
                            <div className="mt-2">
                                <p className="mb-2 text-[10px] text-muted">
                                    Playing {activePreviewIndex + 1}/
                                    {mergeFiles.length}: {" "}
                                    {mergeFiles[activePreviewIndex]?.name}
                                </p>
                                <video
                                    key={mergePreviewUrls[activePreviewIndex]}
                                    controls
                                    autoPlay={activePreviewIndex > 0}
                                    className="aspect-video w-full bg-black"
                                    src={mergePreviewUrls[activePreviewIndex]}
                                    onEnded={() =>
                                        setActivePreviewIndex((current) =>
                                            current < mergeFiles.length - 1
                                                ? current + 1
                                                : 0,
                                        )
                                    }
                                />
                                <p className="mt-2 text-[10px] leading-4 text-muted">
                                    This is a local sequential preview only. It
                                    does not upload or merge files until you
                                    press Merge + Download MP4.
                                </p>
                            </div>
                        )}
                        {mergeFiles.length > 0 ? (
                            <div className="mt-3 border-t border-main pt-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Format Compatibility
                                    </p>
                                    {referenceMergeFormat ? (
                                        <p className="text-[10px] text-muted">
                                            Base: {referenceMergeFormat.width}×
                                            {referenceMergeFormat.height} · {" "}
                                            {formatAspectRatio(
                                                referenceMergeFormat.width,
                                                referenceMergeFormat.height,
                                            )}
                                        </p>
                                    ) : null}
                                </div>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                    {mergeFiles.map((file, index) => {
                                        const metadata = mergePreviewUrls[index]
                                            ? mergeVideoMetadata[
                                                  mergePreviewUrls[index]
                                              ]
                                            : undefined;
                                        const matchesBase =
                                            metadata?.status === "ready" &&
                                            referenceMergeFormat &&
                                            metadata.width ===
                                                referenceMergeFormat.width &&
                                            metadata.height ===
                                                referenceMergeFormat.height;
                                        return (
                                            <div
                                                key={`format-${file.name}-${index}-${file.size}`}
                                                className={`flex gap-2 border p-2 ${
                                                    matchesBase
                                                        ? "border-sky-500/70 bg-sky-500/5"
                                                        : metadata?.status ===
                                                            "ready"
                                                          ? "border-amber-500/70 bg-amber-500/5"
                                                          : "border-main bg-main"
                                                }`}
                                            >
                                                <div className="flex h-16 w-20 shrink-0 items-center justify-center border border-dashed border-main bg-secondary/30 p-1">
                                                    {metadata?.status ===
                                                    "ready" ? (
                                                        <div
                                                            className={`border-2 ${
                                                                matchesBase
                                                                    ? "border-sky-500"
                                                                    : "border-amber-500"
                                                            }`}
                                                            style={{
                                                                width:
                                                                    metadata.width >=
                                                                    metadata.height
                                                                        ? "100%"
                                                                        : `${(metadata.width / metadata.height) * 100}%`,
                                                                aspectRatio: `${metadata.width} / ${metadata.height}`,
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-[9px] text-muted">
                                                            ?
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-[10px] font-semibold text-main">
                                                        {index + 1}. {file.name}
                                                    </p>
                                                    {metadata?.status === "ready" ? (
                                                        <>
                                                            <p className="mt-1 text-[10px] text-main">
                                                                {metadata.width}×
                                                                {metadata.height} · {" "}
                                                                {formatAspectRatio(
                                                                    metadata.width,
                                                                    metadata.height,
                                                                )}
                                                            </p>
                                                            <p className="text-[10px] text-muted">
                                                                {Math.round(
                                                                    metadata.durationSeconds,
                                                                )}
                                                                s
                                                            </p>
                                                            <p
                                                                className={`mt-1 text-[10px] font-semibold ${
                                                                    matchesBase
                                                                        ? "text-sky-700"
                                                                        : "text-amber-700"
                                                                }`}
                                                            >
                                                                {matchesBase
                                                                    ? "Matches base format"
                                                                    : "Different from base format"}
                                                            </p>
                                                        </>
                                                    ) : metadata?.status ===
                                                      "error" ? (
                                                        <p className="mt-1 text-[10px] text-rose-700">
                                                            Cannot read local video metadata.
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-[10px] text-muted">
                                                            Reading local format...
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {referenceMergeFormat &&
                                mergePreviewUrls.some((url) => {
                                    const metadata = mergeVideoMetadata[url];
                                    return (
                                        metadata?.status === "ready" &&
                                        (metadata.width !==
                                            referenceMergeFormat.width ||
                                            metadata.height !==
                                                referenceMergeFormat.height)
                                    );
                                }) ? (
                                    <p className="mt-2 border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-4 text-amber-800">
                                        Format mismatch: stream-copy merge may
                                        fail or create an unsuitable result.
                                        Match the same width and height before
                                        merging, or re-encode the videos first.
                                    </p>
                                ) : null}
                            </div>
                        ) : null}
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
