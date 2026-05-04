import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/storage/storage-library-panel.tsx";

describe("Storage Library pagination", () => {
  const source = readFileSync(SOURCE_PATH, "utf8");

  it("requests assets with page and pageSize", () => {
    expect(source).toContain("/api/storage/assets?page=${page}&pageSize=${pagination.pageSize}");
    expect(source).toContain("setPagination(payload.pagination ?? DEFAULT_PAGINATION);");
  });

  it("renders Prev/Next controls with pagination state", () => {
    expect(source).toContain("pagination.page} /");
    expect(source).toContain("pagination.totalPages");
    expect(source).toContain("void loadAssets(pagination.page - 1);");
    expect(source).toContain("void loadAssets(pagination.page + 1);");
  });

  it("renders failed status messages with red error treatment", () => {
    expect(source).toContain('const statusFailed = status === "failed";');
    expect(source).toContain('statusFailed ? "text-rose-700" : "text-muted"');
    expect(source).toContain('statusFailed ? "font-semibold text-rose-700" : "text-muted"');
  });
});
