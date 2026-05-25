import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { getIntakeDb, listIntakeJobRuns } from "@/lib/video-intake/repository";
import { runLocalFileIntakePipeline } from "@/lib/video-intake/local-runner";
import type { LocalIntakeInput } from "@/lib/video-intake/types";
import { getWorkspaceServerArtifact } from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readJsonObjectFormValue(formData: FormData, key: string) {
  const raw = readFormValue(formData, key);
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
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
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const formData = await request.formData();
    const file = formData.get("videoFile");
    const artifactId = readFormValue(formData, "artifactId").trim();

    if (!(file instanceof File) && !artifactId) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_LOCAL_FILE_REQUIRED",
          error: "videoFile or artifactId is required.",
        },
        { status: 400 },
      );
    }

    const artifact =
      file instanceof File ? null : getWorkspaceServerArtifact(artifactId);
    if (artifactId && (!artifact || artifact.kind !== "video")) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_WORKSPACE_ARTIFACT_NOT_FOUND",
          error: "Workspace video artifact was not found or has expired.",
        },
        { status: 404 },
      );
    }

    const sourceFile =
      file instanceof File
        ? {
            fileName: file.name || "upload.mp4",
            mimeType: file.type || undefined,
            fileSizeBytes: file.size,
            fileBytes: new Uint8Array(await file.arrayBuffer()),
          }
        : {
            fileName: artifact!.fileName,
            mimeType: artifact!.mimeType,
            fileSizeBytes: artifact!.byteLength,
            fileBytes: new Uint8Array(artifact!.bytes),
          };
    const tagsRaw = readFormValue(formData, "tags");
    const folder = readFormValue(formData, "folder");
    const payload: LocalIntakeInput = {
      storageProvider: readFormValue(formData, "storageProvider") as
        | "telegram"
        | "drive",
      storageProviderAccountId: readFormValue(formData, "storageProviderAccountId"),
      tags: tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      folder: folder || undefined,
      title: readFormValue(formData, "title") || undefined,
      description: readFormValue(formData, "description") || undefined,
      languageHint: readFormValue(formData, "languageHint") || undefined,
      contentIntent: readFormValue(formData, "contentIntent") || "other",
      ownershipStatus: readFormValue(formData, "ownershipStatus") || "unknown",
      videoEditSetup: readJsonObjectFormValue(formData, "videoEditSetupJson"),
      fileName: sourceFile.fileName,
      mimeType: sourceFile.mimeType,
      fileSizeBytes: sourceFile.fileSizeBytes,
      fileBytes: sourceFile.fileBytes,
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
