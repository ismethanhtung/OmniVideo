import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextResponse } from "next/server";

import {
    type ChineseTranscriptionResult,
    ChineseTranscriptionError,
    type ChineseTranscriptionRequest,
    type TranscriptTranslationResult,
    type VoiceGenerationSettings,
} from "@/lib/multilingual-audio/types";
import { runChineseVideoTranscription } from "@/lib/multilingual-audio/chinese-transcription";
import {
    generateVoiceFromSegments,
    killActivePiperChildProcesses,
    listActivePiperChildProcesses,
} from "@/lib/multilingual-audio/piper-tts";
import {
    renderVipCompositeVideo,
    runVideoVipRemoteRender,
    runVideoVipVoiceRender,
    type VideoVipRemoteRenderInput,
    type VideoVipVoiceRenderInput,
} from "@/lib/multilingual-audio/video-vip-processing";
import { buildWorkspaceMediaPayload } from "@/lib/workspace/server-artifacts";

export const runtime = "nodejs";
export const maxDuration = 300;

type RemoteVipWorkerJobStatus = "running" | "done" | "failed";
type RemoteVipWorkerJob = {
    id: string;
    status: RemoteVipWorkerJobStatus;
    stage?: "queued" | "transcript" | "voice" | "render" | "artifact" | "done";
    stageStartedAt?: string;
    message?: string;
    metrics?: Record<string, number | string | boolean | undefined>;
    startedAt: string;
    updatedAt: string;
    result?: Record<string, unknown>;
    error?: string;
    errorCode?: string;
};
type RemoteVipWorkerSystemProcess = {
    pid: number;
    elapsed: string;
    cpuPercent: number;
    memoryPercent: number;
    kind: "piper" | "ffmpeg";
    command: string;
};
type RemoteVipWorkerEc2Metadata = {
    instanceId?: string;
    instanceType?: string;
    availabilityZone?: string;
    region?: string;
    privateIp?: string;
    publicIp?: string;
};
type RemoteVipWorkerTopSnapshot = {
    capturedAt: string;
    lines: string[];
};

const REMOTE_VIP_JOB_TTL_MS = 6 * 60 * 60 * 1000;
const REMOTE_VIP_SOURCE_UPLOAD_ROOT = path.join(
    tmpdir(),
    "omnivideo-vip-source-uploads",
);

const remoteVipWorkerJobs: Map<string, RemoteVipWorkerJob> =
    ((globalThis as typeof globalThis & {
        __omnivideoRemoteVipWorkerJobs?: Map<string, RemoteVipWorkerJob>;
    }).__omnivideoRemoteVipWorkerJobs ??= new Map());

const REMOTE_WORKER_CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type",
};

function withCors(response: NextResponse) {
    for (const [key, value] of Object.entries(REMOTE_WORKER_CORS_HEADERS)) {
        response.headers.set(key, value);
    }
    return response;
}

function readBearerToken(request: Request) {
    const header = request.headers.get("authorization") ?? "";
    const match = /^Bearer\s+(.+)$/iu.exec(header);
    return match?.[1]?.trim() ?? "";
}

function requireWorkerToken(request: Request) {
    const expected = process.env.OMNIVIDEO_REMOTE_VIP_TOKEN?.trim();
    if (!expected) return null;
    const received = readBearerToken(request);
    if (received === expected) return null;
    return NextResponse.json(
        {
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: "Remote VIP worker token is invalid.",
        },
        { status: 401 },
    );
}

function parseBase64Bytes(fileBase64: unknown, message: string) {
    if (typeof fileBase64 !== "string" || !fileBase64.trim()) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            message,
            400,
        );
    }
    return Buffer.from(fileBase64, "base64");
}

function parseOptionalBase64Bytes(value: unknown) {
    if (typeof value !== "string" || !value.trim()) return undefined;
    return Buffer.from(value, "base64");
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readWorkerFormString(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value.trim() : "";
}

function readWorkerFormNumber(formData: FormData, key: string) {
    const parsed = Number(readWorkerFormString(formData, key));
    return Number.isFinite(parsed) ? parsed : NaN;
}

function isValidSourceUploadId(value: string) {
    return /^[a-f0-9-]{36}$/iu.test(value);
}

function getSourceUploadDir(uploadId: string) {
    if (!isValidSourceUploadId(uploadId)) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "sourceUploadId is invalid.",
            400,
        );
    }
    return path.join(REMOTE_VIP_SOURCE_UPLOAD_ROOT, uploadId);
}

