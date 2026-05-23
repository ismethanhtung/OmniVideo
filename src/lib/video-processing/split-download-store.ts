import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";

type SplitDownloadEntry = {
    id: string;
    filePath: string;
    fileName: string;
    mimeType: string;
    createdAt: number;
    expiresAt: number;
};

type SplitDownloadStoreGlobal = typeof globalThis & {
    __omnivideoSplitDownloads?: Map<string, SplitDownloadEntry>;
};

const DOWNLOAD_TTL_MS = 6 * 60 * 60 * 1000;

function getStore() {
    const globalStore = globalThis as SplitDownloadStoreGlobal;
    globalStore.__omnivideoSplitDownloads ??= new Map();
    return globalStore.__omnivideoSplitDownloads;
}

async function cleanupExpired(now = Date.now()) {
    const store = getStore();
    for (const [id, entry] of store.entries()) {
        if (entry.expiresAt > now) continue;
        store.delete(id);
        await rm(entry.filePath, { force: true }).catch(() => undefined);
    }
}

export async function putSplitDownloadEntry(input: {
    filePath: string;
    fileName: string;
    mimeType?: string;
}) {
    const now = Date.now();
    await cleanupExpired(now);
    const entry: SplitDownloadEntry = {
        id: randomUUID(),
        filePath: input.filePath,
        fileName: input.fileName,
        mimeType: input.mimeType ?? "application/zip",
        createdAt: now,
        expiresAt: now + DOWNLOAD_TTL_MS,
    };
    getStore().set(entry.id, entry);
    return entry;
}

export async function takeSplitDownloadEntry(id: string) {
    await cleanupExpired();
    const entry = getStore().get(id) ?? null;
    if (!entry) return null;
    getStore().delete(id);
    return entry;
}

