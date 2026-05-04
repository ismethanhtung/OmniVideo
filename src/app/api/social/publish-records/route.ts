import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  createPublishRecord,
  deleteFailedPublishRecords,
  executePublishNow,
  getSocialDb,
  listPublishRecordsPage,
} from "@/lib/social/repository";
import {
  SocialError,
  type PublishRecordStatus,
  type SocialPlatform,
} from "@/lib/social/types";
import { validatePublishRecordCreateInput } from "@/lib/social/validation";

export const runtime = "nodejs";

const SOCIAL_PLATFORMS = new Set<SocialPlatform>([
  "facebook",
  "tiktok",
  "shopee",
  "youtube",
]);

const PUBLISH_RECORD_STATUSES = new Set<PublishRecordStatus>([
  "planned",
  "queued",
  "published",
  "failed",
  "retrying",
  "canceled",
]);

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
    const pageRaw = Number(url.searchParams.get("page") ?? 1);
    const pageSizeRaw = Number(
      url.searchParams.get("pageSize") ?? url.searchParams.get("limit") ?? 50,
    );
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(100, Math.max(1, Math.floor(pageSizeRaw)))
      : 50;
    const platformRaw = url.searchParams.get("platform");
    const statusRaw = url.searchParams.get("status");
    const platform =
      platformRaw && SOCIAL_PLATFORMS.has(platformRaw as SocialPlatform)
        ? (platformRaw as SocialPlatform)
        : undefined;
    const status =
      statusRaw && PUBLISH_RECORD_STATUSES.has(statusRaw as PublishRecordStatus)
        ? (statusRaw as PublishRecordStatus)
        : undefined;
    const db = await getSocialDb();
    const result = await listPublishRecordsPage({
      db,
      page,
      pageSize,
      platform,
      status,
    });

    return NextResponse.json({
      ok: true,
      data: result.items.map((record) => serializeRecord(record)),
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
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
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

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

export async function DELETE(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    if (status !== "failed") {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_PUBLISH_RECORD_STATUS_INVALID",
          error: "Only status=failed is supported for bulk delete.",
        },
        { status: 400 },
      );
    }

    const db = await getSocialDb();
    const result = await deleteFailedPublishRecords(db);

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_PUBLISH_RECORD_DELETE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Publish record delete API failed.",
      },
      { status: 500 },
    );
  }
}
