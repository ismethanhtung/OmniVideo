import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { listMediaFormatsInternal } from "@/lib/video-intake/internal-resolver";
import { normalizeUrl } from "@/lib/video-intake/platform";
import type { IntakeQualityPreference } from "@/lib/video-intake/types";

export const runtime = "nodejs";

const SUPPORTED_QUALITY_PREFERENCES = new Set<IntakeQualityPreference>([
  "best",
  "1080p",
  "720p",
  "480p",
  "360p",
]);

export async function POST(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const payload = (await request.json()) as {
      sourceUrl?: unknown;
      qualityPreference?: unknown;
    };
    const sourceUrl =
      typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() : "";

    if (!sourceUrl) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_SOURCE_URL_REQUIRED",
          error: "sourceUrl is required.",
        },
        { status: 400 },
      );
    }

    const canonicalUrl = normalizeUrl(sourceUrl);
    const qualityRaw =
      typeof payload.qualityPreference === "string"
        ? payload.qualityPreference.trim()
        : "best";
    const qualityPreference = SUPPORTED_QUALITY_PREFERENCES.has(
      qualityRaw as IntakeQualityPreference,
    )
      ? (qualityRaw as IntakeQualityPreference)
      : "best";
    const data = await listMediaFormatsInternal(canonicalUrl, qualityPreference);

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "VID_FORMAT_LIST_FAILED",
        error:
          error instanceof Error ? error.message : "Could not list video formats.",
      },
      { status: 422 },
    );
  }
}
