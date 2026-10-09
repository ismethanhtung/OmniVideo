import { NextResponse } from "next/server";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import {
    renderZeroTtsVideo,
    ZeroTtsRenderError,
    type ZeroTtsRenderSettings,
} from "@/lib/video-processing/zerotts-render";

export const runtime = "nodejs";

function parseSettingsJson(raw: FormDataEntryValue | null): ZeroTtsRenderSettings {
    if (typeof raw !== "string" || !raw.trim()) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-tools");
        if (rateLimited) return rateLimited;

        const contentType = request.headers.get("content-type") || "";
        let videoBytes: Uint8Array | null = null;
        let videoName = "input.mp4";
        let speechBytes: Uint8Array | null = null;
        let speechName = "speech.wav";
        let musicBytes: Uint8Array | undefined = undefined;
        let musicName: string | undefined = undefined;
        let musicSource: string | undefined = undefined;
        let settings: ZeroTtsRenderSettings = {};
        let responseMode = "json";

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const videoFile = formData.get("videoFile") as File | null;
            if (!videoFile) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "ZERO_TTS_VIDEO_REQUIRED",
                        error: "Vui lòng chọn video để render.",
                    },
                    { status: 400 },
                );
            }
            videoBytes = new Uint8Array(await videoFile.arrayBuffer());
            videoName = videoFile.name || "input.mp4";

            const speechFile = formData.get("speechAudioFile") as File | null;
            const speechBase64 = formData.get("speechBase64") as string | null;

            if (speechFile) {
                speechBytes = new Uint8Array(await speechFile.arrayBuffer());
                speechName = speechFile.name || "speech.wav";
            } else if (speechBase64) {
                speechBytes = Buffer.from(
                    speechBase64.replace(/^data:audio\/\w+;base64,/u, ""),
                    "base64",
                );
            } else {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "ZERO_TTS_SPEECH_REQUIRED",
                        error: "Thiếu dữ liệu âm thanh ZeroTTS.",
                    },
                    { status: 400 },
                );
            }

            const musicFile = formData.get("musicFile") as File | null;
            if (musicFile) {
                musicBytes = new Uint8Array(await musicFile.arrayBuffer());
                musicName = musicFile.name;
            }
            const musicSourceVal = formData.get("musicSource") as string | null;
            if (musicSourceVal) {
                musicSource = musicSourceVal;
            }

            settings = parseSettingsJson(formData.get("settingsJson"));
            responseMode = (formData.get("responseMode") as string) || "json";
        } else {
            const body = await request.json().catch(() => ({}));
            if (!body.videoBase64) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "ZERO_TTS_VIDEO_REQUIRED",
                        error: "Thiếu dữ liệu video đầu vào.",
                    },
                    { status: 400 },
                );
            }
            videoBytes = Buffer.from(
                body.videoBase64.replace(/^data:video\/\w+;base64,/u, ""),
                "base64",
            );
            videoName = body.videoName || "input.mp4";

            if (!body.speechBase64) {
                return NextResponse.json(
                    {
                        ok: false,
                        errorCode: "ZERO_TTS_SPEECH_REQUIRED",
                        error: "Thiếu dữ liệu âm thanh ZeroTTS.",
                    },
                    { status: 400 },
                );
            }
            speechBytes = Buffer.from(
                body.speechBase64.replace(/^data:audio\/\w+;base64,/u, ""),
                "base64",
            );
            speechName = body.speechName || "speech.wav";

            musicSource = body.musicSource;
            if (body.musicBase64) {
                musicBytes = Buffer.from(
                    body.musicBase64.replace(/^data:audio\/\w+;base64,/u, ""),
                    "base64",
                );
            }
            settings = body.settings || {};
            responseMode = body.responseMode || "json";
        }

        const result = await renderZeroTtsVideo({
            video: {
                fileName: videoName,
                bytes: videoBytes,
            },
            speech: {
                fileName: speechName,
                bytes: speechBytes,
            },
            music:
                musicBytes || musicSource
                    ? {
                          fileName: musicName,
                          source: musicSource,
                          bytes: musicBytes,
                      }
                    : undefined,
            settings,
        });

        if (responseMode === "binary") {
            return new Response(new Uint8Array(result.bytes), {
                status: 200,
                headers: {
                    "Content-Type": "video/mp4",
                    "Content-Disposition": `attachment; filename="${result.fileName}"`,
                    "Content-Length": String(result.fileSizeBytes),
                    "X-OmniVideo-File-Name": encodeURIComponent(result.fileName),
                },
            });
        }

        const base64 = Buffer.from(result.bytes).toString("base64");
        return NextResponse.json({
            ok: true,
            data: {
                videoBase64: base64,
                videoUrl: `data:video/mp4;base64,${base64}`,
                fileName: result.fileName,
                fileSizeBytes: result.fileSizeBytes,
                durationSeconds: result.durationSeconds,
            },
        });
    } catch (error) {
        const isKnown = error instanceof ZeroTtsRenderError;
        return NextResponse.json(
            {
                ok: false,
                errorCode: isKnown ? error.code : "ZERO_TTS_RENDER_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Render video ZeroTTS thất bại.",
            },
            { status: isKnown ? error.status : 500 },
        );
    }
}
