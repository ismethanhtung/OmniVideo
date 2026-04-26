export type WorkspaceNodeCategory = "input" | "processing" | "output";

export type WorkspaceNodeImplementationStatus =
  | "available"
  | "planned"
  | "blocked";

export type WorkspacePort = {
  id: string;
  label: string;
  dataType: "source" | "asset" | "video" | "audio" | "metadata" | "publish";
};

export type WorkspaceConfigField = {
  key: string;
  label: string;
  type: "text" | "number" | "boolean" | "select" | "region" | "account";
  required: boolean;
  defaultValue?: string | number | boolean;
};

export type WorkspaceNodeTemplate = {
  nodeType: string;
  version: string;
  label: string;
  description: string;
  category: WorkspaceNodeCategory;
  status: WorkspaceNodeImplementationStatus;
  inputPorts: WorkspacePort[];
  outputPorts: WorkspacePort[];
  configFields: WorkspaceConfigField[];
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoff: "none" | "linear" | "exponential";
  };
  idempotencyStrategy: "input-hash" | "asset-checksum" | "provider-request-id";
  observabilityHooks: Array<"onStart" | "onSuccess" | "onError">;
  traceabilityNotes: string;
};

export type WorkspaceNodeInstance = {
  id: string;
  templateNodeType: string;
  label: string;
  position: {
    x: number;
    y: number;
  };
  config: Record<string, string | number | boolean>;
};

export type WorkspaceEdge = {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
};

export type WorkspaceGraph = {
  version: 1;
  draftId: string;
  title: string;
  updatedAt: string;
  selectedNodeId: string | null;
  nodes: WorkspaceNodeInstance[];
  edges: WorkspaceEdge[];
};

export type WorkspaceGraphValidation = {
  ok: boolean;
  errors: string[];
};

export type WorkspaceConnectionValidation = {
  ok: boolean;
  error?: string;
};

export type WorkspaceExecutableUploadToSocialPlan = {
  ok: boolean;
  mode?: "upload-to-storage" | "asset-to-social" | "upload-to-social";
  sourceNodeId?: string;
  storageNodeId?: string;
  publishNodeId?: string;
  error?: string;
};

export const WORKSPACE_DRAFT_STORAGE_KEY = "omnivideo.workspaceDraft.v1";

