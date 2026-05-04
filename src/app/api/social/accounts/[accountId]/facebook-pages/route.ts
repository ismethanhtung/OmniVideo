import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
  listFacebookPagesForAccount,
  refreshFacebookPagesForAccount,
} from "@/lib/social/facebook-auth";
import {
  getSocialAccountById,
  getSocialDb,
  updateSocialAccount,
} from "@/lib/social/repository";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const accessDenied = requireWriteAccess(request);
    if (accessDenied) return accessDenied;

    const { accountId } = await context.params;
    const db = await getSocialDb();
    const account = await getSocialAccountById({ db, accountId });

    if (account.platform !== "facebook") {
      throw new SocialError({
        errorCode: "VAL_SOCIAL_PLATFORM_INVALID",
        message: "facebook-pages endpoint only supports facebook accounts.",
      });
    }

    const result = await refreshFacebookPagesForAccount(account);

    const updatedAccount = await updateSocialAccount({
      db,
      accountId,
      patch: {
        secrets: {
          ...account.secrets,
          connectionJson: result.connectionJson,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        accountUpdatedAt: updatedAccount.updatedAt,
      },
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
        errorCode: "SYS_FACEBOOK_PAGE_REFRESH_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Facebook page refresh API failed.",
      },
      { status: 500 },
    );
  }
}
