import { describe, expect, it } from "vitest";

import {
    buildGoogleDriveThumbnailUrl,
    getGoogleDriveFileIdFromAsset,
} from "./drive-thumbnail";

describe("getGoogleDriveFileIdFromAsset", () => {
    it("returns null when provider is not drive", () => {
        expect(
            getGoogleDriveFileIdFromAsset({
                storageProvider: "telegram",
                providerAssetId: "x",
            }),
        ).toBeNull();
    });

    it("prefers providerAssetId", () => {
        expect(
            getGoogleDriveFileIdFromAsset({
                storageProvider: "drive",
                providerAssetId: "file-a",
                storagePointer: { fileId: "file-b" },
            }),
        ).toBe("file-a");
    });

    it("falls back to storagePointer.fileId", () => {
        expect(
            getGoogleDriveFileIdFromAsset({
                storageProvider: "drive",
                providerAssetId: null,
                storagePointer: { fileId: "file-c" },
            }),
        ).toBe("file-c");
    });
});

describe("buildGoogleDriveThumbnailUrl", () => {
    it("encodes id and clamps width", () => {
        expect(
            buildGoogleDriveThumbnailUrl("abc/def", 320),
        ).toBe(
            "https://drive.google.com/thumbnail?id=abc%2Fdef&sz=w320",
        );
        expect(buildGoogleDriveThumbnailUrl("x", 10_000)).toContain("sz=w2048");
        expect(buildGoogleDriveThumbnailUrl("x", 0)).toContain("sz=w64");
    });
});
