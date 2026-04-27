import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  getSocialDb: vi.fn(),
  getSocialAccountById: vi.fn(),
  updateSocialAccount: vi.fn(),
}));

vi.mock("@/lib/social/facebook-auth", () => ({
  listFacebookPagesForAccount: vi.fn(),
  refreshFacebookPagesForAccount: vi.fn(),
}));

import {
  getSocialAccountById,
  getSocialDb,
  updateSocialAccount,
} from "@/lib/social/repository";
import {
  listFacebookPagesForAccount,
  refreshFacebookPagesForAccount,
} from "@/lib/social/facebook-auth";

import { GET, POST } from "./route";

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
      source: "cached",
    });

    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ accountId: "507f1f77bcf86cd799439012" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.pages).toEqual([{ id: "1", name: "Page 1" }]);
    expect(listFacebookPagesForAccount).toHaveBeenCalledWith(expect.any(Object));
  });

  it("refreshes pages and persists connectionJson via POST", async () => {
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
      secrets: { accessToken: "token", connectionJson: "{}" },
      lastHealthCheckAt: null,
      lastError: null,
      usage: { publishRecordCountApprox: 0, lastPlannedAt: null },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(refreshFacebookPagesForAccount).mockResolvedValueOnce({
      pages: [{ id: "1", name: "Page 1" }],
      configuredPageId: "1",
      connectionJson:
        '{"pages":[{"id":"1","name":"Page 1","access_token":"page-token"}]}',
      source: "graph",
    });
    vi.mocked(updateSocialAccount).mockResolvedValueOnce({
      _id: "507f1f77bcf86cd799439012",
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
      secretSummary: {},
      usage: { publishRecordCountApprox: 0, lastPlannedAt: null },
      lastHealthCheckAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date("2026-04-27T00:00:00.000Z"),
    } as never);

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ accountId: "507f1f77bcf86cd799439012" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(refreshFacebookPagesForAccount).toHaveBeenCalledWith(expect.any(Object));
    expect(updateSocialAccount).toHaveBeenCalledWith({
      db: expect.any(Object),
      accountId: "507f1f77bcf86cd799439012",
      patch: {
        secrets: {
          accessToken: "token",
          connectionJson:
            '{"pages":[{"id":"1","name":"Page 1","access_token":"page-token"}]}',
        },
      },
    });
  });
});
