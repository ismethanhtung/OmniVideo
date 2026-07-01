import { NextResponse } from "next/server";

import { getAppAccessState } from "@/lib/access-control/access-control";

export const runtime = "nodejs";

function normalizeEndpoint(endpoint: string) {
    return endpoint.trim().replace(/\/+$/u, "");
}

export async function GET(request: Request) {
    const access = getAppAccessState(request);
    if (access.isPublicDemo && !access.isOwner) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "DEMO_PROVIDER_ACCOUNT_DISABLED",
                error: "Public demo requests cannot read remote VIP worker configuration.",
            },
            { status: 403 },
        );
    }

    const endpoint = normalizeEndpoint(
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL ?? "",
    );
    const token = process.env.OMNIVIDEO_REMOTE_VIP_TOKEN?.trim() ?? "";

    return NextResponse.json({
        ok: true,
        data: {
            endpoint,
            token,
            tokenConfigured: Boolean(token),
        },
    });
}
