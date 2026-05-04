import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  buildAuthorizationUrl,
  createOAuthState,
  getMissingOAuthConfig,
} from "@/lib/social/oauth";
import { getSocialAccountById, getSocialDb } from "@/lib/social/repository";
import type { SocialPlatform } from "@/lib/social/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const url = new URL(request.url);
    const platform = url.searchParams.get("platform") as SocialPlatform | null;
    const accountId = url.searchParams.get("accountId");

    if (!platform || !accountId) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_SOCIAL_OAUTH_START_INVALID",
          error: "platform and accountId are required.",
        },
        { status: 400 },
      );
    }

    const missing = getMissingOAuthConfig(platform);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "AUTH_SOCIAL_OAUTH_CONFIG_MISSING",
          error: `Missing OAuth env vars: ${missing.join(", ")}.`,
          missing,
        },
        { status: 400 },
      );
    }

    const db = await getSocialDb();
    const account = await getSocialAccountById({ db, accountId });

    if (account.platform !== platform) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_SOCIAL_OAUTH_PLATFORM_MISMATCH",
          error: "OAuth platform does not match account platform.",
        },
        { status: 400 },
      );
    }

    const state = createOAuthState(accountId);
    const authUrl = buildAuthorizationUrl({ platform, accountId, state });
    const cookieStore = await cookies();

    cookieStore.set(`social_oauth_${platform}`, state, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return NextResponse.json({
      ok: true,
      url: authUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_SOCIAL_OAUTH_START_FAILED",
        error:
          error instanceof Error ? error.message : "Social OAuth start failed.",
      },
      { status: 500 },
    );
  }
}
