import type { Db } from "mongodb";

import {
    classifyInspirationInput,
    type ClassifyOptions,
    type InspirationCategory,
    type InspirationPlatform,
    type InspirationVaultItem,
} from "./inspiration-vault";

export const INSPIRATION_VAULT_COLLECTION = "inspiration_vault_items";

type InspirationVaultDocument = {
    id: string;
    raw: string;
    title: string;
    category: InspirationCategory;
    platform: InspirationPlatform;
    url?: string;
    host?: string;
    referenceId?: string;
    tags: string[];
    exploited: boolean;
    createdAt: Date;
    updatedAt: Date;
};

export async function getInspirationVaultDb(): Promise<Db> {
    const { getMongoDb } = await import("@/lib/db/mongodb");
    return getMongoDb();
}

function toDate(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function toDocument(item: InspirationVaultItem): InspirationVaultDocument {
    return {
        ...item,
        createdAt: toDate(item.createdAt),
        updatedAt: toDate(item.updatedAt),
    };
}

function fromDocument(document: InspirationVaultDocument): InspirationVaultItem {
    return {
        id: document.id,
        raw: document.raw,
        title: document.title,
        category: document.category,
        platform: document.platform,
        url: document.url,
        host: document.host,
        referenceId: document.referenceId,
        tags: document.tags,
        exploited: document.exploited,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
    };
}

export async function listInspirationVaultItems(
    db: Db,
): Promise<InspirationVaultItem[]> {
    const documents = await db
        .collection<InspirationVaultDocument>(INSPIRATION_VAULT_COLLECTION)
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

    return documents.map(fromDocument);
}

export async function createInspirationVaultItem({
    db,
    rawInput,
    options,
}: {
    db: Db;
    rawInput: string;
    options?: ClassifyOptions;
}): Promise<InspirationVaultItem | null> {
    const draft = classifyInspirationInput(rawInput, options);

    if (!draft.ok) {
        return null;
    }

    const document = toDocument(draft.item);
    await db
        .collection<InspirationVaultDocument>(INSPIRATION_VAULT_COLLECTION)
        .insertOne(document);

    return draft.item;
}

export async function updateInspirationVaultItemExploited({
    db,
    itemId,
    exploited,
    now = new Date(),
}: {
    db: Db;
    itemId: string;
    exploited: boolean;
    now?: Date;
}): Promise<InspirationVaultItem | null> {
    const document = await db
        .collection<InspirationVaultDocument>(INSPIRATION_VAULT_COLLECTION)
        .findOneAndUpdate(
            { id: itemId },
            {
                $set: {
                    exploited,
                    updatedAt: now,
                },
            },
            { returnDocument: "after" },
        );

    if (!document) {
        return null;
    }

    return fromDocument(document);
}

export async function deleteInspirationVaultItemById({
    db,
    itemId,
}: {
    db: Db;
    itemId: string;
}): Promise<boolean> {
    const result = await db
        .collection<InspirationVaultDocument>(INSPIRATION_VAULT_COLLECTION)
        .deleteOne({ id: itemId });

    return result.deletedCount === 1;
}
