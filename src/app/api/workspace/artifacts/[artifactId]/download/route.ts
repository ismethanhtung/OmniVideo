import { NextResponse } from "next/server";

import { buildStrictDownloadFilename } from "@/lib/storage/strict-download-filename";
import { getWorkspaceServerArtifact } from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

function buildContentDisposition(fileName: string) {
  return `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function sanitizeWorkspaceArtifactFileName(fileName: string) {
  const extension = fileName.match(/\.([a-z0-9]{2,5})$/iu)?.[1] ?? "mp4";
  const baseName = fileName.replace(/\.[^.]+$/u, "");
  return buildStrictDownloadFilename({
    baseName,
    fallbackBaseName: "workspace-artifact",
    extension,
    maxBaseLength: 120,
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  try {
    const { artifactId } = await params;
    const artifact = getWorkspaceServerArtifact(artifactId);

    if (!artifact) {
      return NextResponse.json(
        {
          ok: false,
          errorCode: "VAL_WORKSPACE_ARTIFACT_NOT_FOUND",
          error: "Workspace artifact was not found or has expired.",
        },
        { status: 404 },
      );
    }

    const body = artifact.bytes.buffer.slice(
      artifact.bytes.byteOffset,
      artifact.bytes.byteOffset + artifact.bytes.byteLength,
    ) as ArrayBuffer;
    const safeFileName = sanitizeWorkspaceArtifactFileName(artifact.fileName);

    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": artifact.mimeType,
        "Content-Disposition": buildContentDisposition(safeFileName),
        "Content-Length": String(artifact.byteLength),
        "X-OmniVideo-File-Name": encodeURIComponent(safeFileName),
        "X-OmniVideo-Byte-Length": String(artifact.byteLength),
        "X-OmniVideo-Artifact-Kind": artifact.kind,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        errorCode: "SYS_WORKSPACE_ARTIFACT_DOWNLOAD_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "Workspace artifact download failed.",
      },
      { status: 500 },
    );
  }
}
