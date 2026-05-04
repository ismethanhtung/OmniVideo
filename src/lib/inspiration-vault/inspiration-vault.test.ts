import { describe, expect, it } from "vitest";

import {
    INSPIRATION_VAULT_STORAGE_KEY,
    captureInspirationVaultInput,
    classifyInspirationInput,
    deleteInspirationVaultItem,
    readInspirationVaultItems,
    toggleInspirationVaultItem,
} from "./inspiration-vault";

function createMemoryStorage(initial?: string) {
    const store = new Map<string, string>();

    if (initial) {
        store.set(INSPIRATION_VAULT_STORAGE_KEY, initial);
    }

    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
}

const fixedOptions = {
    now: new Date("2026-05-04T00:00:00.000Z"),
    idFactory: () => "item-1",
};

describe("inspiration vault classification", () => {
    it("classifies a Bilibili video URL as a video source", () => {
        const draft = classifyInspirationInput(
            "https://www.bilibili.com/video/BV11i4y1t799/",
            fixedOptions,
        );

        expect(draft.ok).toBe(true);
        if (!draft.ok) return;
        expect(draft.item.category).toBe("video-source");
        expect(draft.item.platform).toBe("bilibili");
        expect(draft.item.referenceId).toBe("BV11i4y1t799");
        expect(draft.item.tags).toContain("bilibili");
    });

    it("classifies short free-form text as a keyword", () => {
        const draft = classifyInspirationInput("画渣花小烙", fixedOptions);

        expect(draft.ok).toBe(true);
        if (!draft.ok) return;
        expect(draft.item.category).toBe("keyword");
        expect(draft.item.platform).toBe("unknown");
        expect(draft.item.title).toBe("画渣花小烙");
    });

    it("rejects empty input without creating an item", () => {
        expect(classifyInspirationInput("   ")).toEqual({
            ok: false,
            reason: "empty",
        });
    });

    it("falls back malformed URL-like input to keyword instead of throwing", () => {
        const draft = classifyInspirationInput("https://", fixedOptions);

        expect(draft.ok).toBe(true);
        if (!draft.ok) return;
        expect(draft.item.category).toBe("keyword");
        expect(draft.item.raw).toBe("https://");
    });
});

describe("inspiration vault storage helpers", () => {
    it("captures new items at the top of local storage", () => {
        const storage = createMemoryStorage();

        const first = captureInspirationVaultInput("first keyword", storage, {
            ...fixedOptions,
            idFactory: () => "first",
        });
        const second = captureInspirationVaultInput(
            "https://www.douyin.com/video/123",
            storage,
            {
                ...fixedOptions,
                idFactory: () => "second",
            },
        );

        expect(first.ok).toBe(true);
        expect(second.ok).toBe(true);
        expect(readInspirationVaultItems(storage).map((item) => item.id)).toEqual([
            "second",
            "first",
        ]);
    });

    it("toggles exploited state and deletes an item", () => {
        const storage = createMemoryStorage();
        const draft = captureInspirationVaultInput("content angle", storage, {
            ...fixedOptions,
            idFactory: () => "toggle-me",
        });

        expect(draft.ok).toBe(true);
        const toggled = toggleInspirationVaultItem(
            readInspirationVaultItems(storage),
            "toggle-me",
            true,
            new Date("2026-05-04T01:00:00.000Z"),
        );
        expect(toggled[0]?.exploited).toBe(true);
        expect(toggled[0]?.updatedAt).toBe("2026-05-04T01:00:00.000Z");
        expect(deleteInspirationVaultItem(toggled, "toggle-me")).toEqual([]);
    });

    it("treats corrupted storage as an empty vault", () => {
        const storage = createMemoryStorage("{bad json");

        expect(readInspirationVaultItems(storage)).toEqual([]);
    });
});
