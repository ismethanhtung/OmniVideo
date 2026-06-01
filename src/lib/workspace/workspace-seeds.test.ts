import { describe, expect, it } from "vitest";

import { WORKSPACE_SEED_TEMPLATES } from "./workspace-seeds";

describe("workspace seed templates", () => {
    it("registers VI voice mask publish seed", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "vi-voice-mask-publish",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed VI Voice Mask Publish");
        expect(seed?.buildGraph().nodes.length).toBeGreaterThan(0);
    });

    it("registers asset preprocess dubbing seed", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "asset-preprocess-dubbing",
        );

        expect(seed).toBeDefined();
        expect(seed?.label).toBe("Seed Asset Preprocess Dubbing");
        expect(seed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.asset",
                "video.preprocess",
                "audio.video-dubbing",
                "storage.upload",
            ]),
        );
    });

    it("registers full storage-asset transcript processing seed", () => {
        const seed = WORKSPACE_SEED_TEMPLATES.find(
            (entry) => entry.id === "asset-transcript-full-processing",
        );

        expect(seed).toBeDefined();
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
        expect(seed?.label).toBe("Seed Asset VIP Processing");
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
        expect(seed?.label).toBe("Seed Asset VIP Processing 2");
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
        expect(remoteSeed?.buildGraph().nodes.map((node) => node.templateNodeType)).toEqual(
            expect.arrayContaining([
                "source.file",
                "video.vip-processing",
                "output.download-local",
            ]),
        );
    });
});
