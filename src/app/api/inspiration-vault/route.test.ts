import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
    createInspirationVaultItem,
    getInspirationVaultDb,
    listInspirationVaultItems,
} from "@/lib/inspiration-vault/repository";

import { GET, POST } from "./route";

vi.mock("@/lib/inspiration-vault/repository", () => ({
    createInspirationVaultItem: vi.fn(),
    getInspirationVaultDb: vi.fn(),
    listInspirationVaultItems: vi.fn(),
}));

const mockedGetDb = vi.mocked(getInspirationVaultDb);
const mockedListItems = vi.mocked(listInspirationVaultItems);
const mockedCreateItem = vi.mocked(createInspirationVaultItem);

describe("inspiration vault API", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    beforeEach(() => {
        mockedGetDb.mockReset();
        mockedListItems.mockReset();
        mockedCreateItem.mockReset();
    });

    it("lists inspiration vault items", async () => {
        const db = { databaseName: "test" };
        mockedGetDb.mockResolvedValueOnce(db as never);
        mockedListItems.mockResolvedValueOnce([
            {
                id: "item-1",
                raw: "content angle",
                title: "content angle",
                category: "keyword",
                platform: "unknown",
                tags: ["keyword"],
                exploited: false,
                createdAt: "2026-05-04T00:00:00.000Z",
                updatedAt: "2026-05-04T00:00:00.000Z",
            },
        ]);

        const response = await GET();
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data).toHaveLength(1);
        expect(mockedListItems).toHaveBeenCalledWith(db);
    });

    it("rejects empty capture input", async () => {
        const db = { databaseName: "test" };
        mockedGetDb.mockResolvedValueOnce(db as never);
        mockedCreateItem.mockResolvedValueOnce(null);

        const response = await POST(
            new Request("http://localhost/api/inspiration-vault", {
                method: "POST",
                body: JSON.stringify({ rawInput: "   " }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_INSPIRATION_INPUT_EMPTY",
        });
    });

    it("blocks public demo capture before touching MongoDB", async () => {
        vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");

        const response = await POST(
            new Request("http://localhost/api/inspiration-vault", {
                method: "POST",
                body: JSON.stringify({ rawInput: "content angle" }),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "DEMO_WRITE_DISABLED",
        });
        expect(mockedGetDb).not.toHaveBeenCalled();
        expect(mockedCreateItem).not.toHaveBeenCalled();
    });
});
