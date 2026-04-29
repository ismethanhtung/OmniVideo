import { beforeEach, describe, expect, it, vi } from "vitest";

import { runVideoDubbing } from "@/lib/multilingual-audio/video-dubbing";

import { POST } from "./route";

vi.mock("@/lib/multilingual-audio/video-dubbing", () => ({
  runVideoDubbing: vi.fn(),
}));
vi.mock("@/lib/storage/asset-download", () => ({
  resolveAssetDownload: vi.fn(),
}));
vi.mock("@/lib/video-intake/repository", () => ({
  getIntakeDb: vi.fn(),
  getVideoAssetById: vi.fn(),
}));
vi.mock("@/lib/ai-providers/repository", () => ({
  getAiProvidersDb: vi.fn(async () => ({})),
  getAiProviderById: vi.fn(async () => ({
    apiKey: "provider-key",
    baseUrl: "https://provider.example/v1",
    label: "Provider One",
  })),
  incrementAiProviderUsage: vi.fn(),
}));
vi.mock("@/lib/ai-providers/usage", () => ({
  logAiProviderUsage: vi.fn(),
}));

const mockedRunVideoDubbing = vi.mocked(runVideoDubbing);

function createFormData(fields?: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields ?? {})) {
    formData.set(key, value);
  }
  return formData;
}

describe("video dubbing API", () => {
  beforeEach(() => {
    mockedRunVideoDubbing.mockReset();
  });

  it("rejects missing video input", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/video-dubbing", {
        method: "POST",
        body: createFormData(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_DUBBING_VIDEO_REQUIRED",
    });
    expect(mockedRunVideoDubbing).not.toHaveBeenCalled();
  });

  it("runs dubbing for uploaded video file", async () => {
    mockedRunVideoDubbing.mockResolvedValueOnce({
      videoBase64: Buffer.from("dubbed").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "source-vi-dub.mp4",
      byteLength: 6,
      generationDurationMs: 12,
      transcript: {
        text: "你好",
        language: "zh",
        model: "whisper-large-v3-turbo",
        segments: [{ id: 0, start: 0, end: 1, text: "你好" }],
        words: [],
        source: { fileName: "source.mp4", fileSizeBytes: 3 },
        audio: {
          format: "mp3",
          sampleRate: 16000,
          channels: 1,
          bitrateKbps: 64,
          fileSizeBytes: 3,
        },
        steps: [],
        provider: { name: "groq" },
      },
      translation: {
        sourceLanguage: "zh",
        targetLanguage: "vi",
        model: "llama-3.1-8b-instant",
        translatedSegments: [
          {
            id: 0,
            start: 0,
            end: 1,
            sourceText: "你好",
            translatedText: "Xin chào",
          },
        ],
        generationDurationMs: 5,
        chunks: [{ index: 0, segmentCount: 1 }],
        provider: { name: "groq" },
      },
      voice: {
        mimeType: "audio/wav",
        extension: "wav",
        fileName: "voice.wav",
        byteLength: 9,
        segmentCount: 1,
        generationDurationMs: 4,
        alignment: { mode: "timeline", chunks: 1, targetDurationSeconds: 1 },
        settings: {
          binaryPath: "piper",
          modelPath: "",
          preserveTimestampGaps: true,
        },
        provider: { name: "piper", mode: "local-cli" },
      },
      mix: {
        originalAudioVolume: 0.18,
        voiceVolume: 1,
        mode: "duck-original",
      },
    });
    const formData = createFormData({
      language: "zh",
      targetLanguage: "vi",
      originalAudioVolume: "0.12",
    });
    formData.set(
      "videoFile",
      new File([new Uint8Array([1, 2, 3])], "source.mp4", {
        type: "video/mp4",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/audio/video-dubbing", {
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
        fileName: "source-vi-dub.mp4",
      },
    });
    expect(mockedRunVideoDubbing).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "source.mp4",
        mimeType: "video/mp4",
        language: "zh",
        targetLanguage: "vi",
        originalAudioVolume: 0.12,
      }),
    );
  });

  it("hydrates selected AI provider before running translation", async () => {
    mockedRunVideoDubbing.mockResolvedValueOnce({
      videoBase64: "ZA==",
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "source-vi-dub.mp4",
      byteLength: 1,
      generationDurationMs: 12,
      transcript: {
        text: "你好",
        language: "zh",
        model: "whisper-large-v3-turbo",
        segments: [{ id: 0, start: 0, end: 1, text: "你好" }],
        words: [],
        source: { fileName: "source.mp4", fileSizeBytes: 3 },
        audio: {
          format: "mp3",
          sampleRate: 16000,
          channels: 1,
          bitrateKbps: 64,
          fileSizeBytes: 3,
        },
        steps: [],
        provider: { name: "groq" },
      },
      translation: {
        sourceLanguage: "zh",
        targetLanguage: "vi",
        model: "provider-model",
        translatedSegments: [],
        generationDurationMs: 5,
        chunks: [],
        provider: { name: "Provider One" },
      },
      voice: {
        mimeType: "audio/wav",
        extension: "wav",
        fileName: "voice.wav",
        byteLength: 1,
        segmentCount: 0,
        generationDurationMs: 4,
        alignment: { mode: "timeline", chunks: 0 },
        settings: {
          binaryPath: "piper",
          modelPath: "",
          preserveTimestampGaps: true,
        },
        provider: { name: "piper", mode: "local-cli" },
      },
      mix: {
        originalAudioVolume: 0.18,
        voiceVolume: 1,
        mode: "duck-original",
      },
    });
    const formData = createFormData({
      providerId: "provider-1",
      model: "provider-model",
    });
    formData.set(
      "videoFile",
      new File([new Uint8Array([1])], "source.mp4", { type: "video/mp4" }),
    );

    const response = await POST(
      new Request("http://localhost/api/audio/video-dubbing", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedRunVideoDubbing).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "provider-model",
        apiKey: "provider-key",
        baseUrl: "https://provider.example/v1",
        providerName: "Provider One",
      }),
    );
  });
});
