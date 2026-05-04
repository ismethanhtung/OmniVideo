import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    deleteInspirationVaultItemById,
    getInspirationVaultDb,
    updateInspirationVaultItemExploited,
} from "@/lib/inspiration-vault/repository";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/inspiration-vault/repository", () => ({
    deleteInspirationVaultItemById: vi.fn(),
    getInspirationVaultDb: vi.fn(),
    updateInspirationVaultItemExploited: vi.fn(),
}));

const mockedGetDb = vi.mocked(getInspirationVaultDb);
const mockedUpdateItem = vi.mocked(updateInspirationVaultItemExploited);
const mockedDeleteItem = vi.mocked(deleteInspirationVaultItemById);

describe("inspiration vault item API", () => {
    beforeEach(() => {
        mockedGetDb.mockReset();
        mockedUpdateItem.mockReset();
        mockedDeleteItem.mockReset();
    });

    it("rejects invalid item ids", async () => {
        const response = await PATCH(
            new Request("http://localhost/api/inspiration-vault/bad%20id", {
                method: "PATCH",
                body: JSON.stringify({ exploited: true }),
            }),
            { params: Promise.resolve({ itemId: "bad id" }) },
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.errorCode).toBe("VAL_INSPIRATION_ITEM_ID_INVALID");
        expect(mockedUpdateItem).not.toHaveBeenCalled();
    });

    it("updates exploited state", async () => {
        const db = { databaseName: "test" };
        mockedGetDb.mockResolvedValueOnce(db as never);
        mockedUpdateItem.mockResolvedValueOnce({
            id: "item-123",
            raw: "note",
            title: "note",
            category: "keyword",
            platform: "unknown",
            tags: ["keyword"],
            exploited: true,
            createdAt: "2026-05-04T00:00:00.000Z",
            updatedAt: "2026-05-04T01:00:00.000Z",
        });

        const response = await PATCH(
            new Request("http://localhost/api/inspiration-vault/item-123", {
                method: "PATCH",
                body: JSON.stringify({ exploited: true }),
            }),
            { params: Promise.resolve({ itemId: "item-123" }) },
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data.exploited).toBe(true);
        expect(mockedUpdateItem).toHaveBeenCalledWith({
            db,
            itemId: "item-123",
            exploited: true,
        });
    });

    it("deletes an item", async () => {
        const db = { databaseName: "test" };
        mockedGetDb.mockResolvedValueOnce(db as never);
        mockedDeleteItem.mockResolvedValueOnce(true);

        const response = await DELETE(
            new Request("http://localhost/api/inspiration-vault/item-123", {
                method: "DELETE",
            }),
            { params: Promise.resolve({ itemId: "item-123" }) },
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            ok: true,
            data: { deleted: true },
        });
        expect(mockedDeleteItem).toHaveBeenCalledWith({
            db,
            itemId: "item-123",
        });
    });
});
