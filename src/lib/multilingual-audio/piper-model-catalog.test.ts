import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";

import { listLocalPiperModels } from "./piper-model-catalog";

const temporaryDirectories: string[] = [];

afterEach(async () => {
    await Promise.all(
        temporaryDirectories.splice(0).map((directory) =>
            rm(directory, { recursive: true, force: true }),
        ),
    );
});

describe("listLocalPiperModels", () => {
    it("returns sorted models only when their matching config JSON exists", async () => {
        const directory = await mkdtemp(path.join(tmpdir(), "piper-models-"));
        temporaryDirectories.push(directory);
        await Promise.all([
            writeFile(path.join(directory, "model2.onnx"), "model"),
            writeFile(path.join(directory, "model2.onnx.json"), "{}"),
            writeFile(path.join(directory, "model.onnx"), "model"),
            writeFile(path.join(directory, "model.onnx.json"), "{}"),
            writeFile(path.join(directory, "orphan.onnx"), "model"),
        ]);

        await expect(listLocalPiperModels(directory)).resolves.toEqual([
            {
                id: "model.onnx",
                label: "model",
                modelPath: path.join("piper", "model.onnx"),
                configPath: path.join("piper", "model.onnx.json"),
            },
            {
                id: "model2.onnx",
                label: "model2",
                modelPath: path.join("piper", "model2.onnx"),
                configPath: path.join("piper", "model2.onnx.json"),
            },
        ]);
    });

    it("returns no models when the catalog directory cannot be read", async () => {
        await expect(
            listLocalPiperModels(path.join(tmpdir(), "missing-piper-models")),
        ).resolves.toEqual([]);
    });
});
