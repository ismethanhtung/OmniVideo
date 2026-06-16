"use client";

import { useEffect, useState } from "react";
import {
    Clipboard,
    Copy,
    Download,
    Film,
    ImagePlus,
    Loader2,
    PlayCircle,
    RefreshCw,
    Sparkles,
    TriangleAlert,
    Upload,
    Wand2,
    X,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type AiImageStudioPanelProps = {
    section: LeftbarNavItem;
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

type StoryboardScene = {
    id: number;
    time: string;
    visual: string;
    voiceover: string;
};

type StoryboardResult = {
    title: string;
    category: string;
    summary: string;
    scenes: StoryboardScene[];
    providerId: string;
    model: string;
    targetDurationSec: number;
    sceneCount: number;
};

type SceneImage = {
    file: File;
    name: string;
    url: string;
};

type ReferenceImage = {
    id: string;
    name: string;
    url: string;
};

type RenderVideoResult = {
    videoBase64: string;
    mimeType: string;
    fileName: string;
    byteLength: number;
    durationSeconds: number;
    sceneCount: number;
    generationDurationMs: number;
};

const CATEGORY_PRESETS = [
    "Bài học nhân sinh",
    "Triết lý sống",
    "Câu chuyện tình cảm",
    "Đạo lý gia đình",
    "Câu chuyện chữa lành",
    "Nghị lực vượt khó",
    "Cổ tích hiện đại",
];

const DEFAULT_IDEA_PROMPT =
    "Một câu chuyện ngắn cảm động về tình yêu lâu năm: không còn lãng mạn ồn ào, nhưng vẫn âm thầm che chở đúng lúc người kia cần nhất.";

function sceneToClipboardText(scene: StoryboardScene) {
    return [
        `Thời gian: ${scene.time}`,
        `Hình ảnh gợi ý (Visual): ${scene.visual}`,
        `Lời thoại (Voiceover): ${scene.voiceover}`,
    ].join("\n");
}

function storyboardToContext(storyboard: StoryboardResult | null) {
    if (!storyboard) return "";
    return JSON.stringify(
        {
            title: storyboard.title,
            category: storyboard.category,
            summary: storyboard.summary,
            scenes: storyboard.scenes,
        },
        null,
        2,
    );
}

function createImageObject(file: File) {
    return {
        file,
        name: file.name,
        url: URL.createObjectURL(file),
    };
}

export function AiImageStudioPanel({ section }: AiImageStudioPanelProps) {
    const Icon = section.icon ?? ImagePlus;
    const [aiProviders, setAiProviders] = useState<AiProviderOption[]>([]);
    const [selectedProviderId, setSelectedProviderId] = useState("env-gemini");
    const [aiModels, setAiModels] = useState<AiModelOption[]>([]);
    const [isLoadingProviders, setIsLoadingProviders] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [model, setModel] = useState("gemini-2.5-pro");
    const [category, setCategory] = useState(CATEGORY_PRESETS[0] ?? "");
    const [targetDurationSec, setTargetDurationSec] = useState(60);
    const [sceneCount, setSceneCount] = useState(5);
    const [ideaPrompt, setIdeaPrompt] = useState(DEFAULT_IDEA_PROMPT);
    const [improvementPrompt, setImprovementPrompt] = useState("");
    const [storyboard, setStoryboard] = useState<StoryboardResult | null>(null);
    const [sceneImages, setSceneImages] = useState<Record<number, SceneImage>>(
        {},
    );
    const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>(
        [],
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRenderingVideo, setIsRenderingVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [renderResult, setRenderResult] = useState<RenderVideoResult | null>(
        null,
    );
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    useEffect(() => {
        setIsLoadingProviders(true);
        fetch("/api/ai-providers", { cache: "no-store" })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiProviderOption[] }) => {
                const activeProviders = (payload.data ?? []).filter(
                    (provider) => provider.status === "active",
                );
                setAiProviders([
                    {
                        _id: "env-gemini",
                        label: "Env Google AI Studio",
                        providerType: "gemini",
                        status: "active",
                    },
                    ...activeProviders,
                ]);
            })
            .catch(() => setAiProviders([]))
            .finally(() => setIsLoadingProviders(false));
    }, []);

    useEffect(() => {
        if (!selectedProviderId) return;
        setIsLoadingModels(true);
        fetch(`/api/ai-providers/${selectedProviderId}/models`, {
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((payload: { ok: boolean; data?: AiModelOption[] }) => {
                const models = payload.ok ? (payload.data ?? []) : [];
                setAiModels(models);
                const preferred =
                    models.find((entry) =>
                        /3\.1|gemini.*pro|pro|gpt|claude|qwen/iu.test(
                            entry.id,
                        ),
                    ) ?? models[0];
                if (preferred) setModel(preferred.id);
            })
            .catch(() => setAiModels([]))
            .finally(() => setIsLoadingModels(false));
    }, [selectedProviderId]);

    const copyText = async (key: string, value: string) => {
        await navigator.clipboard.writeText(value);
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(null), 1200);
    };

    const runStoryboard = async (mode: "new" | "retry") => {
        setIsGenerating(true);
        setError(null);
        try {
            const response = await fetch("/api/ai-image/storyboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    ideaPrompt,
                    improvementPrompt: mode === "retry" ? improvementPrompt : "",
                    previousStoryboard:
                        mode === "retry" ? storyboardToContext(storyboard) : "",
                    providerId: selectedProviderId,
                    model,
                    targetDurationSec,
                    sceneCount,
                }),
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: StoryboardResult;
                error?: string;
            };
            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(payload.error || "Storyboard generation failed.");
            }
            setStoryboard(payload.data);
            setSceneImages({});
            setRenderResult(null);
            setRenderError(null);
        } catch (generationError) {
            setError(
                generationError instanceof Error
                    ? generationError.message
                    : "Storyboard generation failed.",
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const updateScene = (
        sceneId: number,
        patch: Partial<Pick<StoryboardScene, "time" | "visual" | "voiceover">>,
    ) => {
        setStoryboard((current) => {
            if (!current) return current;
            return {
                ...current,
                scenes: current.scenes.map((scene) =>
                    scene.id === sceneId ? { ...scene, ...patch } : scene,
                ),
            };
        });
    };

    const setSceneImage = (sceneId: number, file: File | null) => {
        setSceneImages((current) => {
            const previous = current[sceneId];
            if (previous) URL.revokeObjectURL(previous.url);
            if (!file) {
                const { [sceneId]: _removed, ...rest } = current;
                return rest;
            }
            return { ...current, [sceneId]: createImageObject(file) };
        });
    };

    const addReferenceImages = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setReferenceImages((current) => [
            ...Array.from(files).map((file) => ({
                id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
                ...createImageObject(file),
            })),
            ...current,
        ]);
    };

    const removeReferenceImage = (imageId: string) => {
        setReferenceImages((current) => {
            const target = current.find((image) => image.id === imageId);
            if (target) URL.revokeObjectURL(target.url);
            return current.filter((image) => image.id !== imageId);
        });
    };

    const uploadedSceneCount = Object.keys(sceneImages).length;
    const totalSceneCount = storyboard?.scenes.length ?? 0;
    const canRenderVideo =
        Boolean(storyboard?.scenes.length) &&
        uploadedSceneCount === totalSceneCount &&
        totalSceneCount > 0;
    const renderVideoUrl = renderResult
        ? `data:${renderResult.mimeType};base64,${renderResult.videoBase64}`
        : "";

    const renderVideo = async () => {
        if (!storyboard) return;
        setIsRenderingVideo(true);
        setRenderError(null);
        setRenderResult(null);
        try {
            const formData = new FormData();
            formData.append("scenesJson", JSON.stringify(storyboard.scenes));
            for (const scene of storyboard.scenes) {
                const image = sceneImages[scene.id];
                if (image) {
                    formData.append(
                        `sceneImage-${scene.id}`,
                        image.file,
                        image.name,
                    );
                }
            }

            const response = await fetch("/api/ai-image/render-video", {
                method: "POST",
                body: formData,
            });
            const payload = (await response.json()) as {
                ok: boolean;
                data?: RenderVideoResult;
                error?: string;
            };
            if (!response.ok || !payload.ok || !payload.data) {
                throw new Error(payload.error || "Video render failed.");
            }
            setRenderResult(payload.data);
        } catch (renderFailure) {
            setRenderError(
                renderFailure instanceof Error
                    ? renderFailure.message
                    : "Video render failed.",
            );
        } finally {
            setIsRenderingVideo(false);
        }
    };

    return (
        <section className="border border-main bg-main">
            <header className="flex flex-col gap-3 border-b border-main bg-secondary/45 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted" />
                        <h1 className="truncate text-[15px] font-semibold text-main">
                            {section.label}
                        </h1>
                    </div>
                    <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
                        {section.description}
                    </p>
                </div>
                <div className="grid shrink-0 grid-cols-3 gap-2 text-[10px] text-muted">
                    <Metric label="Storyboard" value={`${totalSceneCount} scenes`} />
                    <Metric label="Images" value={`${uploadedSceneCount}/${totalSceneCount}`} />
                    <Metric label="Render" value={renderResult ? "Ready" : "Video + TTS"} />
                </div>
            </header>

            <div className="grid gap-4 p-5 xl:grid-cols-[380px_minmax(0,1fr)]">
                <aside className="space-y-3">
                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center gap-2">
                            <Wand2 className="h-4 w-4 text-muted" />
                            <p className="text-[12px] font-semibold text-main">
                                Script Generator
                            </p>
                        </div>

                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Category
                            </span>
                            <select
                                value={category}
                                onChange={(event) =>
                                    setCategory(event.target.value)
                                }
                                disabled={isGenerating}
                                className="w-full border border-main bg-main px-2 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                            >
                                {CATEGORY_PRESETS.map((entry) => (
                                    <option key={entry} value={entry}>
                                        {entry}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <NumberField
                                label="Duration sec"
                                value={targetDurationSec}
                                min={20}
                                max={240}
                                step={5}
                                disabled={isGenerating}
                                onChange={setTargetDurationSec}
                            />
                            <NumberField
                                label="Scenes"
                                value={sceneCount}
                                min={3}
                                max={12}
                                step={1}
                                disabled={isGenerating}
                                onChange={setSceneCount}
                            />
                        </div>

                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Idea / improve prompt
                            </span>
                            <textarea
                                value={ideaPrompt}
                                onChange={(event) =>
                                    setIdeaPrompt(event.target.value)
                                }
                                disabled={isGenerating}
                                rows={6}
                                className="w-full resize-none border border-main bg-main px-3 py-2 text-[12px] leading-5 text-main outline-none transition-colors focus:border-accent"
                            />
                        </label>

                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Retry instruction
                            </span>
                            <textarea
                                value={improvementPrompt}
                                onChange={(event) =>
                                    setImprovementPrompt(event.target.value)
                                }
                                disabled={isGenerating}
                                rows={3}
                                placeholder="VD: làm câu chuyện sâu sắc hơn, twist mạnh hơn, giảm lời thoại ở cảnh 1..."
                                className="w-full resize-none border border-main bg-main px-3 py-2 text-[12px] leading-5 text-main outline-none transition-colors focus:border-accent"
                            />
                        </label>
                    </div>

                    <div className="border border-main bg-secondary/20 p-4">
                        <p className="text-[12px] font-semibold text-main">
                            AI Provider
                        </p>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Provider
                            </span>
                            <select
                                value={selectedProviderId}
                                onChange={(event) =>
                                    setSelectedProviderId(event.target.value)
                                }
                                disabled={isGenerating || isLoadingProviders}
                                className="w-full border border-main bg-main px-2 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                            >
                                {aiProviders.map((provider) => (
                                    <option
                                        key={provider._id}
                                        value={provider._id}
                                    >
                                        {provider.label} ({provider.providerType})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="mt-3 block">
                            <span className="mb-1 block text-[10px] font-semibold text-muted">
                                Model
                            </span>
                            {aiModels.length > 0 ? (
                                <select
                                    value={model}
                                    onChange={(event) =>
                                        setModel(event.target.value)
                                    }
                                    disabled={isGenerating || isLoadingModels}
                                    className="w-full border border-main bg-main px-2 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                >
                                    {aiModels.map((entry) => (
                                        <option key={entry.id} value={entry.id}>
                                            {entry.name || entry.id}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    value={model}
                                    onChange={(event) =>
                                        setModel(event.target.value)
                                    }
                                    disabled={isGenerating}
                                    className="w-full border border-main bg-main px-2 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                                />
                            )}
                        </label>
                        {aiModels.length > 0 ? (
                            <input
                                value={model}
                                onChange={(event) => setModel(event.target.value)}
                                disabled={isGenerating}
                                className="mt-2 w-full border border-main bg-main px-2 py-2 text-[11px] text-main outline-none transition-colors focus:border-accent"
                            />
                        ) : null}

                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => runStoryboard("new")}
                                disabled={
                                    isGenerating ||
                                    !model.trim() ||
                                    !selectedProviderId
                                }
                                className="inline-flex items-center justify-center gap-2 border border-accent bg-accent px-3 py-2 text-[12px] font-semibold text-inverse disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Sparkles className="h-4 w-4" />
                                )}
                                Generate
                            </button>
                            <button
                                type="button"
                                onClick={() => runStoryboard("retry")}
                                disabled={
                                    isGenerating ||
                                    !storyboard ||
                                    !model.trim() ||
                                    !selectedProviderId
                                }
                                className="inline-flex items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[12px] font-semibold text-main hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw className="h-4 w-4" />
                                Retry
                            </button>
                        </div>
                    </div>

                    <div className="border border-main bg-secondary/20 p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-main">
                                Reference Image Bank
                            </p>
                            <label className="inline-flex cursor-pointer items-center gap-2 border border-main bg-main px-2 py-1.5 text-[10px] font-semibold text-main hover:border-accent">
                                <Upload className="h-3.5 w-3.5" />
                                Add
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(event) => {
                                        addReferenceImages(
                                            event.currentTarget.files,
                                        );
                                        event.currentTarget.value = "";
                                    }}
                                />
                            </label>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {referenceImages.length === 0 ? (
                                <p className="col-span-2 border border-main bg-main px-3 py-5 text-center text-[11px] text-muted">
                                    No reference images.
                                </p>
                            ) : (
                                referenceImages.map((image) => (
                                    <div
                                        key={image.id}
                                        className="border border-main bg-main p-2"
                                    >
                                        <div className="relative aspect-video overflow-hidden border border-main bg-secondary/20">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={image.url}
                                                alt={image.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <p className="mt-1 truncate text-[10px] text-muted">
                                            {image.name}
                                        </p>
                                        <div className="mt-2 flex gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    copyText(
                                                        `ref-${image.id}`,
                                                        `Hãy tạo ảnh mới có cùng phong cách hình ảnh, ánh sáng, bố cục, màu sắc và cảm xúc như ảnh tham chiếu: ${image.name}`,
                                                    )
                                                }
                                                className="inline-flex flex-1 items-center justify-center border border-main px-2 py-1 text-[10px] font-semibold text-main hover:border-accent"
                                            >
                                                <Copy className="h-3 w-3" />
                                                {copiedKey === `ref-${image.id}`
                                                    ? "Copied"
                                                    : "Style"}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeReferenceImage(
                                                        image.id,
                                                    )
                                                }
                                                className="inline-flex items-center justify-center border border-main px-2 py-1 text-muted hover:border-accent"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>

                <main className="space-y-4">
                    {error ? (
                        <div className="flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    ) : null}

                    <section className="border border-main bg-secondary/20 p-4">
                        <div className="flex flex-col gap-3 border-b border-main pb-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-main">
                                    Storyboard
                                </p>
                                <h2 className="mt-1 truncate text-[15px] font-semibold text-main">
                                    {storyboard?.title ?? "No storyboard yet"}
                                </h2>
                                <p className="mt-1 max-w-4xl text-[11px] leading-5 text-muted">
                                    {storyboard?.summary ??
                                        "Generate content first, then copy each scene into your image tool and upload the finished image back into the matching scene."}
                                </p>
                            </div>
                            {storyboard ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        copyText(
                                            "storyboard-all",
                                            storyboardToContext(storyboard),
                                        )
                                    }
                                    className="inline-flex shrink-0 items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main hover:border-accent"
                                >
                                    <Clipboard className="h-3.5 w-3.5" />
                                    {copiedKey === "storyboard-all"
                                        ? "Copied"
                                        : "Copy All"}
                                </button>
                            ) : null}
                        </div>

                        <div className="mt-4 space-y-3">
                            {!storyboard ? (
                                <div className="flex min-h-[360px] items-center justify-center border border-main bg-main px-8 py-12 text-center">
                                    <div>
                                        <PlayCircle className="mx-auto h-10 w-10 text-muted" />
                                        <p className="mt-3 text-[12px] font-semibold text-main">
                                            Generate a storyboard to start
                                        </p>
                                        <p className="mt-1 max-w-md text-[11px] leading-5 text-muted">
                                            The first output is a table with
                                            time, visual prompt, and voiceover
                                            for every scene.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                storyboard.scenes.map((scene) => (
                                    <SceneCard
                                        key={scene.id}
                                        scene={scene}
                                        image={sceneImages[scene.id]}
                                        copiedKey={copiedKey}
                                        onCopy={copyText}
                                        onChange={updateScene}
                                        onImageChange={setSceneImage}
                                    />
                                ))
                            )}
                        </div>
                    </section>

                    <section className="border border-main bg-secondary/20 p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <Film className="h-4 w-4 text-muted" />
                                    <p className="text-[12px] font-semibold text-main">
                                        Video Assembly
                                    </p>
                                </div>
                                <p className="mt-1 max-w-2xl text-[11px] leading-5 text-muted">
                                    Render uploaded scene images into an MP4 with
                                    Piper voiceover and burned subtitles.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={renderVideo}
                                disabled={!canRenderVideo || isRenderingVideo}
                                className="inline-flex shrink-0 items-center justify-center gap-2 border border-accent bg-accent px-4 py-2 text-[12px] font-semibold text-inverse disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isRenderingVideo ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Film className="h-4 w-4" />
                                )}
                                Render Video
                            </button>
                        </div>

                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                            <Metric
                                label="Scene images"
                                value={`${uploadedSceneCount}/${totalSceneCount}`}
                            />
                            <Metric
                                label="Voice TTS"
                                value={renderResult ? "Generated" : "Piper"}
                            />
                            <Metric
                                label="Subtitles"
                                value={renderResult ? "Burned" : "Scene timing"}
                            />
                        </div>

                        {!canRenderVideo && storyboard ? (
                            <p className="mt-3 border border-main bg-main px-3 py-2 text-[11px] leading-5 text-muted">
                                Upload an image for every scene before
                                rendering the final video.
                            </p>
                        ) : null}

                        {renderError ? (
                            <div className="mt-3 flex items-start gap-2 border border-red-300 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700">
                                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{renderError}</span>
                            </div>
                        ) : null}

                        {renderResult ? (
                            <div className="mt-4 border border-main bg-main p-3">
                                <video
                                    controls
                                    src={renderVideoUrl}
                                    className="aspect-[9/16] max-h-[620px] w-full bg-black object-contain"
                                />
                                <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                    <div className="grid grid-cols-3 gap-2 text-[10px] text-muted">
                                        <Metric
                                            label="Scenes"
                                            value={String(renderResult.sceneCount)}
                                        />
                                        <Metric
                                            label="Duration"
                                            value={`${Math.round(
                                                renderResult.durationSeconds,
                                            )}s`}
                                        />
                                        <Metric
                                            label="Size"
                                            value={formatBytes(
                                                renderResult.byteLength,
                                            )}
                                        />
                                    </div>
                                    <a
                                        href={renderVideoUrl}
                                        download={renderResult.fileName}
                                        className="inline-flex items-center justify-center gap-2 border border-main bg-secondary/30 px-3 py-2 text-[11px] font-semibold text-main hover:border-accent"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                        Download Video
                                    </a>
                                </div>
                            </div>
                        ) : null}
                    </section>
                </main>
            </div>
        </section>
    );
}

function SceneCard({
    scene,
    image,
    copiedKey,
    onCopy,
    onChange,
    onImageChange,
}: {
    scene: StoryboardScene;
    image?: SceneImage;
    copiedKey: string | null;
    onCopy: (key: string, value: string) => void;
    onChange: (
        sceneId: number,
        patch: Partial<Pick<StoryboardScene, "time" | "visual" | "voiceover">>,
    ) => void;
    onImageChange: (sceneId: number, file: File | null) => void;
}) {
    return (
        <article className="grid gap-3 border border-main bg-main p-3 xl:grid-cols-[210px_minmax(0,1fr)]">
            <div>
                <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold text-main">
                        Scene #{scene.id}
                    </p>
                    <input
                        value={scene.time}
                        onChange={(event) =>
                            onChange(scene.id, { time: event.target.value })
                        }
                        className="w-28 border border-main bg-secondary/30 px-2 py-1 text-[10px] text-main outline-none focus:border-accent"
                    />
                </div>
                <div className="mt-3 aspect-video overflow-hidden border border-main bg-secondary/20">
                    {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={image.url}
                            alt={image.name}
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center px-4 text-center text-[10px] text-muted">
                            Upload generated image
                        </div>
                    )}
                </div>
                <label className="mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 border border-main bg-secondary/30 px-3 py-2 text-[10px] font-semibold text-main hover:border-accent">
                    <Upload className="h-3.5 w-3.5" />
                    {image ? "Replace Image" : "Upload Image"}
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) =>
                            onImageChange(
                                scene.id,
                                event.currentTarget.files?.[0] ?? null,
                            )
                        }
                    />
                </label>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                        Hình ảnh gợi ý (Visual)
                    </span>
                    <textarea
                        value={scene.visual}
                        onChange={(event) =>
                            onChange(scene.id, { visual: event.target.value })
                        }
                        rows={6}
                        className="w-full resize-none border border-main bg-secondary/20 px-3 py-2 text-[12px] leading-5 text-main outline-none focus:border-accent"
                    />
                    <button
                        type="button"
                        onClick={() =>
                            onCopy(`visual-${scene.id}`, scene.visual)
                        }
                        className="mt-2 inline-flex items-center gap-2 border border-main px-3 py-1.5 text-[10px] font-semibold text-main hover:border-accent"
                    >
                        <Copy className="h-3.5 w-3.5" />
                        {copiedKey === `visual-${scene.id}`
                            ? "Copied"
                            : "Copy Visual"}
                    </button>
                </label>

                <label className="block">
                    <span className="mb-1 block text-[10px] font-semibold text-muted">
                        Lời thoại (Voiceover)
                    </span>
                    <textarea
                        value={scene.voiceover}
                        onChange={(event) =>
                            onChange(scene.id, {
                                voiceover: event.target.value,
                            })
                        }
                        rows={6}
                        className="w-full resize-none border border-main bg-secondary/20 px-3 py-2 text-[12px] leading-5 text-main outline-none focus:border-accent"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() =>
                                onCopy(
                                    `voice-${scene.id}`,
                                    scene.voiceover,
                                )
                            }
                            className="inline-flex items-center gap-2 border border-main px-3 py-1.5 text-[10px] font-semibold text-main hover:border-accent"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedKey === `voice-${scene.id}`
                                ? "Copied"
                                : "Copy Voice"}
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                onCopy(
                                    `scene-${scene.id}`,
                                    sceneToClipboardText(scene),
                                )
                            }
                            className="inline-flex items-center gap-2 border border-main px-3 py-1.5 text-[10px] font-semibold text-main hover:border-accent"
                        >
                            <Clipboard className="h-3.5 w-3.5" />
                            {copiedKey === `scene-${scene.id}`
                                ? "Copied"
                                : "Copy Scene"}
                        </button>
                    </div>
                </label>
            </div>
        </article>
    );
}

function NumberField({
    label,
    value,
    min,
    max,
    step,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    disabled: boolean;
    onChange: (value: number) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-muted">
                {label}
            </span>
            <input
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                type="number"
                onChange={(event) => onChange(Number(event.target.value))}
                className="w-full border border-main bg-main px-2 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
            />
        </label>
    );
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="border border-main bg-main px-3 py-2">
            <p className="text-[10px] font-semibold text-muted">{label}</p>
            <p className="mt-1 truncate text-[12px] text-main">{value}</p>
        </div>
    );
}

function formatBytes(bytes: number) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
        units.length - 1,
        Math.floor(Math.log(bytes) / Math.log(1024)),
    );
    const value = bytes / 1024 ** index;
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
