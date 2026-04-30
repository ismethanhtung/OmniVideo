import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";
import path from "node:path";

import { IntakeError } from "./types";
import type { IntakeQualityPreference, YtDlpFormatSummary } from "./types";

type InternalResolverPayload = {
  directMediaUrl?: string;
  downloadMode?: "direct-url" | "yt-dlp-file";
  resolverProfile?: string;
  formatSelector?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  formatId?: string;
  formatNote?: string;
  height?: number;
  width?: number;
  resolution?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  requestHeaders?: Record<string, string>;
};

export type InternalResolverFormatList = {
  sourceUrl: string;
  title?: string;
  durationMs?: number;
  originPlatform?: string;
  resolverProfile?: string;
  recommendedFormatSelector?: string;
  formats: YtDlpFormatSummary[];
};

export type InternalResolverDownloadedFile = {
  filePath: string;
  filename: string;
  mimeType?: string;
  sizeBytes?: number;
  title?: string;
  durationMs?: number;
  formatId?: string;
  formatSelector?: string;
  resolverProfile?: string;
  hasAudio?: boolean;
  hasVideo?: boolean;
  cleanup: () => Promise<void>;
};

const execFileAsync = promisify(execFile);

export const INTERNAL_RESOLVER_RUNTIME_MISSING_MESSAGE =
  "Internal resolver runtime is missing yt-dlp. Run `npm run setup:resolver` from the repo root to install it into `.vendor/python`.";

export function normalizeExtractorUrl(url: string) {
  const parsed = new URL(url);

  if (parsed.hostname.endsWith("douyin.com")) {
    const modalId = parsed.searchParams.get("modal_id");

    if (modalId) {
      return `${parsed.protocol}//${parsed.host}/video/${modalId}`;
    }
  }

  return url;
}

export function cleanInternalResolverErrorMessage(message: string) {
  const cleaned = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("Deprecated Feature:"))
    .join(" ");

  if (cleaned.includes("Fresh cookies")) {
    return `${cleaned} Automatic browser-cookie fallback was attempted. Configure VIDEO_RESOLVER_COOKIES_HEADER (raw cookie/header text), VIDEO_RESOLVER_COOKIES_FILE, or VIDEO_RESOLVER_COOKIES_FROM_BROWSER for deterministic extraction on this platform.`;
  }

  return cleaned || message;
}

export function parseInternalResolverStdout(
  stdout: string,
): InternalResolverPayload & { downloadMode: "direct-url" | "yt-dlp-file" } {
  let payload: InternalResolverPayload;

  try {
    payload = JSON.parse(stdout) as InternalResolverPayload;
  } catch {
    throw new IntakeError({
      errorCode: "VID_RESOLVER_FAILED",
      message: "Internal resolver returned invalid JSON.",
      category: "dependency",
    });
  }

  const downloadMode = payload.downloadMode ?? "direct-url";

  if (downloadMode === "direct-url" && !payload.directMediaUrl) {
    throw new IntakeError({
      errorCode: "VID_RESOLVER_EMPTY_DIRECT_URL",
      message: "Internal resolver did not return directMediaUrl.",
      category: "dependency",
    });
  }

  if (downloadMode === "yt-dlp-file" && !payload.formatSelector) {
    throw new IntakeError({
      errorCode: "VID_RESOLVER_EMPTY_FORMAT_SELECTOR",
      message: "Internal resolver did not return formatSelector.",
      category: "dependency",
    });
  }

  return { ...payload, downloadMode };
}

