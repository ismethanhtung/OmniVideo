import { NextResponse } from "next/server";

import { checkZeroTtsEnvironment } from "@/lib/multilingual-audio/zerotts";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await checkZeroTtsEnvironment();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "ZERO_TTS_VOICES_FAILED",
        error: error instanceof Error ? error.message : "Failed to load ZeroTTS voices.",
      },
      { status: 500 },
    );
  }
}
