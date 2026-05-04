import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { testProviderConnection } from "@/lib/ai-providers/client";
import {
  getAiProviderById,
  getAiProvidersDb,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { providerId } = await context.params;
    const db = await getAiProvidersDb();
    const provider = await getAiProviderById({ db, providerId });
    const result = await testProviderConnection({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
    });

    return NextResponse.json({ ok: true, data: result });
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
        errorCode: "SYS_AI_PROVIDER_TEST_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Connection test failed.",
      },
      { status: 500 },
    );
  }
}
