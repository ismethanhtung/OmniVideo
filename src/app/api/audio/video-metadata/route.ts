import { NextResponse } from "next/server";

import {
  applyDemoRateLimit,
  requireOwnerForProviderAccount,
} from "@/lib/access-control/route-guards";
import {
  GOOGLE_AI_STUDIO_OPENAI_BASE_URL,
  DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID,
  isGoogleAiStudioProviderId,
  normalizeGeminiModelName,
  readGoogleAiStudioApiKey,
} from "@/lib/ai-providers/default-provider";
import { generateVietnameseVideoMetadata } from "@/lib/multilingual-audio/video-metadata";
import { ChineseTranscriptionError, type TranscriptTranslationSegment } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimited = applyDemoRateLimit(request, "video-metadata");
    if (rateLimited) return rateLimited;

    const payload = (await request.json()) as {
      translatedSegments?: TranscriptTranslationSegment[];
      sourceTitle?: string;
      sourceDescription?: string;
      model?: string;
      providerId?: string;
    };

    let apiKey: string | undefined;
    let baseUrl: string | undefined;
    let providerName: string | undefined;
    const providerId =
      payload.providerId?.trim() || DEFAULT_GOOGLE_AI_STUDIO_PROVIDER_ID;
    const providerAccessDenied = requireOwnerForProviderAccount(
      request,
      isGoogleAiStudioProviderId(providerId) ? undefined : providerId,
    );
    if (providerAccessDenied) return providerAccessDenied;

    let model = payload.model;
    if (isGoogleAiStudioProviderId(providerId)) {
      apiKey = readGoogleAiStudioApiKey();
      baseUrl = GOOGLE_AI_STUDIO_OPENAI_BASE_URL;
      providerName = "Google AI Studio";
      model = model ? normalizeGeminiModelName(model) : model;
    } else if (providerId) {
      const { getAiProviderById, getAiProvidersDb } = await import("@/lib/ai-providers/repository");
      const db = await getAiProvidersDb();
      const provider = await getAiProviderById({ db, providerId });
      apiKey = provider.apiKey;
      baseUrl = provider.baseUrl;
      providerName = provider.label;
    }

    const data = await generateVietnameseVideoMetadata({
      translatedSegments: payload.translatedSegments ?? [],
      sourceTitle: payload.sourceTitle,
      sourceDescription: payload.sourceDescription,
      model,
      apiKey,
      baseUrl,
      providerName,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    if (error instanceof ChineseTranscriptionError) {
      return NextResponse.json({ ok: false, errorCode: error.code, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      {
        ok: false,
        errorCode: "PRV_GROQ_TRANSLATION_FAILED",
        error: error instanceof Error ? error.message : "Video metadata API failed.",
      },
      { status: 500 },
    );
  }
}
