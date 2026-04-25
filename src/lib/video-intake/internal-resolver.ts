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
  requestHeaders?: Record<string, string>;
};

const execFileAsync = promisify(execFile);

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
      [scriptPath, url, qualityPreference],
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
    const message =
      errorWithStderr.stderr?.trim() ||
      (error instanceof Error ? error.message : "Internal resolver failed.");

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
