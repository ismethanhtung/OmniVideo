import { NextResponse } from "next/server";

import {
  createAiProvider,
  getAiProvidersDb,
  listAiProviders,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";
import { validateAiProviderCreateInput } from "@/lib/ai-providers/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getAiProvidersDb();
    const providers = await listAiProviders(db);

    return NextResponse.json({ ok: true, data: providers });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_AI_PROVIDERS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "AI providers API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validateAiProviderCreateInput(payload);
    const db = await getAiProvidersDb();
    const provider = await createAiProvider({ db, input });

    return NextResponse.json({ ok: true, data: provider }, { status: 201 });
  } catch (error) {
    if (error instanceof AiProviderError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.errorCode,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_AI_PROVIDERS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "AI providers API failed.",
      },
      { status: 500 },
    );
  }
}
