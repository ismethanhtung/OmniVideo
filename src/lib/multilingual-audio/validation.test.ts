import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isSupportedAudioVideoFile,
  readGroqApiKey,
  validateChineseTranscriptionRequest,
  validateGroqAudioPayloadSize,
} from "./validation";

describe("Audio transcription validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts common video and audio upload types", () => {
    expect(isSupportedAudioVideoFile("clip.mp4", "video/mp4")).toBe(true);
    expect(isSupportedAudioVideoFile("voice.wav", "audio/wav")).toBe(true);
    expect(isSupportedAudioVideoFile("douyin.webm", "")).toBe(true);
  });

  it("rejects unsupported files", () => {
    expect(() =>
      validateChineseTranscriptionRequest({
        fileName: "notes.txt",
        mimeType: "text/plain",
        fileSizeBytes: 4,
        fileBytes: new Uint8Array([1, 2, 3, 4]),
      }),
    ).toThrow("Unsupported file type");
  });

  it("does not apply Groq upload limit to the original source video", () => {
    expect(() =>
      validateChineseTranscriptionRequest({
        fileName: "large-source-video.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 250 * 1024 * 1024,
        fileBytes: new Uint8Array([1, 2, 3, 4]),
      }),
    ).not.toThrow();
  });

  it("applies Groq upload limit to the extracted audio payload", () => {
    const oversizedAudio = new Uint8Array(100 * 1024 * 1024 + 1);

    expect(() => validateGroqAudioPayloadSize(oversizedAudio)).toThrow(
      "Extracted audio is larger",
    );
  });

  it("rejects empty files", () => {
    expect(() =>
      validateChineseTranscriptionRequest({
        fileName: "empty.mp4",
        mimeType: "video/mp4",
        fileSizeBytes: 0,
        fileBytes: new Uint8Array(),
      }),
    ).toThrow("non-empty");
  });

  it("requires GROQ_API_KEY for provider calls", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(() => readGroqApiKey()).toThrow("GROQ_API_KEY");

    vi.stubEnv("GROQ_API_KEY", " test-key ");
    expect(readGroqApiKey()).toBe("test-key");
  });
});
