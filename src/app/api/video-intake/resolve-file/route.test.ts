import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveMediaUrl } from "@/lib/video-intake/media-resolver";

import { POST } from "./route";

vi.mock("@/lib/video-intake/media-resolver", () => ({
    resolveMediaUrl: vi.fn(),
}));

const mockedResolveMediaUrl = vi.mocked(resolveMediaUrl);

describe("workspace URL resolve file API", () => {
    beforeEach(() => {
        mockedResolveMediaUrl.mockReset();
        vi.restoreAllMocks();
    });

    it("rejects missing sourceUrl", async () => {
        const response = await POST(
            new Request("http://localhost/api/video-intake/resolve-file", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({}),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "SYS_WORKSPACE_URL_RESOLVE_FAILED",
        });
        expect(mockedResolveMediaUrl).not.toHaveBeenCalled();
    });

    it("resolves URL and returns downloadable video bytes", async () => {
        mockedResolveMediaUrl.mockResolvedValueOnce({
            originalUrl: "https://www.youtube.com/watch?v=demo",
            directMediaUrl: "https://cdn.example.com/demo.mp4",
            originPlatform: "youtube",
            title: "Demo clip",
            ext: "mp4",
            requestHeaders: { Referer: "https://www.youtube.com/watch?v=demo" },
            resolver: "internal-resolver",
        });
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response(new Uint8Array([1, 2, 3]), {
                    status: 200,
                    headers: { "content-type": "video/mp4" },
                }),
            ),
        );

        const response = await POST(
            new Request("http://localhost/api/video-intake/resolve-file", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: "https://www.youtube.com/watch?v=demo",
                    qualityPreference: "best",
                }),
            }),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("video/mp4");
        expect(response.headers.get("x-omnivideo-file-name")).toContain("Demo-clip.mp4");
        expect(Number(response.headers.get("x-omnivideo-byte-length"))).toBe(3);
    });
});
