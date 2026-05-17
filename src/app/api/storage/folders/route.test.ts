import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getIntakeDb,
  listKnownVideoFolders,
} from "@/lib/video-intake/repository";

import { GET } from "./route";

vi.mock("@/lib/video-intake/repository", () => ({
  getIntakeDb: vi.fn(),
  listKnownVideoFolders: vi.fn(),
}));

const mockedGetDb = vi.mocked(getIntakeDb);
const mockedListFolders = vi.mocked(listKnownVideoFolders);

describe("storage folders API", () => {
  beforeEach(() => {
    mockedGetDb.mockReset();
    mockedListFolders.mockReset();
  });

  it("returns known folders", async () => {
    mockedGetDb.mockResolvedValueOnce({} as never);
    mockedListFolders.mockResolvedValueOnce(["du lịch", "kiến thức"]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: ["du lịch", "kiến thức"],
    });
  });
});
