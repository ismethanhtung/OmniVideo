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
import { translateTranscriptSegments } from "@/lib/multilingual-audio/transcript-translation";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";
import type { AudioTranscriptSegment } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rateLimited = applyDemoRateLimit(request, "transcript-translation");
    if (rateLimited) return rateLimited;

    const payload = (await request.json()) as {
      segments?: AudioTranscriptSegment[];
      sourceLanguage?: string;
      targetLanguage?: string;
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
      const { getAiProviderById, getAiProvidersDb } = await import(
        "@/lib/ai-providers/repository"
      );
      const db = await getAiProvidersDb();
      const provider = await getAiProviderById({ db, providerId });
      apiKey = provider.apiKey;
      baseUrl = provider.baseUrl;
      providerName = provider.label;
    }

    const result = await translateTranscriptSegments({
      segments: payload.segments ?? [],
      sourceLanguage: payload.sourceLanguage,
      targetLanguage: payload.targetLanguage,
      model,
      apiKey,
      baseUrl,
      providerName,
    });

    if (providerId && result.totalTokensUsed > 0) {
      try {
        const { getAiProvidersDb, incrementAiProviderUsage } = await import(
          "@/lib/ai-providers/repository"
        );
        const { logAiProviderUsage } = await import(
          "@/lib/ai-providers/usage"
        );
        const db = await getAiProvidersDb();
        await incrementAiProviderUsage({
          db,
          providerId,
          tokensUsed: result.totalTokensUsed,
        });
        await logAiProviderUsage(db, {
          providerId,
          model: result.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: result.totalTokensUsed,
          requestId: result.provider.requestId,
          feature: "transcript-translation",
        });
      } catch {
        // usage tracking is best-effort
      }
    }

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
