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

export const EDGE_TTS_VOICES = [
  {
    id: "vi-VN-HoaiMyNeural",
    label: "Vietnamese - HoaiMy",
    locale: "vi-VN",
    gender: "Female",
  },
  {
    id: "vi-VN-NamMinhNeural",
    label: "Vietnamese - Nam Minh",
    locale: "vi-VN",
    gender: "Male",
  },
  {
    id: "en-US-JennyNeural",
    label: "English - Jenny",
    locale: "en-US",
    gender: "Female",
  },
  {
    id: "en-US-GuyNeural",
    label: "English - Guy",
    locale: "en-US",
    gender: "Male",
  },
] as const;

export const EDGE_TTS_OUTPUT_FORMATS = [
  {
    id: "audio-24khz-48kbitrate-mono-mp3",
    label: "MP3 24kHz 48kbps mono",
    mimeType: "audio/mpeg",
    extension: "mp3",
  },
  {
    id: "audio-24khz-96kbitrate-mono-mp3",
    label: "MP3 24kHz 96kbps mono",
    mimeType: "audio/mpeg",
    extension: "mp3",
  },
  {
    id: "audio-48khz-192kbitrate-mono-mp3",
    label: "MP3 48kHz 192kbps mono",
    mimeType: "audio/mpeg",
    extension: "mp3",
  },
  {
    id: "webm-24khz-16bit-mono-opus",
    label: "WebM Opus 24kHz mono",
    mimeType: "audio/webm",
    extension: "webm",
  },
] as const;

export const DEFAULT_EDGE_TTS_SETTINGS = {
  voice: "vi-VN-HoaiMyNeural",
  rate: 0,
  pitch: 0,
  volume: 0,
  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
  preserveTimestampGaps: true,
} as const;

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

export type EdgeTtsVoiceId = (typeof EDGE_TTS_VOICES)[number]["id"] | string;
export type EdgeTtsOutputFormat =
  (typeof EDGE_TTS_OUTPUT_FORMATS)[number]["id"];

export type VoiceGenerationSettings = {
  voice: EdgeTtsVoiceId;
  rate: number;
  pitch: number;
  volume: number;
  outputFormat: EdgeTtsOutputFormat;
  preserveTimestampGaps: boolean;
};

export type VoiceGenerationSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
};

export type VoiceGenerationResult = {
  audioBase64: string;
  mimeType: string;
  extension: string;
  fileName: string;
  byteLength: number;
  segmentCount: number;
  alignment: {
    mode: "natural" | "timeline";
    targetDurationSeconds?: number;
    chunks: number;
  };
  settings: VoiceGenerationSettings;
  provider: {
    name: "edge-tts";
    connectionId: string;
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
  | "PRV_GROQ_TRANSLATION_FAILED"
  | "VAL_TTS_SEGMENTS_REQUIRED"
  | "VAL_TTS_CONFIG_INVALID"
  | "PRV_EDGE_TTS_FAILED";

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
