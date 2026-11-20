"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AudioWaveform,
    Download,
    Eye,
    Film,
    Loader2,
    Music,
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

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const idx = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024)),
    );
    const value = bytes / Math.pow(1024, idx);
    return `${value.toFixed(value >= 10 || idx === 0 ? 1 : 2)} ${units[idx]}`;
}

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const wholeSecs = Math.floor(secs);
    const ms = Math.floor((secs - wholeSecs) * 1000);
    return `${String(mins).padStart(2, "0")}:${String(wholeSecs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

type ZeroTtsVoiceLabPanelProps = {
    section?: LeftbarNavItem;
};

export function ZeroTtsVoiceLabPanel({ section }: ZeroTtsVoiceLabPanelProps) {
    const Icon = section?.icon ?? AudioWaveform;

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
    const [zeroTtsCaptionUppercase, setZeroTtsCaptionUppercase] = useState(false);
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
        zeroTtsCaptionStyle === "clean_yellow" ||
        zeroTtsCaptionStyle === "clean_white" ||
        zeroTtsCaptionStyle === "clean_emerald" ||
        zeroTtsCaptionStyle === "clean_sunset" ||
        zeroTtsCaptionStyle === "pure_cinema";

    const isCaptionNoUnderline =
        zeroTtsCaptionNoUnderline ||
        zeroTtsCaptionStyle === "clean_yellow" ||
        zeroTtsCaptionStyle === "clean_white" ||
        zeroTtsCaptionStyle === "clean_emerald" ||
        zeroTtsCaptionStyle === "clean_sunset" ||
        zeroTtsCaptionStyle === "pure_cinema";

    const speechRafRef = useRef<number | null>(null);
    const lastReportedTimeRef = useRef<number>(0);
    const [zeroTtsSpeechCurrentTime, setZeroTtsSpeechCurrentTime] = useState(0);
    const [zeroTtsSubtitleLeadMs, setZeroTtsSubtitleLeadMs] = useState(120);

    // Advanced Color Grading Studio State
    const [cgVideoFile, setCgVideoFile] = useState<File | null>(null);
    const [cgVideoPreviewUrl, setCgVideoPreviewUrl] = useState<string | null>(
        null,
    );
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
        return () => {
            if (speechRafRef.current) {
                cancelAnimationFrame(speechRafRef.current);
            }
        };
    }, []);

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
        return () => {
            if (cgVideoPreviewUrl && cgVideoPreviewUrl.startsWith("blob:")) {
                URL.revokeObjectURL(cgVideoPreviewUrl);
            }
        };
    }, [cgVideoPreviewUrl]);

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

    const applyCgPreset = (presetId: string) => {
        setCgActivePreset(presetId);
        const found = COLOR_GRADE_PRESETS.find((p) => p.id === presetId);
        if (!found) return;
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

    const cgFilterOptions: ColorGradeFilterOptions = useMemo(
        () => ({
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
            presetName: cgActivePreset,
        }),
        [
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
            cgActivePreset,
        ],
    );

    const cgFilterCss = useMemo(
        () => (cgCompareMode ? "none" : buildColorGradeCssFilter(cgFilterOptions)),
        [cgCompareMode, cgFilterOptions],
    );

    const handleCgVideoChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = event.target.files?.[0] ?? null;
        setCgVideoFile(file);
        if (cgVideoPreviewUrl && cgVideoPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(cgVideoPreviewUrl);
        }
        if (file) {
            setCgVideoPreviewUrl(URL.createObjectURL(file));
        } else {
            setCgVideoPreviewUrl(null);
        }
    };

    const handleUseZeroTtsVideoForColorGrade = () => {
        if (!zeroTtsVideoFile) return;
        setCgVideoFile(zeroTtsVideoFile);
        if (cgVideoPreviewUrl && cgVideoPreviewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(cgVideoPreviewUrl);
        }
        setCgVideoPreviewUrl(URL.createObjectURL(zeroTtsVideoFile));
    };

    const handleCgRenderExport = async () => {
        if (!cgVideoFile) {
            setCgRenderError("Vui lòng tải video lên trước khi xuất.");
            return;
        }

        setCgIsRendering(true);
        setCgRenderError(null);
        try {
            const formData = new FormData();
            formData.append("video", cgVideoFile);
            formData.append("options", JSON.stringify(cgFilterOptions));

            const response = await fetch("/api/video-processing/color-grade", {
                method: "POST",
                body: formData,
            });

            const data = await response.json();
            if (!response.ok || !data.ok) {
                throw new Error(
                    data.error || "Quá trình xử lý màu sắc video thất bại.",
                );
            }

            setCgRenderResult(data.data);
        } catch (err) {
            setCgRenderError(
                err instanceof Error
                    ? err.message
                    : "Lỗi xử lý render video bằng FFmpeg.",
            );
        } finally {
            setCgIsRendering(false);
        }
    };

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

    return (
        <section className="flex flex-col gap-6 p-6">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-main pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 text-accent">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold text-main">
                            ZeroTTS Voice Lab
                        </h1>
                        <p className="text-xs text-muted">
                            Vietnamese Zero-Shot Voice Cloning & High-Speed CPU
                            Text-to-Speech (zeroweight-ai/ZeroTTS)
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="border border-accent/40 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
                        Zero-Shot Voice Cloning
                    </span>
                    <span className="border border-main bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted">
                        202M CPU-Optimized
                    </span>
                    <span className="border border-main bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-muted">
                        48kHz Audio
                    </span>
                </div>
            </header>

            <p className="text-xs text-muted leading-relaxed">
                Mô hình <strong>ZeroTTS</strong> (phát triển bởi{" "}
                <strong>ZeroWeight AI</strong>) tối ưu hóa cho tiếng Việt. Hỗ
                trợ xử lý viết tắt, ngày tháng, giờ giấc, số tiền tự động bằng bộ
                chuẩn hóa tiếng Việt <code>normalize_vi_text</code>.
            </p>

            <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
                {/* Left Column: Voice, Music, Video, Captions */}
                <div className="min-w-0 space-y-4">
                    {/* Card 1: Voice & Synthesis Settings */}
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
                                    const current = zeroTtsPresetVoices.find(
                                        (v) => v.id === zeroTtsPresetVoice,
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
                                        Upload 10s Sample Voice or Voice Pack
                                        (.wav, .mp3, .m4a, .zip, .npz)
                                    </span>
                                    <input
                                        type="file"
                                        accept="audio/*,.zip,.npz"
                                        onChange={handleZeroTtsCustomFileChange}
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
                                            src={zeroTtsCustomAudioPreviewUrl}
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
                                            ⚠️ Hướng dẫn Clone giọng với ZeroTTS
                                        </p>
                                        <p className="mt-1">
                                            ZeroTTS mã nguồn mở chạy suy luận
                                            trên CPU cần file gói giọng{" "}
                                            <strong>
                                                <code>.zip</code>
                                            </strong>{" "}
                                            (chứa <code>voice.npz</code>) được
                                            tạo từ web. Để nhân bản giọng 10s của
                                            bạn:
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
                                                <strong>Thư viện giọng</strong>{" "}
                                                (Voice Library).
                                            </li>
                                            <li>
                                                Bấm nút <strong>Tải về</strong>{" "}
                                                để lưu file <code>.zip</code> về
                                                máy.
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
                                /\.(zip|npz)$/i.test(zeroTtsCustomFile.name) ? (
                                    <div className="border border-emerald-500/30 bg-emerald-500/10 p-2 text-[10px] text-emerald-700 dark:text-emerald-300 leading-relaxed">
                                        <p className="font-semibold">
                                            ✅ Gói giọng hợp lệ (
                                            {zeroTtsCustomFile.name})
                                        </p>
                                        <p className="mt-0.5">
                                            Sẵn sàng nhân bản giọng đọc với bộ
                                            trọng số ZeroTTS.
                                        </p>
                                    </div>
                                ) : null}

                                <p className="text-[10px] text-muted leading-relaxed">
                                    💡 Bạn có thể dùng các giọng mẫu có sẵn ở tab{" "}
                                    <strong>Preset Voices</strong> hoặc tải gói
                                    giọng <code>.zip</code>/<code>.npz</code> từ{" "}
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
                                        {zeroTtsCustomVoices.length === 0 ? (
                                            <option value="">
                                                No local voice files found in
                                                voices/ or public/clone/
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
                                    Tự động quét các file .zip, .npz, .wav trong
                                    thư mục <code>voices/</code> hoặc{" "}
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
                                        setZeroTtsNormalizeVi(e.target.checked)
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
                                    1.0x (Mặc định - nhanh gấp đôi) · 1.25x –
                                    1.4x (Bám sát mẫu hơn)
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
                                                        Math.random() * 100000,
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

                    {/* Card 2: Background Music */}
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <label className="block">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-semibold text-muted">
                                        Background Music (Nhạc nền)
                                    </span>
                                    {zeroTtsBackgroundMusic ? (
                                        <span className="text-[9px] text-accent font-semibold flex items-center gap-1">
                                            <Music className="h-3 w-3" /> Đang
                                            bật
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
                                                {Math.round(Number(val) * 100)}%
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

                    {/* Card 3: Synchronized Video */}
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
                                            onClick={handleZeroTtsRemoveVideo}
                                            className="text-[9px] text-rose-500 hover:underline flex items-center gap-0.5"
                                            title="Hủy video đã tải lên"
                                        >
                                            <X className="h-3 w-3" /> Hủy video
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
                                            Number(zeroTtsVideoVolume) * 100,
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
                                                    setZeroTtsVideoVolume(val)
                                                }
                                                className={`border border-main px-1.5 py-0.5 text-[9px] ${
                                                    zeroTtsVideoVolume === val
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
                                        setZeroTtsVideoVolume(e.target.value)
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

                    {/* Card 4: CapCut VIP Captions */}
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
                                        setZeroTtsShowCaptions(e.target.checked)
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
                                                🌟 CapCut Yellow Pop (Viền hộp &
                                                Gạch chân)
                                            </option>
                                            <option value="cinematic_white">
                                                🎬 Cinematic White (Viền hộp &
                                                Gạch chân)
                                            </option>
                                            <option value="neon_emerald">
                                                ⚡ TikTok Neon Emerald (Viền
                                                hộp & Gạch chân)
                                            </option>
                                            <option value="sunset_orange">
                                                🔥 Sunset Amber Vintage (Viền
                                                hộp & Gạch chân)
                                            </option>
                                            <option value="clean_yellow">
                                                ✨ Vàng Hiện Đại (Không viền &
                                                Không gạch chân)
                                            </option>
                                            <option value="clean_white">
                                                🎬 Trắng Tối Giản (Không viền &
                                                Không gạch chân)
                                            </option>
                                            <option value="clean_emerald">
                                                🌿 Xanh Mint TikTok (Không viền
                                                & Không gạch chân)
                                            </option>
                                            <option value="clean_sunset">
                                                🔥 Cam Pastel Vintage (Không
                                                viền & Không gạch chân)
                                            </option>
                                            <option value="pure_cinema">
                                                🌟 Chữ Nổi Điện Ảnh (Không viền,
                                                Không nền, Không gạch chân)
                                            </option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className="mb-1 block text-[9px] font-medium text-muted">
                                            Vị trí hiển thị
                                        </span>
                                        <select
                                            value={zeroTtsCaptionPosition}
                                            onChange={(e) =>
                                                setZeroTtsCaptionPosition(
                                                    e.target
                                                        .value as CapCutCaptionPosition,
                                                )
                                            }
                                            className="w-full border border-main bg-main px-1.5 py-1 text-[10px] text-main outline-none focus:border-accent"
                                        >
                                            <option value="bottom">
                                                Dưới cùng (Chuẩn TikTok/Reels)
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
                                        {(["sm", "md", "lg"] as const).map(
                                            (sz) => (
                                                <button
                                                    key={sz}
                                                    type="button"
                                                    onClick={() =>
                                                        setZeroTtsCaptionSize(
                                                            sz,
                                                        )
                                                    }
                                                    className={`px-1.5 py-0.5 border text-[9px] ${
                                                        zeroTtsCaptionSize === sz
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
                                            ),
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="flex items-center gap-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={zeroTtsCaptionUppercase}
                                                onChange={(e) =>
                                                    setZeroTtsCaptionUppercase(
                                                        e.target.checked,
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
                                                checked={isCaptionNoBorder}
                                                onChange={(e) =>
                                                    setZeroTtsCaptionNoBorder(
                                                        e.target.checked,
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
                                                checked={isCaptionNoUnderline}
                                                onChange={(e) =>
                                                    setZeroTtsCaptionNoUnderline(
                                                        e.target.checked,
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
                                            Bù trễ đồng bộ (Sync Lead Offset):
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
                                            value={zeroTtsSubtitleLeadMs}
                                            onChange={(e) =>
                                                setZeroTtsSubtitleLeadMs(
                                                    Number(e.target.value),
                                                )
                                            }
                                            className="w-full h-1.5 accent-[var(--color-accent)] cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[8px] text-muted">
                                        <span>0ms (Tĩnh)</span>
                                        <div className="flex gap-1">
                                            {[60, 120, 180].map((presetMs) => (
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
                                                    {presetMs === 120
                                                        ? "120ms (Chuẩn)"
                                                        : `${presetMs}ms`}
                                                </button>
                                            ))}
                                        </div>
                                        <span>300ms</span>
                                    </div>
                                    <p className="text-[8px] text-muted">
                                        Tracking 60fps & bù trễ thị giác 120ms
                                        giúp chữ highlight khớp chính xác khi
                                        bắt đầu phát âm.
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

                {/* Right Column: Text Input, Player, Synchronized Video & Export */}
                <div className="min-w-0 space-y-4">
                    {/* Text Input Card */}
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
                            onChange={(e) => setZeroTtsText(e.target.value)}
                            placeholder="Nhập văn bản tiếng Việt hoặc song ngữ cần đọc..."
                            className="mt-2 w-full resize-none border border-main bg-main px-2 py-1.5 text-[11px] leading-5 text-main outline-none focus:border-accent"
                        />
                        {zeroTtsError ? (
                            <p className="mt-3 border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] leading-5 text-rose-700">
                                {zeroTtsError}
                            </p>
                        ) : null}
                    </div>

                    {/* Output Card */}
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
                                            zeroTtsResult.durationMs / 1000,
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* Synchronized Video Preview */}
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
                                                Number(zeroTtsVideoVolume) *
                                                    100,
                                            )}
                                            % âm lượng gốc)
                                        </span>
                                        <span className="text-[9px] text-muted">
                                            Tự động đồng bộ theo Play/Pause của
                                            giọng đọc
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
                                                    e.currentTarget.currentTime,
                                                )
                                            }
                                            onPlay={handleZeroTtsVideoPlay}
                                            onPause={handleZeroTtsVideoPause}
                                            onSeeked={handleZeroTtsVideoSeeked}
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

                            {/* Audio player */}
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
                                            )?.label || zeroTtsBackgroundMusic}
                                        </strong>{" "}
                                        (
                                        {Math.round(
                                            Number(zeroTtsBgmVolume) * 100,
                                        )}
                                        % âm lượng)
                                    </span>
                                    <span className="text-[9px] text-muted">
                                        Tự động đồng bộ theo Play/Pause của
                                        giọng đọc
                                    </span>
                                </div>
                            ) : null}

                            {/* Specs grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 text-[10px]">
                                <div className="border border-main bg-main p-2">
                                    <span className="text-muted block">
                                        Thời lượng
                                    </span>
                                    <span className="font-semibold text-main">
                                        {(
                                            zeroTtsResult.durationMs / 1000
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
                                        {formatBytes(zeroTtsResult.byteLength)}
                                    </span>
                                </div>
                                <div className="border border-main bg-main p-2">
                                    <span className="text-muted block">
                                        Sample Rate
                                    </span>
                                    <span className="font-semibold text-main">
                                        {zeroTtsResult.sampleRate || 48000} Hz
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

                            {/* Render & Download Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-main/50 pt-2.5">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleZeroTtsRenderVideo}
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
                                    {!zeroTtsVideoUrl && !zeroTtsVideoFile ? (
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

                            {/* Rendered Video Result */}
                            {zeroTtsRenderedVideoUrl &&
                            zeroTtsRenderedResult ? (
                                <div className="border border-accent/40 bg-accent/5 p-3 space-y-2 rounded">
                                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-accent" />
                                            <span className="text-[11px] font-semibold text-accent">
                                                Video đã xuất hoàn chỉnh (Full
                                                Settings Render)
                                            </span>
                                        </div>
                                        <a
                                            href={zeroTtsRenderedVideoUrl}
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
                                                {zeroTtsRenderedResult.fileName}
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
                                            src={zeroTtsRenderedVideoUrl}
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

            {/* Video Color Grading & Lighting Studio */}
            <div className="border-t border-main" />
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <SunMedium className="h-4 w-4 text-accent" />
                            <h3 className="text-[13px] font-semibold text-main">
                                Video Color Grading & Lighting Studio
                            </h3>
                            <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                Anti-Overexposure & Moody Engine
                            </span>
                        </div>
                        <p className="text-[10px] text-muted leading-relaxed">
                            Xử lý video chuyên nghiệp: Khắc phục triệt để video
                            bị chói sáng, lóa trắng do camera cũ
                            (Anti-Overexposure) hoặc biến hóa phong cách tối hơn,
                            đậm màu hơn, trầm buồn (Moody Melancholy / Noir).
                            Live 60fps CSS Preview & Xuất video FFmpeg.
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {/* Controls */}
                    <div className="space-y-3">
                        <div className="border border-main bg-secondary/20 p-3 space-y-2">
                            <span className="text-[11px] font-semibold text-main block">
                                Preset Phong Cách Màu Nhanh
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                {COLOR_GRADE_PRESETS.map((preset) => {
                                    const isSelected =
                                        cgActivePreset === preset.id;
                                    return (
                                        <button
                                            key={preset.id}
                                            type="button"
                                            onClick={() =>
                                                applyCgPreset(preset.id)
                                            }
                                            className={`flex flex-col items-start border p-2 text-left transition-colors ${
                                                isSelected
                                                    ? "border-accent bg-accent/15 text-accent"
                                                    : "border-main bg-main text-muted hover:border-accent hover:text-main"
                                            }`}
                                        >
                                            <span className="text-[10px] font-semibold">
                                                {preset.label.split(" (")[0]}
                                            </span>
                                            <span className="text-[8px] opacity-75">
                                                {preset.badge}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Fine Tuning Sliders */}
                        <div className="border border-main bg-secondary/20 p-3 space-y-3">
                            <span className="text-[11px] font-semibold text-main block">
                                Tinh Chỉnh Thủ Công (Fine Tuning)
                            </span>

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
                                        setCgBrightness(Number(e.target.value));
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
                                        setCgContrast(Number(e.target.value));
                                        setCgActivePreset("custom");
                                    }}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-[8px] text-muted">
                                    <span>Phẳng (0.50x)</span>
                                    <span>Chuẩn (1.00x)</span>
                                    <span>Gắt sâu (2.00x)</span>
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
                                    max="2.0"
                                    step="0.02"
                                    value={cgSaturation}
                                    onChange={(e) => {
                                        setCgSaturation(Number(e.target.value));
                                        setCgActivePreset("custom");
                                    }}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-[8px] text-muted">
                                    <span>Đen trắng (0.0)</span>
                                    <span>Chuẩn (1.00x)</span>
                                    <span>Rực màu (2.00x)</span>
                                </div>
                            </div>

                            {/* Gamma */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted">
                                        Đường cong sáng (Gamma / Highlight Fix)
                                    </span>
                                    <span className="font-mono font-medium text-main">
                                        {cgGamma.toFixed(2)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.6"
                                    max="1.5"
                                    step="0.02"
                                    value={cgGamma}
                                    onChange={(e) => {
                                        setCgGamma(Number(e.target.value));
                                        setCgActivePreset("custom");
                                    }}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-[8px] text-muted">
                                    <span>Hạ cháy sáng (0.60)</span>
                                    <span>Chuẩn (1.00)</span>
                                    <span>Nâng bóng tối (1.50)</span>
                                </div>
                            </div>

                            {/* Vignette */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted">
                                        Viền tối điện ảnh (Vignette)
                                    </span>
                                    <span className="font-mono font-medium text-main">
                                        {Math.round(cgVignette * 100)}%
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.0"
                                    max="0.8"
                                    step="0.02"
                                    value={cgVignette}
                                    onChange={(e) => {
                                        setCgVignette(Number(e.target.value));
                                        setCgActivePreset("custom");
                                    }}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-[8px] text-muted">
                                    <span>Không (0%)</span>
                                    <span>Vừa phải (40%)</span>
                                    <span>Đậm sâu (80%)</span>
                                </div>
                            </div>

                            {/* Temperature */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted">
                                        Nhiệt độ màu (Color Temperature)
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
                                    min="-40"
                                    max="40"
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
                                    <span>Lạnh xanh (-40)</span>
                                    <span>Chuẩn (0)</span>
                                    <span>Ấm vàng (+40)</span>
                                </div>
                            </div>

                            {/* Tint */}
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
                                    <span>-180°</span>
                                    <span>0° (Chuẩn)</span>
                                    <span>+180°</span>
                                </div>
                            </div>

                            {/* Vibrance */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted">
                                        Rực màu tự nhiên (Vibrance)
                                    </span>
                                    <span className="font-mono font-medium text-main">
                                        {cgVibrance > 0
                                            ? `+${cgVibrance.toFixed(2)}`
                                            : cgVibrance.toFixed(2)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="-0.5"
                                    max="0.5"
                                    step="0.02"
                                    value={cgVibrance}
                                    onChange={(e) => {
                                        setCgVibrance(Number(e.target.value));
                                        setCgActivePreset("custom");
                                    }}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-[8px] text-muted">
                                    <span>Dịu màu (-0.5)</span>
                                    <span>0.00</span>
                                    <span>Rực tươi (+0.5)</span>
                                </div>
                            </div>

                            {/* Sepia */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px]">
                                    <span className="text-muted">
                                        Phim cổ Sepia (Sepia Tone)
                                    </span>
                                    <span className="font-mono font-medium text-main">
                                        {cgSepia}%
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
                                    <span>Hiện đại (0%)</span>
                                    <span>Vừa phải (50%)</span>
                                    <span>Cổ điển (100%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview & Render Output */}
                    <div className="space-y-3">
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
                                        <Sparkles className="h-3 w-3" /> Sử dụng
                                        video từ ZeroTTS Voice Lab
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
                                        {formatBytes(cgVideoFile.size)} · Sẵn
                                        sàng xử lý
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        {cgVideoPreviewUrl ? (
                            <div className="border border-main bg-secondary/20 p-3 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-main">
                                        Live CSS Preview (60fps)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setCgCompareMode(!cgCompareMode)
                                        }
                                        className={`inline-flex items-center gap-1 border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                            cgCompareMode
                                                ? "border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                                : "border-accent/40 bg-accent/15 text-accent"
                                        }`}
                                    >
                                        <Eye className="h-3 w-3" />
                                        {cgCompareMode
                                            ? "👁️ Video gốc (Tắt bộ lọc)"
                                            : "✨ Đã chỉnh màu (Bật bộ lọc)"}
                                    </button>
                                </div>

                                <div className="relative aspect-video max-h-[360px] overflow-hidden rounded border border-main bg-black flex items-center justify-center">
                                    <video
                                        ref={cgPreviewVideoRef}
                                        src={cgVideoPreviewUrl}
                                        controls
                                        loop
                                        playsInline
                                        style={{ filter: cgFilterCss }}
                                        className="h-full w-full object-contain"
                                    />
                                    {cgVignette > 0 && !cgCompareMode ? (
                                        <div
                                            className="pointer-events-none absolute inset-0"
                                            style={{
                                                boxShadow: `inset 0 0 ${Math.round(
                                                    cgVignette * 120,
                                                )}px rgba(0,0,0,${(
                                                    cgVignette * 1.2
                                                ).toFixed(2)})`,
                                            }}
                                        />
                                    ) : null}
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-main pt-2">
                                    <button
                                        type="button"
                                        onClick={handleCgRenderExport}
                                        disabled={cgIsRendering || !cgVideoFile}
                                        className="inline-flex items-center gap-1.5 border border-accent bg-accent px-3 py-1.5 text-[11px] font-semibold text-white shadow transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {cgIsRendering ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Film className="h-3.5 w-3.5" />
                                        )}
                                        {cgIsRendering
                                            ? "Đang xuất video FFmpeg..."
                                            : "Xuất Video Hoàn Chỉnh (FFmpeg Render)"}
                                    </button>
                                </div>

                                {cgRenderError ? (
                                    <p className="border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] text-rose-700 dark:text-rose-400">
                                        {cgRenderError}
                                    </p>
                                ) : null}

                                {cgRenderResult ? (
                                    <div className="border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2 rounded">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                Xử lý video hoàn tất!
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted">
                                            <span>
                                                File: {cgRenderResult.filename}
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
                                                href={cgRenderResult.videoUrl}
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
                                ZeroTTS Voice Lab để bắt đầu căn chỉnh màu sắc và
                                ánh sáng.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </section>
    );
}
