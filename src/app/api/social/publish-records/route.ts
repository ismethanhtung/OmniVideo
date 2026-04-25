import { NextResponse } from "next/server";

import {
  createPublishRecord,
  executePublishNow,
  getSocialDb,
  listPublishRecords,
} from "@/lib/social/repository";
import { SocialError } from "@/lib/social/types";
import { validatePublishRecordCreateInput } from "@/lib/social/validation";

export const runtime = "nodejs";

function serializeRecord(record: Record<string, unknown>) {
  return {
    ...record,
    _id: record._id?.toString?.() ?? record._id,
    assetId: record.assetId?.toString?.() ?? record.assetId,
    socialAccountId:
      record.socialAccountId?.toString?.() ?? record.socialAccountId,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const db = await getSocialDb();
    const records = await listPublishRecords({
      db,
      limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, limit)) : 50,
    });

    return NextResponse.json({
      ok: true,
      data: records.map((record) => serializeRecord(record)),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_PUBLISH_RECORDS_API_FAILED",
        error:
          error instanceof Error ? error.message : "Publish records API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validatePublishRecordCreateInput(payload);
    const db = await getSocialDb();
    const record = await createPublishRecord({ db, input });
    const finalRecord =
      input.publishMode === "publish_now"
        ? await executePublishNow({ db, publishRecordId: record._id })
        : record;

    return NextResponse.json(
      {
        ok: true,
        data: serializeRecord(finalRecord ?? record),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof SocialError) {
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
        errorCode: "SYS_PUBLISH_RECORD_CREATE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Publish record create API failed.",
      },
      { status: 500 },
    );
  }
}
