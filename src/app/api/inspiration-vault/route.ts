import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
    createInspirationVaultItem,
    getInspirationVaultDb,
    listInspirationVaultItems,
} from "@/lib/inspiration-vault/repository";

export const runtime = "nodejs";

export async function GET() {
    try {
        const db = await getInspirationVaultDb();
        const items = await listInspirationVaultItems(db);

        return NextResponse.json({
            ok: true,
            data: items,
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_INSPIRATION_VAULT_API_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Inspiration Vault API failed.",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
    try {
        const accessDenied = requireWriteAccess(request);
        if (accessDenied) return accessDenied;

        const payload = (await request.json()) as Record<string, unknown>;
        const rawInput =
            typeof payload.rawInput === "string" ? payload.rawInput : "";

        const db = await getInspirationVaultDb();
        const item = await createInspirationVaultItem({ db, rawInput });

        if (!item) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_INSPIRATION_INPUT_EMPTY",
                    error: "rawInput is required.",
                },
                { status: 400 },
            );
        }

        return NextResponse.json(
            {
                ok: true,
                data: item,
            },
            { status: 201 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_INSPIRATION_VAULT_API_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Inspiration Vault API failed.",
            },
            { status: 500 },
        );
    }
}
