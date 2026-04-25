import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { exchangeOAuthCode, getSocialOAuthConfig } from "@/lib/social/oauth";
import { getSocialDb, markSocialAccountConnected } from "@/lib/social/repository";
import type { SocialPlatform } from "@/lib/social/types";

export const runtime = "nodejs";

function readToken(payload: Record<string, unknown>, key: string) {
  return typeof payload[key] === "string" ? (payload[key] as string) : undefined;
}

function isSocialPlatform(value: string): value is SocialPlatform {
  return (
    value === "facebook" ||
    value === "tiktok" ||
    value === "shopee" ||
    value === "youtube"
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ platform: string }> },
) {
  const { platform: rawPlatform } = await context.params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (!isSocialPlatform(rawPlatform)) {
    return NextResponse.redirect(
      new URL("/?socialOAuth=error&message=invalid_platform", url),
    );
  }

  const platform = rawPlatform;

  if (error) {
    return NextResponse.redirect(
      new URL(`/?socialOAuth=error&message=${encodeURIComponent(error)}`, url),
    );
  }

  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/?socialOAuth=error&message=missing_code_or_state", url),
    );
  }

  const [state, accountId] = stateParam.split(":");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(`social_oauth_${platform}`)?.value;

  if (!state || !accountId || expectedState !== state) {
    return NextResponse.redirect(
      new URL("/?socialOAuth=error&message=invalid_state", url),
    );
  }

  try {
    const tokenPayload = await exchangeOAuthCode({ platform, code });
    const accessToken = readToken(tokenPayload, "access_token");
    const refreshToken = readToken(tokenPayload, "refresh_token");
    const openId = readToken(tokenPayload, "open_id");

    if (!accessToken) {
      return NextResponse.redirect(
        new URL(
          `/?socialOAuth=error&message=${encodeURIComponent(JSON.stringify(tokenPayload))}`,
          url,
        ),
      );
    }

    const config = getSocialOAuthConfig(platform);
    const db = await getSocialDb();

    await markSocialAccountConnected({
      db,
      accountId,
      patch: {
        accountId: openId ?? accountId,
        permissionScopes: config.scopes,
        secrets: {
          accessToken,
          refreshToken,
          openId,
          connectionJson: JSON.stringify(tokenPayload),
        },
      },
    });

    cookieStore.delete(`social_oauth_${platform}`);

    return NextResponse.redirect(
      new URL("/?socialOAuth=connected", url),
    );
  } catch (callbackError) {
    return NextResponse.redirect(
      new URL(
        `/?socialOAuth=error&message=${encodeURIComponent(
          callbackError instanceof Error
            ? callbackError.message
            : "oauth_callback_failed",
        )}`,
        url,
      ),
    );
  }
}
