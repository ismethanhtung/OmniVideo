import { describe, expect, it } from "vitest";

import { getStatusTone, normalizeStatusLabel } from "./status-badge-style";

describe("status badge", () => {
  it("maps success-like statuses to success tone", () => {
    expect(getStatusTone("published")).toBe("success");
    expect(getStatusTone("connected")).toBe("success");
    expect(getStatusTone("ok")).toBe("success");
  });

  it("maps failure-like statuses to error tone", () => {
    expect(getStatusTone("failed")).toBe("error");
    expect(getStatusTone("error")).toBe("error");
    expect(getStatusTone("canceled")).toBe("error");
  });

  it("maps pending-like statuses to warning tone", () => {
    expect(getStatusTone("planned")).toBe("warning");
    expect(getStatusTone("queued")).toBe("warning");
    expect(getStatusTone("needs_auth")).toBe("warning");
  });

  it("returns neutral tone for unknown statuses", () => {
    expect(getStatusTone("unknown_status")).toBe("neutral");
  });

  it("normalizes underscored labels", () => {
    expect(normalizeStatusLabel("needs_auth")).toBe("needs auth");
  });
});
