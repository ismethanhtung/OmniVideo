import { beforeEach, describe, expect, it, vi } from "vitest";

import { runVideoEditPipeline } from "@/lib/video-processing/video-edit-pipeline";

import { POST } from "./route";

vi.mock("@/lib/video-processing/video-edit-pipeline", async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import("@/lib/video-processing/video-edit-pipeline")
        >();
    return {
        ...actual,
        runVideoEditPipeline: vi.fn(),
    };
});

const mockedRunVideoEditPipeline = vi.mocked(runVideoEditPipeline);

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
            blurStrength: "18",
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
                    strength: 18,
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

    it("maps validation errors from the pipeline", async () => {
        const { VideoEditError } = await import(
            "@/lib/video-processing/video-edit-pipeline"
        );
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
});
