import type {
  AudioTranscriptionStep,
  ChineseTranscriptionResult,
  TranscriptTranslationResult,
  VietnameseVideoMetadataResult,
} from "./types";

export const TRANSCRIPT_SESSION_STORAGE_KEY = "omnivideo.audioTranscript.session.v1";

export type TranscriptSessionState = {
  language: string;
  prompt: string;
  includeWordTimestamps: boolean;
  selectedProviderId: string;
  translationModel: string;
  selectedAssetId: string;
  segmentView: "source" | "translation";
  steps: AudioTranscriptionStep[];
  result: ChineseTranscriptionResult | null;
  translation: TranscriptTranslationResult | null;
  videoMetadata: VietnameseVideoMetadataResult | null;
};

export function serializeTranscriptSession(
  state: TranscriptSessionState,
): string {
  const slimState: TranscriptSessionState = {
    ...state,
    result: state.result
      ? {
          ...state.result,
          // Avoid localStorage quota overflow.
          words: state.result.words.slice(0, 500),
          audio: {
            ...state.result.audio,
            audioPreviewBase64: undefined,
          },
        }
      : null,
  };

  return JSON.stringify(slimState);
}

export function parseTranscriptSession(raw: string | null): TranscriptSessionState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TranscriptSessionState>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.segmentView !== "source" && parsed.segmentView !== "translation") {
      return null;
    }
    return {
      language: parsed.language ?? "zh",
      prompt: parsed.prompt ?? "",
      includeWordTimestamps: parsed.includeWordTimestamps ?? true,
      selectedProviderId: parsed.selectedProviderId ?? "",
      translationModel: parsed.translationModel ?? "",
      selectedAssetId: parsed.selectedAssetId ?? "",
      segmentView: parsed.segmentView,
      steps: Array.isArray(parsed.steps) ? parsed.steps : [],
      result: parsed.result ?? null,
      translation: parsed.translation ?? null,
      videoMetadata: parsed.videoMetadata ?? null,
    };
  } catch {
    return null;
  }
}
