export type IntakeNodeDefinition = {
  nodeId: string;
  nodeType: string;
  version: string;
  dependsOn: string[];
  timeoutMs: number;
  retryPolicy: {
    maxAttempts: number;
    backoff: "none" | "linear" | "exponential";
  };
  idempotencyStrategy: "input-hash" | "run-scoped";
};

export const URL_INTAKE_PIPELINE_DEFINITION = {
  name: "MVP URL Intake to Storage",
  version: "1.0.0",
  nodes: [
    {
      nodeId: "validate-source-url",
      nodeType: "source.url.validate",
      version: "1.0.0",
      dependsOn: [],
      timeoutMs: 10_000,
      retryPolicy: { maxAttempts: 1, backoff: "none" },
      idempotencyStrategy: "input-hash",
    },
    {
      nodeId: "resolve-media-url",
      nodeType: "source.media.resolve",
      version: "1.0.0",
      dependsOn: ["validate-source-url"],
      timeoutMs: 60_000,
      retryPolicy: { maxAttempts: 2, backoff: "linear" },
      idempotencyStrategy: "input-hash",
    },
    {
      nodeId: "upload-storage",
      nodeType: "storage.upload",
      version: "1.0.0",
      dependsOn: ["resolve-media-url"],
      timeoutMs: 300_000,
      retryPolicy: { maxAttempts: 2, backoff: "linear" },
      idempotencyStrategy: "run-scoped",
    },
    {
      nodeId: "persist-asset-metadata",
      nodeType: "asset.metadata.persist",
      version: "1.0.0",
      dependsOn: ["upload-storage"],
      timeoutMs: 15_000,
      retryPolicy: { maxAttempts: 1, backoff: "none" },
      idempotencyStrategy: "run-scoped",
    },
  ] satisfies IntakeNodeDefinition[],
};

export const LOCAL_INTAKE_PIPELINE_DEFINITION = {
  name: "MVP Local Intake to Storage",
  version: "1.0.0",
  nodes: [
    {
      nodeId: "validate-local-file",
      nodeType: "source.file.validate",
      version: "1.0.0",
      dependsOn: [],
      timeoutMs: 10_000,
      retryPolicy: { maxAttempts: 1, backoff: "none" },
      idempotencyStrategy: "input-hash",
    },
    {
      nodeId: "upload-storage",
      nodeType: "storage.upload",
      version: "1.0.0",
      dependsOn: ["validate-local-file"],
      timeoutMs: 300_000,
      retryPolicy: { maxAttempts: 2, backoff: "linear" },
      idempotencyStrategy: "run-scoped",
    },
    {
      nodeId: "persist-asset-metadata",
      nodeType: "asset.metadata.persist",
      version: "1.0.0",
      dependsOn: ["upload-storage"],
      timeoutMs: 15_000,
      retryPolicy: { maxAttempts: 1, backoff: "none" },
      idempotencyStrategy: "run-scoped",
    },
  ] satisfies IntakeNodeDefinition[],
};