export const WORKSPACE_NODE_TEMPLATES: WorkspaceNodeTemplate[] = [
  {
    nodeType: "source.url",
    version: "1.0.0",
    label: "URL Video",
    description: "Nhận URL Douyin/TikTok/YouTube/Facebook và giữ source trace.",
    category: "input",
    status: "available",
    inputPorts: [],
    outputPorts: [{ id: "source", label: "Source URL", dataType: "source" }],
    configFields: [
      { key: "url", label: "Source URL", type: "text", required: true },
      {
        key: "ownershipStatus",
        label: "Ownership status",
        type: "select",
        required: true,
        defaultValue: "unknown",
      },
    ],
    timeoutMs: 30000,
    retryPolicy: { maxAttempts: 1, backoff: "none" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Source URL, origin platform, ownership status, and tags must be preserved on every downstream asset.",
  },
  {
    nodeType: "source.file",
    version: "1.0.0",
    label: "Upload Video",
    description: "Nhận file local và tạo asset đầu vào trước khi xử lý.",
    category: "input",
    status: "available",
    inputPorts: [],
    outputPorts: [{ id: "asset", label: "Input asset", dataType: "asset" }],
    configFields: [
      { key: "storageAccountId", label: "Storage account", type: "account", required: true },
    ],
    timeoutMs: 300000,
    retryPolicy: { maxAttempts: 1, backoff: "none" },
    idempotencyStrategy: "asset-checksum",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Local upload must persist original filename, size, checksum when available, storage pointer, and source type=file.",
  },
  {
    nodeType: "source.asset",
    version: "1.0.0",
    label: "Storage Asset",
    description: "Dùng video đã có trong Storage Library làm input flow.",
    category: "input",
    status: "available",
    inputPorts: [],
    outputPorts: [{ id: "asset", label: "Existing asset", dataType: "asset" }],
    configFields: [
      { key: "assetId", label: "Video asset", type: "account", required: true },
    ],
    timeoutMs: 5000,
    retryPolicy: { maxAttempts: 1, backoff: "none" },
    idempotencyStrategy: "asset-checksum",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Existing asset input must preserve asset id, storage pointer, source refs, and prior pipeline trace.",
  },
  {
    nodeType: "edit.mask-region",
    version: "0.1.0",
    label: "Mask Logo/Subtitles",
    description: "Làm mờ logo, tem hoặc phụ đề gốc theo vùng chọn timeline.",
    category: "processing",
    status: "planned",
    inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
    outputPorts: [{ id: "video", label: "Masked video", dataType: "video" }],
    configFields: [
      { key: "region", label: "Mask region", type: "region", required: true },
      { key: "blurStrength", label: "Blur strength", type: "number", required: true, defaultValue: 18 },
    ],
    timeoutMs: 600000,
    retryPolicy: { maxAttempts: 2, backoff: "exponential" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Transform chain must record source asset id, mask region, timeline range, and output asset id.",
  },
  {
    nodeType: "audio.extract-voice",
    version: "0.1.0",
    label: "Extract Voice",
    description: "Tách hoặc giảm voice gốc để chuẩn bị lồng tiếng mới.",
    category: "processing",
    status: "planned",
    inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
    outputPorts: [
      { id: "video", label: "Video bed", dataType: "video" },
      { id: "audio", label: "Voice track", dataType: "audio" },
    ],
    configFields: [
      { key: "mode", label: "Mode", type: "select", required: true, defaultValue: "separate" },
    ],
    timeoutMs: 900000,
    retryPolicy: { maxAttempts: 2, backoff: "exponential" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Audio outputs must keep language hint, model/provider used later, and sync metadata.",
  },
  {
    nodeType: "audio.voice-insert",
    version: "0.1.0",
    label: "Insert Voice",
    description: "Chèn voice mới hoặc voice clone/TTS vào video bed.",
    category: "processing",
    status: "planned",
    inputPorts: [
      { id: "video", label: "Video bed", dataType: "video" },
      { id: "audio", label: "Voice audio", dataType: "audio" },
    ],
    outputPorts: [{ id: "video", label: "Voiced video", dataType: "video" }],
    configFields: [
      { key: "voiceProfile", label: "Voice profile", type: "text", required: true },
      { key: "ducking", label: "Auto ducking", type: "boolean", required: false, defaultValue: true },
    ],
    timeoutMs: 600000,
    retryPolicy: { maxAttempts: 2, backoff: "exponential" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Voice insertion must record voice profile, provider/model, sync offsets, and audio peak checks.",
  },
  {
    nodeType: "edit.mirror",
    version: "0.1.0",
    label: "Mirror Video",
    description: "Lật ngang video cho các biến thể edit hợp lệ.",
    category: "processing",
    status: "planned",
    inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
    outputPorts: [{ id: "video", label: "Mirrored video", dataType: "video" }],
    configFields: [
      { key: "axis", label: "Axis", type: "select", required: true, defaultValue: "horizontal" },
    ],
    timeoutMs: 300000,
    retryPolicy: { maxAttempts: 2, backoff: "linear" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Mirror transform must record axis and output asset preview metadata.",
  },
  {
    nodeType: "edit.rotate",
    version: "0.1.0",
    label: "Rotate Video",
    description: "Xoay video theo góc cấu hình để chuẩn hóa layout.",
    category: "processing",
    status: "planned",
    inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
    outputPorts: [{ id: "video", label: "Rotated video", dataType: "video" }],
    configFields: [
      { key: "degrees", label: "Degrees", type: "number", required: true, defaultValue: 0 },
    ],
    timeoutMs: 300000,
    retryPolicy: { maxAttempts: 2, backoff: "linear" },
    idempotencyStrategy: "input-hash",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Rotation must update output width/height metadata and preserve original asset refs.",
  },
  {
    nodeType: "storage.upload",
    version: "1.0.0",
    label: "Save to Storage",
    description: "Lưu asset đầu ra vào Telegram/Drive storage account.",
    category: "output",
    status: "available",
    inputPorts: [{ id: "asset", label: "Asset", dataType: "asset" }],
    outputPorts: [{ id: "asset", label: "Stored asset", dataType: "asset" }],
    configFields: [
      { key: "storageAccountId", label: "Storage account", type: "account", required: true },
    ],
    timeoutMs: 900000,
    retryPolicy: { maxAttempts: 3, backoff: "exponential" },
    idempotencyStrategy: "asset-checksum",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Storage output must include provider, account id, storage pointer, file size, and source run refs.",
  },
  {
    nodeType: "social.publish",
    version: "0.1.0",
    label: "Publish Social",
    description: "Đăng hoặc lập kế hoạch đăng video sang platform đã cấu hình.",
    category: "output",
    status: "planned",
    inputPorts: [{ id: "asset", label: "Asset", dataType: "asset" }],
    outputPorts: [{ id: "publish", label: "Publish record", dataType: "publish" }],
    configFields: [
      { key: "socialAccountId", label: "Social account", type: "account", required: true },
      { key: "publishMode", label: "Publish mode", type: "select", required: true, defaultValue: "schedule" },
    ],
    timeoutMs: 900000,
    retryPolicy: { maxAttempts: 2, backoff: "exponential" },
    idempotencyStrategy: "provider-request-id",
    observabilityHooks: ["onStart", "onSuccess", "onError"],
    traceabilityNotes:
      "Publish node must preserve account id, platform, target page/channel, publish record id, and platform response.",
  },
];

export function createEmptyWorkspaceGraph(title = "Untitled workspace"): WorkspaceGraph {
  return {
    version: 1,
    draftId: "local-draft",
    title,
    updatedAt: new Date(0).toISOString(),
    selectedNodeId: null,
    nodes: [],
    edges: [],
  };
}

export function getWorkspaceNodeTemplate(
  nodeType: string,
): WorkspaceNodeTemplate | undefined {
  return WORKSPACE_NODE_TEMPLATES.find((template) => template.nodeType === nodeType);
}

function buildDefaultConfig(template: WorkspaceNodeTemplate) {
  return template.configFields.reduce<WorkspaceNodeInstance["config"]>(
    (config, field) => {
      if (field.defaultValue !== undefined) {
        config[field.key] = field.defaultValue;
      }
      return config;
    },
    {},
  );
}

function nodeTypeToInstancePrefix(nodeType: string) {
  return nodeType.replaceAll(".", "-");
}

export function addWorkspaceNode(
  graph: WorkspaceGraph,
  template: WorkspaceNodeTemplate,
  position: WorkspaceNodeInstance["position"],
): WorkspaceGraph {
  const prefix = nodeTypeToInstancePrefix(template.nodeType);
  const nextIndex =
    graph.nodes.filter((node) => node.id.startsWith(`${prefix}-`)).length + 1;
  const node: WorkspaceNodeInstance = {
    id: `${prefix}-${nextIndex}`,
    templateNodeType: template.nodeType,
    label: template.label,
    position,
    config: buildDefaultConfig(template),
  };

  return {
    ...graph,
    updatedAt: new Date().toISOString(),
    selectedNodeId: node.id,
    nodes: [...graph.nodes, node],
  };
}

export function selectWorkspaceNode(
  graph: WorkspaceGraph,
  nodeId: string | null,
): WorkspaceGraph {
  return {
    ...graph,
    selectedNodeId: nodeId,
  };
}

export function deleteWorkspaceNode(
  graph: WorkspaceGraph,
  nodeId: string,
): WorkspaceGraph {
  return {
    ...graph,
    updatedAt: new Date().toISOString(),
    selectedNodeId: graph.selectedNodeId === nodeId ? null : graph.selectedNodeId,
    nodes: graph.nodes.filter((node) => node.id !== nodeId),
    edges: graph.edges.filter(
      (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId,
    ),
  };
}

export function moveWorkspaceNode(
  graph: WorkspaceGraph,
  nodeId: string,
  position: WorkspaceNodeInstance["position"],
): WorkspaceGraph {
  return {
    ...graph,
    updatedAt: new Date().toISOString(),
    nodes: graph.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            position: {
              x: Math.max(0, Math.round(position.x)),
              y: Math.max(0, Math.round(position.y)),
            },
          }
        : node,
    ),
  };
}

export function validateWorkspaceConnection(
  graph: WorkspaceGraph,
  fromNodeId: string,
  toNodeId: string,
): WorkspaceConnectionValidation {
  if (fromNodeId === toNodeId) {
    return {
      ok: false,
      error: "Không thể nối một node vào chính nó.",
    };
  }

  const fromNode = graph.nodes.find((node) => node.id === fromNodeId);
  const toNode = graph.nodes.find((node) => node.id === toNodeId);

  if (!fromNode || !toNode) {
    return {
      ok: false,
      error: "Không thể nối vì node nguồn hoặc node đích không còn tồn tại.",
    };
  }

  const fromTemplate = getWorkspaceNodeTemplate(fromNode.templateNodeType);
  const toTemplate = getWorkspaceNodeTemplate(toNode.templateNodeType);

  if (!fromTemplate || !toTemplate) {
    return {
      ok: false,
      error: "Không thể nối vì node template chưa được đăng ký.",
    };
  }

  const fromPort = fromTemplate.outputPorts[0];
  const toPort = toTemplate.inputPorts[0];

  if (!fromPort || !toPort) {
    return {
      ok: false,
      error:
        "Node này thiếu cổng input/output phù hợp. Hãy chọn một node có output và một node có input.",
    };
  }

  const edgeId = `${fromNodeId}:${fromPort.id}->${toNodeId}:${toPort.id}`;

  if (graph.edges.some((edge) => edge.id === edgeId)) {
    return {
      ok: false,
      error: "Kết nối này đã tồn tại trong graph.",
    };
  }

  return { ok: true };
}

export function connectWorkspaceNodes(
  graph: WorkspaceGraph,
  fromNodeId: string,
  toNodeId: string,
): WorkspaceGraph {
  const validation = validateWorkspaceConnection(graph, fromNodeId, toNodeId);

  if (!validation.ok) {
    throw new Error(validation.error ?? "Cannot connect workspace nodes.");
  }

  const fromNode = graph.nodes.find((node) => node.id === fromNodeId);
  const toNode = graph.nodes.find((node) => node.id === toNodeId);
  const fromTemplate = fromNode
    ? getWorkspaceNodeTemplate(fromNode.templateNodeType)
    : undefined;
  const toTemplate = toNode ? getWorkspaceNodeTemplate(toNode.templateNodeType) : undefined;
  const fromPort = fromTemplate?.outputPorts[0];
  const toPort = toTemplate?.inputPorts[0];

  if (!fromNode || !toNode || !fromPort || !toPort) {
    throw new Error("Cannot connect workspace nodes.");
  }

  const edgeId = `${fromNodeId}:${fromPort.id}->${toNodeId}:${toPort.id}`;

  return {
    ...graph,
    updatedAt: new Date().toISOString(),
    edges: [
      ...graph.edges,
      {
        id: edgeId,
        fromNodeId,
        fromPortId: fromPort.id,
        toNodeId,
        toPortId: toPort.id,
      },
    ],
  };
}

export function validateWorkspaceGraph(graph: WorkspaceGraph): WorkspaceGraphValidation {
  const errors: string[] = [];
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    if (!getWorkspaceNodeTemplate(node.templateNodeType)) {
      errors.push(`Unknown node template: ${node.templateNodeType}`);
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.fromNodeId)) {
      errors.push(`Missing edge source node: ${edge.fromNodeId}`);
    }
    if (!nodeIds.has(edge.toNodeId)) {
      errors.push(`Missing edge target node: ${edge.toNodeId}`);
    }
  }

  if (graph.selectedNodeId && !nodeIds.has(graph.selectedNodeId)) {
    errors.push(`Selected node does not exist: ${graph.selectedNodeId}`);
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function hasEdge(graph: WorkspaceGraph, fromNodeId: string, toNodeId: string) {
  return graph.edges.some(
    (edge) => edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId,
  );
}

export function getWorkspaceExecutableUploadToSocialPlan(
  graph: WorkspaceGraph,
): WorkspaceExecutableUploadToSocialPlan {
  const fileSourceNode = graph.nodes.find(
    (node) => node.templateNodeType === "source.file",
  );
  const assetSourceNode = graph.nodes.find(
    (node) => node.templateNodeType === "source.asset",
  );
  const storageNode = graph.nodes.find(
    (node) => node.templateNodeType === "storage.upload",
  );
  const publishNode = graph.nodes.find(
    (node) => node.templateNodeType === "social.publish",
  );

  if (
    fileSourceNode &&
    storageNode &&
    publishNode &&
    hasEdge(graph, fileSourceNode.id, storageNode.id) &&
    hasEdge(graph, storageNode.id, publishNode.id)
  ) {
    return {
      ok: true,
      mode: "upload-to-social",
      sourceNodeId: fileSourceNode.id,
      storageNodeId: storageNode.id,
      publishNodeId: publishNode.id,
    };
  }

  if (fileSourceNode && storageNode && hasEdge(graph, fileSourceNode.id, storageNode.id)) {
    return {
      ok: true,
      mode: "upload-to-storage",
      sourceNodeId: fileSourceNode.id,
      storageNodeId: storageNode.id,
    };
  }

  if (assetSourceNode && publishNode && hasEdge(graph, assetSourceNode.id, publishNode.id)) {
    return {
      ok: true,
      mode: "asset-to-social",
      sourceNodeId: assetSourceNode.id,
      publishNodeId: publishNode.id,
    };
  }

  if (!fileSourceNode && !assetSourceNode) {
    return {
      ok: false,
      error:
        "Flow cần một input chạy thật: Upload Video hoặc Storage Asset.",
    };
  }

  if (fileSourceNode && storageNode && !hasEdge(graph, fileSourceNode.id, storageNode.id)) {
    return {
      ok: false,
      error: "Flow cần nối Upload Video -> Save to Storage.",
    };
  }

  if (assetSourceNode && publishNode && !hasEdge(graph, assetSourceNode.id, publishNode.id)) {
    return {
      ok: false,
      error: "Flow cần nối Storage Asset -> Publish Social.",
    };
  }

  return {
    ok: false,
    error:
      "Flow hiện tại chưa có path chạy được. Hỗ trợ: Upload Video -> Save to Storage, Storage Asset -> Publish Social, hoặc Upload Video -> Save to Storage -> Publish Social.",
  };
}

export function serializeWorkspaceDraft(graph: WorkspaceGraph): string {
  return JSON.stringify({
    ...graph,
    updatedAt: new Date().toISOString(),
  });
}

function isWorkspaceGraph(value: unknown): value is WorkspaceGraph {
  if (!value || typeof value !== "object") {
    return false;
  }

  const graph = value as Partial<WorkspaceGraph>;
  return (
    graph.version === 1 &&
    typeof graph.draftId === "string" &&
    typeof graph.title === "string" &&
    Array.isArray(graph.nodes) &&
    Array.isArray(graph.edges)
  );
}

export function parseWorkspaceDraft(raw: string | null): WorkspaceGraph {
  if (!raw) {
    return createEmptyWorkspaceGraph("Workspace Draft");
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!isWorkspaceGraph(parsed)) {
      return createEmptyWorkspaceGraph("Workspace Draft");
    }

    const validation = validateWorkspaceGraph(parsed);
    if (!validation.ok) {
      return createEmptyWorkspaceGraph("Workspace Draft");
    }

    return parsed;
  } catch {
    return createEmptyWorkspaceGraph("Workspace Draft");
  }
}

export function createDouyinReworkSampleGraph(): WorkspaceGraph {
  const now = new Date().toISOString();
  const nodes: WorkspaceNodeInstance[] = [
    {
      id: "source-url-1",
      templateNodeType: "source.url",
      label: "Douyin source",
      position: { x: 48, y: 96 },
      config: { ownershipStatus: "unknown" },
    },
    {
      id: "edit-mask-region-1",
      templateNodeType: "edit.mask-region",
      label: "Blur Chinese subtitles/logo",
      position: { x: 300, y: 96 },
      config: { blurStrength: 18 },
    },
    {
      id: "audio-extract-voice-1",
      templateNodeType: "audio.extract-voice",
      label: "Separate original voice",
      position: { x: 552, y: 96 },
      config: { mode: "separate" },
    },
    {
      id: "audio-voice-insert-1",
      templateNodeType: "audio.voice-insert",
      label: "Insert custom voice",
      position: { x: 804, y: 96 },
      config: { voiceProfile: "planned-voice", ducking: true },
    },
    {
      id: "edit-mirror-1",
      templateNodeType: "edit.mirror",
      label: "Mirror final video",
      position: { x: 1056, y: 96 },
      config: { axis: "horizontal" },
    },
    {
      id: "storage-upload-1",
      templateNodeType: "storage.upload",
      label: "Save to Drive/Telegram",
      position: { x: 1308, y: 96 },
      config: {},
    },
    {
      id: "social-publish-1",
      templateNodeType: "social.publish",
      label: "Publish to platforms",
      position: { x: 1560, y: 96 },
      config: { publishMode: "schedule" },
    },
  ];

  const edges: WorkspaceEdge[] = [
    "source-url-1->edit-mask-region-1",
    "edit-mask-region-1->audio-extract-voice-1",
    "audio-extract-voice-1->audio-voice-insert-1",
    "audio-voice-insert-1->edit-mirror-1",
    "edit-mirror-1->storage-upload-1",
    "storage-upload-1->social-publish-1",
  ].map((edge) => {
    const [fromNodeId, toNodeId] = edge.split("->");
    return {
      id: `${fromNodeId}:video->${toNodeId}:video`,
      fromNodeId,
      fromPortId: "video",
      toNodeId,
      toPortId: "video",
    };
  });

  return {
    version: 1,
    draftId: "douyin-rework-sample",
    title: "Douyin rework sample",
    updatedAt: now,
    selectedNodeId: "source-url-1",
    nodes,
    edges,
  };
}

export function createUploadToSocialSampleGraph(): WorkspaceGraph {
  const now = new Date().toISOString();
  const nodes: WorkspaceNodeInstance[] = [
    {
      id: "source-file-1",
      templateNodeType: "source.file",
      label: "Upload source video",
      position: { x: 80, y: 120 },
      config: {},
    },
    {
      id: "storage-upload-1",
      templateNodeType: "storage.upload",
      label: "Save to storage",
      position: { x: 360, y: 120 },
      config: {},
    },
    {
      id: "social-publish-1",
      templateNodeType: "social.publish",
      label: "Publish now",
      position: { x: 640, y: 120 },
      config: { publishMode: "publish_now" },
    },
  ];

  return {
    version: 1,
    draftId: "upload-to-social-sample",
    title: "Upload to Social executable flow",
    updatedAt: now,
    selectedNodeId: "source-file-1",
    nodes,
    edges: [
      {
        id: "source-file-1:asset->storage-upload-1:asset",
        fromNodeId: "source-file-1",
        fromPortId: "asset",
        toNodeId: "storage-upload-1",
        toPortId: "asset",
      },
      {
        id: "storage-upload-1:asset->social-publish-1:asset",
        fromNodeId: "storage-upload-1",
        fromPortId: "asset",
        toNodeId: "social-publish-1",
        toPortId: "asset",
      },
    ],
  };
}

export function createUploadToStorageSampleGraph(): WorkspaceGraph {
  const graph = createUploadToSocialSampleGraph();
  return {
    ...graph,
    draftId: "upload-to-storage-sample",
    title: "Upload to Storage executable flow",
    selectedNodeId: "source-file-1",
    nodes: graph.nodes.filter((node) => node.templateNodeType !== "social.publish"),
    edges: graph.edges.filter((edge) => edge.toNodeId !== "social-publish-1"),
  };
}

export function createAssetToSocialSampleGraph(): WorkspaceGraph {
  const now = new Date().toISOString();
  return {
    version: 1,
    draftId: "asset-to-social-sample",
    title: "Existing Asset to Social executable flow",
    updatedAt: now,
    selectedNodeId: "source-asset-1",
    nodes: [
      {
        id: "source-asset-1",
        templateNodeType: "source.asset",
        label: "Storage Library asset",
        position: { x: 100, y: 140 },
        config: {},
      },
      {
        id: "social-publish-1",
        templateNodeType: "social.publish",
        label: "Publish now",
        position: { x: 400, y: 140 },
        config: { publishMode: "publish_now" },
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
    ],
  };
}
