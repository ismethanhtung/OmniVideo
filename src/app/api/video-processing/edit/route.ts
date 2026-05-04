import { NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import {
    VideoEditError,
    runVideoEditPipeline,
    runVideoEditPipelineFromPath,
    type VideoEditRegionPercent,
    type VideoEditTimelineSeconds,
} from "@/lib/video-processing/video-edit-pipeline";
import type { TranscriptTranslationSegment } from "@/lib/multilingual-audio/types";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function readBoolean(formData: FormData, key: string) {
    return readFormValue(formData, key) === "true";
}

function readNumber(formData: FormData, key: string, fallback: number) {
    const value = readFormValue(formData, key);
    if (!value.trim()) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function readTranslatedSegments(formData: FormData) {
    const raw = readFormValue(formData, "translatedSegmentsJson").trim();
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((segment, index): TranscriptTranslationSegment | null => {
                if (!segment || typeof segment !== "object") return null;
                const candidate =
                    segment as Partial<TranscriptTranslationSegment>;
                const translatedText =
                    typeof candidate.translatedText === "string"
                        ? candidate.translatedText
                        : typeof (candidate as { text?: unknown }).text ===
                            "string"
                          ? String((candidate as { text: string }).text)
                          : "";
                return {
                    id:
                        typeof candidate.id === "number"
                            ? candidate.id
                            : index + 1,
                    start:
                        typeof candidate.start === "number"
                            ? candidate.start
                            : Number(candidate.start),
                    end:
                        typeof candidate.end === "number"
                            ? candidate.end
                            : Number(candidate.end),
                    sourceText:
                        typeof candidate.sourceText === "string"
                            ? candidate.sourceText
                            : "",
                    translatedText,
                };
            })
            .filter(
                (segment): segment is TranscriptTranslationSegment =>
                    segment !== null,
            );
    } catch {
        return [];
    }
}

type ParsedBlurRegion = {
    region: VideoEditRegionPercent;
    timeline: VideoEditTimelineSeconds;
    strength: number;
};

function readBlurRegions(formData: FormData): ParsedBlurRegion[] {
    const raw = readFormValue(formData, "blurRegionsJson").trim();
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item): ParsedBlurRegion | null => {
                if (!item || typeof item !== "object") return null;
                const candidate = item as {
                    x?: unknown;
                    y?: unknown;
                    width?: unknown;
                    height?: unknown;
                    start?: unknown;
                    end?: unknown;
                    strength?: unknown;
                };
                const x = Number(candidate.x);
                const y = Number(candidate.y);
                const width = Number(candidate.width);
                const height = Number(candidate.height);
                const start = Number(candidate.start);
                const end = Number(candidate.end);
                const strength = Number(candidate.strength);
                if (
                    !Number.isFinite(x) ||
                    !Number.isFinite(y) ||
                    !Number.isFinite(width) ||
                    !Number.isFinite(height) ||
                    !Number.isFinite(start) ||
                    !Number.isFinite(end)
                ) {
                    return null;
                }
                return {
                    region: { x, y, width, height },
                    timeline: { start, end },
                    strength: Number.isFinite(strength) ? strength : 30,
                };
            })
            .filter((entry): entry is ParsedBlurRegion => entry !== null);
    } catch {
        return [];
    }
}

async function writeUploadedFile(file: File, outputPath: string) {
    await pipeline(
        Readable.fromWeb(
            file.stream() as Parameters<typeof Readable.fromWeb>[0],
        ),
        createWriteStream(outputPath),
    );
}

function buildBinaryHeaders(
    result: Awaited<ReturnType<typeof runVideoEditPipelineFromPath>>,
) {
    return {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "X-OmniVideo-File-Name": encodeURIComponent(result.fileName),
        "X-OmniVideo-Byte-Length": String(result.byteLength),
        "X-OmniVideo-Generation-Duration-Ms": String(
            result.generationDurationMs,
        ),
        "X-OmniVideo-Transform": encodeURIComponent(
            JSON.stringify(result.transform),
        ),
    };
}

