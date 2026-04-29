import { describe, expect, it } from "vitest";

import {
    WORKSPACE_NODE_TEMPLATES,
    addWorkspaceNode,
    connectWorkspaceNodes,
    createDouyinReworkSampleGraph,
    createEmptyWorkspaceGraph,
    createAssetToSocialSampleGraph,
    createUploadToStorageSampleGraph,
    createUploadToSocialSampleGraph,
    getWorkspaceExecutableUploadToSocialPlan,
    moveWorkspaceNode,
    parseWorkspaceDraft,
    planWorkspaceFlow,
    serializeWorkspaceDraft,
    updateWorkspaceNodeConfig,
    validateWorkspaceConnection,
    validateWorkspaceGraph,
    type WorkspaceGraph,
} from "./workspace-graph";

describe("workspace graph helpers", () => {
    it("adds a node from template with stable instance defaults", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        );

        expect(template).toBeDefined();

        const graph = addWorkspaceNode(
            createEmptyWorkspaceGraph("Draft"),
            template!,
            { x: 100, y: 160 },
        );

        expect(graph.nodes).toHaveLength(1);
        expect(graph.selectedNodeId).toBe("edit-mirror-1");
        expect(graph.nodes[0]).toMatchObject({
            id: "edit-mirror-1",
            templateNodeType: "edit.mirror",
            label: "Mirror Video",
            position: { x: 100, y: 160 },
            config: { axis: "horizontal" },
        });
    });

    it("connects nodes and rejects missing or duplicate edges", () => {
        const sourceTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.url",
        );
        const maskTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mask-region",
        );
        let graph = createEmptyWorkspaceGraph("Draft");

        graph = addWorkspaceNode(graph, sourceTemplate!, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, maskTemplate!, { x: 220, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-url-1",
            "edit-mask-region-1",
        );

        expect(graph.edges).toHaveLength(1);
        expect(graph.edges[0]).toMatchObject({
            fromNodeId: "source-url-1",
            toNodeId: "edit-mask-region-1",
        });
        expect(() =>
            connectWorkspaceNodes(graph, "source-url-1", "edit-mask-region-1"),
        ).toThrow("Kết nối này đã tồn tại");
        expect(() =>
            connectWorkspaceNodes(graph, "missing-node", "edit-mask-region-1"),
        ).toThrow("node nguồn hoặc node đích");
    });

    it("moves a node without dropping graph edges", () => {
        const sourceTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        );
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        );
        let graph = createEmptyWorkspaceGraph("Draft");

        graph = addWorkspaceNode(graph, sourceTemplate!, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate!, { x: 220, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "social-publish-1",
        );
        graph = moveWorkspaceNode(graph, "social-publish-1", {
            x: 333.4,
            y: 244.8,
        });

        expect(
            graph.nodes.find((node) => node.id === "social-publish-1")
                ?.position,
        ).toEqual({
            x: 333,
            y: 245,
        });
        expect(graph.edges).toHaveLength(1);
    });

    it("returns user-facing connection errors before throwing", () => {
        const outputOnlyTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.url",
        );
        let graph = createEmptyWorkspaceGraph("Draft");

        graph = addWorkspaceNode(graph, outputOnlyTemplate!, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, outputOnlyTemplate!, { x: 220, y: 0 });

        expect(
            validateWorkspaceConnection(graph, "source-url-1", "source-url-2"),
        ).toEqual({
            ok: false,
            error: "Node này thiếu cổng input/output phù hợp. Hãy chọn một node có output và một node có input.",
        });
    });

    it("keeps the Douyin rework sample graph valid and ordered", () => {
        const graph = createDouyinReworkSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        expect(graph.nodes.map((node) => node.templateNodeType)).toEqual([
            "source.url",
            "edit.mask-region",
            "audio.extract-voice",
            "audio.voice-insert",
            "edit.mirror",
            "storage.upload",
            "social.publish",
        ]);

        for (const edge of graph.edges) {
            const fromIndex = graph.nodes.findIndex(
                (node) => node.id === edge.fromNodeId,
            );
            const toIndex = graph.nodes.findIndex(
                (node) => node.id === edge.toNodeId,
            );
            expect(fromIndex).toBeGreaterThanOrEqual(0);
            expect(toIndex).toBeGreaterThan(fromIndex);
        }
    });

    it("falls back safely for malformed draft storage values", () => {
        expect(parseWorkspaceDraft("{not-json").nodes).toEqual([]);
        expect(
            parseWorkspaceDraft(JSON.stringify({ version: 1 })).nodes,
        ).toEqual([]);
    });

    it("round-trips valid draft serialization", () => {
        const graph = createDouyinReworkSampleGraph();
        const parsed = parseWorkspaceDraft(serializeWorkspaceDraft(graph));

        expect(parsed.nodes).toHaveLength(graph.nodes.length);
        expect(parsed.edges).toHaveLength(graph.edges.length);
        expect(parsed.selectedNodeId).toBe("source-url-1");
    });

    it("detects an executable upload-to-social flow", () => {
        const graph = createUploadToSocialSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        expect(getWorkspaceExecutableUploadToSocialPlan(graph)).toEqual({
            ok: true,
            mode: "upload-to-social",
            sourceNodeId: "source-file-1",
            storageNodeId: "storage-upload-1",
            publishNodeId: "social-publish-1",
        });
    });

    it("detects upload-only and existing-asset publish executable flows", () => {
        expect(
            getWorkspaceExecutableUploadToSocialPlan(
                createUploadToStorageSampleGraph(),
            ),
        ).toMatchObject({
            ok: true,
            mode: "upload-to-storage",
            sourceNodeId: "source-file-1",
            storageNodeId: "storage-upload-1",
        });
        expect(
            getWorkspaceExecutableUploadToSocialPlan(
                createAssetToSocialSampleGraph(),
            ),
        ).toMatchObject({
            ok: true,
            mode: "asset-to-social",
            sourceNodeId: "source-asset-1",
            publishNodeId: "social-publish-1",
        });
    });

    it("rejects graphs without a supported executable path", () => {
        const graph = createDouyinReworkSampleGraph();

        const result = getWorkspaceExecutableUploadToSocialPlan(graph);
        expect(result.ok).toBe(false);
        expect(result.error).toMatch(
            /Save to Storage|Upload Video|Publish Social/,
        );
    });

    it("plans a fan-out flow with one upload feeding multiple Publish Social nodes", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Fan-out");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 440, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 440, y: 200 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "storage-upload-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "storage-upload-1",
            "social-publish-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "storage-upload-1",
            "social-publish-2",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.errors).toEqual([]);
        expect(plan.steps).toHaveLength(3);
        expect(plan.steps[0]).toMatchObject({
            kind: "upload-and-store",
            sourceFileNodeId: "source-file-1",
            storageNodeId: "storage-upload-1",
            producerNodeId: "storage-upload-1",
        });
        const publishSteps = plan.steps.filter(
            (step) => step.kind === "publish",
        );
        expect(publishSteps).toHaveLength(2);
        for (const step of publishSteps) {
            expect(step).toMatchObject({
                kind: "publish",
                producerNodeId: "storage-upload-1",
            });
        }
    });

    it("plans multi source.asset publishing in parallel", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Multi asset");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 220 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 240, y: 220 });
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-1",
            "social-publish-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-2",
            "social-publish-2",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        const publishProducers = plan.steps
            .filter((step) => step.kind === "publish")
            .map((step) =>
                step.kind === "publish" ? step.producerNodeId : "",
            );
        expect(publishProducers).toEqual(
            expect.arrayContaining(["source-asset-1", "source-asset-2"]),
        );
    });

    it("rejects source.file without downstream Save to Storage", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 220, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "social-publish-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(/cần nối tới Save to Storage/);
    });

    it("plans audio transcription directly from an Upload Video node", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("ZH transcript");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, {
            x: 240,
            y: 0,
        });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-chinese-transcribe-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "transcribe-chinese",
                sourceFileNodeId: "source-file-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
        ]);
    });

    it("rejects audio transcription without an Upload Video upstream", () => {
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad transcript");
        graph = addWorkspaceNode(graph, transcriptionTemplate, { x: 0, y: 0 });

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(/cần upstream Upload Video/);
    });

    it("plans transcript translation after audio transcription", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;
        const translationTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.translate-transcript",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Translate");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, {
            x: 240,
            y: 0,
        });
        graph = addWorkspaceNode(graph, translationTemplate, {
            x: 480,
            y: 0,
        });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-chinese-transcribe-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "audio-chinese-transcribe-1",
            "text-translate-transcript-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "transcribe-chinese",
                sourceFileNodeId: "source-file-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
            {
                kind: "translate-transcript",
                transcriptionNodeId: "audio-chinese-transcribe-1",
                translationNodeId: "text-translate-transcript-1",
            },
        ]);
    });

    it("rejects transcript translation without upstream audio transcript", () => {
        const translationTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.translate-transcript",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad translate");
        graph = addWorkspaceNode(graph, translationTemplate, { x: 0, y: 0 });

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(
            /cần upstream Audio Transcript/,
        );
    });

    it("plans voice generation after translated transcript", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;
        const translationTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.translate-transcript",
        )!;
        const voiceTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.voice-generation",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Voice");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, translationTemplate, { x: 480, y: 0 });
        graph = addWorkspaceNode(graph, voiceTemplate, { x: 720, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-chinese-transcribe-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "audio-chinese-transcribe-1",
            "text-translate-transcript-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "text-translate-transcript-1",
            "audio-voice-generation-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps.at(-1)).toEqual({
            kind: "generate-voice",
            translationNodeId: "text-translate-transcript-1",
            voiceNodeId: "audio-voice-generation-1",
        });
    });

    it("rejects voice generation without translated transcript upstream", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const voiceTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.voice-generation",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad voice");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, voiceTemplate, { x: 240, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-voice-generation-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(
            /cần upstream Translate Transcript/,
        );
    });

    it("plans video dubbing artifact storage and publish", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const dubbingTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.video-dubbing",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Dubbing");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, dubbingTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 480, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 720, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-video-dubbing-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "audio-video-dubbing-1",
            "storage-upload-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "storage-upload-1",
            "social-publish-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "dub-video",
                sourceNodeId: "source-file-1",
                dubbingNodeId: "audio-video-dubbing-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "audio-video-dubbing-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
            {
                kind: "publish",
                publishNodeId: "social-publish-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("rejects publish nodes without an upstream producer", () => {
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;
        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Orphan publish");
        graph = addWorkspaceNode(graph, publishTemplate, { x: 0, y: 0 });

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(
            /cần upstream Storage Asset hoặc Save to Storage/,
        );
    });

    it("detects a cycle in the graph", () => {
        const graph: WorkspaceGraph = {
            version: 1,
            draftId: "cycle",
            title: "Cycle",
            updatedAt: new Date().toISOString(),
            selectedNodeId: null,
            nodes: [
                {
                    id: "source-asset-1",
                    templateNodeType: "source.asset",
                    label: "Asset",
                    position: { x: 0, y: 0 },
                    config: {},
                },
                {
                    id: "social-publish-1",
                    templateNodeType: "social.publish",
                    label: "Publish",
                    position: { x: 220, y: 0 },
                    config: {},
                },
            ],
            edges: [
                {
                    id: "source-asset-1:asset->social-publish-1:asset",
                    fromNodeId: "source-asset-1",
                    fromPortId: "asset",
                    toNodeId: "social-publish-1",
                    toPortId: "asset",
                },
                {
                    id: "social-publish-1:publish->source-asset-1:asset",
                    fromNodeId: "social-publish-1",
                    fromPortId: "publish",
                    toNodeId: "source-asset-1",
                    toPortId: "asset",
                },
            ],
        };

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(/cycle/);
    });

    it("updateWorkspaceNodeConfig merges patch into the target node", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Cfg");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = updateWorkspaceNodeConfig(graph, "source-asset-1", {
            assetId: "asset-123",
        });

        expect(graph.nodes[0].config).toMatchObject({ assetId: "asset-123" });
    });
});
