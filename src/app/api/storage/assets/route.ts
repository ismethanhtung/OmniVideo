import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  createManualVideoAsset,
  getIntakeDb,
  listVideoAssets,
} from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 25,
    );
    const db = await getIntakeDb();
    const result = await listVideoAssets(db, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 25,
    });

    return NextResponse.json({
      ok: true,
      data: result.data.map((asset) => ({
        ...asset,
        _id: asset._id.toString(),
        createdFrom: {
          ...(asset.createdFrom as Record<string, unknown> | undefined),
          sourceId: asset.createdFrom?.sourceId?.toString?.(),
          jobRunId: asset.createdFrom?.jobRunId?.toString?.(),
        },
      })),
      pagination: result.pagination,
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

export async function POST(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const payload = (await request.json()) as Record<string, unknown>;
    const title =
      typeof payload.title === "string" ? payload.title.trim() : "";
    const storageProvider =
      typeof payload.storageProvider === "string"
        ? payload.storageProvider.trim()
        : "";

    if (!title) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_ASSET_TITLE_REQUIRED",
          error: "title is required.",
        },
        { status: 400 },
      );
    }

    if (storageProvider !== "telegram" && storageProvider !== "drive") {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_ASSET_PROVIDER_INVALID",
          error: "storageProvider must be telegram or drive.",
        },
        { status: 400 },
      );
    }

    const db = await getIntakeDb();
    const asset = await createManualVideoAsset({
      db,
      input: {
        title,
        sourceUrl:
          typeof payload.sourceUrl === "string" ? payload.sourceUrl : undefined,
        storageProvider,
        providerAssetId:
          typeof payload.providerAssetId === "string"
            ? payload.providerAssetId
            : undefined,
        publicUrl:
          typeof payload.publicUrl === "string" ? payload.publicUrl : undefined,
        mimeType:
          typeof payload.mimeType === "string" ? payload.mimeType : undefined,
        sizeBytes:
          typeof payload.sizeBytes === "number" ? payload.sizeBytes : undefined,
        durationMs:
          typeof payload.durationMs === "number" ? payload.durationMs : undefined,
        storageProviderLabel:
          typeof payload.storageProviderLabel === "string"
            ? payload.storageProviderLabel
            : undefined,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...asset,
          _id: asset._id.toString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_ASSETS_CREATE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage assets create API failed.",
      },
      { status: 500 },
    );
  }
}
