import { describe, expect, it, vi } from "vitest";

import {
    createInspirationVaultItem,
    deleteInspirationVaultItemById,
    listInspirationVaultItems,
    updateInspirationVaultItemExploited,
} from "./repository";

function createCollection(overrides: Record<string, unknown> = {}) {
    return {
        find: vi.fn(() => ({
            sort: vi.fn(() => ({
                toArray: vi.fn().mockResolvedValue([
                    {
                        id: "item-1",
                        raw: "https://www.bilibili.com/video/BV11i4y1t799/",
                        title: "Bilibili BV11i4y1t799",
                        category: "video-source",
                        platform: "bilibili",
                        url: "https://www.bilibili.com/video/BV11i4y1t799/",
                        host: "bilibili.com",
                        referenceId: "BV11i4y1t799",
                        tags: ["video-source", "bilibili", "BV11i4y1t799"],
                        exploited: false,
                        createdAt: new Date("2026-05-04T00:00:00.000Z"),
                        updatedAt: new Date("2026-05-04T00:00:00.000Z"),
                    },
                ]),
            })),
        })),
        insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
        findOneAndUpdate: vi.fn(),
        deleteOne: vi.fn(),
        ...overrides,
    };
}

function createDb(collection: Record<string, unknown>) {
    return {
        collection: vi.fn(() => collection),
    };
}

describe("inspiration vault repository", () => {
    it("lists items sorted by newest capture first", async () => {
        const collection = createCollection();
        const db = createDb(collection);

        const items = await listInspirationVaultItems(db as never);

        expect(db.collection).toHaveBeenCalledWith("inspiration_vault_items");
        expect(collection.find).toHaveBeenCalledWith({});
        expect(items[0]).toMatchObject({
            id: "item-1",
            platform: "bilibili",
            createdAt: "2026-05-04T00:00:00.000Z",
        });
    });

    it("creates a classified Mongo document", async () => {
        const collection = createCollection();
        const db = createDb(collection);

        const item = await createInspirationVaultItem({
            db: db as never,
            rawInput: "content angle",
            options: {
                now: new Date("2026-05-04T00:00:00.000Z"),
                idFactory: () => "item-2",
            },
        });

        expect(item?.id).toBe("item-2");
        expect(collection.insertOne).toHaveBeenCalledWith(
            expect.objectContaining({
                id: "item-2",
                raw: "content angle",
                category: "keyword",
                createdAt: new Date("2026-05-04T00:00:00.000Z"),
            }),
        );
    });

    it("returns null instead of inserting empty input", async () => {
        const collection = createCollection();
        const db = createDb(collection);

        const item = await createInspirationVaultItem({
            db: db as never,
            rawInput: "   ",
        });

        expect(item).toBeNull();
        expect(collection.insertOne).not.toHaveBeenCalled();
    });

    it("updates exploited state and deletes by item id", async () => {
        const collection = createCollection({
            findOneAndUpdate: vi.fn().mockResolvedValue({
                id: "item-3",
                raw: "note",
                title: "note",
                category: "keyword",
                platform: "unknown",
                tags: ["keyword"],
                exploited: true,
                createdAt: new Date("2026-05-04T00:00:00.000Z"),
                updatedAt: new Date("2026-05-04T01:00:00.000Z"),
            }),
            deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
        });
        const db = createDb(collection);

        const updated = await updateInspirationVaultItemExploited({
            db: db as never,
            itemId: "item-3",
            exploited: true,
            now: new Date("2026-05-04T01:00:00.000Z"),
        });
        const deleted = await deleteInspirationVaultItemById({
            db: db as never,
            itemId: "item-3",
        });

        expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
            { id: "item-3" },
            {
                $set: {
                    exploited: true,
                    updatedAt: new Date("2026-05-04T01:00:00.000Z"),
                },
            },
            { returnDocument: "after" },
        );
        expect(updated?.exploited).toBe(true);
        expect(collection.deleteOne).toHaveBeenCalledWith({ id: "item-3" });
        expect(deleted).toBe(true);
    });
});
