import { describe, expect, it } from "vitest";

import { getStatusTone, normalizeStatusLabel } from "./status-tone";

describe("status tone", () => {
  it("maps success and failure tones", () => {
    expect(getStatusTone("success")).toBe("success");
    expect(getStatusTone("published")).toBe("success");
    expect(getStatusTone("failed")).toBe("error");
  });

  it("maps warning/info tones used in runtime", () => {
    expect(getStatusTone("planned")).toBe("warning");
    expect(getStatusTone("paused")).toBe("warning");
    expect(getStatusTone("checking")).toBe("info");
  });

  it("normalizes underscore labels", () => {
    expect(normalizeStatusLabel("needs_auth")).toBe("needs auth");
  });
});
