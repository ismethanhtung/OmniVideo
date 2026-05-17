import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/app-shell.tsx";

describe("AppShell navigation", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("navigates between sections without leave confirmation warnings", () => {
        expect(source).toContain("navigateToSection");
        expect(source).not.toContain("shouldWarnOnNavigate");
        expect(source).not.toContain(
            "You have in-progress work. Are you sure you want to leave this page?",
        );
    });
});
