import { NextResponse } from "next/server";

import { getIntakeDb, listIntakeJobRuns } from "@/lib/video-intake/repository";
import { runLocalFileIntakePipeline } from "@/lib/video-intake/local-runner";
import type { LocalIntakeInput } from "@/lib/video-intake/types";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

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
    const result = await listIntakeJobRuns({
      db,
      page,
      pageSize,
      pipeline: "local",
    });

    return NextResponse.json({
      ok: true,
      data: result.items.map((run) => ({
        ...run,
        _id: run._id.toString(),
        sourceRefs: Array.isArray(run.sourceRefs)
          ? run.sourceRefs.map((sourceRef) => sourceRef.toString())
          : [],
        outputSummary: run.outputSummary
          ? {
              ...run.outputSummary,
              assetId:
                run.outputSummary.assetId &&
                typeof run.outputSummary.assetId === "object"
                  ? run.outputSummary.assetId.toString()
                  : run.outputSummary.assetId,
            }
          : run.outputSummary,
        assetSummary: run.assetSummary
          ? {
              ...run.assetSummary,
              _id: run.assetSummary._id.toString(),
              createdFrom: run.assetSummary.createdFrom
                ? {
                    ...run.assetSummary.createdFrom,
                    sourceId:
                      run.assetSummary.createdFrom.sourceId?.toString?.() ??
                      run.assetSummary.createdFrom.sourceId,
                    jobRunId:
                      run.assetSummary.createdFrom.jobRunId?.toString?.() ??
                      run.assetSummary.createdFrom.jobRunId,
                  }
                : run.assetSummary.createdFrom,
            }
          : null,
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
        errorCode: "SYS_LOCAL_VIDEO_INTAKE_HISTORY_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Local video intake history API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("videoFile");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_LOCAL_FILE_REQUIRED",
          error: "videoFile is required.",
        },
        { status: 400 },
      );
    }

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const tagsRaw = readFormValue(formData, "tags");
    const payload: LocalIntakeInput = {
      storageProvider: readFormValue(formData, "storageProvider") as
        | "telegram"
        | "drive",
      storageProviderAccountId: readFormValue(formData, "storageProviderAccountId"),
      tags: tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      title: readFormValue(formData, "title") || undefined,
      description: readFormValue(formData, "description") || undefined,
      languageHint: readFormValue(formData, "languageHint") || undefined,
      contentIntent: readFormValue(formData, "contentIntent") || "other",
      ownershipStatus: readFormValue(formData, "ownershipStatus") || "unknown",
      fileName: file.name || "upload.mp4",
      mimeType: file.type || undefined,
      fileSizeBytes: file.size,
      fileBytes,
    };

    const result = await runLocalFileIntakePipeline(payload);

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
        errorCode: "SYS_LOCAL_VIDEO_INTAKE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Local video intake API failed.",
      },
      { status: 500 },
    );
  }
}
