import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import { sanitizeAiProviderDocument } from "./sanitize";
import type { AiProviderDocument } from "./types";

describe("sanitizeAiProviderDocument", () => {
  const baseDocument = {
    _id: new ObjectId(),
    label: "Test Provider",
    providerType: "groq" as const,
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "sk-abcdefghijklmnopqrstuvwxyz123456",
    status: "active" as const,
    description: null,
    priority: 50,
    tags: [],
    rateLimitRpm: null,
    rateLimitTpm: null,
    quotaMonthlyTokens: null,
    usage: {
      totalRequests: 0,
      totalTokensUsed: 0,
      lastUsedAt: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  } satisfies AiProviderDocument & { _id: ObjectId };

  it("masks apiKey and converts _id to hex string", () => {
    const result = sanitizeAiProviderDocument(baseDocument);

    expect(result._id).toBe(baseDocument._id.toHexString());
    expect(result.apiKeyPreview).toBe("sk-a...3456");
    expect(result).not.toHaveProperty("apiKey");
    expect(result.label).toBe("Test Provider");
  });

  it("returns 'configured' for short API keys", () => {
    const doc = { ...baseDocument, apiKey: "short" };
    const result = sanitizeAiProviderDocument(doc);
    expect(result.apiKeyPreview).toBe("configured");
  });

  it("returns null for empty API key", () => {
    const doc = { ...baseDocument, apiKey: "" };
    const result = sanitizeAiProviderDocument(doc);
    expect(result.apiKeyPreview).toBeNull();
  });
});
