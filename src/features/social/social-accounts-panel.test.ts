import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/social/social-accounts-panel.tsx";

describe("Social Accounts panel", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("keeps account management UI and does not embed platform readiness block", () => {
    expect(source).toContain("Add Account");
    expect(source).toContain("/api/social/accounts");
    expect(source).not.toContain("/api/social/dashboard");
    expect(source).not.toContain("Platform Readiness");
  });

  it("renders failed account status messages with red error treatment", () => {
    expect(source).toContain('const statusFailed = status === "failed";');
    expect(source).toContain('statusFailed ? "text-rose-700" : "text-muted"');
    expect(source).toContain('statusFailed ? "border-rose-300 text-rose-700" : "border-main"');
  });
});
