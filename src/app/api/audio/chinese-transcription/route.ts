import { NextResponse } from "next/server";

import { runChineseVideoTranscription } from "@/lib/multilingual-audio/chinese-transcription";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("videoFile");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_AUDIO_FILE_REQUIRED",
          error: "videoFile is required.",
        },
        { status: 400 },
      );
    }

    const result = await runChineseVideoTranscription({
      fileName: file.name || "source.mp4",
      mimeType: file.type || undefined,
      fileSizeBytes: file.size,
      fileBytes: new Uint8Array(await file.arrayBuffer()),
      language: readFormValue(formData, "language") || "zh",
      prompt: readFormValue(formData, "prompt") || undefined,
      includeWordTimestamps:
        readFormValue(formData, "includeWordTimestamps") === "true",
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ChineseTranscriptionError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.code,
          error: error.message,
          steps: error.steps,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "PRV_GROQ_TRANSCRIPTION_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Audio transcription API failed.",
      },
      { status: 500 },
    );
  }
}
