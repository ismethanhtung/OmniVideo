import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { generateZeroTtsSpeech, ZeroTtsError } from "@/lib/multilingual-audio/zerotts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimited = applyDemoRateLimit(request, "zerotts");
    if (rateLimited) return rateLimited;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const text = (formData.get("text") as string) || "";
      const voice = (formData.get("voice") as string) || "maichi";
      const modelId = (formData.get("modelId") as string) || "zeroweight-ai/ZeroTTS";
      const speedRaw = formData.get("speed") as string;
      const speed = speedRaw ? Number(speedRaw) : 1.0;
      const normalizeVi = formData.get("normalizeVi") !== "false";
      const temperatureRaw = formData.get("temperature") as string;
      const temperature = temperatureRaw ? Number(temperatureRaw) : undefined;
      const topPRaw = formData.get("topP") as string;
      const topP = topPRaw ? Number(topPRaw) : undefined;
      const sentenceSilenceRaw = formData.get("sentenceSilence") as string;
      const sentenceSilence = sentenceSilenceRaw ? Number(sentenceSilenceRaw) : undefined;

      const seedRaw = formData.get("seed") as string;
      const seed = seedRaw !== null && seedRaw !== "" ? Number(seedRaw) : undefined;
      const cfgScaleRaw = formData.get("cfgScale") as string;
      const cfgScale = cfgScaleRaw ? Number(cfgScaleRaw) : undefined;
      const audioRepetitionPenaltyRaw = formData.get("audioRepetitionPenalty") as string;
      const audioRepetitionPenalty = audioRepetitionPenaltyRaw ? Number(audioRepetitionPenaltyRaw) : undefined;

      const voiceFile = formData.get("voiceFile") as File | null;
      let customVoiceBuffer: Buffer | undefined;
      let customVoiceFilename: string | undefined;

      if (voiceFile && voiceFile.size > 0) {
        const arrayBuffer = await voiceFile.arrayBuffer();
        customVoiceBuffer = Buffer.from(arrayBuffer);
        customVoiceFilename = voiceFile.name;
      }

      const result = await generateZeroTtsSpeech({
        text,
        voice,
        customVoiceBuffer,
        customVoiceFilename,
        modelId,
        speed,
        normalizeVi,
        temperature,
        topP,
        cfgScale,
        audioRepetitionPenalty,
        seed,
        sentenceSilence,
      });

      return NextResponse.json({ ok: true, data: result });
    }

    // JSON payload
    const payload = await request.json();
    const result = await generateZeroTtsSpeech({
      text: payload.text ?? "",
      voice: payload.voice ?? "maichi",
      customVoicePath: payload.customVoicePath,
      modelId: payload.modelId,
      speed: payload.speed !== undefined ? Number(payload.speed) : 1.0,
      normalizeVi: payload.normalizeVi !== false,
      temperature: payload.temperature !== undefined ? Number(payload.temperature) : undefined,
      topP: payload.topP !== undefined ? Number(payload.topP) : undefined,
      cfgScale: payload.cfgScale !== undefined ? Number(payload.cfgScale) : undefined,
      audioRepetitionPenalty:
        payload.audioRepetitionPenalty !== undefined
          ? Number(payload.audioRepetitionPenalty)
          : undefined,
      seed: payload.seed !== undefined ? Number(payload.seed) : undefined,
      sentenceSilence:
        payload.sentenceSilence !== undefined ? Number(payload.sentenceSilence) : undefined,
    });

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ZeroTtsError) {
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
        errorCode: "ZERO_TTS_API_FAILED",
        error: error instanceof Error ? error.message : "ZeroTTS speech generation failed.",
      },
      { status: 500 },
    );
  }
}
