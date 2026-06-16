import { NextResponse } from "next/server";

import {
    requireOwnerForProviderAccount,
    requireWriteAccess,
} from "@/lib/access-control/route-guards";
import { getAiProviderById, getAiProvidersDb } from "@/lib/ai-providers/repository";
import { resolveAssetDownload } from "@/lib/storage/asset-download";
import {
    getActiveStorageProviderAccountForUpload,
    getStorageProvidersDb,
} from "@/lib/storage-providers/repository";
import { DEFAULT_GEMINI_IMAGE_MODEL } from "@/lib/thumbnails/gemini-defaults";
import { createThumbnailAsset, getThumbnailAssetById } from "@/lib/thumbnails/repository";
import { uploadLocalMedia } from "@/lib/video-intake/storage-adapters";

export const runtime = "nodejs";

const THUMBNAIL_STYLE_PROMPT = [
    "Create a 16:9 YouTube thumbnail for a Vietnamese fantasy drama recap.",
    "Visual direction: saturated anime/manhua fantasy, moonlit night, cherry blossom particles, cinematic glow, high contrast, dramatic character poses, glossy commercial YouTube thumbnail.",
    "Typography direction: huge Vietnamese title text, energetic hand-lettered brush/comic lettering, thick black stroke, yellow-to-orange and white text blocks, red accent words, angled layout, strong drop shadow, readable at mobile size.",
    "Composition: leave enough negative space for title text; put main character imagery on the left or center; add a dramatic secondary subject on the right if useful; do not create a plain poster.",
    "Important text rule: render the supplied Vietnamese title exactly as written, with correct accents. Do not add unrelated text, logos, watermarks, timestamps, or UI elements.",
].join("\n");

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function normalizeGeminiModelPath(model: string) {
    return model.trim().replace(/^models\//u, "");
}

function sanitizeFileBase(value: string) {
    return (
        value
            .trim()
            .replace(/\s+/gu, "-")
            .replace(/[^a-zA-Z0-9-_]/gu, "")
            .slice(0, 80) || "vip-thumbnail"
    );
}

function buildGeminiThumbnailPrompt(input: {
    title: string;
    context: string;
    hasReference: boolean;
}) {
    return [
        THUMBNAIL_STYLE_PROMPT,
        input.hasReference
            ? "Use the attached reference image only as visual guidance for characters/background/base layout; improve it into a finished thumbnail."
            : "No reference image is provided; invent a high-impact fantasy thumbnail scene.",
        input.context.trim()
            ? `Video/context notes:\n${input.context.trim().slice(0, 2000)}`
            : "",
        `Required Vietnamese title text:\n${input.title.trim()}`,
        "Output only the final thumbnail image.",
    ]
        .filter(Boolean)
        .join("\n\n");
}

async function resolveReferenceImage(formData: FormData) {
    const file = formData.get("referenceImage");
    if (file instanceof File && file.size > 0) {
        const mimeType = (file.type || "image/png").toLowerCase();
        if (!mimeType.startsWith("image/")) {
            throw new Error("Reference file must be an image.");
        }
        return {
            bytes: new Uint8Array(await file.arrayBuffer()),
            mimeType,
        };
    }

    const referenceThumbnailAssetId = readFormValue(
        formData,
        "referenceThumbnailAssetId",
    ).trim();
    if (!referenceThumbnailAssetId) return null;

    const db = await getStorageProvidersDb();
    const asset = await getThumbnailAssetById({
        db,
        assetId: referenceThumbnailAssetId,
    });
    if (!asset) {
        throw new Error("Reference thumbnail asset was not found.");
    }
    const download = await resolveAssetDownload({
        db,
        asset,
        disposition: "attachment",
    });
    if (!download.ok) {
        throw new Error(download.error);
    }
    const bytes = new Uint8Array(await new Response(download.body).arrayBuffer());
    return {
        bytes,
        mimeType:
            download.headers.get("content-type") ||
            asset.mimeType ||
            "image/png",
    };
}

function extractGeneratedImage(payload: unknown) {
    const candidates = (payload as {
        candidates?: Array<{
            content?: {
                parts?: Array<{
                    inlineData?: { mimeType?: string; data?: string };
                    inline_data?: { mime_type?: string; data?: string };
                }>;
            };
        }>;
    }).candidates;

    for (const candidate of candidates ?? []) {
        for (const part of candidate.content?.parts ?? []) {
            const inlineData = part.inlineData;
            if (inlineData?.data) {
                return {
                    data: inlineData.data,
                    mimeType: inlineData.mimeType || "image/png",
                };
            }
            const inlineDataSnake = part.inline_data;
            if (inlineDataSnake?.data) {
                return {
                    data: inlineDataSnake.data,
                    mimeType: inlineDataSnake.mime_type || "image/png",
                };
            }
        }
    }
    return null;
}

export async function POST(request: Request) {
    try {
        const writeDenied = requireWriteAccess(request);
        if (writeDenied) return writeDenied;

        const formData = await request.formData();
        const title = readFormValue(formData, "title").trim();
        const storageProviderAccountId = readFormValue(
            formData,
            "storageProviderAccountId",
        ).trim();
        const providerId = readFormValue(formData, "providerId").trim();
        const model =
            readFormValue(formData, "model").trim() || DEFAULT_GEMINI_IMAGE_MODEL;
        const context = readFormValue(formData, "context").trim();

        if (!title) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_THUMBNAIL_TITLE_REQUIRED",
                    error: "Manual thumbnail title is required.",
                },
                { status: 400 },
            );
        }
        if (!storageProviderAccountId) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_REQUIRED",
                    error: "storageProviderAccountId is required.",
                },
                { status: 400 },
            );
        }

        const providerAccessDenied = requireOwnerForProviderAccount(
            request,
            providerId || undefined,
        );
        if (providerAccessDenied) return providerAccessDenied;

        let apiKey =
            process.env.GEMINI_API_KEY?.trim() ||
            process.env.GOOGLE_API_KEY?.trim() ||
            "";
        if (providerId) {
            const db = await getAiProvidersDb();
            const provider = await getAiProviderById({ db, providerId });
            apiKey = provider.apiKey || apiKey;
        }
        if (!apiKey) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "CFG_GEMINI_API_KEY_MISSING",
                    error: "Google AI Studio API key is missing.",
                },
                { status: 400 },
            );
        }

        const reference = await resolveReferenceImage(formData);
        const prompt = buildGeminiThumbnailPrompt({
            title,
            context,
            hasReference: Boolean(reference),
        });
        const parts: Array<Record<string, unknown>> = [{ text: prompt }];
        if (reference) {
            parts.push({
                inlineData: {
                    mimeType: reference.mimeType,
                    data: Buffer.from(reference.bytes).toString("base64"),
                },
            });
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalizeGeminiModelPath(model))}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts }],
                    generationConfig: {
                        responseModalities: ["TEXT", "IMAGE"],
                    },
                }),
            },
        );
        const raw = await response.text();
        const payload = JSON.parse(raw || "{}") as unknown;
        if (!response.ok) {
            const error = payload as { error?: { message?: string } };
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "PRV_GEMINI_IMAGE_FAILED",
                    error: error.error?.message ?? "Gemini image generation failed.",
                },
                { status: response.status >= 400 && response.status < 500 ? 422 : 502 },
            );
        }

        const generated = extractGeneratedImage(payload);
        if (!generated) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "PRV_GEMINI_IMAGE_EMPTY",
                    error: "Gemini did not return an image.",
                },
                { status: 502 },
            );
        }

        const imageBytes = Buffer.from(generated.data, "base64");
        const storageDb = await getStorageProvidersDb();
        const account = await getActiveStorageProviderAccountForUpload({
            db: storageDb,
            providerId: storageProviderAccountId,
        });
        if (account.providerType !== "drive" && account.providerType !== "telegram") {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: "VAL_STORAGE_PROVIDER_INVALID",
                    error: "Thumbnail generation supports drive/telegram upload providers only.",
                },
                { status: 400 },
            );
        }

        const upload = await uploadLocalMedia({
            provider: account.providerType,
            file: {
                filename: `${sanitizeFileBase(title)}.png`,
                mimeType: generated.mimeType,
                sizeBytes: imageBytes.byteLength,
                bytes: imageBytes,
                title,
            },
            account: {
                accountId: account._id.toHexString(),
                label: account.label,
                secrets: account.secrets,
            },
        });

        const createdAsset = await createThumbnailAsset({
            db: storageDb,
            input: {
                title,
                folder: readFormValue(formData, "folder").trim() || "thumbnails/vip",
                extraTags: ["vip", "ai-generated", "thumbnail"],
                lifecycle: "processed",
                sourceUrl: "gemini-thumbnail://generated",
                upload,
                pipelineId: "workspace-vip-gemini-thumbnail",
            },
        });

        return NextResponse.json({
            ok: true,
            data: {
                assetId: createdAsset._id.toString(),
                title,
                mimeType: generated.mimeType,
                byteLength: imageBytes.byteLength,
                model,
                prompt,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_GEMINI_THUMBNAIL_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Gemini thumbnail generation failed.",
            },
            { status: 500 },
        );
    }
}
