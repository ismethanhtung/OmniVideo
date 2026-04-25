import { NextResponse } from "next/server";

import {
  deleteSocialAccount,
  getEditableSocialAccountById,
  getSocialDb,
  updateSocialAccount,
} from "@/lib/social/repository";
import { SocialError } from "@/lib/social/types";
import { validateSocialAccountUpdateInput } from "@/lib/social/validation";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await context.params;
    const db = await getSocialDb();
    const account = await getEditableSocialAccountById({ db, accountId });

    return NextResponse.json({
      ok: true,
      data: account,
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
        errorCode: "SYS_SOCIAL_ACCOUNT_GET_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Social account get API failed.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const payload = await request.json();
    const patch = validateSocialAccountUpdateInput(payload);
    const { accountId } = await context.params;
    const db = await getSocialDb();
    const account = await updateSocialAccount({ db, accountId, patch });

    return NextResponse.json({
      ok: true,
      data: account,
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
        errorCode: "SYS_SOCIAL_ACCOUNT_UPDATE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Social account update API failed.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { accountId } = await context.params;
    const db = await getSocialDb();
    const deleted = await deleteSocialAccount({ db, accountId });

    return NextResponse.json({
      ok: true,
      data: deleted,
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
        errorCode: "SYS_SOCIAL_ACCOUNT_DELETE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Social account delete API failed.",
      },
      { status: 500 },
    );
  }
}
