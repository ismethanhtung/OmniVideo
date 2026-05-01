import { NextResponse } from "next/server";

import {
  deleteVideoAssetById,
  getIntakeDb,
  updateVideoAssetMetadataById,
} from "@/lib/video-intake/repository";

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const payload = (await request.json()) as {
      metadata?: {
        title?: string | null;
        description?: string | null;
        vietnameseTitle?: string | null;
        vietnameseDescription?: string | null;
        vietnameseHashtags?: string[] | null;
      };
    };
    const metadata = payload.metadata ?? {};
    const db = await getIntakeDb();
    const updated = await updateVideoAssetMetadataById({
      db,
      assetId,
      patch: {
        title:
          typeof metadata.title === "string" ? metadata.title.trim() || null : undefined,
        description:
          typeof metadata.description === "string"
            ? metadata.description.trim() || null
            : undefined,
        vietnameseTitle:
          typeof metadata.vietnameseTitle === "string"
            ? metadata.vietnameseTitle.trim() || null
            : undefined,
        vietnameseDescription:
          typeof metadata.vietnameseDescription === "string"
            ? metadata.vietnameseDescription.trim() || null
            : undefined,
        vietnameseHashtags: Array.isArray(metadata.vietnameseHashtags)
          ? metadata.vietnameseHashtags
              .filter((entry): entry is string => typeof entry === "string")
              .map((entry) => entry.replace(/^#+/, "").trim())
              .filter(Boolean)
              .slice(0, 30)
          : undefined,
      },
    });

    if (!updated) {
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
        ...updated,
        _id: updated._id.toString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_ASSET_PATCH_FAILED",
        error:
          error instanceof Error ? error.message : "Storage asset update failed.",
      },
      { status: 500 },
    );
  }
}
