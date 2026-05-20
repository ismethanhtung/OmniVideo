import { afterEach, describe, expect, it } from "vitest";

import {
  buildWorkspaceMediaPayload,
  clearWorkspaceServerArtifactsForTest,
  getWorkspaceServerArtifact,
} from "./server-artifacts";

describe("workspace server artifacts", () => {
  afterEach(() => {
    clearWorkspaceServerArtifactsForTest();
  });

  it("keeps small media inline as base64", () => {
    const payload = buildWorkspaceMediaPayload({
      bytes: Buffer.from("small-video"),
      fileName: "small.mp4",
      mimeType: "video/mp4",
      kind: "video",
      base64Field: "videoBase64",
      inlineLimitBytes: 1024,
    });

    expect(payload).toMatchObject({
      fileName: "small.mp4",
      mimeType: "video/mp4",
      byteLength: 11,
      videoBase64: Buffer.from("small-video").toString("base64"),
    });
    expect("artifactId" in payload).toBe(false);
  });

  it("stores large media server-side and returns an artifact id", () => {
    const payload = buildWorkspaceMediaPayload({
      bytes: Buffer.from("large-video"),
      fileName: "large.mp4",
      mimeType: "video/mp4",
      kind: "video",
      base64Field: "videoBase64",
      inlineLimitBytes: 4,
    });

    expect(payload).toMatchObject({
      fileName: "large.mp4",
      mimeType: "video/mp4",
      byteLength: 11,
      artifactId: expect.any(String),
      artifactExpiresAt: expect.any(String),
    });
    expect("videoBase64" in payload).toBe(false);

    const artifact = getWorkspaceServerArtifact(payload.artifactId as string);
    expect(artifact).toMatchObject({
      fileName: "large.mp4",
      mimeType: "video/mp4",
      kind: "video",
      byteLength: 11,
    });
    expect(artifact?.bytes.toString()).toBe("large-video");
  });
});
