import {
    getWorkspaceNodeTemplate,
    type WorkspaceFlowPlan,
    type WorkspaceFlowStep,
    type WorkspaceGraph,
    type WorkspaceNodeInstance,
    type WorkspaceNodeTemplate,
} from "./workspace-graph";

export type WorkspaceFlowSetupNode = {
    node: WorkspaceNodeInstance;
    template: WorkspaceNodeTemplate;
};

export type WorkspaceFlowSetupValidationContext = {
    runtimeFileNodeIds: ReadonlySet<string>;
    storageAccountIds: ReadonlySet<string>;
    socialAccountIds: ReadonlySet<string>;
    storageAssetIds: ReadonlySet<string>;
    thumbnailAssetIds: ReadonlySet<string>;
    storageAssetMaskSetupIds: ReadonlySet<string>;
};

function getStepNodeIds(step: WorkspaceFlowStep): string[] {
    switch (step.kind) {
        case "use-existing-asset":
            return [step.nodeId];
        case "upload-and-store":
            return [step.sourceFileNodeId, step.storageNodeId];
        case "intake-url-and-store":
            return [step.sourceUrlNodeId, step.storageNodeId];
        case "publish":
            return [step.publishNodeId];
        case "transcribe-chinese":
            return [step.sourceNodeId, step.transcriptionNodeId];
        case "translate-transcript":
            return [step.transcriptionNodeId, step.translationNodeId];
        case "generate-vi-metadata":
            return [step.translationNodeId, step.metadataNodeId];
        case "generate-voice":
            return [
                step.transcriptionNodeId,
                step.translationNodeId,
                step.voiceNodeId,
            ];
        case "preprocess-video":
            return [step.sourceNodeId, step.preprocessNodeId];
        case "dub-video":
            return [step.sourceNodeId, step.dubbingNodeId];
        case "vip-process-video":
            return [step.sourceNodeId, step.vipNodeId];
        case "mirror-video":
            return [step.sourceNodeId, step.mirrorNodeId];
        case "edit-video":
            return [
                step.sourceNodeId,
                step.translationNodeId,
                step.editNodeId,
            ];
        case "store-artifact":
            return [step.artifactNodeId, step.storageNodeId];
        case "cleanup-assets":
            return [step.cleanupNodeId];
    }
}

function uniqueInOrder<T>(values: T[]): T[] {
    const seen = new Set<T>();
    const result: T[] = [];
    for (const value of values) {
        if (seen.has(value)) continue;
        seen.add(value);
        result.push(value);
    }
    return result;
}

export function getWorkspaceFlowSetupNodes(
    graph: WorkspaceGraph,
    plan: WorkspaceFlowPlan,
): WorkspaceFlowSetupNode[] {
    const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
    return uniqueInOrder(plan.steps.flatMap(getStepNodeIds))
        .map((nodeId) => nodesById.get(nodeId))
        .filter((node): node is WorkspaceNodeInstance => Boolean(node))
        .map((node) => {
            const template = getWorkspaceNodeTemplate(node.templateNodeType);
            return template ? { node, template } : null;
        })
        .filter((entry): entry is WorkspaceFlowSetupNode => Boolean(entry));
}

function getStringConfig(
    node: WorkspaceNodeInstance,
    key: string,
    fallback = "",
) {
    const value = node.config[key];
    if (value === undefined || value === null) return fallback;
    return String(value);
}

function getCommaSeparatedValues(value: string) {
    return value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function nodeNeedsTraceTags(nodeId: string, plan: WorkspaceFlowPlan) {
    return plan.steps.some(
        (step) =>
            (step.kind === "upload-and-store" &&
                step.sourceFileNodeId === nodeId) ||
            (step.kind === "intake-url-and-store" &&
                step.sourceUrlNodeId === nodeId),
    );
}

function addIssue(issues: string[], issue: string) {
    if (!issues.includes(issue)) {
        issues.push(issue);
    }
}

function findUpstreamSourceAssetNode(
    graph: WorkspaceGraph,
    startNodeId: string,
) {
    const visited = new Set<string>();
    const pending = [startNodeId];

    while (pending.length > 0) {
        const currentId = pending.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);

        const currentNode = graph.nodes.find((node) => node.id === currentId);
        if (currentNode?.templateNodeType === "source.asset") {
            return currentNode;
        }

        for (const edge of graph.edges) {
            if (edge.toNodeId === currentId) {
                pending.push(edge.fromNodeId);
            }
        }
    }

    return undefined;
}

