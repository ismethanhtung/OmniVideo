import { describe, expect, it } from "vitest";

import { buildPublishedFootprintKey } from "./published-content-keys";

describe("published content panel", () => {
  it("builds unique keys for duplicate failed destinations", () => {
    const failedPlatform = {
      platform: "facebook" as const,
      accountId: "69edf41ebbe026be12c16fb0",
      accountLabel: "Main Page",
      publishType: "facebook_reel" as const,
      status: "failed",
      platformPostId: null,
      publishedAt: null,
    };

    expect(buildPublishedFootprintKey(failedPlatform, 0)).not.toBe(
      buildPublishedFootprintKey(failedPlatform, 1),
    );
  });
});
