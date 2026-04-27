export type AudioTimestampGranularity = "segment" | "word";

export const DEFAULT_TRANSLATION_MODEL = "llama-3.1-8b-instant";

export const GROQ_TRANSLATION_MODELS = [
  {
    id: "llama-3.1-8b-instant",
    label: "Llama 3.1 8B Instant 128k",
  },
  {
    id: "llama-3.3-70b-versatile",
    label: "Llama 3.3 70B Versatile",
  },
  {
    id: "openai/gpt-oss-20b",
    label: "GPT-OSS 20B",
  },
  {
    id: "openai/gpt-oss-120b",
    label: "GPT-OSS 120B",
  },
  {
    id: "qwen/qwen3-32b",
    label: "Qwen3 32B",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    label: "Llama 4 Scout 17B 16E",
  },
];

export type ChineseTranscriptionRequest = {
  fileName: string;
  mimeType?: string;
  fileSizeBytes: number;
  fileBytes: Uint8Array;
  language?: string;
  prompt?: string;
  includeWordTimestamps?: boolean;
};

export type AudioTranscriptionStep = {
  id: "validate" | "extract-audio" | "check-upload-size" | "groq-transcribe";
  label: string;
  status: "success" | "failed" | "skipped";
  detail: string;
  metrics?: Record<string, string | number | boolean>;
};

export type AudioTranscriptSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export type AudioTranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptTranslationSegment = {
  id: number;
  start: number;
  end: number;
  sourceText: string;
  translatedText: string;
};

export type TranscriptTranslationResult = {
  sourceLanguage: string;
  targetLanguage: string;
  model: string;
  translatedSegments: TranscriptTranslationSegment[];
  chunks: Array<{
    index: number;
    segmentCount: number;
  }>;
  provider: {
    name: "groq";
    requestId?: string;
  };
};

export type ChineseTranscriptionResult = {
  text: string;
  language: string;
  model: "whisper-large-v3-turbo";
  segments: AudioTranscriptSegment[];
  words: AudioTranscriptWord[];
  source: {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
  };
  audio: {
    format: "mp3";
    sampleRate: 16000;
    channels: 1;
    bitrateKbps: 64;
    fileSizeBytes: number;
  };
  steps: AudioTranscriptionStep[];
  provider: {
    name: "groq";
    requestId?: string;
  };
};

export type ChineseTranscriptionErrorCode =
  | "VAL_AUDIO_FILE_REQUIRED"
  | "VAL_AUDIO_FILE_UNSUPPORTED"
  | "VAL_AUDIO_FILE_TOO_LARGE"
  | "CFG_GROQ_API_KEY_MISSING"
  | "SYS_AUDIO_EXTRACTION_FAILED"
  | "PRV_GROQ_TRANSCRIPTION_FAILED"
  | "VAL_TRANSLATION_SEGMENTS_REQUIRED"
  | "PRV_GROQ_TRANSLATION_FAILED";

export class ChineseTranscriptionError extends Error {
  constructor(
    public readonly code: ChineseTranscriptionErrorCode,
    message: string,
    public readonly status = 422,
    public readonly steps: AudioTranscriptionStep[] = [],
  ) {
    super(message);
    this.name = "ChineseTranscriptionError";
  }
}
