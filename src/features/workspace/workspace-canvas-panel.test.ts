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
        expect(source).toContain("aria-label={`Start link from ${side}`}");
        expect(source).toContain(
            '(["top", "right", "bottom", "left"] as const)',
        );
        expect(source).toContain("activeSourceSide === side");
        expect(source).toContain("activeTargetSide === side");
        expect(source).toContain(
            'shouldRevealNodeHandles ? "block" : "hidden"',
        );
        expect(source).toContain('"border-indigo-600 ring-1 ring-indigo-300"');
    });

    it("exposes a direct edge delete affordance", () => {
        expect(source).toContain("deleteWorkspaceEdge");
        expect(source).toContain('aria-label="Delete link"');
        expect(source).toContain('role="button"');
        expect(source).toContain("transform={`translate(${midX} ${midY})`}");
        expect(source).toContain("workspace-edge-delete-control");
        expect(source).not.toContain("<foreignObject");
    });

    it("uses a visual picker for Storage Asset nodes", () => {
        expect(source).toContain("WorkspaceStorageAssetPicker");
        expect(source).toContain("Select existing video");
        expect(source).toContain(
            "/api/storage/assets/${asset._id}/download?disposition=inline",
        );
        expect(source).toContain("matchesVideoAssetSearch");
        expect(source).toContain("Search title, folder, tags...");
        expect(source).toContain("AssetLifecycleBadges");
    });

    it("asks confirmation before clearing draft", () => {
        expect(source).toContain(
            "Clear current Workspace draft and runtime state? This action cannot be undone.",
        );
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
        expect(source).toContain("findMaskUpstreamVideoNode");
        expect(source).toContain("findMirrorParityToAncestorNode");
        expect(source).toContain("buildEffectiveMaskSetup");
        expect(source).toMatch(
            /fallback blur regions from this setup are\s+auto mirrored horizontally/,
        );
        expect(source).toContain("Mirror output video");
    });

    it("supports enable toggle for preprocess and passthrough behavior", () => {
        expect(source).toContain("Enable preprocess");
        expect(source).toContain("function RuntimeNumberInput");
        expect(source).toContain("onBlur={commitDraft}");
        expect(source).toContain(
            "onCommit={(value) => setConfig({ speedFactor: value })}",
        );
        expect(source).toContain("getBooleanConfig(");
        expect(source).toContain('"enabled"');
        expect(source).toContain("Preprocess disabled (passthrough source)");
        expect(source).toContain("Bypassed preprocess.");
        expect(source).toContain("shouldForceStrictAlignment");
        expect(source).toContain(
            "runtime sẽ tự dùng strict alignment để tránh",
        );
        expect(source).toContain("Auto-forced strict alignment for");
    });

    it("documents publish fallback from Generate VI metadata when publish fields are empty", () => {
        expect(source).toContain("findUpstreamMetadataNode(");
        expect(source).toContain("runtimeVietnameseMetadataByNodeId");
        expect(source).toContain(
            "Nếu để trống Title/Caption/Hashtags, Publish sẽ tự lấy",
        );
        expect(source).toContain("WorkspaceThumbnailAssetPicker");
        expect(source).toContain("Thumbnail Library asset");
        expect(source).toContain("Select existing thumbnail");
        expect(source).toContain(
            "/api/storage/thumbnail-assets/${asset._id}/download?disposition=inline",
        );
        expect(source).toContain("matchesThumbnailAssetSearch");
        expect(source).toContain("thumbnailAssetId");
        expect(source).toContain("/api/storage/thumbnail-assets?limit=100");
        expect(source).toContain("upstreamMetadataNodeId");
        expect(source).toContain("fallbackMetadata");
        expect(source).toContain("<WorkspaceFlowSetupModal");
        expect(source).toContain("runtimeVietnameseMetadataByNodeId={");
    });

    it("persists lightweight resume checkpoints and supports publish-only continuation", () => {
        expect(source).toContain("WORKSPACE_RUNTIME_RESUME_STORAGE_KEY");
        expect(source).toContain("parseRuntimeResumeSnapshot");
        expect(source).toContain("buildWorkspaceGraphSignature");
        expect(source).toContain("buildRuntimeArtifactResumeSnapshot");
        expect(source).toContain('"vipResumeKey"');
        expect(source).toContain('"workspace-vip"');
        expect(source).toContain("runtimeArtifactsByNodeId");
        expect(source).toContain("hasStoredArtifactCheckpoint");
        expect(source).toContain("shouldUsePublishOnlyResume");
        expect(source).toContain(
            "window.localStorage.removeItem(WORKSPACE_RUNTIME_RESUME_STORAGE_KEY)",
        );
    });

    it("patches stored artifact with generated VI metadata and aligns edit runtime setup sourcing", () => {
        expect(source).toMatch(
            /findUpstreamSourceAssetNode\(\s*graph,\s*sourceNode\.id,\s*\)/,
        );
        expect(source).toContain("probeVideoDimensionsFromFile(source.file)");
        expect(source).toContain("{ width: 1920, height: 1080 }");
        expect(source).toContain("subtitlePlayResX");
        expect(source).toContain("subtitlePlayResY");
        expect(source).toContain("Patch storage asset metadata");
        expect(source).toContain("vietnameseTitle");
        expect(source).toContain("vietnameseDescription");
        expect(source).toContain("vietnameseHashtags");
        expect(source).toContain("const outputTitle =");
        expect(source).toContain("uploadForm.set(\"title\", outputTitle)");
    });

    it("keeps large runtime video artifacts server-side by artifact id", () => {
        expect(source).toContain("artifactId?: string;");
        expect(source).toContain("artifactExpiresAt?: string;");
        expect(source).toContain('formData.set("artifactId", upstreamArtifact.artifactId)');
        expect(source).toContain('uploadForm.set("artifactId", artifact.artifactId)');
        expect(source).toContain('formData.set("responseMode", "artifact")');
        expect(source).toContain("Server-side video artifact used.");
    });

    it("marks upstream raw assets once a processed output is stored", () => {
        expect(source).toContain("buildRawSourceProcessedOutputTags");
        expect(source).toContain("Mark raw source with processed output");
        expect(source).toContain("processedSourceTags");
    });

    it("publishes step-aware background progress without fake step percentages", () => {
        expect(source).toContain('progressMode: "indeterminate"');
        expect(source).toContain("startProgressStep");
        expect(source).toContain("finishProgressStep");
        expect(source).toContain("buildDubbingProgressStepDescription");
        expect(source).toContain("WorkspaceApiError");
        expect(source).toContain("buildWorkspaceApiFailureDetailLines");
        expect(source).toContain("VIP stage details:");
        expect(source).toContain("metrics:");
        expect(source).toContain("HTTP 413: request body too large");
        expect(source).toContain(
            "Server-side VIP is running. Live sub-stage status is not streamed in current mode.",
        );
        expect(source).toContain('vipStageLogs.join("\\n")');
        expect(source).toContain("progressStepDetailByKey");
        expect(source).toContain("Metadata:");
        expect(source).toContain("Size:");
        expect(source).toContain("Translation:");
        expect(source).toContain("Stage log:");
        expect(source).toContain("Completed transcript stage");
        expect(source).toContain("Voice chunks:");
        expect(source).toContain("Voice chunk ${chunk.index}");
        expect(source).toContain("Mix:");
        expect(source).toContain("Segments (");
        expect(source).not.toContain("more segment(s) not shown");
        expect(source).toContain("readWorkspaceResponseBlob");
        expect(source).toContain("Downloading asset source");
        expect(source).not.toContain(
            "Math.round((stepIndex / totalSteps) * 95)",
        );
    });

    it("does not render empty media src values for server-side runtime artifacts", () => {
        expect(source).toContain("function RuntimeArtifactPanel");
        expect(source).toContain("if (!artifact.base64) return null;");
        expect(source).toContain("Server-side artifact ready.");
        expect(source).toContain("{artifactUrl ? (");
    });

    it("surfaces non-blocking mask setup warnings in Flow Setup", () => {
        expect(source).toContain("getWorkspaceNodeSetupWarnings");
        expect(source).toContain("warningsByNodeId");
        expect(source).toContain("Review before run");
        expect(source).toContain("Flow can run, but review");
        expect(source).toContain("storageAssetMaskSetupIds");
    });

    it("keeps the subtle canvas dot grid attached to the transformed flow plane", () => {
        expect(source).toContain(
            'className="workspace-canvas-grid absolute left-0 top-0"',
        );
    });

    it("starts from a zoomed-out right-shifted canvas view", () => {
        expect(source).toContain(
            "const DEFAULT_CANVAS_VIEW = { x: 0, y: 0, scale: 0.6 };",
        );
        expect(source).toContain("useState(DEFAULT_CANVAS_VIEW)");
    });

    it("supports cleanup assets runtime controls and delete execution", () => {
        expect(source).toContain('node.templateNodeType === "cleanup.delete-assets"');
        expect(source).toContain("Delete original asset");
        expect(source).toContain("Delete processed asset");
        expect(source).toContain('step.kind === "cleanup-assets"');
        expect(source).toContain('actionLabel: "Cleanup asset"');
        expect(source).toContain('init: { method: "DELETE" }');
    });

    it("supports local download output node with browser and folder-picker modes", () => {
        expect(source).toContain('node.templateNodeType === "output.download-local"');
        expect(source).toContain("Browser Downloads folder");
        expect(source).toContain("Choose folder on every run");
        expect(source).toContain('step.kind === "download-local"');
        expect(source).toContain('url: `/api/storage/assets/${assetId}/download`');
        expect(source).toContain("showSaveFilePicker");
    });

    it("attaches locally saved Video Tools Lab setup during upload", () => {
        expect(source).toContain("loadLocalVideoEditSetup");
        expect(source).toContain("videoEditSetupJson");
        expect(source).toContain("Video Tools Lab setup found");
    });

    it("renders dragged link previews as Bézier curves", () => {
        expect(source).toContain("buildWorkspaceLinkPath");
        expect(source).toContain("const dragPath =");
        expect(source).toContain("d={dragPath}");
        expect(source).not.toContain(
            "L ${linkDragState.point.x} ${linkDragState.point.y}",
        );
    });
});
