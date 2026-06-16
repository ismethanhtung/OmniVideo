import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("VIP checkpoint POST route", () => {
    it("rejects missing key body", async () => {
        const response = await POST(
            new Request("http://localhost/api/audio/video-vip-processing/checkpoint", {
                method: "POST",
                body: JSON.stringify({}),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            error: "key body field is required.",
        });
    });

    it("returns parsed checkpoint content from a body key", async () => {
        const { createHash } = await import("node:crypto");
        const { mkdir, writeFile, rm } = await import("node:fs/promises");
        const { tmpdir } = await import("node:os");
        const path = await import("node:path");

        const key = "workspace-vip:long-source-name:0.75:ai:zh:vi:gpt-5.5";
        const hash = createHash("sha256").update(key).digest("hex");
        const dir = path.join(tmpdir(), "omnivideo-vip-stage-checkpoints", hash);
        const jsonPath = path.join(dir, "checkpoint.json");
        const mockCheckpoint = {
            fingerprint: "test-fingerprint",
            transcript: { text: "Hello", segments: [] },
            updatedAt: new Date().toISOString(),
        };

        await mkdir(dir, { recursive: true });
        await writeFile(jsonPath, JSON.stringify(mockCheckpoint));

        try {
            const response = await POST(
                new Request("http://localhost/api/audio/video-vip-processing/checkpoint", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ key }),
                }),
            );
            const payload = await response.json();

            expect(response.status).toBe(200);
            expect(payload).toEqual({
                ok: true,
                data: mockCheckpoint,
            });
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
});
