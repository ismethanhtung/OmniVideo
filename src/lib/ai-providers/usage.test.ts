import { describe, expect, it } from "vitest";

import { checkQuotaAvailable } from "./usage";

describe("checkQuotaAvailable", () => {
  it("allows when no quota is set", () => {
    const result = checkQuotaAvailable(
      { quotaMonthlyTokens: null, usage: { totalRequests: 0, totalTokensUsed: 0, lastUsedAt: null } },
      { totalRequests: 100, totalTokens: 500000, promptTokens: 0, completionTokens: 0 },
    );
    expect(result.allowed).toBe(true);
  });

  it("allows when under quota", () => {
    const result = checkQuotaAvailable(
      { quotaMonthlyTokens: 1000000, usage: { totalRequests: 0, totalTokensUsed: 0, lastUsedAt: null } },
      { totalRequests: 10, totalTokens: 500000, promptTokens: 0, completionTokens: 0 },
    );
    expect(result.allowed).toBe(true);
  });

  it("denies when quota exceeded", () => {
    const result = checkQuotaAvailable(
      { quotaMonthlyTokens: 1000000, usage: { totalRequests: 0, totalTokensUsed: 0, lastUsedAt: null } },
      { totalRequests: 100, totalTokens: 1000000, promptTokens: 0, completionTokens: 0 },
    );
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Monthly token quota exhausted");
  });

  it("denies when over quota", () => {
    const result = checkQuotaAvailable(
      { quotaMonthlyTokens: 500000, usage: { totalRequests: 0, totalTokensUsed: 0, lastUsedAt: null } },
      { totalRequests: 50, totalTokens: 600000, promptTokens: 0, completionTokens: 0 },
    );
    expect(result.allowed).toBe(false);
  });
});
