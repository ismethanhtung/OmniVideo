import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  createPublishRecord: vi.fn(),
  getSocialDb: vi.fn(),
  listPublishRecords: vi.fn(),
}));

import { POST } from "./route";

describe("social publish records API", () => {
  it("returns VAL_PUBLISH_ASSET_ID_INVALID for invalid asset id", async () => {
    const response = await POST(
      new Request("http://localhost/api/social/publish-records", {
        method: "POST",
        body: JSON.stringify({
          assetId: "bad-id",
          socialAccountId: "507f1f77bcf86cd799439012",
          publishType: "tiktok_video",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.errorCode).toBe("VAL_PUBLISH_ASSET_ID_INVALID");
  });
});
