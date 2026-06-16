import { describe, expect, it } from "vitest";

import {
    addWorkspaceNode,
    connectWorkspaceNodes,
    createUploadRemoteVipThumbnailSaveLocalSampleGraph,
    createEmptyWorkspaceGraph,
    planWorkspaceFlow,
    updateWorkspaceNodeConfig,
    WORKSPACE_NODE_TEMPLATES,
} from "./workspace-graph";
import {
    getWorkspaceFlowSetupNodes,
    getWorkspaceNodeSetupIssues,
    getWorkspaceNodeSetupWarnings,
} from "./workspace-flow-setup";
import type { WorkspaceFlowPlan } from "./workspace-graph";

function template(nodeType: string) {
    const result = WORKSPACE_NODE_TEMPLATES.find(
        (entry) => entry.nodeType === nodeType,
    );
    if (!result) throw new Error(`Missing template ${nodeType}`);
    return result;
}

function createUploadPublishGraph() {
    let graph = createEmptyWorkspaceGraph("Upload publish");
    graph = addWorkspaceNode(graph, template("source.file"), { x: 0, y: 0 });
    graph = addWorkspaceNode(graph, template("storage.upload"), {
        x: 220,
        y: 0,
    });
    graph = addWorkspaceNode(graph, template("social.publish"), {
        x: 440,
        y: 0,
    });
    graph = connectWorkspaceNodes(graph, "source-file-1", "storage-upload-1");
    graph = connectWorkspaceNodes(
        graph,
        "storage-upload-1",
        "social-publish-1",
    );
    return graph;
}

function context(overrides?: Partial<Parameters<typeof getWorkspaceNodeSetupIssues>[0]["context"]>) {
    return {
        runtimeFileNodeIds: new Set<string>(),
        storageAccountIds: new Set<string>(),
        socialAccountIds: new Set<string>(),
        storageAssetIds: new Set<string>(),
        thumbnailAssetIds: new Set<string>(),
        storageAssetMaskSetupIds: new Set<string>(),
        ...overrides,
    };
}

