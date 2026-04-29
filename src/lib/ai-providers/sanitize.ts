import type { WithId } from "mongodb";

import type { AiProviderDocument, SanitizedAiProvider } from "./types";

function previewApiKey(value: string | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "configured";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function sanitizeAiProviderDocument(
  document: WithId<AiProviderDocument>,
): SanitizedAiProvider {
  const { apiKey, _id, ...rest } = document;

  return {
    ...rest,
    _id: _id.toHexString(),
    apiKeyPreview: previewApiKey(apiKey),
  };
}
