import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  deleteRemoteAssetIfNeeded,
  type DeletableStoredAsset,
} from "@/lib/storage/asset-delete";
import { buildFolderAssetTags, normalizeAssetFolderName } from "@/lib/storage/asset-folder";
import {
  deleteThumbnailAssetById,
  getThumbnailAssetById,
  updateThumbnailAssetMetadataById,
} from "@/lib/thumbnails/repository";
import { getStorageProvidersDb } from "@/lib/storage-providers/repository";

export const runtime = "nodejs";

function normalizeTags(input: unknown) {
  if (!Array.isArray(input)) return undefined;
  return Array.from(
    new Set(
      input
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ).slice(0, 40);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { assetId } = await params;
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

    await deleteRemoteAssetIfNeeded({
      db,
      asset: asset as DeletableStoredAsset,
    });

    const deleted = await deleteThumbnailAssetById({ db, assetId });

    if (!deleted) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_THUMBNAIL_ASSET_NOT_FOUND",
          error: "Thumbnail asset was not found.",
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
        errorCode: "SYS_THUMBNAIL_ASSET_DELETE_FAILED",
        error:
          error instanceof Error ? error.message : "Thumbnail asset delete failed.",
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
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { assetId } = await params;
    const payload = (await request.json()) as {
      metadata?: {
        title?: string | null;
        description?: string | null;
        folder?: string | null;
        tags?: string[] | null;
        lifecycle?: "raw" | "processed";
      };
    };

    const metadata = payload.metadata ?? {};
    const folder =
      metadata.folder === null
        ? null
        : normalizeAssetFolderName(metadata.folder);
    const tags = normalizeTags(metadata.tags);
    const lifecycle =
      metadata.lifecycle === "processed" ? "processed" : metadata.lifecycle === "raw" ? "raw" : undefined;

    const nextTags =
      folder && lifecycle
        ? buildFolderAssetTags({
            folder,
            lifecycle,
            extraTags: tags ?? [],
          })
        : tags;

    const db = await getStorageProvidersDb();
    const updated = await updateThumbnailAssetMetadataById({
      db,
      assetId,
      patch: {
        title:
          typeof metadata.title === "string"
            ? metadata.title.trim() || null
            : metadata.title,
        description:
          typeof metadata.description === "string"
            ? metadata.description.trim() || null
            : metadata.description,
        folder,
        tags: nextTags,
      },
    });

    if (!updated) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_THUMBNAIL_ASSET_NOT_FOUND",
          error: "Thumbnail asset was not found.",
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
        errorCode: "SYS_THUMBNAIL_ASSET_PATCH_FAILED",
        error:
          error instanceof Error ? error.message : "Thumbnail asset patch failed.",
      },
      { status: 500 },
    );
  }
}