function getSourceUploadPartPath(uploadId: string, partIndex: number) {
    return path.join(getSourceUploadDir(uploadId), `${partIndex}.part`);
}

function getSourceUploadMetadataPath(uploadId: string) {
    return path.join(getSourceUploadDir(uploadId), "metadata.json");
}

async function handleSourceUploadPart(request: Request) {
    const formData = await request.formData();
    const uploadId = readWorkerFormString(formData, "sourceUploadId");
    const partIndex = readWorkerFormNumber(formData, "partIndex");
    const partCount = readWorkerFormNumber(formData, "partCount");
    const totalBytes = readWorkerFormNumber(formData, "totalBytes");
    const fileName = readWorkerFormString(formData, "fileName") || "source.mp4";
    const mimeType = readWorkerFormString(formData, "mimeType") || "video/mp4";
    const chunkFile = formData.get("chunkFile");
    if (
        !isValidSourceUploadId(uploadId) ||
        !Number.isInteger(partIndex) ||
        !Number.isInteger(partCount) ||
        partIndex < 0 ||
        partCount <= 0 ||
        partIndex >= partCount ||
        !Number.isFinite(totalBytes) ||
        totalBytes <= 0 ||
        !(chunkFile instanceof File)
    ) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "Valid sourceUploadId, part metadata, and chunkFile are required.",
            400,
        );
    }

    const dir = getSourceUploadDir(uploadId);
    await mkdir(dir, { recursive: true });
    const now = new Date().toISOString();
    await writeFile(
        getSourceUploadMetadataPath(uploadId),
        JSON.stringify(
            {
                uploadId,
                fileName,
                mimeType,
                totalBytes,
                partCount,
                updatedAt: now,
            },
            null,
            2,
        ),
    );
    const chunkBytes = Buffer.from(await chunkFile.arrayBuffer());
    await writeFile(getSourceUploadPartPath(uploadId, partIndex), chunkBytes);

    return NextResponse.json({
        ok: true,
        data: {
            uploadId,
            partIndex,
            partCount,
            chunkByteLength: chunkBytes.byteLength,
        },
    });
}

async function readStagedSourceUpload(uploadId: string) {
    const metadataPath = getSourceUploadMetadataPath(uploadId);
    let metadata: {
        fileName?: unknown;
        mimeType?: unknown;
        totalBytes?: unknown;
        partCount?: unknown;
    };
    try {
        metadata = JSON.parse(await readFile(metadataPath, "utf8")) as typeof metadata;
    } catch {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "Staged source upload was not found on the remote worker.",
            404,
        );
    }

    const partCount = Number(metadata.partCount);
    const totalBytes = Number(metadata.totalBytes);
    if (
        !Number.isInteger(partCount) ||
        partCount <= 0 ||
        !Number.isFinite(totalBytes) ||
        totalBytes <= 0
    ) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            "Staged source upload metadata is invalid.",
            400,
        );
    }

    const parts = await Promise.all(
        Array.from({ length: partCount }, async (_, index) => {
            try {
                return await readFile(getSourceUploadPartPath(uploadId, index));
            } catch {
                throw new ChineseTranscriptionError(
                    "VAL_DUBBING_VIDEO_REQUIRED",
                    `Staged source upload is missing chunk ${index + 1}/${partCount}.`,
                    400,
                );
            }
        }),
    );
    const fileBytes = Buffer.concat(parts);
    if (fileBytes.byteLength !== totalBytes) {
        throw new ChineseTranscriptionError(
            "VAL_DUBBING_VIDEO_REQUIRED",
            `Staged source upload size mismatch: expected ${totalBytes} bytes, received ${fileBytes.byteLength} bytes.`,
            400,
        );
    }

    await rm(getSourceUploadDir(uploadId), { recursive: true, force: true }).catch(
        () => undefined,
    );
    return {
        fileBytes: new Uint8Array(fileBytes),
        fileName:
            typeof metadata.fileName === "string" && metadata.fileName.trim()
                ? metadata.fileName
                : "source.mp4",
        mimeType:
            typeof metadata.mimeType === "string" && metadata.mimeType.trim()
                ? metadata.mimeType
                : "video/mp4",
    };
}

