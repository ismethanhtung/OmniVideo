import { NextResponse } from "next/server";

import { generateVoiceFromSegments } from "@/lib/multilingual-audio/edge-tts";
import {
  ChineseTranscriptionError,
  type VoiceGenerationSegment,
  type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      segments?: VoiceGenerationSegment[];
      settings?: Partial<VoiceGenerationSettings>;
    };

    const result = await generateVoiceFromSegments({
      segments: payload.segments ?? [],
      settings: payload.settings,
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
        errorCode: "PRV_EDGE_TTS_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Voice generation API failed.",
      },
      { status: 500 },
    );
  }
}
