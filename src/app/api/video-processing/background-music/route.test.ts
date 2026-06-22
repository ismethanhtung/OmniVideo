import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const testFilePath = path.join(
    process.cwd(),
    "public",
    "musics",
    "zz-test-dynamic-library.mp3",
);

describe("background music library API", () => {
    afterEach(async () => {
        await rm(testFilePath, { force: true });
    });

    it("lists supported public music files from public/musics", async () => {
        await mkdir(path.dirname(testFilePath), { recursive: true });
        await writeFile(testFilePath, Buffer.from("mp3"));

        const response = await GET();
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({ ok: true });
        expect(payload.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    source: "/musics/zz-test-dynamic-library.mp3",
                    label: "Zz Test Dynamic Library",
                }),
            ]),
        );
        expect(
            payload.data.every((item: { source: string }) =>
                item.source.startsWith("/musics/"),
            ),
        ).toBe(true);
    });
});
