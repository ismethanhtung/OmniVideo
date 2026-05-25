import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/lib/video-processing/video-merge.ts";

describe("video merge runtime", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("uses ffmpeg concat demuxer with stream copy for low CPU/RAM merge", () => {
    expect(source).toContain('"-f",');
    expect(source).toContain('"concat"');
    expect(source).toContain('"-safe"');
    expect(source).toContain('"0"');
    expect(source).toContain('"-c"');
    expect(source).toContain('"copy"');
  });

  it("requires at least two files", () => {
    expect(source).toContain("VAL_VIDEO_FILES_MIN_REQUIRED");
    expect(source).toContain("at least 2 video files");
  });
});
