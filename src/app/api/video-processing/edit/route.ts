import { NextResponse } from "next/server";

import {
    VideoEditError,
    runVideoEditPipeline,
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

export async function POST(request: Request) {
    try {
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
            y: readNumber(formData, "regionY", 78),
            width: readNumber(formData, "regionWidth", 100),
            height: readNumber(formData, "regionHeight", 16),
        };
        const timeline: VideoEditTimelineSeconds = {
            start: readNumber(formData, "timelineStart", 0),
            end: readNumber(formData, "timelineEnd", 999999),
        };

        const result = await runVideoEditPipeline({
            fileName: file.name || "source.mp4",
            mimeType: file.type || undefined,
            fileSizeBytes: file.size,
            fileBytes: new Uint8Array(await file.arrayBuffer()),
            mirror: readBoolean(formData, "mirrorEnabled"),
            blur: blurEnabled
                ? {
                      enabled: true,
                      region,
                      timeline,
                      strength: readNumber(formData, "blurStrength", 18),
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
                              64,
                          ),
                          marginBottom: readNumber(
                              formData,
                              "subtitleMarginBottom",
                              280,
                          ),
                      },
                  }
                : undefined,
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
    }
}
