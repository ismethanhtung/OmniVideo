import { NextResponse } from "next/server";

import {
  getStorageProvidersDb,
  updateStorageProviderStatus,
} from "@/lib/storage-providers/repository";
import { StorageProviderError } from "@/lib/storage-providers/types";
import { validateStorageProviderStatus } from "@/lib/storage-providers/validation";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ providerId: string }> },
) {
  try {
    const payload = await request.json();
    const status = validateStorageProviderStatus(payload);
    const { providerId } = await context.params;
    const db = await getStorageProvidersDb();
    const provider = await updateStorageProviderStatus({ db, providerId, status });

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
