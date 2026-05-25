import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    getActiveStorageProviderAccountForUpload,
    getStorageProvidersDb,
    listStorageProviderAccounts,
} from "@/lib/storage-providers/repository";
import {
    createManualVideoAsset,
    getIntakeDb,
    updateVideoAssetMetadataById,
} from "@/lib/video-intake/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";

import { POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
}));

vi.mock("@/lib/storage-providers/repository", () => ({
    getStorageProvidersDb: vi.fn(),
    listStorageProviderAccounts: vi.fn(),
    getActiveStorageProviderAccountForUpload: vi.fn(),
}));

vi.mock("@/lib/video-intake/repository", () => ({
    getIntakeDb: vi.fn(),
    updateVideoAssetMetadataById: vi.fn(),
    createManualVideoAsset: vi.fn(),
}));

vi.mock("@/lib/video-intake/storage-adapters", () => ({
    uploadLocalMedia: vi.fn(),
}));

const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedUpdateVideoAssetMetadataById = vi.mocked(updateVideoAssetMetadataById);
const mockedGetStorageProvidersDb = vi.mocked(getStorageProvidersDb);
const mockedListStorageProviderAccounts = vi.mocked(listStorageProviderAccounts);
const mockedGetActiveStorageProviderAccountForUpload = vi.mocked(
    getActiveStorageProviderAccountForUpload,
);
const mockedUploadLocalMedia = vi.mocked(uploadLocalMedia);
const mockedCreateManualVideoAsset = vi.mocked(createManualVideoAsset);

describe("save video setup route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedGetIntakeDb.mockResolvedValue({} as never);
        mockedGetStorageProvidersDb.mockResolvedValue({} as never);
        mockedUpdateVideoAssetMetadataById.mockResolvedValue({
            _id: { toString: () => "asset-1" },
        } as never);
        mockedListStorageProviderAccounts.mockResolvedValue([
            {
                _id: "507f1f77bcf86cd799439011",
                label: "Drive Main",
                providerType: "drive",
                status: "active",
            },
        ] as never);
        mockedGetActiveStorageProviderAccountForUpload.mockResolvedValue({
            _id: { toHexString: () => "507f1f77bcf86cd799439011" },
            label: "Drive Main",
            providerType: "drive",
            secrets: {},
        } as never);
        mockedUploadLocalMedia.mockResolvedValue({
            storageProvider: "drive",
            providerAssetId: "drive-file-1",
            publicUrl: "https://drive.google.com/file/d/drive-file-1/view",
            mimeType: "video/mp4",
            sizeBytes: 1024,
            storageProviderLabel: "Drive Main",
        } as never);
        mockedCreateManualVideoAsset.mockResolvedValue({
            _id: { toString: () => "asset-local-1" },
        } as never);
    });

    it("patches setup for existing asset id", async () => {
        const formData = new FormData();
        formData.set("assetId", "asset-1");
        formData.set("videoEditSetupJson", JSON.stringify({ blurEnabled: true }));

        const response = await POST(
            new Request("http://localhost/api/storage/assets/save-video-setup", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(mockedUpdateVideoAssetMetadataById).toHaveBeenCalledWith({
            db: {},
            assetId: "asset-1",
            patch: { videoEditSetup: { blurEnabled: true } },
        });
        expect(payload.ok).toBe(true);
        expect(payload.data.assetId).toBe("asset-1");
    });

    it("uploads local file and creates asset when assetId is missing", async () => {
        const formData = new FormData();
        formData.set("videoEditSetupJson", JSON.stringify({ mirrorEnabled: true }));
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "episode-1.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/storage/assets/save-video-setup", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(201);
        expect(mockedUploadLocalMedia).toHaveBeenCalled();
        expect(mockedCreateManualVideoAsset).toHaveBeenCalled();
        expect(mockedUpdateVideoAssetMetadataById).toHaveBeenCalledWith(
            expect.objectContaining({
                assetId: "asset-local-1",
                patch: { videoEditSetup: { mirrorEnabled: true } },
            }),
        );
        expect(payload.ok).toBe(true);
        expect(payload.data.assetId).toBe("asset-local-1");
    });
});
