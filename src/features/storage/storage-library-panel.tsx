"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { buildStorageLocationUrl } from "@/lib/storage/storage-location";

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
        resolver?: string;
        requestedQuality?: string;
    };
    createdFrom?: {
        sourceId?: string;
        jobRunId?: string;
        storageProviderAccountId?: string | null;
        storageProviderLabel?: string | null;
    };
    createdAt?: string;
};

type AssetsApiResponse = {
    ok: boolean;
    data?: StoredVideoAsset[];
    error?: string;
};

type StorageLibraryPanelProps = {
    section: LeftbarNavItem;
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

export function StorageLibraryPanel({ section }: StorageLibraryPanelProps) {
    const Icon = section.icon;
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
    const [status, setStatus] = useState<
        "idle" | "loading" | "failed" | "ready"
    >("idle");
    const [message, setMessage] = useState("Ready.");

    const loadAssets = async () => {
        setStatus("loading");
        setMessage("Loading storage metadata...");

        try {
            const response = await fetch("/api/storage/assets?limit=50", {
                method: "GET",
                cache: "no-store",
            });
            const payload = (await response.json()) as AssetsApiResponse;

            if (!response.ok || !payload.ok) {
                setStatus("failed");
                setMessage(payload.error ?? "Could not load assets.");
                return;
            }

            setAssets(payload.data ?? []);
            setStatus("ready");
            setMessage(`Loaded ${(payload.data ?? []).length} video assets.`);
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
        void loadAssets();
    }, []);

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

                <button
                    type="button"
                    onClick={() => {
                        void loadAssets();
                    }}
                    disabled={status === "loading"}
                    className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
                    />
                    {status === "loading" ? "Loading..." : "Refresh"}
                </button>
            </header>

            <div className="border-b border-main bg-secondary/25 px-5 py-3">
                <span className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                    {status}
                </span>
                <span className="ml-3 text-[12px] text-muted">{message}</span>
                <span className="ml-3 text-[12px] text-muted">
                    Ready: {stats.readyCount} · Total size:{" "}
                    {formatBytes(stats.totalBytes)}
                </span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-[12px]">
                    <thead className="border-b border-main bg-secondary/45 text-muted">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Asset</th>
                            <th className="px-4 py-2 font-semibold">
                                Provider
                            </th>
                            <th className="px-4 py-2 font-semibold">Status</th>
                            <th className="px-4 py-2 font-semibold">
                                Platform
                            </th>
                            {/* <th className="px-4 py-2 font-semibold">Mime</th> */}
                            <th className="px-4 py-2 font-semibold">Size</th>
                            <th className="px-4 py-2 font-semibold">
                                Duration
                            </th>
                            <th className="px-4 py-2 font-semibold">Created</th>
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
                                const isExpanded =
                                    expandedAssetId === asset._id;

                                return (
                                    <Fragment key={asset._id}>
                                        <tr className="border-b border-main last:border-b-0">
                                            <td className="max-w-[320px] px-4 py-3">
                                                {storageUrl ? (
                                                    <a
                                                        href={storageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block truncate font-medium text-main underline-offset-2 hover:underline"
                                                    >
                                                        {asset.metadata
                                                            ?.title ??
                                                            asset._id}
                                                    </a>
                                                ) : (
                                                    <p className="truncate font-medium text-main">
                                                        {asset.metadata
                                                            ?.title ??
                                                            asset._id}
                                                    </p>
                                                )}
                                                <p className="mt-1 truncate font-mono text-[11px] text-muted">
                                                    {asset.metadata
                                                        ?.sourceUrl ?? "-"}
                                                </p>
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
                                                {asset.metadata
                                                    ?.originPlatform ?? "-"}
                                            </td>
                                            {/* <td className="px-4 py-3 text-muted">
                                                {asset.mimeType ?? "-"}
                                            </td> */}
                                            <td className="px-4 py-3 text-muted">
                                                {formatBytes(asset.sizeBytes)}
                                            </td>
                                            <td className="px-4 py-3 text-muted">
                                                {formatDuration(
                                                    asset.durationMs,
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-4 py-3 text-muted">
                                                {formatDate(asset.createdAt)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {storageUrl ? (
                                                    <a
                                                        href={storageUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                    >
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                        Open
                                                    </a>
                                                ) : (
                                                    <span className="text-[11px] text-muted">
                                                        No link
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedAssetId(
                                                            (current) =>
                                                                current ===
                                                                asset._id
                                                                    ? null
                                                                    : asset._id,
                                                        )
                                                    }
                                                    className="border border-main bg-secondary px-2 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                                                >
                                                    {isExpanded
                                                        ? "Hide"
                                                        : "Detail"}
                                                </button>
                                            </td>
                                        </tr>
                                        {isExpanded ? (
                                            <tr className="border-b border-main bg-secondary/15">
                                                <td
                                                    className="px-4 py-3"
                                                    colSpan={10}
                                                >
                                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Resolver
                                                            </p>
                                                            <p className="mt-1 text-[12px] text-main">
                                                                {asset.metadata
                                                                    ?.resolver ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Requested
                                                                Quality
                                                            </p>
                                                            <p className="mt-1 text-[12px] text-main">
                                                                {asset.metadata
                                                                    ?.requestedQuality ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Provider Asset
                                                                ID
                                                            </p>
                                                            <p className="mt-1 truncate font-mono text-[11px] text-main">
                                                                {asset.providerAssetId ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Job Run ID
                                                            </p>
                                                            <p className="mt-1 truncate font-mono text-[11px] text-main">
                                                                {asset
                                                                    .createdFrom
                                                                    ?.jobRunId ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Source ID
                                                            </p>
                                                            <p className="mt-1 truncate font-mono text-[11px] text-main">
                                                                {asset
                                                                    .createdFrom
                                                                    ?.sourceId ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                        <div className="border border-main bg-main px-3 py-2">
                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                                Account ID
                                                            </p>
                                                            <p className="mt-1 truncate font-mono text-[11px] text-main">
                                                                {asset
                                                                    .createdFrom
                                                                    ?.storageProviderAccountId ??
                                                                    "-"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 border border-main bg-main px-3 py-2">
                                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                                                            Storage Pointer
                                                        </p>
                                                        <pre className="mt-1 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-main">
                                                            {JSON.stringify(
                                                                asset.storagePointer ??
                                                                    {},
                                                                null,
                                                                2,
                                                            )}
                                                        </pre>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : null}
                                    </Fragment>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
