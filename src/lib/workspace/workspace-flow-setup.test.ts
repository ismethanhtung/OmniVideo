import { describe, expect, it } from "vitest";

import {
    addWorkspaceNode,
    connectWorkspaceNodes,
    createEmptyWorkspaceGraph,
    planWorkspaceFlow,
    updateWorkspaceNodeConfig,
    WORKSPACE_NODE_TEMPLATES,
} from "./workspace-graph";
import {
    getWorkspaceFlowSetupNodes,
    getWorkspaceNodeSetupIssues,
} from "./workspace-flow-setup";

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
});
