type DriveThumbnailAsset = {
    storageProvider?: string | null;
    providerAssetId?: string | null;
    storagePointer?: {
        fileId?: string | null;
    } | null;
};

export function getGoogleDriveFileIdFromAsset(asset: DriveThumbnailAsset) {
    if (asset.storageProvider !== "drive") {
        return null;
    }

    const providerAssetId = asset.providerAssetId?.trim();
    if (providerAssetId) {
        return providerAssetId;
    }

    const pointerFileId = asset.storagePointer?.fileId?.trim();
    return pointerFileId || null;
}

export function buildGoogleDriveThumbnailUrl(
    fileId: string,
    width = 320,
) {
    const safeWidth = Math.min(2048, Math.max(64, Math.round(width)));
    const params = new URLSearchParams({
        id: fileId,
        sz: `w${safeWidth}`,
    });

    return `https://drive.google.com/thumbnail?${params.toString()}`;
}
