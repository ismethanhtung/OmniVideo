import { describe, expect, it } from "vitest";

import {
    classifyInspirationInput,
    deleteInspirationVaultItem,
    isValidInspirationVaultItemId,
    toggleInspirationVaultItem,
} from "./inspiration-vault";

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

describe("inspiration vault collection helpers", () => {
    it("toggles exploited state and deletes an item", () => {
        const draft = classifyInspirationInput("content angle", {
            ...fixedOptions,
            idFactory: () => "toggle-me",
        });

        expect(draft.ok).toBe(true);
        if (!draft.ok) return;
        const toggled = toggleInspirationVaultItem(
            [draft.item],
            "toggle-me",
            true,
            new Date("2026-05-04T01:00:00.000Z"),
        );
        expect(toggled[0]?.exploited).toBe(true);
        expect(toggled[0]?.updatedAt).toBe("2026-05-04T01:00:00.000Z");
        expect(deleteInspirationVaultItem(toggled, "toggle-me")).toEqual([]);
    });

    it("validates URL-safe item ids for item API routes", () => {
        expect(isValidInspirationVaultItemId("item-123")).toBe(true);
        expect(isValidInspirationVaultItemId("bad id")).toBe(false);
        expect(isValidInspirationVaultItemId("x")).toBe(false);
    });
});
