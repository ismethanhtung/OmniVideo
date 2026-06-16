import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAiProviderById, getAiProvidersDb } from "@/lib/ai-providers/repository";
import { requireOwnerForProviderAccount, requireWriteAccess } from "@/lib/access-control/route-guards";
import { getActiveStorageProviderAccountForUpload, getStorageProvidersDb } from "@/lib/storage-providers/repository";
import { createThumbnailAsset, getThumbnailAssetById } from "@/lib/thumbnails/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";

import { POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
    requireOwnerForProviderAccount: vi.fn(() => null),
}));

vi.mock("@/lib/ai-providers/repository", () => ({
    getAiProvidersDb: vi.fn(),
    getAiProviderById: vi.fn(),
}));

vi.mock("@/lib/storage/asset-download", () => ({
    resolveAssetDownload: vi.fn(),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
    getStorageProvidersDb: vi.fn(),
    getActiveStorageProviderAccountForUpload: vi.fn(),
}));

vi.mock("@/lib/thumbnails/repository", () => ({
    createThumbnailAsset: vi.fn(),
    getThumbnailAssetById: vi.fn(),
}));

vi.mock("@/lib/video-intake/storage-adapters", () => ({
    uploadLocalMedia: vi.fn(),
}));

const mockedRequireWriteAccess = vi.mocked(requireWriteAccess);
const mockedRequireOwnerForProviderAccount = vi.mocked(
    requireOwnerForProviderAccount,
);
const mockedGetAiProvidersDb = vi.mocked(getAiProvidersDb);
const mockedGetAiProviderById = vi.mocked(getAiProviderById);
const mockedGetStorageProvidersDb = vi.mocked(getStorageProvidersDb);
const mockedGetActiveStorageProviderAccountForUpload = vi.mocked(
    getActiveStorageProviderAccountForUpload,
);
const mockedCreateThumbnailAsset = vi.mocked(createThumbnailAsset);
const mockedGetThumbnailAssetById = vi.mocked(getThumbnailAssetById);
const mockedUploadLocalMedia = vi.mocked(uploadLocalMedia);

describe("Gemini thumbnail generation route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mockedRequireWriteAccess.mockReturnValue(null);
        mockedRequireOwnerForProviderAccount.mockReturnValue(null);
        mockedGetAiProvidersDb.mockResolvedValue({} as never);
        mockedGetAiProviderById.mockResolvedValue({
            apiKey: "provider-gemini-key",
        } as never);
        mockedGetStorageProvidersDb.mockResolvedValue({} as never);
        mockedGetActiveStorageProviderAccountForUpload.mockResolvedValue({
            _id: { toHexString: () => "storage-1" },
            label: "Drive Main",
            providerType: "drive",
            secrets: {},
        } as never);
        mockedGetThumbnailAssetById.mockResolvedValue(null);
        mockedUploadLocalMedia.mockResolvedValue({
            storageProvider: "drive",
            storageProviderAccountId: "storage-1",
            storageProviderLabel: "Drive Main",
            storagePointer: { fileId: "drive-file-1" },
            providerAssetId: "drive-file-1",
            publicUrl: "https://drive.google.com/file/d/drive-file-1/view",
            mimeType: "image/png",
            sizeBytes: 4,
        });
        mockedCreateThumbnailAsset.mockResolvedValue({
            _id: { toString: () => "thumb-generated-1" },
        } as never);
    });

    it("rejects requests without a manual title", async () => {
        const formData = new FormData();
        formData.set("storageProviderAccountId", "storage-1");

        const response = await POST(
            new Request("http://localhost/api/thumbnails/gemini-generate", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.errorCode).toBe("VAL_THUMBNAIL_TITLE_REQUIRED");
        expect(mockedUploadLocalMedia).not.toHaveBeenCalled();
    });

    it("generates and stores a VIP thumbnail from env Gemini key", async () => {
        vi.stubEnv("GEMINI_API_KEY", "env-gemini-key");
        const imageBytes = Buffer.from([1, 2, 3, 4]);
        const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
            const body = JSON.parse(String(init?.body ?? "{}")) as {
                contents?: Array<{ parts?: Array<{ text?: string }> }>;
                generationConfig?: { responseModalities?: string[] };
            };
            expect(body.generationConfig?.responseModalities).toEqual([
                "TEXT",
                "IMAGE",
            ]);
            expect(body.contents?.[0]?.parts?.[0]?.text).toContain(
                "Hệ Thống Ép Ta Làm Hôn Quân",
            );
            expect(body.contents?.[0]?.parts?.[0]?.text).toContain(
                "huge Vietnamese title text",
            );
            return new Response(
                JSON.stringify({
                    candidates: [
                        {
                            content: {
                                parts: [
                                    {
                                        inlineData: {
                                            mimeType: "image/png",
                                            data: imageBytes.toString("base64"),
                                        },
                                    },
                                ],
                            },
                        },
                    ],
                }),
                { status: 200 },
            );
        });
        vi.stubGlobal("fetch", fetchMock);

        const formData = new FormData();
        formData.set("title", "Hệ Thống Ép Ta Làm Hôn Quân");
        formData.set("context", "Generated metadata title: unused metadata");
        formData.set("storageProviderAccountId", "storage-1");

        const response = await POST(
            new Request("http://localhost/api/thumbnails/gemini-generate", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.assetId).toBe("thumb-generated-1");
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringContaining("gemini-3.1-flash-lite"),
            expect.objectContaining({ method: "POST" }),
        );
        expect(mockedRequireOwnerForProviderAccount).toHaveBeenCalledWith(
            expect.any(Request),
            undefined,
        );
        expect(mockedUploadLocalMedia).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: "drive",
                file: expect.objectContaining({
                    filename: "H-Thng-p-Ta-Lm-Hn-Qun.png",
                    mimeType: "image/png",
                    sizeBytes: imageBytes.byteLength,
                    title: "Hệ Thống Ép Ta Làm Hôn Quân",
                }),
            }),
        );
        expect(mockedCreateThumbnailAsset).toHaveBeenCalledWith(
            expect.objectContaining({
                input: expect.objectContaining({
                    title: "Hệ Thống Ép Ta Làm Hôn Quân",
                    folder: "thumbnails/vip",
                    pipelineId: "workspace-vip-gemini-thumbnail",
                    extraTags: ["vip", "ai-generated", "thumbnail"],
                }),
            }),
        );
    });
});
