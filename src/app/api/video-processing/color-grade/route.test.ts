import { describe, expect, it } from "vitest";
import { buildColorGradeFfmpegFilter } from "./route";

describe("Video Color Grade API Route", () => {
    it("builds standard eq filter with default parameters", () => {
        const filter = buildColorGradeFfmpegFilter();
        expect(filter).toContain("eq=brightness=0.000:contrast=1.000:saturation=1.000:gamma=1.000");
    });

    it("applies moody dark and melancholic parameters", () => {
        const filter = buildColorGradeFfmpegFilter({
            brightness: -0.18,
            contrast: 1.25,
            saturation: 0.85,
            gamma: 0.9,
            vignette: 0.45,
            temperature: -15,
        });
        expect(filter).toContain("brightness=-0.180");
        expect(filter).toContain("contrast=1.250");
        expect(filter).toContain("saturation=0.850");
        expect(filter).toContain("vignette=");
        expect(filter).toContain("colorbalance=");
    });

    it("applies overexposure fix parameters", () => {
        const filter = buildColorGradeFfmpegFilter({
            brightness: -0.15,
            contrast: 1.15,
            gamma: 0.85,
            saturation: 1.05,
        });
        expect(filter).toContain("brightness=-0.150");
        expect(filter).toContain("contrast=1.150");
        expect(filter).toContain("gamma=0.850");
        expect(filter).not.toContain("vignette=");
    });

    it("handles warm temperature tint correctly", () => {
        const filter = buildColorGradeFfmpegFilter({
            temperature: 25,
        });
        expect(filter).toContain("colorbalance=rs=");
    });
});
