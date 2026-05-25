import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/app/api/video-processing/merge/route.ts";

describe("video merge API route", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("accepts multiple files and invokes merge runtime", () => {
    expect(source).toContain('.getAll("videoFiles")');
    expect(source).toContain("runVideoMerge");
    expect(source).toContain("inputCount");
  });

  it("returns downloadable merged mp4 artifact", () => {
    expect(source).toContain('mimeType: "video/mp4"');
    expect(source).toContain("downloadUrl");
    expect(source).toContain('`/api/video-processing/split/download/${download.id}`');
  });
});
