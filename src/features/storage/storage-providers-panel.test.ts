import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/storage/storage-providers-panel.tsx";

describe("Storage Providers View Mode errors", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders failed provider messages and error codes in red", () => {
        expect(source).toContain('state.status === "failed" ? "text-rose-700" : "text-muted"');
        expect(source).toContain(
            'state.status === "failed"\n                    ? "border-rose-300 text-rose-700"',
        );
        expect(source).toContain('className="mt-1 font-mono text-[10px] text-rose-700"');
    });
});
