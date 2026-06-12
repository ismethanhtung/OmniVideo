import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_REMOTE_WORKER_PROXY_TIMEOUT_MS = 8000;
const MAX_REMOTE_WORKER_PROXY_TIMEOUT_MS = 25000;
const MIN_REMOTE_WORKER_PROXY_TIMEOUT_MS = 1000;

function normalizeEndpoint(endpoint: string) {
    return endpoint.replace(/\/+$/u, "");
}

function resolveEndpoint(request: Request) {
    const url = new URL(request.url);
    return (
        url.searchParams.get("endpoint")?.trim() ||
        process.env.OMNIVIDEO_REMOTE_VIP_WORKER_URL?.trim() ||
        ""
    );
}

function resolveToken() {
    return process.env.OMNIVIDEO_REMOTE_VIP_TOKEN?.trim() || "";
}

function resolveCallerToken(request: Request) {
    return (
        request.headers.get("x-omnivideo-remote-vip-token")?.trim() ||
        resolveToken()
    );
}

function resolveProxyTimeoutMs() {
    const configured = Number(
        process.env.OMNIVIDEO_REMOTE_WORKER_PROXY_TIMEOUT_MS,
    );
    if (!Number.isFinite(configured) || configured <= 0) {
        return DEFAULT_REMOTE_WORKER_PROXY_TIMEOUT_MS;
    }
    return Math.min(
        MAX_REMOTE_WORKER_PROXY_TIMEOUT_MS,
        Math.max(MIN_REMOTE_WORKER_PROXY_TIMEOUT_MS, Math.round(configured)),
    );
}

function getErrorDetail(error: unknown) {
    if (!(error instanceof Error)) return String(error);
    const cause = (error as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
        const code =
            "code" in cause && typeof cause.code === "string"
                ? ` (${cause.code})`
                : "";
        return `${error.message}: ${cause.message}${code}`;
    }
    if (cause && typeof cause === "object") {
        const record = cause as Record<string, unknown>;
        const message =
            typeof record.message === "string" ? record.message : "";
        const code = typeof record.code === "string" ? ` (${record.code})` : "";
        return message ? `${error.message}: ${message}${code}` : error.message;
    }
    return error.message;
}

function buildUnavailableResponse(input: {
    endpoint: string;
    method: string;
    detail: string;
    timeoutMs: number;
}) {
    return NextResponse.json(
        {
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: `Remote VIP worker is unavailable at ${input.endpoint}. Check whether the EC2 worker is running, then refresh manually.`,
            detail: input.detail,
            timeoutMs: input.timeoutMs,
        },
        { status: 502 },
    );
}

async function proxyRemoteVipWorker(request: Request, method: "GET" | "DELETE") {
    const endpoint = resolveEndpoint(request);
    if (!endpoint) {
        return NextResponse.json(
            {
                ok: false,
                errorCode: "SYS_DUBBING_MUX_FAILED",
                error: "Remote VIP worker endpoint is not configured.",
            },
            { status: 400 },
        );
    }

    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId")?.trim();
    const remoteUrl = new URL(
        `${normalizeEndpoint(endpoint)}/api/audio/video-vip-voice-render`,
    );
    if (jobId) remoteUrl.searchParams.set("jobId", jobId);

    const token = resolveCallerToken(request);
    const timeoutMs = resolveProxyTimeoutMs();
    let response: Response;
    try {
        response = await fetch(remoteUrl, {
            method,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: AbortSignal.timeout(timeoutMs),
        });
    } catch (error) {
        return buildUnavailableResponse({
            endpoint: normalizeEndpoint(endpoint),
            method,
            detail: getErrorDetail(error),
            timeoutMs,
        });
    }
    const payload = await response.json().catch(() => null);
    return NextResponse.json(
        payload ?? {
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: `Remote VIP worker ${method} returned non-JSON response.`,
        },
        { status: response.status },
    );
}

export async function GET(request: Request) {
    return await proxyRemoteVipWorker(request, "GET");
}

export async function DELETE(request: Request) {
    return await proxyRemoteVipWorker(request, "DELETE");
}
