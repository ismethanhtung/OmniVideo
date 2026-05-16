import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/workspace/workspace-canvas-panel.tsx";

describe("WorkspaceCanvasPanel canvas interactions", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("keeps direct drag-to-connect hooks on canvas nodes", () => {
        expect(source).toContain("data-workspace-node-id={node.id}");
        expect(source).toContain("startLinkDrag");
        expect(source).toContain("linkDragTarget");
        expect(source).toContain("getClosestNodeHandleSide");
        expect(source).toContain("activeSourceSide");
        expect(source).toContain("activeTargetSide");
        expect(source).toContain('aria-label={`Start link from ${side}`}');
        expect(source).toContain('(["top", "right", "bottom", "left"] as const)');
        expect(source).toContain("activeSourceSide === side");
        expect(source).toContain("activeTargetSide === side");
        expect(source).toContain("shouldRevealNodeHandles ? \"block\" : \"hidden\"");
        expect(source).toContain("\"border-indigo-600 ring-1 ring-indigo-300\"");
    });

    it("exposes a direct edge delete affordance", () => {
        expect(source).toContain("deleteWorkspaceEdge");
        expect(source).toContain('aria-label="Delete link"');
    });

    it("uses a visual picker for Storage Asset nodes", () => {
        expect(source).toContain("WorkspaceStorageAssetPicker");
        expect(source).toContain("Select existing video");
        expect(source).toContain("/api/storage/assets/${asset._id}/download?disposition=inline");
    });

    it("asks confirmation before clearing draft", () => {
        expect(source).toContain("Clear current Workspace draft and runtime state? This action cannot be undone.");
        expect(source).toContain("if (");
        expect(source).toContain("!confirm(");
    });

    it("routes Run Flow through a centralized Flow Setup modal", () => {
        expect(source).toContain("isFlowSetupOpen");
        expect(source).toContain("WorkspaceFlowSetupModal");
        expect(source).toContain("const openFlowSetup = () =>");
        expect(source).toContain("onRun={openFlowSetup}");
        expect(source).toContain("Flow Setup");
        expect(source).toContain("Resolve before run");
        expect(source).toContain("<NodeRuntimeConfig");
    });

    it("hydrates mask setup from source asset metadata in UI and runtime", () => {
        expect(source).toContain("resolveMaskRegionConfig");
        expect(source).toContain("Using saved video setup from Storage Asset");
        expect(source).toContain("sourceAssetSetup");
    });

    it("supports enable toggle for preprocess and passthrough behavior", () => {
        expect(source).toContain("Enable preprocess");
        expect(source).toContain("getBooleanConfig(");
        expect(source).toContain('"enabled"');
        expect(source).toContain("Preprocess disabled (passthrough source)");
        expect(source).toContain("Bypassed preprocess.");
    });

    it("documents publish fallback from Generate VI metadata when publish fields are empty", () => {
        expect(source).toContain("findUpstreamMetadataNodeId");
        expect(source).toContain("runtimeVietnameseMetadataByNodeId");
        expect(source).toContain(
            "Nếu để trống Title/Caption/Hashtags, Publish sẽ tự lấy",
        );
        expect(source).toContain("upstreamMetadataNodeId");
        expect(source).toContain("fallbackMetadata");
        expect(source).toContain(
            "<WorkspaceFlowSetupModal",
        );
        expect(source).toContain(
            "runtimeVietnameseMetadataByNodeId={",
        );
    });
});
