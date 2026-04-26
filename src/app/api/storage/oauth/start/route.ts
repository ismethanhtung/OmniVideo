import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildDriveAuthorizationUrl,
  createDriveOAuthState,
  getDriveOAuthConfig,
  getMissingDriveOAuthConfig,
} from "@/lib/storage/drive-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const requestOrigin = new URL(request.url).origin;
    const explicitBaseUrl =
      process.env.STORAGE_OAUTH_BASE_URL?.trim() ||
      process.env.SOCIAL_OAUTH_BASE_URL?.trim();
    const preferredBaseUrl = explicitBaseUrl ? undefined : requestOrigin;
    const config = getDriveOAuthConfig(preferredBaseUrl);
    const missing = getMissingDriveOAuthConfig(preferredBaseUrl);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "AUTH_DRIVE_OAUTH_CONFIG_MISSING",
          error: `Missing OAuth env vars: ${missing.join(", ")}.`,
          missing,
        },
        { status: 400 },
      );
    }

    const state = createDriveOAuthState();
    const authUrl = buildDriveAuthorizationUrl(state, preferredBaseUrl);
    const cookieStore = await cookies();

    cookieStore.set("storage_oauth_drive", state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return NextResponse.json({
      ok: true,
      url: authUrl,
      redirectUri: config.redirectUri,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_STORAGE_OAUTH_START_FAILED",
        error:
          error instanceof Error ? error.message : "Drive OAuth start failed.",
      },
      { status: 500 },
    );
  }
}
