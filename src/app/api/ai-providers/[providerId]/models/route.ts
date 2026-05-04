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
