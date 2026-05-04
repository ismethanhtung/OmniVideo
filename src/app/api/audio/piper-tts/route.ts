import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { generatePiperSpeech } from "@/lib/multilingual-audio/piper-tts";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimited = applyDemoRateLimit(request, "piper-tts");
    if (rateLimited) return rateLimited;

    const payload = await request.json();
    const result = await generatePiperSpeech({
      text: payload.text ?? "",
      binaryPath: payload.binaryPath ?? "",
      modelPath: payload.modelPath ?? "",
      configPath: payload.configPath,
      speaker:
        payload.speaker === "" || payload.speaker === null
          ? undefined
          : Number(payload.speaker),
      lengthScale:
        payload.lengthScale === "" || payload.lengthScale === null
          ? undefined
          : Number(payload.lengthScale),
      noiseScale:
        payload.noiseScale === "" || payload.noiseScale === null
          ? undefined
          : Number(payload.noiseScale),
      noiseW:
        payload.noiseW === "" || payload.noiseW === null
          ? undefined
          : Number(payload.noiseW),
      sentenceSilence:
        payload.sentenceSilence === "" || payload.sentenceSilence === null
          ? undefined
          : Number(payload.sentenceSilence),
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
        errorCode: "PRV_PIPER_TTS_FAILED",
        error:
          error instanceof Error ? error.message : "Piper TTS API failed.",
      },
      { status: 500 },
    );
  }
}
