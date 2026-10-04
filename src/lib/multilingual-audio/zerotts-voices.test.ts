import { describe, expect, it } from "vitest";

import {
  discoverLocalCustomVoices,
  getAllZeroTtsVoices,
  ZEROTTS_PRESET_VOICES,
} from "./zerotts-voices";

describe("ZeroTTS Voice Catalog", () => {
  it("contains all standard preset voices with metadata", () => {
    expect(ZEROTTS_PRESET_VOICES.length).toBeGreaterThanOrEqual(1);

    const voiceIds = ZEROTTS_PRESET_VOICES.map((v) => v.id);
    expect(voiceIds).toContain("maichi");

    const maichi = ZEROTTS_PRESET_VOICES.find((v) => v.id === "maichi");
    expect(maichi?.isPreset).toBe(true);
    expect(maichi?.gender).toBe("female");
    expect(maichi?.region).toBe("Bắc");
  });

  it("discovers local custom voices safely without crashing", () => {
    const custom = discoverLocalCustomVoices();
    expect(Array.isArray(custom)).toBe(true);
  });

  it("combines presets and discovered custom voices", () => {
    const all = getAllZeroTtsVoices();
    expect(all.length).toBeGreaterThanOrEqual(ZEROTTS_PRESET_VOICES.length);
    expect(all.some((v) => v.id === "maichi")).toBe(true);
  });
});
