import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/workspace/workspace-canvas-panel.tsx";

describe("Workspace clear warning", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("confirms before clearing the draft", () => {
        expect(source).toContain("Clear current Workspace draft and runtime state? This action cannot be undone.");
        expect(source).toContain("!confirm(");
    });
});

