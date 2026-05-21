import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    runVideoEditPipeline,
    runVideoEditPipelineFromPath,
} from "@/lib/video-processing/video-edit-pipeline";

import { POST, setProbeVideoDimensionsFromPathForTest } from "./route";

vi.mock(
    "@/lib/video-processing/video-edit-pipeline",
    async (importOriginal) => {
        const actual =
            await importOriginal<
                typeof import("@/lib/video-processing/video-edit-pipeline")
            >();
        return {
            ...actual,
            runVideoEditPipeline: vi.fn(),
            runVideoEditPipelineFromPath: vi.fn(),
        };
    },
);

const mockedRunVideoEditPipeline = vi.mocked(runVideoEditPipeline);
const mockedRunVideoEditPipelineFromPath = vi.mocked(
    runVideoEditPipelineFromPath,
);

function createFormData(fields?: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields ?? {})) {
        formData.set(key, value);
    }
    return formData;
}

describe("video edit API", () => {
    beforeEach(() => {
        mockedRunVideoEditPipeline.mockReset();
        mockedRunVideoEditPipelineFromPath.mockReset();
        setProbeVideoDimensionsFromPathForTest(null);
    });

    it("rejects missing video file", async () => {
        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: createFormData(),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_VIDEO_EDIT_VIDEO_REQUIRED",
        });
        expect(mockedRunVideoEditPipeline).not.toHaveBeenCalled();
    });

    it("runs combined video edit for uploaded video file", async () => {
        mockedRunVideoEditPipeline.mockResolvedValueOnce({
            videoBase64: Buffer.from("edited").toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-edit.mp4",
            byteLength: 6,
            generationDurationMs: 12,
            transform: {
                mirror: true,
                partialBlur: true,
                subtitleOverlay: true,
                segmentCount: 1,
            },
        });
        const formData = createFormData({
            mirrorEnabled: "true",
            blurEnabled: "true",
            subtitleOverlayEnabled: "true",
            regionX: "0",
            regionY: "80",
            regionWidth: "100",
            regionHeight: "15",
            timelineStart: "0",
            timelineEnd: "12",
            blurStrength: "30",
            translatedSegmentsJson: JSON.stringify([
                {
                    id: 1,
                    start: 0,
                    end: 2,
                    sourceText: "source",
                    translatedText: "Xin chao",
                },
            ]),
        });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
            ok: true,
            data: {
                mimeType: "video/mp4",
                fileName: "source-edit.mp4",
                transform: {
                    mirror: true,
                    partialBlur: true,
                    subtitleOverlay: true,
                },
            },
        });
        expect(mockedRunVideoEditPipeline).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                mimeType: "video/mp4",
                fileSizeBytes: 3,
                mirror: true,
                blur: expect.objectContaining({
                    enabled: true,
                    region: { x: 0, y: 80, width: 100, height: 15 },
                    timeline: { start: 0, end: 12 },
                    strength: 30,
                }),
                subtitles: expect.objectContaining({
                    enabled: true,
                    segments: [
                        expect.objectContaining({
                            translatedText: "Xin chao",
                            start: 0,
                            end: 2,
                        }),
                    ],
                }),
            }),
        );
    });

    it("returns binary video when requested by Workspace", async () => {
        mockedRunVideoEditPipelineFromPath.mockResolvedValueOnce({
            videoBytes: Buffer.from("edited"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-edit.mp4",
            byteLength: 6,
            generationDurationMs: 12,
            transform: {
                mirror: false,
                partialBlur: true,
                subtitleOverlay: true,
                segmentCount: 1,
            },
        });
        const formData = createFormData({
            responseMode: "binary",
            blurEnabled: "true",
            subtitleOverlayEnabled: "true",
            translatedSegmentsJson: JSON.stringify([
                {
                    id: 1,
                    start: 0,
                    end: 2,
                    sourceText: "source",
                    translatedText: "Xin chao",
                },
            ]),
        });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: formData,
            }),
        );
        const bytes = Buffer.from(await response.arrayBuffer());

        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toBe("video/mp4");
        expect(response.headers.get("X-OmniVideo-File-Name")).toBe(
            "source-edit.mp4",
        );
        expect(bytes.toString("utf8")).toBe("edited");
        expect(mockedRunVideoEditPipeline).not.toHaveBeenCalled();
        expect(mockedRunVideoEditPipelineFromPath).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                fileSizeBytes: 3,
                inputPath: expect.stringContaining("source.mp4"),
                blur: expect.objectContaining({ enabled: true }),
            }),
        );
    });

    it("overrides subtitle play resolution from probed source dimensions for artifact mode", async () => {
        mockedRunVideoEditPipelineFromPath.mockResolvedValueOnce({
            videoBytes: Buffer.from("edited"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-edit.mp4",
            byteLength: 6,
            generationDurationMs: 12,
            transform: {
                mirror: false,
                partialBlur: true,
                subtitleOverlay: true,
                segmentCount: 1,
            },
        });
        setProbeVideoDimensionsFromPathForTest(
            vi.fn(async () => ({ width: 1080, height: 1920 })),
        );
        const formData = createFormData({
            responseMode: "artifact",
            blurEnabled: "true",
            subtitleOverlayEnabled: "true",
            subtitlePlayResX: "1920",
            subtitlePlayResY: "1080",
            translatedSegmentsJson: JSON.stringify([
                {
                    id: 1,
                    start: 0,
                    end: 2,
                    sourceText: "source",
                    translatedText: "Xin chao",
                },
            ]),
        });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: formData,
            }),
        );

        expect(response.status).toBe(200);
        expect(mockedRunVideoEditPipelineFromPath).toHaveBeenCalledWith(
            expect.objectContaining({
                subtitles: expect.objectContaining({
                    style: expect.objectContaining({
                        playResX: 1080,
                        playResY: 1920,
                    }),
                }),
                inputPath: expect.stringContaining("source.mp4"),
            }),
        );
    });

    it("maps validation errors from the pipeline", async () => {
        const { VideoEditError } =
            await import("@/lib/video-processing/video-edit-pipeline");
        const formData = createFormData({ mirrorEnabled: "true" });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        mockedRunVideoEditPipeline.mockRejectedValueOnce(
            new VideoEditError(
                "VAL_VIDEO_EDIT_REGION_INVALID",
                "Partial blur region invalid.",
                400,
            ),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_VIDEO_EDIT_REGION_INVALID",
        });
    });

    it("parses multi blur regions json and forwards to pipeline", async () => {
        mockedRunVideoEditPipeline.mockResolvedValueOnce({
            videoBase64: Buffer.from("edited").toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-edit.mp4",
            byteLength: 6,
            generationDurationMs: 12,
            transform: {
                mirror: false,
                partialBlur: true,
                subtitleOverlay: true,
                segmentCount: 1,
            },
        });
        const formData = createFormData({
            blurEnabled: "true",
            subtitleOverlayEnabled: "true",
            blurRegionsJson: JSON.stringify([
                {
                    x: 1,
                    y: 2,
                    width: 30,
                    height: 20,
                    start: 0,
                    end: 5,
                    strength: 26,
                },
                {
                    x: 50,
                    y: 70,
                    width: 40,
                    height: 20,
                    start: 2,
                    end: 9,
                    strength: 30,
                },
            ]),
            translatedSegmentsJson: JSON.stringify([
                {
                    id: 1,
                    start: 0,
                    end: 2,
                    sourceText: "source",
                    translatedText: "Xin chao",
                },
            ]),
        });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/edit", {
                method: "POST",
                body: formData,
            }),
        );

        expect(response.status).toBe(200);
        expect(mockedRunVideoEditPipeline).toHaveBeenCalledWith(
            expect.objectContaining({
                blur: expect.objectContaining({
                    enabled: true,
                    regions: [
                        expect.objectContaining({
                            region: { x: 1, y: 2, width: 30, height: 20 },
                            timeline: { start: 0, end: 5 },
                            strength: 26,
                        }),
                        expect.objectContaining({
                            region: { x: 50, y: 70, width: 40, height: 20 },
                            timeline: { start: 2, end: 9 },
                            strength: 30,
                        }),
                    ],
                }),
            }),
        );
    });
});
