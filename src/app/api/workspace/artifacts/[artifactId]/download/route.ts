import { NextResponse } from "next/server";

import { getWorkspaceServerArtifact } from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";

function buildContentDisposition(fileName: string) {
  const asciiFallback =
    fileName
      .replace(/[^\x20-\x7e]+/g, "_")
      .replace(/["\\]/g, "_")
      .trim() || "workspace-artifact.mp4";

  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
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

    return new Response(body, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": artifact.mimeType,
        "Content-Disposition": buildContentDisposition(artifact.fileName),
        "Content-Length": String(artifact.byteLength),
        "X-OmniVideo-File-Name": encodeURIComponent(artifact.fileName),
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
