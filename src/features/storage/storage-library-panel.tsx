"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { AssetLifecycleBadges } from "@/components/ui/asset-lifecycle-badges";
import { buildStorageLocationUrl } from "@/lib/storage/storage-location";
import { getTelegramDownloadBlockedReason } from "@/lib/storage/telegram-download";

type StoredVideoAsset = {
    _id: string;
    status?: string;
    storageProvider: string;
    storagePointer?: Record<string, unknown>;
    publicUrl?: string | null;
    providerAssetId?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    durationMs?: number | null;
    metadata?: {
        sourceUrl?: string;
        originPlatform?: string;
        title?: string | null;
        description?: string | null;
        vietnameseTitle?: string | null;
        vietnameseDescription?: string | null;
        vietnameseHashtags?: string[] | null;
        resolver?: string;
        requestedQuality?: string;
        actualQuality?: string | null;
        formatId?: string | null;
        formatNote?: string | null;
        resolution?: string | null;
        height?: number | null;
        width?: number | null;
        ext?: string | null;
        vcodec?: string | null;
        acodec?: string | null;
        tags?: string[] | null;
    };
    createdFrom?: {
        sourceId?: string;
        jobRunId?: string;
        storageProviderAccountId?: string | null;
        storageProviderLabel?: string | null;
    };
    createdAt?: string;
};

type Pagination = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
};

type AssetsApiResponse = {
    ok: boolean;
    data?: StoredVideoAsset[];
    pagination?: Pagination;
    errorCode?: string;
    error?: string;
};

type CreateAssetPayload = {
    title: string;
    storageProvider: "telegram" | "drive";
    storageProviderLabel?: string;
    sourceUrl?: string;
    providerAssetId?: string;
    publicUrl?: string;
    mimeType?: string;
    sizeBytes?: number;
    durationMs?: number;
};

type StorageLibraryPanelProps = {
    section: LeftbarNavItem;
};

const DEFAULT_PAGINATION: Pagination = {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
};

