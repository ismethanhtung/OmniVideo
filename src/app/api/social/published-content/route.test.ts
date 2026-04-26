import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  getSocialDb: vi.fn(),
}));

vi.mock("@/lib/social/inventory", () => ({
  listSocialPublishedContentInventory: vi.fn(),
}));

import { listSocialPublishedContentInventory } from "@/lib/social/inventory";

import { GET } from "./route";

describe("social published content API", () => {
  it("returns account and asset inventory", async () => {
    vi.mocked(listSocialPublishedContentInventory).mockResolvedValueOnce({
      accounts: [],
      assets: [],
    });

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data).toEqual({ accounts: [], assets: [] });
  });

  it("returns a stable error code when inventory loading fails", async () => {
    vi.mocked(listSocialPublishedContentInventory).mockRejectedValueOnce(
      new Error("db failed"),
    );

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.errorCode).toBe("SYS_SOCIAL_PUBLISHED_CONTENT_API_FAILED");
  });
});
