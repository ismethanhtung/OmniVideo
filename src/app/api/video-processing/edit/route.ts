import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import {
    VideoEditError,
    runVideoEditPipeline,
    runVideoEditPipelineFromPath,
    type VideoEditRegionPercent,
    type VideoEditTimelineSeconds,
    type VideoEditTextOverlay,
} from "@/lib/video-processing/video-edit-pipeline";
import type { TranscriptTranslationSegment } from "@/lib/multilingual-audio/types";
import {
    buildWorkspaceMediaPayload,
    getWorkspaceServerArtifact,
} from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

type VideoDimensions = {
    width: number;
    height: number;
};

let probeVideoDimensionsFromPathForTest:
    | ((inputPath: string) => Promise<VideoDimensions | null>)
    | null = null;

export function setProbeVideoDimensionsFromPathForTest(
    probeFn: ((inputPath: string) => Promise<VideoDimensions | null>) | null,
) {
    probeVideoDimensionsFromPathForTest = probeFn;
}

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

function readOptionalNumber(formData: FormData, key: string) {
    const value = readFormValue(formData, key);
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function readSubtitlePlacementRegion(formData: FormData) {
    const region = {
        x: readOptionalNumber(formData, "subtitleRegionX"),
        y: readOptionalNumber(formData, "subtitleRegionY"),
        width: readOptionalNumber(formData, "subtitleRegionWidth"),
        height: readOptionalNumber(formData, "subtitleRegionHeight"),
    };
    if (
        region.x === undefined ||
        region.y === undefined ||
        region.width === undefined ||
        region.height === undefined
    ) {
        return undefined;
    }
    return region as VideoEditRegionPercent;
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

type ParsedCoverBox = {
    region: VideoEditRegionPercent;
    timeline: VideoEditTimelineSeconds;
    color?: string;
    opacity?: number;
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

function readCoverBoxes(formData: FormData): ParsedCoverBox[] {
    const raw = readFormValue(formData, "coverBoxesJson").trim();
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item): ParsedCoverBox | null => {
                if (!item || typeof item !== "object") return null;
                const candidate = item as {
                    x?: unknown;
                    y?: unknown;
                    width?: unknown;
                    height?: unknown;
                    start?: unknown;
                    end?: unknown;
                    color?: unknown;
                    opacity?: unknown;
                };
                const x = Number(candidate.x);
                const y = Number(candidate.y);
                const width = Number(candidate.width);
                const height = Number(candidate.height);
                const start = Number(candidate.start);
                const end = Number(candidate.end);
                const opacity = Number(candidate.opacity);
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
                    color:
                        typeof candidate.color === "string"
                            ? candidate.color
                            : undefined,
                    opacity: Number.isFinite(opacity) ? opacity : undefined,
                };
            })
            .filter((entry): entry is ParsedCoverBox => entry !== null);
    } catch {
        return [];
    }
}

