import { NextResponse } from "next/server";

import { getIntakeDb, getIntakeRunDetail } from "@/lib/video-intake/repository";

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
