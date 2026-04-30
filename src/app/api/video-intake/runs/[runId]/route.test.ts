import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteUrlIntakeJobRunById, getIntakeDb } from "@/lib/video-intake/repository";

import { DELETE } from "./route";

vi.mock("@/lib/video-intake/repository", () => ({
  deleteUrlIntakeJobRunById: vi.fn(),
  getIntakeDb: vi.fn(),
  getIntakeRunDetail: vi.fn(),
}));

const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedDeleteRun = vi.mocked(deleteUrlIntakeJobRunById);

describe("video intake run detail API", () => {
  beforeEach(() => {
    mockedGetIntakeDb.mockReset();
    mockedDeleteRun.mockReset();
  });

  it("deletes one URL intake run", async () => {
    mockedGetIntakeDb.mockResolvedValueOnce({} as never);
    mockedDeleteRun.mockResolvedValueOnce({
      ok: true,
      deletedRuns: 1,
      deletedStepRuns: 2,
      deletedRunEvents: 3,
    });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "680f9aa2fcbf0d9e7a6b4d01" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: { deletedRuns: 1, deletedStepRuns: 2, deletedRunEvents: 3 },
    });
  });

  it("returns 404 when run not found", async () => {
    mockedGetIntakeDb.mockResolvedValueOnce({} as never);
    mockedDeleteRun.mockResolvedValueOnce({ ok: false, reason: "not-found" });

    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ runId: "680f9aa2fcbf0d9e7a6b4d01" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.errorCode).toBe("VAL_VIDEO_INTAKE_RUN_NOT_FOUND");
  });
});
