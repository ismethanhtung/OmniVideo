import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  createSocialAccount: vi.fn(),
  getSocialDb: vi.fn(),
  listSocialAccounts: vi.fn(),
}));

import { POST } from "./route";

describe("social accounts API", () => {
  it("returns VAL_SOCIAL_PLATFORM_INVALID for unsupported platform", async () => {
    const response = await POST(
      new Request("http://localhost/api/social/accounts", {
        method: "POST",
        body: JSON.stringify({
          platform: "instagram",
          label: "Instagram",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.errorCode).toBe("VAL_SOCIAL_PLATFORM_INVALID");
  });
});
