export const DEFAULT_VIDEO_BACKGROUND_MUSIC_SOURCE =
    "/musics/vprodmusic_asia_bgm-across-the-rivers-of-asia-143602.mp3";

export const VIDEO_BACKGROUND_MUSIC_LIBRARY = [
    {
        source: DEFAULT_VIDEO_BACKGROUND_MUSIC_SOURCE,
        label: "Across the Rivers of Asia",
    },
] as const;

export type VideoBackgroundMusicLibraryOption = {
    source: string;
    label: string;
};

export const DEFAULT_VIDEO_BACKGROUND_MUSIC_VOLUME = 0.18;
export const DEFAULT_VIDEO_BACKGROUND_MUSIC_TRACK_VOLUME = 1;

export type VideoBackgroundMusicTrackConfig = {
    source: string;
    label?: string;
    startSeconds: number;
    volume: number;
    repeat: boolean;
};

export type VideoBackgroundMusicConfig = {
    enabled: boolean;
    volume: number;
    tracks: VideoBackgroundMusicTrackConfig[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        if (value === "true") return true;
        if (value === "false") return false;
    }
    return undefined;
}

export function clampVideoBackgroundMusicVolume(
    value: unknown,
    fallback = DEFAULT_VIDEO_BACKGROUND_MUSIC_VOLUME,
) {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(2, Math.max(0, parsed));
}

export function isSafePublicMusicSource(source: string) {
    const trimmed = source.trim();
    if (!trimmed.startsWith("/musics/")) return false;
    if (trimmed.includes("\\") || trimmed.includes("\0")) return false;
    const parts = trimmed.split("/").filter(Boolean);
    return (
        parts[0] === "musics" &&
        parts.length >= 2 &&
        parts.every((part) => part !== "." && part !== "..")
    );
}

export function normalizeVideoBackgroundMusicTrack(
    value: unknown,
): VideoBackgroundMusicTrackConfig | null {
    if (!isRecord(value)) return null;
    const source =
        typeof value.source === "string" && value.source.trim()
            ? value.source.trim()
            : "";
    if (!source) return null;
    const label =
        typeof value.label === "string" && value.label.trim()
            ? value.label.trim()
            : undefined;
    const startSeconds =
        typeof value.startSeconds === "number"
            ? value.startSeconds
            : Number(value.startSeconds);
    return {
        source,
        label,
        startSeconds: Number.isFinite(startSeconds)
            ? Math.max(0, startSeconds)
            : 0,
        volume: clampVideoBackgroundMusicVolume(
            value.volume,
            DEFAULT_VIDEO_BACKGROUND_MUSIC_TRACK_VOLUME,
        ),
        repeat: readBoolean(value.repeat) ?? false,
    };
}

export function normalizeVideoBackgroundMusicConfig(
    value: unknown,
): VideoBackgroundMusicConfig | undefined {
    if (!isRecord(value)) return undefined;
    const enabled = readBoolean(value.enabled) ?? false;
    const tracks = Array.isArray(value.tracks)
        ? value.tracks
              .map((track) => normalizeVideoBackgroundMusicTrack(track))
              .filter(
                  (
                      track,
                  ): track is VideoBackgroundMusicTrackConfig =>
                      track !== null,
              )
        : [];
    if (!enabled || tracks.length === 0) return undefined;
    return {
        enabled: true,
        volume: clampVideoBackgroundMusicVolume(value.volume),
        tracks,
    };
}
