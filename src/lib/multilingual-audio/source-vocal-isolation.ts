import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { resolveFfmpegPath } from "@/lib/multilingual-audio/audio-extraction";
import { ChineseTranscriptionError } from "@/lib/multilingual-audio/types";

export type VipOriginalAudioSourceMode = "source" | "vocals";

export type VipOriginalAudioStem = {
    bytes: Buffer;
    mimeType: string;
    fileName: string;
    byteLength: number;
    provider: "replicate";
    model: string;
    outputUrl?: string;
};

export const DEFAULT_VIP_SOURCE_VOCAL_ISOLATION_MODEL =
    "soykertje/spleeter:cd128044253523c86abfd743dea680c88559ad975ccd72378c8433f067ab5d0a";

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const DEFAULT_REPLICATE_WAIT_SECONDS = 60;
const DEFAULT_REPLICATE_POLL_INTERVAL_MS = 2000;
const DEFAULT_REPLICATE_MAX_POLLS = 240;
const DEFAULT_VOCAL_ISOLATION_FFMPEG_TIMEOUT_MS = 30 * 60 * 1000;

type ReplicatePredictionPayload = {
    id?: string;
    status?: string;
    output?: unknown;
    logs?: string;
    error?: unknown;
    urls?: {
        get?: string;
    };
};

export function normalizeVipOriginalAudioSourceMode(
    value: unknown,
): VipOriginalAudioSourceMode {
    return value === "vocals" ? "vocals" : "source";
}

export async function isolateSourceVocalsWithReplicate(input: {
    sourceVideoBytes: Uint8Array;
    sourceFileName: string;
    sourceMimeType?: string;
    replicateToken?: string;
    model?: string;
    fetchImpl?: typeof fetch;
    pollIntervalMs?: number;
    maxPolls?: number;
}): Promise<VipOriginalAudioStem> {
    const workDir = path.join(tmpdir(), `omnivideo-vip-vocals-${randomUUID()}`);
    const sourcePath = path.join(workDir, safeFileName(input.sourceFileName));
    const audioPath = path.join(workDir, "source-audio.mp3");

    try {
        await mkdir(workDir, { recursive: true });
        await writeFile(sourcePath, input.sourceVideoBytes);
        await extractSourceAudioForSpleeter({
            sourcePath,
            outputPath: audioPath,
        });
        const audioBytes = await readFile(audioPath);
        return await runReplicateSpleeterVocalsIsolation({
            audioBytes,
            audioMimeType: "audio/mpeg",
            audioFileName: "source-audio.mp3",
            replicateToken: input.replicateToken,
            model: input.model,
            fetchImpl: input.fetchImpl,
            pollIntervalMs: input.pollIntervalMs,
            maxPolls: input.maxPolls,
        });
    } finally {
        await rm(workDir, { recursive: true, force: true });
    }
}

export async function runReplicateSpleeterVocalsIsolation(input: {
    audioBytes: Uint8Array;
    audioMimeType?: string;
    audioFileName?: string;
    replicateToken?: string;
    model?: string;
    fetchImpl?: typeof fetch;
    pollIntervalMs?: number;
    maxPolls?: number;
}): Promise<VipOriginalAudioStem> {
    const token =
        input.replicateToken?.trim() ||
        process.env.REPLICATE_API_TOKEN?.trim() ||
        "";
    if (!token) {
        throw new ChineseTranscriptionError(
            "CFG_REPLICATE_TOKEN_MISSING",
            "REPLICATE_API_TOKEN is required when VIP original audio source is set to vocals only.",
            400,
        );
    }

    const fetchImpl = input.fetchImpl ?? fetch;
    const model = input.model ?? DEFAULT_VIP_SOURCE_VOCAL_ISOLATION_MODEL;
    const version = parseReplicateVersion(model);
    const inputKey =
        process.env.OMNIVIDEO_SPLEETER_INPUT_KEY?.trim() || "audio";
    const prediction = await createSpleeterPrediction({
        fetchImpl,
        token,
        version,
        inputKey,
        audioDataUrl: buildDataUrl({
            bytes: input.audioBytes,
            mimeType: input.audioMimeType ?? "audio/mpeg",
        }),
    });
    const completed = await waitForSpleeterPrediction({
        fetchImpl,
        token,
        prediction,
        pollIntervalMs: input.pollIntervalMs,
        maxPolls: input.maxPolls,
    });
    const vocalsUrl = selectReplicateVocalsUrl(completed.output);
    if (!vocalsUrl) {
        throw new ChineseTranscriptionError(
            "PRV_REPLICATE_SPLEETER_OUTPUT_INVALID",
            "Replicate Spleeter output did not include a vocals stem URL.",
            502,
        );
    }

    const vocalsResponse = await fetchImpl(vocalsUrl);
    if (!vocalsResponse.ok) {
        throw new ChineseTranscriptionError(
            "PRV_REPLICATE_SPLEETER_DOWNLOAD_FAILED",
            `Failed to download Replicate vocals stem: HTTP ${vocalsResponse.status}.`,
            vocalsResponse.status >= 400 ? vocalsResponse.status : 502,
        );
    }
    const bytes = Buffer.from(await vocalsResponse.arrayBuffer());
    const mimeType =
        vocalsResponse.headers.get("content-type")?.split(";")[0]?.trim() ||
        "audio/wav";
    return {
        bytes,
        mimeType,
        fileName: inferStemFileName({
            outputUrl: vocalsUrl,
            mimeType,
            fallback: input.audioFileName ?? "source-audio.mp3",
        }),
        byteLength: bytes.byteLength,
        provider: "replicate",
        model,
        outputUrl: vocalsUrl,
    };
}

