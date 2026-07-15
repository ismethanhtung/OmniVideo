import path from "node:path";
import { access, readdir } from "node:fs/promises";

export type LocalPiperModel = {
    id: string;
    label: string;
    modelPath: string;
    configPath: string;
};

const DEFAULT_PIPER_DIRECTORY = path.join(process.cwd(), "piper");

export async function listLocalPiperModels(
    piperDirectory = DEFAULT_PIPER_DIRECTORY,
): Promise<LocalPiperModel[]> {
    try {
        const entries = await readdir(piperDirectory, { withFileTypes: true });
        const modelNames = entries
            .filter(
                (entry) =>
                    entry.isFile() &&
                    entry.name.endsWith(".onnx") &&
                    !entry.name.endsWith(".onnx.json"),
            )
            .map((entry) => entry.name)
            .sort((left, right) => left.localeCompare(right));

        const completeModels = await Promise.all(
            modelNames.map(async (modelName) => {
                const configName = `${modelName}.json`;
                try {
                    await access(path.join(piperDirectory, configName));
                    return {
                        id: modelName,
                        label: modelName.slice(0, -".onnx".length),
                        modelPath: path.join("piper", modelName),
                        configPath: path.join("piper", configName),
                    };
                } catch {
                    return null;
                }
            }),
        );

        return completeModels.filter(
            (model): model is LocalPiperModel => model !== null,
        );
    } catch {
        return [];
    }
}
