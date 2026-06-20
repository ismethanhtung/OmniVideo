import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/multilingual-audio/chinese-transcription", () => ({
  runChineseVideoTranscription: vi.fn(async () => ({
    text: "hello",
    language: "en",
    model: "custom-whisper-large",
    segments: [],
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
    provider: { name: "Custom Speech" },
  })),
}));

vi.mock("@/lib/ai-providers/repository", () => ({
  getAiProvidersDb: vi.fn(async () => ({})),
  getAiProviderById: vi.fn(async () => ({
    _id: "provider-1",
    label: "Custom Speech",
    providerType: "openai-compatible",
    baseUrl: "https://speech.example.com/v1",
    apiKey: "provider-key",
    status: "active",
  })),
}));

import { POST } from "./route";
import { runChineseVideoTranscription } from "@/lib/multilingual-audio/chinese-transcription";

describe("Audio transcription API", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without videoFile", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/chinese-transcription", {
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

  it("passes selected provider and model to the transcription pipeline", async () => {
    const formData = new FormData();
    formData.set(
      "videoFile",
      new File([new Uint8Array([1, 2, 3])], "source.mp4", {
        type: "video/mp4",
      }),
    );
    formData.set("providerId", "provider-1");
    formData.set("model", "custom-whisper-large");
    formData.set("language", "en");

    const response = await POST(
      new Request("http://localhost/api/audio/chinese-transcription", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    expect(runChineseVideoTranscription).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "source.mp4",
        transcriptionApiKey: "provider-key",
        transcriptionBaseUrl: "https://speech.example.com/v1",
        transcriptionProviderName: "Custom Speech",
        transcriptionModel: "custom-whisper-large",
        language: "en",
      }),
    );
  });
});
