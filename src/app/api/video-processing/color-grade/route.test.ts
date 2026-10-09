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

    it("applies hue rotation, vibrance, sepia and tint filters", () => {
        const filter = buildColorGradeFfmpegFilter({
            hue: 40,
            vibrance: 0.5,
            sepia: 60,
            tint: 20,
        });
        expect(filter).toContain("hue=h=40.0");
        expect(filter).toContain("vibrance=intensity=0.500");
        expect(filter).toContain("colorchannelmixer=rr=");
        expect(filter).toContain("gm=");
    });

    it("omits optional filters when values are neutral", () => {
        const filter = buildColorGradeFfmpegFilter({
            hue: 0,
            vibrance: 0,
            sepia: 0,
            tint: 0,
        });
        expect(filter).not.toContain("hue=");
        expect(filter).not.toContain("vibrance=");
        expect(filter).not.toContain("colorchannelmixer=");
        expect(filter).not.toContain("colorbalance=");
    });

    it("blends sepia amount between identity and full sepia matrix", () => {
        const none = buildColorGradeFfmpegFilter({ sepia: 0 });
        const full = buildColorGradeFfmpegFilter({ sepia: 100 });
        expect(none).not.toContain("colorchannelmixer=");
        expect(full).toContain("rr=0.393");
        expect(full).toContain("gg=0.686");
    });

    it("clamps out-of-range creative parameters", () => {
        const filter = buildColorGradeFfmpegFilter({
            hue: 999,
            vibrance: 9,
            sepia: 999,
            tint: -999,
        });
        expect(filter).toContain("hue=h=180.0");
        expect(filter).toContain("vibrance=intensity=1.000");
        expect(filter).toContain("rr=0.393");
        expect(filter).toContain("gm=");
    });
});