export async function POST(request: Request) {
    let uploadedWorkDir = "";
    try {
        const rateLimited = applyDemoRateLimit(request, "video-edit");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");

        if (!(file instanceof File)) {
            throw new VideoEditError(
                "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
                "videoFile is required.",
                400,
            );
        }

        const blurEnabled = readBoolean(formData, "blurEnabled");
        const subtitlesEnabled = readBoolean(
            formData,
            "subtitleOverlayEnabled",
        );
        const region: VideoEditRegionPercent = {
            x: readNumber(formData, "regionX", 0),
            y: readNumber(formData, "regionY", 84),
            width: readNumber(formData, "regionWidth", 100),
            height: readNumber(formData, "regionHeight", 16),
        };
        const timeline: VideoEditTimelineSeconds = {
            start: readNumber(formData, "timelineStart", 0),
            end: readNumber(formData, "timelineEnd", 36000),
        };
        const parsedBlurRegions = readBlurRegions(formData);
        const input = {
            fileName: file.name || "source.mp4",
            mimeType: file.type || undefined,
            fileSizeBytes: file.size,
            mirror: readBoolean(formData, "mirrorEnabled"),
            blur: blurEnabled
                ? {
                      enabled: true,
                      ...(parsedBlurRegions.length > 0
                          ? { regions: parsedBlurRegions }
                          : {
                                region,
                                timeline,
                                strength: readNumber(
                                    formData,
                                    "blurStrength",
                                    50,
                                ),
                            }),
                  }
                : undefined,
            subtitles: subtitlesEnabled
                ? {
                      enabled: true,
                      segments: readTranslatedSegments(formData),
                      style: {
                          fontFamily:
                              readFormValue(formData, "subtitleFontFamily") ||
                              "Arial",
                          fontSize: readNumber(
                              formData,
                              "subtitleFontSize",
                              100,
                          ),
                          marginBottom: readNumber(
                              formData,
                              "subtitleMarginBottom",
                              150,
                          ),
                          marginLeft: readNumber(
                              formData,
                              "subtitleMarginLeft",
                              60,
                          ),
                          marginRight: readNumber(
                              formData,
                              "subtitleMarginRight",
                              60,
                          ),
                          alignment: readNumber(
                              formData,
                              "subtitleAlignment",
                              2,
                          ),
                          backgroundColor:
                              readFormValue(
                                  formData,
                                  "subtitleBackgroundColor",
                              ) || "#000000",
                          backgroundOpacity: readNumber(
                              formData,
                              "subtitleBackgroundOpacity",
                              65,
                          ),
                          backgroundEnabled:
                              readFormValue(
                                  formData,
                                  "subtitleBackgroundEnabled",
                              ) !== "false",
                          playResX: readNumber(
                              formData,
                              "subtitlePlayResX",
                              1920,
                          ),
                          playResY: readNumber(
                              formData,
                              "subtitlePlayResY",
                              1080,
                          ),
                      },
                  }
                : undefined,
        };

        if (readFormValue(formData, "responseMode") === "binary") {
            uploadedWorkDir = path.join(
                tmpdir(),
                `omnivideo-edit-upload-${randomUUID()}`,
            );
            await mkdir(uploadedWorkDir, { recursive: true });
            const uploadedPath = path.join(
                uploadedWorkDir,
                file.name || "source.mp4",
            );
            await writeUploadedFile(file, uploadedPath);

            const result = await runVideoEditPipelineFromPath({
                ...input,
                inputPath: uploadedPath,
            });

            return new Response(new Uint8Array(result.videoBytes), {
                status: 200,
                headers: buildBinaryHeaders(result),
            });
        }

        const result = await runVideoEditPipeline({
            ...input,
            fileBytes: new Uint8Array(await file.arrayBuffer()),
        });

        return NextResponse.json({ ok: true, data: result });
    } catch (error) {
        if (error instanceof VideoEditError) {
            return NextResponse.json(
                {
                    ok: false,
                    errorCode: error.code,
                    error: error.message,
                },
                { status: error.status },
            );
        }

        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_VIDEO_EDIT_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Video edit API failed.",
            },
            { status: 500 },
        );
    } finally {
        if (uploadedWorkDir) {
            await rm(uploadedWorkDir, { recursive: true, force: true });
        }
    }
}
