import { describe, expect, it } from "vitest";

import {
    buildColorGradeCssFilter,
    buildColorGradeFfmpegFilter,
} from "./color-grade";

describe("Shared Color Grade helpers", () => {
    it("builds a neutral eq-vf chain for default options", () => {
        expect(buildColorGradeFfmpegFilter()).toContain(
            "eq=brightness=0.000:contrast=1.000:saturation=1.000:gamma=1.000",
        );
    });

    it("returns none while comparing", () => {
        expect(buildColorGradeCssFilter({ brightness: 0.5 }, true)).toBe("none");
    });

    it("builds a CSS brightness/contrast/saturation baseline", () => {
        const css = buildColorGradeCssFilter({
            brightness: -0.18,
            contrast: 1.25,
            saturation: 0.85,
        });
        expect(css).toContain("brightness(0.82");
        expect(css).toContain("contrast(1.25)");
        expect(css).toContain("saturate(0.85)");
    });

    it("approximates vibrance, hue, temperature, tint and sepia", () => {
        const css = buildColorGradeCssFilter({
            vibrance: 0.25,
            hue: 10,
            temperature: 20,
            tint: 8,
            sepia: 55,
        });
        expect(css).toContain("saturate(1.125)");
        expect(css).toContain("hue-rotate(");
        expect(css).toContain("sepia(55.0%)");
    });

    it("omits optional filters when neutral", () => {
        const css = buildColorGradeCssFilter({});
        expect(css).not.toContain("hue-rotate");
        expect(css).not.toContain("sepia(");
    });
});
