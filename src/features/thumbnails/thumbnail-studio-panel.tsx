"use client";

import { useMemo, useRef, useState } from "react";
import {
    Copy,
    Trash2,
    DownloadCloud,
    Filter,
    Scissors,
    Search,
    Sparkles,
    Type,
    X,
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

type BlurRegionDraft = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    start: number;
    end: number;
    strength: number;
};

type TextOverlayDraft = {
    id: string;
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    textColor: string;
    strokeColor: string;
    strokeWidth: number;
    x: number;
    y: number;
};

type BlurInteractionState = {
    regionId: string;
    mode: "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    startClientX: number;
    startClientY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
};

type TextDragState = {
    overlayId: string;
    offsetXPercent: number;
    offsetYPercent: number;
    startClientX: number;
    startClientY: number;
    moved: boolean;
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

function clampValue(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.max(min, Math.min(max, value));
}

const LIFECYCLE_FILTERS: Array<"all" | ThumbnailLifecycleTag> = [
    "all",
    "raw",
    "processed",
    "has-processed-output",
];

const DEFAULT_BLUR_REGIONS: BlurRegionDraft[] = [
    {
        id: "blur-1",
        x: 8,
        y: 8,
        width: 32,
        height: 28,
        start: 0,
        end: 36000,
        strength: 28,
    },
];

const DEFAULT_TEXT_OVERLAYS: TextOverlayDraft[] = [
    {
        id: "text-1",
        text: "TEXT",
        fontFamily: "Montserrat",
        fontSize: 15,
        fontWeight: 800,
        textColor: "#ffffff",
        strokeColor: "#111827",
        strokeWidth: 0,
        x: 50,
        y: 78,
    },
];

function formatBlurRegionSummary(region: BlurRegionDraft, index: number) {
    return `#${index + 1} x:${region.x.toFixed(1)} y:${region.y.toFixed(1)} w:${region.width.toFixed(1)} h:${region.height.toFixed(1)} t:${region.start}s-${region.end}s s:${region.strength}`;
}

function formatTextOverlaySummary(overlay: TextOverlayDraft, index: number) {
    const text = (overlay.text || "EMPTY").replace(/\s+/gu, " ").trim();
    const clipped = text.slice(0, 24);
    return `#${index + 1} x:${overlay.x.toFixed(1)} y:${overlay.y.toFixed(1)} z:${overlay.fontSize} w:${overlay.fontWeight} "${clipped}"`;
}

function cloneDefaultBlurRegions() {
    return DEFAULT_BLUR_REGIONS.map((item) => ({ ...item }));
}

function cloneDefaultTextOverlays() {
    return DEFAULT_TEXT_OVERLAYS.map((item) => ({ ...item }));
}

const BLUR_RESIZE_HANDLES: Array<{
    mode: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    className: string;
}> = [
    {
        mode: "n",
        className:
            "left-1/2 top-0 h-3 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "s",
        className:
            "left-1/2 bottom-0 h-3 w-8 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
    },
    {
        mode: "e",
        className:
            "right-0 top-1/2 h-8 w-3 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "w",
        className:
            "left-0 top-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
    },
    {
        mode: "ne",
        className:
            "right-0 top-0 h-4 w-4 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
    },
    {
        mode: "nw",
        className:
            "left-0 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "se",
        className:
            "right-0 bottom-0 h-4 w-4 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
    },
    {
        mode: "sw",
        className:
            "left-0 bottom-0 h-4 w-4 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
    },
];

export function ThumbnailStudioPanel({
    section: _section,
}: ThumbnailStudioPanelProps) {
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
    const [blurEnabled, setBlurEnabled] = useState(false);
    const [blurRegions, setBlurRegions] = useState<BlurRegionDraft[]>(
        cloneDefaultBlurRegions(),
    );
    const [activeBlurRegionId, setActiveBlurRegionId] = useState(
        DEFAULT_BLUR_REGIONS[0]?.id ?? "",
    );
    const [textOverlays, setTextOverlays] = useState<TextOverlayDraft[]>(
        cloneDefaultTextOverlays(),
    );
    const [activeTextOverlayId, setActiveTextOverlayId] = useState(
        DEFAULT_TEXT_OVERLAYS[0]?.id ?? "",
    );
    const [editingTextOverlayId, setEditingTextOverlayId] = useState<
        string | null
    >(null);
    const [textDragState, setTextDragState] = useState<TextDragState | null>(
        null,
    );
    const [blurInteraction, setBlurInteraction] =
        useState<BlurInteractionState | null>(null);
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
    const activeBlurRegion =
        blurRegions.find((item) => item.id === activeBlurRegionId) ?? null;
    const activeTextOverlay =
        textOverlays.find((item) => item.id === activeTextOverlayId) ?? null;

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
        setBlurEnabled(false);
        const resetBlurRegions = cloneDefaultBlurRegions();
        setBlurRegions(resetBlurRegions);
        setActiveBlurRegionId(resetBlurRegions[0]?.id ?? "");
        const resetTextOverlays = cloneDefaultTextOverlays();
        setTextOverlays(resetTextOverlays);
        setActiveTextOverlayId(resetTextOverlays[0]?.id ?? "");
        setImportMessage("Editor reset to default.");
    };

    const updateActiveBlurRegion = (patch: Partial<BlurRegionDraft>) => {
        if (!activeBlurRegion) return;
        setBlurRegions((current) =>
            current.map((item) => {
                if (item.id !== activeBlurRegion.id) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    width:
                        patch.width === undefined
                            ? item.width
                            : clampPercent(Number(patch.width)),
                    height:
                        patch.height === undefined
                            ? item.height
                            : clampPercent(Number(patch.height)),
                    start:
                        patch.start === undefined
                            ? item.start
                            : Math.max(0, Number(patch.start)),
                    end:
                        patch.end === undefined
                            ? item.end
                            : Math.max(0, Number(patch.end)),
                    strength:
                        patch.strength === undefined
                            ? item.strength
                            : Math.max(
                                  0,
                                  Math.min(100, Number(patch.strength)),
                              ),
                };
            }),
        );
    };

    const addBlurRegion = () => {
        const nextRegion: BlurRegionDraft = {
            id: buildId(),
            x: 10,
            y: 10,
            width: 20,
            height: 10,
            start: 0,
            end: 36000,
            strength: 50,
        };
        setBlurRegions((current) => [...current, nextRegion]);
        setActiveBlurRegionId(nextRegion.id);
    };

    const removeBlurRegionById = (regionId: string) => {
        setBlurRegions((current) => {
            const remaining = current.filter((item) => item.id !== regionId);
            setActiveBlurRegionId((currentActive) =>
                currentActive === regionId
                    ? (remaining[0]?.id ?? "")
                    : currentActive,
            );
            return remaining;
        });
    };

    const updateActiveTextOverlay = (patch: Partial<TextOverlayDraft>) => {
        if (!activeTextOverlay) return;
        setTextOverlays((current) =>
            current.map((item) => {
                if (item.id !== activeTextOverlay.id) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    fontSize:
                        patch.fontSize === undefined
                            ? item.fontSize
                            : Math.max(
                                  10,
                                  Math.min(140, Number(patch.fontSize)),
                              ),
                    fontWeight:
                        patch.fontWeight === undefined
                            ? item.fontWeight
                            : Math.max(
                                  600,
                                  Math.min(900, Number(patch.fontWeight)),
                              ),
                    strokeWidth:
                        patch.strokeWidth === undefined
                            ? item.strokeWidth
                            : Math.max(
                                  0,
                                  Math.min(12, Number(patch.strokeWidth)),
                              ),
                };
            }),
        );
    };

    const updateTextOverlayById = (
        overlayId: string,
        patch: Partial<TextOverlayDraft>,
    ) => {
        setTextOverlays((current) =>
            current.map((item) => {
                if (item.id !== overlayId) return item;
                return {
                    ...item,
                    ...patch,
                    x:
                        patch.x === undefined
                            ? item.x
                            : clampPercent(Number(patch.x)),
                    y:
                        patch.y === undefined
                            ? item.y
                            : clampPercent(Number(patch.y)),
                    fontSize:
                        patch.fontSize === undefined
                            ? item.fontSize
                            : Math.max(
                                  10,
                                  Math.min(140, Number(patch.fontSize)),
                              ),
                    fontWeight:
                        patch.fontWeight === undefined
                            ? item.fontWeight
                            : Math.max(
                                  600,
                                  Math.min(900, Number(patch.fontWeight)),
                              ),
                    strokeWidth:
                        patch.strokeWidth === undefined
                            ? item.strokeWidth
                            : Math.max(
                                  0,
                                  Math.min(12, Number(patch.strokeWidth)),
                              ),
                };
            }),
        );
    };

    const addTextOverlay = () => {
        const nextTextOverlay: TextOverlayDraft = {
            id: buildId(),
            text: "NEW TEXT",
            fontFamily: "Montserrat",
            fontSize: 15,
            fontWeight: 800,
            textColor: "#ffffff",
            strokeColor: "#111827",
            strokeWidth: 0,
            x: 50,
            y: 70,
        };
        setTextOverlays((current) => [...current, nextTextOverlay]);
        setActiveTextOverlayId(nextTextOverlay.id);
    };

    const removeTextOverlayById = (overlayId: string) => {
        setTextOverlays((current) => {
            const remaining = current.filter((item) => item.id !== overlayId);
            setActiveTextOverlayId((currentActive) =>
                currentActive === overlayId
                    ? (remaining[0]?.id ?? "")
                    : currentActive,
            );
            return remaining;
        });
    };

    const handleCanvasTextDrag = (
        overlayId: string,
        clientX: number,
        clientY: number,
    ) => {
        if (!textDragState || textDragState.overlayId !== overlayId) return;
        const frame = previewFrameRef.current;
        if (!frame) return;
        const bounds = frame.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0) return;
        const xPercent = ((clientX - bounds.left) / bounds.width) * 100;
        const yPercent = ((clientY - bounds.top) / bounds.height) * 100;
        updateTextOverlayById(overlayId, {
            x: clampPercent(xPercent - textDragState.offsetXPercent),
            y: clampPercent(yPercent - textDragState.offsetYPercent),
        });
    };

    const startBlurInteraction = (
        event: {
            clientX: number;
            clientY: number;
            preventDefault: () => void;
            stopPropagation: () => void;
        },
        region: BlurRegionDraft,
        mode: BlurInteractionState["mode"],
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setTextDragState(null);
        setEditingTextOverlayId(null);
        setActiveBlurRegionId(region.id);
        setBlurInteraction({
            regionId: region.id,
            mode,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startX: region.x,
            startY: region.y,
            startWidth: region.width,
            startHeight: region.height,
        });
    };

    return (
        <section className="w-full max-w-none border border-main bg-main">
            <div className="grid w-full gap-4 p-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,5fr)]">
                <aside className="min-w-0 space-y-3">
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
                                            <p
                                                title={thumbnail.name}
                                                className="truncate px-1.5 pt-1.5 text-[11px] font-semibold text-main"
                                            >
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

                <div className="min-w-0 space-y-3">
                    <div className="grid gap-3 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="min-w-0 space-y-3">
                            <div className="border border-main p-3">
                                <div
                                    ref={previewFrameRef}
                                    className="relative mx-auto aspect-video max-w-[900px] overflow-hidden border border-main bg-zinc-900"
                                    onPointerMove={(event) => {
                                        const frame = previewFrameRef.current;
                                        if (
                                            blurInteraction &&
                                            frame &&
                                            blurEnabled
                                        ) {
                                            const bounds =
                                                frame.getBoundingClientRect();
                                            if (
                                                bounds.width > 0 &&
                                                bounds.height > 0
                                            ) {
                                                const deltaXPercent =
                                                    ((event.clientX -
                                                        blurInteraction.startClientX) /
                                                        bounds.width) *
                                                    100;
                                                const deltaYPercent =
                                                    ((event.clientY -
                                                        blurInteraction.startClientY) /
                                                        bounds.height) *
                                                    100;
                                                setBlurRegions((current) =>
                                                    current.map((item) => {
                                                        if (
                                                            item.id !==
                                                            blurInteraction.regionId
                                                        ) {
                                                            return item;
                                                        }
                                                        if (
                                                            blurInteraction.mode ===
                                                            "move"
                                                        ) {
                                                            const nextX =
                                                                clampPercent(
                                                                    blurInteraction.startX +
                                                                        deltaXPercent,
                                                                );
                                                            const nextY =
                                                                clampPercent(
                                                                    blurInteraction.startY +
                                                                        deltaYPercent,
                                                                );
                                                            return {
                                                                ...item,
                                                                x: Math.min(
                                                                    nextX,
                                                                    Math.max(
                                                                        0,
                                                                        100 -
                                                                            item.width,
                                                                    ),
                                                                ),
                                                                y: Math.min(
                                                                    nextY,
                                                                    Math.max(
                                                                        0,
                                                                        100 -
                                                                            item.height,
                                                                    ),
                                                                ),
                                                            };
                                                        }
                                                        const minSize = 2;
                                                        const mode =
                                                            blurInteraction.mode;
                                                        const horizontalMode =
                                                            mode.includes("e")
                                                                ? "e"
                                                                : mode.includes(
                                                                        "w",
                                                                    )
                                                                  ? "w"
                                                                  : null;
                                                        const verticalMode =
                                                            mode.includes("s")
                                                                ? "s"
                                                                : mode.includes(
                                                                        "n",
                                                                    )
                                                                  ? "n"
                                                                  : null;
                                                        const startLeft =
                                                            blurInteraction.startX;
                                                        const startTop =
                                                            blurInteraction.startY;
                                                        const startRight =
                                                            startLeft +
                                                            blurInteraction.startWidth;
                                                        const startBottom =
                                                            startTop +
                                                            blurInteraction.startHeight;
                                                        let nextLeft =
                                                            startLeft;
                                                        let nextRight =
                                                            startRight;
                                                        let nextTop = startTop;
                                                        let nextBottom =
                                                            startBottom;

                                                        if (
                                                            horizontalMode ===
                                                            "e"
                                                        ) {
                                                            nextRight =
                                                                clampValue(
                                                                    startRight +
                                                                        deltaXPercent,
                                                                    startLeft +
                                                                        minSize,
                                                                    100,
                                                                );
                                                        } else if (
                                                            horizontalMode ===
                                                            "w"
                                                        ) {
                                                            nextLeft =
                                                                clampValue(
                                                                    startLeft +
                                                                        deltaXPercent,
                                                                    0,
                                                                    startRight -
                                                                        minSize,
                                                                );
                                                        }

                                                        if (
                                                            verticalMode === "s"
                                                        ) {
                                                            nextBottom =
                                                                clampValue(
                                                                    startBottom +
                                                                        deltaYPercent,
                                                                    startTop +
                                                                        minSize,
                                                                    100,
                                                                );
                                                        } else if (
                                                            verticalMode === "n"
                                                        ) {
                                                            nextTop =
                                                                clampValue(
                                                                    startTop +
                                                                        deltaYPercent,
                                                                    0,
                                                                    startBottom -
                                                                        minSize,
                                                                );
                                                        }

                                                        return {
                                                            ...item,
                                                            x: nextLeft,
                                                            y: nextTop,
                                                            width:
                                                                nextRight -
                                                                nextLeft,
                                                            height:
                                                                nextBottom -
                                                                nextTop,
                                                        };
                                                    }),
                                                );
                                            }
                                        } else if (textDragState) {
                                            const deltaX = Math.abs(
                                                event.clientX -
                                                    textDragState.startClientX,
                                            );
                                            const deltaY = Math.abs(
                                                event.clientY -
                                                    textDragState.startClientY,
                                            );
                                            const hasMoved =
                                                deltaX > 2 || deltaY > 2;
                                            if (hasMoved) {
                                                if (!textDragState.moved) {
                                                    setTextDragState(
                                                        (current) =>
                                                            current
                                                                ? {
                                                                      ...current,
                                                                      moved: true,
                                                                  }
                                                                : current,
                                                    );
                                                }
                                                handleCanvasTextDrag(
                                                    textDragState.overlayId,
                                                    event.clientX,
                                                    event.clientY,
                                                );
                                            }
                                        }
                                    }}
                                    onPointerUp={() => {
                                        if (
                                            textDragState &&
                                            !textDragState.moved
                                        ) {
                                            setEditingTextOverlayId(
                                                textDragState.overlayId,
                                            );
                                            setActiveTextOverlayId(
                                                textDragState.overlayId,
                                            );
                                        }
                                        setTextDragState(null);
                                        setBlurInteraction(null);
                                    }}
                                    onPointerLeave={() => {
                                        setTextDragState(null);
                                        setBlurInteraction(null);
                                    }}
                                >
                                    <div
                                        className={cn(
                                            "absolute inset-0 bg-gradient-to-br",
                                            selectedThumbnail?.previewGradient ??
                                                "from-slate-600/70 via-slate-500/35 to-zinc-900/70",
                                        )}
                                    />
                                    {blurEnabled
                                        ? blurRegions.map((region) => (
                                              <div
                                                  key={region.id}
                                                  role="button"
                                                  tabIndex={0}
                                                  onPointerDown={(event) =>
                                                      startBlurInteraction(
                                                          event,
                                                          region,
                                                          "move",
                                                      )
                                                  }
                                                  onKeyDown={(event) => {
                                                      const step = 1;
                                                      if (
                                                          event.key ===
                                                          "ArrowLeft"
                                                      ) {
                                                          setActiveBlurRegionId(
                                                              region.id,
                                                          );
                                                          updateActiveBlurRegion(
                                                              {
                                                                  x:
                                                                      region.x -
                                                                      step,
                                                              },
                                                          );
                                                      }
                                                      if (
                                                          event.key ===
                                                          "ArrowRight"
                                                      ) {
                                                          setActiveBlurRegionId(
                                                              region.id,
                                                          );
                                                          updateActiveBlurRegion(
                                                              {
                                                                  x:
                                                                      region.x +
                                                                      step,
                                                              },
                                                          );
                                                      }
                                                      if (
                                                          event.key ===
                                                          "ArrowUp"
                                                      ) {
                                                          setActiveBlurRegionId(
                                                              region.id,
                                                          );
                                                          updateActiveBlurRegion(
                                                              {
                                                                  y:
                                                                      region.y -
                                                                      step,
                                                              },
                                                          );
                                                      }
                                                      if (
                                                          event.key ===
                                                          "ArrowDown"
                                                      ) {
                                                          setActiveBlurRegionId(
                                                              region.id,
                                                          );
                                                          updateActiveBlurRegion(
                                                              {
                                                                  y:
                                                                      region.y +
                                                                      step,
                                                              },
                                                          );
                                                      }
                                                  }}
                                                  className={cn(
                                                      "absolute border border-main bg-black/40 cursor-move",
                                                  )}
                                                  style={{
                                                      left: `${region.x}%`,
                                                      top: `${region.y}%`,
                                                      width: `${region.width}%`,
                                                      height: `${region.height}%`,
                                                      backdropFilter: `blur(${Math.max(
                                                          2,
                                                          Math.round(
                                                              region.strength /
                                                                  3,
                                                          ),
                                                      )}px)`,
                                                  }}
                                              >
                                                  {activeBlurRegionId ===
                                                  region.id
                                                      ? BLUR_RESIZE_HANDLES.map(
                                                            (handle) => (
                                                                <div
                                                                    key={
                                                                        handle.mode
                                                                    }
                                                                    role="button"
                                                                    tabIndex={0}
                                                                    aria-label={`Resize blur region ${handle.mode}`}
                                                                    onPointerDown={(
                                                                        event,
                                                                    ) =>
                                                                        startBlurInteraction(
                                                                            event,
                                                                            region,
                                                                            handle.mode,
                                                                        )
                                                                    }
                                                                    className={cn(
                                                                        "absolute z-10 bg-transparent",
                                                                        handle.className,
                                                                    )}
                                                                />
                                                            ),
                                                        )
                                                      : null}
                                              </div>
                                          ))
                                        : null}
                                    {textOverlays.map((overlay, index) => (
                                        <div
                                            key={overlay.id}
                                            style={{
                                                left: `${overlay.x}%`,
                                                top: `${overlay.y}%`,
                                                color: overlay.textColor,
                                                fontFamily: overlay.fontFamily,
                                                fontSize: `${overlay.fontSize}px`,
                                                fontWeight: overlay.fontWeight,
                                                WebkitTextStroke: `${overlay.strokeWidth}px ${overlay.strokeColor}`,
                                                textShadow:
                                                    "0 2px 14px rgba(0, 0, 0, 0.35)",
                                            }}
                                            className={cn(
                                                "absolute -translate-x-1/2 -translate-y-1/2 text-center uppercase tracking-wide",
                                                activeTextOverlayId ===
                                                    overlay.id
                                                    ? "ring-1 ring-accent/70"
                                                    : "",
                                            )}
                                        >
                                            {editingTextOverlayId ===
                                            overlay.id ? (
                                                <input
                                                    autoFocus
                                                    aria-label={`Edit text overlay on preview #${index + 1}`}
                                                    value={overlay.text}
                                                    onChange={(event) =>
                                                        updateTextOverlayById(
                                                            overlay.id,
                                                            {
                                                                text: event
                                                                    .currentTarget
                                                                    .value,
                                                            },
                                                        )
                                                    }
                                                    onBlur={() =>
                                                        setEditingTextOverlayId(
                                                            null,
                                                        )
                                                    }
                                                    onKeyDown={(event) => {
                                                        if (
                                                            event.key ===
                                                            "Enter"
                                                        ) {
                                                            event.currentTarget.blur();
                                                        }
                                                        if (
                                                            event.key ===
                                                            "Escape"
                                                        ) {
                                                            setEditingTextOverlayId(
                                                                null,
                                                            );
                                                        }
                                                    }}
                                                    className="min-w-[180px] max-w-[82vw] border border-main bg-main/90 px-2 py-1 text-center text-[inherit] font-[inherit] text-main outline-none"
                                                />
                                            ) : (
                                                <div
                                                    role="button"
                                                    tabIndex={0}
                                                    aria-label={`Drag text overlay on preview #${index + 1}`}
                                                    onPointerDown={(event) => {
                                                        event.preventDefault();
                                                        setEditingTextOverlayId(
                                                            null,
                                                        );
                                                        setActiveTextOverlayId(
                                                            overlay.id,
                                                        );
                                                        const frame =
                                                            previewFrameRef.current;
                                                        if (!frame) return;
                                                        const bounds =
                                                            frame.getBoundingClientRect();
                                                        if (
                                                            bounds.width <= 0 ||
                                                            bounds.height <= 0
                                                        ) {
                                                            return;
                                                        }
                                                        const pointerXPercent =
                                                            ((event.clientX -
                                                                bounds.left) /
                                                                bounds.width) *
                                                            100;
                                                        const pointerYPercent =
                                                            ((event.clientY -
                                                                bounds.top) /
                                                                bounds.height) *
                                                            100;
                                                        setTextDragState({
                                                            overlayId:
                                                                overlay.id,
                                                            offsetXPercent:
                                                                pointerXPercent -
                                                                overlay.x,
                                                            offsetYPercent:
                                                                pointerYPercent -
                                                                overlay.y,
                                                            startClientX:
                                                                event.clientX,
                                                            startClientY:
                                                                event.clientY,
                                                            moved: false,
                                                        });
                                                    }}
                                                    onKeyDown={(event) => {
                                                        const step = 1;
                                                        if (
                                                            activeTextOverlayId !==
                                                            overlay.id
                                                        ) {
                                                            return;
                                                        }
                                                        if (
                                                            event.key ===
                                                            "Enter"
                                                        ) {
                                                            setEditingTextOverlayId(
                                                                overlay.id,
                                                            );
                                                            return;
                                                        }
                                                        if (
                                                            event.key ===
                                                            "ArrowLeft"
                                                        ) {
                                                            updateActiveTextOverlay(
                                                                {
                                                                    x:
                                                                        overlay.x -
                                                                        step,
                                                                },
                                                            );
                                                        }
                                                        if (
                                                            event.key ===
                                                            "ArrowRight"
                                                        ) {
                                                            updateActiveTextOverlay(
                                                                {
                                                                    x:
                                                                        overlay.x +
                                                                        step,
                                                                },
                                                            );
                                                        }
                                                        if (
                                                            event.key ===
                                                            "ArrowUp"
                                                        ) {
                                                            updateActiveTextOverlay(
                                                                {
                                                                    y:
                                                                        overlay.y -
                                                                        step,
                                                                },
                                                            );
                                                        }
                                                        if (
                                                            event.key ===
                                                            "ArrowDown"
                                                        ) {
                                                            updateActiveTextOverlay(
                                                                {
                                                                    y:
                                                                        overlay.y +
                                                                        step,
                                                                },
                                                            );
                                                        }
                                                    }}
                                                    className={cn(
                                                        "cursor-grab whitespace-pre",
                                                        textDragState
                                                            ?.overlayId ===
                                                            overlay.id
                                                            ? "cursor-grabbing"
                                                            : "cursor-grab",
                                                    )}
                                                >
                                                    {overlay.text ||
                                                        "YOUR HEADLINE"}
                                                </div>
                                            )}
                                        </div>
                                    ))}
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
                                        className="inline-flex items-center justify-center gap-1 border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25"
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDuplicateSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-main bg-secondary/70 px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Copy className="h-3 w-3" />
                                        Duplicate
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleResetEditor}
                                        className="inline-flex items-center justify-center border border-main bg-secondary/70 px-2 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeleteSelected}
                                        disabled={!selectedThumbnail}
                                        className="inline-flex items-center justify-center gap-1 border border-rose-500/35 bg-rose-500/10 px-2 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-3">
                            <div className="space-y-2 border border-main bg-secondary/20 p-3">
                                <div className="flex items-center gap-2">
                                    <Type className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Text Overlay
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={addTextOverlay}
                                    className="w-full border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25"
                                >
                                    Add text layer
                                </button>
                                <div className="max-h-28 space-y-2 overflow-y-auto border border-main bg-secondary/20 p-2">
                                    {textOverlays.length === 0 ? (
                                        <p className="text-[10px] text-muted">
                                            No text layer yet.
                                        </p>
                                    ) : (
                                        textOverlays.map((overlay, index) => (
                                            <div
                                                key={overlay.id}
                                                className={cn(
                                                    "flex w-full max-w-full items-center gap-1 overflow-hidden border px-1.5 py-1",
                                                    activeTextOverlayId ===
                                                        overlay.id
                                                        ? "border-accent bg-accent/10 text-main"
                                                        : "border-main bg-main text-main",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveTextOverlayId(
                                                            overlay.id,
                                                        )
                                                    }
                                                    title={formatTextOverlaySummary(
                                                        overlay,
                                                        index,
                                                    )}
                                                    className="min-w-0 max-w-full flex-1 truncate whitespace-nowrap text-left text-[10px]"
                                                >
                                                    {formatTextOverlaySummary(
                                                        overlay,
                                                        index,
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove text layer #${index + 1}`}
                                                    onClick={() =>
                                                        removeTextOverlayById(
                                                            overlay.id,
                                                        )
                                                    }
                                                    className="shrink-0 px-1 text-[10px] font-semibold text-rose-700 hover:text-rose-800"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {activeTextOverlay ? (
                                    <>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Headline text
                                            </span>
                                            <textarea
                                                rows={2}
                                                value={activeTextOverlay.text}
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        text: event
                                                            .currentTarget
                                                            .value,
                                                    })
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
                                                    value={
                                                        activeTextOverlay.fontFamily
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                fontFamily:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
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
                                                    <option value="Anton">
                                                        Anton
                                                    </option>
                                                    <option value="Sora">
                                                        Sora
                                                    </option>
                                                </select>
                                            </label>
                                            <label className="block">
                                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                    Font weight
                                                </span>
                                                <select
                                                    value={
                                                        activeTextOverlay.fontWeight
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                fontWeight:
                                                                    Number(
                                                                        event
                                                                            .currentTarget
                                                                            .value,
                                                                    ),
                                                            },
                                                        )
                                                    }
                                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                                >
                                                    <option value={600}>
                                                        600
                                                    </option>
                                                    <option value={700}>
                                                        700
                                                    </option>
                                                    <option value={800}>
                                                        800
                                                    </option>
                                                    <option value={900}>
                                                        900
                                                    </option>
                                                </select>
                                            </label>
                                        </div>

                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Font size:{" "}
                                                {activeTextOverlay.fontSize}px
                                            </span>
                                            <input
                                                type="range"
                                                min={10}
                                                max={140}
                                                value={
                                                    activeTextOverlay.fontSize
                                                }
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        fontSize: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
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
                                                    value={
                                                        activeTextOverlay.textColor
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                textColor:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
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
                                                    value={
                                                        activeTextOverlay.strokeColor
                                                    }
                                                    onChange={(event) =>
                                                        updateActiveTextOverlay(
                                                            {
                                                                strokeColor:
                                                                    event
                                                                        .currentTarget
                                                                        .value,
                                                            },
                                                        )
                                                    }
                                                    className="h-9 w-full border border-main bg-main p-1"
                                                />
                                            </label>
                                        </div>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Stroke width:{" "}
                                                {activeTextOverlay.strokeWidth}
                                                px
                                            </span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={12}
                                                value={
                                                    activeTextOverlay.strokeWidth
                                                }
                                                onChange={(event) =>
                                                    updateActiveTextOverlay({
                                                        strokeWidth: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full accent-[var(--color-accent)]"
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-muted">
                                        Select a text layer to edit.
                                    </p>
                                )}
                                <p className="border border-main bg-main px-2 py-1.5 text-[10px] text-muted">
                                    Text position: drag directly on preview
                                    canvas.
                                </p>
                            </div>
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
                                <button
                                    type="button"
                                    onClick={addBlurRegion}
                                    className="w-full border border-accent/40 bg-accent/15 px-2 py-1.5 text-[10px] font-semibold text-accent hover:bg-accent/25"
                                >
                                    Add blur region
                                </button>
                                <div className="max-h-28 space-y-2 overflow-y-auto border border-main bg-secondary/20 p-2">
                                    {blurRegions.length === 0 ? (
                                        <p className="text-[10px] text-muted">
                                            No blur region yet.
                                        </p>
                                    ) : (
                                        blurRegions.map((region, index) => (
                                            <div
                                                key={region.id}
                                                className={cn(
                                                    "flex w-full max-w-full items-center gap-1 overflow-hidden border px-1.5 py-1",
                                                    activeBlurRegionId ===
                                                        region.id
                                                        ? "border-accent bg-accent/10 text-main"
                                                        : "border-main bg-main text-main",
                                                )}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setActiveBlurRegionId(
                                                            region.id,
                                                        )
                                                    }
                                                    title={formatBlurRegionSummary(
                                                        region,
                                                        index,
                                                    )}
                                                    className="min-w-0 max-w-full flex-1 truncate whitespace-nowrap text-left text-[10px]"
                                                >
                                                    {formatBlurRegionSummary(
                                                        region,
                                                        index,
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Remove blur region #${index + 1}`}
                                                    onClick={() =>
                                                        removeBlurRegionById(
                                                            region.id,
                                                        )
                                                    }
                                                    className="shrink-0 px-1 text-[10px] font-semibold text-rose-700 hover:text-rose-800"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                                {activeBlurRegion ? (
                                    <>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                                Blur strength:{" "}
                                                {activeBlurRegion.strength}
                                            </span>
                                            <input
                                                type="range"
                                                min={0}
                                                max={100}
                                                value={
                                                    activeBlurRegion.strength
                                                }
                                                onChange={(event) =>
                                                    updateActiveBlurRegion({
                                                        strength: Number(
                                                            event.currentTarget
                                                                .value,
                                                        ),
                                                    })
                                                }
                                                className="w-full accent-[var(--color-accent)]"
                                            />
                                        </label>
                                    </>
                                ) : (
                                    <p className="text-[10px] text-muted">
                                        Select a blur region to edit.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
