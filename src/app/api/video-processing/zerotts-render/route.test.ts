import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("POST /api/video-processing/zerotts-render", () => {
    it("returns 400 when video file is missing in multipart request", async () => {
        const formData = new FormData();
        const request = new Request("http://localhost:3000/api/video-processing/zerotts-render", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.ok).toBe(false);
        expect(json.errorCode).toBe("ZERO_TTS_VIDEO_REQUIRED");
    });

    it("returns 400 when speech audio is missing in multipart request", async () => {
        const formData = new FormData();
        const fakeVideo = new File([new Uint8Array([0, 1, 2])], "clip.mp4", {
            type: "video/mp4",
        });
        formData.append("videoFile", fakeVideo);

        const request = new Request("http://localhost:3000/api/video-processing/zerotts-render", {
            method: "POST",
            body: formData,
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.ok).toBe(false);
        expect(json.errorCode).toBe("ZERO_TTS_SPEECH_REQUIRED");
    });

    it("returns 400 for empty JSON body", async () => {
        const request = new Request("http://localhost:3000/api/video-processing/zerotts-render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.ok).toBe(false);
        expect(json.errorCode).toBe("ZERO_TTS_VIDEO_REQUIRED");
    });
});
