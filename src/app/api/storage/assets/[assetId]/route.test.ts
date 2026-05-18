import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getIntakeDb,
  updateVideoAssetMetadataById,
} from "@/lib/video-intake/repository";

import { PATCH } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
  requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/video-intake/repository", () => ({
  deleteVideoAssetById: vi.fn(),
  getIntakeDb: vi.fn(),
  updateVideoAssetMetadataById: vi.fn(),
}));

const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedUpdateVideoAssetMetadataById = vi.mocked(updateVideoAssetMetadataById);

describe("storage asset patch route", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedGetIntakeDb.mockResolvedValue({} as never);
    mockedUpdateVideoAssetMetadataById.mockResolvedValue({
      _id: { toString: () => "asset-1" },
      metadata: { tags: ["raw", "has-processed-output"] },
    } as never);
  });

  it("sanitizes and forwards metadata tag updates", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/storage/assets/asset-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            tags: [" raw ", "has-processed-output", "raw", ""],
          },
        }),
      }),
      { params: Promise.resolve({ assetId: "asset-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedUpdateVideoAssetMetadataById).toHaveBeenCalledWith({
      db: {},
      assetId: "asset-1",
      patch: expect.objectContaining({
        tags: ["raw", "has-processed-output"],
      }),
    });
  });
});
