import { NextResponse } from "next/server";

import {
  createStorageProviderAccount,
  getStorageProvidersDb,
  listStorageProviderAccounts,
} from "@/lib/storage-providers/repository";
import { StorageProviderError } from "@/lib/storage-providers/types";
import { validateStorageProviderCreateInput } from "@/lib/storage-providers/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getStorageProvidersDb();
    const providers = await listStorageProviderAccounts(db);

    return NextResponse.json({
      ok: true,
      data: providers,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_PROVIDERS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage providers API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validateStorageProviderCreateInput(payload);
    const db = await getStorageProvidersDb();
    const provider = await createStorageProviderAccount({ db, input });

    return NextResponse.json(
      {
        ok: true,
        data: provider,
      },
      { status: 201 },
    );
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
        errorCode: "SYS_STORAGE_PROVIDERS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage providers API failed.",
      },
      { status: 500 },
    );
  }
}
