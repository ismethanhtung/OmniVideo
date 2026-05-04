import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { refreshFacebookPagesForAccount } from "@/lib/social/facebook-auth";
import { exchangeOAuthCode, getSocialOAuthConfig } from "@/lib/social/oauth";
import {
  getSocialDb,
  getSocialAccountById,
  markSocialAccountConnected,
} from "@/lib/social/repository";
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
  const accessDenied = requireWriteAccess(request);
  if (accessDenied) return accessDenied;

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
    const facebookUserId = readToken(tokenPayload, "user_id");

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
    const platformAccountId =
      platform === "tiktok"
        ? openId
        : platform === "facebook"
          ? facebookUserId
          : undefined;

    let connectionJson = JSON.stringify(tokenPayload);
    if (platform === "facebook") {
      try {
        const account = await getSocialAccountById({ db, accountId });
        const facebookResult = await refreshFacebookPagesForAccount(
          {
            ...account,
            secrets: {
              ...account.secrets,
              accessToken,
              refreshToken,
              openId,
              connectionJson,
            },
          },
        );
        connectionJson = facebookResult.connectionJson;
      } catch {
        // Keep OAuth success path resilient even if page-list refresh is rate-limited.
      }
    }

    await markSocialAccountConnected({
      db,
      accountId,
      patch: {
        ...(platformAccountId ? { accountId: platformAccountId } : {}),
        permissionScopes: config.scopes,
        secrets: {
          accessToken,
          refreshToken,
          openId,
          connectionJson,
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
