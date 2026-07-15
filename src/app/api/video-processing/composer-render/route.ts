import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import {
    renderVideoComposerProject,
    VideoComposerRenderError,
    type VideoComposerRenderSettings,
} from "@/lib/video-processing/video-composer-render";

export const runtime = "nodejs";

function parseSettings(raw: FormDataEntryValue | null): VideoComposerRenderSettings {
    if (typeof raw !== "string") return {};
    try {
        const parsed = JSON.parse(raw) as VideoComposerRenderSettings;
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-tools");
        if (rateLimited) return rateLimited;
        const formData = await request.formData();
        const clips = formData
            .getAll("videoFiles")
            .filter((entry): entry is File => entry instanceof File);
        const music = formData.get("musicFile");
        const result = await renderVideoComposerProject({
            clips: await Promise.all(
                clips.map(async (clip) => ({
                    fileName: clip.name || "clip.mp4",
                    bytes: new Uint8Array(await clip.arrayBuffer()),
                })),
            ),
            music:
                music instanceof File
                    ? {
                          fileName: music.name || "music",
                          bytes: new Uint8Array(await music.arrayBuffer()),
                      }
                    : undefined,
            settings: parseSettings(formData.get("settingsJson")),
        });
        return new Response(new Uint8Array(result.bytes), {
            headers: {
                "Content-Type": "video/mp4",
                "Content-Disposition": `attachment; filename="${result.fileName}"`,
                "X-OmniVideo-File-Name": encodeURIComponent(result.fileName),
            },
        });
    } catch (error) {
        const known = error instanceof VideoComposerRenderError;
        return NextResponse.json(
            {
                ok: false,
                errorCode: known ? error.code : "COMPOSER_RENDER_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Composer render failed.",
            },
            { status: known ? error.status : 500 },
        );
    }
}