async function parseWorkerPayload(request: Request) {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
        const formData = await request.formData();
        const payloadJson = formData.get("payloadJson");
        const file = formData.get("videoFile");
        const voiceFile = formData.get("voiceFile");
        const originalAudioStemFile = formData.get("originalAudioStemFile");
        const asyncRequested =
            formData.get("async") === "1" ||
            formData.get("async") === "true";
        if (typeof payloadJson !== "string" || !payloadJson.trim()) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "payloadJson is required for remote VIP voice/render.",
                400,
            );
        }
        const payload = JSON.parse(payloadJson) as Record<string, unknown>;
        const executionMode = normalizeWorkerExecutionMode(payload.executionMode);
        const stagedSourceUploadId =
            typeof payload.sourceUploadId === "string"
                ? payload.sourceUploadId.trim()
                : "";
        const stagedSource =
            !(file instanceof File) && stagedSourceUploadId
                ? await readStagedSourceUpload(stagedSourceUploadId)
                : null;
        if (!(file instanceof File) && !stagedSource) {
            throw new ChineseTranscriptionError(
                "VAL_DUBBING_VIDEO_REQUIRED",
                "videoFile or sourceUploadId is required for remote VIP voice/render.",
                400,
            );
        }
        if (executionMode === "render-only" && !(voiceFile instanceof File)) {
            throw new ChineseTranscriptionError(
                "VAL_TTS_SEGMENTS_REQUIRED",
                "voiceFile is required for remote VIP render.",
                400,
            );
        }
        return {
            payload,
            fileBytes:
                file instanceof File
                    ? new Uint8Array(await file.arrayBuffer())
                    : stagedSource?.fileBytes ?? new Uint8Array(),
            voiceBytes:
                voiceFile instanceof File
                    ? new Uint8Array(await voiceFile.arrayBuffer())
                    : undefined,
            originalAudioStemBytes:
                originalAudioStemFile instanceof File
                    ? new Uint8Array(await originalAudioStemFile.arrayBuffer())
                    : undefined,
            originalAudioStemFileName:
                originalAudioStemFile instanceof File
                    ? originalAudioStemFile.name || undefined
                    : undefined,
            originalAudioStemMimeType:
                originalAudioStemFile instanceof File
                    ? originalAudioStemFile.type || undefined
                    : undefined,
            fileName:
                file instanceof File
                    ? file.name || undefined
                    : stagedSource?.fileName,
            mimeType:
                file instanceof File
                    ? file.type || undefined
                    : stagedSource?.mimeType,
            asyncRequested,
        };
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const executionMode = normalizeWorkerExecutionMode(payload.executionMode);
    return {
        payload,
        fileBytes: parseBase64Bytes(
            payload.fileBase64,
            "fileBase64 is required for remote VIP voice/render.",
        ),
        voiceBytes:
            executionMode === "render-only"
                ? parseBase64Bytes(
                      payload.voiceBase64,
                      "voiceBase64 is required for remote VIP render.",
                  )
                : undefined,
        originalAudioStemBytes: parseOptionalBase64Bytes(
            payload.originalAudioStemBase64,
        ),
        originalAudioStemFileName:
            typeof payload.originalAudioStemFileName === "string"
                ? payload.originalAudioStemFileName
                : undefined,
        originalAudioStemMimeType:
            typeof payload.originalAudioStemMimeType === "string"
                ? payload.originalAudioStemMimeType
                : undefined,
        fileName: undefined,
        mimeType: undefined,
        asyncRequested: payload.async === true || payload.async === "1",
    };
}

function normalizeWorkerExecutionMode(value: unknown) {
    if (value === "voice-render" || value === "transcribe") return value;
    return "render-only";
}

function readTranslatedSegments(payload: Record<string, unknown>) {
    const translatedSegments = Array.isArray(payload.translatedSegments)
        ? (payload.translatedSegments as TranscriptTranslationResult["translatedSegments"])
        : isRecord(payload.translation) &&
            Array.isArray(payload.translation.translatedSegments)
          ? (payload.translation
                .translatedSegments as TranscriptTranslationResult["translatedSegments"])
          : null;
    if (!translatedSegments) {
        throw new ChineseTranscriptionError(
            "VAL_TRANSLATION_SEGMENTS_REQUIRED",
            "translatedSegments are required for remote VIP render.",
            400,
        );
    }
    return translatedSegments;
}

function readTranscript(payload: Record<string, unknown>) {
    if (!isRecord(payload.transcript)) {
        throw new ChineseTranscriptionError(
            "VAL_TTS_SEGMENTS_REQUIRED",
            "transcript is required for remote VIP voice/render.",
            400,
        );
    }
    return payload.transcript as ChineseTranscriptionResult;
}

