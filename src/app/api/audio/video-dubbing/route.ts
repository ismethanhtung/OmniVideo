import { NextResponse } from "next/server";

import { resolveAssetDownload } from "@/lib/storage/asset-download";
import { runVideoDubbing } from "@/lib/multilingual-audio/video-dubbing";
import {
  ChineseTranscriptionError,
  type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";
import { getIntakeDb, getVideoAssetById } from "@/lib/video-intake/repository";

export const runtime = "nodejs";

function readFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readFormValue(formData, key);
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readOptionalBoolean(formData: FormData, key: string) {
  const value = readFormValue(formData, key);
  if (!value.trim()) return undefined;
  return value === "true";
}

async function readStorageAssetVideo(assetId: string) {
  const db = await getIntakeDb();
  const asset = await getVideoAssetById({ db, assetId });

  if (!asset) {
    throw new ChineseTranscriptionError(
      "VAL_DUBBING_VIDEO_REQUIRED",
      "Storage asset was not found.",
      404,
    );
  }

  const download = await resolveAssetDownload({
    db,
    asset,
    disposition: "attachment",
  });

  if (!download.ok) {
    throw new ChineseTranscriptionError(
      "VAL_DUBBING_VIDEO_REQUIRED",
      download.error,
      download.status,
    );
  }

  const arrayBuffer = await new Response(download.body).arrayBuffer();
  return {
    fileName: `${asset.metadata?.title ?? assetId}.mp4`,
    mimeType: download.headers.get("content-type") ?? asset.mimeType ?? "video/mp4",
    fileBytes: new Uint8Array(arrayBuffer),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("videoFile");
    const assetId = readFormValue(formData, "assetId").trim();
    const providerId = readFormValue(formData, "providerId").trim();
    let source:
      | {
          fileName: string;
          mimeType?: string;
          fileBytes: Uint8Array;
        }
      | undefined;

    if (file instanceof File) {
      source = {
        fileName: file.name || "source.mp4",
        mimeType: file.type || undefined,
        fileBytes: new Uint8Array(await file.arrayBuffer()),
      };
    } else if (assetId) {
      source = await readStorageAssetVideo(assetId);
    }

    if (!source) {
      throw new ChineseTranscriptionError(
        "VAL_DUBBING_VIDEO_REQUIRED",
        "videoFile or assetId is required.",
        400,
      );
    }

    let apiKey: string | undefined;
    let baseUrl: string | undefined;
    let providerName: string | undefined;

    if (providerId) {
      const { getAiProviderById, getAiProvidersDb } = await import(
        "@/lib/ai-providers/repository"
      );
      const db = await getAiProvidersDb();
      const provider = await getAiProviderById({ db, providerId });
      apiKey = provider.apiKey;
      baseUrl = provider.baseUrl;
      providerName = provider.label;
    }

    const ttsSettings: Partial<VoiceGenerationSettings> = {
      binaryPath: readFormValue(formData, "ttsBinaryPath") || undefined,
      modelPath: readFormValue(formData, "ttsModelPath") || undefined,
      configPath: readFormValue(formData, "ttsConfigPath") || undefined,
      speaker: readOptionalNumber(formData, "ttsSpeaker"),
      lengthScale: readOptionalNumber(formData, "ttsLengthScale"),
      noiseScale: readOptionalNumber(formData, "ttsNoiseScale"),
      noiseW: readOptionalNumber(formData, "ttsNoiseW"),
      sentenceSilence: readOptionalNumber(formData, "ttsSentenceSilence"),
      preserveTimestampGaps: readOptionalBoolean(
        formData,
        "ttsPreserveTimestampGaps",
      ),
    };

    const result = await runVideoDubbing({
      fileName: source.fileName,
      mimeType: source.mimeType,
      fileSizeBytes: source.fileBytes.byteLength,
      fileBytes: source.fileBytes,
      language: readFormValue(formData, "language") || "zh",
      prompt: readFormValue(formData, "prompt") || undefined,
      includeWordTimestamps:
        readOptionalBoolean(formData, "includeWordTimestamps") ?? true,
      sourceLanguage: readFormValue(formData, "sourceLanguage") || undefined,
      targetLanguage: readFormValue(formData, "targetLanguage") || "vi",
      model: readFormValue(formData, "model") || undefined,
      apiKey,
      baseUrl,
      providerName,
      ttsSettings,
      originalAudioVolume: readOptionalNumber(formData, "originalAudioVolume"),
      voiceVolume: readOptionalNumber(formData, "voiceVolume"),
    });

    const totalTokensUsed =
      "totalTokensUsed" in result.translation &&
      typeof result.translation.totalTokensUsed === "number"
        ? result.translation.totalTokensUsed
        : 0;

    if (providerId && totalTokensUsed > 0) {
      try {
        const { getAiProvidersDb, incrementAiProviderUsage } = await import(
          "@/lib/ai-providers/repository"
        );
        const { logAiProviderUsage } = await import("@/lib/ai-providers/usage");
        const db = await getAiProvidersDb();
        await incrementAiProviderUsage({
          db,
          providerId,
          tokensUsed: totalTokensUsed,
        });
        await logAiProviderUsage(db, {
          providerId,
          model: result.translation.model,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: totalTokensUsed,
          requestId: result.translation.provider.requestId,
          feature: "video-dubbing-translation",
        });
      } catch {
        // usage tracking is best-effort
      }
    }

    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    if (error instanceof ChineseTranscriptionError) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: error.code,
          error: error.message,
          steps: error.steps,
        },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_DUBBING_MUX_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Video dubbing API failed.",
      },
      { status: 500 },
    );
  }
}