describe("workspace flow setup helpers", () => {
    it("collects executable nodes once in first execution order", () => {
        const graph = createUploadPublishGraph();
        const plan = planWorkspaceFlow(graph);

        expect(plan.ok).toBe(true);
        expect(
            getWorkspaceFlowSetupNodes(graph, plan).map(
                ({ node }) => node.id,
            ),
        ).toEqual([
            "source-file-1",
            "storage-upload-1",
            "social-publish-1",
        ]);
    });

    it("flags missing upload file, storage account, social account, and direct-upload tags", () => {
        let graph = createUploadPublishGraph();
        graph = updateWorkspaceNodeConfig(graph, "source-file-1", {
            tags: "workspace",
        });
        const plan = planWorkspaceFlow(graph);
        const setupNodes = getWorkspaceFlowSetupNodes(graph, plan);

        expect(
            getWorkspaceNodeSetupIssues({
                node: setupNodes[0].node,
                plan,
                context: context(),
            }),
        ).toEqual(["Choose a video file.", "Add at least 2 trace tags."]);
        expect(
            getWorkspaceNodeSetupIssues({
                node: setupNodes[1].node,
                plan,
                context: context(),
            }),
        ).toEqual(["Choose a storage account."]);
        expect(
            getWorkspaceNodeSetupIssues({
                node: setupNodes[2].node,
                plan,
                context: context(),
            }),
        ).toEqual(["Choose a social account."]);
    });

    it("accepts ready upload-to-social nodes when all runtime inputs exist", () => {
        let graph = createUploadPublishGraph();
        graph = updateWorkspaceNodeConfig(graph, "storage-upload-1", {
            storageAccountId: "storage-1",
        });
        graph = updateWorkspaceNodeConfig(graph, "social-publish-1", {
            socialAccountId: "social-1",
        });
        const plan = planWorkspaceFlow(graph);
        const setupNodes = getWorkspaceFlowSetupNodes(graph, plan);
        const readyContext = context({
            runtimeFileNodeIds: new Set(["source-file-1"]),
            storageAccountIds: new Set(["storage-1"]),
            socialAccountIds: new Set(["social-1"]),
        });

        expect(
            setupNodes.map(({ node }) =>
                getWorkspaceNodeSetupIssues({
                    node,
                    plan,
                    context: readyContext,
                }),
            ),
        ).toEqual([[], [], []]);
    });

    it("flags missing or unavailable Storage Asset selection", () => {
        let graph = createEmptyWorkspaceGraph("Asset publish");
        graph = addWorkspaceNode(graph, template("source.asset"), {
            x: 0,
            y: 0,
        });
        graph = addWorkspaceNode(graph, template("social.publish"), {
            x: 220,
            y: 0,
        });
        graph = connectWorkspaceNodes(graph, "source-asset-1", "social-publish-1");
        const plan = planWorkspaceFlow(graph);
        const assetNode = getWorkspaceFlowSetupNodes(graph, plan)[0].node;

        expect(
            getWorkspaceNodeSetupIssues({
                node: assetNode,
                plan,
                context: context(),
            }),
        ).toEqual(["Choose a Storage Asset."]);

        graph = updateWorkspaceNodeConfig(graph, "source-asset-1", {
            assetId: "asset-missing",
        });
        const nextPlan = planWorkspaceFlow(graph);
        const nextAssetNode = getWorkspaceFlowSetupNodes(graph, nextPlan)[0].node;
        expect(
            getWorkspaceNodeSetupIssues({
                node: nextAssetNode,
                plan: nextPlan,
                context: context(),
            }),
        ).toEqual(["Choose an available Storage Asset."]);
    });

    it("flags missing source URL and Facebook Page when required", () => {
        let graph = createEmptyWorkspaceGraph("URL publish");
        graph = addWorkspaceNode(graph, template("source.url"), { x: 0, y: 0 });
        graph = addWorkspaceNode(graph, template("storage.upload"), {
            x: 220,
            y: 0,
        });
        graph = addWorkspaceNode(graph, template("social.publish"), {
            x: 440,
            y: 0,
        });
        graph = connectWorkspaceNodes(graph, "source-url-1", "storage-upload-1");
        graph = connectWorkspaceNodes(
            graph,
            "storage-upload-1",
            "social-publish-1",
        );
        graph = updateWorkspaceNodeConfig(graph, "storage-upload-1", {
            storageAccountId: "storage-1",
        });
        graph = updateWorkspaceNodeConfig(graph, "social-publish-1", {
            socialAccountId: "social-1",
            publishType: "facebook_reel",
        });

        const plan = planWorkspaceFlow(graph);
        const setupNodes = getWorkspaceFlowSetupNodes(graph, plan);
        const validationContext = context({
            storageAccountIds: new Set(["storage-1"]),
            socialAccountIds: new Set(["social-1"]),
        });

        expect(
            getWorkspaceNodeSetupIssues({
                node: setupNodes[0].node,
                plan,
                context: validationContext,
            }),
        ).toEqual(["Enter a source URL."]);
        expect(
            getWorkspaceNodeSetupIssues({
                node: setupNodes[2].node,
                plan,
                context: validationContext,
            }),
        ).toEqual(["Choose a Facebook Page."]);
    });

    it("flags unavailable thumbnail selection in publish node", () => {
        let graph = createUploadPublishGraph();
        graph = updateWorkspaceNodeConfig(graph, "storage-upload-1", {
            storageAccountId: "storage-1",
        });
        graph = updateWorkspaceNodeConfig(graph, "social-publish-1", {
            socialAccountId: "social-1",
            thumbnailAssetId: "thumb-missing",
        });
        const plan = planWorkspaceFlow(graph);
        const setupNodes = getWorkspaceFlowSetupNodes(graph, plan);
        const publishNode = setupNodes.find(
            ({ node }) => node.id === "social-publish-1",
        )?.node;
        if (!publishNode) throw new Error("Missing publish node");

        expect(
            getWorkspaceNodeSetupIssues({
                node: publishNode,
                plan,
                context: context({
                    runtimeFileNodeIds: new Set(["source-file-1"]),
                    storageAccountIds: new Set(["storage-1"]),
                    socialAccountIds: new Set(["social-1"]),
                }),
            }),
        ).toEqual(["Choose an available thumbnail."]);
    });

    it("requires manual title and thumbnail storage setup for Gemini thumbnail nodes", () => {
        const graph = createUploadRemoteVipThumbnailSaveLocalSampleGraph();
        const plan = planWorkspaceFlow(graph);
        const setupNodes = getWorkspaceFlowSetupNodes(graph, plan);
        const thumbnailNode = setupNodes.find(
            ({ node }) => node.id === "thumbnail-gemini-generate-1",
        )?.node;

        expect(plan.ok).toBe(true);
        expect(thumbnailNode).toBeDefined();
        expect(
            getWorkspaceNodeSetupIssues({
                node: thumbnailNode!,
                plan,
                context: context({
                    runtimeFileNodeIds: new Set(["source-file-1"]),
                }),
            }),
        ).toEqual([
            "Enter a manual thumbnail title.",
            "Choose a thumbnail storage account.",
        ]);
    });

    it("accepts ready Gemini thumbnail node with optional reference thumbnail", () => {
        let graph = createUploadRemoteVipThumbnailSaveLocalSampleGraph();
        graph = updateWorkspaceNodeConfig(graph, "thumbnail-gemini-generate-1", {
            title: "Hệ Thống Ép Ta Làm Hôn Quân",
            storageProviderAccountId: "storage-1",
            referenceThumbnailAssetId: "thumb-1",
        });
        const plan = planWorkspaceFlow(graph);
        const thumbnailNode = getWorkspaceFlowSetupNodes(graph, plan).find(
            ({ node }) => node.id === "thumbnail-gemini-generate-1",
        )?.node;

        expect(thumbnailNode).toBeDefined();
        expect(
            getWorkspaceNodeSetupIssues({
                node: thumbnailNode!,
                plan,
                context: context({
                    runtimeFileNodeIds: new Set(["source-file-1"]),
                    storageAccountIds: new Set(["storage-1"]),
                    thumbnailAssetIds: new Set(["thumb-1"]),
                }),
            }),
        ).toEqual([]);
    });

    it("warns when a mask node uses an upstream storage asset without saved video setup", () => {
        let graph = createEmptyWorkspaceGraph("Mask warning");
        graph = addWorkspaceNode(graph, template("source.asset"), {
            x: 0,
            y: 0,
        });
        graph = addWorkspaceNode(graph, template("edit.mask-region"), {
            x: 220,
            y: 0,
        });
        graph = connectWorkspaceNodes(graph, "source-asset-1", "edit-mask-region-1");
        graph = updateWorkspaceNodeConfig(graph, "source-asset-1", {
            assetId: "asset-1",
        });
        const maskNode = graph.nodes.find(
            (node) => node.id === "edit-mask-region-1",
        );
        if (!maskNode) throw new Error("Missing mask node");
        const plan: WorkspaceFlowPlan = {
            ok: true,
            errors: [],
            steps: [
                {
                    kind: "edit-video",
                    sourceNodeId: "source-asset-1",
                    translationNodeId: "text-translate-transcript-1",
                    editNodeId: "edit-mask-region-1",
                },
            ],
        };

        expect(
            getWorkspaceNodeSetupWarnings({
                node: maskNode,
                graph,
                plan,
                context: context({
                    storageAssetIds: new Set(["asset-1"]),
                }),
            }),
        ).toEqual([
            "Source video has no saved Blur + subtitle overlay setup from Video Tools Lab.",
        ]);

        expect(
            getWorkspaceNodeSetupWarnings({
                node: maskNode,
                graph,
                plan,
                context: context({
                    storageAssetIds: new Set(["asset-1"]),
                    storageAssetMaskSetupIds: new Set(["asset-1"]),
                }),
            }),
        ).toEqual([]);
    });
});
