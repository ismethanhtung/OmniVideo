import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteFailedUrlIntakeJobRuns, getIntakeDb } from "@/lib/video-intake/repository";

import { DELETE } from "./route";

vi.mock("@/lib/video-intake/repository", () => ({
  deleteFailedUrlIntakeJobRuns: vi.fn(),
  getIntakeDb: vi.fn(),
  listIntakeJobRuns: vi.fn(),
}));
vi.mock("@/lib/video-intake/runner", () => ({
  runUrlIntakePipeline: vi.fn(),
}));

const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedDeleteFailedUrlIntakeJobRuns = vi.mocked(deleteFailedUrlIntakeJobRuns);

describe("video intake runs API", () => {
  beforeEach(() => {
    mockedGetIntakeDb.mockReset();
    mockedDeleteFailedUrlIntakeJobRuns.mockReset();
  });

  it("rejects bulk delete unless status=failed is specified", async () => {
    const response = await DELETE(
      new Request("http://localhost/api/video-intake/runs", {
        method: "DELETE",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_VIDEO_INTAKE_DELETE_STATUS_INVALID",
    });
    expect(mockedDeleteFailedUrlIntakeJobRuns).not.toHaveBeenCalled();
  });

  it("deletes failed URL intake runs and trace records", async () => {
    const db = { databaseName: "test" };
    mockedGetIntakeDb.mockResolvedValueOnce(db as never);
    mockedDeleteFailedUrlIntakeJobRuns.mockResolvedValueOnce({
      deletedRuns: 2,
      deletedStepRuns: 5,
      deletedRunEvents: 7,
    });

    const response = await DELETE(
      new Request("http://localhost/api/video-intake/runs?status=failed", {
        method: "DELETE",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      ok: true,
      data: {
        deletedRuns: 2,
        deletedStepRuns: 5,
        deletedRunEvents: 7,
      },
    });
    expect(mockedDeleteFailedUrlIntakeJobRuns).toHaveBeenCalledWith({ db });
  });
});
