import { createReadStream } from "node:fs";
import { Readable } from "node:stream";

import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";
import { downloadResolvedMediaToTempFile } from "@/lib/video-intake/internal-resolver";
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
        formatSelector?: unknown;
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
    const formatSelector =
        typeof body.formatSelector === "string"
            ? body.formatSelector.trim()
            : "";
    if (formatSelector && /[\r\n\u0000-\u001f]/u.test(formatSelector)) {
        throw new Error("formatSelector must be a single-line yt-dlp format selector.");
    }
    return {
        sourceUrl,
        title: typeof body.title === "string" ? body.title.trim() : "",
        qualityPreference,
        formatSelector,
    };
}

function streamFileWithCleanup(filePath: string, cleanup: () => Promise<void>) {
    const nodeStream = createReadStream(filePath);
    nodeStream.on("close", () => {
        void cleanup();
    });
    nodeStream.on("error", () => {
        void cleanup();
    });
    return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}

function isBilibiliHtml5Media(media: {
    originPlatform?: string;
    formatSelector?: string;
    formatId?: string;
    resolverProfile?: string;
}) {
    if (media.originPlatform !== "bilibili") {
        return false;
    }

    const selector = media.formatSelector ?? media.formatId ?? "";
    return Boolean(
        selector.startsWith("bilibili-html5-") ||
            media.resolverProfile?.startsWith("bilibili-html5"),
    );
}

export async function POST(request: Request) {
    try {
        const accessDenied = requireWriteAccess(request);
        if (accessDenied) return accessDenied;

        const rawBody = (await request.json()) as unknown;
        const body = readBody(rawBody);
        const canonicalUrl = normalizeUrl(body.sourceUrl);
        const input: ValidatedIntakeInput = {
            sourceUrl: body.sourceUrl,
            canonicalUrl,
            originPlatform: detectOriginPlatform(canonicalUrl),
            storageProvider: "drive",
            folder: "workspace",
            tags: ["workspace", "url"],
            qualityPreference: body.qualityPreference,
            formatSelector: body.formatSelector || undefined,
            title: body.title || undefined,
        };
        const media = await resolveMediaUrl(input);

        if (media.downloadMode === "yt-dlp-file" || isBilibiliHtml5Media(media)) {
            const file = await downloadResolvedMediaToTempFile({
                originalUrl: media.originalUrl,
                requestedQuality: media.requestedQuality ?? "best",
                formatSelector: media.formatSelector,
            });
            const contentType = file.mimeType ?? media.mimeType ?? "video/mp4";
            const extension = inferExtension(contentType, media.ext);
            const fileStem = sanitizeFileName(
                body.title || file.title || media.title || "workspace-url-video",
            );

            return new NextResponse(
                streamFileWithCleanup(file.filePath, file.cleanup),
                {
                    status: 200,
                    headers: {
                        "content-type": contentType,
                        "cache-control": "no-store",
                        "x-omnivideo-file-name": encodeURIComponent(
                            `${fileStem}.${extension}`,
                        ),
                        "x-omnivideo-byte-length": String(file.sizeBytes ?? 0),
                    },
                },
            );
        }

        if (!media.directMediaUrl) {
            throw new Error("Resolver did not return a direct media URL.");
        }

        const upstreamResponse = await fetch(media.directMediaUrl, {
            cache: "no-store",
            headers: media.requestHeaders,
        });

        if (!upstreamResponse.ok) {
            throw new Error(
                `Resolved media download failed with status ${upstreamResponse.status}.`,
            );
        }

        const contentType =
            upstreamResponse.headers.get("content-type") ??
            media.mimeType ??
            "video/mp4";
        const extension = inferExtension(contentType, media.ext);
        const fileStem = sanitizeFileName(
            body.title || media.title || "workspace-url-video",
        );

        const responseHeaders: Record<string, string> = {
            "content-type": contentType,
            "cache-control": "no-store",
            "x-omnivideo-file-name": encodeURIComponent(
                `${fileStem}.${extension}`,
            ),
        };
        const contentLength = upstreamResponse.headers.get("content-length");
        if (contentLength) {
            responseHeaders["content-length"] = contentLength;
            responseHeaders["x-omnivideo-byte-length"] = contentLength;
        }

        return new NextResponse(upstreamResponse.body, {
            status: 200,
            headers: responseHeaders,
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
