import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { fetchProviderModels } from "@/lib/ai-providers/client";
import {
  getAiProviderById,
  getAiProvidersDb,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { providerId } = await context.params;
    if (providerId === "env-gemini") {
      const apiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || "";
      if (!apiKey) {
        return NextResponse.json({ ok: true, data: [] });
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch Gemini models from Google AI Studio: HTTP ${response.status}`);
      }
      const payload = (await response.json()) as {
        models?: Array<{
          name?: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
        }>;
      };
      const models = (payload.models || [])
        .filter((m) => typeof m.name === "string" && m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => {
          const id = m.name!.replace(/^models\//u, "");
          return {
            id,
            name: m.displayName || id,
          };
        });
      return NextResponse.json({ ok: true, data: models });
    }

    const db = await getAiProvidersDb();
    const provider = await getAiProviderById({ db, providerId });
    const models = await fetchProviderModels({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
    });

    return NextResponse.json({ ok: true, data: models });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        { ok: false, errorCode: error.errorCode, error: error.message },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_AI_PROVIDER_MODELS_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch provider models.",
      },
      { status: 500 },
    );
  }
}
