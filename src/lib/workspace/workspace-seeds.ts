import {
    createAssetVipProcessingSampleGraph,
    createAssetTranscriptFullProcessingSampleGraph,
    createAssetPreprocessDubbingSampleGraph,
    createUploadVietnameseMaskPublishSampleGraph,
    type WorkspaceGraph,
} from "./workspace-graph";

export type WorkspaceSeedTemplate = {
    id: string;
    label: string;
    description: string;
    buildGraph: () => WorkspaceGraph;
};

export const WORKSPACE_SEED_TEMPLATES: WorkspaceSeedTemplate[] = [
    {
        id: "vi-voice-mask-publish",
        label: "Seed VI Voice Mask Publish",
        description:
            "Upload -> VI Voice Dubbing -> Mask/Subtitles -> Save to Storage -> Publish Social.",
        buildGraph: createUploadVietnameseMaskPublishSampleGraph,
    },
    {
        id: "asset-preprocess-dubbing",
        label: "Seed Asset Preprocess Dubbing",
        description:
            "Storage Asset -> Video Preprocess -> VI Voice Dubbing -> Save to Storage.",
        buildGraph: createAssetPreprocessDubbingSampleGraph,
    },
    {
        id: "asset-vip-processing",
        label: "Seed Asset VIP Processing",
        description:
            "Storage Asset -> VIP Processing -> Save to Storage.",
        buildGraph: createAssetVipProcessingSampleGraph,
    },
    {
        id: "asset-transcript-full-processing",
        label: "Seed Asset Transcript Full Processing",
        description:
            "Storage Asset -> Preprocess -> VI Voice Dubbing -> Mirror -> Blur -> Save to Storage + Generate VI Metadata.",
        buildGraph: createAssetTranscriptFullProcessingSampleGraph,
    },
];
