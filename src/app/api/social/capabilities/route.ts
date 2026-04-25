import { NextResponse } from "next/server";

import { SOCIAL_PLATFORM_CAPABILITIES } from "@/lib/social/capabilities";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: SOCIAL_PLATFORM_CAPABILITIES,
  });
}
