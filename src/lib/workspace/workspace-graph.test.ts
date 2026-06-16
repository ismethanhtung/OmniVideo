import { describe, expect, it } from "vitest";

import {
    createAssetVipProcessingSampleGraph,
    createUploadRemoteVipSaveLocalSampleGraph,
    createUploadRemoteVipThumbnailSaveLocalSampleGraph,
    createUploadVipSaveLocalSampleGraph,
    WORKSPACE_NODE_TEMPLATES,
    addWorkspaceNode,
    connectWorkspaceNodes,
    createAssetTranscriptFullProcessingSampleGraph,
    createDouyinReworkSampleGraph,
    createEmptyWorkspaceGraph,
    createAssetToSocialSampleGraph,
    createUploadToStorageSampleGraph,
    createUploadToSocialSampleGraph,
    deleteWorkspaceEdge,
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

    it("creates preprocess nodes with enable flag defaulting to true", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.preprocess",
        );

        expect(template).toBeDefined();

        const graph = addWorkspaceNode(
            createEmptyWorkspaceGraph("Preprocess"),
            template!,
            { x: 120, y: 220 },
        );

        expect(graph.nodes[0].config).toMatchObject({
            enabled: true,
            speedFactor: 0.7,
        });
    });

    it("creates cleanup nodes with explicit delete toggles defaulting off", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "cleanup.delete-assets",
        );

        expect(template).toBeDefined();

        const graph = addWorkspaceNode(
            createEmptyWorkspaceGraph("Cleanup"),
            template!,
            { x: 120, y: 220 },
        );

        expect(template?.category).toBe("cleanup");
        expect(graph.nodes[0]).toMatchObject({
            id: "cleanup-delete-assets-1",
            config: {
                deleteOriginalAsset: false,
                deleteProcessedAsset: false,
            },
        });
    });

    it("defines optional thumbnail config on Publish Social template", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        );

        expect(template).toBeDefined();
        expect(template?.configFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "thumbnailAssetId",
                    type: "text",
                    required: false,
                }),
            ]),
        );
    });

    it("defines Save to Local output template with save mode", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "output.download-local",
        );

        expect(template).toBeDefined();
        expect(template?.label).toBe("Save to Local");
        expect(template?.category).toBe("output");
        expect(template?.configFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "downloadMode",
                    type: "select",
                    defaultValue: "downloads",
                }),
            ]),
        );
    });

    it("defines Gemini thumbnail generation template with manual title controls", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "thumbnail.gemini-generate",
        );

        expect(template).toBeDefined();
        expect(template?.label).toBe("Generate VIP Thumbnail");
        expect(template?.inputPorts).toEqual([
            { id: "asset", label: "VIP video", dataType: "asset" },
        ]);
        expect(template?.outputPorts).toEqual([
            { id: "asset", label: "Generated thumbnail", dataType: "asset" },
        ]);
        expect(template?.configFields).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "title",
                    required: true,
                    defaultValue: "",
                }),
                expect.objectContaining({
                    key: "model",
                    defaultValue: "models/gemini-3.1-flash-lite",
                }),
                expect.objectContaining({
                    key: "storageProviderAccountId",
                    required: true,
                }),
                expect.objectContaining({
                    key: "referenceThumbnailAssetId",
                    required: false,
                }),
            ]),
        );
    });

    it("plans cleanup after a successful publish path with producer context", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;
        const cleanupTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "cleanup.delete-assets",
        )!;
        let graph = createEmptyWorkspaceGraph("Cleanup publish");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, cleanupTemplate, { x: 440, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-1",
            "social-publish-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "social-publish-1",
            "cleanup-delete-assets-1",
        );

        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toContainEqual({
            kind: "cleanup-assets",
            cleanupNodeId: "cleanup-delete-assets-1",
            producerNodeId: "source-asset-1",
            publishNodeId: "social-publish-1",
        });
    });

    it("plans local download from storage asset producer", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const downloadTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "output.download-local",
        )!;
        let graph = createEmptyWorkspaceGraph("Download local");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, downloadTemplate, { x: 220, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-1",
            "output-download-local-1",
        );

        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toContainEqual({
            kind: "download-local",
            downloadNodeId: "output-download-local-1",
            producerNodeId: "source-asset-1",
        });
    });

    it("plans local save directly from VIP runtime artifact producer", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const vipTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.vip-processing",
        )!;
        const downloadTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "output.download-local",
        )!;
        let graph = createEmptyWorkspaceGraph("VIP save local");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, vipTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, downloadTemplate, { x: 440, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-1",
            "video-vip-processing-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "video-vip-processing-1",
            "output-download-local-1",
        );

        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toContainEqual({
            kind: "download-local",
            downloadNodeId: "output-download-local-1",
            producerNodeId: "video-vip-processing-1",
        });
    });

    it("creates Piper workspace nodes with strict timing defaults", () => {
        for (const nodeType of [
            "audio.voice-generation",
            "audio.video-dubbing",
        ]) {
            const template = WORKSPACE_NODE_TEMPLATES.find(
                (entry) => entry.nodeType === nodeType,
            );

            expect(template).toBeDefined();

            const graph = addWorkspaceNode(
                createEmptyWorkspaceGraph("Piper"),
                template!,
                { x: 100, y: 160 },
            );

            expect(graph.nodes[0].config).toMatchObject({
                ttsNoiseScale: 0.667,
                ttsNoiseW: 0.8,
                ttsSentenceSilence: 0.2,
                ttsPreserveTimestampGaps: true,
                ttsAlignmentMode: "strict",
            });
            if (nodeType === "audio.video-dubbing") {
                expect(graph.nodes[0].config).toMatchObject({
                    originalAudioVolume: 0,
                });
            }
        }
    });

    it("creates VIP nodes with current processing defaults", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.vip-processing",
        );

        expect(template).toBeDefined();

        const graph = addWorkspaceNode(
            createEmptyWorkspaceGraph("VIP"),
            template!,
            { x: 100, y: 160 },
        );

        expect(graph.nodes[0].config).toMatchObject({
            renderPreset: "veryfast",
            speedFactor: 0.75,
            originalAudioVolume: 0.2,
        });
    });

    it("keeps subtitle background padding configurable on mask nodes", () => {
        const template = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mask-region",
        );

        expect(template?.configFields).toContainEqual(
            expect.objectContaining({
                key: "subtitleBackgroundPaddingY",
                defaultValue: 8,
            }),
        );
        expect(template?.configFields).toContainEqual(
            expect.objectContaining({
                key: "subtitleFontSize",
                defaultValue: 40,
            }),
        );
    });

    it("connects nodes, keeps duplicate edges as no-op, and rejects missing nodes", () => {
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
        const duplicateGraph = connectWorkspaceNodes(
            graph,
            "source-url-1",
            "edit-mask-region-1",
        );
        expect(duplicateGraph).toBe(graph);
        expect(duplicateGraph.edges).toHaveLength(1);
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

    it("deletes only the requested edge", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;
        let graph = createEmptyWorkspaceGraph("Delete edge");

        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 440, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "storage-upload-1");
        graph = connectWorkspaceNodes(graph, "storage-upload-1", "social-publish-1");

        const firstEdgeId = graph.edges[0].id;
        const secondEdgeId = graph.edges[1].id;
        graph = deleteWorkspaceEdge(graph, firstEdgeId);

        expect(graph.edges).toHaveLength(1);
        expect(graph.edges[0].id).toBe(secondEdgeId);
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

    it("plans generate VI metadata node after transcript translation", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const transcriptTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;
        const translateTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.translate-transcript",
        )!;
        const metadataTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.generate-vi-metadata",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("VI metadata");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, translateTemplate, { x: 440, y: 0 });
        graph = addWorkspaceNode(graph, metadataTemplate, { x: 660, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "audio-chinese-transcribe-1");
        graph = connectWorkspaceNodes(graph, "audio-chinese-transcribe-1", "text-translate-transcript-1");
        graph = connectWorkspaceNodes(graph, "text-translate-transcript-1", "text-generate-vi-metadata-1");

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(
            plan.steps.some(
                (step) =>
                    step.kind === "generate-vi-metadata" &&
                    step.metadataNodeId === "text-generate-vi-metadata-1",
            ),
        ).toBe(true);
    });

    it("plans generate VI metadata directly from video dubbing transcript output", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const dubbingTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.video-dubbing",
        )!;
        const metadataTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.generate-vi-metadata",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph(
            "VI metadata from dubbing",
        );
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, dubbingTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, metadataTemplate, { x: 440, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "audio-video-dubbing-1");
        graph = connectWorkspaceNodes(
            graph,
            "audio-video-dubbing-1",
            "text-generate-vi-metadata-1",
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
                kind: "generate-vi-metadata",
                translationNodeId: "audio-video-dubbing-1",
                metadataNodeId: "text-generate-vi-metadata-1",
            },
        ]);
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

    it("plans URL Video intake flow when connected to Save to Storage", () => {
        const urlTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.url",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("URL intake");
        graph = addWorkspaceNode(graph, urlTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 220, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-url-1", "storage-upload-1");

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "intake-url-and-store",
                sourceUrlNodeId: "source-url-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
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
                sourceNodeId: "source-file-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
        ]);
    });

    it("plans audio transcription directly from a Storage Asset node", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Asset transcript");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, {
            x: 240,
            y: 0,
        });
        graph = connectWorkspaceNodes(
            graph,
            "source-asset-1",
            "audio-chinese-transcribe-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "use-existing-asset",
                nodeId: "source-asset-1",
                producerNodeId: "source-asset-1",
            },
            {
                kind: "transcribe-chinese",
                sourceNodeId: "source-asset-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
        ]);
    });

    it("plans preprocess before transcript translation and voice generation", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const preprocessTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.preprocess",
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

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Preprocess voice");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, preprocessTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, { x: 440, y: 0 });
        graph = addWorkspaceNode(graph, translationTemplate, { x: 660, y: 0 });
        graph = addWorkspaceNode(graph, voiceTemplate, { x: 880, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "video-preprocess-1");
        graph = connectWorkspaceNodes(
            graph,
            "video-preprocess-1",
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
        expect(plan.steps).toEqual([
            {
                kind: "preprocess-video",
                sourceNodeId: "source-file-1",
                preprocessNodeId: "video-preprocess-1",
            },
            {
                kind: "transcribe-chinese",
                sourceNodeId: "video-preprocess-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
            {
                kind: "translate-transcript",
                transcriptionNodeId: "audio-chinese-transcribe-1",
                translationNodeId: "text-translate-transcript-1",
            },
            {
                kind: "generate-voice",
                transcriptionNodeId: "audio-chinese-transcribe-1",
                translationNodeId: "text-translate-transcript-1",
                voiceNodeId: "audio-voice-generation-1",
            },
        ]);
    });

    it("plans preprocess artifact into dubbing and storage from Storage Asset", () => {
        const assetTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.asset",
        )!;
        const preprocessTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.preprocess",
        )!;
        const dubbingTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.video-dubbing",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Asset preprocess");
        graph = addWorkspaceNode(graph, assetTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, preprocessTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, dubbingTemplate, { x: 440, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 660, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-asset-1", "video-preprocess-1");
        graph = connectWorkspaceNodes(
            graph,
            "video-preprocess-1",
            "audio-video-dubbing-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "audio-video-dubbing-1",
            "storage-upload-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "use-existing-asset",
                nodeId: "source-asset-1",
                producerNodeId: "source-asset-1",
            },
            {
                kind: "preprocess-video",
                sourceNodeId: "source-asset-1",
                preprocessNodeId: "video-preprocess-1",
            },
            {
                kind: "dub-video",
                sourceNodeId: "video-preprocess-1",
                dubbingNodeId: "audio-video-dubbing-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "audio-video-dubbing-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("plans preprocess artifact into mirror and storage", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const preprocessTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.preprocess",
        )!;
        const mirrorTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Preprocess mirror");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, preprocessTemplate, { x: 220, y: 0 });
        graph = addWorkspaceNode(graph, mirrorTemplate, { x: 440, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 660, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "video-preprocess-1");
        graph = connectWorkspaceNodes(graph, "video-preprocess-1", "edit-mirror-1");
        graph = connectWorkspaceNodes(graph, "edit-mirror-1", "storage-upload-1");

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "preprocess-video",
                sourceNodeId: "source-file-1",
                preprocessNodeId: "video-preprocess-1",
            },
            {
                kind: "mirror-video",
                sourceNodeId: "video-preprocess-1",
                mirrorNodeId: "edit-mirror-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mirror-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("rejects preprocess without upstream video", () => {
        const preprocessTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "video.preprocess",
        )!;
        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad preprocess");
        graph = addWorkspaceNode(graph, preprocessTemplate, { x: 0, y: 0 });

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(/Video Preprocess.*cần upstream/);
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
                sourceNodeId: "source-file-1",
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
        expect(plan.errors.join("\n")).toMatch(/cần upstream Audio Transcript/);
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
        graph = addWorkspaceNode(graph, transcriptionTemplate, {
            x: 240,
            y: 0,
        });
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
            transcriptionNodeId: "audio-chinese-transcribe-1",
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

    it("plans mirror video artifact storage from an uploaded file", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const mirrorTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Mirror");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, mirrorTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 480, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-file-1", "edit-mirror-1");
        graph = connectWorkspaceNodes(
            graph,
            "edit-mirror-1",
            "storage-upload-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "mirror-video",
                sourceNodeId: "source-file-1",
                mirrorNodeId: "edit-mirror-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mirror-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("plans mirror video artifact storage and publish from URL Video", () => {
        const urlTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.url",
        )!;
        const mirrorTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;
        const publishTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "social.publish",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("URL mirror");
        graph = addWorkspaceNode(graph, urlTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, mirrorTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 480, y: 0 });
        graph = addWorkspaceNode(graph, publishTemplate, { x: 720, y: 0 });
        graph = connectWorkspaceNodes(graph, "source-url-1", "edit-mirror-1");
        graph = connectWorkspaceNodes(
            graph,
            "edit-mirror-1",
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
                kind: "mirror-video",
                sourceNodeId: "source-url-1",
                mirrorNodeId: "edit-mirror-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mirror-1",
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

    it("plans mirror after video dubbing before storage", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const dubbingTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.video-dubbing",
        )!;
        const mirrorTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph =
            createEmptyWorkspaceGraph("Dub then mirror");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, dubbingTemplate, { x: 240, y: 0 });
        graph = addWorkspaceNode(graph, mirrorTemplate, { x: 480, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 720, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "audio-video-dubbing-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "audio-video-dubbing-1",
            "edit-mirror-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "edit-mirror-1",
            "storage-upload-1",
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
                kind: "mirror-video",
                sourceNodeId: "audio-video-dubbing-1",
                mirrorNodeId: "edit-mirror-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mirror-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("plans partial blur with translated subtitle overlay before storage", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const transcriptionTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "audio.chinese-transcribe",
        )!;
        const translationTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "text.translate-transcript",
        )!;
        const editTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mask-region",
        )!;
        const storageTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "storage.upload",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Blur subtitles");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, transcriptionTemplate, {
            x: 240,
            y: 0,
        });
        graph = addWorkspaceNode(graph, translationTemplate, { x: 480, y: 0 });
        graph = addWorkspaceNode(graph, editTemplate, { x: 720, y: 0 });
        graph = addWorkspaceNode(graph, storageTemplate, { x: 960, y: 0 });
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
            "source-file-1",
            "edit-mask-region-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "text-translate-transcript-1",
            "edit-mask-region-1",
        );
        graph = connectWorkspaceNodes(
            graph,
            "edit-mask-region-1",
            "storage-upload-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "transcribe-chinese",
                sourceNodeId: "source-file-1",
                transcriptionNodeId: "audio-chinese-transcribe-1",
            },
            {
                kind: "translate-transcript",
                transcriptionNodeId: "audio-chinese-transcribe-1",
                translationNodeId: "text-translate-transcript-1",
            },
            {
                kind: "edit-video",
                sourceNodeId: "source-file-1",
                editNodeId: "edit-mask-region-1",
                translationNodeId: "text-translate-transcript-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mask-region-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
        expect(
            graph.edges.find(
                (edge) =>
                    edge.fromNodeId === "text-translate-transcript-1" &&
                    edge.toNodeId === "edit-mask-region-1",
            )?.toPortId,
        ).toBe("transcript");
    });

    it("rejects partial blur without translated transcript upstream", () => {
        const fileTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "source.file",
        )!;
        const editTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mask-region",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad blur");
        graph = addWorkspaceNode(graph, fileTemplate, { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, editTemplate, { x: 240, y: 0 });
        graph = connectWorkspaceNodes(
            graph,
            "source-file-1",
            "edit-mask-region-1",
        );

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(/Translate Transcript/);
    });

    it("plans seeded asset transcript full processing without duplicate transcript/voice branch", () => {
        const graph = createAssetTranscriptFullProcessingSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "use-existing-asset",
                nodeId: "source-asset-1",
                producerNodeId: "source-asset-1",
            },
            {
                kind: "preprocess-video",
                sourceNodeId: "source-asset-1",
                preprocessNodeId: "video-preprocess-1",
            },
            {
                kind: "dub-video",
                sourceNodeId: "video-preprocess-1",
                dubbingNodeId: "audio-video-dubbing-1",
            },
            {
                kind: "generate-vi-metadata",
                translationNodeId: "audio-video-dubbing-1",
                metadataNodeId: "text-generate-vi-metadata-1",
            },
            {
                kind: "mirror-video",
                sourceNodeId: "audio-video-dubbing-1",
                mirrorNodeId: "edit-mirror-1",
            },
            {
                kind: "edit-video",
                sourceNodeId: "edit-mirror-1",
                editNodeId: "edit-mask-region-1",
                translationNodeId: "audio-video-dubbing-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "edit-mask-region-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("plans seeded asset VIP processing flow with 3 nodes", () => {
        const graph = createAssetVipProcessingSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "use-existing-asset",
                nodeId: "source-asset-1",
                producerNodeId: "source-asset-1",
            },
            {
                kind: "vip-process-video",
                sourceNodeId: "source-asset-1",
                vipNodeId: "video-vip-processing-1",
            },
            {
                kind: "store-artifact",
                artifactNodeId: "video-vip-processing-1",
                storageNodeId: "storage-upload-1",
                producerNodeId: "storage-upload-1",
            },
        ]);
    });

    it("plans seeded upload VIP processing save-local flow", () => {
        const graph = createUploadVipSaveLocalSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "vip-process-video",
                sourceNodeId: "source-file-1",
                vipNodeId: "video-vip-processing-1",
            },
            {
                kind: "download-local",
                downloadNodeId: "output-download-local-1",
                producerNodeId: "video-vip-processing-1",
            },
        ]);
    });

    it("plans seeded remote VIP voice/render save-local flow", () => {
        const graph = createUploadRemoteVipSaveLocalSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        const vipNode = graph.nodes.find(
            (node) => node.templateNodeType === "video.vip-processing",
        );
        const plan = planWorkspaceFlow(graph);

        expect(vipNode?.config.voiceRenderExecutionMode).toBe(
            "remote-voice-render",
        );
        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "vip-process-video",
                sourceNodeId: "source-file-1",
                vipNodeId: "video-vip-processing-1",
            },
            {
                kind: "download-local",
                downloadNodeId: "output-download-local-1",
                producerNodeId: "video-vip-processing-1",
            },
        ]);
    });

    it("plans seeded remote VIP voice/render thumbnail save-local flow", () => {
        const graph = createUploadRemoteVipThumbnailSaveLocalSampleGraph();

        expect(validateWorkspaceGraph(graph)).toEqual({ ok: true, errors: [] });
        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(plan.steps).toEqual([
            {
                kind: "vip-process-video",
                sourceNodeId: "source-file-1",
                vipNodeId: "video-vip-processing-1",
            },
            {
                kind: "generate-thumbnail",
                vipNodeId: "video-vip-processing-1",
                thumbnailNodeId: "thumbnail-gemini-generate-1",
            },
            {
                kind: "download-local",
                downloadNodeId: "output-download-local-1",
                producerNodeId: "video-vip-processing-1",
            },
        ]);
    });

    it("rejects mirror video without an executable upstream", () => {
        const mirrorTemplate = WORKSPACE_NODE_TEMPLATES.find(
            (entry) => entry.nodeType === "edit.mirror",
        )!;

        let graph: WorkspaceGraph = createEmptyWorkspaceGraph("Bad mirror");
        graph = addWorkspaceNode(graph, mirrorTemplate, { x: 0, y: 0 });

        const plan = planWorkspaceFlow(graph);
        expect(plan.ok).toBe(false);
        expect(plan.errors.join("\n")).toMatch(
            /cần upstream Upload Video, URL Video, Video Preprocess hoặc Video Dubbing/,
        );
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
