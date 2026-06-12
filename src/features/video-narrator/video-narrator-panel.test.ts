import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-narrator/video-narrator-panel.tsx";

describe("Video Narrator Vietnamese Metadata generation", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("defines state variables for video metadata drafts and loading states", () => {
        expect(source).toContain("const [videoMetadata, setVideoMetadata] = useState");
        expect(source).toContain("const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false)");
        expect(source).toContain("const [isSavingMetadata, setIsSavingMetadata] = useState(false)");
        expect(source).toContain("const [metadataTitleDraft, setMetadataTitleDraft] = useState");
        expect(source).toContain("const [metadataDescriptionDraft, setMetadataDescriptionDraft] = useState");
        expect(source).toContain("const [metadataHashtagsDraft, setMetadataHashtagsDraft] = useState");
        expect(source).toContain("const [showMetadataSettings, setShowMetadataSettings] = useState(false)");
        expect(source).toContain("const [metadataProviderId, setMetadataProviderId] = useState");
        expect(source).toContain("const [metadataModel, setMetadataModel] = useState");
        expect(source).toContain("const [metadataAiModels, setMetadataAiModels] = useState");
        expect(source).toContain("const [isMetadataLoadingModels, setIsMetadataLoadingModels] = useState");
    });

    it("defines helper for fetching models on metadata provider change", () => {
        expect(source).toContain("const fetchModelsForMetadata = async (providerId: string) =>");
        expect(source).toContain("`/api/ai-providers/${providerId}/models`");
        expect(source).toContain("setMetadataAiModels(payload.data)");
    });

    it("defines function for running metadata generation using narration timeline", () => {
        expect(source).toContain("const runVideoMetadata = async () =>");
        expect(source).toContain('fetch("/api/audio/video-metadata"');
        expect(source).toContain("translatedSegments: segments.map");
        expect(source).toContain("sourceTitle:");
        expect(source).toContain("sourceDescription:");
        expect(source).toContain("providerId: metadataProviderId || undefined");
        expect(source).toContain("model: metadataModel");
    });

    it("defines function for saving metadata back to the storage asset", () => {
        expect(source).toContain("const saveVideoMetadata = async () =>");
        expect(source).toContain("`/api/storage/assets/${selectedAssetId}`");
        expect(source).toContain('method: "PATCH"');
        expect(source).toContain("vietnameseTitle: metadataTitleDraft.trim()");
        expect(source).toContain("vietnameseDescription");
        expect(source).toContain("metadataDescriptionDraft.trim()");
        expect(source).toContain("vietnameseHashtags: parseHashtagInput");
        expect(source).toContain("metadataHashtagsDraft");
    });

    it("integrates video metadata drafts with local storage hooks", () => {
        expect(source).toContain("parsed.videoMetadata");
        expect(source).toContain("parsed.metadataTitleDraft");
        expect(source).toContain("parsed.metadataDescriptionDraft");
        expect(source).toContain("parsed.metadataHashtagsDraft");
        expect(source).toContain("parsed.showMetadataSettings");
        expect(source).toContain("parsed.metadataProviderId");
        expect(source).toContain("parsed.metadataModel");
    });

    it("appends and deduplicates generated hashtags with fixed tags xuhuong and short", () => {
        expect(source).toContain('const fixedTags = ["xuhuong", "short"];');
        expect(source).toContain("uniqueTags.map((tag) => `#${tag}`).join(\" \")");
        expect(source).toContain("VI Hashtags (Deduplicated with #xuhuong #short)");
    });

    it("resets metadata states when script generation is triggered", () => {
        expect(source).toContain("setVideoMetadata(null);");
        expect(source).toContain('setMetadataTitleDraft("");');
        expect(source).toContain('setMetadataDescriptionDraft("");');
        expect(source).toContain('setMetadataHashtagsDraft("");');
    });

    it("renders collapsible UI button and provider/model fields for Video Metadata", () => {
        expect(source).toContain("Video Metadata");
        expect(source).toContain("Generate VI Metadata");
        expect(source).toContain("Save to Asset");
        expect(source).toContain("AI Provider");
        expect(source).toContain("AI Model");
        expect(source).toContain("value={metadataProviderId}");
        expect(source).toContain("value={metadataModel}");
    });
});
