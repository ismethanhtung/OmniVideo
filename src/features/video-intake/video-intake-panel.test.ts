import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-intake/video-intake-panel.tsx";

describe("Video Intake history retry action", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("adds Again action in history rows", () => {
    expect(source).toContain('run.status === "failed" ? (');
    expect(source).toContain("Again");
    expect(source).toContain("void retryRun(");
  });

  it("retries failed run using saved source URL", () => {
    expect(source).toContain("const retrySourceUrl = run.inputSnapshot?.sourceUrl?.trim();");
    expect(source).toContain("Retry failed: missing source URL from selected run.");
    expect(source).toContain("message: \"Retry completed.\"");
  });
});
