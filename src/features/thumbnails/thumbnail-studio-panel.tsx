"use client";

import { useMemo, useRef, useState } from "react";
import {
    Copy,
    Trash2,
    DownloadCloud,
    Filter,
    FolderSync,
    ImagePlus,
    Link2,
    Scissors,
    Search,
    Sparkles,
    Type,
    Wand2,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";

type ThumbnailStudioPanelProps = {
    section: LeftbarNavItem;
};

type ThumbnailLifecycleTag = "raw" | "processed" | "has-processed-output";
type ThumbnailEditMode = "create-variant" | "overwrite";
type ThumbnailCropPreset = "16:9" | "9:16" | "1:1" | "4:5";

type ThumbnailItem = {
    id: string;
    name: string;
    tags: ThumbnailLifecycleTag[];
    sourceLabel: string;
    previewGradient: string;
};

const THUMBNAIL_LIBRARY_SEED: ThumbnailItem[] = [
    {
        id: "thumb-001",
        name: "Movie Episode 01 - Hero Reveal",
        tags: ["raw"],
        sourceLabel: "Drive /movies/season-01",
        previewGradient: "from-amber-400/65 via-orange-300/45 to-rose-300/60",
    },
    {
        id: "thumb-002",
        name: "Movie Episode 02 - Tunnel Chase",
        tags: ["processed"],
        sourceLabel: "Drive /movies/season-01",
        previewGradient: "from-cyan-400/60 via-sky-300/40 to-indigo-400/60",
    },
    {
        id: "thumb-003",
        name: "Movie Episode 03 - Final Twist",
        tags: ["raw", "has-processed-output"],
        sourceLabel: "Drive /movies/season-01",
        previewGradient: "from-emerald-400/60 via-lime-300/35 to-yellow-300/55",
    },
];

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function buildId() {
    return `thumb-${Math.random().toString(36).slice(2, 9)}`;
}

function buildDuplicateName(name: string) {
    const trimmed = name.trim();
    return trimmed ? `${trimmed} (Copy)` : "Untitled thumbnail (Copy)";
}

function buildImportedName(value: string) {
    const clean = value.trim();
    return clean || "Untitled thumbnail";
}

function clampPercent(value: number) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
}

const LIFECYCLE_FILTERS: Array<"all" | ThumbnailLifecycleTag> = [
    "all",
    "raw",
    "processed",
    "has-processed-output",
];

