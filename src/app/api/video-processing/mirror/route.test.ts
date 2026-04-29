import { beforeEach, describe, expect, it, vi } from "vitest";

import { runMirrorVideo } from "@/lib/video-processing/mirror-video";

import { POST } from "./route";

vi.mock("@/lib/video-processing/mirror-video", async (importOriginal) => {
    const actual =
        await importOriginal<typeof import("@/lib/video-processing/mirror-video")>();
    return {
        ...actual,
        runMirrorVideo: vi.fn(),
    };
});

const mockedRunMirrorVideo = vi.mocked(runMirrorVideo);

function createFormData(fields?: Record<string, string>) {
    const formData = new FormData();
    for (const [key, value] of Object.entries(fields ?? {})) {
        formData.set(key, value);
    }
    return formData;
}

describe("mirror video API", () => {
    beforeEach(() => {
        mockedRunMirrorVideo.mockReset();
    });

    it("rejects missing video file", async () => {
        const response = await POST(
            new Request("http://localhost/api/video-processing/mirror", {
                method: "POST",
                body: createFormData(),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_MIRROR_VIDEO_REQUIRED",
        });
        expect(mockedRunMirrorVideo).not.toHaveBeenCalled();
    });

    it("runs mirror for uploaded video file", async () => {
        mockedRunMirrorVideo.mockResolvedValueOnce({
            videoBase64: Buffer.from("mirrored").toString("base64"),
            mimeType: "video/mp4",
            extension: "mp4",
            fileName: "source-mirror.mp4",
            byteLength: 8,
            generationDurationMs: 12,
            transform: { axis: "horizontal", filter: "hflip" },
        });
        const formData = createFormData({ axis: "horizontal" });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/mirror", {
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
                fileName: "source-mirror.mp4",
                transform: { axis: "horizontal" },
            },
        });
        expect(mockedRunMirrorVideo).toHaveBeenCalledWith(
            expect.objectContaining({
                fileName: "source.mp4",
                mimeType: "video/mp4",
                fileSizeBytes: 3,
                axis: "horizontal",
            }),
        );
    });

    it("maps unsupported axis validation errors", async () => {
        const { MirrorVideoError } = await import(
            "@/lib/video-processing/mirror-video"
        );
        const formData = createFormData({ axis: "vertical" });
        formData.set(
            "videoFile",
            new File([new Uint8Array([1])], "source.mp4", {
                type: "video/mp4",
            }),
        );

        mockedRunMirrorVideo.mockRejectedValueOnce(
            new MirrorVideoError(
                "VAL_MIRROR_AXIS_UNSUPPORTED",
                "Mirror Video MVP only supports axis=horizontal.",
                400,
            ),
        );

        const response = await POST(
            new Request("http://localhost/api/video-processing/mirror", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_MIRROR_AXIS_UNSUPPORTED",
        });
    });
});
