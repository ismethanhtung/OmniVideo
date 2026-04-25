import { NextResponse } from "next/server";

import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const url = new URL(request.url);
    const dispositionParam = url.searchParams.get("disposition")?.toLowerCase();
    const disposition = dispositionParam === "inline" ? "inline" : "attachment";
    const rangeHeader = request.headers.get("range");
    const db = await getIntakeDb();
    const asset = await getVideoAssetById({ db, assetId });

    if (!asset) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_ASSET_NOT_FOUND",
          error: "Storage asset was not found.",
        },
        { status: 404 },
      );
    }

    const download = await resolveAssetDownload({
      db,
      asset,
      disposition,
      rangeHeader,
    });

    if (!download.ok) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: download.errorCode,
          error: download.error,
        },
        { status: download.status },
      );
    }

    return new Response(download.body, {
      status: download.status,
      headers: download.headers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_ASSET_DOWNLOAD_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage asset download failed.",
      },
      { status: 500 },
    );
  }
}
