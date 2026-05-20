import { randomUUID } from "node:crypto";

export const WORKSPACE_INLINE_ARTIFACT_LIMIT_BYTES = 8 * 1024 * 1024;

export type WorkspaceServerArtifactKind = "audio" | "video";

export type WorkspaceServerArtifact = {
  id: string;
  fileName: string;
  mimeType: string;
  kind: WorkspaceServerArtifactKind;
  bytes: Buffer;
  byteLength: number;
  createdAt: number;
  expiresAt: number;
};

type WorkspaceArtifactGlobal = typeof globalThis & {
  __omnivideoWorkspaceArtifacts?: Map<string, WorkspaceServerArtifact>;
};

const ARTIFACT_TTL_MS = 6 * 60 * 60 * 1000;

function getArtifactStore() {
  const globalStore = globalThis as WorkspaceArtifactGlobal;
  globalStore.__omnivideoWorkspaceArtifacts ??= new Map();
  return globalStore.__omnivideoWorkspaceArtifacts;
}

function pruneExpiredArtifacts(now = Date.now()) {
  const store = getArtifactStore();
  for (const [id, artifact] of store.entries()) {
    if (artifact.expiresAt <= now) {
      store.delete(id);
    }
  }
}

export function putWorkspaceServerArtifact(input: {
  bytes: Uint8Array | Buffer;
  fileName: string;
  mimeType: string;
  kind: WorkspaceServerArtifactKind;
}) {
  const now = Date.now();
  pruneExpiredArtifacts(now);

  const bytes = Buffer.from(input.bytes);
  const artifact: WorkspaceServerArtifact = {
    id: randomUUID(),
    fileName: input.fileName,
    mimeType: input.mimeType,
    kind: input.kind,
    bytes,
    byteLength: bytes.byteLength,
    createdAt: now,
    expiresAt: now + ARTIFACT_TTL_MS,
  };

  getArtifactStore().set(artifact.id, artifact);
  return artifact;
}

export function getWorkspaceServerArtifact(artifactId: string) {
  pruneExpiredArtifacts();
  return getArtifactStore().get(artifactId) ?? null;
}

export function clearWorkspaceServerArtifactsForTest() {
  getArtifactStore().clear();
}

export function buildWorkspaceMediaPayload(input: {
  bytes: Uint8Array | Buffer;
  fileName: string;
  mimeType: string;
  kind: WorkspaceServerArtifactKind;
  base64Field: "audioBase64" | "videoBase64";
  inlineLimitBytes?: number;
}) {
  const bytes = Buffer.from(input.bytes);
  const common = {
    fileName: input.fileName,
    mimeType: input.mimeType,
    byteLength: bytes.byteLength,
  };

  if (
    bytes.byteLength >
    (input.inlineLimitBytes ?? WORKSPACE_INLINE_ARTIFACT_LIMIT_BYTES)
  ) {
    const artifact = putWorkspaceServerArtifact({
      bytes,
      fileName: input.fileName,
      mimeType: input.mimeType,
      kind: input.kind,
    });
    return {
      ...common,
      artifactId: artifact.id,
      artifactExpiresAt: new Date(artifact.expiresAt).toISOString(),
    };
  }

  return {
    ...common,
    [input.base64Field]: bytes.toString("base64"),
  };
}
