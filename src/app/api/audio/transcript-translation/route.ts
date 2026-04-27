import { NextResponse } from "next/server";

import { translateTranscriptSegments } from "@/lib/multilingual-audio/transcript-translation";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";
import type { AudioTranscriptSegment } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      segments?: AudioTranscriptSegment[];
      sourceLanguage?: string;
      targetLanguage?: string;
      model?: string;
    };

    const result = await translateTranscriptSegments({
      segments: payload.segments ?? [],
      sourceLanguage: payload.sourceLanguage,
      targetLanguage: payload.targetLanguage,
      model: payload.model,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ChineseTranscriptionError) {
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
        errorCode: "PRV_GROQ_TRANSLATION_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Transcript translation API failed.",
      },
      { status: 500 },
    );
  }
}
