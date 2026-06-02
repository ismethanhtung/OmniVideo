import {
    createAssetVipProcessingSampleGraph,
    createAssetTranscriptFullProcessingSampleGraph,
    createUploadVipSaveLocalSampleGraph,
    createUploadRemoteVipSaveLocalSampleGraph,
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
        id: "asset-transcript-full-processing",
        label: "Seed Asset Transcript Full Processing",
        description:
            "Storage Asset -> Preprocess -> VI Voice Dubbing -> Mirror -> Blur -> Save to Storage + Generate VI Metadata.",
        buildGraph: createAssetTranscriptFullProcessingSampleGraph,
    },
    {
        id: "asset-vip-processing",
        label: "Seed Asset VIP Processing (storage)",
        description:
            "Storage Asset -> VIP Processing -> Save to Storage.",
        buildGraph: createAssetVipProcessingSampleGraph,
    },
    {
        id: "asset-vip-processing-2",
        label: "Seed Asset VIP Processing (local)",
        description:
            "Upload Video -> VIP Processing -> Save to Local.",
        buildGraph: createUploadVipSaveLocalSampleGraph,
    },
    {
        id: "remote-vip-voice-render",
        label: "Seed Remote VIP Voice Render",
        description:
            "Upload Video -> VIP Processing with EC2 voice + render -> Save to Local.",
        buildGraph: createUploadRemoteVipSaveLocalSampleGraph,
    },
];
