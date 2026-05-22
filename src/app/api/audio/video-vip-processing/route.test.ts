import { beforeEach, describe, expect, it, vi } from "vitest";

import { runVideoVipProcessing } from "@/lib/multilingual-audio/video-vip-processing";
import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";

import { POST } from "./route";

vi.mock("@/lib/multilingual-audio/video-vip-processing", () => ({
  runVideoVipProcessing: vi.fn(),
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
}));

const mockedRunVideoVipProcessing = vi.mocked(runVideoVipProcessing);
const mockedResolveAssetDownload = vi.mocked(resolveAssetDownload);
const mockedGetIntakeDb = vi.mocked(getIntakeDb);
const mockedGetVideoAssetById = vi.mocked(getVideoAssetById);

function createFormData(fields?: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields ?? {})) {
    formData.set(key, value);
  }
  return formData;
}

describe("video vip processing API", () => {
  beforeEach(() => {
    mockedRunVideoVipProcessing.mockReset();
    mockedResolveAssetDownload.mockReset();
    mockedGetIntakeDb.mockReset();
    mockedGetVideoAssetById.mockReset();
  });

  it("rejects missing video input", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/video-vip-processing", {
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
    expect(mockedRunVideoVipProcessing).not.toHaveBeenCalled();
  });

  it("runs VIP processing for uploaded video file", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 100,
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
        model: "cx/gpt-5.3-codex-low",
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
      metadata: {
        title: "Tiêu đề",
        description: "Mô tả",
        hashtags: ["review"],
        model: "cx/gpt-5.3-codex-low",
        provider: { name: "groq" },
      },
      stages: {
        preprocessDurationMs: 10,
        transcriptionDurationMs: 20,
        translationDurationMs: 10,
        voiceDurationMs: 15,
        muxDurationMs: 10,
        finalRenderDurationMs: 20,
        metadataDurationMs: 15,
      },
    });

    const formData = createFormData({
      language: "zh",
      targetLanguage: "vi",
      model: "cx/gpt-5.3-codex-low",
      videoSpeedFactor: "0.7",
      mirrorEnabled: "true",
      ttsAlignmentMode: "strict",
      ttsPreserveTimestampGaps: "true",
    });
    formData.set(
      "videoFile",
      new File([new Uint8Array([1, 2, 3])], "source.mp4", {
        type: "video/mp4",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/audio/video-vip-processing", {
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
        fileName: "vip-output.mp4",
      },
    });
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "source.mp4",
        mimeType: "video/mp4",
        language: "zh",
        targetLanguage: "vi",
        videoSpeedFactor: 0.7,
        mirrorEnabled: true,
      }),
    );
  });

  it("falls back to saved asset subtitle setup when VIP request values are defaults", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 100,
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
        model: "cx/gpt-5.3-codex-low",
        translatedSegments: [],
        generationDurationMs: 5,
        chunks: [],
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
        settings: { binaryPath: "piper", modelPath: "" },
        provider: { name: "piper", mode: "local-cli" },
      },
      metadata: {
        title: "Tiêu đề",
        description: "Mô tả",
        hashtags: ["review"],
        model: "cx/gpt-5.3-codex-low",
        provider: { name: "groq" },
      },
      stages: {
        preprocessDurationMs: 0,
        transcriptionDurationMs: 1,
        translationDurationMs: 1,
        voiceDurationMs: 1,
        muxDurationMs: 0,
        finalRenderDurationMs: 1,
        metadataDurationMs: 1,
      },
    });
    mockedGetIntakeDb.mockResolvedValueOnce({} as Awaited<ReturnType<typeof getIntakeDb>>);
    mockedGetVideoAssetById.mockResolvedValueOnce({
      _id: "asset-1",
      mimeType: "video/mp4",
      metadata: {
        title: "Saved setup asset",
        videoEditSetup: {
          subtitleFontSize: 55,
          subtitleMarginBottom: 83,
          subtitleMarginLeft: 0,
          subtitleMarginRight: 5,
          subtitleAlignment: 2,
          subtitleBackgroundOpacity: 65,
          blurRegions: [
            {
              x: 34.9,
              y: 87.6,
              width: 30.1,
              height: 4.5,
              start: 0,
              end: 36000,
              strength: 50,
            },
          ],
        },
      },
    } as Awaited<ReturnType<typeof getVideoAssetById>>);
    mockedResolveAssetDownload.mockResolvedValueOnce({
      ok: true,
      body: new Uint8Array([1, 2, 3]),
      headers: new Headers({ "content-type": "video/mp4" }),
    });

    const response = await POST(
      new Request("http://localhost/api/audio/video-vip-processing", {
        method: "POST",
        body: createFormData({
          assetId: "asset-1",
          useSourceAssetVideoEditSetup: "true",
          subtitleMarginBottom: "150",
          subtitleMarginRight: "60",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        subtitleStyle: expect.objectContaining({
          marginBottom: 83,
          marginLeft: 0,
          marginRight: 5,
        }),
        blur: expect.objectContaining({
          regions: [
            expect.objectContaining({
              region: expect.objectContaining({ y: 87.6 }),
            }),
          ],
        }),
      }),
    );
  });
});