function readTranslation(payload: Record<string, unknown>) {
    if (
        isRecord(payload.translation) &&
        Array.isArray(payload.translation.translatedSegments)
    ) {
        return payload.translation as TranscriptTranslationResult;
    }
    const translatedSegments = readTranslatedSegments(payload);
    return {
        sourceLanguage:
            typeof payload.sourceLanguage === "string"
                ? payload.sourceLanguage
                : "zh",
        targetLanguage:
            typeof payload.targetLanguage === "string"
                ? payload.targetLanguage
                : "vi",
        model:
            typeof payload.model === "string"
                ? payload.model
                : "remote-worker",
        translatedSegments,
        generationDurationMs: 0,
        chunks: [],
        provider: { name: "remote-worker" },
    } satisfies TranscriptTranslationResult;
}

function readTranscriptionInput(input: {
    payload: Record<string, unknown>;
    fileBytes: Uint8Array;
    fileName?: string;
    mimeType?: string;
}): ChineseTranscriptionRequest {
    const { payload, fileBytes, fileName, mimeType } = input;
    return {
        fileName:
            typeof payload.fileName === "string" && payload.fileName.trim()
                ? payload.fileName
                : fileName ?? "source.mp4",
        mimeType:
            typeof payload.mimeType === "string" ? payload.mimeType : mimeType,
        fileSizeBytes:
            typeof payload.fileSizeBytes === "number"
                ? payload.fileSizeBytes
                : fileBytes.byteLength,
        fileBytes,
        language: typeof payload.language === "string" ? payload.language : "zh",
        prompt: typeof payload.prompt === "string" ? payload.prompt : undefined,
        transcriptionModel:
            typeof payload.transcriptionModel === "string"
                ? payload.transcriptionModel
                : undefined,
        transcriptionApiKey:
            typeof payload.transcriptionApiKey === "string"
                ? payload.transcriptionApiKey
                : undefined,
        transcriptionBaseUrl:
            typeof payload.transcriptionBaseUrl === "string"
                ? payload.transcriptionBaseUrl
                : undefined,
        transcriptionProviderName:
            typeof payload.transcriptionProviderName === "string"
                ? payload.transcriptionProviderName
                : undefined,
        includeWordTimestamps:
            typeof payload.includeWordTimestamps === "boolean"
                ? payload.includeWordTimestamps
                : true,
        overlongSegmentRetryMode:
            payload.overlongSegmentRetryMode === "best-effort"
                ? "best-effort"
                : "strict",
        retryPromptHardConstraint:
            typeof payload.retryPromptHardConstraint === "boolean"
                ? payload.retryPromptHardConstraint
                : undefined,
        videoSpeedFactor:
            typeof payload.videoSpeedFactor === "number"
                ? payload.videoSpeedFactor
                : undefined,
    };
}

function summarizeWorkerResult(result: Record<string, unknown> | undefined) {
    if (!result) return undefined;
    return {
        mimeType: result.mimeType,
        extension: result.extension,
        fileName: result.fileName,
        byteLength: result.byteLength,
        generationDurationMs: result.generationDurationMs,
        artifactId: result.artifactId,
    };
}

function serializeWorkerJob(
    job: RemoteVipWorkerJob,
    options: { includeResult?: boolean } = {},
) {
    const includeResult = options.includeResult ?? true;
    return {
        jobId: job.id,
        status: job.status,
        stage: job.stage,
        stageStartedAt: job.stageStartedAt,
        message: job.message,
        metrics: job.metrics,
        startedAt: job.startedAt,
        updatedAt: job.updatedAt,
        result: includeResult ? job.result : undefined,
        resultSummary: includeResult ? undefined : summarizeWorkerResult(job.result),
        error: job.error,
        errorCode: job.errorCode,
    };
}

