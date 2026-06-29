import { describe, expect, it } from "vitest";

import { WORKSPACE_SEED_TEMPLATES } from "./workspace-seeds";

describe("workspace seed templates", () => {
    it("keeps retired seeds out of the visible seed registry", () => {
        expect(WORKSPACE_SEED_TEMPLATES.map((entry) => entry.id)).not.toEqual(
            expect.arrayContaining([
                "vi-voice-mask-publish",
                "asset-preprocess-dubbing",
            ]),
        );
    });

    it("registers full storage-asset transcript processing seed first", () => {
        const seed = WORKSPACE_SEED_TEMPLATES[0];

        expect(seed).toBeDefined();
        expect(seed?.id).toBe("asset-transcript-full-processing");
        expect(seed?.label).toBe("Seed Asset Transcript Full Processing");
        expect(seed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.asset",
                "video.preprocess",
                "audio.video-dubbing",
                "edit.mask-region",
                "edit.mirror",
                "storage.upload",
                "text.generate-vi-metadata",
            ]),
        );
    });

    it("registers 3-node asset VIP processing seed", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "asset-vip-processing",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed Asset VIP Processing (storage)");
        expect(seed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.asset",
                "video.vip-processing",
                "storage.upload",
            ]),
        );
    });

    it("registers asset VIP processing 2 seed with upload input and local output", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "asset-vip-processing-2",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed Asset VIP Processing (local)");
        expect(seed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.file",
                "video.vip-processing",
                "output.download-local",
            ]),
        );
    });

    it("registers remote VIP voice render seed without changing local VIP seed", () => {
        const localSeed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "asset-vip-processing-2",
        );
        const remoteSeed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "remote-vip-voice-render",
        );

        expect(remoteSeed).toBeDefined();
        expect(remoteSeed?.label).toBe("Seed Remote VIP Voice Render");
        const localVipNode = localSeed
            ?.buildGraph()
            .nodes.find((node) => node.templateNodeType === "video.vip-processing");
        const remoteVipNode = remoteSeed
            ?.buildGraph()
            .nodes.find((node) => node.templateNodeType === "video.vip-processing");

        expect(localVipNode?.config.voiceRenderExecutionMode).toBeUndefined();
        expect(remoteVipNode?.config.voiceRenderExecutionMode).toBe(
            "remote-voice-render",
        );
        expect(remoteVipNode?.config.originalAudioSourceMode).toBe("source");
        expect(remoteSeed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.file",
                "video.vip-processing",
                "output.download-local",
            ]),
        );
    });

    it("registers remote VIP voice render seed with Gemini thumbnail node", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "remote-vip-voice-render-thumbnail",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed Remote VIP + Gemini Thumbnail");
        expect(seed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.file",
                "video.vip-processing",
                "thumbnail.gemini-generate",
                "output.download-local",
            ]),
        );
    });
});
