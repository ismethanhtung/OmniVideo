import { DEFAULT_GEMINI_TEXT_MODEL } from "@/lib/ai-providers/default-provider";
import type { AiProviderRateLimit } from "@/lib/ai-providers/rate-limit";

export type AudioTimestampGranularity = "segment" | "word";

export const DEFAULT_TRANSLATION_MODEL = DEFAULT_GEMINI_TEXT_MODEL;

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
        id: "openai/gpt-oss-safeguard-20b",
        label: "GPT OSS Safeguard 20B",
    },
    {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        label: "Llama 4 Scout 17B 16E",
    },
];

export const DEFAULT_PIPER_TTS_SETTINGS = {
    binaryPath: "piper",
    modelPath: "",
    configPath: "",
    speaker: 0,
    lengthScale: 1,
    noiseScale: 0.667,
    noiseW: 0.8,
    sentenceSilence: 0.2,
    preserveTimestampGaps: true,
    alignmentMode: "balanced",
} as const;

export const PIPER_TTS_ALIGNMENT_SETTINGS = {
    timelineGapBorrowRatio: 0.75,
    maxTimelineGapBorrowSeconds: 0.75,
    timelineLeadBorrowRatio: 0.75,
    maxTimelineLeadBorrowSeconds: 0.35,
    timelineMinInterSpeechGapSeconds: 0.04,
    timelineSegmentSentenceSilenceSeconds: 0.05,
    timelineMinSpeedFactor: 1.25,
    timelineMaxSpeedFactor: 1.75,
    highTimelineSpeedFactor: 1.35,
    balancedMaxPauseSeconds: 0.1,
    balancedMaxSpeedFactor: 1.75,
    balancedLongPauseSeconds: 0.7,
    balancedDriftWarningSeconds: 0.35,
} as const;

export type ChineseTranscriptionRequest = {
    fileName: string;
    mimeType?: string;
    fileSizeBytes: number;
    fileBytes: Uint8Array;
    videoSpeedFactor?: number;
    language?: string;
    prompt?: string;
    transcriptionModel?: string;
    transcriptionApiKey?: string;
    transcriptionBaseUrl?: string;
    transcriptionProviderName?: string;
    transcriptionRateLimit?: AiProviderRateLimit;
    includeWordTimestamps?: boolean;
    overlongSegmentRetryMode?: "strict" | "best-effort";
    retryPromptHardConstraint?: boolean;
};

export type AudioTranscriptionStep = {
    id:
        | "validate"
        | "extract-audio"
        | "check-upload-size"
        | "groq-transcribe";
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
    speechEnd?: number;
};

export type TranscriptTranslationResult = {
    sourceLanguage: string;
    targetLanguage: string;
    model: string;
    translatedSegments: TranscriptTranslationSegment[];
    /**
     * Total time (ms) to translate transcript segments with the selected AI provider.
     */
    generationDurationMs: number;
    chunks: Array<{
        index: number;
        segmentCount: number;
    }>;
    provider: {
        name: string;
        requestId?: string;
    };
    totalTokensUsed?: number;
    totalCachedPromptTokens?: number;
};

export type VietnameseVideoMetadataResult = {
    title: string;
    description: string;
    hashtags: string[];
    model: string;
    provider: {
        name: string;
        requestId?: string;
    };
};

export type VoiceGenerationSettings = {
    binaryPath: string;
    modelPath: string;
    configPath?: string;
    speaker?: number;
    lengthScale?: number;
    noiseScale?: number;
    noiseW?: number;
    sentenceSilence?: number;
    preserveTimestampGaps: boolean;
    alignmentMode?: "strict" | "balanced";
};

export type VoiceGenerationSegment = {
    id: number;
    sourceSegmentId?: number;
    start: number;
    end: number;
    text: string;
};

export type VoiceSegmentTimingDiagnostic = {
    segmentId: number;
    code: "SUSPICIOUS_WORD_TIMESTAMP_REPAIRED";
    severity: "warning";
    message: string;
    originalStart: number;
    originalEnd: number;
    repairedStart: number;
    repairedEnd: number;
    suspiciousWords: Array<{
        word: string;
        start: number;
        end: number;
        durationSeconds: number;
    }>;
};

