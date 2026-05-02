import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/ai-providers/ai-providers-panel.tsx";

describe("AI Providers chat-test modal", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("uses English-first chat modal copy", () => {
        expect(source).toContain("API Chat Test");
        expect(source).toContain("via server-side proxy (API key stays hidden)");
        expect(source).toContain("Last response:");
        expect(source).toContain("Open API chat test (chat/completions)");
        expect(source).not.toContain("Chat thử API");
    });

    it("shows an empty-state hint and English composer labels", () => {
        expect(source).toContain(
            "Start by sending a prompt below. Messages are kept only in this modal session.",
        );
        expect(source).toContain("Temp");
        expect(source).toContain("Send message");
        expect(source).toContain("Loading models...");
        expect(source).toContain("Model ID");
        expect(source).not.toContain("Temperature slider");
    });
});
