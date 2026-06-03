import { afterEach, describe, expect, it, vi } from "vitest";

import { DELETE, GET } from "./route";

describe("remote VIP worker proxy API", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.OMNIVIDEO_REMOTE_VIP_TOKEN;
        delete process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL;
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
