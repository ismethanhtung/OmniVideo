export const LOCAL_VIDEO_EDIT_SETUP_STORAGE_KEY =
    "omnivideo.videoToolsLab.localVideoEditSetups.v1";

export type LocalVideoEditSetupEntry = {
    fileKey: string;
    fileName: string;
    fileSize: number;
    fileLastModified: number;
    videoEditSetup: Record<string, unknown>;
    savedAt: string;
};

function readRegistry() {
    if (typeof window === "undefined") {
        return {};
    }
    try {
        const raw = window.localStorage.getItem(
            LOCAL_VIDEO_EDIT_SETUP_STORAGE_KEY,
        );
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, LocalVideoEditSetupEntry>)
            : {};
    } catch {
        return {};
    }
}

function writeRegistry(registry: Record<string, LocalVideoEditSetupEntry>) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
        LOCAL_VIDEO_EDIT_SETUP_STORAGE_KEY,
        JSON.stringify(registry),
    );
}

export function buildLocalVideoEditSetupFileKey(file: File | null) {
    if (!file) return "";
    return `${file.name}::${file.size}::${file.lastModified}`;
}

export function saveLocalVideoEditSetup(input: {
    file: File;
    videoEditSetup: Record<string, unknown>;
}) {
    const fileKey = buildLocalVideoEditSetupFileKey(input.file);
    if (!fileKey) return null;
    const entry: LocalVideoEditSetupEntry = {
        fileKey,
        fileName: input.file.name,
        fileSize: input.file.size,
        fileLastModified: input.file.lastModified,
        videoEditSetup: input.videoEditSetup,
        savedAt: new Date().toISOString(),
    };
    writeRegistry({
        ...readRegistry(),
        [fileKey]: entry,
    });
    return entry;
}

export function loadLocalVideoEditSetup(file: File | null) {
    const fileKey = buildLocalVideoEditSetupFileKey(file);
    if (!fileKey) return null;
    return readRegistry()[fileKey] ?? null;
}
