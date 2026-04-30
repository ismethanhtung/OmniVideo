import { NextResponse } from "next/server";

import { resolveMediaUrl } from "@/lib/video-intake/media-resolver";
import { detectOriginPlatform, normalizeUrl } from "@/lib/video-intake/platform";
import type { IntakeQualityPreference, ValidatedIntakeInput } from "@/lib/video-intake/types";

export const runtime = "nodejs";

const SUPPORTED_QUALITY_PREFERENCES = new Set<IntakeQualityPreference>([
    "best",
    "1080p",
    "720p",
    "480p",
    "360p",
]);

function sanitizeFileName(value: string) {
    const normalized = value
        .trim()
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);
    return normalized || "workspace-url-video";
}

function inferExtension(contentType: string | null, fallback?: string) {
    if (fallback?.trim()) return fallback.trim();
    if (!contentType) return "mp4";
    if (contentType.includes("webm")) return "webm";
    if (contentType.includes("quicktime")) return "mov";
    if (contentType.includes("x-matroska")) return "mkv";
    return "mp4";
}

function readBody(payload: unknown) {
    if (!payload || typeof payload !== "object") {
        throw new Error("Request body must be an object.");
    }
    const body = payload as {
        sourceUrl?: unknown;
        title?: unknown;
        qualityPreference?: unknown;
    };
    const sourceUrl =
        typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";
    if (!sourceUrl) {
        throw new Error("sourceUrl is required.");
    }
    const qualityPreferenceRaw =
        typeof body.qualityPreference === "string"
            ? body.qualityPreference.trim()
            : "best";
    const qualityPreference = SUPPORTED_QUALITY_PREFERENCES.has(
        qualityPreferenceRaw as IntakeQualityPreference,
    )
        ? (qualityPreferenceRaw as IntakeQualityPreference)
        : "best";
    return {
        sourceUrl,
        title: typeof body.title === "string" ? body.title.trim() : "",
        qualityPreference,
    };
}

export async function POST(request: Request) {
    try {
        const rawBody = (await request.json()) as unknown;
        const body = readBody(rawBody);
        const canonicalUrl = normalizeUrl(body.sourceUrl);
        const input: ValidatedIntakeInput = {
            sourceUrl: body.sourceUrl,
            canonicalUrl,
            originPlatform: detectOriginPlatform(canonicalUrl),
            storageProvider: "drive",
            tags: ["workspace", "url"],
            qualityPreference: body.qualityPreference,
            title: body.title || undefined,
        };
        const media = await resolveMediaUrl(input);
        const upstreamResponse = await fetch(media.directMediaUrl, {
            cache: "no-store",
            headers: media.requestHeaders,
        });

        if (!upstreamResponse.ok) {
            throw new Error(
                `Resolved media download failed with status ${upstreamResponse.status}.`,
            );
        }

        const arrayBuffer = await upstreamResponse.arrayBuffer();
        const contentType =
            upstreamResponse.headers.get("content-type") ??
            media.mimeType ??
            "video/mp4";
        const extension = inferExtension(contentType, media.ext);
        const fileStem = sanitizeFileName(
            body.title || media.title || "workspace-url-video",
        );

        return new NextResponse(arrayBuffer, {
            status: 200,
            headers: {
                "content-type": contentType,
                "cache-control": "no-store",
                "x-omnivideo-file-name": encodeURIComponent(
                    `${fileStem}.${extension}`,
                ),
                "x-omnivideo-byte-length": String(arrayBuffer.byteLength),
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_WORKSPACE_URL_RESOLVE_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Workspace URL resolve failed.",
            },
            { status: 400 },
        );
    }
}
