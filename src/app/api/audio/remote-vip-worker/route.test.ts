import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "./route";

describe("remote VIP worker proxy API", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.OMNIVIDEO_REMOTE_VIP_TOKEN;
        delete process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL;
        delete process.env.OMNIVIDEO_REMOTE_WORKER_PROXY_TIMEOUT_MS;
    });

    it("proxies worker status with the configured token", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "secret";
        const fetchMock = vi.fn(async () =>
            Response.json({
                ok: true,
                data: {
                    jobs: [],
                    activeProcesses: [],
                },
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker?endpoint=http%3A%2F%2Fworker.example",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ ok: true });
        expect(fetchMock).toHaveBeenCalledWith(
            new URL("http://worker.example/api/audio/video-vip-voice-render"),
            expect.objectContaining({
                method: "GET",
                headers: { Authorization: "Bearer secret" },
            }),
        );
    });

    it("uses caller-provided worker token before env fallback", async () => {
        process.env.OMNIVIDEO_REMOTE_VIP_TOKEN = "env-secret";
        const fetchMock = vi.fn(async () =>
            Response.json({
                ok: true,
                data: { jobs: [], activeProcesses: [] },
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker?endpoint=http%3A%2F%2Fworker.example",
                {
                    headers: {
                        "X-OmniVideo-Remote-Vip-Token": "browser-secret",
                    },
                },
            ),
        );

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledWith(
            new URL("http://worker.example/api/audio/video-vip-voice-render"),
            expect.objectContaining({
                headers: { Authorization: "Bearer browser-secret" },
            }),
        );
    });

    it("returns a controlled unavailable response when the worker cannot be reached", async () => {
        const fetchMock = vi.fn(async () => {
            throw new TypeError("fetch failed");
        });
        vi.stubGlobal("fetch", fetchMock);

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker?endpoint=http%3A%2F%2F43.198.97.33%3A8787",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(502);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: expect.stringContaining(
                "Remote VIP worker is unavailable",
            ),
            detail: "fetch failed",
            timeoutMs: 8000,
        });
    });

    it("uses the configured proxy timeout in unavailable diagnostics", async () => {
        process.env.OMNIVIDEO_REMOTE_WORKER_PROXY_TIMEOUT_MS = "12000";
        const fetchMock = vi.fn(async () => {
            throw new TypeError("fetch failed");
        });
        vi.stubGlobal("fetch", fetchMock);

        const response = await GET(
            new Request(
                "http://localhost/api/audio/remote-vip-worker?endpoint=http%3A%2F%2F43.198.97.33%3A8787",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(502);
        expect(payload).toMatchObject({
            ok: false,
            detail: "fetch failed",
            timeoutMs: 12000,
        });
    });

    it("proxies worker kill requests", async () => {
        const fetchMock = vi.fn(async () =>
            Response.json({
                ok: true,
                data: {
                    cancelledJobs: ["job-1"],
                    killedProcesses: [{ pid: 123, kind: "ffmpeg" }],
                },
            }),
        );
        vi.stubGlobal("fetch", fetchMock);

        const response = await DELETE(
            new Request(
                "http://localhost/api/audio/remote-vip-worker?endpoint=http%3A%2F%2Fworker.example&jobId=job-1",
                { method: "DELETE" },
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.data).toMatchObject({
            cancelledJobs: ["job-1"],
        });
        expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
            "http://worker.example/api/audio/video-vip-voice-render?jobId=job-1",
        );
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: "DELETE",
        });
    });
});