export function getWorkspaceNodeSetupIssues(input: {
    node: WorkspaceNodeInstance;
    plan: WorkspaceFlowPlan;
    context: WorkspaceFlowSetupValidationContext;
}): string[] {
    const { node, plan, context } = input;
    const issues: string[] = [];

    if (node.templateNodeType === "source.file") {
        if (!context.runtimeFileNodeIds.has(node.id)) {
            addIssue(issues, "Choose a video file.");
        }
        if (
            nodeNeedsTraceTags(node.id, plan) &&
            getCommaSeparatedValues(
                getStringConfig(node, "tags", "workspace,upload"),
            ).length < 2
        ) {
            addIssue(issues, "Add at least 2 trace tags.");
        }
    }

    if (node.templateNodeType === "source.url") {
        if (!getStringConfig(node, "url").trim()) {
            addIssue(issues, "Enter a source URL.");
        }
        if (
            nodeNeedsTraceTags(node.id, plan) &&
            getCommaSeparatedValues(
                getStringConfig(node, "tags", "workspace,url"),
            ).length < 2
        ) {
            addIssue(issues, "Add at least 2 trace tags.");
        }
    }

    if (node.templateNodeType === "source.asset") {
        const assetId = getStringConfig(node, "assetId").trim();
        if (!assetId) {
            addIssue(issues, "Choose a Storage Asset.");
        } else if (!context.storageAssetIds.has(assetId)) {
            addIssue(issues, "Choose an available Storage Asset.");
        }
    }

    if (node.templateNodeType === "storage.upload") {
        const storageAccountId = getStringConfig(
            node,
            "storageAccountId",
        ).trim();
        if (!storageAccountId) {
            addIssue(issues, "Choose a storage account.");
        } else if (!context.storageAccountIds.has(storageAccountId)) {
            addIssue(issues, "Choose an available storage account.");
        }
    }

    if (node.templateNodeType === "social.publish") {
        const socialAccountId = getStringConfig(
            node,
            "socialAccountId",
        ).trim();
        if (!socialAccountId) {
            addIssue(issues, "Choose a social account.");
        } else if (!context.socialAccountIds.has(socialAccountId)) {
            addIssue(issues, "Choose an available social account.");
        }

        const publishType = getStringConfig(
            node,
            "publishType",
            "youtube_short",
        );
        const isFacebook =
            publishType === "facebook_reel" ||
            publishType === "facebook_video";
        if (isFacebook && !getStringConfig(node, "facebookPageId").trim()) {
            addIssue(issues, "Choose a Facebook Page.");
        }

        const thumbnailAssetId = getStringConfig(
            node,
            "thumbnailAssetId",
        ).trim();
        if (
            thumbnailAssetId &&
            !context.thumbnailAssetIds.has(thumbnailAssetId)
        ) {
            addIssue(issues, "Choose an available thumbnail.");
        }
    }

    return issues;
}

export function getWorkspaceNodeSetupWarnings(input: {
    node: WorkspaceNodeInstance;
    graph: WorkspaceGraph;
    plan: WorkspaceFlowPlan;
    context: WorkspaceFlowSetupValidationContext;
}): string[] {
    const { node, graph, plan, context } = input;
    const warnings: string[] = [];

    if (node.templateNodeType !== "edit.mask-region") {
        return warnings;
    }

    const editStep = plan.steps.find(
        (
            step,
        ): step is Extract<WorkspaceFlowStep, { kind: "edit-video" }> =>
            step.kind === "edit-video" && step.editNodeId === node.id,
    );
    if (!editStep) {
        return warnings;
    }

    const upstreamSourceAssetNode = findUpstreamSourceAssetNode(
        graph,
        editStep.sourceNodeId,
    );
    if (!upstreamSourceAssetNode) {
        return warnings;
    }

    const assetId = getStringConfig(upstreamSourceAssetNode, "assetId").trim();
    if (
        !assetId ||
        !context.storageAssetIds.has(assetId) ||
        context.storageAssetMaskSetupIds.has(assetId)
    ) {
        return warnings;
    }

    addIssue(
        warnings,
        "Source video has no saved Blur + subtitle overlay setup from Video Tools Lab.",
    );

    return warnings;
}
