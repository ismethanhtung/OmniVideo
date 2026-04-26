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
  serializeWorkspaceDraft,
  validateWorkspaceConnection,
  validateWorkspaceGraph,
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
    graph = connectWorkspaceNodes(graph, "source-url-1", "edit-mask-region-1");

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
    graph = connectWorkspaceNodes(graph, "source-file-1", "social-publish-1");
    graph = moveWorkspaceNode(graph, "social-publish-1", { x: 333.4, y: 244.8 });

    expect(graph.nodes.find((node) => node.id === "social-publish-1")?.position).toEqual({
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

    expect(validateWorkspaceConnection(graph, "source-url-1", "source-url-2")).toEqual({
      ok: false,
      error:
        "Node này thiếu cổng input/output phù hợp. Hãy chọn một node có output và một node có input.",
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
      const fromIndex = graph.nodes.findIndex((node) => node.id === edge.fromNodeId);
      const toIndex = graph.nodes.findIndex((node) => node.id === edge.toNodeId);
      expect(fromIndex).toBeGreaterThanOrEqual(0);
      expect(toIndex).toBeGreaterThan(fromIndex);
    }
  });

  it("falls back safely for malformed draft storage values", () => {
    expect(parseWorkspaceDraft("{not-json").nodes).toEqual([]);
    expect(parseWorkspaceDraft(JSON.stringify({ version: 1 })).nodes).toEqual([]);
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
    expect(getWorkspaceExecutableUploadToSocialPlan(createUploadToStorageSampleGraph())).toMatchObject({
      ok: true,
      mode: "upload-to-storage",
      sourceNodeId: "source-file-1",
      storageNodeId: "storage-upload-1",
    });
    expect(getWorkspaceExecutableUploadToSocialPlan(createAssetToSocialSampleGraph())).toMatchObject({
      ok: true,
      mode: "asset-to-social",
      sourceNodeId: "source-asset-1",
      publishNodeId: "social-publish-1",
    });
  });

  it("rejects graphs without a supported executable path", () => {
    const graph = createDouyinReworkSampleGraph();

    expect(getWorkspaceExecutableUploadToSocialPlan(graph)).toMatchObject({
      ok: false,
      error: "Flow cần một input chạy thật: Upload Video hoặc Storage Asset.",
    });
  });
});
