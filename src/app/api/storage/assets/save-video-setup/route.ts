import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import {
    getActiveStorageProviderAccountForUpload,
    getStorageProvidersDb,
    listStorageProviderAccounts,
} from "@/lib/storage-providers/repository";
import type { StorageProvider } from "@/lib/video-intake/types";
import {
    createManualVideoAsset,
    getIntakeDb,
    updateVideoAssetMetadataById,
} from "@/lib/video-intake/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";

export const runtime = "nodejs";

function readStringFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function inferTitleFromFileName(fileName: string) {
    const normalized = fileName.replace(/\.[^.]+$/u, "").trim();
    return normalized || "Uploaded video";
}

export async function POST(request: Request) {
    try {
        const accessDenied = requireWriteAccess(request);
        if (accessDenied) return accessDenied;

        const formData = await request.formData();
        const assetId = readStringFormValue(formData, "assetId");
        const setupRaw = readStringFormValue(formData, "videoEditSetupJson");

        if (!setupRaw) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_VIDEO_EDIT_SETUP_REQUIRED",
                    error: "videoEditSetupJson is required.",
                },
                { status: 400 },
            );
        }

        let videoEditSetup: Record<string, unknown>;
        try {
            const parsed = JSON.parse(setupRaw) as unknown;
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new Error("Invalid setup payload.");
            }
            videoEditSetup = parsed as Record<string, unknown>;
        } catch {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_VIDEO_EDIT_SETUP_INVALID",
                    error: "videoEditSetupJson must be a valid object.",
                },
                { status: 400 },
            );
        }

        const db = await getIntakeDb();
        if (assetId) {
            const updated = await updateVideoAssetMetadataById({
                db,
                assetId,
                patch: {
                    videoEditSetup,
                },
            });
            if (!updated) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "VAL_STORAGE_ASSET_NOT_FOUND",
                        error: "Storage asset was not found.",
                    },
                    { status: 404 },
                );
            }
            return NextResponse.json({
                ok: true,
                data: {
                    mode: "existing-asset",
                    assetId: updated._id.toString(),
                },
            });
        }

        const file = formData.get("videoFile");
        if (!(file instanceof File)) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_VIDEO_FILE_REQUIRED",
                    error: "videoFile is required when assetId is empty.",
                },
                { status: 400 },
            );
        }

        const providersDb = await getStorageProvidersDb();
        const accounts = await listStorageProviderAccounts(providersDb);
        const candidate = accounts.find(
            (account) =>
                account.status === "active" &&
                (account.providerType === "drive" ||
                    account.providerType === "telegram"),
        );
        if (!candidate) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_NOT_FOUND",
                    error: "No active drive/telegram storage provider found for upload.",
                },
                { status: 400 },
            );
        }

        const activeAccount = await getActiveStorageProviderAccountForUpload({
            db: providersDb,
            providerId: candidate._id,
        });
        const uploadProvider: StorageProvider | null =
            activeAccount.providerType === "drive" ||
            activeAccount.providerType === "telegram"
                ? activeAccount.providerType
                : null;
        if (!uploadProvider) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_NOT_FOUND",
                    error: "Only drive/telegram providers are supported for this upload path.",
                },
                { status: 400 },
            );
        }
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const title = inferTitleFromFileName(file.name || "upload.mp4");
        const mimeType = (file.type || "video/mp4").toLowerCase();
        const upload = await uploadLocalMedia({
            provider: uploadProvider,
            file: {
                filename: file.name || "upload.mp4",
                mimeType,
                sizeBytes: file.size,
                bytes: fileBytes,
                title,
            },
            account: {
                accountId: activeAccount._id.toHexString(),
                label: activeAccount.label,
                secrets: activeAccount.secrets,
            },
        });

        const created = await createManualVideoAsset({
            db,
            input: {
                title,
                sourceUrl: "video-tools-lab://local-save-setup",
                storageProvider: upload.storageProvider,
                providerAssetId: upload.providerAssetId,
                publicUrl: upload.publicUrl,
                mimeType: upload.mimeType ?? mimeType,
                sizeBytes: upload.sizeBytes ?? file.size,
                storageProviderLabel:
                    upload.storageProviderLabel ?? activeAccount.label,
            },
        });

        await updateVideoAssetMetadataById({
            db,
            assetId: created._id.toString(),
            patch: {
                videoEditSetup,
            },
        });

        return NextResponse.json(
            {
                ok: true,
                data: {
                    mode: "local-file-uploaded",
                    assetId: created._id.toString(),
                },
            },
            { status: 201 },
        );
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_SAVE_VIDEO_SETUP_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Save video setup failed.",
            },
            { status: 500 },
        );
    }
}
