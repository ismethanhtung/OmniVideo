import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/social/repository", () => ({
  createPublishRecord: vi.fn(),
  executePublishNow: vi.fn(),
  getSocialDb: vi.fn(),
  listPublishRecordsPage: vi.fn(),
}));

import { getSocialDb, listPublishRecordsPage } from "@/lib/social/repository";

import { GET, POST } from "./route";

describe("social publish records API", () => {
  it("passes pagination and filters to repository", async () => {
    vi.mocked(getSocialDb).mockResolvedValueOnce({} as never);
    vi.mocked(listPublishRecordsPage).mockResolvedValueOnce({
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });

    const response = await GET(
      new Request(
        "http://localhost/api/social/publish-records?page=2&pageSize=10&platform=youtube&status=failed",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.pagination).toEqual({
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    });
    expect(listPublishRecordsPage).toHaveBeenCalledWith({
      db: {},
      page: 2,
      pageSize: 10,
      platform: "youtube",
      status: "failed",
    });
  });

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
