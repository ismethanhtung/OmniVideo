import { NextResponse } from "next/server";

import { listLocalPiperModels } from "@/lib/multilingual-audio/piper-model-catalog";

export const runtime = "nodejs";

export async function GET() {
    const models = await listLocalPiperModels();
    return NextResponse.json({ ok: true, data: models });
}
