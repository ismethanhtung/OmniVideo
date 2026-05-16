import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/app-shell.tsx";

describe("AppShell navigation guard", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("warns when leaving Workspace or Audio Transcript", () => {
        expect(source).toContain('activeSection === "workspace"');
        expect(source).toContain('activeSection === "chineseTranscription"');
        expect(source).toContain(
            "You have in-progress work. Are you sure you want to leave this page?",
        );
        expect(source).toContain("navigateToSection");
    });
});

