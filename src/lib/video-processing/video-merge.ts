import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

export class VideoMergeError extends Error {
  constructor(
    public readonly code:
      | "VAL_VIDEO_FILES_REQUIRED"
      | "VAL_VIDEO_FILES_MIN_REQUIRED"
      | "SYS_VIDEO_MERGE_FAILED",
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "VideoMergeError";
  }
}

function sanitizeBaseName(fileName: string) {
  const raw = fileName.replace(/\.[^.]+$/u, "");
  return (
    raw
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "video"
  );
}

async function runProcess(command: string, args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
    });
  });
}

export async function runVideoMerge(input: {
  files: Array<{ fileName: string; fileBytes: Uint8Array }>;
}) {
  if (!Array.isArray(input.files) || input.files.length === 0) {
    throw new VideoMergeError(
      "VAL_VIDEO_FILES_REQUIRED",
      "At least one video file is required.",
      400,
    );
  }
  if (input.files.length < 2) {
    throw new VideoMergeError(
      "VAL_VIDEO_FILES_MIN_REQUIRED",
      "Please select at least 2 video files to merge.",
      400,
    );
  }

  const baseName = sanitizeBaseName(input.files[0]?.fileName || "video");
  const workDir = path.join(tmpdir(), `omnivideo-merge-${randomUUID()}`);
  const listPath = path.join(workDir, "concat-list.txt");
  const outputPath = path.join(workDir, `${baseName}-merged.mp4`);

  try {
    await mkdir(workDir, { recursive: true });

    const inputPaths: string[] = [];
    for (const [index, file] of input.files.entries()) {
      const inputPath = path.join(workDir, `part-${String(index + 1).padStart(3, "0")}.mp4`);
      await writeFile(inputPath, file.fileBytes);
      inputPaths.push(inputPath);
    }

    const concatContent = inputPaths
      .map((inputPath) => `file '${inputPath.replace(/'/g, "'\\''")}'`)
      .join("\n");
    await writeFile(listPath, `${concatContent}\n`, "utf8");

    const ffmpegPath = resolveFfmpegPath();
    await runProcess(ffmpegPath, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      outputPath,
    ]);

    return {
      outputPath,
      outputName: `${baseName}-merged.mp4`,
      inputCount: input.files.length,
      cleanup: async () => {
        await rm(workDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
    if (error instanceof VideoMergeError) throw error;
    throw new VideoMergeError(
      "SYS_VIDEO_MERGE_FAILED",
      error instanceof Error ? error.message : "Video merge failed.",
      500,
    );
  }
}
