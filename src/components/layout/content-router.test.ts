import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/content-router.tsx";

describe("ContentRouter layout experiment", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("uses full-width wrappers instead of max width containers", () => {
    expect(source).toContain('<div className="w-full px-5 py-5">');
    expect(source).not.toContain("max-w-7xl");
  });

  it("marks routed pages to hide their first section header", () => {
    const markerCount = (source.match(/data-hide-section-header=\"true\"/g) || []).length;
    expect(source).toContain('data-hide-section-header=\"true\"');
    expect(markerCount).toBeGreaterThanOrEqual(4);
  });
});
