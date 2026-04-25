import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

import { IntakeError } from "./types";
import type { IntakeQualityPreference } from "./types";

type InternalResolverPayload = {
  directMediaUrl?: string;
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

const execFileAsync = promisify(execFile);

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
): Required<Pick<InternalResolverPayload, "directMediaUrl">> & InternalResolverPayload {
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

  if (!payload.directMediaUrl) {
    throw new IntakeError({
      errorCode: "VID_RESOLVER_EMPTY_DIRECT_URL",
      message: "Internal resolver did not return directMediaUrl.",
      category: "dependency",
    });
  }

  return payload as Required<Pick<InternalResolverPayload, "directMediaUrl">> &
    InternalResolverPayload;
}

export async function resolveMediaUrlInternal(
  url: string,
  qualityPreference: IntakeQualityPreference,
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
      [scriptPath, normalizeExtractorUrl(url), qualityPreference],
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
        message:
          "Internal resolver runtime is missing yt-dlp.",
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
