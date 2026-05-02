import { NextResponse } from "next/server";

import { chatCompletion } from "@/lib/ai-providers/client";
import {
  extractAssistantCompletionText,
  parseChatCompletionTestBody,
} from "@/lib/ai-providers/chat-test-validation";
import {
  getAiProviderById,
  getAiProvidersDb,
} from "@/lib/ai-providers/repository";
import { AiProviderError } from "@/lib/ai-providers/types";

export const runtime = "nodejs";

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/u, "");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const { providerId } = await context.params;
    const json = (await request.json().catch(() => null)) as unknown;
    const { model, messages, temperature } = parseChatCompletionTestBody(json);

    const db = await getAiProvidersDb();
    const provider = await getAiProviderById({ db, providerId });

    const start = Date.now();
    const response = await chatCompletion(
      {
        baseUrl: normalizeBaseUrl(provider.baseUrl),
        apiKey: provider.apiKey,
      },
      {
        model,
        messages,
        temperature,
      },
    );

    const latencyMs = Date.now() - start;
    const assistantMessage = extractAssistantCompletionText(response);

    const choice = response.choices?.[0];

    return NextResponse.json({
      ok: true,
      data: {
        id: response.id,
        assistantMessage,
        finishReason:
          typeof choice?.finish_reason === "string"
            ? choice.finish_reason
            : undefined,
        usage: response.usage ?? null,
        latencyMs,
      },
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
        errorCode: "SYS_AI_PROVIDER_CHAT_TEST_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Chat completion test failed.",
      },
      { status: 500 },
    );
  }
}
