import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { runVideoVipVoiceRender } from "@/lib/multilingual-audio/video-vip-processing";
import { runRemoteVideoVipVoiceRender } from "@/lib/multilingual-audio/remote-vip-worker";

vi.mock("@/lib/multilingual-audio/video-vip-processing", () => ({
    runVideoVipVoiceRender: vi.fn(),
}));

vi.mock("@/lib/multilingual-audio/remote-vip-worker", () => ({
    runRemoteVideoVipVoiceRender: vi.fn(),
}));

describe("Video Narrator API Route", () => {
    beforeEach(() => {
        vi.mocked(runVideoVipVoiceRender).mockReset();
        vi.mocked(runRemoteVideoVipVoiceRender).mockReset();
    });

    it("rejects requests without videoFile or assetId", async () => {
        const response = await POST(
            new Request("http://localhost/api/audio/video-narrator", {
                method: "POST",
                body: new FormData(),
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_AUDIO_FILE_REQUIRED",
            error: "videoFile or assetId is required.",
        });
    });

    it("rejects render requests without videoFile/assetId even when segmentsJson is present", async () => {
        const formData = new FormData();
        formData.set("segmentsJson", JSON.stringify([{ id: 0, start: 0, end: 5, text: "hello" }]));
        
        const response = await POST(
            new Request("http://localhost/api/audio/video-narrator", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload).toMatchObject({
            ok: false,
            errorCode: "VAL_AUDIO_FILE_REQUIRED",
            error: "videoFile or assetId is required.",
        });
    });

    it("passes subtitle style controls into the render input", async () => {
        vi.mocked(runVideoVipVoiceRender).mockResolvedValue({
            videoBytes: Buffer.from("video"),
            videoBase64: "",
            fileName: "narrated.mp4",
            mimeType: "video/mp4",
            byteLength: 5,
            generationDurationMs: 1,
            transform: {
                mirror: false,
                partialBlur: false,
                coverBox: false,
                subtitleOverlay: true,
                segmentCount: 1,
                textOverlay: false,
                textOverlayCount: 0,
            },
        });

        const formData = new FormData();
        formData.set(
            "videoFile",
            new File([new Uint8Array([1, 2, 3])], "source.mp4", {
                type: "video/mp4",
            }),
        );
        formData.set(
            "segmentsJson",
            JSON.stringify([{ id: 0, start: 0, end: 2, text: "mot hai ba bon" }]),
        );
        formData.set("executionMode", "remote");
        formData.set("subtitleMode", "triple-word-highlight");
        formData.set("subtitleFontFamily", "Bangers");
        formData.set("subtitleFontSize", "64");
        formData.set("subtitleTextColor", "#FFFFFF");
        formData.set("subtitleMarginBottom", "180");
        formData.set("subtitleMarginLeft", "70");
        formData.set("subtitleMarginRight", "80");
        formData.set("subtitleAlignment", "8");
        formData.set("subtitleBackgroundEnabled", "false");
        formData.set("subtitleBackgroundColor", "#111827");
        formData.set("subtitleBackgroundOpacity", "35");
        formData.set("subtitleBackgroundPaddingY", "10");

        const response = await POST(
            new Request("http://localhost/api/audio/video-narrator", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(runVideoVipVoiceRender).toHaveBeenCalledWith(
            expect.objectContaining({
                subtitleStyle: {
                    subtitleMode: "triple-word-highlight",
                    fontFamily: "Bangers",
                    fontSize: 64,
                    textColor: "#FFFFFF",
                    marginBottom: 180,
                    marginLeft: 70,
                    marginRight: 80,
                    alignment: 8,
                    backgroundEnabled: false,
                    backgroundColor: "#111827",
                    backgroundOpacity: 35,
                    backgroundPaddingY: 10,
                },
            }),
        );
        expect(runRemoteVideoVipVoiceRender).not.toHaveBeenCalled();
    });
});
