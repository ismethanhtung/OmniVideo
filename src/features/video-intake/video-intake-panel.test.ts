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

  it("renders failed run status messages and error codes in red", () => {
    expect(source).toContain('state.status === "failed"');
    expect(source).toContain('? "font-semibold text-rose-700"');
    expect(source).toContain('className="font-mono text-[11px] text-rose-700"');
  });
});
