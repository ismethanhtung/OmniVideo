import type { Db } from "mongodb";

import type { AiProviderDocument } from "./types";

const USAGE_COLLECTION = "ai_provider_usage_logs";

export type AiProviderUsageLog = {
  providerId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestId?: string;
  feature: string;
  createdAt: Date;
};

export async function logAiProviderUsage(
  db: Db,
  entry: Omit<AiProviderUsageLog, "createdAt">,
) {
  await db.collection<AiProviderUsageLog>(USAGE_COLLECTION).insertOne({
    ...entry,
    createdAt: new Date(),
  });
}

export type AiProviderUsageSummary = {
  totalRequests: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
};

export async function getMonthlyUsageSummary(
  db: Db,
  providerId: string,
): Promise<AiProviderUsageSummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db
    .collection<AiProviderUsageLog>(USAGE_COLLECTION)
    .aggregate<AiProviderUsageSummary>([
      {
        $match: {
          providerId,
          createdAt: { $gte: monthStart },
        },
      },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalTokens: { $sum: "$totalTokens" },
          promptTokens: { $sum: "$promptTokens" },
          completionTokens: { $sum: "$completionTokens" },
        },
      },
    ])
    .toArray();

  return (
    rows[0] ?? {
      totalRequests: 0,
      totalTokens: 0,
      promptTokens: 0,
      completionTokens: 0,
    }
  );
}

export function checkQuotaAvailable(
  provider: Pick<AiProviderDocument, "quotaMonthlyTokens" | "usage">,
  monthlyUsage: AiProviderUsageSummary,
): { allowed: boolean; reason?: string } {
  if (
    provider.quotaMonthlyTokens !== null &&
    monthlyUsage.totalTokens >= provider.quotaMonthlyTokens
  ) {
    return {
      allowed: false,
      reason: `Monthly token quota exhausted (${monthlyUsage.totalTokens}/${provider.quotaMonthlyTokens}).`,
    };
  }

  return { allowed: true };
}
