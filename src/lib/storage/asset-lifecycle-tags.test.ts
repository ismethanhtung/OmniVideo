import { describe, expect, it } from "vitest";

import { getAssetLifecycleBadges } from "./asset-lifecycle-tags";

describe("asset lifecycle badges", () => {
    it("maps lifecycle tags to distinct badge treatments", () => {
        expect(
            getAssetLifecycleBadges([
                "raw",
                "processed",
                "has-processed-output",
                "food",
            ]),
        ).toEqual([
            expect.objectContaining({
                label: "raw",
                className: expect.stringContaining("amber"),
            }),
            expect.objectContaining({
                label: "processed",
                className: expect.stringContaining("emerald"),
            }),
            expect.objectContaining({
                label: "has output",
                className: expect.stringContaining("rose"),
            }),
        ]);
    });
});
