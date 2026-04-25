import { NextResponse } from "next/server";

import { getIntakeDb, listIntakeJobRuns } from "@/lib/video-intake/repository";
import { runUrlIntakePipeline } from "@/lib/video-intake/runner";
import type { IntakeInput } from "@/lib/video-intake/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const pageRaw = Number(url.searchParams.get("page") ?? 1);
    const pageSizeRaw = Number(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 20,
    );
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(100, Math.max(1, Math.floor(pageSizeRaw)))
      : 20;
    const db = await getIntakeDb();
    const result = await listIntakeJobRuns({ db, page, pageSize });

    return NextResponse.json({
      ok: true,
      data: result.items.map((run) => ({
        ...run,
        _id: run._id.toString(),
        sourceRefs: Array.isArray(run.sourceRefs)
          ? run.sourceRefs.map((sourceRef) => sourceRef.toString())
          : [],
      })),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_VIDEO_INTAKE_HISTORY_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Video intake history API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as IntakeInput;
    const result = await runUrlIntakePipeline(payload);

    if (result.status === "failed") {
      return NextResponse.json(
        {
          ok: false,
          data: result,
          errorCode: result.errorCode,
          error: result.errorMessage,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_VIDEO_INTAKE_API_FAILED",
        error: error instanceof Error ? error.message : "Video intake API failed.",
      },
      { status: 500 },
    );
  }
}
