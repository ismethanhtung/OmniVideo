"use client";

import { useEffect, useRef, useState } from "react";
import {
    Film,
    GripVertical,
    Music2,
    Plus,
    Save,
    Trash2,
    Type,
    Volume2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type VideoComposerPanelProps = {
    section: LeftbarNavItem;
};

type ComposerClip = {
    id: string;
    file: File;
};

function makeClipId() {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function VideoComposerPanel({ section }: VideoComposerPanelProps) {
    const Icon = section.icon ?? Film;
    const [clips, setClips] = useState<ComposerClip[]>([]);
    const [clipUrls, setClipUrls] = useState<string[]>([]);
    const [clipDurations, setClipDurations] = useState<Record<string, number>>(
        {},
    );
    const [activeClipIndex, setActiveClipIndex] = useState(0);
    const [previewSeconds, setPreviewSeconds] = useState(0);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [musicFile, setMusicFile] = useState<File | null>(null);
    const [musicUrl, setMusicUrl] = useState<string | null>(null);
    const [originalAudioVolume, setOriginalAudioVolume] = useState(100);
    const [musicVolume, setMusicVolume] = useState(30);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [vintageEnabled, setVintageEnabled] = useState(false);
    const [overlayText, setOverlayText] = useState("");
    const [fontFamily, setFontFamily] = useState("Bangers");
    const [fontSize, setFontSize] = useState(48);
    const [textPosition, setTextPosition] = useState({ x: 50, y: 78 });
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [isRendering, setIsRendering] = useState(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const musicRef = useRef<HTMLAudioElement | null>(null);
    const previewFrameRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const urls = clips.map((clip) => URL.createObjectURL(clip.file));
        setClipUrls(urls);
        setClipDurations({});
        setActiveClipIndex(0);
        setPreviewSeconds(0);
        return () => urls.forEach((url) => URL.revokeObjectURL(url));
    }, [clips]);

    useEffect(() => {
        if (!musicFile) {
            setMusicUrl(null);
            return;
        }
        const url = URL.createObjectURL(musicFile);
        setMusicUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [musicFile]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = originalAudioVolume / 100;
    }, [originalAudioVolume, activeClipIndex]);

    useEffect(() => {
        if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
    }, [playbackSpeed, activeClipIndex]);

    useEffect(() => {
        if (musicRef.current) musicRef.current.volume = musicVolume / 100;
    }, [musicVolume, musicUrl]);

    const activeClip = clips[activeClipIndex];
    const timelineDuration = clips.reduce(
        (total, clip) => total + (clipDurations[clip.id] ?? 0) / playbackSpeed,
        0,
    );
    const composerSeconds =
        clips.slice(0, activeClipIndex).reduce(
            (total, clip) =>
                total + (clipDurations[clip.id] ?? 0) / playbackSpeed,
            0,
        ) + previewSeconds / playbackSpeed;
    const playheadPercent = timelineDuration
        ? Math.min(100, (composerSeconds / timelineDuration) * 100)
        : 0;

    const syncMusicToPreview = (video: HTMLVideoElement, shouldPlay = false) => {
        const music = musicRef.current;
        if (!musicUrl || !music || !Number.isFinite(music.duration)) return;
        const target = composerSeconds;
        const wrappedTime = music.duration > 0 ? target % music.duration : 0;
        if (Math.abs(music.currentTime - wrappedTime) > 0.35) {
            music.currentTime = wrappedTime;
        }
        music.volume = musicVolume / 100;
        if (shouldPlay) void music.play().catch(() => undefined);
    };

    const updateTextPosition = (clientX: number, clientY: number) => {
        const frame = previewFrameRef.current;
        if (!frame) return;
        const bounds = frame.getBoundingClientRect();
        const clamp = (value: number) => Math.min(96, Math.max(4, value));
        setTextPosition({
            x: clamp(((clientX - bounds.left) / bounds.width) * 100),
            y: clamp(((clientY - bounds.top) / bounds.height) * 100),
        });
    };

    const addClips = (files: FileList | null) => {
        const videos = Array.from(files ?? []).filter((file) =>
            file.type.startsWith("video/"),
        );
        if (!videos.length) return;
        setClips((previous) => [
            ...previous,
            ...videos.map((file) => ({ id: makeClipId(), file })),
        ]);
    };

    const moveClip = (from: number, to: number) => {
        if (from === to) return;
        setClips((previous) => {
            const next = [...previous];
            const [clip] = next.splice(from, 1);
            if (!clip) return previous;
            next.splice(to, 0, clip);
            return next;
        });
    };

    const saveProject = async () => {
        if (!clips.length) {
            setRenderError("Add at least one video clip before rendering.");
            return;
        }
        setIsRendering(true);
        setRenderError(null);
        try {
            const formData = new FormData();
            for (const clip of clips) formData.append("videoFiles", clip.file);
            if (musicFile) formData.set("musicFile", musicFile);
            formData.set(
                "settingsJson",
                JSON.stringify({
                    originalAudioVolume,
                    musicVolume,
                    speed: playbackSpeed,
                    vintageFilm: vintageEnabled,
                    textOverlay: {
                        text: overlayText,
                        fontFamily,
                        fontSize,
                        textPosition,
                    },
                }),
            );
            const response = await fetch("/api/video-processing/composer-render", {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                    error?: string;
                } | null;
                throw new Error(payload?.error || "Video Composer render failed.");
            }
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = decodeURIComponent(
                response.headers.get("X-OmniVideo-File-Name") ||
                    "video-composer.mp4",
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            setRenderError(
                error instanceof Error
                    ? error.message
                    : "Video Composer render failed.",
            );
        } finally {
            setIsRendering(false);
        }
    };

    return (
        <section className="border border-main bg-main">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-main bg-secondary/45 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-accent" />
                    <div>
                        <h1 className="text-sm font-semibold text-main">Video Composer</h1>
                        <p className="mt-0.5 text-[11px] text-muted">Preview-first workbench · your project changes only save when you choose Save Project.</p>
                    </div>
                </div>
                <button type="button" disabled={isRendering} onClick={() => void saveProject()} className="inline-flex items-center gap-1.5 border border-accent/35 bg-accent/10 px-3 py-2 text-[11px] font-semibold text-accent hover:bg-accent/15 disabled:cursor-wait disabled:opacity-60">
                    <Save className="h-3.5 w-3.5" /> {isRendering ? "Rendering final MP4..." : "Save Project + Download MP4"}
                </button>
            </header>

            <div className="grid gap-4 p-4 xl:grid-cols-[300px_minmax(0,1fr)_300px]">
                <aside className="space-y-3">
                    <section className="border border-main bg-secondary/20 p-3">
                        <p className="text-[12px] font-semibold text-main">Media Bin</p>
                        <label className="mt-2 block border border-dashed border-main bg-main p-3 text-center text-[11px] text-muted hover:bg-secondary">
                            <Plus className="mx-auto h-4 w-4 text-accent" />
                            <span className="mt-1 block">Add video clips</span>
                            <input type="file" accept="video/*" multiple onChange={(event) => { addClips(event.currentTarget.files); event.currentTarget.value = ""; }} className="sr-only" />
                        </label>
                        <label className="mt-2 block border border-main bg-main px-2 py-2 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px]">
                            <Music2 className="mr-1 inline h-3.5 w-3.5 text-accent" /> Upload music
                            <input type="file" accept="audio/*" onChange={(event) => setMusicFile(event.currentTarget.files?.[0] ?? null)} className="mt-2 block w-full text-[10px]" />
                        </label>
                        {musicUrl ? (
                            <audio ref={musicRef} loop src={musicUrl} />
                        ) : null}
                    </section>
                    <section className="border border-main bg-secondary/20 p-3">
                        <p className="text-[12px] font-semibold text-main">Audio</p>
                        <label className="mt-2 block text-[10px] text-muted">Original audio · {originalAudioVolume}%<input type="range" min={0} max={100} value={originalAudioVolume} onChange={(event) => setOriginalAudioVolume(Number(event.target.value))} className="mt-1 w-full accent-[var(--accent-color)]" /></label>
                        <label className="mt-2 block text-[10px] text-muted">Music mix · {musicVolume}%<input type="range" min={0} max={100} value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} className="mt-1 w-full accent-[var(--accent-color)]" /></label>
                        <p className="mt-2 text-[10px] leading-4 text-muted">Uploaded music now plays in sync with the video preview.</p>
                    </section>
                </aside>

                <main className="min-w-0 space-y-3">
                    <section className="border border-main bg-black p-3">
                        <div ref={previewFrameRef} onPointerMove={(event) => { if (isDraggingText) updateTextPosition(event.clientX, event.clientY); }} onPointerUp={() => setIsDraggingText(false)} onPointerLeave={() => setIsDraggingText(false)} className="relative mx-auto aspect-video max-w-4xl overflow-hidden bg-black">
                            {clipUrls[activeClipIndex] ? <video ref={videoRef} controls autoPlay={activeClipIndex > 0} onLoadedMetadata={(event) => { const video = event.currentTarget; const duration = video.duration; if (activeClip && Number.isFinite(duration) && duration >= 0) setClipDurations((previous) => ({ ...previous, [activeClip.id]: duration })); video.playbackRate = playbackSpeed; }} onPlay={(event) => syncMusicToPreview(event.currentTarget, true)} onPause={() => musicRef.current?.pause()} onSeeking={(event) => syncMusicToPreview(event.currentTarget)} onTimeUpdate={(event) => { setPreviewSeconds(event.currentTarget.currentTime); syncMusicToPreview(event.currentTarget); }} onEnded={() => { if (activeClipIndex < clipUrls.length - 1) setActiveClipIndex((index) => index + 1); else { musicRef.current?.pause(); setActiveClipIndex(0); } }} src={clipUrls[activeClipIndex]} className="h-full w-full object-contain" style={vintageEnabled ? { filter: "sepia(.17) contrast(1.12) saturate(.78) brightness(.93)" } : undefined} /> : <div className="flex h-full items-center justify-center text-[12px] text-zinc-400">Add clips to start your local preview.</div>}
                            {vintageEnabled ? <><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(23,12,4,.48)_100%)]" /><div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,246,211,.9)_0.7px,transparent_0.8px),linear-gradient(90deg,transparent_49%,rgba(255,255,255,.3)_50%,transparent_51%)] [background-size:3px_3px,94px_100%]" /></> : null}
                            {overlayText ? <div onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setIsDraggingText(true); updateTextPosition(event.clientX, event.clientY); }} className="absolute z-10 cursor-move select-none whitespace-pre-wrap text-center text-white [text-shadow:2px_2px_0_#000]" style={{ fontFamily, fontSize: `${fontSize}px`, left: `${textPosition.x}%`, top: `${textPosition.y}%`, transform: "translate(-50%, -50%)" }}>{overlayText}</div> : null}
                        </div>
                        <p className="mt-2 text-[10px] text-zinc-400">Music, speed, Vintage Film and text are synced in preview and applied when you save the final MP4. Drag text directly on video.</p>
                        {renderError ? <p className="mt-2 border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[10px] leading-4 text-rose-200">{renderError}</p> : null}
                    </section>
                    <section className="border border-main bg-[#17181c] p-3 text-white">
                        <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-semibold">Timeline · drag to reorder</p><span className="text-[10px] text-zinc-400">{clips.length} clip(s) · {playbackSpeed}x</span></div>
                        <div className="relative mt-3 overflow-x-auto border border-zinc-700 bg-[#101114] p-3">
                            <div className="mb-2 flex min-w-[720px] justify-between border-b border-dashed border-zinc-700 pb-1 text-[9px] text-zinc-500"><span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span><span>00:40</span><span>00:50</span><span>01:00</span></div>
                            {clips.length > 0 ? <div className="pointer-events-none absolute bottom-3 top-8 z-20 w-px bg-cyan-200" style={{ left: `calc(12px + ${playheadPercent}% - 1px)` }}><span className="absolute -left-1.5 -top-2 h-3 w-3 rotate-45 border border-cyan-100 bg-cyan-500" /></div> : null}
                            <div className="grid min-w-[720px] grid-cols-[72px_minmax(0,1fr)] gap-2">
                                <div className="flex items-center text-[10px] text-zinc-400">Video</div>
                                <div className="flex min-h-20 gap-1">
                            {clips.length === 0 ? (
                                <p className="m-auto text-[11px] text-zinc-500">
                                    Your clip timeline will appear here.
                                </p>
                            ) : (
                                clips.map((clip, index) => (
                                    <div
                                        key={clip.id}
                                        draggable
                                        onDragStart={() => setDraggedIndex(index)}
                                        onDragOver={(event) =>
                                            event.preventDefault()
                                        }
                                        onDrop={() => {
                                            if (draggedIndex !== null)
                                                moveClip(draggedIndex, index);
                                            setDraggedIndex(null);
                                        }}
                                        onDragEnd={() => setDraggedIndex(null)}
                                        onClick={() => setActiveClipIndex(index)}
                                        style={{ flexGrow: Math.max(1, (clipDurations[clip.id] ?? 5) / 5) }}
                                        className={`min-w-28 cursor-grab border p-2 ${
                                            activeClipIndex === index
                                                ? "border-cyan-300 bg-cyan-900/50"
                                                : "border-cyan-700 bg-cyan-950/50"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <GripVertical className="h-3.5 w-3.5 text-cyan-200" />
                                            <button
                                                type="button"
                                                aria-label={`Remove ${clip.file.name}`}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setClips((previous) =>
                                                        previous.filter(
                                                            (_, clipIndex) =>
                                                                clipIndex !== index,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5 text-cyan-100 hover:text-rose-300" />
                                            </button>
                                        </div>
                                        <p className="mt-2 truncate text-[10px] font-semibold text-white">
                                            {index + 1}. {clip.file.name}
                                        </p>
                                        <p className="mt-1 truncate text-[9px] text-cyan-100/80">{vintageEnabled ? "Effects · Vintage" : "Clip"} · {playbackSpeed}x</p>
                                    </div>
                                ))
                            )}
                                </div>
                                <div className="flex items-center text-[10px] text-zinc-400">Music</div>
                                <div className="min-h-12">
                                    {musicUrl ? <div className="flex h-12 items-center overflow-hidden border border-blue-500/70 bg-blue-900/70 px-3 text-[10px] text-blue-50 [background-image:linear-gradient(135deg,transparent_0_18%,rgba(147,197,253,.45)_19%_21%,transparent_22%_38%,rgba(147,197,253,.35)_39%_42%,transparent_43%_60%,rgba(147,197,253,.45)_61%_64%,transparent_65%)] [background-size:32px_100%]"><Music2 className="mr-2 h-3.5 w-3.5" />{musicFile?.name} · synced preview</div> : <div className="flex h-12 items-center border border-dashed border-zinc-700 px-3 text-[10px] text-zinc-600">Upload music to add an audio track.</div>}
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <aside className="space-y-3">
                    <section className="border border-main bg-secondary/20 p-3"><div className="flex items-center gap-2"><Film className="h-4 w-4 text-accent" /><p className="text-[12px] font-semibold text-main">Look & Speed</p></div><label className="mt-3 flex items-center justify-between gap-2 text-[11px] text-main"><span>Retro / Vintage Film Effect</span><input type="checkbox" checked={vintageEnabled} onChange={(event) => setVintageEnabled(event.target.checked)} /></label><p className="mt-1 text-[10px] leading-4 text-muted">Subtle warm grade, restrained grain, vignette, and fine film scratches.</p><label className="mt-3 block text-[10px] text-muted">Video speed<select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value))} className="mt-1 w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"><option value={0.5}>0.5x</option><option value={0.75}>0.75x</option><option value={1}>1.0x</option><option value={1.25}>1.25x</option><option value={1.5}>1.5x</option><option value={2}>2.0x</option></select></label></section>
                    <section className="border border-main bg-secondary/20 p-3"><div className="flex items-center gap-2"><Type className="h-4 w-4 text-accent" /><p className="text-[12px] font-semibold text-main">Text Overlay</p></div><textarea value={overlayText} onChange={(event) => setOverlayText(event.target.value)} placeholder="Type text for the video" rows={3} className="mt-2 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] text-main" /><label className="mt-2 block text-[10px] text-muted">Font<select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="mt-1 w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"><option>Bangers</option><option>Lobster</option><option>Arial</option></select></label><label className="mt-2 block text-[10px] text-muted">Font size · {fontSize}px<input type="range" min={4} max={120} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-1 w-full accent-[var(--accent-color)]" /></label><p className="mt-1 text-[10px] text-muted">Drag text directly in the preview to position it.</p></section>
                    <section className="border border-main bg-secondary/20 p-3 text-[10px] leading-4 text-muted"><div className="flex items-center gap-1.5 text-main"><Volume2 className="h-3.5 w-3.5" /> Preview-first workflow</div><p className="mt-1">Arrange and test locally. Press Save Project once to export the exact timeline and settings JSON.</p></section>
                </aside>
            </div>
        </section>
    );
}
