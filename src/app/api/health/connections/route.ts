import { NextResponse } from "next/server";

import { getAppEnv } from "@/lib/config/env";
import { checkStorageProviderConnections } from "@/lib/connections/storage-checks";
import { getMongoDb } from "@/lib/db/mongodb";
import { checkSocialAccountConnections } from "@/lib/social/connection-checks";
import { listSocialAccountsForConnectionChecks } from "@/lib/social/repository";
import { listStorageProviderAccountsForConnectionChecks } from "@/lib/storage-providers/repository";

export const runtime = "nodejs";

type ServiceCheck = {
  serviceType: "mongodb" | "storage" | "social";
  serviceKey: string;
  label: string;
  status: "ok" | "down" | "skipped";
  message: string;
  latencyMs: number;
  checkedAt: string;
  providerId?: string;
  providerType?: "telegram" | "drive";
  accountId?: string;
  platform?: "facebook" | "tiktok" | "shopee" | "youtube";
};

export async function GET() {
  const now = new Date().toISOString();
  const checks: ServiceCheck[] = [];
  const mongoStartedAt = Date.now();
  let dbAvailable = false;

  try {
    const db = await getMongoDb();
    const env = getAppEnv();
    await db.command({ ping: 1 });
    dbAvailable = true;

    checks.push({
      serviceType: "mongodb",
      serviceKey: "mongodb",
      label: `MongoDB (${env.MONGODB_DB_NAME})`,
      status: "ok",
      message: "MongoDB connection is healthy.",
      latencyMs: Date.now() - mongoStartedAt,
      checkedAt: now,
    });

    const [storageAccounts, socialAccounts] = await Promise.all([
      listStorageProviderAccountsForConnectionChecks(db),
      listSocialAccountsForConnectionChecks(db),
    ]);

    if (storageAccounts.length === 0) {
      checks.push({
        serviceType: "storage",
        serviceKey: "storage:none",
        label: "Storage accounts",
        status: "skipped",
        message: "No Telegram/Drive storage account configured.",
        latencyMs: 0,
        checkedAt: now,
      });
    } else {
      const storageChecks = await checkStorageProviderConnections(storageAccounts);

      checks.push(
        ...storageChecks.map((check) => ({
          serviceType: "storage" as const,
          serviceKey: check.serviceKey,
          label: check.label,
          status: check.status,
          message: check.message,
          latencyMs: check.latencyMs,
          checkedAt: check.checkedAt,
          providerId: check.providerId,
          providerType: check.providerType,
        })),
      );
    }

    if (socialAccounts.length === 0) {
      checks.push({
        serviceType: "social",
        serviceKey: "social:none",
        label: "Social accounts",
        status: "skipped",
        message: "No Facebook/TikTok/Shopee/YouTube social account configured.",
        latencyMs: 0,
        checkedAt: now,
      });
    } else {
      const socialChecks = await checkSocialAccountConnections(socialAccounts);

      checks.push(...socialChecks);
    }
  } catch (error) {
    checks.push({
      serviceType: "mongodb",
      serviceKey: "mongodb",
      label: "MongoDB",
      status: "down",
      message:
        error instanceof Error ? error.message : "MongoDB connection failed.",
      latencyMs: Date.now() - mongoStartedAt,
      checkedAt: now,
    });
  }

  if (!dbAvailable) {
    checks.push({
      serviceType: "storage",
      serviceKey: "storage:skipped-db-down",
      label: "Storage accounts",
      status: "skipped",
      message: "Skipped because MongoDB is down.",
      latencyMs: 0,
      checkedAt: now,
    });
    checks.push({
      serviceType: "social",
      serviceKey: "social:skipped-db-down",
      label: "Social accounts",
      status: "skipped",
      message: "Skipped because MongoDB is down.",
      latencyMs: 0,
      checkedAt: now,
    });
  }

  const okCount = checks.filter((check) => check.status === "ok").length;
  const downCount = checks.filter((check) => check.status === "down").length;
  const skippedCount = checks.filter((check) => check.status === "skipped").length;

  return NextResponse.json(
    {
      ok: downCount === 0,
      checks,
      summary: {
        total: checks.length,
        okCount,
        downCount,
        skippedCount,
      },
      timestamp: now,
    },
    { status: downCount === 0 ? 200 : 503 },
  );
}
