"use client";

import { useEffect, useMemo, useState } from "react";
import { Clapperboard, Download, FlipHorizontal2, Loader2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type MirrorApiPayload =
    | {
          ok: true;
          data: {
              videoBase64: string;
              mimeType: "video/mp4";
              fileName: string;
              byteLength: number;
              generationDurationMs: number;
              transform: { axis: "horizontal"; filter: "hflip" };
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type VideoToolsLabPanelProps = {
    section: LeftbarNavItem;
};

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function PlannedToolCard({
    title,
    description,
}: {
    title: string;
    description: string;
}) {
    return (
        <div className="border border-main bg-secondary/20 p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div>
                        <p className="text-xs font-semibold text-main">
                            {title}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-4 text-muted">
                            {description}
                        </p>
                    </div>
                </div>
                <span className="shrink-0 border border-main bg-main px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Planned
                </span>
            </div>
        </div>
    );
}

export function VideoToolsLabPanel({ section }: VideoToolsLabPanelProps) {
    const Icon = section.icon ?? Clapperboard;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [isRunningMirror, setIsRunningMirror] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<
        Extract<MirrorApiPayload, { ok: true }>["data"] | null
    >(null);

    const sourceVideoUrl = useMemo(() => {
        if (!videoFile) return null;
        return URL.createObjectURL(videoFile);
    }, [videoFile]);

    const mirroredVideoUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.videoBase64}`;
    }, [result]);

    useEffect(() => {
        return () => {
            if (sourceVideoUrl) URL.revokeObjectURL(sourceVideoUrl);
        };
    }, [sourceVideoUrl]);

    const runMirror = async () => {
        if (!videoFile) {
            setError("Hãy chọn video trước khi chạy Mirror Video.");
            return;
        }

        setIsRunningMirror(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.set("videoFile", videoFile);
            formData.set("axis", "horizontal");

            const response = await fetch("/api/video-processing/mirror", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as MirrorApiPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Mirror Video failed."}`
                        : (payload.error ?? "Mirror Video failed."),
                );
            }
            setResult(payload.data);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Mirror Video request failed.",
            );
        } finally {
            setIsRunningMirror(false);
        }
    };

    return (
        <main className="min-w-0 flex-1 overflow-auto bg-secondary/35">
            <section className="mx-auto max-w-7xl space-y-4 px-5 py-5">
                <header className="border border-main bg-main px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex h-9 w-9 items-center justify-center border border-main bg-secondary/30">
                                <Icon className="h-4 w-4 text-main" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-main">
                                    {section.label}
                                </p>
                                <p className="text-xs text-muted">
                                    {section.description}
                                </p>
                            </div>
                        </div>
                        <span className="border border-main bg-secondary/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                            Test-only
                        </span>
                    </div>
                </header>

                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <aside className="space-y-4">
                        <section className="border border-main bg-main p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Source Video
                            </p>
                            <label className="mt-3 block">
                                <span className="mb-1 block text-[11px] font-semibold text-main">
                                    Upload video
                                </span>
                                <input
                                    type="file"
                                    accept="video/*,.mp4,.webm,.mov"
                                    onChange={(event) => {
                                        setVideoFile(
                                            event.currentTarget.files?.[0] ??
                                                null,
                                        );
                                        setResult(null);
                                        setError(null);
                                    }}
                                    className="block w-full border border-main bg-secondary/20 px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-main file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                                />
                            </label>
                            {videoFile ? (
                                <div className="mt-3 border border-main bg-secondary/20 p-3 text-[11px] text-muted">
                                    <p className="truncate font-semibold text-main">
                                        {videoFile.name}
                                    </p>
                                    <p>{formatBytes(videoFile.size)}</p>
                                    <p>{videoFile.type || "unknown mime"}</p>
                                </div>
                            ) : (
                                <p className="mt-3 text-[11px] leading-4 text-muted">
                                    Chọn một file video local để thử tool mà
                                    không persist vào Storage Library.
                                </p>
                            )}
                        </section>

                        <section className="border border-main bg-main p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                Tools
                            </p>
                            <div className="mt-3 space-y-3">
                                <button
                                    type="button"
                                    onClick={runMirror}
                                    disabled={!videoFile || isRunningMirror}
                                    className="inline-flex w-full items-center justify-center gap-2 border border-main bg-secondary/30 px-3 py-2 text-xs font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isRunningMirror ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <FlipHorizontal2 className="h-4 w-4" />
                                    )}
                                    Mirror Video
                                </button>
                                <PlannedToolCard
                                    title="Partial Blur"
                                    description="Sẽ chọn vùng/timeline để blur logo hoặc subtitle."
                                />
                                <PlannedToolCard
                                    title="Audio Tools"
                                    description="Sẽ gom các tác vụ extract, transcript, dubbing và mix audio."
                                />
                            </div>
                        </section>
                    </aside>

                    <section className="grid gap-4 xl:grid-cols-2">
                        <div className="border border-main bg-main p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    Original Preview
                                </p>
                            </div>
                            {sourceVideoUrl ? (
                                <video
                                    controls
                                    src={sourceVideoUrl}
                                    className="max-h-[520px] w-full bg-black"
                                />
                            ) : (
                                <div className="flex min-h-72 items-center justify-center border border-dashed border-main bg-secondary/20 p-6 text-center text-xs text-muted">
                                    Upload video để xem preview gốc.
                                </div>
                            )}
                        </div>

                        <div className="border border-main bg-main p-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                                    Mirror Output
                                </p>
                                {result && mirroredVideoUrl ? (
                                    <a
                                        href={mirroredVideoUrl}
                                        download={result.fileName}
                                        className="inline-flex items-center gap-1 border border-main bg-secondary/30 px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        <Download className="h-3 w-3" />
                                        Download
                                    </a>
                                ) : null}
                            </div>
                            {mirroredVideoUrl ? (
                                <div className="space-y-3">
                                    <video
                                        controls
                                        src={mirroredVideoUrl}
                                        className="max-h-[520px] w-full bg-black"
                                    />
                                    <div className="grid gap-2 border border-main bg-secondary/20 p-3 text-[11px] text-muted sm:grid-cols-3">
                                        <p>
                                            <span className="block font-semibold text-main">
                                                File
                                            </span>
                                            {result?.fileName}
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Size
                                            </span>
                                            {formatBytes(
                                                result?.byteLength ?? 0,
                                            )}
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Runtime
                                            </span>
                                            {result?.generationDurationMs ?? 0}{" "}
                                            ms
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex min-h-72 items-center justify-center border border-dashed border-main bg-secondary/20 p-6 text-center text-xs text-muted">
                                    Chạy Mirror Video để tạo preview lật ngang.
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {error ? (
                    <div className="border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-700 dark:text-red-200">
                        {error}
                    </div>
                ) : null}
            </section>
        </main>
    );
}
