import { beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { downloadResolvedMediaToTempFile } from "@/lib/video-intake/internal-resolver";
import { resolveMediaUrl } from "@/lib/video-intake/media-resolver";

import { POST } from "./route";

vi.mock("@/lib/video-intake/media-resolver", () => ({
    resolveMediaUrl: vi.fn(),
}));
vi.mock("@/lib/video-intake/internal-resolver", () => ({
    downloadResolvedMediaToTempFile: vi.fn(),
}));

const mockedResolveMediaUrl = vi.mocked(resolveMediaUrl);
const mockedDownloadResolvedMediaToTempFile = vi.mocked(
    downloadResolvedMediaToTempFile,
);

describe("workspace URL resolve file API", () => {
    beforeEach(() => {
        mockedResolveMediaUrl.mockReset();
        mockedDownloadResolvedMediaToTempFile.mockReset();
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
                    headers: {
                        "content-type": "video/mp4",
                        "content-length": "3",
                    },
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

    it("streams yt-dlp merged temp files and schedules cleanup", async () => {
        const tmpDir = await mkdtemp(path.join(os.tmpdir(), "resolve-file-test-"));
        const filePath = path.join(tmpDir, "merged.mp4");
        await writeFile(filePath, new Uint8Array([7, 8, 9, 10]));
        const cleanup = vi.fn(async () => {
            await rm(tmpDir, { recursive: true, force: true });
        });

        mockedResolveMediaUrl.mockResolvedValueOnce({
            originalUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
            originPlatform: "bilibili",
            title: "Bilibili clip",
            downloadMode: "yt-dlp-file",
            formatSelector: "bv*+ba/b",
            requestedQuality: "best",
            resolver: "internal-resolver",
        });
        mockedDownloadResolvedMediaToTempFile.mockResolvedValueOnce({
            filePath,
            filename: "merged.mp4",
            mimeType: "video/mp4",
            sizeBytes: 4,
            title: "Bilibili clip",
            cleanup,
        });

        const response = await POST(
            new Request("http://localhost/api/video-intake/resolve-file", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
                    qualityPreference: "best",
                }),
            }),
        );
        const bytes = new Uint8Array(await response.arrayBuffer());

        expect(response.status).toBe(200);
        expect(response.headers.get("x-omnivideo-file-name")).toContain(
            "Bilibili-clip.mp4",
        );
        expect(response.headers.get("x-omnivideo-byte-length")).toBe("4");
        expect(bytes).toEqual(new Uint8Array([7, 8, 9, 10]));
        expect(mockedDownloadResolvedMediaToTempFile).toHaveBeenCalledWith({
            originalUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
            requestedQuality: "best",
            formatSelector: "bv*+ba/b",
        });
        expect(cleanup).toHaveBeenCalled();
    });

    it("materializes Bilibili HTML5 direct media before returning download response", async () => {
        const tmpDir = await mkdtemp(path.join(os.tmpdir(), "resolve-file-test-"));
        const filePath = path.join(tmpDir, "html5.mp4");
        await writeFile(filePath, new Uint8Array([4, 5, 6]));
        const cleanup = vi.fn(async () => {
            await rm(tmpDir, { recursive: true, force: true });
        });

        mockedResolveMediaUrl.mockResolvedValueOnce({
            originalUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
            directMediaUrl: "https://cdn.example.com/html5.mp4",
            originPlatform: "bilibili",
            title: "HTML5 clip",
            downloadMode: "direct-url",
            formatSelector: "bilibili-html5-64",
            formatId: "bilibili-html5-64",
            requestedQuality: "best",
            resolverProfile: "bilibili-html5:no-cookie",
            resolver: "internal-resolver",
        });
        mockedDownloadResolvedMediaToTempFile.mockResolvedValueOnce({
            filePath,
            filename: "html5.mp4",
            mimeType: "video/mp4",
            sizeBytes: 3,
            title: "HTML5 clip",
            cleanup,
        });
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        const response = await POST(
            new Request("http://localhost/api/video-intake/resolve-file", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
                    qualityPreference: "best",
                    formatSelector: "bilibili-html5-64",
                }),
            }),
        );
        const bytes = new Uint8Array(await response.arrayBuffer());

        expect(response.status).toBe(200);
        expect(response.headers.get("x-omnivideo-file-name")).toContain(
            "HTML5-clip.mp4",
        );
        expect(bytes).toEqual(new Uint8Array([4, 5, 6]));
        expect(mockedDownloadResolvedMediaToTempFile).toHaveBeenCalledWith({
            originalUrl: "https://www.bilibili.com/video/BV1W2oSBWEYw/",
            requestedQuality: "best",
            formatSelector: "bilibili-html5-64",
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(cleanup).toHaveBeenCalled();
    });
});