export function selectReplicateVocalsUrl(output: unknown): string | null {
    const candidates = collectOutputUrls(output);
    if (candidates.length === 0) return null;

    const preferred = candidates
        .map((candidate) => ({
            ...candidate,
            score: scoreVocalsCandidate(candidate.path, candidate.url),
        }))
        .sort((a, b) => b.score - a.score);
    const positive = preferred.find((candidate) => candidate.score > 0);
    if (positive) return positive.url;

    if (preferred.length > 1) return null;
    const neutral = preferred.find(
        (candidate) => !/accompaniment|instrumental|music|background/iu.test(
            `${candidate.path} ${candidate.url}`,
        ),
    );
    return neutral?.url ?? null;
}

async function extractSourceAudioForSpleeter(input: {
    sourcePath: string;
    outputPath: string;
}) {
    await runFfmpegForVocalIsolation([
        "-y",
        "-i",
        input.sourcePath,
        "-vn",
        "-map",
        "0:a:0",
        "-ac",
        "2",
        "-ar",
        "44100",
        "-c:a",
        "libmp3lame",
        "-b:a",
        "128k",
        input.outputPath,
    ]);
}

async function createSpleeterPrediction(input: {
    fetchImpl: typeof fetch;
    token: string;
    version: string;
    inputKey: string;
    audioDataUrl: string;
}) {
    const response = await input.fetchImpl(`${REPLICATE_API_BASE}/predictions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${input.token}`,
            "Content-Type": "application/json",
            Prefer: `wait=${DEFAULT_REPLICATE_WAIT_SECONDS}`,
            "Cancel-After": "30m",
        },
        body: JSON.stringify({
            version: input.version,
            input: {
                [input.inputKey]: input.audioDataUrl,
            },
        }),
    });
    return await parseReplicatePredictionResponse(response);
}

async function waitForSpleeterPrediction(input: {
    fetchImpl: typeof fetch;
    token: string;
    prediction: ReplicatePredictionPayload;
    pollIntervalMs?: number;
    maxPolls?: number;
}) {
    let prediction = input.prediction;
    const pollIntervalMs = Math.max(
        0,
        Math.floor(input.pollIntervalMs ?? DEFAULT_REPLICATE_POLL_INTERVAL_MS),
    );
    const maxPolls = Math.max(
        1,
        Math.floor(input.maxPolls ?? DEFAULT_REPLICATE_MAX_POLLS),
    );

    for (let attempt = 0; attempt <= maxPolls; attempt += 1) {
        if (prediction.status === "succeeded") return prediction;
        if (
            prediction.status === "failed" ||
            prediction.status === "canceled"
        ) {
            throw new ChineseTranscriptionError(
                "PRV_REPLICATE_SPLEETER_FAILED",
                getReplicateFailureMessage(prediction),
                502,
            );
        }
        const getUrl = prediction.urls?.get;
        if (!getUrl) {
            throw new ChineseTranscriptionError(
                "PRV_REPLICATE_SPLEETER_POLL_INVALID",
                "Replicate Spleeter prediction did not include a polling URL.",
                502,
            );
        }
        if (attempt === maxPolls) break;
        if (pollIntervalMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        }
        const response = await input.fetchImpl(getUrl, {
            headers: {
                Authorization: `Bearer ${input.token}`,
            },
        });
        prediction = await parseReplicatePredictionResponse(response);
    }

    throw new ChineseTranscriptionError(
        "PRV_REPLICATE_SPLEETER_TIMEOUT",
        "Replicate Spleeter vocals isolation timed out.",
        504,
    );
}

async function parseReplicatePredictionResponse(response: Response) {
    const payload = (await response.json().catch(() => ({}))) as
        | ReplicatePredictionPayload
        | { detail?: string; error?: unknown };
    if (!response.ok) {
        throw new ChineseTranscriptionError(
            "PRV_REPLICATE_SPLEETER_REQUEST_FAILED",
            getReplicateApiErrorMessage(payload),
            response.status >= 400 ? response.status : 502,
        );
    }
    return payload as ReplicatePredictionPayload;
}

function parseReplicateVersion(model: string) {
    const trimmed = model.trim();
    const version = trimmed.includes(":") ? trimmed.split(":").at(-1) : trimmed;
    if (!version || !/^[a-f0-9]{64}$/iu.test(version)) {
        throw new ChineseTranscriptionError(
            "VAL_REPLICATE_SPLEETER_MODEL_INVALID",
            "VIP vocals isolation model must include a 64-character Replicate version id.",
            400,
        );
    }
    return version;
}

