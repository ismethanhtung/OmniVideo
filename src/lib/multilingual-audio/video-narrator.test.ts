import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    uploadVideoToGemini,
    pollGeminiFileStatus,
    generateGeminiNarrationScript,
} from "./video-narrator";
import { ChineseTranscriptionError } from "./types";

describe("Video Narrator Client", () => {
    const mockApiKey = "test-api-key";

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("successfully uploads a video using resumable upload", async () => {
        const mockFetch = vi.mocked(fetch);

        // Mock step 1: Resumable start (returns location URL)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            headers: new Headers({
                location: "https://upload-location-url",
            }),
            text: async () => "ok",
        } as Response);

        // Mock step 2: Upload bytes (returns file metadata)
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                file: {
                    uri: "https://gemini-file-uri",
                    name: "files/test-file-name",
                },
            }),
        } as Response);

        const result = await uploadVideoToGemini(
            new Uint8Array([1, 2, 3]),
            "video/mp4",
            mockApiKey,
        );

        expect(result.fileUri).toBe("https://gemini-file-uri");
        expect(result.fileName).toBe("files/test-file-name");
        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws error when resumable initialization fails", async () => {
        const mockFetch = vi.mocked(fetch);
        mockFetch.mockResolvedValueOnce({
            ok: false,
            status: 400,
            text: async () => "Invalid request",
        } as Response);

        await expect(
            uploadVideoToGemini(
                new Uint8Array([1, 2, 3]),
                "video/mp4",
                mockApiKey,
            ),
        ).rejects.toThrow(ChineseTranscriptionError);
    });

    it("polls status until file is ACTIVE", async () => {
        const mockFetch = vi.mocked(fetch);

        // First poll: PROCESSING
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ state: "PROCESSING" }),
        } as Response);

        // Second poll: ACTIVE
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({ state: "ACTIVE" }),
        } as Response);

        await pollGeminiFileStatus("files/test-file-name", mockApiKey, 1, 5);

        expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws error when polling fails or times out", async () => {
        const mockFetch = vi.mocked(fetch);

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ state: "PROCESSING" }),
        } as Response);

        await expect(
            pollGeminiFileStatus("files/test-file-name", mockApiKey, 1, 3),
        ).rejects.toThrow("timed out");
    });

    it("successfully generates timed narration segments from video", async () => {
        const mockFetch = vi.mocked(fetch);

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: JSON.stringify([
                                        {
                                            start: 0.0,
                                            end: 3.5,
                                            text: "Người đàn ông này đi dạo.",
                                        },
                                        {
                                            start: 3.5,
                                            end: 7.0,
                                            text: "Gặp một chú bò.",
                                        },
                                    ]),
                                },
                            ],
                        },
                    },
                ],
            }),
        } as Response);

        const result = await generateGeminiNarrationScript({
            fileUri: "https://gemini-file-uri",
            mimeType: "video/mp4",
            apiKey: mockApiKey,
            model: "gemini-1.5-flash",
        });

        expect(result).toHaveLength(2);
        expect(result[0].start).toBe(0.0);
        expect(result[0].text).toBe("Người đàn ông này đi dạo.");
        expect(result[1].end).toBe(7.0);
        expect(result[1].text).toBe("Gặp một chú bò.");
    });

    it("throws error when response is invalid JSON array", async () => {
        const mockFetch = vi.mocked(fetch);

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                candidates: [
                    {
                        content: {
                            parts: [{ text: "not-json-format" }],
                        },
                    },
                ],
            }),
        } as Response);

        await expect(
            generateGeminiNarrationScript({
                fileUri: "https://gemini-file-uri",
                mimeType: "video/mp4",
                apiKey: mockApiKey,
                model: "gemini-1.5-flash",
            }),
        ).rejects.toThrow(ChineseTranscriptionError);
    });
});
