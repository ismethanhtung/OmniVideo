import { NextResponse } from "next/server";

import { getSocialDashboard, getSocialDb } from "@/lib/social/repository";

export const runtime = "nodejs";

function serialize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === "object") {
    if ("toHexString" in value && typeof value.toHexString === "function") {
      return value.toHexString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, serialize(entry)]),
    );
  }

  return value;
}

export async function GET() {
  try {
    const db = await getSocialDb();
    const dashboard = await getSocialDashboard(db);

    return NextResponse.json({
      ok: true,
      data: serialize(dashboard),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_SOCIAL_DASHBOARD_API_FAILED",
        error:
          error instanceof Error ? error.message : "Social dashboard API failed.",
      },
      { status: 500 },
    );
  }
}