export function ThumbnailStudioPanel({ section }: ThumbnailStudioPanelProps) {
    const Icon = section.icon ?? ImagePlus;
    const [thumbnails, setThumbnails] = useState(THUMBNAIL_LIBRARY_SEED);
    const [selectedThumbnailId, setSelectedThumbnailId] = useState(
        THUMBNAIL_LIBRARY_SEED[0]?.id ?? "",
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [lifecycleFilter, setLifecycleFilter] = useState<
        "all" | ThumbnailLifecycleTag
    >("all");
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [editMode, setEditMode] =
        useState<ThumbnailEditMode>("create-variant");
    const [cropPreset, setCropPreset] = useState<ThumbnailCropPreset>("16:9");
    const [blurEnabled, setBlurEnabled] = useState(true);
    const [blurStrength, setBlurStrength] = useState(28);
    const [overlayText, setOverlayText] = useState("EPISODE 01");
    const [fontFamily, setFontFamily] = useState("Montserrat");
    const [fontSize, setFontSize] = useState(72);
    const [fontWeight, setFontWeight] = useState(800);
    const [textColor, setTextColor] = useState("#ffffff");
    const [strokeColor, setStrokeColor] = useState("#111827");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [textPositionX, setTextPositionX] = useState(50);
    const [textPositionY, setTextPositionY] = useState(78);
    const [isDraggingText, setIsDraggingText] = useState(false);
    const [importMessage, setImportMessage] = useState("Ready.");
    const previewFrameRef = useRef<HTMLDivElement | null>(null);

    const visibleThumbnails = useMemo(() => {
        const normalizedQuery = searchQuery.trim().toLowerCase();
        return thumbnails.filter((thumbnail) => {
            const matchesTag =
                lifecycleFilter === "all" ||
                thumbnail.tags.includes(lifecycleFilter);
            if (!matchesTag) return false;
            if (!normalizedQuery) return true;

            const haystack = [
                thumbnail.name,
                thumbnail.sourceLabel,
                ...thumbnail.tags,
            ]
                .join(" ")
                .toLowerCase();
            return haystack.includes(normalizedQuery);
        });
    }, [lifecycleFilter, searchQuery, thumbnails]);

    const selectedThumbnail =
        thumbnails.find((item) => item.id === selectedThumbnailId) ?? null;

    const upsertThumbnail = (input: { name: string; sourceLabel: string }) => {
        const nextThumbnail: ThumbnailItem = {
            id: buildId(),
            name: buildImportedName(input.name),
            tags: ["raw"],
            sourceLabel: input.sourceLabel,
            previewGradient:
                "from-violet-400/60 via-fuchsia-300/40 to-pink-300/60",
        };
        setThumbnails((current) => [nextThumbnail, ...current]);
        setSelectedThumbnailId(nextThumbnail.id);
        setImportMessage(`Imported: ${nextThumbnail.name}`);
    };

    const handleDropUpload = (file: File | null) => {
        if (!file) return;
        upsertThumbnail({
            name: file.name.replace(/\.[a-z0-9]+$/iu, ""),
            sourceLabel: "Local drop upload",
        });
    };

    const handleImportFromUrl = () => {
        if (!importUrl.trim()) {
            setImportMessage("Please input an image URL first.");
            return;
        }
        upsertThumbnail({
            name: "Imported from URL",
            sourceLabel: "Remote URL import",
        });
        setImportUrl("");
    };

    const duplicateThumbnail = (thumbnail: ThumbnailItem) => {
        const nextThumbnail: ThumbnailItem = {
            ...thumbnail,
            id: buildId(),
            name: buildDuplicateName(thumbnail.name),
            tags:
                editMode === "overwrite"
                    ? thumbnail.tags
                    : ["raw", "has-processed-output"],
        };
        setThumbnails((current) => [nextThumbnail, ...current]);
        setSelectedThumbnailId(nextThumbnail.id);
        setImportMessage(`Duplicated: ${thumbnail.name}`);
    };

    const handleRename = (name: string) => {
        if (!selectedThumbnail) return;
        setThumbnails((current) =>
            current.map((item) =>
                item.id === selectedThumbnail.id ? { ...item, name } : item,
            ),
        );
    };

    const handleDelete = (thumbnailId: string) => {
        setThumbnails((current) => {
            const remaining = current.filter((item) => item.id !== thumbnailId);
            if (selectedThumbnailId === thumbnailId) {
                setSelectedThumbnailId(remaining[0]?.id ?? "");
            }
            return remaining;
        });
    };

    const handleDuplicateSelected = () => {
        if (!selectedThumbnail) return;
        duplicateThumbnail(selectedThumbnail);
    };

    const handleDeleteSelected = () => {
        if (!selectedThumbnail) return;
        handleDelete(selectedThumbnail.id);
    };

    const handleResetEditor = () => {
        setEditMode("create-variant");
        setCropPreset("16:9");
        setBlurEnabled(true);
        setBlurStrength(28);
        setOverlayText("EPISODE 01");
        setFontFamily("Montserrat");
        setFontSize(72);
        setFontWeight(800);
        setTextColor("#ffffff");
        setStrokeColor("#111827");
        setStrokeWidth(4);
        setTextPositionX(50);
        setTextPositionY(78);
        setImportMessage("Editor reset to default.");
    };

    const handleCanvasTextDrag = (clientX: number, clientY: number) => {
        const frame = previewFrameRef.current;
        if (!frame) return;
        const bounds = frame.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const xPercent = ((clientX - bounds.left) / bounds.width) * 100;
        const yPercent = ((clientY - bounds.top) / bounds.height) * 100;
        setTextPositionX(clampPercent(xPercent));
        setTextPositionY(clampPercent(yPercent));
    };

    return (
        <section className="w-full max-w-none border border-main bg-main">
            <div className="grid w-full gap-4 p-5 xl:grid-cols-[3fr_5fr]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <DownloadCloud className="h-4 w-4 text-muted" />
                            <p className="text-[12px] font-semibold text-main">
                                Import Thumbnails
                            </p>
                        </div>
                        <div
                            role="button"
                            tabIndex={0}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                                event.preventDefault();
                                handleDropUpload(
                                    event.dataTransfer.files?.[0] ?? null,
                                );
                            }}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    setImportMessage(
                                        "Drop image file here to import.",
                                    );
                                }
                            }}
                            className="mt-3 border border-dashed border-main bg-main px-3 py-4 text-center text-[11px] text-muted"
                        >
                            Drag image into this box to import
                        </div>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Import from URL
                            </span>
                            <div className="flex gap-2">
                                <input
                                    value={importUrl}
                                    onChange={(event) =>
                                        setImportUrl(event.currentTarget.value)
                                    }
                                    placeholder="https://..."
                                    className="min-w-0 flex-1 border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                />
                                <button
                                    type="button"
                                    onClick={handleImportFromUrl}
                                    className="shrink-0 border border-main bg-secondary px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary/75"
                                >
                                    Import
                                </button>
                            </div>
                        </label>
                        <p className="mt-2 border border-main bg-main px-2 py-1 text-[10px] text-muted">
                            {importMessage}
                        </p>
                    </div>

                    <div className="space-y-3 border border-main bg-secondary/20 p-4">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold text-main">
                                Thumbnail Library
                            </p>
                            <span className="border border-main bg-main px-2 py-1 text-[10px] text-muted">
                                {visibleThumbnails.length} items
                            </span>
                        </div>

                        <label className="block">
                            <span className="sr-only">Search thumbnails</span>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) =>
                                        setSearchQuery(
                                            event.currentTarget.value,
                                        )
                                    }
                                    placeholder="Search name, source, tag..."
                                    className="w-full border border-main bg-main py-1.5 pl-8 pr-10 text-[11px] text-main"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setIsFilterMenuOpen(
                                            (current) => !current,
                                        )
                                    }
                                    className={cn(
                                        "absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center justify-center border p-1 hover:bg-secondary",
                                        lifecycleFilter === "all"
                                            ? "border-main bg-main text-muted hover:text-main"
                                            : "border-accent bg-accent/10 text-main",
                                    )}
                                    aria-label="Toggle lifecycle filter menu"
                                >
                                    <Filter className="h-3.5 w-3.5" />
                                </button>
                                {isFilterMenuOpen ? (
                                    <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-44 border border-main bg-main p-1.5 shadow-sm">
                                        {LIFECYCLE_FILTERS.map(
                                            (filterValue) => (
                                                <button
                                                    key={filterValue}
                                                    type="button"
                                                    onClick={() => {
                                                        setLifecycleFilter(
                                                            filterValue,
                                                        );
                                                        setIsFilterMenuOpen(
                                                            false,
                                                        );
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center justify-between border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide",
                                                        lifecycleFilter ===
                                                            filterValue
                                                            ? "border-accent bg-accent/10 text-main"
                                                            : "border-main bg-main text-muted hover:bg-secondary/50",
                                                    )}
                                                >
                                                    <span>{filterValue}</span>
                                                    {lifecycleFilter ===
                                                    filterValue ? (
                                                        <span>•</span>
                                                    ) : null}
                                                </button>
                                            ),
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        </label>

                        <div className="thin-scrollbar grid max-h-[420px] grid-cols-3 gap-2 overflow-y-auto pr-1">
                            {visibleThumbnails.map((thumbnail) => {
                                const isSelected =
                                    thumbnail.id === selectedThumbnailId;
                                return (
                                    <div
                                        key={thumbnail.id}
                                        className={cn(
                                            "w-full border text-left overflow-hidden",
                                            isSelected
                                                ? "border-accent bg-secondary/35"
                                                : "border-main bg-main hover:bg-secondary/20",
                                        )}
                                    >
                                        <div
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                setSelectedThumbnailId(
                                                    thumbnail.id,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    setSelectedThumbnailId(
                                                        thumbnail.id,
                                                    );
                                                }
                                            }}
                                            className="w-full text-left"
                                        >
                                            <div className="relative aspect-video overflow-hidden border-b border-main bg-zinc-900">
                                                <div
                                                    className={cn(
                                                        "absolute inset-0 bg-gradient-to-br",
                                                        thumbnail.previewGradient,
                                                    )}
                                                />
                                            </div>
                                            <p className="px-1.5 pt-1.5 text-[11px] font-semibold text-main">
                                                {thumbnail.name}
                                            </p>
                                            <p className="px-1.5 pb-1 truncate text-[9px] text-muted">
                                                {thumbnail.sourceLabel}
                                            </p>
                                        </div>
                                        <div className="px-1.5 pb-1.5">
                                            <AssetLifecycleBadges
                                                tags={thumbnail.tags}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {visibleThumbnails.length === 0 ? (
                                <p className="border border-main bg-main px-3 py-4 text-center text-[11px] text-muted">
                                    No thumbnail matches current search/filter.
                                </p>
                            ) : null}
                        </div>
                    </div>
                </aside>

                <div className="space-y-3">
                    <div className="grid gap-3 xl:grid-cols-[3fr_2fr]">
                        <div className="space-y-3">
                            <div className="border border-main p-3">
                                <div
                                    ref={previewFrameRef}
                                    className="relative mx-auto aspect-video max-w-[900px] overflow-hidden border border-main bg-zinc-900"
                                    onPointerMove={(event) => {
                                        if (!isDraggingText) return;
                                        handleCanvasTextDrag(
                                            event.clientX,
                                            event.clientY,
                                        );
                                    }}
                                    onPointerUp={() => setIsDraggingText(false)}
                                    onPointerLeave={() =>
                                        setIsDraggingText(false)
                                    }
                                >
                                    <div
                                        className={cn(
                                            "absolute inset-0 bg-gradient-to-br",
                                            selectedThumbnail?.previewGradient ??
                                                "from-slate-600/70 via-slate-500/35 to-zinc-900/70",
                                        )}
                                    />
                                    {blurEnabled ? (
                                        <div
                                            className="absolute left-[8%] top-[8%] h-[28%] w-[32%] rounded-sm bg-black/40"
                                            style={{
                                                backdropFilter: `blur(${Math.max(
                                                    2,
                                                    Math.round(
                                                        blurStrength / 3,
                                                    ),
                                                )}px)`,
                                            }}
                                        />
                                    ) : null}
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        aria-label="Drag text overlay on preview"
                                        onPointerDown={(event) => {
                                            event.preventDefault();
                                            setIsDraggingText(true);
                                            handleCanvasTextDrag(
                                                event.clientX,
                                                event.clientY,
                                            );
                                        }}
                                        onKeyDown={(event) => {
                                            const step = 1;
                                            if (event.key === "ArrowLeft") {
                                                setTextPositionX((value) =>
                                                    clampPercent(value - step),
                                                );
                                            }
                                            if (event.key === "ArrowRight") {
                                                setTextPositionX((value) =>
                                                    clampPercent(value + step),
                                                );
                                            }
                                            if (event.key === "ArrowUp") {
                                                setTextPositionY((value) =>
                                                    clampPercent(value - step),
                                                );
                                            }
                                            if (event.key === "ArrowDown") {
                                                setTextPositionY((value) =>
                                                    clampPercent(value + step),
                                                );
                                            }
                                        }}
                                        className={cn(
                                            "absolute max-w-[82%] -translate-x-1/2 -translate-y-1/2 break-words text-center uppercase tracking-wide",
                                            isDraggingText
                                                ? "cursor-grabbing"
                                                : "cursor-grab",
                                        )}
                                        style={{
                                            left: `${textPositionX}%`,
                                            top: `${textPositionY}%`,
                                            color: textColor,
                                            fontFamily,
                                            fontSize: `${fontSize}px`,
                                            fontWeight,
                                            WebkitTextStroke: `${strokeWidth}px ${strokeColor}`,
                                            textShadow:
                                                "0 2px 14px rgba(0, 0, 0, 0.35)",
                                        }}
                                    >
                                        {overlayText || "YOUR HEADLINE"}
                                    </div>
                                </div>
                            </div>

                            <div className="border border-main bg-secondary/20 p-4">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Thumbnail name
                                    </span>
                                    <input
                                        value={selectedThumbnail?.name ?? ""}
                                        onChange={(event) =>
                                            handleRename(
                                                event.currentTarget.value,
                                            )
                                        }
                                        placeholder="e.g. con meo"
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    />
                                </label>

                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                    <label className="flex items-center gap-2 border border-main bg-main px-3 py-2">
                                        <input
                                            type="radio"
                                            name="thumbnail-edit-mode"
                                            checked={
                                                editMode === "create-variant"
                                            }
                                            onChange={() =>
                                                setEditMode("create-variant")
                                            }
                                            className="h-4 w-4 accent-[var(--color-accent)]"
                                        />
                                        <span>
                                            <span className="block text-[11px] font-semibold text-main">
                                                Create variant (default)
                                            </span>
                                            <span className="block text-[10px] text-muted">
                                                Keep original thumbnail intact.
                                            </span>
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 border border-main bg-main px-3 py-2">
                                        <input
                                            type="radio"
                                            name="thumbnail-edit-mode"
                                            checked={editMode === "overwrite"}
                                            onChange={() =>
                                                setEditMode("overwrite")
                                            }
                                            className="h-4 w-4 accent-[var(--color-accent)]"
                                        />
                                        <span>
                                            <span className="block text-[11px] font-semibold text-main">
                                                Overwrite current
                                            </span>
                                            <span className="block text-[10px] text-muted">
                                                Replace selected thumbnail.
                                            </span>
                                        </span>
                                    </label>
                                </div>

                                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center gap-1 border border-main bg-main px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDuplicateSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-main bg-main px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Duplicate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetEditor}
                                        className="inline-flex items-center justify-center border border-main bg-main px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-main bg-main px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <Scissors className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Crop + Blur
                                    </p>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Crop ratio
                                    </span>
                                    <select
                                        value={cropPreset}
                                        onChange={(event) =>
                                            setCropPreset(
                                                event.currentTarget
                                                    .value as ThumbnailCropPreset,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    >
                                        <option value="16:9">
                                            16:9 YouTube
                                        </option>
                                        <option value="9:16">
                                            9:16 Shorts
                                        </option>
                                        <option value="1:1">1:1 Square</option>
                                        <option value="4:5">4:5 Feed</option>
                                    </select>
                                </label>
                                <label className="flex items-center justify-between gap-2 border border-main bg-main px-3 py-2">
                                    <span>
                                        <span className="block text-[11px] font-semibold text-main">
                                            Region blur
                                        </span>
                                        <span className="block text-[10px] text-muted">
                                            Blur logos/faces by region.
                                        </span>
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={blurEnabled}
                                        onChange={(event) =>
                                            setBlurEnabled(
                                                event.currentTarget.checked,
                                            )
                                        }
                                        className="h-4 w-4 accent-[var(--color-accent)]"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Blur strength: {blurStrength}
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={100}
                                        value={blurStrength}
                                        onChange={(event) =>
                                            setBlurStrength(
                                                Number(
                                                    event.currentTarget.value,
                                                ),
                                            )
                                        }
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </label>
                            </div>

                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <Type className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Text Overlay
                                    </p>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Headline text
                                    </span>
                                    <textarea
                                        rows={3}
                                        value={overlayText}
                                        onChange={(event) =>
                                            setOverlayText(
                                                event.currentTarget.value,
                                            )
                                        }
                                        className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    />
                                </label>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Font family
                                        </span>
                                        <select
                                            value={fontFamily}
                                            onChange={(event) =>
                                                setFontFamily(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        >
                                            <option value="Montserrat">
                                                Montserrat
                                            </option>
                                            <option value="Oswald">
                                                Oswald
                                            </option>
                                            <option value="Bebas Neue">
                                                Bebas Neue
                                            </option>
                                            <option value="Anton">Anton</option>
                                            <option value="Sora">Sora</option>
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Font weight
                                        </span>
                                        <select
                                            value={fontWeight}
                                            onChange={(event) =>
                                                setFontWeight(
                                                    Number(
                                                        event.currentTarget
                                                            .value,
                                                    ),
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        >
                                            <option value={600}>600</option>
                                            <option value={700}>700</option>
                                            <option value={800}>800</option>
                                            <option value={900}>900</option>
                                        </select>
                                    </label>
                                </div>

                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Font size: {fontSize}px
                                    </span>
                                    <input
                                        type="range"
                                        min={24}
                                        max={140}
                                        value={fontSize}
                                        onChange={(event) =>
                                            setFontSize(
                                                Number(
                                                    event.currentTarget.value,
                                                ),
                                            )
                                        }
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </label>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Text color
                                        </span>
                                        <input
                                            type="color"
                                            value={textColor}
                                            onChange={(event) =>
                                                setTextColor(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="h-9 w-full border border-main bg-main p-1"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Stroke color
                                        </span>
                                        <input
                                            type="color"
                                            value={strokeColor}
                                            onChange={(event) =>
                                                setStrokeColor(
                                                    event.currentTarget.value,
                                                )
                                            }
                                            className="h-9 w-full border border-main bg-main p-1"
                                        />
                                    </label>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Stroke width: {strokeWidth}px
                                    </span>
                                    <input
                                        type="range"
                                        min={0}
                                        max={12}
                                        value={strokeWidth}
                                        onChange={(event) =>
                                            setStrokeWidth(
                                                Number(
                                                    event.currentTarget.value,
                                                ),
                                            )
                                        }
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </label>
                                <p className="border border-main bg-main px-2 py-1.5 text-[10px] text-muted">
                                    Text position: drag directly on preview
                                    canvas.
                                </p>
                            </div>

                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <Wand2 className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Workflow Output Hook
                                    </p>
                                </div>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Publish node target
                                    </span>
                                    <select className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main">
                                        <option>YouTube Video Publish</option>
                                        <option>YouTube Shorts Publish</option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Thumbnail apply strategy
                                    </span>
                                    <select className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main">
                                        <option>Use selected thumbnail</option>
                                        <option>
                                            Fallback to latest processed
                                        </option>
                                        <option>
                                            Require explicit selection
                                        </option>
                                    </select>
                                </label>
                                <div className="border border-main bg-main px-3 py-2 text-[10px] text-muted">
                                    <Link2 className="mr-1 inline-block h-3.5 w-3.5" />
                                    Planned node key:{" "}
                                    <span className="font-semibold text-main">
                                        workflow.thumbnail.select
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
