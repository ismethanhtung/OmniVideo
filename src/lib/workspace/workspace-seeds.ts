import {
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
];
