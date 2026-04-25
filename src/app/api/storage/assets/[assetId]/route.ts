import { NextResponse } from "next/server";

import { deleteVideoAssetById, getIntakeDb } from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const db = await getIntakeDb();
    const deleted = await deleteVideoAssetById({ db, assetId });

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_ASSET_NOT_FOUND",
          error: "Storage asset was not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...deleted,
        _id: deleted._id.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_ASSET_DELETE_FAILED",
        error:
          error instanceof Error ? error.message : "Storage asset delete failed.",
      },
      { status: 500 },
    );
  }
}