function formatDate(value?: string) {
    if (!value) {
        return "-";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

function formatBytes(size?: number | null) {
    if (!size || size <= 0) {
        return "-";
    }

    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = size;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }

    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatDuration(durationMs?: number | null) {
    if (!durationMs || durationMs <= 0) {
        return "-";
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60) % 60;
    const hours = Math.floor(totalSeconds / 3600);

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }

    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }

    return `${seconds}s`;
}

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function StorageLibraryPanel({ section }: StorageLibraryPanelProps) {
    const Icon = section.icon;
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [selectedAsset, setSelectedAsset] = useState<StoredVideoAsset | null>(
        null,
    );
    const [status, setStatus] = useState<
        "idle" | "loading" | "failed" | "ready"
    >("idle");
    const [pagination, setPagination] =
        useState<Pagination>(DEFAULT_PAGINATION);
    const [message, setMessage] = useState("Ready.");
    const [showAddForm, setShowAddForm] = useState(false);
    const [newAsset, setNewAsset] = useState<CreateAssetPayload>({
        title: "",
        storageProvider: "drive",
        storageProviderLabel: "",
        sourceUrl: "",
        providerAssetId: "",
        publicUrl: "",
        mimeType: "video/mp4",
    });
    const statusFailed = status === "failed";

    const loadAssets = async (page = pagination.page) => {
        setStatus("loading");
        setMessage("Loading storage metadata...");

        try {
            const response = await fetch(
                `/api/storage/assets?page=${page}&pageSize=${pagination.pageSize}`,
                {
                    method: "GET",
                    cache: "no-store",
                },
            );
            const payload = (await response.json()) as AssetsApiResponse;

            if (!response.ok || !payload.ok) {
                setStatus("failed");
                setMessage(payload.error ?? "Could not load assets.");
                return;
            }

            setAssets(payload.data ?? []);
            setPagination(payload.pagination ?? DEFAULT_PAGINATION);
            setStatus("ready");
            setMessage(
                `Loaded ${(payload.data ?? []).length} / ${payload.pagination?.total ?? (payload.data ?? []).length} video assets.`,
            );
        } catch (error) {
            setStatus("failed");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load assets.",
            );
        }
    };

    useEffect(() => {
        void loadAssets(1);
    }, []);

    const createAsset = async () => {
        setStatus("loading");
        setMessage("Creating manual asset...");

        try {
            const response = await fetch("/api/storage/assets", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(newAsset),
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: StoredVideoAsset;
                error?: string;
            };

            if (!response.ok || !payload.ok || !payload.data) {
                setStatus("failed");
                setMessage(payload.error ?? "Could not create asset.");
                return;
            }

            setShowAddForm(false);
            setNewAsset({
                title: "",
                storageProvider: "drive",
                storageProviderLabel: "",
                sourceUrl: "",
                providerAssetId: "",
                publicUrl: "",
                mimeType: "video/mp4",
            });
            await loadAssets(pagination.page);
            setStatus("ready");
            setMessage("Manual asset created.");
        } catch (error) {
            setStatus("failed");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not create asset.",
            );
        }
    };

    const deleteAsset = async (assetId: string) => {
        setStatus("loading");
        setMessage("Deleting asset...");

        try {
            const response = await fetch(`/api/storage/assets/${assetId}`, {
                method: "DELETE",
            });
            const payload = (await response.json()) as AssetsApiResponse;

            if (!response.ok || !payload.ok) {
                setStatus("failed");
                setMessage(payload.error ?? "Could not delete asset.");
                return;
            }

            setAssets((previous) =>
                previous.filter((asset) => asset._id !== assetId),
            );
            if (selectedAsset?._id === assetId) {
                setSelectedAsset(null);
            }
            setStatus("ready");
            setMessage("Asset deleted.");
        } catch (error) {
            setStatus("failed");
            setMessage(
                error instanceof Error
                    ? error.message
                    : "Could not delete asset.",
            );
        }
    };

    const stats = useMemo(() => {
        const readyCount = assets.filter(
            (asset) => asset.status === "ready",
        ).length;
        const totalBytes = assets.reduce((sum, asset) => {
            const value = asset.sizeBytes ?? 0;
            return value > 0 ? sum + value : sum;
        }, 0);

        return {
            readyCount,
            totalBytes,
        };
    }, [assets]);

    return (
        <section className="overflow-hidden border border-main bg-main">
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-main bg-secondary/45 px-5 py-4">
                <div>
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted" />
                        <h1 className="text-[15px] font-semibold text-main">
                            {section.label}
                        </h1>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
                        {section.description}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowAddForm(true)}
                        className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Add Asset
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void loadAssets(pagination.page);
                        }}
                        disabled={status === "loading"}
                        className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
                        />
                        {status === "loading" ? "Loading..." : "Refresh"}
                    </button>
                </div>
            </header>

            <div
                className={cn(
                    "border-b border-main bg-secondary/25 px-5 py-3",
                    statusFailed ? "text-rose-700" : "text-muted",
                )}
            >
                <span
                    className={cn(
                        "inline-flex border bg-main px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
                        statusFailed
                            ? "border-rose-300 text-rose-700"
                            : "border-main text-muted",
                    )}
                >
                    {status}
                </span>
                <span
                    className={cn(
                        "ml-3 text-[12px]",
                        statusFailed ? "font-semibold text-rose-700" : "text-muted",
                    )}
                >
                    {message}
                </span>
                <span className="ml-3 text-[12px] text-muted">
                    Ready: {stats.readyCount} · Total size:{" "}
                    {formatBytes(stats.totalBytes)}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[12px]">
                    <thead className="border-b border-main bg-secondary/45 text-muted">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Video</th>
                            <th className="px-4 py-2 font-semibold">Asset</th>
                            <th className="px-4 py-2 font-semibold">
                                Provider
                            </th>
                            <th className="px-4 py-2 font-semibold">Status</th>
                            <th className="px-4 py-2 font-semibold">
                                Platform
                            </th>
                            {/* <th className="px-4 py-2 font-semibold">Mime</th> */}
                            <th className="px-4 py-2 font-semibold">Quality</th>
                            <th className="px-4 py-2 font-semibold">Size</th>
                            <th className="px-4 py-2 font-semibold">
                                Duration
                            </th>
                            <th className="px-4 py-2 font-semibold">Storage</th>
                            <th className="px-4 py-2 font-semibold">Detail</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.length === 0 ? (
                            <tr>
                                <td
                                    className="px-4 py-6 text-muted"
                                    colSpan={10}
                                >
                                    Chưa có video metadata nào.
                                </td>
                            </tr>
                        ) : (
                            assets.map((asset) => {
                                const storageUrl =
                                    buildStorageLocationUrl(asset);
                                const downloadUrl = `/api/storage/assets/${asset._id}/download`;
                                const downloadBlockedReason =
                                    getTelegramDownloadBlockedReason({
                                        storageProvider: asset.storageProvider,
                                        sizeBytes: asset.sizeBytes,
                                    });

                                return (
                                    <tr
                                        key={asset._id}
                                        className="border-b border-main last:border-b-0"
                                    >
                                        <td className="w-[120px] p-0">
                                            {!downloadBlockedReason ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedAsset(asset)
                                                    }
                                                    className="flex h-16 w-full items-center justify-center bg-black text-[10px] font-semibold text-white/80 transition-colors hover:bg-neutral-800"
                                                >
                                                    Preview
                                                </button>
                                            ) : (
                                                <div className="flex h-20 w-full items-center justify-center bg-secondary text-[10px] text-muted">
                                                    Preview blocked
                                                </div>
                                            )}
                                        </td>
                                        <td className="max-w-[320px] px-4 py-3">
                                            {storageUrl ? (
                                                <a
                                                    href={storageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="block truncate font-medium text-main underline-offset-2 hover:underline"
                                                >
                                                    {asset.metadata?.title ??
                                                        asset._id}
                                                </a>
                                            ) : (
                                                <p className="truncate font-medium text-main">
                                                    {asset.metadata?.title ??
                                                        asset._id}
                                                </p>
                                            )}
                                            <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                {asset.metadata?.sourceUrl ??
                                                    "-"}
                                            </p>
                                            <div className="mt-1">
                                                <AssetLifecycleBadges
                                                    tags={asset.metadata?.tags}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-main">
                                            <p className="font-mono text-[11px]">
                                                {asset.storageProvider}
                                            </p>
                                            <p className="mt-1 text-[11px] text-muted">
                                                {asset.createdFrom
                                                    ?.storageProviderLabel ??
                                                    "-"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-[11px] text-main">
                                            {asset.status ?? "-"}
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {asset.metadata?.originPlatform ??
                                                "-"}
                                        </td>
                                        {/* <td className="px-4 py-3 text-muted">
                                                {asset.mimeType ?? "-"}
                                            </td> */}
                                        <td className="px-4 py-3 text-muted">
                                            <p className="text-main">
                                                {asset.metadata
                                                    ?.actualQuality ?? ""}
                                            </p>
                                            <p className="mt-1 text-[11px] text-muted">
                                                {" "}
                                                {asset.metadata
                                                    ?.requestedQuality ?? ""}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {formatBytes(asset.sizeBytes)}
                                        </td>
                                        <td className="px-4 py-3 text-muted">
                                            {formatDuration(asset.durationMs)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-2">
                                                {downloadBlockedReason ? (
                                                    <button
                                                        type="button"
                                                        disabled
                                                        title={
                                                            downloadBlockedReason
                                                        }
                                                        className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-muted opacity-70"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Blocked
                                                    </button>
                                                ) : (
                                                    <a
                                                        href={downloadUrl}
                                                        className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        Download
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedAsset(asset)
                                                    }
                                                    className="border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                >
                                                    Detail
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (
                                                            !confirm(
                                                                `Delete asset "${asset.metadata?.title ?? asset._id}"?`,
                                                            )
                                                        ) {
                                                            return;
                                                        }
                                                        void deleteAsset(
                                                            asset._id,
                                                        );
                                                    }}
                                                    className="btn-danger inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold transition-colors"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
            <div className="mt-3 flex items-center justify-between px-5 pb-5">
                <p className="text-[11px] text-muted">
                    Page {pagination.page} / {pagination.totalPages} ·{" "}
                    {pagination.total} assets
                </p>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            void loadAssets(pagination.page - 1);
                        }}
                        disabled={status === "loading" || pagination.page <= 1}
                        className="border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Prev
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            void loadAssets(pagination.page + 1);
                        }}
                        disabled={
                            status === "loading" ||
                            pagination.page >= pagination.totalPages
                        }
                        className="border border-main bg-secondary px-3 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Next
                    </button>
                </div>
            </div>

            {showAddForm ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
                    <form
                        className="w-full max-w-2xl border border-main bg-main shadow-xl"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void createAsset();
                        }}
                    >
                        <div className="flex items-center justify-between border-b border-main bg-secondary/35 px-4 py-3">
                            <div>
                                <p className="text-[12px] font-semibold text-main">
                                    Add Manual Asset
                                </p>
                                <p className="mt-1 text-[11px] text-muted">
                                    Tạo metadata asset thủ công cho Storage
                                    Library.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                            >
                                Close
                            </button>
                        </div>
                        <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
                            <label className="block md:col-span-2">
                                <span className="text-[12px] font-medium text-main">
                                    Title
                                </span>
                                <input
                                    value={newAsset.title}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            title: event.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Storage Provider
                                </span>
                                <select
                                    value={newAsset.storageProvider}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            storageProvider: event.target
                                                .value as "telegram" | "drive",
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    <option value="drive">drive</option>
                                    <option value="telegram">telegram</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Provider Label
                                </span>
                                <input
                                    value={newAsset.storageProviderLabel ?? ""}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            storageProviderLabel:
                                                event.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="text-[12px] font-medium text-main">
                                    Source URL
                                </span>
                                <input
                                    value={newAsset.sourceUrl ?? ""}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            sourceUrl: event.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Provider Asset ID
                                </span>
                                <input
                                    value={newAsset.providerAssetId ?? ""}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            providerAssetId: event.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="text-[12px] font-medium text-main">
                                    Public URL
                                </span>
                                <input
                                    value={newAsset.publicUrl ?? ""}
                                    onChange={(event) =>
                                        setNewAsset((previous) => ({
                                            ...previous,
                                            publicUrl: event.target.value,
                                        }))
                                    }
                                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            </label>
                            <div className="md:col-span-2">
                                <button
                                    type="submit"
                                    className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Save Asset
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            ) : null}

            {selectedAsset ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
                    <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-main bg-main shadow-xl">
                        <div className="flex items-start justify-between gap-4 border-b border-main bg-secondary/35 px-4 py-3">
                            <div className="min-w-0">
                                <p className="truncate text-[13px] font-semibold text-main">
                                    {selectedAsset.metadata?.title ??
                                        selectedAsset._id}
                                </p>
                                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                    {selectedAsset.metadata?.sourceUrl ?? "-"}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAsset(null)}
                                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                            >
                                Close
                            </button>
                        </div>

                        <div className="space-y-3 px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                                {buildStorageLocationUrl(selectedAsset) ? (
                                    <a
                                        href={
                                            buildStorageLocationUrl(
                                                selectedAsset,
                                            ) as string
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1.5 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Open Storage
                                    </a>
                                ) : null}
                            </div>

                            {!getTelegramDownloadBlockedReason({
                                storageProvider: selectedAsset.storageProvider,
                                sizeBytes: selectedAsset.sizeBytes,
                            }) ? (
                                <div className="border border-main bg-secondary/20 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                        Inline Video Preview
                                    </p>
                                    <video
                                        controls
                                        preload="metadata"
                                        className="mt-2 w-full border border-main bg-black"
                                        src={`/api/storage/assets/${selectedAsset._id}/download?disposition=inline`}
                                    />
                                </div>
                            ) : (
                                <div className="border border-main bg-secondary/20 p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                        Inline Video Preview
                                    </p>
                                    <p className="mt-2 text-[11px] text-muted">
                                        Preview bị chặn do giới hạn Telegram Bot
                                        API với file lớn hơn 20MB.
                                    </p>
                                </div>
                            )}

                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <DetailCell
                                    label="Provider"
                                    value={selectedAsset.storageProvider}
                                />
                                <DetailCell
                                    label="Account"
                                    value={
                                        selectedAsset.createdFrom
                                            ?.storageProviderLabel
                                    }
                                />
                                <DetailCell
                                    label="Status"
                                    value={selectedAsset.status}
                                />
                                <DetailCell
                                    label="Requested Quality"
                                    value={
                                        selectedAsset.metadata?.requestedQuality
                                    }
                                />
                                <DetailCell
                                    label="Actual Quality"
                                    value={
                                        selectedAsset.metadata?.actualQuality
                                    }
                                />
                                <DetailCell
                                    label="Resolution"
                                    value={selectedAsset.metadata?.resolution}
                                />
                                <DetailCell
                                    label="Format ID"
                                    value={selectedAsset.metadata?.formatId}
                                    mono
                                />
                                <DetailCell
                                    label="Format Note"
                                    value={selectedAsset.metadata?.formatNote}
                                />
                                <DetailCell
                                    label="Codec"
                                    value={`${selectedAsset.metadata?.vcodec ?? "-"} / ${selectedAsset.metadata?.acodec ?? "-"}`}
                                />
                                <DetailCell
                                    label="Provider Asset ID"
                                    value={selectedAsset.providerAssetId}
                                    mono
                                />
                                <DetailCell
                                    label="Job Run ID"
                                    value={selectedAsset.createdFrom?.jobRunId}
                                    mono
                                />
                                <DetailCell
                                    label="Source ID"
                                    value={selectedAsset.createdFrom?.sourceId}
                                    mono
                                />
                                <DetailCell
                                    label="Created"
                                    value={formatDate(selectedAsset.createdAt)}
                                />
                                <DetailCell
                                    label="Source Description"
                                    value={selectedAsset.metadata?.description}
                                />
                                <DetailCell
                                    label="VI Title"
                                    value={
                                        selectedAsset.metadata?.vietnameseTitle
                                    }
                                />
                                <DetailCell
                                    label="VI Description"
                                    value={
                                        selectedAsset.metadata
                                            ?.vietnameseDescription
                                    }
                                />
                                <DetailCell
                                    label="VI Hashtags"
                                    value={
                                        selectedAsset.metadata?.vietnameseHashtags?.join(
                                            ", ",
                                        ) ?? null
                                    }
                                />
                                <div className="border border-main bg-main px-3 py-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                        Lifecycle
                                    </p>
                                    <div className="mt-1">
                                        <AssetLifecycleBadges
                                            tags={selectedAsset.metadata?.tags}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border border-main bg-main px-3 py-2">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                    Storage Pointer
                                </p>
                                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-main">
                                    {JSON.stringify(
                                        selectedAsset.storagePointer ?? {},
                                        null,
                                        2,
                                    )}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function DetailCell({
    label,
    value,
    mono = false,
}: {
    label: string;
    value?: string | number | null;
    mono?: boolean;
}) {
    return (
        <div className="border border-main bg-secondary/20 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {label}
            </p>
            <p
                className={`mt-1 truncate text-[12px] text-main ${
                    mono ? "font-mono text-[11px]" : ""
                }`}
            >
                {value ?? "-"}
            </p>
        </div>
    );
}
