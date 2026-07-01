import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";
import { runVideoVipProcessing } from "@/lib/multilingual-audio/video-vip-processing";
import { getAiProviderById } from "@/lib/ai-providers/repository";
import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";

import { GET, POST, DELETE, maxDuration } from "./route";

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
    rateLimitRpm: 14,
  })),
}));

const mockedRunVideoVipProcessing = vi.mocked(runVideoVipProcessing);
const mockedGetAiProviderById = vi.mocked(getAiProviderById);
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

function createVipProcessingResult() {
  return {
    videoBase64: Buffer.from("vip").toString("base64"),
    mimeType: "video/mp4" as const,
    extension: "mp4" as const,
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
        format: "mp3" as const,
        sampleRate: 16000,
        channels: 1,
        bitrateKbps: 64,
        fileSizeBytes: 3,
      },
      steps: [],
      provider: { name: "groq" as const },
    },
    translation: {
      sourceLanguage: "zh",
      targetLanguage: "vi",
      model: "cx/gpt-5.5",
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
      alignment: { mode: "timeline" as const, chunks: 1, targetDurationSeconds: 1 },
      settings: { binaryPath: "piper", modelPath: "" },
      provider: { name: "piper" as const, mode: "local-cli" as const },
    },
    metadata: {
      title: "Tiêu đề",
      description: "Mô tả",
      hashtags: ["review"],
      model: "cx/gpt-5.5",
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
  };
}

