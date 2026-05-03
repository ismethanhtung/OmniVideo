import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/audio/chinese-transcription-panel.tsx";

describe("Audio Transcript asset picker preview", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("adds preview action per asset and lazy inline video load", () => {
    expect(source).toContain("Preview");
    expect(source).toContain("? \"Hide\"");
    expect(source).toContain("/api/storage/assets/${asset._id}/download?disposition=inline");
    expect(source).toContain("preload=\"metadata\"");
    expect(source).toContain("<video");
  });
});
