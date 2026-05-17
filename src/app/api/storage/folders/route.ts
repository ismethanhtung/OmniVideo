import { NextResponse } from "next/server";

import {
  getIntakeDb,
  listKnownVideoFolders,
} from "@/lib/video-intake/repository";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getIntakeDb();
    const folders = await listKnownVideoFolders(db);

    return NextResponse.json({
      ok: true,
      data: folders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_FOLDERS_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Storage folders API failed.",
      },
      { status: 500 },
    );
  }
}
