import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

describe("remote VIP worker browser config API", () => {
    afterEach(() => {
        delete process.env.OMNIVIDEO_APP_MODE;
        delete process.env.OMNIVIDEO_OWNER_TOKEN;
        delete process.env.OMNIVIDEO_REMOTE_VIP_TOKEN;
        delete process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL;
    });

    it("returns the server env worker endpoint and token for owner mode", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL =
            "http://worker.example:8787/";
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker/browser-config",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toEqual({
            ok: true,
            data: {
                endpoint: "http://worker.example:8787",
                token: "secret",
                tokenConfigured: true,
            },
        });
    });

    it("blocks public demo visitors from reading worker config", async () => {
        process.env.OMNIVIDEO_APP_MODE = "public-demo";
        process.env.OMNIVIDEO_OWNER_TOKEN = "owner-secret";
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL =
            "http://worker.example:8787";
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker/browser-config",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(403);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "DEMO_PROVIDER_ACCOUNT_DISABLED",
        });
    });

    it("allows public demo owner requests to read worker config", async () => {
        process.env.OMNIVIDEO_APP_MODE = "public-demo";
        process.env.OMNIVIDEO_OWNER_TOKEN = "owner-secret";
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL =
            "http://worker.example:8787";
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker/browser-config",
                {
                    headers: {
                        "X-OmniVideo-Owner-Token": "owner-secret",
                    },
                },
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data).toMatchObject({
            endpoint: "http://worker.example:8787",
            token: "secret",
        });
    });
});
