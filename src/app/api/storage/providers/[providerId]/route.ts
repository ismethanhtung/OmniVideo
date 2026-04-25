import { NextResponse } from "next/server";

import {
  deleteStorageProviderAccount,
  getStorageProviderAccountById,
  getStorageProvidersDb,
  updateStorageProviderAccount,
} from "@/lib/storage-providers/repository";
import { mapStorageProviderToEditableDocument } from "@/lib/storage-providers/sanitize";
import { StorageProviderError } from "@/lib/storage-providers/types";
import { validateStorageProviderUpdateInput } from "@/lib/storage-providers/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const { providerId } = await context.params;
    const db = await getStorageProvidersDb();
    const provider = await getStorageProviderAccountById({ db, providerId });

    return NextResponse.json({
      ok: true,
      data: mapStorageProviderToEditableDocument(provider),
    });
  } catch (error) {
    if (error instanceof StorageProviderError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.errorCode,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_PROVIDER_GET_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage provider get API failed.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const payload = await request.json();
    const patch = validateStorageProviderUpdateInput(payload);
    const { providerId } = await context.params;
    const db = await getStorageProvidersDb();
    const provider = await updateStorageProviderAccount({ db, providerId, patch });

    return NextResponse.json({
      ok: true,
      data: provider,
    });
  } catch (error) {
    if (error instanceof StorageProviderError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.errorCode,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_PROVIDER_UPDATE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage provider update API failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const { providerId } = await context.params;
    const db = await getStorageProvidersDb();
    const deleted = await deleteStorageProviderAccount({ db, providerId });

    return NextResponse.json({
      ok: true,
      data: deleted,
    });
  } catch (error) {
    if (error instanceof StorageProviderError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.errorCode,
          error: error.message,
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_PROVIDER_DELETE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage provider delete API failed.",
      },
      { status: 500 },
    );
  }
}
