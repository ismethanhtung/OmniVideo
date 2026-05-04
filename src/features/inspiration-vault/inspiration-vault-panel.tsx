"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    INSPIRATION_VAULT_STORAGE_KEY,
    INSPIRATION_VAULT_UPDATED_EVENT,
    deleteInspirationVaultItem,
    platformLabel,
    readInspirationVaultItems,
    toggleInspirationVaultItem,
    writeInspirationVaultItems,
    type InspirationCategory,
    type InspirationVaultItem,
} from "@/lib/inspiration-vault/inspiration-vault";

type InspirationVaultPanelProps = {
    section: LeftbarNavItem;
};

const CATEGORY_TABLES: Array<{ key: InspirationCategory; title: string }> = [
    { key: "video-source", title: "Video" },
    { key: "link", title: "Links" },
    { key: "keyword", title: "Keywords" },
    { key: "note", title: "Notes" },
];

function cn(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(new Date(value));
}

export function InspirationVaultPanel({ section }: InspirationVaultPanelProps) {
    void section;
    const [items, setItems] = useState<InspirationVaultItem[]>([]);
    const [copiedItemId, setCopiedItemId] = useState<string | null>(null);

    const loadItems = () => {
        setItems(readInspirationVaultItems());
    };

    useEffect(() => {
        loadItems();

        const handleVaultUpdate = () => loadItems();
        const handleStorage = (event: StorageEvent) => {
            if (!event.key || event.key === INSPIRATION_VAULT_STORAGE_KEY) {
                loadItems();
            }
        };

        window.addEventListener(
            INSPIRATION_VAULT_UPDATED_EVENT,
            handleVaultUpdate,
        );
        window.addEventListener("storage", handleStorage);

        return () => {
            window.removeEventListener(
                INSPIRATION_VAULT_UPDATED_EVENT,
                handleVaultUpdate,
            );
            window.removeEventListener("storage", handleStorage);
        };
    }, []);

    const groupedItems = useMemo(
        () => ({
            "video-source": items.filter(
                (item) => item.category === "video-source",
            ),
            link: items.filter((item) => item.category === "link"),
            keyword: items.filter(
                (item) => item.category === "keyword",
            ),
            note: items.filter((item) => item.category === "note"),
        }),
        [items],
    );

    const persistItems = (nextItems: InspirationVaultItem[]) => {
        writeInspirationVaultItems(nextItems);
        setItems(nextItems);
        window.dispatchEvent(new CustomEvent(INSPIRATION_VAULT_UPDATED_EVENT));
    };

    const toggleItem = (itemId: string, exploited: boolean) => {
        const nextItems = toggleInspirationVaultItem(items, itemId, exploited);
        persistItems(nextItems);
    };

    const deleteItem = (itemId: string) => {
        const nextItems = deleteInspirationVaultItem(items, itemId);
        persistItems(nextItems);
    };

    return (
        <section className="flex h-full min-h-0 flex-col overflow-hidden border border-main bg-main">
            <div className="flex h-full min-h-0 flex-col gap-4 px-5 py-5">
                <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2 lg:grid-rows-2">
                    {CATEGORY_TABLES.map((categoryTable) => (
                        <div
                            key={categoryTable.key}
                            className="flex h-full min-h-0 flex-col overflow-hidden border border-main bg-main"
                        >
                            <div className="border-b border-main bg-secondary/25 px-3 py-2">
                                <p className="text-[12px] font-semibold text-main">
                                    {categoryTable.title}
                                </p>
                            </div>
                            {groupedItems[categoryTable.key].length === 0 ? (
                                <div className="flex min-h-0 flex-1 items-center justify-center px-3 py-5 text-[11px] text-muted">
                                    No items.
                                </div>
                            ) : (
                                <div className="min-h-0 flex-1 overflow-auto">
                                    <table className="w-full border-collapse text-left text-[12px]">
                                        <thead className="border-b border-main bg-secondary/45 text-muted">
                                            <tr>
                                                <th className="px-3 py-2 font-semibold">
                                                    Platform
                                                </th>
                                                <th className="px-3 py-2 font-semibold">
                                                    Content
                                                </th>
                                                <th className="px-3 py-2 font-semibold">
                                                    Captured
                                                </th>
                                                <th className="px-3 py-2 font-semibold">
                                                    Status
                                                </th>
                                                <th className="px-3 py-2 font-semibold">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {groupedItems[
                                                categoryTable.key
                                            ].map((item) => (
                                                <VaultItemRow
                                                    key={item.id}
                                                    item={item}
                                                    onToggle={toggleItem}
                                                    onDelete={deleteItem}
                                                    copied={
                                                        copiedItemId === item.id
                                                    }
                                                    onCopied={(itemId) => {
                                                        setCopiedItemId(itemId);
                                                        window.setTimeout(
                                                            () => {
                                                                setCopiedItemId(
                                                                    (
                                                                        current,
                                                                    ) =>
                                                                        current ===
                                                                        itemId
                                                                            ? null
                                                                            : current,
                                                                );
                                                            },
                                                            1200,
                                                        );
                                                    }}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

function VaultItemRow({
    item,
    onToggle,
    onDelete,
    copied,
    onCopied,
}: {
    item: InspirationVaultItem;
    onToggle: (itemId: string, exploited: boolean) => void;
    onDelete: (itemId: string) => void;
    copied: boolean;
    onCopied: (itemId: string) => void;
}) {
    const handleCopy = async () => {
        const fallbackCopy = () => {
            const textarea = document.createElement("textarea");
            textarea.value = item.raw;
            textarea.setAttribute("readonly", "true");
            textarea.style.position = "absolute";
            textarea.style.left = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand("copy");
            document.body.removeChild(textarea);
            return copied;
        };

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(item.raw);
            } else if (!fallbackCopy()) {
                return;
            }
            onCopied(item.id);
        } catch {
            if (fallbackCopy()) {
                onCopied(item.id);
            }
        }
    };

    return (
        <tr
            className={cn(
                "border-b border-main align-middle transition-colors",
                copied && "bg-emerald-500/10",
                item.exploited && "opacity-70",
            )}
        >
            <td className="px-3 py-2 text-muted">
                {platformLabel(item.platform)}
            </td>
            <td className="max-w-[380px] px-3 py-2">
                <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="block w-full cursor-pointer text-left"
                    title="Click to copy content"
                >
                    <p className="truncate text-[11px] text-muted hover:text-main">
                        {item.raw}
                    </p>
                </button>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-[11px] text-muted">
                {formatDate(item.createdAt)}
            </td>
            <td className="px-3 py-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 px-2 py-1 text-[10px] font-semibold text-main">
                    <input
                        type="checkbox"
                        checked={item.exploited}
                        onChange={(event) =>
                            onToggle(item.id, event.target.checked)
                        }
                        className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                    />
                    Exploited
                </label>
            </td>
            <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => onDelete(item.id)}
                        className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-muted hover:bg-secondary hover:text-main"
                    >
                        <Trash2 className="h-3 w-3" />
                        Delete
                    </button>
                </div>
            </td>
        </tr>
    );
}