export async function resolveMediaUrlInternal(
  url: string,
  qualityPreference: IntakeQualityPreference,
  formatSelector?: string,
) {
  const pythonPath = path.join(process.cwd(), ".vendor/python");
  const scriptPath = path.join(
    process.cwd(),
    "src/lib/video-intake/internal-resolver.py",
  );
  const inheritedPythonPath = process.env.PYTHONPATH;

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [
        scriptPath,
        "resolve",
        normalizeExtractorUrl(url),
        qualityPreference,
        formatSelector ?? "",
      ],
      {
        env: {
          ...process.env,
          PYTHONPATH: inheritedPythonPath
            ? `${pythonPath}${path.delimiter}${inheritedPythonPath}`
            : pythonPath,
        },
        timeout: 120_000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    return parseInternalResolverStdout(stdout);
  } catch (error) {
    const errorWithStderr = error as Error & { stderr?: string };
    const rawMessage =
      errorWithStderr.stderr?.trim() ||
      (error instanceof Error ? error.message : "Internal resolver failed.");
    const message = cleanInternalResolverErrorMessage(rawMessage);

    if (
      message.includes("No module named 'yt_dlp'") ||
      message.includes("Cannot find module")
    ) {
      throw new IntakeError({
        errorCode: "VID_RESOLVER_RUNTIME_MISSING",
        message: INTERNAL_RESOLVER_RUNTIME_MISSING_MESSAGE,
        category: "dependency",
      });
    }

    throw new IntakeError({
      errorCode: "VID_RESOLVER_FAILED",
      message,
      category: "dependency",
      retryable: false,
    });
  }
}

export async function listMediaFormatsInternal(
  url: string,
  qualityPreference: IntakeQualityPreference,
): Promise<InternalResolverFormatList> {
  const pythonPath = path.join(process.cwd(), ".vendor/python");
  const scriptPath = path.join(
    process.cwd(),
    "src/lib/video-intake/internal-resolver.py",
  );
  const inheritedPythonPath = process.env.PYTHONPATH;

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [scriptPath, "formats", normalizeExtractorUrl(url), qualityPreference],
      {
        env: {
          ...process.env,
          PYTHONPATH: inheritedPythonPath
            ? `${pythonPath}${path.delimiter}${inheritedPythonPath}`
            : pythonPath,
        },
        timeout: 120_000,
        maxBuffer: 20 * 1024 * 1024,
      },
    );

    const payload = JSON.parse(stdout) as InternalResolverFormatList;
    return {
      ...payload,
      formats: Array.isArray(payload.formats) ? payload.formats : [],
    };
  } catch (error) {
    const errorWithStderr = error as Error & { stderr?: string };
    const rawMessage =
      errorWithStderr.stderr?.trim() ||
      (error instanceof Error ? error.message : "Internal resolver failed.");
    throw new IntakeError({
      errorCode: "VID_FORMAT_LIST_FAILED",
      message: cleanInternalResolverErrorMessage(rawMessage),
      category: "dependency",
      retryable: false,
    });
  }
}

export async function downloadResolvedMediaToTempFile({
  originalUrl,
  requestedQuality,
  formatSelector,
}: {
  originalUrl: string;
  requestedQuality: IntakeQualityPreference;
  formatSelector?: string;
}): Promise<InternalResolverDownloadedFile> {
  const pythonPath = path.join(process.cwd(), ".vendor/python");
  const scriptPath = path.join(
    process.cwd(),
    "src/lib/video-intake/internal-resolver.py",
  );
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), "omnivideo-ytdlp-"));
  const inheritedPythonPath = process.env.PYTHONPATH;

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [
        scriptPath,
        "download",
        normalizeExtractorUrl(originalUrl),
        requestedQuality,
        formatSelector ?? "",
        tmpDir,
      ],
      {
        env: {
          ...process.env,
          PYTHONPATH: inheritedPythonPath
            ? `${pythonPath}${path.delimiter}${inheritedPythonPath}`
            : pythonPath,
        },
        timeout: 15 * 60_000,
        maxBuffer: 20 * 1024 * 1024,
      },
    );
    const payload = JSON.parse(stdout) as Omit<
      InternalResolverDownloadedFile,
      "cleanup"
    >;

    return {
      ...payload,
      cleanup: () => rm(tmpDir, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(tmpDir, { recursive: true, force: true });
    const errorWithStderr = error as Error & { stderr?: string };
    const rawMessage =
      errorWithStderr.stderr?.trim() ||
      (error instanceof Error ? error.message : "yt-dlp download failed.");
    throw new IntakeError({
      errorCode: "VID_YTDLP_DOWNLOAD_FAILED",
      message: cleanInternalResolverErrorMessage(rawMessage),
      category: "dependency",
      retryable: false,
    });
  }
}