function readTextOverlays(formData: FormData): VideoEditTextOverlay[] {
    const raw = readFormValue(formData, "textOverlaysJson").trim();
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((item): VideoEditTextOverlay | null => {
                if (!item || typeof item !== "object") return null;
                const candidate = item as Record<string, unknown>;
                const text =
                    typeof candidate.text === "string"
                        ? candidate.text.trim()
                        : "";
                if (!text) return null;
                return {
                    text,
                    fontFamily:
                        typeof candidate.fontFamily === "string"
                            ? candidate.fontFamily
                            : undefined,
                    fontSize: Number(candidate.fontSize),
                    fontWeight: Number(candidate.fontWeight),
                    textColor:
                        typeof candidate.textColor === "string"
                            ? candidate.textColor
                            : undefined,
                    strokeColor:
                        typeof candidate.strokeColor === "string"
                            ? candidate.strokeColor
                            : undefined,
                    strokeWidth: Number(candidate.strokeWidth),
                    backgroundEnabled:
                        candidate.backgroundEnabled === true ||
                        candidate.backgroundEnabled === "true",
                    backgroundColor:
                        typeof candidate.backgroundColor === "string"
                            ? candidate.backgroundColor
                            : undefined,
                    backgroundOpacity: Number(candidate.backgroundOpacity),
                    x: Number(candidate.x),
                    y: Number(candidate.y),
                    start: Number(candidate.start),
                    end: Number(candidate.end),
                };
            })
            .filter((entry): entry is VideoEditTextOverlay => entry !== null);
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

function readWorkspaceArtifactVideo(artifactId: string) {
    const artifact = getWorkspaceServerArtifact(artifactId);
    if (!artifact || artifact.kind !== "video") {
        throw new VideoEditError(
            "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
            "Workspace video artifact was not found or has expired.",
            404,
        );
    }

    return artifact;
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

function parseVideoDimensionsFromFfmpegLog(stderr: string) {
    const match = /Video:\s.*?(\d{2,5})x(\d{2,5})(?:[,\s]|$)/u.exec(stderr);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
    }
    if (width <= 0 || height <= 0) {
        return null;
    }
    return { width, height };
}

async function probeVideoDimensionsFromPath(inputPath: string) {
    if (probeVideoDimensionsFromPathForTest) {
        return await probeVideoDimensionsFromPathForTest(inputPath);
    }

    return await new Promise<VideoDimensions | null>((resolve) => {
        let ffmpegPath = "";
        try {
            ffmpegPath = resolveFfmpegPath();
        } catch {
            resolve(null);
            return;
        }

        const child = spawn(ffmpegPath, ["-hide_banner", "-i", inputPath], {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";

        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", () => resolve(null));
        child.on("close", () => {
            resolve(parseVideoDimensionsFromFfmpegLog(stderr));
        });
    });
}

export async function POST(request: Request) {
    let uploadedWorkDir = "";
    try {
        const rateLimited = applyDemoRateLimit(request, "video-edit");
        if (rateLimited) return rateLimited;

        const formData = await request.formData();
        const file = formData.get("videoFile");
        const artifactId = readFormValue(formData, "artifactId").trim();

        if (!(file instanceof File) && !artifactId) {
            throw new VideoEditError(
                "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
                "videoFile or artifactId is required.",
                400,
            );
        }

        const artifact =
            file instanceof File ? null : readWorkspaceArtifactVideo(artifactId);
        const source =
            file instanceof File
                ? {
                      fileName: file.name || "source.mp4",
                      mimeType: file.type || undefined,
                      fileSizeBytes: file.size,
                  }
                : {
                      fileName: artifact!.fileName,
                      mimeType: artifact!.mimeType,
                      fileSizeBytes: artifact!.byteLength,
                  };

        const blurEnabled = readBoolean(formData, "blurEnabled");
        const coverBoxEnabled = readBoolean(formData, "coverBoxEnabled");
        const textOverlayEnabled = readBoolean(formData, "textOverlayEnabled");
        const subtitlesEnabled = readBoolean(
            formData,
            "subtitleOverlayEnabled",
        );
        const subtitleBackgroundColor =
            readFormValue(formData, "subtitleBackgroundColor") || "#000000";
        const subtitleBackgroundOpacity = readNumber(
            formData,
            "subtitleBackgroundOpacity",
            0,
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
        const parsedCoverBoxes = readCoverBoxes(formData);
        const parsedTextOverlays = readTextOverlays(formData);
        const input = {
            ...source,
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
                                    25,
                                ),
                            }),
                  }
                : undefined,
            coverBoxes: coverBoxEnabled
                ? {
                      enabled: true,
                      color:
                          readFormValue(formData, "coverBoxColor") ||
                          subtitleBackgroundColor,
                      opacity: readNumber(
                          formData,
                          "coverBoxOpacity",
                          subtitleBackgroundOpacity,
                      ),
                      ...(parsedCoverBoxes.length > 0
                          ? { regions: parsedCoverBoxes }
                          : {
                                region,
                                timeline,
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
                              "Bangers",
                          fontSize: readNumber(
                              formData,
                              "subtitleFontSize",
                              40,
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
                          backgroundColor: subtitleBackgroundColor,
                          backgroundOpacity: subtitleBackgroundOpacity,
                          backgroundEnabled:
                              readFormValue(
                                  formData,
                                  "subtitleBackgroundEnabled",
                              ) !== "false",
                          backgroundPaddingY: readNumber(
                              formData,
                              "subtitleBackgroundPaddingY",
                              8,
                          ),
                          placementRegion:
                              readSubtitlePlacementRegion(formData),
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
            textOverlays: textOverlayEnabled
                ? {
                      enabled: true,
                      overlays: parsedTextOverlays,
                      playResX: readNumber(
                          formData,
                          "textOverlayPlayResX",
                          readNumber(formData, "subtitlePlayResX", 1920),
                      ),
                      playResY: readNumber(
                          formData,
                          "textOverlayPlayResY",
                          readNumber(formData, "subtitlePlayResY", 1080),
                      ),
                  }
                : undefined,
        };

        const responseMode = readFormValue(formData, "responseMode");
        if (responseMode === "binary" || responseMode === "artifact") {
            uploadedWorkDir = path.join(
                tmpdir(),
                `omnivideo-edit-upload-${randomUUID()}`,
            );
            await mkdir(uploadedWorkDir, { recursive: true });
            const uploadedPath = path.join(
                uploadedWorkDir,
                source.fileName || "source.mp4",
            );
            if (file instanceof File) {
                await writeUploadedFile(file, uploadedPath);
            } else {
                await writeFile(uploadedPath, artifact!.bytes);
            }

            const needsVideoDimensions =
                input.subtitles?.enabled === true ||
                input.textOverlays?.enabled === true;
            const videoDimensions =
                needsVideoDimensions
                    ? await probeVideoDimensionsFromPath(uploadedPath)
                    : null;
            const normalizedInput =
                videoDimensions && needsVideoDimensions
                    ? {
                          ...input,
                          subtitles:
                              input.subtitles?.enabled === true
                                  ? {
                                        ...input.subtitles,
                                        enabled: true,
                                        segments: input.subtitles.segments,
                                        style: {
                                            ...(input.subtitles.style ?? {}),
                                            playResX: videoDimensions.width,
                                            playResY: videoDimensions.height,
                                        },
                                    }
                                  : input.subtitles,
                          textOverlays:
                              input.textOverlays?.enabled === true
                                  ? {
                                        ...input.textOverlays,
                                        enabled: true,
                                        playResX: videoDimensions.width,
                                        playResY: videoDimensions.height,
                                    }
                                  : input.textOverlays,
                      }
                    : input;

            const result = await runVideoEditPipelineFromPath({
                ...normalizedInput,
                inputPath: uploadedPath,
            });

            if (responseMode === "artifact") {
                return NextResponse.json({
                    ok: true,
                    data: {
                        generationDurationMs: result.generationDurationMs,
                        extension: result.extension,
                        transform: result.transform,
                        ...buildWorkspaceMediaPayload({
                            bytes: result.videoBytes,
                            fileName: result.fileName,
                            mimeType: result.mimeType,
                            kind: "video",
                            base64Field: "videoBase64",
                        }),
                    },
                });
            }

            return new Response(new Uint8Array(result.videoBytes), {
                status: 200,
                headers: buildBinaryHeaders(result),
            });
        }

        const result = await runVideoEditPipeline({
            ...input,
            fileBytes:
                file instanceof File
                    ? new Uint8Array(await file.arrayBuffer())
                    : new Uint8Array(artifact!.bytes),
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
