import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  deleteAiProvider,
  getAiProviderById,
  getAiProvidersDb,
  updateAiProvider,
} from "@/lib/ai-providers/repository";
import { sanitizeAiProviderDocument } from "@/lib/ai-providers/sanitize";
import { AiProviderError } from "@/lib/ai-providers/types";
import { validateAiProviderUpdateInput } from "@/lib/ai-providers/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const { providerId } = await context.params;
    const db = await getAiProvidersDb();
    const provider = await getAiProviderById({ db, providerId });

    return NextResponse.json({
      ok: true,
      data: sanitizeAiProviderDocument(provider),
    });
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
        errorCode: "SYS_AI_PROVIDER_GET_FAILED",
        error:
          error instanceof Error ? error.message : "AI provider get failed.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const payload = await request.json();
    const patch = validateAiProviderUpdateInput(payload);
    const { providerId } = await context.params;
    const db = await getAiProvidersDb();
    const provider = await updateAiProvider({ db, providerId, patch });

    return NextResponse.json({ ok: true, data: provider });
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
        errorCode: "SYS_AI_PROVIDER_UPDATE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "AI provider update failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { providerId } = await context.params;
    const db = await getAiProvidersDb();
    const deleted = await deleteAiProvider({ db, providerId });

    return NextResponse.json({ ok: true, data: deleted });
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
        errorCode: "SYS_AI_PROVIDER_DELETE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "AI provider delete failed.",
      },
      { status: 500 },
    );
  }
}
