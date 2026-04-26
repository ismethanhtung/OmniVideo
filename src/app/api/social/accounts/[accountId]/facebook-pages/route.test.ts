import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  getSocialDb: vi.fn(),
  getSocialAccountById: vi.fn(),
}));

vi.mock("@/lib/social/facebook-auth", () => ({
  listFacebookPagesForAccount: vi.fn(),
}));

import { getSocialAccountById, getSocialDb } from "@/lib/social/repository";
import { listFacebookPagesForAccount } from "@/lib/social/facebook-auth";

import { GET } from "./route";

describe("facebook pages API", () => {
  it("returns pages for a facebook account", async () => {
    vi.mocked(getSocialDb).mockResolvedValueOnce({} as never);
    vi.mocked(getSocialAccountById).mockResolvedValueOnce({
      _id: {} as never,
      platform: "facebook",
      label: "FB",
      displayName: null,
      handle: null,
      accountId: null,
      status: "connected",
      authMode: "oauth",
      channelTags: [],
      permissionScopes: [],
      supportedFormats: ["facebook_reel"],
      secrets: {},
      lastHealthCheckAt: null,
      lastError: null,
      usage: { publishRecordCountApprox: 0, lastPlannedAt: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(listFacebookPagesForAccount).mockResolvedValueOnce({
      pages: [{ id: "1", name: "Page 1" }],
      configuredPageId: "1",
      source: "graph",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ accountId: "507f1f77bcf86cd799439012" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.pages).toEqual([{ id: "1", name: "Page 1" }]);
  });
});
