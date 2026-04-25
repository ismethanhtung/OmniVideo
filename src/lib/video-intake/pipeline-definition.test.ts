import { describe, expect, it } from "vitest";

import {
  LOCAL_INTAKE_PIPELINE_DEFINITION,
  URL_INTAKE_PIPELINE_DEFINITION,
} from "./pipeline-definition";

describe("URL intake pipeline definition", () => {
  it("keeps the MVP node order explicit and dependency-safe", () => {
    expect(URL_INTAKE_PIPELINE_DEFINITION.nodes.map((node) => node.nodeType)).toEqual(
      [
        "source.url.validate",
        "source.media.resolve",
        "storage.upload",
        "asset.metadata.persist",
      ],
    );

    expect(URL_INTAKE_PIPELINE_DEFINITION.nodes[1].dependsOn).toEqual([
      "validate-source-url",
    ]);
    expect(URL_INTAKE_PIPELINE_DEFINITION.nodes[2].dependsOn).toEqual([
      "resolve-media-url",
    ]);
    expect(URL_INTAKE_PIPELINE_DEFINITION.nodes[3].dependsOn).toEqual([
      "upload-storage",
    ]);
  });

  it("defines timeout and retry policy for each node", () => {
    for (const node of URL_INTAKE_PIPELINE_DEFINITION.nodes) {
      expect(node.timeoutMs).toBeGreaterThan(0);
      expect(node.retryPolicy.maxAttempts).toBeGreaterThan(0);
      expect(node.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });
});

describe("local intake pipeline definition", () => {
  it("defines local-file workflow without resolver step", () => {
    expect(
      LOCAL_INTAKE_PIPELINE_DEFINITION.nodes.map((node) => node.nodeType),
    ).toEqual([
      "source.file.validate",
      "storage.upload",
      "asset.metadata.persist",
    ]);

    expect(LOCAL_INTAKE_PIPELINE_DEFINITION.nodes[1].dependsOn).toEqual([
      "validate-local-file",
    ]);
  });
});
