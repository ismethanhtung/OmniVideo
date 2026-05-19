import { NextResponse } from "next/server";

import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getStorageProvidersDb } from "@/lib/storage-providers/repository";
import { getThumbnailAssetById } from "@/lib/thumbnails/repository";

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

    const db = await getStorageProvidersDb();
    const asset = await getThumbnailAssetById({ db, assetId });

    if (!asset) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_THUMBNAIL_ASSET_NOT_FOUND",
          error: "Thumbnail asset was not found.",
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
        errorCode: "SYS_THUMBNAIL_ASSET_DOWNLOAD_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Thumbnail asset download failed.",
      },
      { status: 500 },
    );
  }
}
