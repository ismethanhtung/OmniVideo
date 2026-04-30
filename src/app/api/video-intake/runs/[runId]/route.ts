import { NextResponse } from "next/server";

import {
  deleteUrlIntakeJobRunById,
  getIntakeDb,
  getIntakeRunDetail,
} from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const db = await getIntakeDb();
    const detail = await getIntakeRunDetail({ db, runId });

    if (!detail) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_VIDEO_INTAKE_RUN_NOT_FOUND",
          error: "Video intake run was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        run: {
          ...detail.run,
          _id: detail.run._id.toString(),
          sourceRefs: Array.isArray(detail.run.sourceRefs)
            ? detail.run.sourceRefs.map((sourceRef: { toString(): string }) =>
                sourceRef.toString(),
              )
            : [],
        },
        stepRuns: detail.stepRuns.map((stepRun) => ({
          ...stepRun,
          _id: stepRun._id.toString(),
          jobRunId: stepRun.jobRunId.toString(),
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_VIDEO_INTAKE_RUN_DETAIL_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Video intake run detail API failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params;
    const db = await getIntakeDb();
    const deleted = await deleteUrlIntakeJobRunById({ db, runId });

    if (!deleted.ok) {
      return NextResponse.json(
        {
          ok: false,
          errorCode:
            deleted.reason === "invalid-id"
              ? "VAL_VIDEO_INTAKE_RUN_ID_INVALID"
              : "VAL_VIDEO_INTAKE_RUN_NOT_FOUND",
          error:
            deleted.reason === "invalid-id"
              ? "Video intake run id is invalid."
              : "URL intake run was not found.",
        },
        { status: deleted.reason === "invalid-id" ? 400 : 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        deletedRuns: deleted.deletedRuns,
        deletedStepRuns: deleted.deletedStepRuns,
        deletedRunEvents: deleted.deletedRunEvents,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_VIDEO_INTAKE_RUN_DELETE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Video intake run delete failed.",
      },
      { status: 500 },
    );
  }
}