export type VoiceGenerationResult = {
    audioBase64: string;
    mimeType: string;
    extension: string;
    fileName: string;
    byteLength: number;
    segmentCount: number;
    /**
     * Total time (ms) to synthesize Piper audio for the provided segments.
     * Includes any segment synthesis + concatenation/alignment steps.
     */
    generationDurationMs: number;
    alignment: {
        mode: "natural" | "timeline" | "balanced";
        targetDurationSeconds?: number;
        chunks: number;
        timeline?: {
            segmentId: number;
            sourceSegmentId?: number;
            start: number;
            end: number;
            slotDurationSeconds: number;
            rawDurationSeconds: number;
            targetDurationSeconds: number;
            borrowedGapSeconds: number;
            borrowedLeadSeconds?: number;
            speedFactor: number;
            tempoFilter: string;
            scheduledStartSeconds?: number;
            scheduledEndSeconds?: number;
            pauseBeforeSeconds?: number;
            driftSeconds?: number;
            warningCodes: string[];
        }[];
        processingChunks?: {
            index: number;
            segmentCount: number;
            start: number;
            end: number;
            durationSeconds: number;
        }[];
        warnings?: string[];
    };
    settings: VoiceGenerationSettings;
    provider: {
        name: "piper";
        mode: "local-cli";
    };
};

export type ChineseTranscriptionResult = {
    text: string;
    language: string;
    model: string;
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
        durationSeconds?: number;
        audioPreviewBase64?: string;
    };
    steps: AudioTranscriptionStep[];
    provider: {
        name: string;
        requestId?: string;
    };
};

export type ChineseTranscriptionErrorCode =
    | "VAL_AUDIO_FILE_REQUIRED"
    | "VAL_AUDIO_FILE_UNSUPPORTED"
    | "VAL_AUDIO_FILE_TOO_LARGE"
    | "CFG_GROQ_API_KEY_MISSING"
    | "SYS_AUDIO_EXTRACTION_FAILED"
    | "PRV_TRANSCRIPTION_FAILED"
    | "PRV_GROQ_TRANSCRIPTION_FAILED"
    | "PRV_GROQ_SEGMENT_RETRY_EXHAUSTED"
    | "VAL_TRANSLATION_SEGMENTS_REQUIRED"
    | "VAL_TRANSLATION_IMPORT_REQUIRED"
    | "VAL_TRANSLATION_IMPORT_INVALID"
    | "VAL_TRANSLATION_SEGMENT_COUNT_MISMATCH"
    | "VAL_TRANSCRIPT_OVERRIDE_INVALID"
    | "PRV_GROQ_TRANSLATION_FAILED"
    | "VAL_TTS_SEGMENTS_REQUIRED"
    | "VAL_PIPER_TTS_TEXT_REQUIRED"
    | "VAL_PIPER_TTS_BINARY_REQUIRED"
    | "VAL_PIPER_TTS_MODEL_REQUIRED"
    | "VAL_PIPER_TTS_CONFIG_NOT_FOUND"
    | "CFG_PIPER_TTS_RUNTIME_MISSING"
    | "PRV_PIPER_TTS_FAILED"
    | "VAL_DUBBING_VIDEO_REQUIRED"
    | "VAL_DUBBING_MUSIC_INVALID"
    | "CFG_REPLICATE_TOKEN_MISSING"
    | "VAL_REPLICATE_SPLEETER_MODEL_INVALID"
    | "PRV_REPLICATE_SPLEETER_REQUEST_FAILED"
    | "PRV_REPLICATE_SPLEETER_FAILED"
    | "PRV_REPLICATE_SPLEETER_POLL_INVALID"
    | "PRV_REPLICATE_SPLEETER_TIMEOUT"
    | "PRV_REPLICATE_SPLEETER_OUTPUT_INVALID"
    | "PRV_REPLICATE_SPLEETER_DOWNLOAD_FAILED"
    | "SYS_SOURCE_VOCAL_ISOLATION_FAILED"
    | "STG_ASSET_DOWNLOAD_FAILED"
    | "SYS_DUBBING_MUX_FAILED";

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
