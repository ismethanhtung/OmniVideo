import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/video-intake/local-upload-intake-panel.tsx";

describe("Local Upload Intake View Mode errors", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders failed run status messages and error codes in red", () => {
        expect(source).toContain('state.status === "failed"');
        expect(source).toContain('? "font-semibold text-rose-700"');
        expect(source).toContain('className="font-mono text-[11px] text-rose-700"');
    });

    it("uses lightweight folder metadata instead of free-form tag input", () => {
        expect(source).toContain("/api/storage/folders");
        expect(source).toContain("Folder");
        expect(source).toContain("New folder...");
        expect(source).toContain("<select");
        expect(source).not.toContain("<datalist");
        expect(source).not.toContain("Tags comma-separated");
    });
});
