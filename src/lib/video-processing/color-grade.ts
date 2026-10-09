export type ColorGradeFilterOptions = {
    brightness?: number; // -1.0 to 1.0 (default 0.0)
    contrast?: number; // 0.1 to 3.0 (default 1.0)
    saturation?: number; // 0.0 to 3.0 (default 1.0)
    gamma?: number; // 0.1 to 3.0 (default 1.0)
    vignette?: number; // 0.0 to 1.0 (default 0.0)
    temperature?: number; // -50 to 50 (default 0)
    hue?: number; // -180 to 180 degrees (default 0)
    vibrance?: number; // -1.0 to 1.0 (default 0.0)
    sepia?: number; // 0 to 100 percent (default 0)
    tint?: number; // -50 (green) to 50 (magenta) (default 0)
    presetName?: string;
};

/**
 * Build the FFmpeg `-vf` filter chain for a set of color-grade options.
 * Neutral parameters are omitted so the emitted filter stays minimal.
 */
export function buildColorGradeFfmpegFilter(
    options: ColorGradeFilterOptions = {},
): string {
    const filters: string[] = [];

    const brightness = Math.max(-1.0, Math.min(1.0, options.brightness ?? 0.0));
    const contrast = Math.max(0.1, Math.min(3.0, options.contrast ?? 1.0));
    const saturation = Math.max(0.0, Math.min(3.0, options.saturation ?? 1.0));
    const gamma = Math.max(0.1, Math.min(3.0, options.gamma ?? 1.0));

    filters.push(
        `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}:gamma=${gamma.toFixed(3)}`,
    );

    // Combined color balance for temperature (blue/orange) and tint (green/magenta).
    const temp = Math.max(-50, Math.min(50, options.temperature ?? 0));
    const tint = Math.max(-50, Math.min(50, options.tint ?? 0));
    const colorBalance: string[] = [];
    if (Math.abs(temp) > 1) {
        if (temp > 0) {
            colorBalance.push(`rs=${(temp / 200).toFixed(3)}`);
            colorBalance.push(`gs=${(temp / 400).toFixed(3)}`);
            colorBalance.push(`bs=${(-temp / 300).toFixed(3)}`);
        } else {
            const abs = Math.abs(temp);
            colorBalance.push(`rs=${(-abs / 300).toFixed(3)}`);
            colorBalance.push(`bs=${(abs / 200).toFixed(3)}`);
        }
    }
    if (Math.abs(tint) > 1) {
        colorBalance.push(`rm=${(tint / 200).toFixed(3)}`);
        colorBalance.push(`gm=${(-tint / 100).toFixed(3)}`);
        colorBalance.push(`bm=${(tint / 200).toFixed(3)}`);
    }
    if (colorBalance.length > 0) {
        filters.push(`colorbalance=${colorBalance.join(":")}`);
    }

    // Hue rotation (creative color shift).
    const hue = Math.max(-180, Math.min(180, options.hue ?? 0));
    if (Math.abs(hue) > 0.5) {
        filters.push(`hue=h=${hue.toFixed(1)}`);
    }

    // Vibrance boosts muted colors more than already-saturated ones.
    const vibrance = Math.max(-1.0, Math.min(1.0, options.vibrance ?? 0.0));
    if (Math.abs(vibrance) > 0.01) {
        filters.push(`vibrance=intensity=${vibrance.toFixed(3)}`);
    }

    // Sepia blended against the identity matrix so the amount is adjustable.
    const sepia = Math.max(0, Math.min(100, options.sepia ?? 0));
    if (sepia > 0.5) {
        const a = sepia / 100;
        const mix = (identity: number, sepiaValue: number) =>
            ((1 - a) * identity + a * sepiaValue).toFixed(3);
        filters.push(
            `colorchannelmixer=rr=${mix(1, 0.393)}:rg=${mix(0, 0.769)}:rb=${mix(0, 0.189)}` +
                `:gr=${mix(0, 0.349)}:gg=${mix(1, 0.686)}:gb=${mix(0, 0.168)}` +
                `:br=${mix(0, 0.272)}:bg=${mix(0, 0.534)}:bb=${mix(1, 0.131)}`,
        );
    }

    const vig = Math.max(0.0, Math.min(1.0, options.vignette ?? 0.0));
    if (vig > 0.01) {
        const angle = (vig * (Math.PI / 4)).toFixed(3);
        filters.push(`vignette=angle=${angle}`);
    }

    return filters.join(",");
}

/**
 * Build a CSS `filter` value that approximates the FFmpeg color-grade chain for
 * live browser previews. Vibrance and tint are intentionally approximated.
 */
export function buildColorGradeCssFilter(
    options: ColorGradeFilterOptions = {},
    compare = false,
): string {
    if (compare) return "none";

    const brightness = options.brightness ?? 0;
    const contrast = options.contrast ?? 1;
    const saturation = options.saturation ?? 1;
    const temperature = options.temperature ?? 0;
    const hue = options.hue ?? 0;
    const vibrance = options.vibrance ?? 0;
    const sepia = options.sepia ?? 0;
    const tint = options.tint ?? 0;

    const b = 1 + brightness;
    let filter = `brightness(${b}) contrast(${contrast}) saturate(${saturation})`;

    // Vibrance is approximated in the live preview with a gentler saturation lift.
    if (Math.abs(vibrance) > 0.01) {
        filter += ` saturate(${(1 + vibrance * 0.5).toFixed(3)})`;
    }
    // Warm temperature adds a gentle sepia film tone (matches warm grading).
    if (temperature > 0) {
        filter += ` sepia(${(temperature * 0.4).toFixed(1)}%)`;
    }

    // Hue, temperature and tint collapse into a single hue-rotate pass.
    let rotate = hue;
    if (temperature > 0) {
        rotate += -temperature * 0.2;
    } else if (temperature < 0) {
        rotate += temperature * 0.6;
    }
    // Tint (green/magenta) is approximated with a small hue rotation.
    if (Math.abs(tint) > 1) {
        rotate += tint * 0.4;
    }
    if (Math.abs(rotate) > 0.01) {
        filter += ` hue-rotate(${rotate.toFixed(1)}deg)`;
    }
    if (sepia > 0.5) {
        filter += ` sepia(${sepia.toFixed(1)}%)`;
    }

    return filter;
}