function listSystemWorkerProcesses(): RemoteVipWorkerSystemProcess[] {
    let output = "";
    try {
        output = execFileSync("ps", [
            "-eo",
            "pid=,etime=,pcpu=,pmem=,args=",
        ]).toString("utf8");
    } catch {
        return [];
    }

    return output
        .split(/\r?\n/u)
        .map((line) => {
            const match =
                /^\s*(\d+)\s+(\S+)\s+([\d.]+)\s+([\d.]+)\s+(.+)$/u.exec(
                    line,
                );
            if (!match) return null;
            const command = match[5];
            const isFfmpeg =
                command.includes("ffmpeg") &&
                (command.includes("omnivideo-piper-voice") ||
                    command.includes("omnivideo-vip-") ||
                    command.includes("ffmpeg-static"));
            const isPiper =
                command.includes("piper") &&
                command.includes("omnivideo-piper");
            if (!isFfmpeg && !isPiper) return null;
            return {
                pid: Number(match[1]),
                elapsed: match[2],
                cpuPercent: Number(match[3]),
                memoryPercent: Number(match[4]),
                kind: isFfmpeg ? "ffmpeg" : "piper",
                command,
            } satisfies RemoteVipWorkerSystemProcess;
        })
        .filter(
            (
                process,
            ): process is RemoteVipWorkerSystemProcess => process !== null,
        );
}

function killSystemWorkerProcesses(input: {
    excludePids?: Array<number | undefined>;
}) {
    const excludePids = new Set(input.excludePids?.filter(Boolean));
    const killed: RemoteVipWorkerSystemProcess[] = [];
    for (const systemProcess of listSystemWorkerProcesses()) {
        if (excludePids.has(systemProcess.pid)) continue;
        try {
            process.kill(systemProcess.pid, "SIGTERM");
            killed.push(systemProcess);
        } catch {
            // Process may have exited between ps scan and kill.
        }
    }
    return killed;
}

async function fetchEc2MetadataText(path: string, token: string | null) {
    try {
        const response = await fetch(
            `http://169.254.169.254/latest/${path.replace(/^\/+/u, "")}`,
            {
                headers: token ? { "X-aws-ec2-metadata-token": token } : {},
                signal: AbortSignal.timeout(700),
            },
        );
        if (!response.ok) return "";
        return (await response.text()).trim();
    } catch {
        return "";
    }
}

async function readEc2Metadata(): Promise<RemoteVipWorkerEc2Metadata | null> {
    let token: string | null = null;
    try {
        const tokenResponse = await fetch(
            "http://169.254.169.254/latest/api/token",
            {
                method: "PUT",
                headers: { "X-aws-ec2-metadata-token-ttl-seconds": "60" },
                signal: AbortSignal.timeout(700),
            },
        );
        if (tokenResponse.ok) {
            token = (await tokenResponse.text()).trim();
        }
    } catch {
        token = null;
    }

    const [instanceId, instanceType, documentJson, publicIp, privateIp] =
        await Promise.all([
            fetchEc2MetadataText("meta-data/instance-id", token),
            fetchEc2MetadataText("meta-data/instance-type", token),
            fetchEc2MetadataText("dynamic/instance-identity/document", token),
            fetchEc2MetadataText("meta-data/public-ipv4", token),
            fetchEc2MetadataText("meta-data/local-ipv4", token),
        ]);

    let region = "";
    let availabilityZone = "";
    try {
        const document = JSON.parse(documentJson) as {
            region?: unknown;
            availabilityZone?: unknown;
        };
        region = typeof document.region === "string" ? document.region : "";
        availabilityZone =
            typeof document.availabilityZone === "string"
                ? document.availabilityZone
                : "";
    } catch {
        // Optional EC2 metadata is omitted when unavailable.
    }

    const metadata = {
        instanceId,
        instanceType,
        availabilityZone,
        region,
        privateIp,
        publicIp,
    };
    return Object.values(metadata).some(Boolean) ? metadata : null;
}

function readTopSnapshot(): RemoteVipWorkerTopSnapshot | null {
    try {
        const output = execFileSync("top", ["-b", "-n", "1", "-w", "160"], {
            timeout: 2500,
        }).toString("utf8");
        const lines = output
            .split(/\r?\n/u)
            .map((line) => line.trimEnd())
            .filter(Boolean)
            .slice(0, 35);
        if (lines.length === 0) return null;
        return { capturedAt: new Date().toISOString(), lines };
    } catch {
        return null;
    }
}

function cancelWorkerJobs(input: { jobId?: string }) {
    const now = new Date().toISOString();
    const cancelledJobs: string[] = [];
    for (const [jobId, job] of remoteVipWorkerJobs.entries()) {
        if (input.jobId && jobId !== input.jobId) continue;
        if (job.status === "done" || job.status === "failed") continue;
        remoteVipWorkerJobs.set(jobId, {
            ...job,
            status: "failed",
            updatedAt: now,
            message: "Remote VIP worker job was cancelled.",
            error: "Remote VIP worker job was cancelled.",
            errorCode: "SYS_DUBBING_MUX_FAILED",
        });
        cancelledJobs.push(jobId);
    }
    const killedProcesses = killActivePiperChildProcesses();
    const killedSystemProcesses = killSystemWorkerProcesses({
        excludePids: killedProcesses.map((process) => process.pid),
    });
    return { cancelledJobs, killedProcesses, killedSystemProcesses };
}

