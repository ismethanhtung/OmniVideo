import { afterEach, describe, expect, it } from "vitest";

import {
  clearWorkspaceServerArtifactsForTest,
  putWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

import { GET } from "./route";

describe("workspace artifact download route", () => {
  afterEach(() => {
    clearWorkspaceServerArtifactsForTest();
  });

  it("downloads a server-side workspace video artifact", async () => {
    const artifact = putWorkspaceServerArtifact({
      bytes: Buffer.from("processed-video"),
      fileName: "Ăn Không Ngồi Rồi.mp4",
      mimeType: "video/mp4",
      kind: "video",
    });

    const response = await GET(
      new Request(
        `http://localhost/api/workspace/artifacts/${artifact.id}/download`,
      ),
      { params: Promise.resolve({ artifactId: artifact.id }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("video/mp4");
    expect(response.headers.get("X-OmniVideo-File-Name")).toBe(
      encodeURIComponent("An-Khong-Ngoi-Roi.mp4"),
    );
    expect(response.headers.get("content-disposition")).toContain(
      'filename="An-Khong-Ngoi-Roi.mp4"',
    );
    expect(response.headers.get("X-OmniVideo-Byte-Length")).toBe("15");
    expect(await response.text()).toBe("processed-video");
  });

  it("returns 404 for missing or expired artifacts", async () => {
    const response = await GET(
      new Request(
        "http://localhost/api/workspace/artifacts/missing/download",
      ),
      { params: Promise.resolve({ artifactId: "missing" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_WORKSPACE_ARTIFACT_NOT_FOUND",
    });
  });
});
