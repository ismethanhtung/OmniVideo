export type AiProviderType =
  | "groq"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "openai-compatible";

export type AiProviderStatus = "active" | "paused" | "error";

export type AiProviderCreateInput = {
  label: string;
  providerType: AiProviderType;
  baseUrl: string;
  apiKey: string;
  description?: string;
  status?: AiProviderStatus;
  priority?: number;
  tags?: string[];
  rateLimitRpm?: number | null;
  rateLimitTpm?: number | null;
  quotaMonthlyTokens?: number | null;
};

export type ValidatedAiProviderInput = {
  label: string;
  providerType: AiProviderType;
  baseUrl: string;
  apiKey: string;
  description: string | null;
  status: AiProviderStatus;
  priority: number;
  tags: string[];
  rateLimitRpm: number | null;
  rateLimitTpm: number | null;
  quotaMonthlyTokens: number | null;
};

export type AiProviderDocument = ValidatedAiProviderInput & {
  usage: {
    totalRequests: number;
    totalTokensUsed: number;
    lastUsedAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type SanitizedAiProvider = Omit<AiProviderDocument, "apiKey"> & {
  _id: string;
  apiKeyPreview: string | null;
};

export type AiProviderModel = {
  id: string;
  name: string;
  owned_by?: string;
};

export class AiProviderError extends Error {
  readonly errorCode: string;
  readonly statusCode: number;

  constructor({
    errorCode,
    message,
    statusCode = 400,
  }: {
    errorCode: string;
    message: string;
    statusCode?: number;
  }) {
    super(message);
    this.name = "AiProviderError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}
