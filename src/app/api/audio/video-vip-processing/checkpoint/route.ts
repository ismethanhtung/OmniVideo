import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";

export const runtime = "nodejs";

async function readVipCheckpointByKey(key: string) {
    const hash = createHash("sha256").update(key.trim()).digest("hex");
    const jsonPath = path.join(
        tmpdir(),
        "omnivideo-vip-stage-checkpoints",
        hash,
        "checkpoint.json",
    );

    try {
        const raw = await readFile(jsonPath, "utf8");
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-vip-processing");
        if (rateLimited) return rateLimited;

        const payload = (await request.json().catch(() => ({}))) as {
            key?: unknown;
        };
        const key = typeof payload.key === "string" ? payload.key : "";
        if (!key.trim()) {
            return NextResponse.json(
                { ok: false, error: "key body field is required." },
                { status: 400 },
            );
        }

        const data = await readVipCheckpointByKey(key);
        return NextResponse.json({ ok: true, data });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to read VIP checkpoint.",
            },
            { status: 500 },
        );
    }
}
