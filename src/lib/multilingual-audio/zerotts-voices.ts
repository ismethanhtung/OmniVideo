import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

export type ZeroTtsVoice = {
  id: string;
  name: string;
  gender: "female" | "male" | "other";
  region: "Bắc" | "Trung" | "Nam" | "Khác";
  description: string;
  isPreset: boolean;
  filePath?: string;
  format?: "preset" | "npz" | "zip" | "audio";
};

export const ZEROTTS_PRESET_VOICES: ZeroTtsVoice[] = [
  {
    id: "maichi",
    name: "Mai Chi",
    gender: "female",
    region: "Bắc",
    description: "Nữ miền Bắc - truyền cảm, tự nhiên, biểu cảm sâu sắc (Khuyên dùng)",
    isPreset: true,
    format: "preset",
  },
];

/**
 * Scan workspace folders for custom voice packs (.zip, .npz, or sample audio files).
 */
export function discoverLocalCustomVoices(baseDir: string = process.cwd()): ZeroTtsVoice[] {
  const customVoices: ZeroTtsVoice[] = [];
  const searchDirs = [
    path.join(baseDir, "zerotts_voices"),
    path.join(baseDir, "voices"),
    path.join(baseDir, "public", "clone"),
    path.join(baseDir, "public", "clone "),
  ];

  for (const dir of searchDirs) {
    if (!existsSync(dir)) continue;

    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        const fullPath = path.join(dir, entry);
        const stat = statSync(fullPath);
        if (!stat.isFile()) continue;

        const ext = path.extname(entry).toLowerCase();
        if (ext === ".zip" || ext === ".npz" || ext === ".wav" || ext === ".mp3" || ext === ".m4a") {
          const baseName = path.basename(entry, ext);
          const format: ZeroTtsVoice["format"] =
            ext === ".zip" ? "zip" : ext === ".npz" ? "npz" : "audio";

          customVoices.push({
            id: `custom_${baseName}_${format}`,
            name: `${baseName} (${ext.toUpperCase().replace(".", "")})`,
            gender: "other",
            region: "Khác",
            description: `Giọng tuỳ chỉnh từ file ${entry}`,
            isPreset: false,
            filePath: fullPath,
            format,
          });
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  return customVoices;
}

export function getAllZeroTtsVoices(baseDir?: string): ZeroTtsVoice[] {
  const custom = discoverLocalCustomVoices(baseDir);
  return [...ZEROTTS_PRESET_VOICES, ...custom];
}
