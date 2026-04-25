import { NextResponse } from "next/server";

import {
  createSocialAccount,
  getSocialDb,
  listSocialAccounts,
} from "@/lib/social/repository";
import { SocialError } from "@/lib/social/types";
import { validateSocialAccountCreateInput } from "@/lib/social/validation";

export const runtime = "nodejs";

export async function GET() {
  try {
    const db = await getSocialDb();
    const accounts = await listSocialAccounts(db);

    return NextResponse.json({
      ok: true,
      data: accounts,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_SOCIAL_ACCOUNTS_API_FAILED",
        error:
          error instanceof Error ? error.message : "Social accounts API failed.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const input = validateSocialAccountCreateInput(payload);
    const db = await getSocialDb();
    const account = await createSocialAccount({ db, input });

    return NextResponse.json(
      {
        ok: true,
        data: account,
      },
      { status: 201 },
    );
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
        errorCode: "SYS_SOCIAL_ACCOUNT_CREATE_API_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Social account create API failed.",
      },
      { status: 500 },
    );
  }
}
