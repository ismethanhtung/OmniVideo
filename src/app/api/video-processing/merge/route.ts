import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { putSplitDownloadEntry } from "@/lib/video-processing/split-download-store";
import { runVideoMerge, VideoMergeError } from "@/lib/video-processing/video-merge";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimited = applyDemoRateLimit(request, "video-tools");
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const files = formData
      .getAll("videoFiles")
      .filter((entry): entry is File => entry instanceof File);

    const output = await runVideoMerge({
      files: await Promise.all(
        files.map(async (file) => ({
          fileName: file.name || "source.mp4",
          fileBytes: new Uint8Array(await file.arrayBuffer()),
        })),
      ),
    });

    const download = await putSplitDownloadEntry({
      filePath: output.outputPath,
      fileName: output.outputName,
      mimeType: "video/mp4",
    });

    return NextResponse.json({
      ok: true,
      data: {
        inputCount: output.inputCount,
        fileName: output.outputName,
        downloadId: download.id,
        downloadUrl: `/api/video-processing/split/download/${download.id}`,
      },
    });
  } catch (error) {
    if (error instanceof VideoMergeError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.code,
          error: error.message,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_VIDEO_MERGE_FAILED",
        error: error instanceof Error ? error.message : "Video merge failed.",
      },
      { status: 500 },
    );
  }
}
