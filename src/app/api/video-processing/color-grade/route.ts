import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { applyDemoRateLimit } from "@/lib/access-control/route-guards";
import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";

export const runtime = "nodejs";

export type ColorGradeFilterOptions = {
    brightness?: number; // -1.0 to 1.0 (default 0.0)
    contrast?: number; // 0.1 to 3.0 (default 1.0)
    saturation?: number; // 0.0 to 3.0 (default 1.0)
    gamma?: number; // 0.1 to 3.0 (default 1.0)
    vignette?: number; // 0.0 to 1.0 (default 0.0)
    temperature?: number; // -50 to 50 (default 0)
    presetName?: string;
};

export function buildColorGradeFfmpegFilter(options: ColorGradeFilterOptions = {}): string {
    const filters: string[] = [];

    const brightness = Math.max(-1.0, Math.min(1.0, options.brightness ?? 0.0));
    const contrast = Math.max(0.1, Math.min(3.0, options.contrast ?? 1.0));
    const saturation = Math.max(0.0, Math.min(3.0, options.saturation ?? 1.0));
    const gamma = Math.max(0.1, Math.min(3.0, options.gamma ?? 1.0));

    filters.push(
        `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}:gamma=${gamma.toFixed(3)}`,
    );

    const vignette = Math.max(0.0, Math.min(1.0, options.vignette ?? 0.0));
    if (vignette > 0.01) {
        const angle = (vignette * (Math.PI / 4)).toFixed(3);
        filters.push(`vignette=angle=${angle}`);
    }

    const temp = Math.max(-50, Math.min(50, options.temperature ?? 0));
    if (Math.abs(temp) > 1) {
        if (temp > 0) {
            const rs = (temp / 200).toFixed(3);
            const gs = (temp / 400).toFixed(3);
            const bs = (-temp / 300).toFixed(3);
            filters.push(`colorbalance=rs=${rs}:gs=${gs}:bs=${bs}`);
        } else {
            const abs = Math.abs(temp);
            const bs = (abs / 200).toFixed(3);
            const rs = (-abs / 300).toFixed(3);
            filters.push(`colorbalance=rs=${rs}:bs=${bs}`);
        }
    }

    return filters.join(",");
}

export async function POST(request: Request) {
    try {
        const rateLimited = applyDemoRateLimit(request, "video-tools");
        if (rateLimited) return rateLimited;

        const contentType = request.headers.get("content-type") || "";
        let fileBytes: Uint8Array | null = null;
        let fileName = "input.mp4";
        let options: ColorGradeFilterOptions = {};
        let responseMode = "json";

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = (formData.get("videoFile") || formData.get("file")) as File | null;
            if (!file) {
                return NextResponse.json(
                    { ok: false, errorCode: "MISSING_VIDEO_FILE", error: "Vui lòng chọn video cần xử lý." },
                    { status: 400 },
                );
            }
            fileBytes = new Uint8Array(await file.arrayBuffer());
            fileName = file.name || "input.mp4";

            options = {
                brightness: formData.get("brightness") ? Number(formData.get("brightness")) : 0.0,
                contrast: formData.get("contrast") ? Number(formData.get("contrast")) : 1.0,
                saturation: formData.get("saturation") ? Number(formData.get("saturation")) : 1.0,
                gamma: formData.get("gamma") ? Number(formData.get("gamma")) : 1.0,
                vignette: formData.get("vignette") ? Number(formData.get("vignette")) : 0.0,
                temperature: formData.get("temperature") ? Number(formData.get("temperature")) : 0.0,
                presetName: (formData.get("presetName") as string) || "custom",
            };
            responseMode = (formData.get("responseMode") as string) || "json";
        } else {
            const body = await request.json().catch(() => ({}));
            if (body.videoBase64) {
                fileBytes = Buffer.from(body.videoBase64, "base64");
            } else {
                return NextResponse.json(
                    { ok: false, errorCode: "MISSING_VIDEO_INPUT", error: "Thiếu dữ liệu video." },
                    { status: 400 },
                );
            }
            fileName = body.fileName || "input.mp4";
            options = {
                brightness: typeof body.brightness === "number" ? body.brightness : 0.0,
                contrast: typeof body.contrast === "number" ? body.contrast : 1.0,
                saturation: typeof body.saturation === "number" ? body.saturation : 1.0,
                gamma: typeof body.gamma === "number" ? body.gamma : 1.0,
                vignette: typeof body.vignette === "number" ? body.vignette : 0.0,
                temperature: typeof body.temperature === "number" ? body.temperature : 0.0,
                presetName: body.presetName || "custom",
            };
            responseMode = body.responseMode || "json";
        }

        const runId = randomUUID();
        const runDir = path.join(tmpdir(), `color-grade-${runId}`);
        await mkdir(runDir, { recursive: true });

        const inputPath = path.join(runDir, fileName);
        const outputPath = path.join(runDir, `graded-${path.parse(fileName).name}.mp4`);

        await writeFile(inputPath, fileBytes);

        const filterString = buildColorGradeFfmpegFilter(options);
        const ffmpegBin = resolveFfmpegPath();

        const ffmpegArgs = [
            "-y",
            "-i",
            inputPath,
            "-vf",
            filterString,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "copy",
            outputPath,
        ];

        await new Promise<void>((resolve, reject) => {
            const child = spawn(ffmpegBin, ffmpegArgs, {
                stdio: ["ignore", "pipe", "pipe"],
            });
            let stderr = "";
            child.stderr.on("data", (chunk) => {
                stderr += chunk.toString();
            });
            child.on("close", (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`FFmpeg color grade failed with code ${code}: ${stderr.slice(-300)}`));
                }
            });
            child.on("error", (err) => reject(err));
        });

        const outputBytes = await readFile(outputPath);

        // Clean up temporary files
        rm(runDir, { recursive: true, force: true }).catch(() => {});

        if (responseMode === "binary") {
            return new Response(new Uint8Array(outputBytes), {
                status: 200,
                headers: {
                    "Content-Type": "video/mp4",
                    "Content-Disposition": `attachment; filename="graded-${path.parse(fileName).name}.mp4"`,
                    "Content-Length": String(outputBytes.byteLength),
                },
            });
        }

        const base64 = outputBytes.toString("base64");
        return NextResponse.json({
            ok: true,
            data: {
                videoBase64: base64,
                mimeType: "video/mp4",
                fileName: `graded-${path.parse(fileName).name}.mp4`,
                byteLength: outputBytes.byteLength,
                presetName: options.presetName,
                filters: filterString,
            },
        });
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "COLOR_GRADE_EXECUTION_FAILED",
                error: error instanceof Error ? error.message : "Xử lý màu video thất bại.",
            },
            { status: 500 },
        );
    }
}
