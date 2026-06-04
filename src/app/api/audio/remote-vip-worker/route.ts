import { NextResponse } from "next/server";

export const runtime = "nodejs";

const REMOTE_WORKER_PROXY_TIMEOUT_MS = 3000;

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

function buildUnavailableResponse(input: { endpoint: string; method: string }) {
    return NextResponse.json(
        {
            ok: false,
            errorCode: "SYS_DUBBING_MUX_FAILED",
            error: `Remote VIP worker is unavailable at ${input.endpoint}. Check whether the EC2 worker is running, then refresh manually.`,
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
    let response: Response;
    try {
        response = await fetch(remoteUrl, {
            method,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal: AbortSignal.timeout(REMOTE_WORKER_PROXY_TIMEOUT_MS),
        });
    } catch {
        return buildUnavailableResponse({
            endpoint: normalizeEndpoint(endpoint),
            method,
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
