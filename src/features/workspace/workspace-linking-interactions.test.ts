import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/workspace/workspace-canvas-panel.tsx";

describe("Workspace linking interactions", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("supports drag-to-connect handles and edge delete", () => {
        expect(source).toContain("data-workspace-node-id={node.id}");
        expect(source).toContain("startLinkDrag");
        expect(source).toContain("getClosestNodeHandleSide");
        expect(source).toContain("activeSourceSide");
        expect(source).toContain("activeTargetSide");
        expect(source).toContain("Delete link");
        expect(source).toContain("deleteWorkspaceEdge");
    });
});

