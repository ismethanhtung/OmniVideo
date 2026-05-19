import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  deleteRemoteAssetIfNeeded,
  type DeletableStoredAsset,
} from "@/lib/storage/asset-delete";
import { getStorageProvidersDb, getActiveStorageProviderAccountForUpload } from "@/lib/storage-providers/repository";
import {
  createThumbnailAsset,
  deleteThumbnailAssetById,
  getThumbnailAssetById,
  listThumbnailAssets,
  markThumbnailHasProcessedOutput,
  type ThumbnailLifecycle,
} from "@/lib/thumbnails/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function buildFilename(baseName: string, mimeType: string) {
  const normalizedBase =
    baseName
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]/g, "")
      .slice(0, 80) || "thumbnail";
  const extension = mimeType === "image/jpeg"
    ? "jpg"
    : mimeType === "image/webp"
      ? "webp"
      : "png";
  return `${normalizedBase}.${extension}`;
}

function parseTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 40);
}

function inferTitleFromUrl(value: string) {
  try {
    const url = new URL(value);
    const segment = url.pathname.split("/").pop();
    if (!segment) return "Imported thumbnail";
    return decodeURIComponent(segment).replace(/\.[a-z0-9]+$/i, "") || "Imported thumbnail";
  } catch {
    return "Imported thumbnail";
  }
}

async function resolveUploadFile(formData: FormData) {
  const file = formData.get("thumbnailFile");
  if (file instanceof File) {
    const mimeType = (file.type || "image/png").toLowerCase();
    if (!mimeType.startsWith("image/")) {
      throw new Error("Imported file must be an image.");
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    return {
      bytes,
      sizeBytes: file.size,
      mimeType,
      originalName: file.name || "thumbnail.png",
      sourceUrl: "",
      inferredTitle: file.name.replace(/\.[a-z0-9]+$/i, ""),
    };
  }

  const sourceUrl = readFormValue(formData, "sourceUrl").trim();
  if (!sourceUrl) {
    throw new Error("thumbnailFile or sourceUrl is required.");
  }

  const response = await fetch(sourceUrl, {
    method: "GET",
    headers: {
      "user-agent": "OmniVideo Thumbnail Studio",
    },
  });

  if (!response.ok) {
    throw new Error(`Could not download source image. Status ${response.status}.`);
  }

  const mimeType = (response.headers.get("content-type") || "image/png")
    .split(";")[0]
    .trim()
    .toLowerCase();

  if (!mimeType.startsWith("image/")) {
    throw new Error("Source URL is not an image content type.");
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const sizeBytes = Number(response.headers.get("content-length") || bytes.byteLength);

  if (sizeBytes <= 0) {
    throw new Error("Source image is empty.");
  }

  if (sizeBytes > 25 * 1024 * 1024) {
    throw new Error("Source image exceeds 25MB limit.");
  }

  return {
    bytes,
    sizeBytes,
    mimeType,
    originalName: buildFilename(inferTitleFromUrl(sourceUrl), mimeType),
    sourceUrl,
    inferredTitle: inferTitleFromUrl(sourceUrl),
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 50,
    );

    const db = await getStorageProvidersDb();
    const result = await listThumbnailAssets(db, {
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 50,
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
        errorCode: "SYS_THUMBNAIL_ASSETS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Thumbnail assets API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const formData = await request.formData();
    const storageProviderAccountId = readFormValue(
      formData,
      "storageProviderAccountId",
    ).trim();

    if (!storageProviderAccountId) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
          error: "storageProviderAccountId is required.",
        },
        { status: 400 },
      );
    }

    const db = await getStorageProvidersDb();
    const account = await getActiveStorageProviderAccountForUpload({
      db,
      providerId: storageProviderAccountId,
    });

    if (account.providerType !== "drive" && account.providerType !== "telegram") {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_STORAGE_PROVIDER_INVALID",
          error: "Thumbnail Studio supports drive/telegram upload providers only.",
        },
        { status: 400 },
      );
    }

    const uploadFile = await resolveUploadFile(formData);
    const explicitTitle = readFormValue(formData, "title").trim();
    const title = explicitTitle || uploadFile.inferredTitle || "Untitled thumbnail";
    const folder = readFormValue(formData, "folder").trim() || "thumbnails";
    const extraTags = parseTags(readFormValue(formData, "tags"));
    const lifecycleInput = readFormValue(formData, "lifecycle").trim().toLowerCase();
    const lifecycle: ThumbnailLifecycle = lifecycleInput === "processed" ? "processed" : "raw";
    const sourceAssetId = readFormValue(formData, "sourceAssetId").trim();
    const overwriteAssetId = readFormValue(formData, "overwriteAssetId").trim();

    const upload = await uploadLocalMedia({
      provider: account.providerType,
      file: {
        filename: buildFilename(title, uploadFile.mimeType),
        mimeType: uploadFile.mimeType,
        sizeBytes: uploadFile.sizeBytes,
        bytes: uploadFile.bytes,
        title,
      },
      account: {
        accountId: account._id.toHexString(),
        label: account.label,
        secrets: account.secrets,
      },
    });

    const createdAsset = await createThumbnailAsset({
      db,
      input: {
        title,
        folder,
        extraTags,
        lifecycle,
        sourceUrl:
          uploadFile.sourceUrl ||
          readFormValue(formData, "sourceUrl").trim() ||
          "thumbnail-studio://manual",
        upload,
        pipelineId: "thumbnail-studio",
      },
    });

    if (lifecycle === "processed" && sourceAssetId) {
      await markThumbnailHasProcessedOutput({
        db,
        sourceAssetId,
      });
    }

    if (overwriteAssetId) {
      const oldAsset = await getThumbnailAssetById({ db, assetId: overwriteAssetId });
      if (oldAsset) {
        await deleteRemoteAssetIfNeeded({
          db,
          asset: oldAsset as DeletableStoredAsset,
        });
        await deleteThumbnailAssetById({ db, assetId: overwriteAssetId });
      }
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...createdAsset,
          _id: createdAsset._id.toString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_THUMBNAIL_ASSET_CREATE_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Thumbnail create API failed.",
      },
      { status: 500 },
    );
  }
}
