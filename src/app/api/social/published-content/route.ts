import { NextResponse } from "next/server";

import { listSocialPublishedContentInventory } from "@/lib/social/inventory";
import { getSocialDb } from "@/lib/social/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getSocialDb();
    const data = await listSocialPublishedContentInventory(db);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_SOCIAL_PUBLISHED_CONTENT_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Social published content API failed.",
      },
      { status: 500 },
    );
  }
}