describe("video vip processing API", () => {
  beforeEach(() => {
    mockedRunVideoVipProcessing.mockReset();
    mockedGetAiProviderById.mockClear();
    mockedResolveAssetDownload.mockReset();
    mockedGetIntakeDb.mockReset();
    mockedGetVideoAssetById.mockReset();
  });

  it("declares a long Vercel max duration for VIP processing", () => {
    expect(maxDuration).toBe(300);
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
        model: "cx/gpt-5.5",
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
        model: "cx/gpt-5.5",
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
      model: "cx/gpt-5.5",
      videoSpeedFactor: "0.7",
      renderPreset: "veryfast",
      mirrorEnabled: "true",
      originalAudioSourceMode: "vocals",
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
        sourceTitle: "source",
        mimeType: "video/mp4",
        language: "zh",
        targetLanguage: "vi",
        videoSpeedFactor: 0.7,
        renderPreset: "veryfast",
        originalAudioSourceMode: "vocals",
        mirrorEnabled: true,
        checkpointKey: undefined,
      }),
    );
  });

  it("passes vipResumeKey into VIP processing checkpoints", async () => {
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
        model: "cx/gpt-5.5",
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
        model: "cx/gpt-5.5",
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

    const formData = createFormData({
      vipResumeKey: "workspace-vip:node:source:asset",
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

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpointKey: "workspace-vip:node:source:asset",
      }),
    );
  });

  it("forwards remote voice/render settings to VIP processing", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 10,
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
        model: "cx/gpt-5.5",
        translatedSegments: [
          {
            id: 0,
            start: 0,
            end: 1,
            sourceText: "你好",
            translatedText: "Xin chào",
          },
        ],
        generationDurationMs: 1,
        chunks: [{ index: 0, segmentCount: 1 }],
        provider: { name: "groq" },
      },
      voice: {
        mimeType: "audio/wav",
        extension: "wav",
        fileName: "voice.wav",
        byteLength: 1,
        segmentCount: 1,
        generationDurationMs: 1,
        alignment: { mode: "timeline", chunks: 1 },
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
        hashtags: ["tag"],
        model: "cx/gpt-5.5",
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

    const formData = createFormData({
      voiceRenderExecutionMode: "remote",
      remoteVoiceRenderEndpoint: "http://worker.example:8787",
      remoteVoiceRenderToken: "token",
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

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceRenderExecutionMode: "remote",
        remoteVoiceRenderEndpoint: "http://worker.example:8787",
        remoteVoiceRenderToken: "token",
      }),
    );
  });

  it("forwards EC2 voice plus render mode to VIP processing", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 10,
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
        model: "cx/gpt-5.5",
        translatedSegments: [
          {
            id: 0,
            start: 0,
            end: 1,
            sourceText: "你好",
            translatedText: "Xin chào",
          },
        ],
        generationDurationMs: 1,
        chunks: [{ index: 0, segmentCount: 1 }],
        provider: { name: "groq" },
      },
      voice: {
        mimeType: "audio/wav",
        extension: "wav",
        fileName: "voice.wav",
        byteLength: 1,
        segmentCount: 1,
        generationDurationMs: 1,
        alignment: { mode: "timeline", chunks: 1 },
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
        hashtags: ["tag"],
        model: "cx/gpt-5.5",
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

    const formData = createFormData({
      voiceRenderExecutionMode: "remote-voice-render",
      remoteVoiceRenderEndpoint: "http://worker.example:8787",
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

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceRenderExecutionMode: "remote-voice-render",
        remoteVoiceRenderEndpoint: "http://worker.example:8787",
      }),
    );
  });

  it("forwards manual import translation mode and parsed lines", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 10,
      transcript: {
        text: "你好\n世界",
        language: "zh",
        model: "whisper-large-v3-turbo",
        segments: [
          { id: 0, start: 0, end: 1, text: "你好" },
          { id: 1, start: 1, end: 2, text: "世界" },
        ],
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
        model: "manual",
        translatedSegments: [
          {
            id: 0,
            start: 0,
            end: 1,
            sourceText: "你好",
            translatedText: "Xin chào",
          },
          {
            id: 1,
            start: 1,
            end: 2,
            sourceText: "世界",
            translatedText: "Thế giới",
          },
        ],
        generationDurationMs: 0,
        chunks: [{ index: 0, segmentCount: 2 }],
        provider: { name: "manual-import" },
      },
      voice: {
        mimeType: "audio/wav",
        extension: "wav",
        fileName: "voice.wav",
        byteLength: 9,
        segmentCount: 2,
        generationDurationMs: 4,
        alignment: { mode: "timeline", chunks: 1, targetDurationSeconds: 2 },
        settings: { binaryPath: "piper", modelPath: "" },
        provider: { name: "piper", mode: "local-cli" },
      },
      metadata: {
        title: "Tiêu đề",
        description: "Mô tả",
        hashtags: ["review"],
        model: "cx/gpt-5.5",
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
    const formData = createFormData({
      translationMode: "import",
      importedTranslationText: "1. Xin chào\n2. Thế giới",
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

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        translationMode: "import",
        importedTranslationLines: ["Xin chào", "Thế giới"],
      }),
    );
  });

  it("returns reusable VIP checkpoint stages when processing fails mid-node", async () => {
    const error = new ChineseTranscriptionError(
      "SYS_DUBBING_MUX_FAILED",
      "VIP render failed: fetch failed",
      500,
    ) as ChineseTranscriptionError & {
      checkpoint: {
        failedStage: string;
        savedStages: string[];
        reusableStages: string[];
      };
    };
    error.checkpoint = {
      failedStage: "render",
      savedStages: ["transcript", "translation", "voice"],
      reusableStages: ["transcript", "translation", "voice"],
    };
    mockedRunVideoVipProcessing.mockRejectedValueOnce(error);

    const formData = createFormData({
      vipResumeKey: "workspace-vip:node:source:asset",
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

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "SYS_DUBBING_MUX_FAILED",
      checkpoint: {
        failedStage: "render",
        savedStages: ["transcript", "translation", "voice"],
        reusableStages: ["transcript", "translation", "voice"],
      },
    });
  });

  it("returns manual translation prompt payload when VIP import mode needs user input", async () => {
    const error = new ChineseTranscriptionError(
      "VAL_TRANSLATION_IMPORT_REQUIRED",
      "Imported translation is required after transcript stage.",
      409,
    ) as ChineseTranscriptionError & {
      manualTranslationPrompt?: {
        transcript: {
          text: string;
          language: string;
          model: "whisper-large-v3-turbo";
          segments: Array<{ id: number; start: number; end: number; text: string }>;
          words: [];
          source: { fileName: string; fileSizeBytes: number };
          audio: {
            format: "mp3";
            sampleRate: 16000;
            channels: 1;
            bitrateKbps: 64;
            fileSizeBytes: number;
          };
          steps: [];
          provider: { name: "groq" };
        };
        sourceLines: string[];
        expectedSegmentCount: number;
        actualSegmentCount: number;
      };
    };
    error.manualTranslationPrompt = {
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
      sourceLines: ["你好"],
      expectedSegmentCount: 1,
      actualSegmentCount: 0,
    };
    mockedRunVideoVipProcessing.mockRejectedValueOnce(error);

    const formData = createFormData({ translationMode: "import" });
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

    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_TRANSLATION_IMPORT_REQUIRED",
      manualTranslationPrompt: {
        expectedSegmentCount: 1,
        actualSegmentCount: 0,
        sourceLines: ["你好"],
      },
    });
  });

  it("forwards corrected VIP transcript and imported segment JSON", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce(createVipProcessingResult());
    const formData = createFormData({
      translationMode: "import",
      importedTranslationSegmentsJson: JSON.stringify([
        { id: 0, translatedText: "Nàng đẹp quá" },
      ]),
      transcriptOverrideJson: JSON.stringify({
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
      }),
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

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        translationMode: "import",
        importedTranslationLines: ["Nàng đẹp quá"],
        transcriptOverride: expect.objectContaining({
          language: "zh",
          segments: [
            expect.objectContaining({
              id: 0,
              text: "你好",
            }),
          ],
        }),
      }),
    );
  });

  it("rejects invalid corrected VIP imported segment JSON", async () => {
    const formData = createFormData({
      translationMode: "import",
      importedTranslationSegmentsJson: "{nope",
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

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_TRANSLATION_IMPORT_INVALID",
    });
    expect(mockedRunVideoVipProcessing).not.toHaveBeenCalled();
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
        model: "cx/gpt-5.5",
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
        model: "cx/gpt-5.5",
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
          subtitleSampleWidthPercent: 100,
          subtitlePreviewPlacement: {
            leftPercent: 0,
            topPercent: 78.61111111111111,
          },
          subtitleBackgroundOpacity: 65,
          subtitleBackgroundPaddingY: 8,
          blurRegions: [
            {
              x: 34.9,
              y: 87.6,
              width: 30.1,
              height: 4.5,
              start: 0,
              end: 36000,
              strength: 25,
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
          marginBottom: 85,
          marginLeft: 670,
          marginRight: 672,
          alignment: 2,
          backgroundPaddingY: 8,
          placementRegion: {
            x: 34.9,
            y: 87.6,
            width: 30.1,
            height: 4.5,
          },
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

  it("uses saved asset cover box and text overlay setup for VIP render", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce({
      videoBase64: Buffer.from("vip").toString("base64"),
      mimeType: "video/mp4",
      extension: "mp4",
      fileName: "vip-output.mp4",
      byteLength: 3,
      generationDurationMs: 100,
      transcript: {
        text: "",
        language: "zh",
        model: "whisper-large-v3-turbo",
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
        provider: { name: "groq" },
      },
      translation: {
        sourceLanguage: "zh",
        targetLanguage: "vi",
        model: "cx/gpt-5.5",
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
        model: "cx/gpt-5.5",
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
        title: "Cover setup asset",
        videoEditSetup: {
          blurEnabled: false,
          coverBoxEnabled: true,
          subtitleBackgroundColor: "#000000",
          subtitleBackgroundOpacity: 65,
          textOverlayEnabled: true,
          textOverlay: {
            text: "Ăn Không Ngồi Rồi",
            fontFamily: "Baloo 2",
            fontSize: 52,
            x: 82,
            y: 10,
          },
          blurRegions: [
            {
              x: 0,
              y: 82,
              width: 100,
              height: 14,
              start: 0,
              end: 36000,
              strength: 25,
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
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        blur: undefined,
        coverBoxes: expect.objectContaining({
          enabled: true,
          color: "#000000",
          opacity: 65,
          regions: [
            expect.objectContaining({
              region: expect.objectContaining({ y: 82 }),
            }),
          ],
        }),
        textOverlays: expect.objectContaining({
          enabled: true,
          overlays: [
            expect.objectContaining({
              text: "Ăn Không Ngồi Rồi",
              fontFamily: "Baloo 2",
            }),
          ],
        }),
      }),
    );
  });

  it("uses saved asset background music setup for VIP render", async () => {
    mockedRunVideoVipProcessing.mockResolvedValueOnce(createVipProcessingResult());
    mockedGetIntakeDb.mockResolvedValueOnce({} as Awaited<ReturnType<typeof getIntakeDb>>);
    mockedGetVideoAssetById.mockResolvedValueOnce({
      _id: "asset-1",
      mimeType: "video/mp4",
      metadata: {
        title: "Music setup asset",
        videoEditSetup: {
          backgroundMusicEnabled: true,
          backgroundMusicVolume: 0.22,
          backgroundMusicTracks: [
            {
              source: "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3",
              label: "Across the Rivers of Asia",
              startSeconds: 0,
              volume: 1,
              repeat: true,
            },
            {
              source: "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3",
              label: "Across the Rivers of Asia",
              startSeconds: 300,
              volume: 0.5,
              repeat: false,
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
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundMusic: {
          enabled: true,
          volume: 0.22,
          tracks: [
            expect.objectContaining({
              source: "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3",
              startSeconds: 0,
              volume: 1,
              repeat: true,
            }),
            expect.objectContaining({
              startSeconds: 300,
              volume: 0.5,
              repeat: false,
            }),
          ],
        },
      }),
    );
  });

  it("rejects unsafe background music sources before VIP render", async () => {
    const formData = createFormData({
      backgroundMusicEnabled: "true",
      backgroundMusicVolume: "0.2",
      backgroundMusicTracksJson: JSON.stringify([
        {
          source: "/musics/../secret.mp3",
          startSeconds: 0,
          volume: 1,
          repeat: true,
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
      new Request("http://localhost/api/audio/video-vip-processing", {
        method: "POST",
        body: formData,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_DUBBING_MUSIC_INVALID",
    });
    expect(mockedRunVideoVipProcessing).not.toHaveBeenCalled();
  });

  it("passes configured provider RPM limits only into VIP processing", async () => {
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
        model: "cx/gpt-5.5",
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
        model: "cx/gpt-5.5",
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

    const formData = createFormData({
      providerId: "507f1f77bcf86cd799439010",
      metadataProviderId: "507f1f77bcf86cd799439011",
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

    expect(response.status).toBe(200);
    expect(mockedGetAiProviderById).toHaveBeenCalledWith({
      db: {},
      providerId: "507f1f77bcf86cd799439010",
    });
    expect(mockedGetAiProviderById).toHaveBeenCalledWith({
      db: {},
      providerId: "507f1f77bcf86cd799439011",
    });
    expect(mockedRunVideoVipProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        translationRateLimit: expect.objectContaining({
          key: "ai-provider:507f1f77bcf86cd799439010",
          rpm: 14,
        }),
        metadataRateLimit: expect.objectContaining({
          key: "ai-provider:507f1f77bcf86cd799439011",
          rpm: 14,
        }),
      }),
    );
  });

  it("maps storage asset download fetch failures to a structured VIP API error", async () => {
    mockedGetIntakeDb.mockResolvedValueOnce({} as Awaited<ReturnType<typeof getIntakeDb>>);
    mockedGetVideoAssetById.mockResolvedValueOnce({
      _id: "asset-1",
      mimeType: "video/mp4",
      metadata: { title: "Asset" },
    } as Awaited<ReturnType<typeof getVideoAssetById>>);
    mockedResolveAssetDownload.mockRejectedValueOnce(new TypeError("fetch failed"));

    const response = await POST(
      new Request("http://localhost/api/audio/video-vip-processing", {
        method: "POST",
        body: createFormData({ assetId: "asset-1" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "STG_ASSET_DOWNLOAD_FAILED",
      error: "Storage asset download failed: fetch failed",
    });
    expect(mockedRunVideoVipProcessing).not.toHaveBeenCalled();
  });

  describe("GET checkpoint", () => {
    it("rejects missing key", async () => {
      const response = await GET(
        new Request("http://localhost/api/audio/video-vip-processing"),
      );
      const payload = await response.json();
      expect(response.status).toBe(400);
      expect(payload).toMatchObject({
        ok: false,
        error: "key query parameter is required.",
      });
    });

    it("returns null if checkpoint does not exist", async () => {
      const response = await GET(
        new Request("http://localhost/api/audio/video-vip-processing?key=non-existent-key-123"),
      );
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload).toEqual({
        ok: true,
        data: null,
      });
    });

    it("returns parsed checkpoint content if it exists", async () => {
      const { createHash } = await import("node:crypto");
      const { mkdir, writeFile, rm } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const path = await import("node:path");

      const key = "test-key-abc";
      const hash = createHash("sha256").update(key).digest("hex");
      const dir = path.join(tmpdir(), "omnivideo-vip-stage-checkpoints", hash);
      const jsonPath = path.join(dir, "checkpoint.json");

      const mockCheckpoint = {
        fingerprint: "test-fingerprint",
        transcript: { text: "Hello", segments: [] },
        updatedAt: new Date().toISOString(),
      };

      await mkdir(dir, { recursive: true });
      await writeFile(jsonPath, JSON.stringify(mockCheckpoint));

      try {
        const response = await GET(
          new Request(`http://localhost/api/audio/video-vip-processing?key=${key}`),
        );
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload).toEqual({
          ok: true,
          data: mockCheckpoint,
        });
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe("DELETE checkpoint", () => {
    it("deletes specific key's checkpoint folder if key is provided", async () => {
      const { createHash } = await import("node:crypto");
      const { mkdir, writeFile, access } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const path = await import("node:path");

      const key = "delete-key-xyz";
      const hash = createHash("sha256").update(key).digest("hex");
      const dir = path.join(tmpdir(), "omnivideo-vip-stage-checkpoints", hash);
      const jsonPath = path.join(dir, "checkpoint.json");

      await mkdir(dir, { recursive: true });
      await writeFile(jsonPath, JSON.stringify({ ok: true }));

      const response = await DELETE(
        new Request(`http://localhost/api/audio/video-vip-processing?key=${key}`, {
          method: "DELETE",
        }),
      );
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        message: expect.stringContaining(`Checkpoint for key ${key} deleted.`),
      });

      await expect(access(jsonPath)).rejects.toThrow();
    });

    it("clears all checkpoint folders if key is not provided", async () => {
      const { mkdir, writeFile, access } = await import("node:fs/promises");
      const { tmpdir } = await import("node:os");
      const path = await import("node:path");

      const rootDir = path.join(tmpdir(), "omnivideo-vip-stage-checkpoints");
      const checkPath = path.join(rootDir, "test-file.txt");

      await mkdir(rootDir, { recursive: true });
      await writeFile(checkPath, "test");

      const response = await DELETE(
        new Request("http://localhost/api/audio/video-vip-processing", {
          method: "DELETE",
        }),
      );
      const payload = await response.json();
      expect(response.status).toBe(200);
      expect(payload).toMatchObject({
        ok: true,
        message: "All checkpoints cleared.",
      });

      await expect(access(checkPath)).rejects.toThrow();
    });
  });
});
