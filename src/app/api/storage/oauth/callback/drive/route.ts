import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { exchangeDriveOAuthCode } from "@/lib/storage/drive-oauth";

export const runtime = "nodejs";

function readToken(payload: Record<string, unknown>, key: string) {
  return typeof payload[key] === "string" ? (payload[key] as string) : undefined;
}

function renderCallbackHtml({
  ok,
  message,
  accessToken,
  refreshToken,
  origin,
}: {
  ok: boolean;
  message: string;
  accessToken?: string;
  refreshToken?: string;
  origin: string;
}) {
  const payload = JSON.stringify({
    type: "omnivideo_drive_oauth",
    ok,
    message,
    accessToken,
    refreshToken,
  });

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Drive OAuth</title>
  </head>
  <body>
    <script>
      (function () {
        var payload = ${payload};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, ${JSON.stringify(origin)});
          }
        } catch (_) {}
        window.close();
      })();
    </script>
    <p>${ok ? "Drive OAuth connected. You can close this window." : "Drive OAuth failed. You can close this window."}</p>
  </body>
</html>`;
}

export async function GET(request: Request) {
  const accessDenied = requireWriteAccess(request);
  if (accessDenied) return accessDenied;

  const url = new URL(request.url);
  const requestOrigin = url.origin;
  const explicitBaseUrl =
    process.env.STORAGE_OAUTH_BASE_URL?.trim() ||
    process.env.SOCIAL_OAUTH_BASE_URL?.trim();
  const preferredBaseUrl = explicitBaseUrl ? undefined : requestOrigin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("storage_oauth_drive")?.value;

  if (oauthError) {
    const html = renderCallbackHtml({
      ok: false,
      message: oauthError,
      origin: requestOrigin,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (!code || !state || expectedState !== state) {
    const html = renderCallbackHtml({
      ok: false,
      message: "invalid_state_or_code",
      origin: requestOrigin,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  try {
    const payload = await exchangeDriveOAuthCode(code, preferredBaseUrl);
    const accessToken = readToken(payload, "access_token");
    const refreshToken = readToken(payload, "refresh_token");
    cookieStore.delete("storage_oauth_drive");

    if (!accessToken) {
      const html = renderCallbackHtml({
        ok: false,
        message: JSON.stringify(payload),
        origin: requestOrigin,
      });
      return new NextResponse(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    const html = renderCallbackHtml({
      ok: true,
      message: "connected",
      accessToken,
      refreshToken,
      origin: requestOrigin,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    const html = renderCallbackHtml({
      ok: false,
      message:
        error instanceof Error ? error.message : "oauth_callback_failed",
      origin: requestOrigin,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}