export async function GET(request: Request) {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    if (jobId) {
        const denied = requireWorkerToken(request);
        if (denied) return denied;

        const job = remoteVipWorkerJobs.get(jobId);
        if (!job) {
            return withCors(NextResponse.json(
                {
                    ok: false,
                    errorCode: "SYS_DUBBING_MUX_FAILED",
                    error: "Remote VIP worker job was not found.",
                },
                { status: 404 },
            ));
        }
        return withCors(NextResponse.json({
            ok: true,
            data: serializeWorkerJob(job),
        }));
    }

    const [ec2, top] = await Promise.all([
        readEc2Metadata(),
        Promise.resolve(readTopSnapshot()),
    ]);

    return withCors(NextResponse.json({
        ok: true,
        service: "omnivideo-vip-voice-render",
        capabilities: {
            sourceChunkUpload: true,
            sourceUploadReference: true,
            originalAudioStemUpload: true,
        },
        data: {
            jobs: Array.from(remoteVipWorkerJobs.values()).map((job) =>
                serializeWorkerJob(job, { includeResult: false }),
            ),
            activeProcesses: listActivePiperChildProcesses(),
            systemProcesses: listSystemWorkerProcesses(),
            ec2,
            top,
        },
    }));
}

export function DELETE(request: Request) {
    const denied = requireWorkerToken(request);
    if (denied) return withCors(denied);

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId")?.trim() || undefined;
    const result = cancelWorkerJobs({ jobId });
    return withCors(NextResponse.json({
        ok: true,
        data: result,
    }));
}

export function OPTIONS() {
    return withCors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: Request) {
    const denied = requireWorkerToken(request);
    if (denied) return withCors(denied);

    try {
        const url = new URL(request.url);
        if (url.searchParams.get("sourceUpload") === "part") {
            return withCors(await handleSourceUploadPart(request));
        }
        const {
            payload,
            fileBytes,
            voiceBytes,
            originalAudioStemBytes,
            originalAudioStemFileName,
            originalAudioStemMimeType,
            fileName,
            mimeType,
            asyncRequested,
        } = await parseWorkerPayload(request);
        const workerInput = {
            payload,
            fileBytes,
            voiceBytes,
            originalAudioStemBytes,
            originalAudioStemFileName,
            originalAudioStemMimeType,
            fileName,
            mimeType,
        };

        if (asyncRequested) {
            const now = new Date().toISOString();
            const jobId = randomUUID();
            const job: RemoteVipWorkerJob = {
                id: jobId,
                status: "running",
                stage: "queued",
                stageStartedAt: now,
                message: "Remote VIP worker job queued.",
                startedAt: now,
                updatedAt: now,
            };
            remoteVipWorkerJobs.set(jobId, job);
            const updateJob = (patch: Partial<RemoteVipWorkerJob>) => {
                const current = remoteVipWorkerJobs.get(jobId) ?? job;
                remoteVipWorkerJobs.set(jobId, {
                    ...current,
                    ...patch,
                    id: jobId,
                    updatedAt: new Date().toISOString(),
                });
            };
            void executeWorkerJob(workerInput, updateJob)
                .then((result) => {
                    const current = remoteVipWorkerJobs.get(jobId) ?? job;
                    remoteVipWorkerJobs.set(jobId, {
                        ...current,
                        status: "done",
                        stage: "done",
                        message: "Remote VIP worker job completed.",
                        updatedAt: new Date().toISOString(),
                        result,
                    });
                })
                .catch((error) => {
                    const current = remoteVipWorkerJobs.get(jobId) ?? job;
                    remoteVipWorkerJobs.set(jobId, {
                        ...current,
                        status: "failed",
                        updatedAt: new Date().toISOString(),
                        error:
                            error instanceof Error
                                ? error.message
                                : "Remote VIP worker job failed.",
                        errorCode:
                            error instanceof ChineseTranscriptionError
                                ? error.code
                                : "SYS_DUBBING_MUX_FAILED",
                    });
                })
                .finally(() => {
                    setTimeout(() => {
                        remoteVipWorkerJobs.delete(jobId);
                    }, REMOTE_VIP_JOB_TTL_MS);
                });

            return withCors(NextResponse.json(
                {
                    ok: true,
                    data: {
                        jobId,
                        status: "running",
                        stage: "queued",
                        message: "Remote VIP worker job queued.",
                        startedAt: now,
                        updatedAt: now,
                    },
                },
                { status: 202 },
            ));
        }

        const data = await executeWorkerJob(workerInput);
        return withCors(NextResponse.json({ ok: true, data }));
    } catch (error) {
        if (error instanceof ChineseTranscriptionError) {
            return withCors(NextResponse.json(
                {
                    ok: false,
                    errorCode: error.code,
                    error: error.message,
                    steps: error.steps,
                },
                { status: error.status },
            ));
        }

        return withCors(NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_DUBBING_MUX_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Remote VIP voice/render API failed.",
            },
            { status: 500 },
        ));
    }
}

