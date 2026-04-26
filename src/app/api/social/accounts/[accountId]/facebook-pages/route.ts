import { NextResponse } from "next/server";

import { listFacebookPagesForAccount } from "@/lib/social/facebook-auth";
import { getSocialAccountById, getSocialDb } from "@/lib/social/repository";
import { SocialError } from "@/lib/social/types";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await context.params;
    const db = await getSocialDb();
    const account = await getSocialAccountById({ db, accountId });

    if (account.platform !== "facebook") {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_PLATFORM_INVALID",
        message: "facebook-pages endpoint only supports facebook accounts.",
      });
    }

    const result = await listFacebookPagesForAccount(account);

    return NextResponse.json({
      ok: true,
      data: result,
    });
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
        errorCode: "SYS_FACEBOOK_PAGE_LIST_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Facebook page list API failed.",
      },
      { status: 500 },
    );
  }
}