function buildDataUrl(input: { bytes: Uint8Array; mimeType: string }) {
    return `data:${input.mimeType};base64,${Buffer.from(input.bytes).toString(
        "base64",
    )}`;
}

function collectOutputUrls(
    value: unknown,
    pathParts: string[] = [],
): Array<{ url: string; path: string }> {
    if (typeof value === "string") {
        return isHttpUrl(value)
            ? [{ url: value, path: pathParts.join(".") }]
            : [];
    }
    if (Array.isArray(value)) {
        return value.flatMap((item, index) =>
            collectOutputUrls(item, [...pathParts, String(index)]),
        );
    }
    if (!value || typeof value !== "object") return [];
    return Object.entries(value as Record<string, unknown>).flatMap(
        ([key, item]) => collectOutputUrls(item, [...pathParts, key]),
    );
}

function scoreVocalsCandidate(pathValue: string, url: string) {
    const haystack = `${pathValue} ${url}`.toLowerCase();
    let score = 0;
    if (/\bvocals?\b|vocals|vocal/u.test(haystack)) score += 100;
    if (/\bvoice\b|singing|speech/u.test(haystack)) score += 25;
    if (/accompaniment|instrumental|music|background/u.test(haystack)) {
        score -= 100;
    }
    return score;
}

function isHttpUrl(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

function inferStemFileName(input: {
    outputUrl: string;
    mimeType: string;
    fallback: string;
}) {
    try {
        const url = new URL(input.outputUrl);
        const urlName = path.basename(url.pathname);
        if (urlName && /\.[a-z0-9]+$/iu.test(urlName)) return urlName;
    } catch {
        // Fall through to a deterministic local file name.
    }
    const extension =
        input.mimeType.includes("mpeg") || input.mimeType.includes("mp3")
            ? "mp3"
            : input.mimeType.includes("ogg")
              ? "ogg"
              : "wav";
    return `${input.fallback.replace(/\.[^.]+$/u, "")}-vocals.${extension}`;
}

function safeFileName(value: string) {
    const extension = value.split(".").pop()?.toLowerCase() || "mp4";
    const safeExtension = /^[a-z0-9]+$/u.test(extension) ? extension : "mp4";
    return `source.${safeExtension}`;
}

function getReplicateApiErrorMessage(payload: unknown) {
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        if (typeof record.detail === "string") return record.detail;
        if (typeof record.error === "string") return record.error;
        if (record.error) return JSON.stringify(record.error);
    }
    return "Replicate Spleeter request failed.";
}

function getReplicateFailureMessage(payload: ReplicatePredictionPayload) {
    if (typeof payload.error === "string" && payload.error.trim()) {
        return `Replicate Spleeter failed: ${payload.error}`;
    }
    if (payload.error) {
        return `Replicate Spleeter failed: ${JSON.stringify(payload.error)}`;
    }
    if (payload.logs?.trim()) {
        return `Replicate Spleeter failed. Logs: ${payload.logs
            .split(/\r?\n/u)
            .slice(-6)
            .join("\n")}`;
    }
    return "Replicate Spleeter vocals isolation failed.";
}

function runFfmpegForVocalIsolation(args: string[]) {
    return new Promise<void>((resolve, reject) => {
        let ffmpegPath: string;
        try {
            ffmpegPath = resolveFfmpegPath();
        } catch (error) {
            reject(error);
            return;
        }

        const child = spawn(ffmpegPath, args, {
            stdio: ["ignore", "ignore", "pipe"],
        });
        let stderr = "";
        const timeoutMs = resolveVocalIsolationFfmpegTimeoutMs();
        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(
                new ChineseTranscriptionError(
                    "SYS_SOURCE_VOCAL_ISOLATION_FAILED",
                    "ffmpeg timed out while extracting source audio for VIP vocals isolation.",
                    500,
                ),
            );
        }, timeoutMs);
        child.stderr.on("data", (chunk: Buffer) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", (error) => {
            clearTimeout(timer);
            reject(error);
        });
        child.on("close", (code) => {
            clearTimeout(timer);
            if (code === 0) {
                resolve();
                return;
            }
            reject(
                new ChineseTranscriptionError(
                    "SYS_SOURCE_VOCAL_ISOLATION_FAILED",
                    `ffmpeg failed to extract source audio for VIP vocals isolation: ${formatStderrTail(stderr)}`,
                    500,
                ),
            );
        });
    });
}

function resolveVocalIsolationFfmpegTimeoutMs() {
    const configured = Number(
        process.env.OMNIVIDEO_VOCAL_ISOLATION_FFMPEG_TIMEOUT_MS,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
        return DEFAULT_VOCAL_ISOLATION_FFMPEG_TIMEOUT_MS;
    }
    return Math.max(1000, Math.floor(configured));
}

function formatStderrTail(stderr: string) {
    const tail = stderr
        .split(/\r?\n/u)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(-6)
        .join("\n");
    return tail || "unknown ffmpeg error";
}
