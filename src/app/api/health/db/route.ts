import { NextResponse } from "next/server";

import { getAppEnv } from "@/lib/config/env";
import { getMongoDb } from "@/lib/db/mongodb";

export async function GET() {
  const startedAt = Date.now();

  try {
    const env = getAppEnv();
    const db = await getMongoDb();

    await db.command({ ping: 1 });

    return NextResponse.json(
      {
        ok: true,
        service: "mongodb",
        status: "ok",
        database: env.MONGODB_DB_NAME,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown DB error";

    return NextResponse.json(
      {
        ok: false,
        service: "mongodb",
        status: "down",
        errorCode: "DB_HEALTH_FAILED",
        error: message,
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
