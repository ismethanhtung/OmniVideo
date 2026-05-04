import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/features/inspiration-vault/inspiration-vault-panel.tsx";

describe("Inspiration Vault View Mode feedback", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("does not show the red View Mode banner until a locked action is attempted", () => {
        expect(source).toContain("{lockedMessage ? (");
        expect(source).not.toContain("{isReadOnlyDemo ? (");
        expect(source).toContain("setLockedMessage(VIEW_MODE_WRITE_DISABLED_MESSAGE)");
    });

    it("sorts exploited rows to the bottom of each category table", () => {
        expect(source).toContain("function sortVaultItems(items: InspirationVaultItem[])");
        expect(source).toContain("return left.exploited ? 1 : -1;");
        expect(source).toContain('"video-source": sortVaultItems(');
        expect(source).toContain("link: sortVaultItems(");
    });
});
