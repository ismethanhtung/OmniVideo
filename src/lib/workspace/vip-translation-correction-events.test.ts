import { describe, expect, it } from "vitest";

import { isWorkspaceVipTranslationCorrectionDetail } from "./vip-translation-correction-events";

describe("VIP translation correction events", () => {
    it("accepts a valid multi-segment correction payload", () => {
        expect(
            isWorkspaceVipTranslationCorrectionDetail({
                vipNodeId: "vip-node-1",
                transcriptRetrySegmentIds: [0, 1],
                segments: [
                    { id: 0, translatedText: "Nàng đẹp quá." },
                    { id: 1, translatedText: "Chúng ta đi thôi." },
                ],
            }),
        ).toBe(true);
    });

    it("rejects incomplete or malformed correction payloads", () => {
        expect(
            isWorkspaceVipTranslationCorrectionDetail({
                vipNodeId: "",
                segments: [{ id: 0, translatedText: "Nàng đẹp quá." }],
            }),
        ).toBe(false);
        expect(
            isWorkspaceVipTranslationCorrectionDetail({
                vipNodeId: "vip-node-1",
                segments: [],
            }),
        ).toBe(false);
        expect(
            isWorkspaceVipTranslationCorrectionDetail({
                vipNodeId: "vip-node-1",
                segments: [{ id: "0", translatedText: "Nàng đẹp quá." }],
            }),
        ).toBe(false);
        expect(
            isWorkspaceVipTranslationCorrectionDetail({
                vipNodeId: "vip-node-1",
                transcriptRetrySegmentIds: [-1],
                segments: [{ id: 0, translatedText: "Nàng đẹp quá." }],
            }),
        ).toBe(false);
    });
});
