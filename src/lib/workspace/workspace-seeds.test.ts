import { describe, expect, it } from "vitest";

import { WORKSPACE_SEED_TEMPLATES } from "./workspace-seeds";

describe("workspace seed templates", () => {
    it("registers VI voice mask publish seed", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "vi-voice-mask-publish",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed VI Voice Mask Publish");
        expect(seed?.buildGraph().nodes.length).toBeGreaterThan(0);
    });
});