async function executeWorkerJob(input: {
    payload: Record<string, unknown>;
    fileBytes: Uint8Array;
    voiceBytes?: Uint8Array;
    originalAudioStemBytes?: Uint8Array;
    originalAudioStemFileName?: string;
    originalAudioStemMimeType?: string;
    fileName?: string;
    mimeType?: string;
}, updateJob?: (patch: Partial<RemoteVipWorkerJob>) => void) {
    const {
        payload,
        fileBytes,
        voiceBytes,
        originalAudioStemBytes,
        originalAudioStemFileName,
        originalAudioStemMimeType,
        fileName,
        mimeType,
    } = input;
    const executionMode = normalizeWorkerExecutionMode(payload.executionMode);
    const originalAudioStem = originalAudioStemBytes?.byteLength
        ? {
              bytes: Buffer.from(originalAudioStemBytes),
              mimeType: originalAudioStemMimeType || "audio/wav",
              fileName: originalAudioStemFileName || "original-vocals.wav",
              byteLength: originalAudioStemBytes.byteLength,
              provider: "replicate" as const,
              model:
                  typeof payload.originalAudioStemModel === "string"
                      ? payload.originalAudioStemModel
                      : "remote-upload",
          }
        : undefined;

    const baseInput = {
        fileName:
            typeof payload.fileName === "string" && payload.fileName.trim()
                ? payload.fileName
                : fileName ?? "source.mp4",
        sourceTitle:
            typeof payload.sourceTitle === "string"
                ? payload.sourceTitle
                : undefined,
        mimeType:
            typeof payload.mimeType === "string" ? payload.mimeType : mimeType,
        fileSizeBytes:
            typeof payload.fileSizeBytes === "number"
                ? payload.fileSizeBytes
                : fileBytes.byteLength,
        fileBytes,
        originalAudioVolume:
            typeof payload.originalAudioVolume === "number"
                ? payload.originalAudioVolume
                : undefined,
        originalAudioSourceMode:
            payload.originalAudioSourceMode === "vocals" ? "vocals" : "source",
        originalAudioStem,
        voiceVolume:
            typeof payload.voiceVolume === "number"
                ? payload.voiceVolume
                : undefined,
        videoSpeedFactor:
            typeof payload.videoSpeedFactor === "number"
                ? payload.videoSpeedFactor
                : undefined,
        renderPreset:
            payload.renderPreset === "veryfast" ||
            payload.renderPreset === "superfast"
                ? payload.renderPreset
                : undefined,
        mirrorEnabled:
            typeof payload.mirrorEnabled === "boolean"
                ? payload.mirrorEnabled
                : undefined,
        blur: isRecord(payload.blur)
            ? (payload.blur as VideoVipRemoteRenderInput["blur"])
            : undefined,
        coverBoxes: isRecord(payload.coverBoxes)
            ? (payload.coverBoxes as VideoVipRemoteRenderInput["coverBoxes"])
            : undefined,
        subtitleStyle: isRecord(payload.subtitleStyle)
            ? (payload.subtitleStyle as VideoVipRemoteRenderInput["subtitleStyle"])
            : undefined,
        textOverlays: isRecord(payload.textOverlays)
            ? (payload.textOverlays as VideoVipRemoteRenderInput["textOverlays"])
            : undefined,
        backgroundMusic: isRecord(payload.backgroundMusic)
            ? (payload.backgroundMusic as VideoVipRemoteRenderInput["backgroundMusic"])
            : undefined,
        omitVideoBase64: true,
    };

    const markStage = (input: {
        stage: NonNullable<RemoteVipWorkerJob["stage"]>;
        message: string;
        metrics?: RemoteVipWorkerJob["metrics"];
    }) => {
        updateJob?.({
            stage: input.stage,
            stageStartedAt: new Date().toISOString(),
            message: input.message,
            metrics: input.metrics,
        });
    };

    if (executionMode === "transcribe") {
        markStage({
            stage: "transcript",
            message: "Transcribing source speech on EC2.",
            metrics: {
                sourceFileSizeBytes: fileBytes.byteLength,
                language:
                    typeof payload.language === "string" ? payload.language : "zh",
            },
        });
        const transcript = await runChineseVideoTranscription(
            readTranscriptionInput({
                payload,
                fileBytes,
                fileName,
                mimeType,
            }),
        );
        updateJob?.({
            message: "EC2 transcription completed.",
            metrics: {
                segmentCount: transcript.segments.length,
                wordCount: transcript.words.length,
                audioFileSizeBytes: transcript.audio.fileSizeBytes,
            },
        });
        return transcript;
    }

    const stageRunners = {
        generateVoice: async (
            voiceInput: Parameters<typeof generateVoiceFromSegments>[0],
        ) => {
            markStage({
                stage: "voice",
                message: "Generating Piper voice on EC2.",
                metrics: {
                    segmentCount: voiceInput.segments.length,
                    sourceFileSizeBytes: fileBytes.byteLength,
                },
            });
            const result = await generateVoiceFromSegments(voiceInput);
            updateJob?.({
                message: "Piper voice generation completed on EC2.",
                metrics: {
                    segmentCount: result.segmentCount,
                    voiceByteLength: result.byteLength,
                },
            });
            return result;
        },
        render: async (
            renderInput: Parameters<typeof renderVipCompositeVideo>[0],
        ) => {
            markStage({
                stage: "render",
                message: "Rendering final VIP video on EC2.",
                metrics: {
                    sourceFileSizeBytes: renderInput.sourceVideoBytes.byteLength,
                    voiceByteLength: renderInput.voiceBytes.byteLength,
                    translatedCount: renderInput.translatedSegments.length,
                    speedFactor: renderInput.speedFactor,
                    originalAudioStemByteLength:
                        renderInput.originalAudioStem?.byteLength,
                    backgroundMusicTrackCount:
                        renderInput.backgroundMusic?.tracks.length ?? 0,
                },
            });
            const result = await renderVipCompositeVideo(renderInput);
            updateJob?.({
                message: "Final VIP render completed on EC2.",
                metrics: {
                    outputByteLength: result.byteLength,
                },
            });
            return result;
        },
    };

    const result =
        executionMode === "voice-render"
            ? await runVideoVipVoiceRender({
                  ...(baseInput as Omit<
                      VideoVipVoiceRenderInput,
                      "transcript" | "translation"
                  >),
                  transcript: readTranscript(payload),
                  translation: readTranslation(payload),
                  ttsSettings: isRecord(payload.ttsSettings)
                      ? (payload.ttsSettings as Partial<VoiceGenerationSettings>)
                      : undefined,
                  stageRunners,
              })
            : await runVideoVipRemoteRender({
                  ...(baseInput as Omit<
                      VideoVipRemoteRenderInput,
                      "voiceAudioBase64" | "translatedSegments"
                  >),
                  voiceAudioBase64: Buffer.from(voiceBytes ?? []).toString(
                      "base64",
                  ),
                  translatedSegments: readTranslatedSegments(payload),
                  stageRunners: {
                      render: stageRunners.render,
                  },
              });
    const videoBytes = result.videoBytes ?? Buffer.from(
        result.videoBase64 ?? "",
        "base64",
    );
    markStage({
        stage: "artifact",
        message: "Storing remote VIP rendered artifact.",
        metrics: {
            outputByteLength: videoBytes.byteLength,
        },
    });
    const mediaPayload = buildWorkspaceMediaPayload({
        bytes: videoBytes,
        fileName: result.fileName,
        mimeType: result.mimeType,
        kind: "video",
        base64Field: "videoBase64",
        inlineLimitBytes: 0,
    });

    return {
        ...result,
        ...mediaPayload,
        videoBytes: undefined,
        videoBase64:
            "videoBase64" in mediaPayload ? mediaPayload.videoBase64 : undefined,
    };
}
