"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    Copy,
    Download,
    Eye,
    Film,
    Loader2,
    Music,
    RadioTower,
    RefreshCw,
    Send,
    SlidersHorizontal,
    Sparkles,
    SunMedium,
    Type,
    Video,
    Volume2,
    X,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import {
    buildColorGradeCssFilter,
    type ColorGradeFilterOptions,
} from "@/lib/video-processing/color-grade";
import type {
    AudioTranscriptionStep,
    ChineseTranscriptionResult,
} from "@/lib/multilingual-audio/types";

const REPO_PIPER_BINARY = "piper";
const REPO_PIPER_MODEL = "";
const REPO_PIPER_CONFIG = "";
const DEFAULT_TRANSCRIPTION_MODEL = "whisper-large-v3-turbo";

type PiperTtsApiPayload =
    | {
          ok: true;
          data: {
              audioBase64: string;
              mimeType: "audio/wav";
              extension: "wav";
              byteLength: number;
              durationMs: number;
              settings: {
                  modelPath: string;
                  configPath?: string;
                  speaker?: number;
                  lengthScale?: number;
                  noiseScale?: number;
                  noiseW?: number;
                  sentenceSilence?: number;
              };
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };
type VoiceGenerationApiPayload =
    | {
          ok: true;
          data: {
              audioBase64: string;
              mimeType: "audio/wav";
              extension: "wav";
              byteLength: number;
              generationDurationMs: number;
              segmentCount: number;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type StoredVideoAsset = {
    _id: string;
    sizeBytes?: number | null;
    metadata?: {
        title?: string | null;
        tags?: string[] | null;
        folder?: string | null;
    };
    storageProvider?: string;
};

type AiProviderOption = {
    _id: string;
    label: string;
    providerType: string;
    status: string;
};

type AiModelOption = {
    id: string;
    name: string;
};

type LocalPiperModel = {
    id: string;
    label: string;
    modelPath: string;
    configPath: string;
};

type TranscriptionApiPayload =
    | {
          ok: true;
          data: ChineseTranscriptionResult;
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
          steps?: AudioTranscriptionStep[];
      };

type ReplicateResolvedTarget = {
    mode: string;
    endpoint: string;
    version?: string;
};

type ReplicatePredictionPayload =
    | {
          ok: true;
          data: {
              prediction: {
                  id?: string;
                  status?: string;
                  output?: unknown;
                  logs?: string;
                  error?: unknown;
                  urls?: {
                      get?: string;
                      web?: string;
                  };
                  [key: string]: unknown;
              };
              warnings: string[];
              resolved: ReplicateResolvedTarget;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

type ReplicateSchemaField = {
    key: string;
    title: string;
    type: string;
    format: string;
    description: string;
    default?: unknown;
    enum?: unknown[];
    likelyFileInput: boolean;
};

type ReplicateSchemaPayload =
    | {
          ok: true;
          data: {
              mode: string;
              version: string;
              inputProperties: ReplicateSchemaField[];
              suggestedFileKeys: string[];
              note?: string;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

const DEFAULT_REPLICATE_INPUT = JSON.stringify(
    {
        width: 1024,
        height: 768,
        prompt: "Cô gái dọn dẹp tủ đồ, định vứt một chiếc áo khoác phao cũ, sờn rách ở tay áo. Anh chồng đi qua nhìn thấy, liền nhặt lại và treo vào tủ.",
        go_fast: false,
        output_format: "jpg",
        guidance_scale: 0,
        output_quality: 80,
        num_inference_steps: 8,
    },
    null,
    2,
);
const DEFAULT_STYLE_LOCK =
    "Một phong cách duy nhất cho toàn bộ video: cinematic Vietnamese drama, semi-realistic anime/manhua illustration, soft film lighting, warm emotional color grading, detailed fabric texture, natural proportions, consistent camera lens and composition language.";
const DEFAULT_CHARACTER_LOCK =
    "Nhân vật chính phải giữ nguyên qua mọi ảnh: cô gái trẻ người Việt, tóc đen dài ngang vai, khuôn mặt thanh tú hơi buồn, dáng người nhỏ, mặc áo len sáng màu; người chồng dáng cao gầy, tóc đen ngắn, áo khoác tối màu, biểu cảm ít nói nhưng dịu dàng.";
const DEFAULT_CONTINUITY_LOCK =
    "Không đổi phong cách đồ họa, độ tuổi, kiểu tóc, màu tóc, khuôn mặt, trang phục chính, tỉ lệ cơ thể và mood ánh sáng giữa các cảnh. Mỗi ảnh là một cảnh khác nhau nhưng thuộc cùng một bộ phim.";

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds)) return "00:00.000";
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds - minutes * 60;
    return `${String(minutes).padStart(2, "0")}:${remaining
        .toFixed(3)
        .padStart(6, "0")}`;
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes)) return "n/a";
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
}

function collectOutputUrls(value: unknown, urls: string[] = []) {
    if (typeof value === "string") {
        if (/^(https?:\/\/|data:)/iu.test(value)) urls.push(value);
        return urls;
    }
    if (Array.isArray(value)) {
        for (const item of value) collectOutputUrls(item, urls);
        return urls;
    }
    if (value && typeof value === "object") {
        for (const item of Object.values(value)) collectOutputUrls(item, urls);
    }
    return urls;
}

function classifyMediaUrl(url: string) {
    const lower = url.toLowerCase();
    if (
        lower.startsWith("data:image/") ||
        /\.(png|jpe?g|webp|gif)(\?|$)/u.test(lower)
    ) {
        return "image";
    }
    if (
        lower.startsWith("data:audio/") ||
        /\.(wav|mp3|m4a|ogg|flac)(\?|$)/u.test(lower)
    ) {
        return "audio";
    }
    if (
        lower.startsWith("data:video/") ||
        /\.(mp4|webm|mov)(\?|$)/u.test(lower)
    ) {
        return "video";
    }
    return "link";
}

interface ExtractorFormat {
    formatId: string;
    ext: string;
    resolution?: string | null;
    formatNote?: string | null;
    filesize?: number | null;
    hasVideo?: boolean;
    hasAudio?: boolean;
}

interface ExtractorResult {
    title?: string | null;
    originPlatform?: string | null;
    durationMs?: number | null;
    formats?: ExtractorFormat[];
}

export type ZeroTtsVoiceOption = {
    id: string;
    name: string;
    gender: string;
    region: string;
    description: string;
    isPreset: boolean;
    filePath?: string;
    format?: string;
};

export type ZeroTtsApiPayload =
    | {
          ok: true;
          data: {
              audioBase64: string;
              mimeType: "audio/wav";
              extension: "wav";
              byteLength: number;
              durationMs: number;
              sampleRate: number;
              generationDurationMs: number;
              text: string;
              normalizedText: string;
              voice: string;
              speed: number;
              modelId: string;
              wordTimestamps?: Array<{
                  word: string;
                  start: number;
                  end: number;
              }>;
              isRealInference?: boolean;
          };
      }
    | {
          ok: false;
          errorCode?: string;
          error?: string;
      };

export type CapCutCaptionStyle =
    | "capcut_yellow"
    | "cinematic_white"
    | "neon_emerald"
    | "sunset_orange"
    | "clean_yellow"
    | "clean_white"
    | "clean_emerald"
    | "clean_sunset"
    | "pure_cinema";
export type CapCutCaptionPosition = "bottom" | "center" | "top";
export type CapCutCaptionSize = "sm" | "md" | "lg";

export interface TimedWord {
    word: string;
    start: number;
    end: number;
    index: number;
}

export function buildPunctuationAwareWordTimeline(
    text: string,
    durationSec: number,
    sentenceSilence: number = 0.2,
): TimedWord[] {
    if (!text || !text.trim() || durationSec <= 0) return [];

    const words = text.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    // Account for TTS trailing silence decay (typically ~0.35s in synthesized audio)
    const effectiveSpeechDuration = Math.max(0.5, durationSec - 0.35);

    // Compute weights for each word based on character length and punctuation pauses
    const weights: number[] = [];
    for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const cleanLen = Math.max(1, w.replace(/[^\p{L}\p{N}]/gu, "").length);
        let weight = Math.pow(cleanLen, 0.85);

        // Add pause weight for punctuation
        if (/[,;:\-—]$/u.test(w)) {
            weight += 2.2;
        } else if (/[.!?…]$/u.test(w)) {
            weight += 3.0;
        }
        weights.push(weight);
    }

    const totalWeight = weights.reduce((acc, v) => acc + v, 0) || 1.0;
    const timeline: TimedWord[] = [];
    let cursor = 0.05; // slight onset delay (~50ms) for TTS initial phoneme attack
    const usableTime = Math.max(0.2, effectiveSpeechDuration - cursor);

    for (let i = 0; i < words.length; i++) {
        const wordWeight = weights[i];
        const wordDuration = (wordWeight / totalWeight) * usableTime;
        const start = cursor;
        const end = cursor + wordDuration;
        timeline.push({
            word: words[i],
            start: Math.round(start * 1000) / 1000,
            end: Math.round(end * 1000) / 1000,
            index: i,
        });
        cursor = end;
    }

    return timeline;
}

export interface ColorGradePreset {
    id: string;
    label: string;
    desc: string;
    badge: string;
    brightness: number;
    contrast: number;
    saturation: number;
    gamma: number;
    vignette: number;
    temperature: number;
    hue: number;
    vibrance: number;
    sepia: number;
    tint: number;
}

export const COLOR_GRADE_PRESETS: ColorGradePreset[] = [
    {
        id: "moody_dark",
        label: "Moody Melancholic (Trầm Buồn & Đậm Tối)",
        desc: "Hạ độ sáng, nâng tương phản sâu, giảm nhẹ màu và thêm viền tối vignette tạo cảm giác sâu lắng, hoài niệm, drama.",
        badge: "Tâm trạng buồn / Cinematic",
        brightness: -0.18,
        contrast: 1.25,
        saturation: 0.85,
        gamma: 0.9,
        vignette: 0.45,
        temperature: -12,
        hue: 0,
        vibrance: -0.1,
        sepia: 0,
        tint: 0,
    },
    {
        id: "anti_overexposure",
        label: "Anti-Overexposure (Cứu Chói Sáng / Cam Cũ)",
        desc: "Kéo giảm dải highlight bị cháy trắng, cân bằng đường cong gamma để phục hồi chi tiết khuôn mặt và bầu trời.",
        badge: "Fix cam cũ / Chói nắng",
        brightness: -0.16,
        contrast: 1.15,
        saturation: 1.05,
        gamma: 0.82,
        vignette: 0.0,
        temperature: 0,
        hue: 0,
        vibrance: 0.05,
        sepia: 0,
        tint: 0,
    },
    {
        id: "cinematic_vintage",
        label: "Cinematic Warm Vintage (Phim Cổ Điển Ấm)",
        desc: "Tone màu vàng hổ phách dịu mắt, tương phản phim điện ảnh, chút sepia hoài cổ và viền tối.",
        badge: "Hoài niệm / Kể chuyện",
        brightness: -0.06,
        contrast: 1.12,
        saturation: 1.1,
        gamma: 0.95,
        vignette: 0.25,
        temperature: 18,
        hue: 0,
        vibrance: 0.05,
        sepia: 12,
        tint: 2,
    },
    {
        id: "film_noir",
        label: "Deep Noir (Đen Trắng Nghệ Thuật)",
        desc: "Triệt tiêu màu hoàn toàn, đẩy tương phản đen trắng gắt, làm nổi bật đường nét và cảm xúc cô độc.",
        badge: "Đen trắng / Bí ẩn",
        brightness: -0.1,
        contrast: 1.35,
        saturation: 0.0,
        gamma: 0.85,
        vignette: 0.55,
        temperature: 0,
        hue: 0,
        vibrance: 0,
        sepia: 0,
        tint: 0,
    },
    {
        id: "cold_sad",
        label: "Cold Melancholy (Lạnh Lùng & Tuyệt Vọng)",
        desc: "Tone xanh xám lạnh buốt, hạ nhiệt độ màu, giảm bão hòa, tạo không khí cô đơn lạnh lẽo giữa trời đông.",
        badge: "Tone lạnh / U sầu",
        brightness: -0.14,
        contrast: 1.2,
        saturation: 0.75,
        gamma: 0.92,
        vignette: 0.35,
        temperature: -28,
        hue: 0,
        vibrance: -0.05,
        sepia: 0,
        tint: -6,
    },
    {
        id: "golden_hour",
        label: "Golden Hour (Giờ Vàng Điện Ảnh)",
        desc: "Ánh nắng hoàng hôn ấm áp, nâng nhẹ tông vàng cam, tăng rực màu tự nhiên cho khung hình lung linh.",
        badge: "Ấm áp / Hoàng hôn",
        brightness: 0.02,
        contrast: 1.08,
        saturation: 1.15,
        gamma: 1.0,
        vignette: 0.22,
        temperature: 26,
        hue: 0,
        vibrance: 0.15,
        sepia: 10,
        tint: 6,
    },
    {
        id: "teal_orange",
        label: "Teal & Orange (Hollywood Blockbuster)",
        desc: "Công thức kinh điển Hollywood: da ấm cam, vùng tối ngả xanh teal, tương phản điện ảnh đậm đà.",
        badge: "Blockbuster / Điện ảnh",
        brightness: -0.05,
        contrast: 1.22,
        saturation: 1.15,
        gamma: 0.98,
        vignette: 0.3,
        temperature: 12,
        hue: 0,
        vibrance: 0.1,
        sepia: 0,
        tint: 6,
    },
    {
        id: "clean_commercial",
        label: "Clean Bright Commercial (Thương Mại Sáng Sạch)",
        desc: "Tăng sáng nhẹ, giữ tương phản vừa phải, màu tươi sạch và trong trẻo cho video quảng cáo, bán hàng.",
        badge: "Sáng sạch / Bán hàng",
        brightness: 0.06,
        contrast: 1.05,
        saturation: 1.08,
        gamma: 1.05,
        vignette: 0.05,
        temperature: 4,
        hue: 0,
        vibrance: 0.1,
        sepia: 0,
        tint: 0,
    },
    {
        id: "cyberpunk_neon",
        label: "Cyberpunk Neon (Tân Tương Lai Neon)",
        desc: "Đẩy tương phản và bão hòa mạnh, ám tím hồng neon kết hợp vùng lạnh xanh, phong cách gaming/tương lai.",
        badge: "Neon / Tương lai",
        brightness: -0.08,
        contrast: 1.3,
        saturation: 1.35,
        gamma: 0.95,
        vignette: 0.4,
        temperature: -18,
        hue: 0,
        vibrance: 0.2,
        sepia: 0,
        tint: 14,
    },
    {
        id: "sepia_nostalgia",
        label: "Sepia Nostalgia (Hoài Niệm Sepia)",
        desc: "Nhuộm tone nâu sepia cổ điển, giảm bão hòa nhẹ và thêm viền tối để tái hiện ký ức xưa cũ.",
        badge: "Sepia / Xưa cũ",
        brightness: -0.02,
        contrast: 1.08,
        saturation: 0.9,
        gamma: 0.98,
        vignette: 0.32,
        temperature: 14,
        hue: 0,
        vibrance: -0.05,
        sepia: 55,
        tint: 0,
    },
    {
        id: "vivid_pop",
        label: "Vivid Pop (Rực Rỡ TikTok / Quảng Cáo)",
        desc: "Ép màu cực rực, tăng vibrance và tương phản để video bắt mắt, nổi bật trên feed mạng xã hội.",
        badge: "Rực rỡ / Viral",
        brightness: 0.04,
        contrast: 1.18,
        saturation: 1.35,
        gamma: 1.02,
        vignette: 0.12,
        temperature: 6,
        hue: 0,
        vibrance: 0.25,
        sepia: 0,
        tint: 0,
    },
    {
        id: "natural_reset",
        label: "Original (Gốc)",
        desc: "Khôi phục toàn bộ thông số màu và ánh sáng về mặc định gốc của video.",
        badge: "Mặc định",
        brightness: 0.0,
        contrast: 1.0,
        saturation: 1.0,
        gamma: 1.0,
        vignette: 0.0,
        temperature: 0,
        hue: 0,
        vibrance: 0,
        sepia: 0,
        tint: 0,
    },
];

type PiperTtsSandboxPanelProps = {
    section: LeftbarNavItem;
};

export function PiperTtsSandboxPanel({ section }: PiperTtsSandboxPanelProps) {
    const Icon = section.icon ?? RadioTower;
    const [file, setFile] = useState<File | null>(null);
    const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
    const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([]);
    const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
    const [isLoadingAiProviders, setIsLoadingAiProviders] = useState(false);
    const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [showAssetBrowser, setShowAssetBrowser] = useState(false);
    const [assetSearchQuery, setAssetSearchQuery] = useState("");
    const [language, setLanguage] = useState("zh");
    const [
        selectedTranscriptionProviderId,
        setSelectedTranscriptionProviderId,
    ] = useState("");
    const [transcriptionModel, setTranscriptionModel] = useState(
        DEFAULT_TRANSCRIPTION_MODEL,
    );
    const [includeWordTimestamps, setIncludeWordTimestamps] = useState(true);
    const [retryPromptHardConstraint, setRetryPromptHardConstraint] =
        useState(true);
    const [transcriptPrompt, setTranscriptPrompt] = useState("");
    const [isRunningTranscript, setIsRunningTranscript] = useState(false);
    const [transcriptError, setTranscriptError] = useState<string | null>(null);
    const [transcriptSteps, setTranscriptSteps] = useState<
        AudioTranscriptionStep[]
    >([]);
    const [transcriptResult, setTranscriptResult] =
        useState<ChineseTranscriptionResult | null>(null);
    const [binaryPath, setBinaryPath] = useState(REPO_PIPER_BINARY);
    const [modelPath, setModelPath] = useState(REPO_PIPER_MODEL);
    const [configPath, setConfigPath] = useState(REPO_PIPER_CONFIG);
    const [piperModels, setPiperModels] = useState<LocalPiperModel[]>([]);
    const [isLoadingPiperModels, setIsLoadingPiperModels] = useState(true);
    const [speaker, setSpeaker] = useState("");
    const [lengthScale, setLengthScale] = useState("1.0");
    const [noiseScale, setNoiseScale] = useState("0.667");
    const [noiseW, setNoiseW] = useState("0.8");
    const [sentenceSilence, setSentenceSilence] = useState("0.2");
    const [text, setText] = useState(
        "Xin chào, đây là trang test Piper TTS local trong OmniVideo.",
    );
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<
        Extract<PiperTtsApiPayload, { ok: true }>["data"] | null
    >(null);
    const [replicateToken, setReplicateToken] = useState("");
    const [replicateTarget, setReplicateTarget] = useState(
        "prunaai/z-image-turbo",
    );
    const [replicateMode, setReplicateMode] = useState("auto");
    const [replicateInputJson, setReplicateInputJson] = useState(
        DEFAULT_REPLICATE_INPUT,
    );
    const [replicateFileInputKey, setReplicateFileInputKey] = useState("");
    const [replicateFile, setReplicateFile] = useState<File | null>(null);
    const [replicateWaitSeconds, setReplicateWaitSeconds] = useState("45");
    const [replicateCancelAfter, setReplicateCancelAfter] = useState("5m");
    const [styleLock, setStyleLock] = useState(DEFAULT_STYLE_LOCK);
    const [characterLock, setCharacterLock] = useState(DEFAULT_CHARACTER_LOCK);
    const [continuityLock, setContinuityLock] = useState(
        DEFAULT_CONTINUITY_LOCK,
    );
    const [scenePrompt, setScenePrompt] = useState(
        "Cô gái dọn dẹp tủ đồ, định vứt một chiếc áo khoác phao cũ, sờn rách ở tay áo. Anh chồng đi qua nhìn thấy, liền nhặt lại và treo vào tủ.",
    );
    const [isInspectingReplicateSchema, setIsInspectingReplicateSchema] =
        useState(false);
    const [replicateSchemaError, setReplicateSchemaError] = useState<
        string | null
    >(null);
    const [replicateSchema, setReplicateSchema] = useState<
        Extract<ReplicateSchemaPayload, { ok: true }>["data"] | null
    >(null);
    const [isRunningReplicate, setIsRunningReplicate] = useState(false);
    const [replicateError, setReplicateError] = useState<string | null>(null);
    const [replicateResult, setReplicateResult] = useState<
        Extract<ReplicatePredictionPayload, { ok: true }>["data"] | null
    >(null);

    const [extractorUrl, setExtractorUrl] = useState("");
    const [extractorTitle, setExtractorTitle] = useState("");
    const [extractorTarget, setExtractorTarget] = useState<"video" | "audio">(
        "video",
    );
    const [extractorQuality, setExtractorQuality] = useState<string>("best");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);
    const [analyzeResult, setAnalyzeResult] = useState<ExtractorResult | null>(
        null,
    );

    const [zeroTtsText, setZeroTtsText] = useState(
        "Trước một người mà lý trí bảo phải rời xa, nhưng con tim lại cố chấp hướng về, điều đáng sợ nhất không phải là khoảng cách hay thời gian, mà là sự chùn bước tự ti biến mình thành kẻ đứng ngoài hạnh phúc của đối phương. Kiên trì theo đuổi chưa bao giờ là ngu ngốc, dẫu phía trước là bão giông hay vô vọng, việc không hối hận vì đã dốc cạn tâm can mới là cách sống trọn vẹn với một đời người. Giống như lời tỏ tình đầy kiêu hãnh nhưng chua chát: Ta biết khoảng cách giữa chúng ta tựa như trời và đất, nhưng nếu không thử bước đến cạnh nàng, cả đời này ta sẽ chẳng bao giờ tha thứ cho sự hèn nhát của chính mình. Hôm nay ta đứng ở đây, không cầu kết quả, chỉ cầu ánh mắt nàng dừng lại, để thấy một kẻ phàm phu tục tử cũng có thể vì một người mà dám cháy hết mình.",
    );
    const [zeroTtsVoiceMode, setZeroTtsVoiceMode] = useState<
        "preset" | "custom_upload" | "custom_local"
    >("custom_local");
    const [zeroTtsPresetVoice, setZeroTtsPresetVoice] = useState("maichi");
    const [zeroTtsCustomFile, setZeroTtsCustomFile] = useState<File | null>(
        null,
    );
    const [zeroTtsCustomAudioPreviewUrl, setZeroTtsCustomAudioPreviewUrl] =
        useState<string | null>(null);
    const [zeroTtsSelectedLocalVoice, setZeroTtsSelectedLocalVoice] =
        useState("");
    const [zeroTtsSpeed, setZeroTtsSpeed] = useState("1.2");
    const [zeroTtsNormalizeVi, setZeroTtsNormalizeVi] = useState(true);
    const [zeroTtsModelId, setZeroTtsModelId] = useState(
        "zeroweight-ai/ZeroTTS",
    );
    const [zeroTtsTemperature, setZeroTtsTemperature] = useState("0.8");
    const [zeroTtsTopP, setZeroTtsTopP] = useState("0.95");
    const [zeroTtsCfgScale, setZeroTtsCfgScale] = useState("1.0");
    const [zeroTtsSeed, setZeroTtsSeed] = useState("42");
    const [zeroTtsSentenceSilence, setZeroTtsSentenceSilence] = useState("0.2");
    const [zeroTtsPresetVoices, setZeroTtsPresetVoices] = useState<
        ZeroTtsVoiceOption[]
    >([]);
    const [zeroTtsCustomVoices, setZeroTtsCustomVoices] = useState<
        ZeroTtsVoiceOption[]
    >([]);
    const [isLoadingZeroTtsVoices, setIsLoadingZeroTtsVoices] = useState(true);
    const [isRunningZeroTts, setIsRunningZeroTts] = useState(false);
    const [zeroTtsError, setZeroTtsError] = useState<string | null>(null);
    const [zeroTtsResult, setZeroTtsResult] = useState<
        Extract<ZeroTtsApiPayload, { ok: true }>["data"] | null
    >(null);
    const [zeroTtsBackgroundMusic, setZeroTtsBackgroundMusic] =
        useState<string>("");
    const [zeroTtsBgmVolume, setZeroTtsBgmVolume] = useState<string>("0.25");
    const [zeroTtsBgmList, setZeroTtsBgmList] = useState<
        Array<{ source: string; label: string }>
    >([]);
    const [zeroTtsVideoFile, setZeroTtsVideoFile] = useState<File | null>(null);
    const [zeroTtsVideoUrl, setZeroTtsVideoUrl] = useState<string | null>(null);
    const [zeroTtsVideoVolume, setZeroTtsVideoVolume] =
        useState<string>("0.15");
    const [zeroTtsColorPreset, setZeroTtsColorPreset] =
        useState<string>("natural_reset");
    const zeroTtsSpeechAudioRef = useRef<HTMLAudioElement | null>(null);
    const zeroTtsBgmAudioRef = useRef<HTMLAudioElement | null>(null);
    const zeroTtsVideoRef = useRef<HTMLVideoElement | null>(null);

    const [zeroTtsShowCaptions, setZeroTtsShowCaptions] = useState(true);
    const [zeroTtsCaptionStyle, setZeroTtsCaptionStyle] =
        useState<CapCutCaptionStyle>("capcut_yellow");
    const [zeroTtsCaptionPosition, setZeroTtsCaptionPosition] =
        useState<CapCutCaptionPosition>("bottom");
    const [zeroTtsCaptionSize, setZeroTtsCaptionSize] =
        useState<CapCutCaptionSize>("md");
    const [zeroTtsCaptionUppercase, setZeroTtsCaptionUppercase] =
        useState(false);
    const [zeroTtsCaptionNoBorder, setZeroTtsCaptionNoBorder] = useState(false);
    const [zeroTtsCaptionNoUnderline, setZeroTtsCaptionNoUnderline] =
        useState(false);
    const [isRenderingZeroTtsVideo, setIsRenderingZeroTtsVideo] =
        useState(false);
    const [zeroTtsRenderError, setZeroTtsRenderError] = useState<string | null>(
        null,
    );
    const [zeroTtsRenderedVideoUrl, setZeroTtsRenderedVideoUrl] = useState<
        string | null
    >(null);
    const [zeroTtsRenderedResult, setZeroTtsRenderedResult] = useState<{
        fileName: string;
        fileSizeBytes: number;
        durationSeconds: number;
    } | null>(null);

    const isCaptionNoBorder =
        zeroTtsCaptionNoBorder ||
        zeroTtsCaptionStyle.startsWith("clean_") ||
        zeroTtsCaptionStyle === "pure_cinema";

    const isCaptionNoUnderline =
        zeroTtsCaptionNoUnderline ||
        zeroTtsCaptionStyle.startsWith("clean_") ||
        zeroTtsCaptionStyle === "pure_cinema";

    const [zeroTtsSpeechCurrentTime, setZeroTtsSpeechCurrentTime] = useState(0);
    const [zeroTtsSubtitleLeadMs, setZeroTtsSubtitleLeadMs] = useState(120);
    const speechRafRef = useRef<number | null>(null);
    const lastReportedTimeRef = useRef<number>(-1);

    useEffect(() => {
        return () => {
            if (speechRafRef.current) {
                cancelAnimationFrame(speechRafRef.current);
            }
        };
    }, []);

    const [cgVideoFile, setCgVideoFile] = useState<File | null>(null);
    const [cgVideoUrl, setCgVideoUrl] = useState<string | null>(null);
    const [cgActivePreset, setCgActivePreset] = useState<string>("moody_dark");
    const [cgBrightness, setCgBrightness] = useState<number>(-0.18);
    const [cgContrast, setCgContrast] = useState<number>(1.25);
    const [cgSaturation, setCgSaturation] = useState<number>(0.85);
    const [cgGamma, setCgGamma] = useState<number>(0.9);
    const [cgVignette, setCgVignette] = useState<number>(0.45);
    const [cgTemperature, setCgTemperature] = useState<number>(-12);
    const [cgHue, setCgHue] = useState<number>(0);
    const [cgVibrance, setCgVibrance] = useState<number>(0);
    const [cgSepia, setCgSepia] = useState<number>(0);
    const [cgTint, setCgTint] = useState<number>(0);
    const [cgCompareMode, setCgCompareMode] = useState<boolean>(false);
    const [cgIsRendering, setCgIsRendering] = useState<boolean>(false);
    const [cgRenderResult, setCgRenderResult] = useState<{
        videoUrl: string;
        filename: string;
        originalSize?: number;
        outputSize?: number;
        processingDurationMs?: number;
    } | null>(null);
    const [cgRenderError, setCgRenderError] = useState<string | null>(null);
    const cgPreviewVideoRef = useRef<HTMLVideoElement | null>(null);

    useEffect(() => {
        setIsLoadingZeroTtsVoices(true);
        fetch("/api/audio/zerotts-voices", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload) => {
                if (payload.ok && payload.data) {
                    const presets = (payload.data.presetVoices ??
                        []) as ZeroTtsVoiceOption[];
                    const customs = (payload.data.customVoices ??
                        []) as ZeroTtsVoiceOption[];
                    setZeroTtsPresetVoices(presets);
                    setZeroTtsCustomVoices(customs);
                    if (presets.length > 0) {
                        setZeroTtsPresetVoice((curr) => curr || presets[0].id);
                    }
                    if (customs.length > 0) {
                        const preferred =
                            customs.find(
                                (c) =>
                                    /1\.zip$/i.test(c.filePath || "") ||
                                    c.id === "custom_1_zip",
                            ) ?? customs[0];
                        setZeroTtsSelectedLocalVoice(
                            (curr) =>
                                curr || preferred.filePath || preferred.id,
                        );
                    }
                }
            })
            .catch(() => {})
            .finally(() => setIsLoadingZeroTtsVoices(false));
    }, []);

    useEffect(() => {
        fetch("/api/video-processing/background-music", {
            method: "GET",
            cache: "no-store",
        })
            .then((res) => res.json())
            .then(
                (payload: {
                    ok?: boolean;
                    data?: Array<{ source: string; label: string }>;
                }) => {
                    if (payload.ok && Array.isArray(payload.data)) {
                        setZeroTtsBgmList(payload.data);
                    }
                },
            )
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!zeroTtsBgmAudioRef.current) return;
        zeroTtsBgmAudioRef.current.volume = Math.min(
            1,
            Math.max(0, Number(zeroTtsBgmVolume) || 0.25),
        );
    }, [zeroTtsBgmVolume]);

    useEffect(() => {
        if (!zeroTtsBgmAudioRef.current) return;
        if (!zeroTtsBackgroundMusic) {
            zeroTtsBgmAudioRef.current.pause();
            zeroTtsBgmAudioRef.current.currentTime = 0;
            return;
        }
        const speech = zeroTtsSpeechAudioRef.current;
        if (speech && !speech.paused && !speech.ended) {
            zeroTtsBgmAudioRef.current.currentTime = speech.currentTime;
            zeroTtsBgmAudioRef.current.play().catch(() => {});
        }
    }, [zeroTtsBackgroundMusic]);

    useEffect(() => {
        if (!zeroTtsVideoRef.current) return;
        zeroTtsVideoRef.current.volume = Math.min(
            1,
            Math.max(0, Number(zeroTtsVideoVolume) || 0.15),
        );
    }, [zeroTtsVideoVolume]);

    useEffect(() => {
        return () => {
            if (zeroTtsVideoUrl) {
                URL.revokeObjectURL(zeroTtsVideoUrl);
            }
        };
    }, [zeroTtsVideoUrl]);

    useEffect(() => {
        fetch("/api/storage/assets?limit=50", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: StoredVideoAsset[] }) => {
                if (payload.ok && payload.data) setAssets(payload.data);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetch("/api/audio/piper-models", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: LocalPiperModel[] }) => {
                const models = payload.ok ? (payload.data ?? []) : [];
                setPiperModels(models);
                if (models.length > 0) {
                    setModelPath(
                        (currentPath) => currentPath || models[0].modelPath,
                    );
                    setConfigPath(
                        (currentPath) => currentPath || models[0].configPath,
                    );
                }
            })
            .catch(() => setPiperModels([]))
            .finally(() => setIsLoadingPiperModels(false));
    }, []);

    useEffect(() => {
        setIsLoadingAiProviders(true);
        fetch("/api/ai-providers", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiProviderOption[] }) => {
                const activeProviders = (payload.data ?? []).filter(
                    (provider) => provider.status === "active",
                );
                if (payload.ok) setAiProviders(activeProviders);
            })
            .catch(() => setAiProviders([]))
            .finally(() => setIsLoadingAiProviders(false));
    }, []);

    useEffect(() => {
        if (!selectedTranscriptionProviderId) {
            setAiModels([]);
            return;
        }
        setIsLoadingAiModels(true);
        fetch(`/api/ai-providers/${selectedTranscriptionProviderId}/models`, {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiModelOption[] }) => {
                const models = payload.ok ? (payload.data ?? []) : [];
                setAiModels(models);
                const preferred =
                    models.find((model) =>
                        /whisper|transcri|speech|audio/iu.test(model.id),
                    ) ?? models[0];
                if (preferred) setTranscriptionModel(preferred.id);
            })
            .catch(() => setAiModels([]))
            .finally(() => setIsLoadingAiModels(false));
    }, [selectedTranscriptionProviderId]);

    const audioUrl = useMemo(() => {
        if (!result) return null;
        return `data:${result.mimeType};base64,${result.audioBase64}`;
    }, [result]);

    const zeroTtsAudioUrl = useMemo(() => {
        if (!zeroTtsResult) return null;
        return `data:${zeroTtsResult.mimeType};base64,${zeroTtsResult.audioBase64}`;
    }, [zeroTtsResult]);

    const handleZeroTtsCustomFileChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const selected = event.target.files?.[0] ?? null;
        setZeroTtsCustomFile(selected);
        if (selected && selected.type.startsWith("audio/")) {
            const url = URL.createObjectURL(selected);
            setZeroTtsCustomAudioPreviewUrl(url);
        } else {
            setZeroTtsCustomAudioPreviewUrl(null);
        }
    };

    const handleZeroTtsVideoChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        if (zeroTtsVideoUrl) {
            URL.revokeObjectURL(zeroTtsVideoUrl);
        }
        setZeroTtsVideoFile(file);
        if (file) {
            const url = URL.createObjectURL(file);
            setZeroTtsVideoUrl(url);
        } else {
            setZeroTtsVideoUrl(null);
        }
    };

    const handleZeroTtsRemoveVideo = () => {
        if (zeroTtsVideoUrl) {
            URL.revokeObjectURL(zeroTtsVideoUrl);
        }
        setZeroTtsVideoFile(null);
        setZeroTtsVideoUrl(null);
    };

    const startPlaybackRaf = () => {
        if (speechRafRef.current) cancelAnimationFrame(speechRafRef.current);

        const tick = () => {
            const audio = zeroTtsSpeechAudioRef.current;
            const video = zeroTtsVideoRef.current;
            const currentMedia =
                audio && !audio.paused
                    ? audio
                    : video && !video.paused
                      ? video
                      : null;

            if (currentMedia && !currentMedia.paused && !currentMedia.ended) {
                const now = currentMedia.currentTime;
                if (Math.abs(now - lastReportedTimeRef.current) >= 0.03) {
                    lastReportedTimeRef.current = now;
                    setZeroTtsSpeechCurrentTime(now);
                }
                speechRafRef.current = requestAnimationFrame(tick);
            } else {
                speechRafRef.current = null;
            }
        };

        speechRafRef.current = requestAnimationFrame(tick);
    };

    const stopPlaybackRaf = () => {
        if (speechRafRef.current) {
            cancelAnimationFrame(speechRafRef.current);
            speechRafRef.current = null;
        }
    };

    const handleZeroTtsSpeechPlay = () => {
        startPlaybackRaf();
        if (
            zeroTtsBackgroundMusic &&
            zeroTtsBgmAudioRef.current &&
            zeroTtsSpeechAudioRef.current
        ) {
            zeroTtsBgmAudioRef.current.currentTime =
                zeroTtsSpeechAudioRef.current.currentTime;
            zeroTtsBgmAudioRef.current.volume = Math.min(
                1,
                Math.max(0, Number(zeroTtsBgmVolume) || 0.25),
            );
            zeroTtsBgmAudioRef.current.play().catch(() => {});
        }
        if (
            zeroTtsVideoUrl &&
            zeroTtsVideoRef.current &&
            zeroTtsSpeechAudioRef.current
        ) {
            zeroTtsVideoRef.current.currentTime =
                zeroTtsSpeechAudioRef.current.currentTime;
            zeroTtsVideoRef.current.volume = Math.min(
                1,
                Math.max(0, Number(zeroTtsVideoVolume) || 0.15),
            );
            zeroTtsVideoRef.current.play().catch(() => {});
        }
    };

    const handleZeroTtsSpeechPause = () => {
        stopPlaybackRaf();
        if (zeroTtsBgmAudioRef.current) {
            zeroTtsBgmAudioRef.current.pause();
        }
        if (zeroTtsVideoRef.current) {
            zeroTtsVideoRef.current.pause();
        }
    };

    const handleZeroTtsSpeechSeeked = () => {
        const cur = zeroTtsSpeechAudioRef.current?.currentTime || 0;
        setZeroTtsSpeechCurrentTime(cur);
        lastReportedTimeRef.current = cur;
        if (zeroTtsSpeechAudioRef.current) {
            if (zeroTtsBgmAudioRef.current) {
                zeroTtsBgmAudioRef.current.currentTime =
                    zeroTtsSpeechAudioRef.current.currentTime;
            }
            if (zeroTtsVideoRef.current) {
                zeroTtsVideoRef.current.currentTime =
                    zeroTtsSpeechAudioRef.current.currentTime;
            }
        }
    };

    const handleZeroTtsSpeechEnded = () => {
        stopPlaybackRaf();
        setZeroTtsSpeechCurrentTime(0);
        lastReportedTimeRef.current = 0;
        if (zeroTtsBgmAudioRef.current) {
            zeroTtsBgmAudioRef.current.pause();
            zeroTtsBgmAudioRef.current.currentTime = 0;
        }
        if (zeroTtsVideoRef.current) {
            zeroTtsVideoRef.current.pause();
            zeroTtsVideoRef.current.currentTime = 0;
        }
    };

    const handleZeroTtsVideoPlay = () => {
        startPlaybackRaf();
        if (
            zeroTtsSpeechAudioRef.current &&
            zeroTtsSpeechAudioRef.current.paused &&
            !zeroTtsSpeechAudioRef.current.ended
        ) {
            zeroTtsSpeechAudioRef.current.play().catch(() => {});
        }
    };

    const handleZeroTtsVideoPause = () => {
        stopPlaybackRaf();
        if (
            zeroTtsSpeechAudioRef.current &&
            !zeroTtsSpeechAudioRef.current.paused &&
            !zeroTtsSpeechAudioRef.current.ended
        ) {
            zeroTtsSpeechAudioRef.current.pause();
        }
    };

    const handleZeroTtsVideoSeeked = () => {
        const cur = zeroTtsVideoRef.current?.currentTime || 0;
        setZeroTtsSpeechCurrentTime(cur);
        lastReportedTimeRef.current = cur;
        if (
            zeroTtsVideoRef.current &&
            zeroTtsSpeechAudioRef.current &&
            Math.abs(
                zeroTtsSpeechAudioRef.current.currentTime -
                    zeroTtsVideoRef.current.currentTime,
            ) > 0.3
        ) {
            zeroTtsSpeechAudioRef.current.currentTime =
                zeroTtsVideoRef.current.currentTime;
        }
    };

    const wordTimeline = useMemo(() => {
        if (
            zeroTtsResult?.wordTimestamps &&
            zeroTtsResult.wordTimestamps.length > 0
        ) {
            return zeroTtsResult.wordTimestamps.map((item, idx) => ({
                word: item.word,
                start: item.start,
                end: item.end,
                index: idx,
            }));
        }

        const text =
            zeroTtsResult?.normalizedText ||
            zeroTtsResult?.text ||
            zeroTtsText ||
            "";
        const durationSec = (zeroTtsResult?.durationMs || 1000) / 1000;
        const silence = Number(zeroTtsSentenceSilence) || 0.2;
        return buildPunctuationAwareWordTimeline(text, durationSec, silence);
    }, [zeroTtsResult, zeroTtsText, zeroTtsSentenceSilence]);

    const spokenWords = useMemo(
        () => wordTimeline.map((item) => item.word),
        [wordTimeline],
    );

    const activeWordIndex = useMemo(() => {
        if (wordTimeline.length === 0) return 0;
        const adjustedTime = Math.max(
            0,
            zeroTtsSpeechCurrentTime + zeroTtsSubtitleLeadMs / 1000,
        );

        const found = wordTimeline.findIndex(
            (wt) => adjustedTime >= wt.start && adjustedTime < wt.end,
        );
        if (found !== -1) return found;

        if (adjustedTime >= wordTimeline[wordTimeline.length - 1].end) {
            return wordTimeline.length - 1;
        }

        return 0;
    }, [wordTimeline, zeroTtsSpeechCurrentTime, zeroTtsSubtitleLeadMs]);

    const currentWordsChunk = useMemo(() => {
        if (wordTimeline.length === 0) return [];
        const windowSize = 6;
        const chunkIndex = Math.floor(activeWordIndex / windowSize);
        const chunkStart = chunkIndex * windowSize;
        return wordTimeline
            .slice(chunkStart, chunkStart + windowSize)
            .map((item) => ({
                word: item.word,
                absoluteIndex: item.index,
                isActive: item.index === activeWordIndex,
                isPast: item.index < activeWordIndex,
                isUpcoming: item.index > activeWordIndex,
            }));
    }, [wordTimeline, activeWordIndex]);

    const zeroTtsColorPresetData = useMemo(
        () => COLOR_GRADE_PRESETS.find((p) => p.id === zeroTtsColorPreset) ?? null,
        [zeroTtsColorPreset],
    );

    const zeroTtsColorGrade = useMemo<ColorGradeFilterOptions | null>(() => {
        if (!zeroTtsColorPresetData || zeroTtsColorPreset === "natural_reset") {
            return null;
        }
        const p = zeroTtsColorPresetData;
        return {
            brightness: p.brightness,
            contrast: p.contrast,
            saturation: p.saturation,
            gamma: p.gamma,
            vignette: p.vignette,
            temperature: p.temperature,
            hue: p.hue,
            vibrance: p.vibrance,
            sepia: p.sepia,
            tint: p.tint,
            presetName: p.id,
        };
    }, [zeroTtsColorPresetData, zeroTtsColorPreset]);

    const zeroTtsVideoFilterCss = useMemo(
        () => (zeroTtsColorGrade ? buildColorGradeCssFilter(zeroTtsColorGrade) : "none"),
        [zeroTtsColorGrade],
    );

    const handleZeroTtsRenderVideo = async () => {
        if (!zeroTtsVideoFile && !zeroTtsVideoUrl) {
            setZeroTtsRenderError(
                "Vui lòng tải lên hoặc chọn video trước khi render.",
            );
            return;
        }
        if (!zeroTtsResult?.audioBase64 && !zeroTtsAudioUrl) {
            setZeroTtsRenderError(
                "Vui lòng tạo giọng đọc ZeroTTS trước khi render video.",
            );
            return;
        }

        setIsRenderingZeroTtsVideo(true);
        setZeroTtsRenderError(null);

        try {
            const formData = new FormData();
            if (zeroTtsVideoFile) {
                formData.append("videoFile", zeroTtsVideoFile);
            } else if (zeroTtsVideoUrl) {
                const resp = await fetch(zeroTtsVideoUrl);
                const blob = await resp.blob();
                formData.append("videoFile", blob, "video.mp4");
            }

            if (zeroTtsResult?.audioBase64) {
                formData.append("speechBase64", zeroTtsResult.audioBase64);
            } else if (zeroTtsAudioUrl) {
                const resp = await fetch(zeroTtsAudioUrl);
                const blob = await resp.blob();
                formData.append("speechAudioFile", blob, "speech.wav");
            }

            if (zeroTtsBackgroundMusic) {
                formData.append("musicSource", zeroTtsBackgroundMusic);
            }

            const settings = {
                videoVolume: Number(zeroTtsVideoVolume) || 0.15,
                bgmVolume: Number(zeroTtsBgmVolume) || 0.25,
                showCaptions: zeroTtsShowCaptions,
                captionStyle: zeroTtsCaptionStyle,
                captionPosition: zeroTtsCaptionPosition,
                captionSize: zeroTtsCaptionSize,
                captionUppercase: zeroTtsCaptionUppercase,
                captionNoBorder: isCaptionNoBorder,
                captionNoUnderline: isCaptionNoUnderline,
                wordTimeline,
                durationSec: (zeroTtsResult?.durationMs || 1000) / 1000,
                ...(zeroTtsColorGrade ? { colorGrade: zeroTtsColorGrade } : {}),
            };
            formData.append("settingsJson", JSON.stringify(settings));
            formData.append("responseMode", "json");

            const res = await fetch("/api/video-processing/zerotts-render", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (!res.ok || !data.ok) {
                throw new Error(
                    data.error || "Quá trình render video thất bại.",
                );
            }

            if (zeroTtsRenderedVideoUrl) {
                URL.revokeObjectURL(zeroTtsRenderedVideoUrl);
            }
            setZeroTtsRenderedVideoUrl(data.data.videoUrl);
            setZeroTtsRenderedResult({
                fileName: data.data.fileName,
                fileSizeBytes: data.data.fileSizeBytes,
                durationSeconds: data.data.durationSeconds,
            });
        } catch (err) {
            setZeroTtsRenderError(
                err instanceof Error ? err.message : "Render video thất bại.",
            );
        } finally {
            setIsRenderingZeroTtsVideo(false);
        }
    };

    const applyColorGradePreset = (presetId: string) => {
        const found = COLOR_GRADE_PRESETS.find((p) => p.id === presetId);
        if (!found) return;
        setCgActivePreset(presetId);
        setCgBrightness(found.brightness);
        setCgContrast(found.contrast);
        setCgSaturation(found.saturation);
        setCgGamma(found.gamma);
        setCgVignette(found.vignette);
        setCgTemperature(found.temperature);
        setCgHue(found.hue);
        setCgVibrance(found.vibrance);
        setCgSepia(found.sepia);
        setCgTint(found.tint);
    };

    const handleCgVideoChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const selected = event.target.files?.[0] ?? null;
        if (cgVideoUrl) {
            URL.revokeObjectURL(cgVideoUrl);
        }
        setCgVideoFile(selected);
        if (selected) {
            setCgVideoUrl(URL.createObjectURL(selected));
        } else {
            setCgVideoUrl(null);
        }
        setCgRenderResult(null);
        setCgRenderError(null);
    };

    const handleUseZeroTtsVideoForColorGrade = () => {
        if (zeroTtsVideoFile) {
            if (cgVideoUrl) URL.revokeObjectURL(cgVideoUrl);
            setCgVideoFile(zeroTtsVideoFile);
            setCgVideoUrl(URL.createObjectURL(zeroTtsVideoFile));
            setCgRenderResult(null);
            setCgRenderError(null);
        }
    };

    const handleCgRenderExport = async () => {
        if (!cgVideoFile) {
            setCgRenderError("Vui lòng tải lên một video để xử lý và xuất.");
            return;
        }
        setCgIsRendering(true);
        setCgRenderError(null);
        try {
            const formData = new FormData();
            formData.append("video", cgVideoFile);
            formData.append("presetName", cgActivePreset);
            formData.append("brightness", String(cgBrightness));
            formData.append("contrast", String(cgContrast));
            formData.append("saturation", String(cgSaturation));
            formData.append("gamma", String(cgGamma));
            formData.append("vignette", String(cgVignette));
            formData.append("temperature", String(cgTemperature));
            formData.append("hue", String(cgHue));
            formData.append("vibrance", String(cgVibrance));
            formData.append("sepia", String(cgSepia));
            formData.append("tint", String(cgTint));

            const response = await fetch("/api/video-processing/color-grade", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(data.error || "Không thể xử lý video");
            }
            setCgRenderResult(data.data);
        } catch (err) {
            setCgRenderError(
                err instanceof Error
                    ? err.message
                    : "Xảy ra lỗi trong quá trình xuất video.",
            );
        } finally {
            setCgIsRendering(false);
        }
    };

    useEffect(() => {
        return () => {
            if (cgVideoUrl) {
                URL.revokeObjectURL(cgVideoUrl);
            }
        };
    }, [cgVideoUrl]);

    const cgFilterCss = useMemo(
        () =>
            buildColorGradeCssFilter(
                {
                    brightness: cgBrightness,
                    contrast: cgContrast,
                    saturation: cgSaturation,
                    gamma: cgGamma,
                    vignette: cgVignette,
                    temperature: cgTemperature,
                    hue: cgHue,
                    vibrance: cgVibrance,
                    sepia: cgSepia,
                    tint: cgTint,
                },
                cgCompareMode,
            ),
        [
            cgCompareMode,
            cgBrightness,
            cgContrast,
            cgSaturation,
            cgGamma,
            cgVignette,
            cgTemperature,
            cgHue,
            cgVibrance,
            cgSepia,
            cgTint,
        ],
    );

    const runZeroTts = async () => {
        setIsRunningZeroTts(true);
        setZeroTtsError(null);
        setZeroTtsResult(null);

        try {
            if (zeroTtsVoiceMode === "custom_upload" && zeroTtsCustomFile) {
                if (
                    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(
                        zeroTtsCustomFile.name,
                    )
                ) {
                    setZeroTtsError(
                        "ZeroTTS mã nguồn mở chạy suy luận trên CPU cần file gói giọng .zip (chứa voice.npz). Bạn hãy vào zeroweight.ai -> Thư viện giọng -> Bấm 'Tải về' để lấy file .zip và tải file .zip đó lên đây để nhân bản giọng đọc.",
                    );
                    setIsRunningZeroTts(false);
                    return;
                }
            }

            let response: Response;

            if (zeroTtsVoiceMode === "custom_upload" && zeroTtsCustomFile) {
                const formData = new FormData();
                formData.append("text", zeroTtsText);
                formData.append("voice", "custom");
                formData.append("voiceFile", zeroTtsCustomFile);
                formData.append("modelId", zeroTtsModelId);
                formData.append("speed", zeroTtsSpeed);
                formData.append(
                    "normalizeVi",
                    zeroTtsNormalizeVi ? "true" : "false",
                );
                formData.append("temperature", zeroTtsTemperature);
                formData.append("topP", zeroTtsTopP);
                formData.append("cfgScale", zeroTtsCfgScale);
                formData.append("seed", zeroTtsSeed);
                formData.append("sentenceSilence", zeroTtsSentenceSilence);

                response = await fetch("/api/audio/zerotts", {
                    method: "POST",
                    body: formData,
                });
            } else {
                const voice =
                    zeroTtsVoiceMode === "custom_local"
                        ? zeroTtsSelectedLocalVoice
                        : zeroTtsPresetVoice;

                response = await fetch("/api/audio/zerotts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: zeroTtsText,
                        voice,
                        modelId: zeroTtsModelId,
                        speed: Number(zeroTtsSpeed) || 1.0,
                        normalizeVi: zeroTtsNormalizeVi,
                        temperature: Number(zeroTtsTemperature) || 0.8,
                        topP: Number(zeroTtsTopP) || 0.95,
                        cfgScale: Number(zeroTtsCfgScale) || 1.0,
                        seed: zeroTtsSeed !== "" ? Number(zeroTtsSeed) : 42,
                        sentenceSilence: Number(zeroTtsSentenceSilence) || 0.2,
                    }),
                });
            }

            const payload: ZeroTtsApiPayload = await response.json();
            if (!payload.ok) {
                setZeroTtsError(
                    payload.error || "Failed to generate speech with ZeroTTS.",
                );
                return;
            }

            setZeroTtsResult(payload.data);
        } catch (err) {
            setZeroTtsError(
                err instanceof Error ? err.message : "ZeroTTS request failed.",
            );
        } finally {
            setIsRunningZeroTts(false);
        }
    };
    const selectedAsset = useMemo(
        () => assets.find((asset) => asset._id === selectedAssetId) ?? null,
        [assets, selectedAssetId],
    );
    const replicateOutputUrls = useMemo(
        () => collectOutputUrls(replicateResult?.prediction.output),
        [replicateResult],
    );
    const visibleAssets = useMemo(() => {
        const query = assetSearchQuery.trim().toLowerCase();
        if (!query) return assets;
        return assets.filter((asset) => {
            const title = asset.metadata?.title?.toLowerCase() ?? "";
            const id = asset._id.toLowerCase();
            const folder = asset.metadata?.folder?.toLowerCase() ?? "";
            const tags = (asset.metadata?.tags ?? []).join(" ").toLowerCase();
            return (
                title.includes(query) ||
                id.includes(query) ||
                folder.includes(query) ||
                tags.includes(query)
            );
        });
    }, [assetSearchQuery, assets]);

    const runTts = async () => {
        setIsRunning(true);
        setError(null);
        setResult(null);

        try {
            const raw = text.trim();
            const looksLikeJsonArray = raw.startsWith("[") && raw.endsWith("]");
            let payload: PiperTtsApiPayload | VoiceGenerationApiPayload;
            if (looksLikeJsonArray) {
                const parsed = JSON.parse(raw) as Array<
                    Record<string, unknown>
                >;
                const segments = parsed
                    .map((item, index) => ({
                        id: Number(item.id ?? index),
                        start: Number(item.start ?? 0),
                        end: Number(item.end ?? Number(item.start ?? 0) + 1),
                        text: String(
                            item.translatedText ?? item.text ?? "",
                        ).trim(),
                    }))
                    .filter((segment) => segment.text.length > 0);
                const response = await fetch("/api/audio/voice-generation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        segments,
                        settings: {
                            binaryPath,
                            modelPath,
                            configPath,
                            speaker:
                                speaker === "" ? undefined : Number(speaker),
                            lengthScale:
                                lengthScale === ""
                                    ? undefined
                                    : Number(lengthScale),
                            noiseScale:
                                noiseScale === ""
                                    ? undefined
                                    : Number(noiseScale),
                            noiseW: noiseW === "" ? undefined : Number(noiseW),
                            sentenceSilence:
                                sentenceSilence === ""
                                    ? undefined
                                    : Number(sentenceSilence),
                            preserveTimestampGaps: true,
                            balancedTiming: true,
                        },
                    }),
                });
                payload = (await response.json()) as VoiceGenerationApiPayload;
            } else {
                const response = await fetch("/api/audio/piper-tts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text,
                        binaryPath,
                        modelPath,
                        configPath,
                        speaker,
                        lengthScale,
                        noiseScale,
                        noiseW,
                        sentenceSilence,
                    }),
                });
                payload = (await response.json()) as PiperTtsApiPayload;
            }
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Piper TTS failed."}`
                        : (payload.error ?? "Piper TTS failed."),
                );
            }
            setResult({
                ...payload.data,
                durationMs:
                    "durationMs" in payload.data
                        ? payload.data.durationMs
                        : payload.data.generationDurationMs,
                settings:
                    "settings" in payload.data
                        ? payload.data.settings
                        : {
                              modelPath,
                              configPath,
                              speaker: speaker ? Number(speaker) : undefined,
                              lengthScale: lengthScale
                                  ? Number(lengthScale)
                                  : undefined,
                              noiseScale: noiseScale
                                  ? Number(noiseScale)
                                  : undefined,
                              noiseW: noiseW ? Number(noiseW) : undefined,
                              sentenceSilence: sentenceSilence
                                  ? Number(sentenceSilence)
                                  : undefined,
                          },
            });
        } catch (requestError) {
            setError(
                requestError instanceof Error
                    ? requestError.message
                    : "Piper TTS request failed.",
            );
        } finally {
            setIsRunning(false);
        }
    };

    const runTranscript = async () => {
        if (!file && !selectedAssetId) {
            setTranscriptError("Upload video/audio hoặc chọn 1 storage asset.");
            return;
        }
        setIsRunningTranscript(true);
        setTranscriptError(null);
        setTranscriptSteps([]);
        setTranscriptResult(null);
        try {
            const formData = new FormData();
            if (file) formData.append("videoFile", file);
            if (selectedAssetId) formData.append("assetId", selectedAssetId);
            formData.append("language", language);
            formData.append(
                "includeWordTimestamps",
                includeWordTimestamps ? "true" : "false",
            );
            formData.append(
                "retryPromptHardConstraint",
                retryPromptHardConstraint ? "true" : "false",
            );
            if (transcriptPrompt.trim()) {
                formData.append("prompt", transcriptPrompt.trim());
            }
            if (selectedTranscriptionProviderId) {
                formData.append("providerId", selectedTranscriptionProviderId);
            }
            if (transcriptionModel.trim()) {
                formData.append("model", transcriptionModel.trim());
            }
            const response = await fetch("/api/audio/chinese-transcription", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as TranscriptionApiPayload;
            if (!payload.ok) {
                setTranscriptSteps(payload.steps ?? []);
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Transcription failed."}`
                        : (payload.error ?? "Transcription failed."),
                );
            }
            setTranscriptResult(payload.data);
            setTranscriptSteps(payload.data.steps);
        } catch (requestError) {
            setTranscriptError(
                requestError instanceof Error
                    ? requestError.message
                    : "Transcription request failed.",
            );
        } finally {
            setIsRunningTranscript(false);
        }
    };

    const copyReplicateOutput = async () => {
        if (!replicateResult) return;
        await navigator.clipboard.writeText(
            JSON.stringify(replicateResult.prediction, null, 2),
        );
    };

    const inspectReplicateSchema = async () => {
        setIsInspectingReplicateSchema(true);
        setReplicateSchemaError(null);
        setReplicateSchema(null);
        try {
            const params = new URLSearchParams({
                target: replicateTarget,
                mode: replicateMode,
            });
            if (replicateToken.trim()) params.set("token", replicateToken);
            const response = await fetch(
                `/api/replicate/predictions?${params.toString()}`,
                { cache: "no-store" },
            );
            const payload = (await response.json()) as ReplicateSchemaPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Schema inspection failed."}`
                        : (payload.error ?? "Schema inspection failed."),
                );
            }
            setReplicateSchema(payload.data);
            if (
                !replicateFileInputKey.trim() &&
                payload.data.suggestedFileKeys[0]
            ) {
                setReplicateFileInputKey(payload.data.suggestedFileKeys[0]);
            }
        } catch (requestError) {
            setReplicateSchemaError(
                requestError instanceof Error
                    ? requestError.message
                    : "Schema inspection failed.",
            );
        } finally {
            setIsInspectingReplicateSchema(false);
        }
    };

    const applyConsistentPrompt = () => {
        const prompt = [
            `Scene: ${scenePrompt.trim()}`,
            `Style lock: ${styleLock.trim()}`,
            `Character lock: ${characterLock.trim()}`,
            `Continuity lock: ${continuityLock.trim()}`,
            "Render this as one frame from the same visual series. Do not change the established character design or visual style.",
        ]
            .filter((line) => !/:\s*$/u.test(line))
            .join("\n\n");

        try {
            const parsed = JSON.parse(replicateInputJson) as Record<
                string,
                unknown
            >;
            if (
                !parsed ||
                typeof parsed !== "object" ||
                Array.isArray(parsed)
            ) {
                throw new Error("Input JSON must be an object.");
            }
            setReplicateInputJson(
                JSON.stringify({ ...parsed, prompt }, null, 2),
            );
        } catch {
            setReplicateInputJson(JSON.stringify({ prompt }, null, 2));
        }
    };

    const runReplicate = async () => {
        setIsRunningReplicate(true);
        setReplicateError(null);
        setReplicateResult(null);
        try {
            const formData = new FormData();
            formData.append("token", replicateToken);
            formData.append("target", replicateTarget);
            formData.append("mode", replicateMode);
            formData.append("inputJson", replicateInputJson);
            formData.append("fileInputKey", replicateFileInputKey);
            formData.append("waitSeconds", replicateWaitSeconds);
            formData.append("cancelAfter", replicateCancelAfter);
            if (replicateFile) formData.append("inputFile", replicateFile);

            const response = await fetch("/api/replicate/predictions", {
                method: "POST",
                body: formData,
            });
            const payload =
                (await response.json()) as ReplicatePredictionPayload;
            if (!payload.ok) {
                throw new Error(
                    payload.errorCode
                        ? `${payload.errorCode}: ${payload.error ?? "Replicate prediction failed."}`
                        : (payload.error ?? "Replicate prediction failed."),
                );
            }
            setReplicateResult(payload.data);
        } catch (requestError) {
            setReplicateError(
                requestError instanceof Error
                    ? requestError.message
                    : "Replicate prediction failed.",
            );
        } finally {
            setIsRunningReplicate(false);
        }
    };

    const runAnalyze = async () => {
        if (!extractorUrl.trim()) {
            setAnalyzeError("Vui lòng nhập link video.");
            return;
        }
        setIsAnalyzing(true);
        setAnalyzeError(null);
        setAnalyzeResult(null);
        try {
            const response = await fetch("/api/video-intake/formats", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceUrl: extractorUrl.trim(),
                    qualityPreference: extractorQuality,
                }),
            });
            const payload = await response.json();
            if (!payload.ok) {
                throw new Error(payload.error || "Phân tích link thất bại.");
            }
            setAnalyzeResult(payload.data);
        } catch (err) {
            setAnalyzeError(
                err instanceof Error ? err.message : "Phân tích link thất bại.",
            );
        } finally {
            setIsAnalyzing(false);
        }
    };

    const runDownload = () => {
        if (!extractorUrl.trim()) {
            setAnalyzeError("Vui lòng nhập link video trước khi tải.");
            return;
        }
        const formatSelector =
            extractorTarget === "audio" ? "ba/bestaudio" : "";
        const params = new URLSearchParams({
            sourceUrl: extractorUrl.trim(),
            qualityPreference: extractorQuality,
            formatSelector,
            title: extractorTitle.trim(),
        });
        const downloadUrl = `/api/video-intake/resolve-file?${params.toString()}`;
        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        iframe.src = downloadUrl;
        document.body.appendChild(iframe);
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 10000);
    };

    return (
        <section className="border border-main bg-main">
            <div className="space-y-5 p-5">
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Replicate Model Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Prediction Target
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Model / version / deployment
                                </span>
                                <input
                                    value={replicateTarget}
                                    onChange={(event) =>
                                        setReplicateTarget(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="prunaai/z-image-turbo"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Run mode
                                </span>
                                <select
                                    value={replicateMode}
                                    onChange={(event) =>
                                        setReplicateMode(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                >
                                    <option value="auto">
                                        Auto: owner/model latest version
                                    </option>
                                    <option value="version">
                                        Explicit version ref
                                    </option>
                                    <option value="official-model">
                                        Official model endpoint
                                    </option>
                                    <option value="deployment">
                                        Deployment endpoint
                                    </option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Token
                                </span>
                                <input
                                    value={replicateToken}
                                    onChange={(event) =>
                                        setReplicateToken(event.target.value)
                                    }
                                    type="password"
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="Optional if server has REPLICATE_API_TOKEN"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={inspectReplicateSchema}
                                disabled={isInspectingReplicateSchema}
                                className="inline-flex w-full items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isInspectingReplicateSchema
                                    ? "Inspecting..."
                                    : "Inspect Schema"}
                            </button>
                            {replicateSchemaError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] leading-4 text-rose-700">
                                    {replicateSchemaError}
                                </p>
                            ) : null}
                            {replicateSchema ? (
                                <div className="space-y-2 border border-main bg-main p-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[10px] font-semibold text-main">
                                            Schema Inputs
                                        </p>
                                        <span className="truncate text-[10px] text-muted">
                                            {replicateSchema.version ||
                                                replicateSchema.mode}
                                        </span>
                                    </div>
                                    {replicateSchema.note ? (
                                        <p className="text-[10px] leading-4 text-muted">
                                            {replicateSchema.note}
                                        </p>
                                    ) : null}
                                    {replicateSchema.suggestedFileKeys.length >
                                    0 ? (
                                        <div className="flex flex-wrap gap-1">
                                            {replicateSchema.suggestedFileKeys.map(
                                                (key) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() =>
                                                            setReplicateFileInputKey(
                                                                key,
                                                            )
                                                        }
                                                        className="border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] font-semibold text-accent"
                                                    >
                                                        Use {key}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-[10px] leading-4 text-muted">
                                            No obvious image/file reference
                                            input detected.
                                        </p>
                                    )}
                                    <div className="max-h-44 overflow-auto border border-main">
                                        {replicateSchema.inputProperties.map(
                                            (field) => (
                                                <div
                                                    key={field.key}
                                                    className="border-b border-main px-2 py-1.5 last:border-b-0"
                                                >
                                                    <p className="text-[10px] font-semibold text-main">
                                                        {field.key}
                                                        {field.likelyFileInput
                                                            ? " · file"
                                                            : ""}
                                                    </p>
                                                    <p className="truncate text-[10px] text-muted">
                                                        {[
                                                            field.type,
                                                            field.format,
                                                            field.description,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(" · ")}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                </div>
                            ) : null}
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Wait seconds
                                    </span>
                                    <input
                                        value={replicateWaitSeconds}
                                        onChange={(event) =>
                                            setReplicateWaitSeconds(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Cancel after
                                    </span>
                                    <input
                                        value={replicateCancelAfter}
                                        onChange={(event) =>
                                            setReplicateCancelAfter(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                        placeholder="5m"
                                    />
                                </label>
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Optional file input key
                                </span>
                                <input
                                    value={replicateFileInputKey}
                                    onChange={(event) =>
                                        setReplicateFileInputKey(
                                            event.target.value,
                                        )
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    placeholder="image, audio, input_audio..."
                                />
                            </label>
                            <input
                                type="file"
                                onChange={(event) =>
                                    setReplicateFile(
                                        event.target.files?.[0] ?? null,
                                    )
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                            />
                            <button
                                type="button"
                                onClick={runReplicate}
                                disabled={isRunningReplicate}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send className="h-3.5 w-3.5" />
                                {isRunningReplicate
                                    ? "Running..."
                                    : "Run Replicate"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[12px] font-semibold text-main">
                                        Reference & Consistency
                                    </p>
                                    <button
                                        type="button"
                                        onClick={applyConsistentPrompt}
                                        className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:border-accent"
                                    >
                                        Build Prompt
                                    </button>
                                </div>
                                <label className="mt-3 block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Scene prompt
                                    </span>
                                    <textarea
                                        rows={3}
                                        value={scenePrompt}
                                        onChange={(event) =>
                                            setScenePrompt(event.target.value)
                                        }
                                        className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                    />
                                </label>
                                <div className="mt-3 grid gap-3 xl:grid-cols-3">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Style lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={styleLock}
                                            onChange={(event) =>
                                                setStyleLock(event.target.value)
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Character lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={characterLock}
                                            onChange={(event) =>
                                                setCharacterLock(
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Continuity lock
                                        </span>
                                        <textarea
                                            rows={5}
                                            value={continuityLock}
                                            onChange={(event) =>
                                                setContinuityLock(
                                                    event.target.value,
                                                )
                                            }
                                            className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                        />
                                    </label>
                                </div>
                            </div>
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-[12px] font-semibold text-main">
                                        Input JSON
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setReplicateInputJson(
                                                DEFAULT_REPLICATE_INPUT,
                                            )
                                        }
                                        className="border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:border-accent"
                                    >
                                        Z Image Turbo
                                    </button>
                                </div>
                                <textarea
                                    rows={10}
                                    value={replicateInputJson}
                                    onChange={(event) =>
                                        setReplicateInputJson(
                                            event.target.value,
                                        )
                                    }
                                    className="mt-2 w-full resize-y border border-main bg-main px-2 py-1.5 font-mono text-[11px] leading-5 text-main outline-none focus:border-accent"
                                />
                                <p className="mt-2 text-[10px] leading-4 text-muted">
                                    For file models, set a file input key and
                                    upload a small test file. The route injects
                                    it as a data URL into this JSON object.
                                </p>
                            </div>
                            {replicateError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {replicateError}
                                </p>
                            ) : null}
                            {replicateResult ? (
                                <div className="space-y-3 border border-main bg-secondary/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[12px] font-semibold text-main">
                                                Prediction Output
                                            </p>
                                            <p className="mt-1 text-[10px] text-muted">
                                                {replicateResult.resolved.mode}{" "}
                                                ·{" "}
                                                {replicateResult.prediction
                                                    .status ?? "unknown"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyReplicateOutput}
                                            className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                        >
                                            <Copy className="h-3 w-3" />
                                            Copy JSON
                                        </button>
                                    </div>
                                    {replicateResult.warnings.length > 0 ? (
                                        <div className="space-y-1">
                                            {replicateResult.warnings.map(
                                                (warning) => (
                                                    <p
                                                        key={warning}
                                                        className="border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] leading-4 text-amber-700"
                                                    >
                                                        {warning}
                                                    </p>
                                                ),
                                            )}
                                        </div>
                                    ) : null}
                                    {replicateOutputUrls.length > 0 ? (
                                        <div className="grid gap-3 md:grid-cols-2">
                                            {replicateOutputUrls.map(
                                                (url, index) => {
                                                    const type =
                                                        classifyMediaUrl(url);
                                                    return (
                                                        <div
                                                            key={`${url}-${index}`}
                                                            className="border border-main bg-main p-2"
                                                        >
                                                            {type ===
                                                            "image" ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                    src={url}
                                                                    alt={`Replicate output ${index + 1}`}
                                                                    className="max-h-80 w-full object-contain"
                                                                />
                                                            ) : null}
                                                            {type ===
                                                            "audio" ? (
                                                                <audio
                                                                    controls
                                                                    src={url}
                                                                    className="w-full"
                                                                />
                                                            ) : null}
                                                            {type ===
                                                            "video" ? (
                                                                <video
                                                                    controls
                                                                    src={url}
                                                                    className="max-h-80 w-full bg-black object-contain"
                                                                />
                                                            ) : null}
                                                            <a
                                                                href={url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="mt-2 block truncate text-[10px] font-semibold text-accent"
                                                            >
                                                                Output{" "}
                                                                {index + 1}
                                                            </a>
                                                        </div>
                                                    );
                                                },
                                            )}
                                        </div>
                                    ) : null}
                                    <pre className="max-h-[360px] overflow-auto border border-main bg-main p-3 text-[10px] leading-4 text-main">
                                        {JSON.stringify(
                                            replicateResult.prediction,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Transcript Retry Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Input & Settings
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Upload video/audio
                                </span>
                                <input
                                    type="file"
                                    accept="video/*,audio/*"
                                    onChange={(event) =>
                                        setFile(event.target.files?.[0] ?? null)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                                />
                            </label>
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-muted">
                                    Video Asset
                                </p>
                                <div className="flex items-center justify-between gap-2 border border-main bg-main px-2 py-1.5">
                                    <span className="truncate text-[11px] text-main">
                                        {selectedAsset?.metadata?.title ??
                                            selectedAsset?._id ??
                                            "Select asset"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowAssetBrowser(
                                                (previous) => !previous,
                                            )
                                        }
                                        className="border border-main bg-secondary px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary/70"
                                    >
                                        {showAssetBrowser ? "Close" : "Browse"}
                                    </button>
                                </div>
                                {showAssetBrowser ? (
                                    <div className="max-h-56 overflow-y-auto border border-main bg-main">
                                        <div className="border-b border-main p-2">
                                            <input
                                                value={assetSearchQuery}
                                                onChange={(event) =>
                                                    setAssetSearchQuery(
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Search title, folder, tags..."
                                                className="w-full border border-main bg-main px-2 py-1 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                            />
                                        </div>
                                        {visibleAssets.length === 0 ? (
                                            <p className="px-3 py-4 text-[11px] text-muted">
                                                No matching asset.
                                            </p>
                                        ) : (
                                            <div className="space-y-2 p-2">
                                                {visibleAssets.map((asset) => {
                                                    const isSelected =
                                                        selectedAssetId ===
                                                        asset._id;
                                                    return (
                                                        <button
                                                            key={asset._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAssetId(
                                                                    asset._id,
                                                                );
                                                                setFile(null);
                                                                setShowAssetBrowser(
                                                                    false,
                                                                );
                                                            }}
                                                            className={`w-full border p-2 text-left hover:opacity-90 ${isSelected ? "border-accent bg-secondary/35" : "border-main bg-main"}`}
                                                        >
                                                            <p className="truncate text-[12px] font-semibold text-main">
                                                                {asset.metadata
                                                                    ?.title ??
                                                                    asset._id}
                                                            </p>
                                                            <p className="mt-1 truncate text-[10px] text-muted">
                                                                {[
                                                                    asset
                                                                        .metadata
                                                                        ?.folder,
                                                                    ...(asset
                                                                        .metadata
                                                                        ?.tags ??
                                                                        []),
                                                                    asset.storageProvider,
                                                                    formatBytes(
                                                                        asset.sizeBytes ??
                                                                            0,
                                                                    ),
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        " · ",
                                                                    )}
                                                            </p>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    AI Provider
                                </span>
                                <select
                                    value={selectedTranscriptionProviderId}
                                    onChange={(event) =>
                                        setSelectedTranscriptionProviderId(
                                            event.target.value,
                                        )
                                    }
                                    disabled={
                                        isRunningTranscript ||
                                        isLoadingAiProviders
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    <option value="">
                                        Groq env (GROQ_API_KEY)
                                    </option>
                                    {aiProviders.map((provider) => (
                                        <option
                                            key={provider._id}
                                            value={provider._id}
                                        >
                                            {provider.label} (
                                            {provider.providerType})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Transcription model
                                </span>
                                {selectedTranscriptionProviderId &&
                                aiModels.length > 0 ? (
                                    <select
                                        value={transcriptionModel}
                                        onChange={(event) =>
                                            setTranscriptionModel(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            isRunningTranscript ||
                                            isLoadingAiModels
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                    >
                                        {aiModels.map((model) => (
                                            <option
                                                key={model.id}
                                                value={model.id}
                                            >
                                                {model.name || model.id}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={transcriptionModel}
                                        onChange={(event) =>
                                            setTranscriptionModel(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            isRunningTranscript ||
                                            isLoadingAiModels
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none transition-colors focus:border-accent"
                                        placeholder={
                                            DEFAULT_TRANSCRIPTION_MODEL
                                        }
                                    />
                                )}
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Language
                                </span>
                                <input
                                    value={language}
                                    onChange={(event) =>
                                        setLanguage(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="zh"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Base prompt (optional)
                                </span>
                                <textarea
                                    rows={2}
                                    value={transcriptPrompt}
                                    onChange={(event) =>
                                        setTranscriptPrompt(event.target.value)
                                    }
                                    className="w-full resize-y border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main"
                                />
                            </label>
                            <label className="flex items-center justify-between border border-main bg-main px-3 py-2 text-[11px]">
                                <span className="font-semibold text-main">
                                    Hard constraint retry prompt
                                </span>
                                <input
                                    type="checkbox"
                                    checked={retryPromptHardConstraint}
                                    onChange={(event) =>
                                        setRetryPromptHardConstraint(
                                            event.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                            </label>
                            <label className="flex items-center justify-between border border-main bg-main px-3 py-2 text-[11px]">
                                <span className="font-semibold text-main">
                                    Include word timestamps
                                </span>
                                <input
                                    type="checkbox"
                                    checked={includeWordTimestamps}
                                    onChange={(event) =>
                                        setIncludeWordTimestamps(
                                            event.target.checked,
                                        )
                                    }
                                    className="h-4 w-4 accent-[var(--color-accent)]"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={runTranscript}
                                disabled={isRunningTranscript}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRunningTranscript
                                    ? "Transcribing..."
                                    : "Run Transcript Test"}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {transcriptError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {transcriptError}
                                </p>
                            ) : null}
                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Segments
                                </p>
                                {transcriptResult ? (
                                    <p className="mt-1 text-[10px] text-muted">
                                        {transcriptResult.segments.length}{" "}
                                        segment(s) ·{" "}
                                        {transcriptResult.words.length} word(s)
                                    </p>
                                ) : (
                                    <p className="mt-1 text-[10px] text-muted">
                                        Run transcription to inspect segment
                                        splits.
                                    </p>
                                )}
                                {transcriptResult ? (
                                    <div className="mt-3 max-h-[420px] overflow-auto border border-main bg-main">
                                        {transcriptResult.segments.map(
                                            (segment) => (
                                                <div
                                                    key={`${segment.id}-${segment.start}`}
                                                    className="border-b border-main px-3 py-2 last:border-b-0"
                                                >
                                                    <p className="text-[10px] font-semibold text-muted">
                                                        #{segment.id + 1} ·{" "}
                                                        {formatTime(
                                                            segment.start,
                                                        )}{" "}
                                                        {"->"}{" "}
                                                        {formatTime(
                                                            segment.end,
                                                        )}
                                                    </p>
                                                    <p className="text-[11px] leading-5 text-main">
                                                        {segment.text}
                                                    </p>
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : null}
                            </div>
                            {transcriptSteps.length > 0 ? (
                                <div className="border border-main bg-secondary/20 p-4">
                                    <p className="text-[12px] font-semibold text-main">
                                        Run Steps
                                    </p>
                                    <div className="mt-2 space-y-1">
                                        {transcriptSteps.map((step, index) => (
                                            <p
                                                key={`${step.id}-${index}`}
                                                className="text-[10px] leading-4 text-muted"
                                            >
                                                {index + 1}. {step.label}:{" "}
                                                {step.status} - {step.detail}
                                            </p>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Voice Lab
                    </h2>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Piper Settings
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Piper executable
                                </span>
                                <input
                                    value={binaryPath}
                                    onChange={(event) =>
                                        setBinaryPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <input
                                    value={modelPath}
                                    onChange={(event) =>
                                        setModelPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="ONNX model"
                                />
                                <input
                                    value={configPath}
                                    onChange={(event) =>
                                        setConfigPath(event.target.value)
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                    placeholder="Config JSON"
                                />
                            </div>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Local voice model
                                </span>
                                <select
                                    value={
                                        piperModels.some(
                                            (model) =>
                                                model.modelPath === modelPath &&
                                                model.configPath === configPath,
                                        )
                                            ? modelPath
                                            : ""
                                    }
                                    onChange={(event) => {
                                        const model = piperModels.find(
                                            (candidate) =>
                                                candidate.modelPath ===
                                                event.target.value,
                                        );
                                        if (!model) return;
                                        setModelPath(model.modelPath);
                                        setConfigPath(model.configPath);
                                    }}
                                    disabled={
                                        isLoadingPiperModels ||
                                        piperModels.length === 0
                                    }
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {isLoadingPiperModels ? (
                                        <option>Loading local voices...</option>
                                    ) : null}
                                    {!isLoadingPiperModels &&
                                    piperModels.length === 0 ? (
                                        <option>
                                            No complete Piper model pairs found
                                        </option>
                                    ) : null}
                                    {piperModels.map((model) => (
                                        <option
                                            key={model.id}
                                            value={model.modelPath}
                                        >
                                            {model.label}
                                        </option>
                                    ))}
                                </select>
                                <span className="mt-1 block text-[10px] leading-4 text-muted">
                                    {piperModels.length > 0
                                        ? "Choosing a voice fills both model and config paths."
                                        : "Add matching .onnx and .onnx.json files directly in piper/, or enter paths manually."}
                                </span>
                            </label>
                            <input
                                value={speaker}
                                onChange={(event) =>
                                    setSpeaker(event.target.value)
                                }
                                className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                placeholder="Speaker"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                    [
                                        [
                                            "Length scale",
                                            lengthScale,
                                            setLengthScale,
                                        ],
                                        [
                                            "Noise scale",
                                            noiseScale,
                                            setNoiseScale,
                                        ],
                                        ["Noise W", noiseW, setNoiseW],
                                        [
                                            "Sentence silence",
                                            sentenceSilence,
                                            setSentenceSilence,
                                        ],
                                    ] as const
                                ).map(([label, value, setter]) => (
                                    <label key={label} className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            {label}
                                        </span>
                                        <input
                                            value={value}
                                            onChange={(event) =>
                                                setter(event.target.value)
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main"
                                        />
                                    </label>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={runTts}
                                disabled={isRunning}
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRunning
                                    ? "Generating..."
                                    : "Generate Speech"}
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Voice Input
                                </p>
                                <textarea
                                    rows={8}
                                    value={text}
                                    onChange={(event) =>
                                        setText(event.target.value)
                                    }
                                    className="mt-2 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main"
                                />
                                {error ? (
                                    <p className="mt-3 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                        {error}
                                    </p>
                                ) : null}
                            </div>
                            {result && audioUrl ? (
                                <div className="border border-main bg-secondary/20 p-4">
                                    <div className="flex items-center gap-2">
                                        <Volume2 className="h-4 w-4 text-muted" />
                                        <p className="text-[12px] font-semibold text-main">
                                            Generated WAV
                                        </p>
                                    </div>
                                    <p className="mt-1 text-[10px] text-muted">
                                        {result.byteLength} bytes ·{" "}
                                        {result.durationMs} ms
                                    </p>
                                    <audio
                                        controls
                                        className="mt-3 w-full"
                                        src={audioUrl}
                                    />
                                    <a
                                        href={audioUrl}
                                        download="piper-tts-sandbox.wav"
                                        className="mt-3 inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                    >
                                        <Download className="h-3 w-3" />
                                        Download WAV
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <h2 className="text-[13px] font-semibold text-main">
                        Fast Media Extractor
                    </h2>
                    <p className="text-[11px] text-muted leading-relaxed">
                        Tải nhanh video/audio bằng <strong>Cobalt API</strong>{" "}
                        hoặc <strong>yt-dlp (Local)</strong>. Để sử dụng Cobalt
                        cho tốc độ tải cực cao và tránh bị YouTube chặn, vui
                        lòng cấu hình <code>COBALT_API_URL</code> trong file{" "}
                        <code>.env.local</code> (ví dụ:{" "}
                        <code>COBALT_API_URL=https://api.cobalt.tools/</code>{" "}
                        hoặc instance tự host của bạn). Tìm hiểu thêm tại{" "}
                        <a
                            href="https://cobalt.tools"
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline font-semibold"
                        >
                            cobalt.tools
                        </a>{" "}
                        hoặc{" "}
                        <a
                            href="https://github.com/imputnet/cobalt"
                            target="_blank"
                            rel="noreferrer"
                            className="text-accent underline font-semibold"
                        >
                            GitHub Cobalt
                        </a>
                        .
                    </p>
                    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <p className="text-[12px] font-semibold text-main">
                                Extractor Settings
                            </p>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Media Link (TikTok, Douyin, Facebook,
                                    YouTube)
                                </span>
                                <input
                                    value={extractorUrl}
                                    onChange={(event) =>
                                        setExtractorUrl(event.target.value)
                                    }
                                    placeholder="https://..."
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Custom File Title (Optional)
                                </span>
                                <input
                                    value={extractorTitle}
                                    onChange={(event) =>
                                        setExtractorTitle(event.target.value)
                                    }
                                    placeholder="my-extracted-media"
                                    className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                />
                            </label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Target Type
                                    </span>
                                    <select
                                        value={extractorTarget}
                                        onChange={(event) =>
                                            setExtractorTarget(
                                                event.target.value as
                                                    | "video"
                                                    | "audio",
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    >
                                        <option value="video">
                                            Video + Audio
                                        </option>
                                        <option value="audio">
                                            Audio Only (Voice extract)
                                        </option>
                                    </select>
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Quality
                                    </span>
                                    <select
                                        value={extractorQuality}
                                        onChange={(event) =>
                                            setExtractorQuality(
                                                event.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    >
                                        <option value="best">Best</option>
                                        <option value="1080p">1080p</option>
                                        <option value="720p">720p</option>
                                        <option value="480p">480p</option>
                                        <option value="360p">360p</option>
                                    </select>
                                </label>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={runAnalyze}
                                    disabled={isAnalyzing}
                                    className="inline-flex w-full items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    {isAnalyzing
                                        ? "Analyzing..."
                                        : "Analyze Link"}
                                </button>
                                <button
                                    type="button"
                                    onClick={runDownload}
                                    className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15"
                                >
                                    Extract & Download
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {analyzeError ? (
                                <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                    {analyzeError}
                                </p>
                            ) : null}

                            <div className="border border-main bg-secondary/20 p-4">
                                <p className="text-[12px] font-semibold text-main">
                                    Metadata & Formats
                                </p>
                                {analyzeResult ? (
                                    <div className="mt-3 space-y-3">
                                        <div className="grid gap-2 border-b border-main pb-3 text-[11px]">
                                            <p className="text-main font-semibold leading-relaxed">
                                                Title:{" "}
                                                <span className="font-normal text-muted">
                                                    {analyzeResult.title ||
                                                        "Unknown"}
                                                </span>
                                            </p>
                                            <p className="text-main font-semibold">
                                                Platform:{" "}
                                                <span className="font-normal text-muted capitalize">
                                                    {analyzeResult.originPlatform ||
                                                        "Unknown"}
                                                </span>
                                            </p>
                                            <p className="text-main font-semibold">
                                                Duration:{" "}
                                                <span className="font-normal text-muted">
                                                    {analyzeResult.durationMs
                                                        ? `${Math.floor(analyzeResult.durationMs / 1000)}s`
                                                        : "Unknown"}
                                                </span>
                                            </p>
                                        </div>
                                        {analyzeResult.formats &&
                                        analyzeResult.formats.length > 0 ? (
                                            <div className="max-h-56 overflow-y-auto border border-main bg-main text-[10px]">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="border-b border-main bg-secondary/50">
                                                            <th className="p-2 font-semibold text-muted">
                                                                Format ID
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Ext
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Resolution
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                Size
                                                            </th>
                                                            <th className="p-2 font-semibold text-muted">
                                                                A/V
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {analyzeResult.formats.map(
                                                            (fmt, idx) => (
                                                                <tr
                                                                    key={`${fmt.formatId}-${idx}`}
                                                                    className="border-b border-main last:border-b-0 hover:bg-secondary/20"
                                                                >
                                                                    <td className="p-2 font-mono truncate max-w-[100px]">
                                                                        {
                                                                            fmt.formatId
                                                                        }
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {
                                                                            fmt.ext
                                                                        }
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.resolution ||
                                                                            fmt.formatNote ||
                                                                            "N/A"}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.filesize
                                                                            ? `${(fmt.filesize / (1024 * 1024)).toFixed(2)} MB`
                                                                            : "N/A"}
                                                                    </td>
                                                                    <td className="p-2">
                                                                        {fmt.hasVideo
                                                                            ? "V"
                                                                            : ""}
                                                                        {fmt.hasAudio
                                                                            ? "A"
                                                                            : ""}
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted">
                                                No formats listed.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <p className="mt-1 text-[10px] text-muted">
                                        Analyze a link to see formats.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2 className="text-[13px] font-semibold text-main">
                                ZeroTTS Voice Lab
                            </h2>
                            <p className="text-[10px] text-muted">
                                Vietnamese Zero-Shot Voice Cloning & High-Speed
                                CPU Text-to-Speech (zeroweight-ai/ZeroTTS)
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            <span className="border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                Zero-Shot Voice Cloning
                            </span>
                            <span className="border border-main bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted">
                                202M CPU-Optimized
                            </span>
                            <span className="border border-main bg-secondary/50 px-2 py-0.5 text-[10px] font-medium text-muted">
                                48kHz Audio
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed">
                        Mô hình <strong>ZeroTTS</strong> (phát triển bởi{" "}
                        <strong>ZeroWeight AI</strong>) tối ưu hóa cho tiếng
                        Việt. Hỗ trợ xử lý viết tắt, ngày tháng, giờ giấc, số
                        tiền tự động bằng bộ chuẩn hóa tiếng Việt{" "}
                        <code>normalize_vi_text</code>.
                    </p>
                    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
                        <div className="min-w-0 space-y-3">
                            <div className="border border-main bg-secondary/20 p-4 space-y-3">
                                <div className="flex items-center gap-1.5 border-b border-main pb-2">
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                                    <span className="text-[11px] font-semibold text-main">
                                        Voice & Synthesis Settings
                                    </span>
                                </div>
                            <div>
                                <span className="mb-1 block text-[10px] font-semibold text-muted">
                                    Voice Mode
                                </span>
                                <div className="grid grid-cols-3 gap-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZeroTtsVoiceMode("preset")
                                        }
                                        className={`border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                                            zeroTtsVoiceMode === "preset"
                                                ? "border-accent bg-accent/15 text-accent"
                                                : "border-main bg-main text-muted hover:text-main"
                                        }`}
                                    >
                                        Preset Voices
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZeroTtsVoiceMode("custom_upload")
                                        }
                                        className={`border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                                            zeroTtsVoiceMode === "custom_upload"
                                                ? "border-accent bg-accent/15 text-accent"
                                                : "border-main bg-main text-muted hover:text-main"
                                        }`}
                                    >
                                        Clone Voice (Upload)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setZeroTtsVoiceMode("custom_local")
                                        }
                                        className={`border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
                                            zeroTtsVoiceMode === "custom_local"
                                                ? "border-accent bg-accent/15 text-accent"
                                                : "border-main bg-main text-muted hover:text-main"
                                        }`}
                                    >
                                        Local Voice Files
                                    </button>
                                </div>
                            </div>

                            {zeroTtsVoiceMode === "preset" ? (
                                <div className="space-y-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Select Preset Voice
                                        </span>
                                        <select
                                            value={zeroTtsPresetVoice}
                                            onChange={(e) =>
                                                setZeroTtsPresetVoice(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                        >
                                            {zeroTtsPresetVoices.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name} (
                                                    {v.gender === "female"
                                                        ? "Nữ"
                                                        : "Nam"}{" "}
                                                    - Miền {v.region})
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    {(() => {
                                        const current =
                                            zeroTtsPresetVoices.find(
                                                (v) =>
                                                    v.id === zeroTtsPresetVoice,
                                            );
                                        if (!current) return null;
                                        return (
                                            <div className="border border-main bg-main p-2 text-[10px] text-muted">
                                                <p className="font-semibold text-main">
                                                    {current.name}
                                                </p>
                                                <p className="mt-0.5 leading-relaxed">
                                                    {current.description}
                                                </p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ) : null}

                            {zeroTtsVoiceMode === "custom_upload" ? (
                                <div className="space-y-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Upload 10s Sample Voice or Voice
                                            Pack (.wav, .mp3, .m4a, .zip, .npz)
                                        </span>
                                        <input
                                            type="file"
                                            accept="audio/*,.zip,.npz"
                                            onChange={
                                                handleZeroTtsCustomFileChange
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main file:mr-2 file:border-0 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-semibold"
                                        />
                                    </label>
                                    {zeroTtsCustomAudioPreviewUrl ? (
                                        <div className="border border-main bg-main p-2 space-y-1">
                                            <p className="text-[10px] font-semibold text-main">
                                                Audio Sample Preview (10s Voice)
                                            </p>
                                            <audio
                                                controls
                                                src={
                                                    zeroTtsCustomAudioPreviewUrl
                                                }
                                                className="w-full h-8"
                                            />
                                        </div>
                                    ) : null}
                                    {zeroTtsCustomFile &&
                                    /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(
                                        zeroTtsCustomFile.name,
                                    ) ? (
                                        <div className="border border-amber-500/30 bg-amber-500/10 p-2.5 text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                                            <p className="font-semibold">
                                                ⚠️ Hướng dẫn Clone giọng với
                                                ZeroTTS
                                            </p>
                                            <p className="mt-1">
                                                ZeroTTS mã nguồn mở chạy suy
                                                luận trên CPU cần file gói giọng{" "}
                                                <strong>
                                                    <code>.zip</code>
                                                </strong>{" "}
                                                (chứa <code>voice.npz</code>)
                                                được tạo từ web. Để nhân bản
                                                giọng 10s của bạn:
                                            </p>
                                            <ol className="mt-1 list-decimal list-inside space-y-1 pl-1 text-[10px]">
                                                <li>
                                                    Mở{" "}
                                                    <a
                                                        href="https://zeroweight.ai"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="underline font-semibold text-accent"
                                                    >
                                                        zeroweight.ai
                                                    </a>{" "}
                                                    (nơi bạn vừa test 10s thành
                                                    công).
                                                </li>
                                                <li>
                                                    Vào mục{" "}
                                                    <strong>
                                                        Thư viện giọng
                                                    </strong>{" "}
                                                    (Voice Library).
                                                </li>
                                                <li>
                                                    Bấm nút{" "}
                                                    <strong>Tải về</strong> để
                                                    lưu file <code>.zip</code>{" "}
                                                    về máy.
                                                </li>
                                                <li>
                                                    Tải file{" "}
                                                    <strong>
                                                        <code>.zip</code>
                                                    </strong>{" "}
                                                    đó lên đây để bắt đầu đọc.
                                                </li>
                                            </ol>
                                        </div>
                                    ) : null}

                                    {zeroTtsCustomFile &&
                                    /\.(zip|npz)$/i.test(
                                        zeroTtsCustomFile.name,
                                    ) ? (
                                        <div className="border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                            <p className="font-semibold">
                                                ✅ Gói giọng hợp lệ (
                                                {zeroTtsCustomFile.name})
                                            </p>
                                            <p className="mt-0.5">
                                                Sẵn sàng nhân bản giọng đọc với
                                                bộ trọng số ZeroTTS.
                                            </p>
                                        </div>
                                    ) : null}

                                    <p className="text-[10px] text-muted leading-relaxed">
                                        💡 Bạn có thể dùng 8 giọng mẫu có sẵn ở
                                        tab <strong>Preset Voices</strong> (như
                                        Mai Chi, Gia Huy...) hoặc tải gói giọng{" "}
                                        <code>.zip</code>/<code>.npz</code> từ{" "}
                                        <a
                                            href="https://zeroweight.ai"
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-accent underline font-semibold"
                                        >
                                            zeroweight.ai
                                        </a>
                                        .
                                    </p>
                                </div>
                            ) : null}

                            {zeroTtsVoiceMode === "custom_local" ? (
                                <div className="space-y-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-semibold text-muted">
                                            Select Discovered Project Voice
                                        </span>
                                        <select
                                            value={zeroTtsSelectedLocalVoice}
                                            onChange={(e) =>
                                                setZeroTtsSelectedLocalVoice(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                        >
                                            {zeroTtsCustomVoices.length ===
                                            0 ? (
                                                <option value="">
                                                    No local voice files found
                                                    in voices/ or public/clone/
                                                </option>
                                            ) : (
                                                zeroTtsCustomVoices.map((v) => (
                                                    <option
                                                        key={v.id}
                                                        value={
                                                            v.filePath || v.id
                                                        }
                                                    >
                                                        {v.name} - {v.filePath}
                                                    </option>
                                                ))
                                            )}
                                        </select>
                                    </label>
                                    <p className="text-[10px] text-muted leading-relaxed">
                                        Tự động quét các file .zip, .npz, .wav
                                        trong thư mục <code>voices/</code> hoặc{" "}
                                        <code>public/clone/</code>.
                                    </p>
                                </div>
                            ) : null}

                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Speech Speed ({zeroTtsSpeed}x)
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {["1.0", "1.2", "1.4", "1.6"].map(
                                                (s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() =>
                                                            setZeroTtsSpeed(s)
                                                        }
                                                        className={`px-1.5 py-0.5 text-[9px] font-semibold border ${
                                                            zeroTtsSpeed === s
                                                                ? "border-accent bg-accent/20 text-accent"
                                                                : "border-main bg-main text-muted hover:text-main"
                                                        }`}
                                                    >
                                                        {s}x
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.2"
                                        step="0.05"
                                        value={zeroTtsSpeed}
                                        onChange={(e) =>
                                            setZeroTtsSpeed(e.target.value)
                                        }
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                </div>
                                <label className="flex items-center justify-between border border-main bg-main px-3 py-2 text-[11px]">
                                    <span className="font-semibold text-main text-[10px]">
                                        Normalize VI Text
                                    </span>
                                    <input
                                        type="checkbox"
                                        checked={zeroTtsNormalizeVi}
                                        onChange={(e) =>
                                            setZeroTtsNormalizeVi(
                                                e.target.checked,
                                            )
                                        }
                                        className="h-4 w-4 accent-[var(--color-accent)]"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Model Target
                                    </span>
                                    <input
                                        value={zeroTtsModelId}
                                        onChange={(e) =>
                                            setZeroTtsModelId(e.target.value)
                                        }
                                        placeholder="zeroweight-ai/ZeroTTS"
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    />
                                </label>
                                <label className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Sentence Silence (s)
                                    </span>
                                    <input
                                        value={zeroTtsSentenceSilence}
                                        onChange={(e) =>
                                            setZeroTtsSentenceSilence(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="0.2"
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mb-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Voice Match Strength (CFG:{" "}
                                            {zeroTtsCfgScale}x)
                                        </span>
                                        <span className="text-[9px] text-accent font-semibold">
                                            {Number(zeroTtsCfgScale) === 1.0
                                                ? "⚡ Tốc độ gấp đôi (Mặc định)"
                                                : Number(zeroTtsCfgScale) >= 1.2
                                                  ? "🎯 Bám sát giọng mẫu"
                                                  : "🌟 Tự nhiên"}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1.0"
                                        max="1.8"
                                        step="0.05"
                                        value={zeroTtsCfgScale}
                                        onChange={(e) =>
                                            setZeroTtsCfgScale(e.target.value)
                                        }
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <span className="mt-0.5 block text-[9px] text-muted">
                                        1.0x (Mặc định - nhanh gấp đôi) · 1.25x
                                        – 1.4x (Bám sát mẫu hơn)
                                    </span>
                                </label>
                                <div className="block">
                                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                                        Random Seed (Cố định giọng)
                                    </span>
                                    <div className="flex gap-1">
                                        <input
                                            value={zeroTtsSeed}
                                            onChange={(e) =>
                                                setZeroTtsSeed(e.target.value)
                                            }
                                            placeholder="42 (hoặc -1 ngẫu nhiên)"
                                            className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsSeed(
                                                    String(
                                                        Math.floor(
                                                            Math.random() *
                                                                100000,
                                                        ),
                                                    ),
                                                )
                                            }
                                            title="Sinh Seed ngẫu nhiên mới"
                                            className="border border-main bg-main px-2 py-1 text-[10px] font-medium text-muted hover:text-main"
                                        >
                                            🎲
                                        </button>
                                    </div>
                                </div>
                            </div>
                            </div>

                            <div className="border border-main bg-secondary/20 p-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <label className="block">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Background Music (Nhạc nền)
                                        </span>
                                        {zeroTtsBackgroundMusic ? (
                                            <span className="text-[9px] text-accent font-semibold flex items-center gap-1">
                                                <Music className="h-3 w-3" />{" "}
                                                Đang bật
                                            </span>
                                        ) : null}
                                    </div>
                                    <select
                                        value={zeroTtsBackgroundMusic}
                                        onChange={(e) =>
                                            setZeroTtsBackgroundMusic(
                                                e.target.value,
                                            )
                                        }
                                        className="w-full border border-main bg-main px-2 py-1.5 text-[11px] text-main outline-none focus:border-accent"
                                    >
                                        <option value="">Không</option>
                                        {zeroTtsBgmList.map((bgm) => (
                                            <option
                                                key={bgm.source}
                                                value={bgm.source}
                                            >
                                                {bgm.label}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="mt-0.5 block text-[9px] text-muted">
                                        Tự động quét nhạc từ{" "}
                                        <code>public/musics/</code>
                                    </span>
                                </label>
                                <div className="min-w-0 block">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            BGM Volume (
                                            {Math.round(
                                                Number(zeroTtsBgmVolume) * 100,
                                            )}
                                            %)
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {[
                                                "0.15",
                                                "0.25",
                                                "0.40",
                                                "0.60",
                                            ].map((val) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() =>
                                                        setZeroTtsBgmVolume(val)
                                                    }
                                                    className={`border border-main px-1.5 py-0.5 text-[9px] ${
                                                        zeroTtsBgmVolume === val
                                                            ? "bg-accent text-white font-semibold"
                                                            : "bg-main text-muted hover:text-main"
                                                    }`}
                                                >
                                                    {Math.round(
                                                        Number(val) * 100,
                                                    )}
                                                    %
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="1.0"
                                        step="0.05"
                                        value={zeroTtsBgmVolume}
                                        onChange={(e) =>
                                            setZeroTtsBgmVolume(e.target.value)
                                        }
                                        disabled={!zeroTtsBackgroundMusic}
                                        className="w-full accent-[var(--color-accent)] disabled:opacity-40"
                                    />
                                </div>
                            </div>
                            </div>

                            <div className="border border-main bg-secondary/20 p-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                                <div className="min-w-0 block">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Synchronized Video (thêm Video?)
                                        </span>
                                        {zeroTtsVideoFile ? (
                                            <button
                                                type="button"
                                                onClick={
                                                    handleZeroTtsRemoveVideo
                                                }
                                                className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5"
                                                title="Hủy video đã tải lên"
                                            >
                                                <X className="h-3 w-3" /> Hủy
                                                video
                                            </button>
                                        ) : null}
                                    </div>
                                    <label className="relative flex cursor-pointer flex-col items-center justify-center border border-dashed border-main bg-main/50 p-2 text-center transition-colors hover:border-accent">
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleZeroTtsVideoChange}
                                            className="hidden"
                                        />
                                        <div className="flex w-full min-w-0 items-center justify-center gap-1.5 text-[11px] text-main">
                                            <Video className="h-3.5 w-3.5 shrink-0 text-accent" />
                                            <span className="truncate max-w-full font-medium">
                                                {zeroTtsVideoFile
                                                    ? zeroTtsVideoFile.name
                                                    : "Tải video lên (.mp4, .webm...)"}
                                            </span>
                                        </div>
                                        <span className="mt-0.5 block w-full truncate text-[9px] text-muted">
                                            {zeroTtsVideoFile
                                                ? `${formatBytes(zeroTtsVideoFile.size)} · Đã gắn video`
                                                : "Video tự động phát đồng bộ cùng lời speech"}
                                        </span>
                                    </label>
                                </div>
                                <div className="min-w-0 block">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                        <span className="text-[10px] font-semibold text-muted">
                                            Video Volume (
                                            {Math.round(
                                                Number(zeroTtsVideoVolume) *
                                                    100,
                                            )}
                                            %)
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {[
                                                "0.00",
                                                "0.10",
                                                "0.15",
                                                "0.25",
                                                "0.50",
                                            ].map((val) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() =>
                                                        setZeroTtsVideoVolume(
                                                            val,
                                                        )
                                                    }
                                                    className={`border border-main px-1.5 py-0.5 text-[9px] ${
                                                        zeroTtsVideoVolume ===
                                                        val
                                                            ? "bg-accent text-white font-semibold"
                                                            : "bg-main text-muted hover:text-main"
                                                    }`}
                                                >
                                                    {val === "0.00"
                                                        ? "Tắt"
                                                        : `${Math.round(
                                                              Number(val) * 100,
                                                          )}%`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="1.0"
                                        step="0.05"
                                        value={zeroTtsVideoVolume}
                                        onChange={(e) =>
                                            setZeroTtsVideoVolume(
                                                e.target.value,
                                            )
                                        }
                                        disabled={!zeroTtsVideoFile}
                                        className="w-full accent-[var(--color-accent)] disabled:opacity-40"
                                    />
                                    <span className="mt-0.5 block text-[9px] text-muted">
                                        15% giữ âm thanh video gốc nhỏ nhẹ.
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2 border-t border-main">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1">
                                    <span className="text-[10px] font-semibold text-muted">
                                        Video Color Grade (Màu sắc video)
                                    </span>
                                    <span className="text-[9px] font-semibold text-accent">
                                        {zeroTtsColorPresetData?.label ??
                                            "Original (Gốc)"}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                    {COLOR_GRADE_PRESETS.map((preset) => (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsColorPreset(preset.id)
                                            }
                                            title={`${preset.label} — ${preset.desc}`}
                                            className={`min-w-0 truncate border px-1.5 py-1 text-left text-[9px] transition-colors ${
                                                zeroTtsColorPreset === preset.id
                                                    ? "border-accent bg-accent/15 text-accent font-semibold"
                                                    : "border-main bg-main text-muted hover:text-main"
                                            }`}
                                        >
                                            {preset.label.split(" (")[0]}
                                        </button>
                                    ))}
                                </div>
                                <span className="mt-1 block text-[9px] text-muted">
                                    {zeroTtsColorPresetData?.desc ??
                                        "Giữ nguyên màu gốc của video."}
                                </span>
                            </div>
                            </div>

                            {/* CapCut VIP Subtitles Settings */}
                            <div className="border border-main bg-main/40 p-2.5 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Type className="h-3.5 w-3.5 text-accent" />
                                        <span className="text-[10px] font-semibold text-main">
                                            CapCut VIP Captions (Phụ đề Video)
                                        </span>
                                    </div>
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={zeroTtsShowCaptions}
                                            onChange={(e) =>
                                                setZeroTtsShowCaptions(
                                                    e.target.checked,
                                                )
                                            }
                                            className="h-3.5 w-3.5 accent-[var(--color-accent)]"
                                        />
                                        <span className="text-[10px] font-medium text-main">
                                            Bật phụ đề
                                        </span>
                                    </label>
                                </div>

                                {zeroTtsShowCaptions ? (
                                    <div className="grid gap-2 pt-1 border-t border-main">
                                        <div className="grid grid-cols-2 gap-2">
                                            <label className="block">
                                                <span className="mb-1 block text-[9px] font-medium text-muted">
                                                    Style Phụ Đề
                                                </span>
                                                <select
                                                    value={zeroTtsCaptionStyle}
                                                    onChange={(e) =>
                                                        setZeroTtsCaptionStyle(
                                                            e.target
                                                                .value as CapCutCaptionStyle,
                                                        )
                                                    }
                                                    className="w-full border border-main bg-main px-1.5 py-1 text-[10px] text-main outline-none focus:border-accent"
                                                >
                                                    <option value="capcut_yellow">
                                                        🌟 CapCut Yellow Pop
                                                        (Viền hộp & Gạch chân)
                                                    </option>
                                                    <option value="cinematic_white">
                                                        🎬 Cinematic White (Viền
                                                        hộp & Gạch chân)
                                                    </option>
                                                    <option value="neon_emerald">
                                                        ⚡ TikTok Neon Emerald
                                                        (Viền hộp & Gạch chân)
                                                    </option>
                                                    <option value="sunset_orange">
                                                        🔥 Sunset Amber Vintage
                                                        (Viền hộp & Gạch chân)
                                                    </option>
                                                    <option value="clean_yellow">
                                                        ✨ Vàng Hiện Đại (Không
                                                        viền & Không gạch chân)
                                                    </option>
                                                    <option value="clean_white">
                                                        🎬 Trắng Tối Giản (Không
                                                        viền & Không gạch chân)
                                                    </option>
                                                    <option value="clean_emerald">
                                                        🌿 Xanh Mint TikTok
                                                        (Không viền & Không gạch
                                                        chân)
                                                    </option>
                                                    <option value="clean_sunset">
                                                        🔥 Cam Pastel Vintage
                                                        (Không viền & Không gạch
                                                        chân)
                                                    </option>
                                                    <option value="pure_cinema">
                                                        🌟 Chữ Nổi Điện Ảnh
                                                        (Không viền, Không nền,
                                                        Không gạch chân)
                                                    </option>
                                                </select>
                                            </label>

                                            <label className="block">
                                                <span className="mb-1 block text-[9px] font-medium text-muted">
                                                    Vị trí hiển thị
                                                </span>
                                                <select
                                                    value={
                                                        zeroTtsCaptionPosition
                                                    }
                                                    onChange={(e) =>
                                                        setZeroTtsCaptionPosition(
                                                            e.target
                                                                .value as CapCutCaptionPosition,
                                                        )
                                                    }
                                                    className="w-full border border-main bg-main px-1.5 py-1 text-[10px] text-main outline-none focus:border-accent"
                                                >
                                                    <option value="bottom">
                                                        Dưới cùng (Chuẩn
                                                        TikTok/Reels)
                                                    </option>
                                                    <option value="center">
                                                        Chính giữa (Tâm điểm)
                                                    </option>
                                                    <option value="top">
                                                        Phía trên (Top)
                                                    </option>
                                                </select>
                                            </label>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 text-[9px]">
                                            <div className="flex items-center gap-1">
                                                <span className="text-muted font-medium">
                                                    Cỡ chữ:
                                                </span>
                                                {(
                                                    ["sm", "md", "lg"] as const
                                                ).map((sz) => (
                                                    <button
                                                        key={sz}
                                                        type="button"
                                                        onClick={() =>
                                                            setZeroTtsCaptionSize(
                                                                sz,
                                                            )
                                                        }
                                                        className={`px-1.5 py-0.5 border text-[9px] ${
                                                            zeroTtsCaptionSize ===
                                                            sz
                                                                ? "border-accent bg-accent/20 text-accent font-semibold"
                                                                : "border-main bg-main text-muted"
                                                        }`}
                                                    >
                                                        {sz === "sm"
                                                            ? "Nhỏ"
                                                            : sz === "md"
                                                              ? "Vừa"
                                                              : "Lớn VIP"}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            zeroTtsCaptionUppercase
                                                        }
                                                        onChange={(e) =>
                                                            setZeroTtsCaptionUppercase(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="h-3 w-3 accent-[var(--color-accent)]"
                                                    />
                                                    <span className="text-muted">
                                                        VIẾT HOA
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isCaptionNoBorder
                                                        }
                                                        onChange={(e) =>
                                                            setZeroTtsCaptionNoBorder(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="h-3 w-3 accent-[var(--color-accent)]"
                                                    />
                                                    <span className="text-muted">
                                                        BỎ VIỀN HỘP
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            isCaptionNoUnderline
                                                        }
                                                        onChange={(e) =>
                                                            setZeroTtsCaptionNoUnderline(
                                                                e.target
                                                                    .checked,
                                                            )
                                                        }
                                                        className="h-3 w-3 accent-[var(--color-accent)]"
                                                    />
                                                    <span className="text-muted">
                                                        BỎ GẠCH CHÂN
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 border-t border-main pt-2">
                                            <div className="flex items-center justify-between text-[9px]">
                                                <span className="font-medium text-muted">
                                                    {
                                                        "Bù trễ đồng bộ (Sync Lead Offset):"
                                                    }
                                                </span>
                                                <span className="font-mono font-semibold text-accent">
                                                    +{zeroTtsSubtitleLeadMs}ms
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={300}
                                                    step={10}
                                                    value={
                                                        zeroTtsSubtitleLeadMs
                                                    }
                                                    onChange={(e) =>
                                                        setZeroTtsSubtitleLeadMs(
                                                            Number(
                                                                e.target.value,
                                                            ),
                                                        )
                                                    }
                                                    className="w-full h-1.5 accent-[var(--color-accent)] cursor-pointer"
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[8px] text-muted">
                                                <span>0ms (Tĩnh)</span>
                                                <div className="flex gap-1">
                                                    {[60, 120, 180].map(
                                                        (presetMs) => (
                                                            <button
                                                                key={presetMs}
                                                                type="button"
                                                                onClick={() =>
                                                                    setZeroTtsSubtitleLeadMs(
                                                                        presetMs,
                                                                    )
                                                                }
                                                                className={`px-1.5 py-0.5 border text-[8px] ${
                                                                    zeroTtsSubtitleLeadMs ===
                                                                    presetMs
                                                                        ? "border-accent bg-accent/20 text-accent font-semibold"
                                                                        : "border-main bg-main text-muted hover:text-main"
                                                                }`}
                                                            >
                                                                {presetMs ===
                                                                120
                                                                    ? "120ms (Chuẩn)"
                                                                    : `${presetMs}ms`}
                                                            </button>
                                                        ),
                                                    )}
                                                </div>
                                                <span>300ms</span>
                                            </div>
                                            <p className="text-[8px] text-muted">
                                                {
                                                    "Tracking 60fps & bù trễ thị giác 120ms giúp chữ highlight khớp chính xác khi bắt đầu phát âm."
                                                }
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <button
                                type="button"
                                onClick={runZeroTts}
                                disabled={
                                    isRunningZeroTts ||
                                    (zeroTtsVoiceMode === "custom_upload" &&
                                        !zeroTtsCustomFile)
                                }
                                className="inline-flex w-full items-center justify-center gap-2 border border-accent/35 bg-accent/10 px-3 py-2 text-[12px] font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Volume2 className="h-4 w-4" />
                                {isRunningZeroTts
                                    ? "Synthesizing with ZeroTTS..."
                                    : "Synthesize Speech (ZeroTTS)"}
                            </button>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className="border border-main bg-secondary/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[12px] font-semibold text-main">
                                        Vietnamese Text Input
                                    </p>
                                    <div className="flex flex-wrap gap-1">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsText(
                                                    "Bản tin hôm nay ngày 29/09/2026 lúc 15h30, thị trường ghi nhận sự bứt phá với các công nghệ AI giọng nói thế hệ mới.",
                                                )
                                            }
                                            className="border border-main bg-main px-2 py-0.5 text-[10px] text-muted hover:text-main"
                                        >
                                            🗞️ Tin tức
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsText(
                                                    "Xin chào bạn, hôm nay bạn cảm thấy thế nào? Mình là trợ lý OmniVideo, rất vui được hỗ trợ bạn tạo nội dung video.",
                                                )
                                            }
                                            className="border border-main bg-main px-2 py-0.5 text-[10px] text-muted hover:text-main"
                                        >
                                            💬 Trò chuyện
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsText(
                                                    "Chiếc áo này đang có giá ưu đãi chỉ 250.000đ, giảm ngay 30% khi bạn đặt hàng trong livestream lúc 20h00 tối nay nhé!",
                                                )
                                            }
                                            className="border border-main bg-main px-2 py-0.5 text-[10px] text-muted hover:text-main"
                                        >
                                            🛍️ Review / Giá
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setZeroTtsText(
                                                    "Đêm hôm đó, thành phố chìm trong cơn mưa rào bất chợt. Từng giọt nước lộp độp rơi trên mái hiên cũ, gợi lại bao ký ức ngày xưa.",
                                                )
                                            }
                                            className="border border-main bg-main px-2 py-0.5 text-[10px] text-muted hover:text-main"
                                        >
                                            📖 Kể chuyện
                                        </button>
                                    </div>
                                </div>
                                <textarea
                                    rows={6}
                                    value={zeroTtsText}
                                    onChange={(e) =>
                                        setZeroTtsText(e.target.value)
                                    }
                                    placeholder="Nhập văn bản tiếng Việt hoặc song ngữ cần đọc..."
                                    className="mt-2 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                                />
                                {zeroTtsError ? (
                                    <p className="mt-3 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                        {zeroTtsError}
                                    </p>
                                ) : null}
                            </div>

                            {zeroTtsResult && zeroTtsAudioUrl ? (
                                <div className="border border-main bg-secondary/20 p-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <Volume2 className="h-4 w-4 text-accent" />
                                            <p className="text-[12px] font-semibold text-main">
                                                ZeroTTS Audio Output (48kHz)
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted font-mono">
                                            <span>
                                                Thời gian tạo:{" "}
                                                <strong className="text-main">
                                                    {zeroTtsResult.generationDurationMs >=
                                                    60000
                                                        ? `${Math.floor(zeroTtsResult.generationDurationMs / 60000)}m ${Math.round((zeroTtsResult.generationDurationMs % 60000) / 1000)}s`
                                                        : `${(zeroTtsResult.generationDurationMs / 1000).toFixed(1)}s`}
                                                </strong>
                                            </span>
                                            <span>·</span>
                                            <span className="text-accent font-semibold">
                                                {(
                                                    zeroTtsResult.durationMs /
                                                    Math.max(
                                                        1,
                                                        zeroTtsResult.generationDurationMs,
                                                    )
                                                ).toFixed(1)}
                                                x Realtime
                                            </span>
                                            <span>·</span>
                                            <span>
                                                {formatTime(
                                                    zeroTtsResult.durationMs /
                                                        1000,
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    {zeroTtsVideoUrl ? (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[10px] text-accent">
                                                <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                                                    <Video className="h-3.5 w-3.5" />
                                                    Video đang chạy cùng:{" "}
                                                    <strong className="break-all">
                                                        {zeroTtsVideoFile?.name ||
                                                            "Video đã tải lên"}
                                                    </strong>{" "}
                                                    (
                                                    {Math.round(
                                                        Number(
                                                            zeroTtsVideoVolume,
                                                        ) * 100,
                                                    )}
                                                    % âm lượng gốc)
                                                </span>
                                                <span className="text-[9px] text-muted">
                                                    Tự động đồng bộ theo
                                                    Play/Pause của giọng đọc
                                                </span>
                                            </div>
                                            <div className="relative overflow-hidden rounded border border-main bg-black aspect-video max-h-[380px] flex items-center justify-center">
                                                <video
                                                    ref={zeroTtsVideoRef}
                                                    src={zeroTtsVideoUrl}
                                                    loop
                                                    playsInline
                                                    controls
                                                    onTimeUpdate={(e) =>
                                                        setZeroTtsSpeechCurrentTime(
                                                            e.currentTarget
                                                                .currentTime,
                                                        )
                                                    }
                                                    onPlay={
                                                        handleZeroTtsVideoPlay
                                                    }
                                                    onPause={
                                                        handleZeroTtsVideoPause
                                                    }
                                                    onSeeked={
                                                        handleZeroTtsVideoSeeked
                                                    }
                                                    style={{
                                                        filter: zeroTtsVideoFilterCss,
                                                    }}
                                                    className="h-full w-full object-contain"
                                                />
                                                {zeroTtsShowCaptions &&
                                                currentWordsChunk.length > 0 ? (
                                                    <div
                                                        className={`pointer-events-none absolute z-20 max-w-[90%] text-center transition-all duration-150 ${
                                                            zeroTtsCaptionPosition ===
                                                            "top"
                                                                ? "top-6 left-1/2 -translate-x-1/2"
                                                                : zeroTtsCaptionPosition ===
                                                                    "center"
                                                                  ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                                                  : "bottom-6 left-1/2 -translate-x-1/2"
                                                        }`}
                                                    >
                                                        <div
                                                            className={`inline-flex flex-wrap items-center justify-center gap-1.5 transition-all ${
                                                                zeroTtsCaptionSize ===
                                                                "sm"
                                                                    ? "text-xs md:text-sm px-3.5 py-1.5"
                                                                    : zeroTtsCaptionSize ===
                                                                        "lg"
                                                                      ? "text-base md:text-xl px-6 py-3.5"
                                                                      : "text-sm md:text-base px-5 py-2.5"
                                                            } ${
                                                                isCaptionNoBorder
                                                                    ? zeroTtsCaptionStyle ===
                                                                      "pure_cinema"
                                                                        ? "bg-transparent shadow-none border-none p-0"
                                                                        : "bg-black/65 backdrop-blur-md border-none shadow-xl rounded-2xl"
                                                                    : zeroTtsCaptionStyle ===
                                                                        "cinematic_white"
                                                                      ? "bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl rounded-xl"
                                                                      : zeroTtsCaptionStyle ===
                                                                          "neon_emerald"
                                                                        ? "bg-black/85 backdrop-blur-md border border-emerald-400/40 shadow-[0_8px_30px_rgba(16,185,129,0.3)] rounded-2xl"
                                                                        : zeroTtsCaptionStyle ===
                                                                            "sunset_orange"
                                                                          ? "bg-black/85 backdrop-blur-md border border-orange-500/40 shadow-[0_8px_30px_rgba(249,115,22,0.3)] rounded-2xl"
                                                                          : "bg-black/80 backdrop-blur-md border border-yellow-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.8)] rounded-2xl"
                                                            }`}
                                                        >
                                                            {currentWordsChunk.map(
                                                                (item) => (
                                                                    <span
                                                                        key={
                                                                            item.absoluteIndex
                                                                        }
                                                                        className={`inline-block transition-transform duration-100 ${
                                                                            item.isActive
                                                                                ? isCaptionNoUnderline
                                                                                    ? zeroTtsCaptionStyle ===
                                                                                          "cinematic_white" ||
                                                                                      zeroTtsCaptionStyle ===
                                                                                          "clean_white"
                                                                                        ? "text-white scale-110 font-black drop-shadow-[0_2px_14px_rgba(255,255,255,1)]"
                                                                                        : zeroTtsCaptionStyle ===
                                                                                                "neon_emerald" ||
                                                                                            zeroTtsCaptionStyle ===
                                                                                                "clean_emerald"
                                                                                          ? "text-[#34D399] scale-110 font-black drop-shadow-[0_2px_14px_rgba(52,211,153,0.9)]"
                                                                                          : zeroTtsCaptionStyle ===
                                                                                                  "sunset_orange" ||
                                                                                              zeroTtsCaptionStyle ===
                                                                                                  "clean_sunset"
                                                                                            ? "text-[#FB923C] scale-110 font-black drop-shadow-[0_2px_14px_rgba(251,146,60,0.9)]"
                                                                                            : "text-[#FFE600] scale-110 font-black drop-shadow-[0_2px_12px_rgba(255,230,0,0.9)]"
                                                                                    : zeroTtsCaptionStyle ===
                                                                                        "cinematic_white"
                                                                                      ? "text-white scale-110 font-black drop-shadow-[0_2px_14px_rgba(255,255,255,1)] underline decoration-white decoration-2 underline-offset-4"
                                                                                      : zeroTtsCaptionStyle ===
                                                                                          "neon_emerald"
                                                                                        ? "text-[#34D399] scale-110 font-black drop-shadow-[0_2px_14px_rgba(52,211,153,0.9)] underline decoration-[#34D399] decoration-2 underline-offset-4"
                                                                                        : zeroTtsCaptionStyle ===
                                                                                            "sunset_orange"
                                                                                          ? "text-[#FB923C] scale-110 font-black drop-shadow-[0_2px_14px_rgba(251,146,60,0.9)] underline decoration-[#FB923C] decoration-2 underline-offset-4"
                                                                                          : "text-[#FFE600] scale-110 font-black drop-shadow-[0_2px_12px_rgba(255,230,0,0.9)] underline decoration-[#FFE600] decoration-2 underline-offset-4"
                                                                                : item.isPast
                                                                                  ? zeroTtsCaptionStyle ===
                                                                                        "sunset_orange" ||
                                                                                    zeroTtsCaptionStyle ===
                                                                                        "clean_sunset"
                                                                                      ? "text-amber-100 font-extrabold"
                                                                                      : "text-white font-extrabold"
                                                                                  : zeroTtsCaptionStyle ===
                                                                                      "pure_cinema"
                                                                                    ? "text-white/70 font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                                                                                    : "text-white/60 font-medium"
                                                                        }`}
                                                                    >
                                                                        {zeroTtsCaptionUppercase
                                                                            ? item.word.toUpperCase()
                                                                            : item.word}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    ) : null}
                                    <audio
                                        ref={zeroTtsSpeechAudioRef}
                                        controls
                                        className="w-full"
                                        src={zeroTtsAudioUrl}
                                        onTimeUpdate={(e) =>
                                            setZeroTtsSpeechCurrentTime(
                                                e.currentTarget.currentTime,
                                            )
                                        }
                                        onPlay={handleZeroTtsSpeechPlay}
                                        onPause={handleZeroTtsSpeechPause}
                                        onSeeked={handleZeroTtsSpeechSeeked}
                                        onEnded={handleZeroTtsSpeechEnded}
                                    />
                                    {zeroTtsBackgroundMusic ? (
                                        <audio
                                            ref={zeroTtsBgmAudioRef}
                                            src={zeroTtsBackgroundMusic}
                                            loop
                                            preload="auto"
                                            className="hidden"
                                        />
                                    ) : null}
                                    {zeroTtsBackgroundMusic ? (
                                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-[10px] text-accent">
                                            <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-medium">
                                                <Music className="h-3.5 w-3.5" />
                                                Nhạc nền đang chạy cùng:{" "}
                                                <strong className="break-all">
                                                    {zeroTtsBgmList.find(
                                                        (b) =>
                                                            b.source ===
                                                            zeroTtsBackgroundMusic,
                                                    )?.label ||
                                                        zeroTtsBackgroundMusic}
                                                </strong>{" "}
                                                (
                                                {Math.round(
                                                    Number(zeroTtsBgmVolume) *
                                                        100,
                                                )}
                                                % âm lượng)
                                            </span>
                                            <span className="text-[9px] text-muted">
                                                Tự động đồng bộ theo Play/Pause
                                                của giọng đọc
                                            </span>
                                        </div>
                                    ) : null}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 text-[10px]">
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Thời lượng
                                            </span>
                                            <span className="font-semibold text-main">
                                                {(
                                                    zeroTtsResult.durationMs /
                                                    1000
                                                ).toFixed(2)}
                                                s
                                            </span>
                                        </div>
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Thời gian tạo
                                            </span>
                                            <span className="font-semibold text-accent">
                                                {zeroTtsResult.generationDurationMs >=
                                                60000
                                                    ? `${Math.floor(zeroTtsResult.generationDurationMs / 60000)}m ${Math.round((zeroTtsResult.generationDurationMs % 60000) / 1000)}s`
                                                    : `${(zeroTtsResult.generationDurationMs / 1000).toFixed(1)}s`}
                                            </span>
                                        </div>
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Tốc độ (RTF)
                                            </span>
                                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                                {(
                                                    zeroTtsResult.durationMs /
                                                    Math.max(
                                                        1,
                                                        zeroTtsResult.generationDurationMs,
                                                    )
                                                ).toFixed(2)}
                                                x Realtime
                                            </span>
                                        </div>
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Dung lượng
                                            </span>
                                            <span className="font-semibold text-main">
                                                {formatBytes(
                                                    zeroTtsResult.byteLength,
                                                )}
                                            </span>
                                        </div>
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Sample Rate
                                            </span>
                                            <span className="font-semibold text-main">
                                                {zeroTtsResult.sampleRate ||
                                                    48000}{" "}
                                                Hz
                                            </span>
                                        </div>
                                        <div className="border border-main bg-main p-2">
                                            <span className="text-muted block">
                                                Voice
                                            </span>
                                            <span className="font-semibold text-main truncate block">
                                                {zeroTtsResult.voice}
                                            </span>
                                        </div>
                                    </div>
                                    {zeroTtsResult.normalizedText &&
                                    zeroTtsResult.normalizedText !==
                                        zeroTtsResult.text ? (
                                        <div className="border border-main bg-main p-2 text-[10px]">
                                            <span className="text-muted block font-semibold mb-1">
                                                Normalized Spoken Text:
                                            </span>
                                            <p className="text-main leading-relaxed">
                                                {zeroTtsResult.normalizedText}
                                            </p>
                                        </div>
                                    ) : null}
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-main/50 pt-2.5">
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={
                                                    handleZeroTtsRenderVideo
                                                }
                                                disabled={
                                                    isRenderingZeroTtsVideo ||
                                                    (!zeroTtsVideoFile &&
                                                        !zeroTtsVideoUrl)
                                                }
                                                className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/15 px-3 py-1.5 text-[10px] font-semibold text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isRenderingZeroTtsVideo ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <Film className="h-3 w-3" />
                                                )}
                                                {isRenderingZeroTtsVideo
                                                    ? "Đang Render Video (FFmpeg)..."
                                                    : "Xuất Video Hoàn Chỉnh (ZeroTTS Video Render)"}
                                            </button>
                                            {!zeroTtsVideoUrl &&
                                            !zeroTtsVideoFile ? (
                                                <span className="text-[9px] text-muted italic">
                                                    (Cần tải video lên ở mục
                                                    Synchronized Video)
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={zeroTtsAudioUrl}
                                                download="zerotts-output.wav"
                                                className="inline-flex items-center gap-1.5 border border-main bg-main px-3 py-1.5 text-[10px] font-semibold text-main hover:bg-secondary"
                                            >
                                                <Download className="h-3 w-3" />
                                                Download ZeroTTS WAV
                                            </a>
                                        </div>
                                    </div>

                                    {zeroTtsRenderError ? (
                                        <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] text-rose-700 dark:text-rose-400">
                                            {zeroTtsRenderError}
                                        </p>
                                    ) : null}

                                    {zeroTtsRenderedVideoUrl &&
                                    zeroTtsRenderedResult ? (
                                        <div className="border border-accent/40 bg-accent/5 p-3 space-y-2 rounded">
                                            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-accent" />
                                                    <span className="text-[11px] font-semibold text-accent">
                                                        Video đã xuất hoàn chỉnh
                                                        (Full Settings Render)
                                                    </span>
                                                </div>
                                                <a
                                                    href={
                                                        zeroTtsRenderedVideoUrl
                                                    }
                                                    download={
                                                        zeroTtsRenderedResult.fileName
                                                    }
                                                    className="inline-flex items-center gap-1.5 border border-accent bg-accent px-2.5 py-1 text-[10px] font-semibold text-white shadow hover:opacity-90"
                                                >
                                                    <Download className="h-3 w-3" />
                                                    Tải MP4 (
                                                    {formatBytes(
                                                        zeroTtsRenderedResult.fileSizeBytes,
                                                    )}
                                                    )
                                                </a>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
                                                <span>
                                                    File:{" "}
                                                    <strong className="text-main">
                                                        {
                                                            zeroTtsRenderedResult.fileName
                                                        }
                                                    </strong>
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    Thời lượng:{" "}
                                                    <strong className="text-main">
                                                        {zeroTtsRenderedResult.durationSeconds.toFixed(
                                                            1,
                                                        )}
                                                        s
                                                    </strong>
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    Dung lượng:{" "}
                                                    <strong className="text-main">
                                                        {formatBytes(
                                                            zeroTtsRenderedResult.fileSizeBytes,
                                                        )}
                                                    </strong>
                                                </span>
                                            </div>
                                            <div className="relative aspect-video max-h-[300px] bg-black rounded overflow-hidden flex items-center justify-center">
                                                <video
                                                    src={
                                                        zeroTtsRenderedVideoUrl
                                                    }
                                                    controls
                                                    playsInline
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                {/* Video Color Grading & Lighting Studio */}
                <div className="border-t border-main" />
                <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main pb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <SunMedium className="h-4 w-4 text-accent" />
                                <h3 className="text-sm font-semibold text-main">
                                    Video Color Grading & Lighting Studio
                                </h3>
                                <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                    Anti-Overexposure & Moody Engine
                                </span>
                            </div>
                            <p className="mt-1 text-[11px] text-muted">
                                Xử lý video chuyên nghiệp: Khắc phục triệt để
                                video bị chói sáng, lóa trắng do camera cũ
                                (Anti-Overexposure) hoặc biến hóa phong cách tối
                                hơn, đậm màu hơn, trầm buồn (Moody Melancholy /
                                Noir). Live 60fps CSS Preview & Xuất video
                                FFmpeg.
                            </p>
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
                        {/* Left column: Presets & Fine-tuning Controls */}
                        <div className="space-y-3 border border-main bg-secondary/20 p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-[12px] font-semibold text-main flex items-center gap-1.5">
                                    <SlidersHorizontal className="h-3.5 w-3.5 text-accent" />
                                    1-Click Pro Color Presets
                                </p>
                                <span className="text-[10px] text-muted">
                                    Chọn để áp dụng nhanh
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5">
                                {COLOR_GRADE_PRESETS.map((preset) => {
                                    const isSelected =
                                        cgActivePreset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() =>
                                                applyColorGradePreset(preset.id)
                                            }
                                            className={`flex flex-col text-left p-2 border transition-all text-[10px] ${
                                                isSelected
                                                    ? "border-accent bg-accent/15 text-accent shadow-sm"
                                                    : "border-main bg-main text-muted hover:text-main hover:border-accent/40"
                                            }`}
                                        >
                                            <span className="font-semibold truncate">
                                                {preset.label}
                                            </span>
                                            <span className="text-[9px] text-muted truncate mt-0.5">
                                                {preset.badge}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Manual Sliders */}
                            <div className="pt-2 border-t border-main space-y-2.5">
                                <p className="text-[11px] font-semibold text-main">
                                    Tinh Chỉnh Thủ Công (Manual Fine-Tuning)
                                </p>

                                {/* Brightness */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Độ sáng (Brightness)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgBrightness > 0
                                                ? `+${cgBrightness.toFixed(2)}`
                                                : cgBrightness.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-0.50"
                                        max="0.50"
                                        step="0.01"
                                        value={cgBrightness}
                                        onChange={(e) => {
                                            setCgBrightness(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Tối đi (-0.50)</span>
                                        <span>Chuẩn (0.00)</span>
                                        <span>Sáng lên (+0.50)</span>
                                    </div>
                                </div>

                                {/* Contrast */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Độ tương phản (Contrast)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgContrast.toFixed(2)}x
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.02"
                                        value={cgContrast}
                                        onChange={(e) => {
                                            setCgContrast(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Nhạt nhòa (0.50)</span>
                                        <span>Gốc (1.00)</span>
                                        <span>Đậm gắt (2.00)</span>
                                    </div>
                                </div>

                                {/* Saturation */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Độ bão hòa màu (Saturation)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgSaturation.toFixed(2)}x
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="2.5"
                                        step="0.05"
                                        value={cgSaturation}
                                        onChange={(e) => {
                                            setCgSaturation(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Đen trắng (0.00)</span>
                                        <span>Gốc (1.00)</span>
                                        <span>Rực rỡ (2.50)</span>
                                    </div>
                                </div>

                                {/* Gamma Curve */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Cân bằng Gamma (Highlight & Shadow)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgGamma.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.5"
                                        max="2.0"
                                        step="0.02"
                                        value={cgGamma}
                                        onChange={(e) => {
                                            setCgGamma(Number(e.target.value));
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>
                                            Hạ chói & dìm sáng (&lt;1.0)
                                        </span>
                                        <span>Gốc (1.0)</span>
                                        <span>Nâng shadow (&gt;1.0)</span>
                                    </div>
                                </div>

                                {/* Vignette */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Viền tối góc (Vignette Shadow)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {Math.round(cgVignette * 100)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0.0"
                                        max="1.0"
                                        step="0.05"
                                        value={cgVignette}
                                        onChange={(e) => {
                                            setCgVignette(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Không có (0%)</span>
                                        <span>Điện ảnh (40-60%)</span>
                                        <span>Tối góc sâu (100%)</span>
                                    </div>
                                </div>

                                {/* Temperature */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Nhiệt độ màu (Color Temp)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgTemperature > 0
                                                ? `+${cgTemperature} (Ấm vàng)`
                                                : cgTemperature < 0
                                                  ? `${cgTemperature} (Lạnh xanh)`
                                                  : "0 (Trung tính)"}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-50"
                                        max="50"
                                        step="1"
                                        value={cgTemperature}
                                        onChange={(e) => {
                                            setCgTemperature(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Lạnh u sầu (-50)</span>
                                        <span>Chuẩn (0)</span>
                                        <span>Ấm vintage (+50)</span>
                                    </div>
                                </div>

                                {/* Tint (Green / Magenta) */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Ám màu Xanh–Hồng (Tint)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgTint > 0
                                                ? `+${cgTint} (Hồng tím)`
                                                : cgTint < 0
                                                  ? `${cgTint} (Xanh lá)`
                                                  : "0 (Trung tính)"}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-50"
                                        max="50"
                                        step="1"
                                        value={cgTint}
                                        onChange={(e) => {
                                            setCgTint(Number(e.target.value));
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Xanh lá (-50)</span>
                                        <span>Chuẩn (0)</span>
                                        <span>Hồng tím (+50)</span>
                                    </div>
                                </div>

                                {/* Hue */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Sắc thái màu (Hue Shift)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgHue}°
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-180"
                                        max="180"
                                        step="1"
                                        value={cgHue}
                                        onChange={(e) => {
                                            setCgHue(Number(e.target.value));
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Xoay ngược (-180°)</span>
                                        <span>Gốc (0°)</span>
                                        <span>Xoay thuận (+180°)</span>
                                    </div>
                                </div>

                                {/* Vibrance */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Rực màu tự nhiên (Vibrance)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {cgVibrance > 0 ? "+" : ""}
                                            {cgVibrance.toFixed(2)}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="-1"
                                        max="1"
                                        step="0.05"
                                        value={cgVibrance}
                                        onChange={(e) => {
                                            setCgVibrance(
                                                Number(e.target.value),
                                            );
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Dịu màu (-1.00)</span>
                                        <span>Gốc (0.00)</span>
                                        <span>Rực tự nhiên (+1.00)</span>
                                    </div>
                                </div>

                                {/* Sepia */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-muted">
                                            Phim cổ Sepia (Sepia Tone)
                                        </span>
                                        <span className="font-mono font-medium text-main">
                                            {Math.round(cgSepia)}%
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={cgSepia}
                                        onChange={(e) => {
                                            setCgSepia(Number(e.target.value));
                                            setCgActivePreset("custom");
                                        }}
                                        className="w-full accent-[var(--color-accent)]"
                                    />
                                    <div className="flex justify-between text-[8px] text-muted">
                                        <span>Không (0%)</span>
                                        <span>Hoài niệm (50%)</span>
                                        <span>Cổ điển (100%)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right column: Video Preview, Compare Mode & Render Actions */}
                        <div className="space-y-3">
                            {/* Video Input selection */}
                            <div className="border border-main bg-secondary/20 p-3 space-y-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-main flex items-center gap-1.5">
                                        <Video className="h-3.5 w-3.5 text-accent" />
                                        Chọn Video Cần Xử Lý
                                    </span>
                                    {zeroTtsVideoFile ? (
                                        <button
                                            type="button"
                                            onClick={
                                                handleUseZeroTtsVideoForColorGrade
                                            }
                                            className="text-[10px] text-accent hover:underline font-semibold flex items-center gap-1"
                                        >
                                            <Sparkles className="h-3 w-3" /> Sử
                                            dụng video từ ZeroTTS Voice Lab
                                        </button>
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <label className="flex cursor-pointer items-center gap-1.5 border border-dashed border-main bg-main px-3 py-1.5 text-[11px] text-muted hover:border-accent hover:text-main transition-colors">
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleCgVideoChange}
                                            className="hidden"
                                        />
                                        <Video className="h-3.5 w-3.5 text-accent" />
                                        <span>
                                            {cgVideoFile
                                                ? cgVideoFile.name
                                                : "Tải video lên (.mp4, .mov, .webm...)"}
                                        </span>
                                    </label>
                                    {cgVideoFile ? (
                                        <span className="text-[10px] text-muted">
                                            {formatBytes(cgVideoFile.size)} ·
                                            Sẵn sàng xử lý
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* Live Player & Before/After split */}
                            {cgVideoUrl ? (
                                <div className="border border-main bg-secondary/20 p-3 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Film className="h-4 w-4 text-accent" />
                                            <span className="text-[11px] font-semibold text-main">
                                                Live 60fps Realtime Preview
                                            </span>
                                            {cgCompareMode ? (
                                                <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                                                    Đang hiển thị Video Gốc
                                                    (Raw)
                                                </span>
                                            ) : (
                                                <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-semibold">
                                                    Đang áp dụng bộ lọc màu &
                                                    ánh sáng
                                                </span>
                                            )}
                                        </div>

                                        <div className="inline-flex rounded border border-main bg-main p-0.5 text-[10px]">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCgCompareMode(false)
                                                }
                                                className={`flex items-center gap-1 px-2.5 py-1 font-semibold transition-all rounded-sm ${
                                                    !cgCompareMode
                                                        ? "bg-accent text-white shadow-sm"
                                                        : "text-muted hover:text-main"
                                                }`}
                                            >
                                                <Sparkles className="h-3 w-3" />
                                                ✨ Đã chỉnh màu
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCgCompareMode(true)
                                                }
                                                className={`flex items-center gap-1 px-2.5 py-1 font-semibold transition-all rounded-sm ${
                                                    cgCompareMode
                                                        ? "bg-rose-500 text-white shadow-sm"
                                                        : "text-muted hover:text-main"
                                                }`}
                                            >
                                                <Eye className="h-3 w-3" />
                                                👁️ Video gốc
                                            </button>
                                        </div>
                                    </div>

                                    {/* Video Canvas Container with CSS Filter & Vignette */}
                                    <div className="relative overflow-hidden rounded border border-main bg-black aspect-video max-h-[420px] flex items-center justify-center">
                                        <video
                                            ref={cgPreviewVideoRef}
                                            src={cgVideoUrl}
                                            loop
                                            playsInline
                                            controls
                                            className="h-full w-full object-contain transition-all duration-75"
                                            style={{
                                                filter: cgFilterCss,
                                            }}
                                        />

                                        {/* Vignette Overlay */}
                                        {!cgCompareMode && cgVignette > 0 ? (
                                            <div
                                                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-150"
                                                style={{
                                                    background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${cgVignette}))`,
                                                }}
                                            />
                                        ) : null}
                                    </div>

                                    {/* Export Action */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-main">
                                        <div className="text-[10px] text-muted">
                                            FFmpeg Engine xuất video chất lượng
                                            cao với GPU/CPU tối ưu, giữ nguyên
                                            âm thanh.
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleCgRenderExport}
                                            disabled={
                                                cgIsRendering || !cgVideoFile
                                            }
                                            className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/15 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/25 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {cgIsRendering ? (
                                                <>
                                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                    Đang xuất video FFmpeg...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="h-3.5 w-3.5" />
                                                    {
                                                        "Xuất Video Hoàn Chỉnh (FFmpeg Render)"
                                                    }
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {cgRenderError ? (
                                        <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10px] text-rose-600 dark:text-rose-400">
                                            {cgRenderError}
                                        </p>
                                    ) : null}

                                    {/* Render Result Card */}
                                    {cgRenderResult ? (
                                        <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                                                    ✅ Xuất video thành công!
                                                </span>
                                                <span className="text-[10px] text-muted font-mono">
                                                    Thời gian xử lý:{" "}
                                                    {(
                                                        (cgRenderResult.processingDurationMs ||
                                                            0) / 1000
                                                    ).toFixed(1)}
                                                    s
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted">
                                                <span>
                                                    File:{" "}
                                                    {cgRenderResult.filename}
                                                </span>
                                                <span>
                                                    Dung lượng:{" "}
                                                    {formatBytes(
                                                        cgRenderResult.outputSize ||
                                                            0,
                                                    )}
                                                </span>
                                            </div>
                                            <div className="flex justify-end pt-1">
                                                <a
                                                    href={
                                                        cgRenderResult.videoUrl
                                                    }
                                                    download={
                                                        cgRenderResult.filename
                                                    }
                                                    className="inline-flex items-center gap-1.5 border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/30 transition-colors"
                                                >
                                                    <Download className="h-3 w-3" />
                                                    Tải Video Đã Xử Lý (Download
                                                    MP4)
                                                </a>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
                            ) : (
                                <div className="border border-dashed border-main bg-main/30 p-8 text-center text-muted text-[11px]">
                                    Vui lòng tải video lên hoặc sử dụng video từ
                                    ZeroTTS Voice Lab để bắt đầu căn chỉnh màu
                                    sắc và ánh sáng.
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </section>
    );
}
