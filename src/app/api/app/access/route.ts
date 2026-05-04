import { NextResponse } from "next/server";

import {
  OWNER_TOKEN_COOKIE,
  getAppAccessState,
  getOwnerToken,
} from "@/lib/access-control/access-control";

export const runtime = "nodejs";

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export async function GET(request: Request) {
  return NextResponse.json({
    ok: true,
    data: getAppAccessState(request),
  });
}

export async function POST(request: Request) {
  const ownerToken = getOwnerToken();
  const payload = (await request.json().catch(() => ({}))) as {
    token?: unknown;
  };
  const token = typeof payload.token === "string" ? payload.token.trim() : "";

  if (!ownerToken || token !== ownerToken) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "VAL_OWNER_TOKEN_INVALID",
        error: "Owner token is invalid.",
      },
      { status: 401 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    data: getAppAccessState(
      new Request(request.url, {
        headers: {
          cookie: `${OWNER_TOKEN_COOKIE}=${encodeURIComponent(ownerToken)}`,
          "x-omnivideo-owner-token": ownerToken,
        },
      }),
    ),
  });
  response.cookies.set(OWNER_TOKEN_COOKIE, ownerToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({
    ok: true,
    data: {
      cleared: true,
    },
  });
  response.cookies.set(OWNER_TOKEN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });

  return response;
}
