import { NextResponse } from "next/server";

import { getIntakeDb, listVideoAssets } from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 25);
    const db = await getIntakeDb();
    const assets = await listVideoAssets(db, Number.isFinite(limit) ? limit : 25);

    return NextResponse.json({
      ok: true,
      data: assets.map((asset) => ({
        ...asset,
        _id: asset._id.toString(),
        createdFrom: {
          ...(asset.createdFrom as Record<string, unknown> | undefined),
          sourceId: asset.createdFrom?.sourceId?.toString?.(),
          jobRunId: asset.createdFrom?.jobRunId?.toString?.(),
        },
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_ASSETS_API_FAILED",
        error: error instanceof Error ? error.message : "Storage assets API failed.",
      },
      { status: 500 },
    );
  }
}
