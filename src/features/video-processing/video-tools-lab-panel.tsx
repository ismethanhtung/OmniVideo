"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Captions,
    Clapperboard,
    Download,
    FlipHorizontal2,
    Loader2,
    ScanLine,
    Wand2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type VideoEditApiPayload =
    | {
          ok: true;
          data: {
              videoBase64: string;
              mimeType: "video/mp4";
              fileName: string;
              byteLength: number;
              generationDurationMs: number;
              transform: {
                  mirror: boolean;
                  partialBlur: boolean;
                  subtitleOverlay: boolean;
                  segmentCount: number;
              };
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

function InfoCard({
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
                    Ready
                </span>
            </div>
        </div>
    );
}

const sampleTranslatedSegmentsJson = JSON.stringify(
    [
        {
            id: 1,
            start: 0,
            end: 2.8,
            sourceText: "source subtitle",
            translatedText:
                "Phụ đề tiếng Việt sẽ hiển thị ở đây, dài hơn thì sao?",
        },
    ],
    null,
    2,
);

export function VideoToolsLabPanel({ section }: VideoToolsLabPanelProps) {
    const Icon = section.icon ?? Clapperboard;
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [mirrorEnabled, setMirrorEnabled] = useState(true);
    const [blurEnabled, setBlurEnabled] = useState(true);
    const [subtitleOverlayEnabled, setSubtitleOverlayEnabled] = useState(true);
    const [regionX, setRegionX] = useState(0);
    const [regionY, setRegionY] = useState(84);
    const [regionWidth, setRegionWidth] = useState(100);
    const [regionHeight, setRegionHeight] = useState(16);
    const [timelineStart, setTimelineStart] = useState(0);
    const [timelineEnd, setTimelineEnd] = useState(999999);
    const [blurStrength, setBlurStrength] = useState(18);
    const [subtitleFontFamily, setSubtitleFontFamily] = useState("Arial");
    const [subtitleFontSize, setSubtitleFontSize] = useState(64);
    const [subtitleMarginBottom, setSubtitleMarginBottom] = useState(280);
    const [translatedSegmentsJson, setTranslatedSegmentsJson] = useState("");
    const [isRunningEdit, setIsRunningEdit] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<
        Extract<VideoEditApiPayload, { ok: true }>["data"] | null
    >(null);

    const sourceVideoUrl = useMemo(() => {
        if (!videoFile) return null;
        return URL.createObjectURL(videoFile);
    }, [videoFile]);

    const editedVideoUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.videoBase64}`;
    }, [result]);

    useEffect(() => {
        return () => {
            if (sourceVideoUrl) URL.revokeObjectURL(sourceVideoUrl);
        };
    }, [sourceVideoUrl]);

    const runCombinedEdit = async () => {
        if (!videoFile) {
            setError("Hãy chọn video trước khi chạy Video Edit.");
            return;
        }
        if (!mirrorEnabled && !blurEnabled && !subtitleOverlayEnabled) {
            setError(
                "Hãy bật ít nhất một transform: mirror, blur hoặc subtitle.",
            );
            return;
        }
        if (blurEnabled && !translatedSegmentsJson.trim()) {
            setError(
                "Partial Blur cần translated subtitle segments để đè phụ đề tiếng Việt.",
            );
            return;
        }

        setIsRunningEdit(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.set("videoFile", videoFile);
            formData.set("mirrorEnabled", String(mirrorEnabled));
            formData.set("blurEnabled", String(blurEnabled));
            formData.set(
                "subtitleOverlayEnabled",
                String(subtitleOverlayEnabled),
            );
            formData.set("regionX", String(regionX));
            formData.set("regionY", String(regionY));
            formData.set("regionWidth", String(regionWidth));
            formData.set("regionHeight", String(regionHeight));
            formData.set("timelineStart", String(timelineStart));
            formData.set("timelineEnd", String(timelineEnd));
            formData.set("blurStrength", String(blurStrength));
            formData.set("subtitleFontFamily", subtitleFontFamily);
            formData.set("subtitleFontSize", String(subtitleFontSize));
            formData.set("subtitleMarginBottom", String(subtitleMarginBottom));
            formData.set("translatedSegmentsJson", translatedSegmentsJson);

            const response = await fetch("/api/video-processing/edit", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as VideoEditApiPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Video Edit failed."}`
                        : (payload.error ?? "Video Edit failed."),
                );
            }
            setResult(payload.data);
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Video Edit request failed.",
            );
        } finally {
            setIsRunningEdit(false);
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
                <div className="grid shrink-0 grid-cols-2 gap-2 text-[10px] text-muted">
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Engine</p>
                        <p>ffmpeg filters</p>
                    </div>
                    <div className="border border-main bg-main px-3 py-2">
                        <p className="font-semibold text-main">Scope</p>
                        <p>Lab + Workspace</p>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 p-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <Clapperboard className="h-4 w-4 text-muted" />
                            <p className="text-[12px] font-semibold text-main">
                                Source Video
                            </p>
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Video file
                            </span>
                            <input
                                type="file"
                                accept="video/*,.mp4,.webm,.mov"
                                onChange={(event) => {
                                    setVideoFile(
                                        event.currentTarget.files?.[0] ?? null,
                                    );
                                    setResult(null);
                                    setError(null);
                                }}
                                className="block w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-main"
                            />
                        </label>
                        {videoFile ? (
                            <p className="mt-2 truncate text-[11px] text-muted">
                                {videoFile.name} · {formatBytes(videoFile.size)}
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            Combined Tools
                        </p>
                        <p className="text-[10px] leading-4 text-muted">
                            Chạy trực tiếp trên video local. Một request có thể
                            kết hợp mirror, blur vùng/timeline và burn phụ đề
                            tiếng Việt theo timestamps.
                        </p>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <FlipHorizontal2 className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Mirror horizontal
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Lật ngang bằng ffmpeg hflip.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={mirrorEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) =>
                                    setMirrorEnabled(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <ScanLine className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Partial Blur + stamp
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Blur luôn đi kèm phụ đề/stamp overlay.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={blurEnabled}
                                disabled={isRunningEdit}
                                onChange={(event) => {
                                    const nextValue =
                                        event.currentTarget.checked;
                                    setBlurEnabled(nextValue);
                                    if (nextValue) {
                                        setSubtitleOverlayEnabled(true);
                                    }
                                }}
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        <label className="flex items-center justify-between gap-3 border border-main bg-main px-3 py-2">
                            <span className="flex items-start gap-2">
                                <Captions className="mt-0.5 h-3.5 w-3.5 text-muted" />
                                <span>
                                    <span className="block text-[11px] font-semibold text-main">
                                        Burn Vietnamese subtitles
                                    </span>
                                    <span className="block text-[10px] text-muted">
                                        Dùng translated segments có start/end.
                                    </span>
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={subtitleOverlayEnabled}
                                disabled={isRunningEdit || blurEnabled}
                                onChange={(event) =>
                                    setSubtitleOverlayEnabled(
                                        event.currentTarget.checked,
                                    )
                                }
                                className="h-4 w-4 accent-[var(--color-accent)]"
                            />
                        </label>

                        {blurEnabled ? (
                            <div className="grid gap-2 border border-main bg-main p-3">
                                <p className="text-[11px] font-semibold text-main">
                                    Blur region (% of output frame)
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        ["X", regionX, setRegionX],
                                        ["Y", regionY, setRegionY],
                                        ["Width", regionWidth, setRegionWidth],
                                        [
                                            "Height",
                                            regionHeight,
                                            setRegionHeight,
                                        ],
                                    ].map(([label, value, setter]) => (
                                        <label
                                            key={String(label)}
                                            className="block"
                                        >
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                {String(label)}
                                            </span>
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                value={Number(value)}
                                                disabled={isRunningEdit}
                                                onChange={(event) =>
                                                    (
                                                        setter as (
                                                            nextValue: number,
                                                        ) => void
                                                    )(
                                                        Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    )
                                                }
                                                className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                            />
                                        </label>
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Start (s)
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={timelineStart}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setTimelineStart(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            End (s)
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            value={timelineEnd}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setTimelineEnd(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Strength
                                        </span>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={blurStrength}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setBlurStrength(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : null}

                        {subtitleOverlayEnabled ? (
                            <div className="space-y-2 border border-main bg-main p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold text-main">
                                        Translated segments JSON
                                    </p>
                                    <button
                                        type="button"
                                        disabled={isRunningEdit}
                                        onClick={() =>
                                            setTranslatedSegmentsJson(
                                                sampleTranslatedSegmentsJson,
                                            )
                                        }
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        Sample
                                    </button>
                                </div>
                                <textarea
                                    value={translatedSegmentsJson}
                                    disabled={isRunningEdit}
                                    onChange={(event) =>
                                        setTranslatedSegmentsJson(
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder='[{"id":1,"start":0,"end":2.5,"sourceText":"...","translatedText":"..."}]'
                                    className="min-h-16 w-full border border-main bg-secondary/30 px-2 py-1.5 font-mono text-[10px] leading-4 text-main placeholder:text-muted/60"
                                />
                                <div className="grid grid-cols-3 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Font
                                        </span>
                                        <input
                                            value={subtitleFontFamily}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleFontFamily(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Cỡ chữ
                                        </span>
                                        <input
                                            type="number"
                                            min={20}
                                            max={96}
                                            value={subtitleFontSize}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleFontSize(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Vị trí dọc
                                        </span>
                                        <input
                                            type="number"
                                            min={20}
                                            max={520}
                                            value={subtitleMarginBottom}
                                            disabled={isRunningEdit}
                                            onChange={(event) =>
                                                setSubtitleMarginBottom(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-secondary/30 px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                </div>
                                <p className="text-[10px] leading-4 text-muted">
                                    Paste `translatedSegments` từ Audio
                                    Transcript. Workspace sẽ tự lấy kết quả từ
                                    node Translate Transcript upstream.
                                </p>
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={runCombinedEdit}
                            disabled={!videoFile || isRunningEdit}
                            className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {isRunningEdit ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            {isRunningEdit ? "Editing..." : "Run Video Edit"}
                        </button>

                        {error ? (
                            <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                {error}
                            </p>
                        ) : null}

                        <InfoCard
                            title="Partial Blur"
                            description="Blur subtitle/logo theo region/timeline và burn phụ đề tiếng Việt trong cùng output."
                        />
                        <InfoCard
                            title="Audio Tools"
                            description="Transcript/translation timestamps có thể nối vào Workspace edit node."
                        />
                    </div>
                </aside>

                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
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
                            <div className="flex min-h-72 items-center justify-center border border-dashed border-main bg-main p-6 text-center text-[11px] text-muted">
                                Upload video để xem preview gốc.
                            </div>
                        )}
                    </div>

                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
                                Edited Output
                            </p>
                        </div>
                        {editedVideoUrl ? (
                            <div className="space-y-3">
                                <video
                                    controls
                                    src={editedVideoUrl}
                                    className="max-h-[520px] w-full bg-black"
                                />
                                <div className="flex flex-wrap items-start justify-between gap-3 w-full">
                                    <div className="grid gap-2 border border-main w-full bg-main p-3 text-[11px] text-muted sm:grid-cols-4">
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
                                        <p>
                                            <span className="block font-semibold text-main">
                                                Segments
                                            </span>
                                            {result?.transform.segmentCount ??
                                                0}
                                        </p>
                                        <p>
                                            <span className="block font-semibold text-main">
                                                File
                                            </span>
                                            {result?.fileName}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex min-h-72 items-center justify-center border border-dashed border-main bg-main p-6 text-center text-[11px] text-muted">
                                Chạy Video Edit để preview output gồm mirror,
                                blur và subtitle overlay.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}
