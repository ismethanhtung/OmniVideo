import { NextResponse } from "next/server";

import { isValidInspirationVaultItemId } from "@/lib/inspiration-vault/inspiration-vault";
import {
    deleteInspirationVaultItemById,
    getInspirationVaultDb,
    updateInspirationVaultItemExploited,
} from "@/lib/inspiration-vault/repository";

export const runtime = "nodejs";

type RouteContext = {
    params: Promise<{
        itemId: string;
    }>;
};

function invalidItemIdResponse() {
    return NextResponse.json(
        {
            ok: false,
            errorCode: "VAL_INSPIRATION_ITEM_ID_INVALID",
            error: "itemId is invalid.",
        },
        { status: 400 },
    );
}

export async function PATCH(request: Request, context: RouteContext) {
    try {
        const { itemId } = await context.params;

        if (!isValidInspirationVaultItemId(itemId)) {
            return invalidItemIdResponse();
        }

        const payload = (await request.json()) as Record<string, unknown>;

        if (typeof payload.exploited !== "boolean") {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_INSPIRATION_EXPLOITED_INVALID",
                    error: "exploited must be a boolean.",
                },
                { status: 400 },
            );
        }

        const db = await getInspirationVaultDb();
        const item = await updateInspirationVaultItemExploited({
            db,
            itemId,
            exploited: payload.exploited,
        });

        if (!item) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_INSPIRATION_ITEM_NOT_FOUND",
                    error: "Inspiration Vault item was not found.",
                },
                { status: 404 },
            );
        }

        return NextResponse.json({
            ok: true,
            data: item,
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

export async function DELETE(_request: Request, context: RouteContext) {
    try {
        const { itemId } = await context.params;

        if (!isValidInspirationVaultItemId(itemId)) {
            return invalidItemIdResponse();
        }

        const db = await getInspirationVaultDb();
        const deleted = await deleteInspirationVaultItemById({ db, itemId });

        if (!deleted) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_INSPIRATION_ITEM_NOT_FOUND",
                    error: "Inspiration Vault item was not found.",
                },
                { status: 404 },
            );
        }

        return NextResponse.json({
            ok: true,
            data: { deleted: true },
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
