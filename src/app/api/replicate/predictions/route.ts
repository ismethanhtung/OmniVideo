import { NextResponse } from "next/server";

import { requireWriteAccess } from "@/lib/access-control/route-guards";

export const runtime = "nodejs";

type ReplicateRunMode = "auto" | "version" | "official-model" | "deployment";

type ReplicatePredictionResponse = {
    id?: string;
    status?: string;
    output?: unknown;
    logs?: string;
    error?: unknown;
    urls?: {
        get?: string;
        web?: string;
        cancel?: string;
    };
    [key: string]: unknown;
};

const REPLICATE_API_BASE = "https://api.replicate.com/v1";
const SMALL_DATA_URL_LIMIT_BYTES = 256 * 1024;

export async function POST(request: Request) {
    try {
        const writeDenied = requireWriteAccess(request);
        if (writeDenied) return writeDenied;

        const formData = await request.formData();
        const token =
            readFormValue(formData, "token").trim() ||
            process.env.REPLICATE_API_TOKEN?.trim() ||
            "";
        const target = readFormValue(formData, "target").trim();
        const mode = normalizeRunMode(readFormValue(formData, "mode"));
        const inputJson = readFormValue(formData, "inputJson").trim() || "{}";
        const fileInputKey = readFormValue(formData, "fileInputKey").trim();
        const waitSeconds = clampNumber(
            Number(readFormValue(formData, "waitSeconds") || 45),
            1,
            60,
        );
        const cancelAfter = readFormValue(formData, "cancelAfter").trim();

        if (!token) {
            return validationError(
                "CFG_REPLICATE_TOKEN_MISSING",
                "REPLICATE_API_TOKEN is required, or paste a temporary token.",
            );
        }
        if (!target) {
            return validationError(
                "VAL_REPLICATE_TARGET_REQUIRED",
                "Replicate model/version target is required.",
            );
        }

        const input = parseInputJson(inputJson);
        const warnings: string[] = [];
        const inputFile = formData.get("inputFile");
        if (inputFile instanceof Blob && fileInputKey) {
            if (inputFile.size > SMALL_DATA_URL_LIMIT_BYTES) {
                warnings.push(
                    "File was sent as a data URL. Replicate recommends HTTP URLs for files larger than 256KB.",
                );
            }
            input[fileInputKey] = await blobToDataUrl(inputFile);
        }

        const resolved = await resolvePredictionTarget({ mode, target, token });
        const prediction = await createPrediction({
            target,
            token,
            waitSeconds,
            cancelAfter,
            input,
            resolved,
        });

        return NextResponse.json({
            ok: true,
            data: {
                prediction,
                warnings,
                resolved,
            },
        });
    } catch (error) {
        const status =
            error instanceof ReplicateApiError
                ? error.status
                : error instanceof ReplicateValidationError
                  ? 400
                  : 500;
        return NextResponse.json(
            {
                ok: false,
                errorCode:
                    error instanceof ReplicateApiError ||
                    error instanceof ReplicateValidationError
                        ? error.code
                        : "SYS_REPLICATE_PREDICTION_FAILED",
                error:
                    error instanceof Error
                        ? error.message
                        : "Replicate prediction failed.",
            },
            { status },
        );
    }
}

class ReplicateValidationError extends Error {
    constructor(
        public readonly code:
            | "VAL_REPLICATE_INPUT_INVALID"
            | "VAL_REPLICATE_TARGET_INVALID",
        message: string,
    ) {
        super(message);
        this.name = "ReplicateValidationError";
    }
}

class ReplicateApiError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "ReplicateApiError";
    }
}

function readFormValue(formData: FormData, key: string) {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
}

function normalizeRunMode(value: string): ReplicateRunMode {
    if (
        value === "version" ||
        value === "official-model" ||
        value === "deployment"
    ) {
        return value;
    }
    return "auto";
}

function parseInputJson(value: string): Record<string, unknown> {
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Input JSON must be an object.");
        }
        return parsed as Record<string, unknown>;
    } catch (error) {
        throw new ReplicateValidationError(
            "VAL_REPLICATE_INPUT_INVALID",
            error instanceof Error ? error.message : "Input JSON is invalid.",
        );
    }
}

async function resolvePredictionTarget(input: {
    mode: ReplicateRunMode;
    target: string;
    token: string;
}) {
    if (input.mode === "deployment") {
        const model = parseOwnerName(input.target);
        return {
            mode: "deployment" as const,
            endpoint: `${REPLICATE_API_BASE}/deployments/${encodeURIComponent(
                model.owner,
            )}/${encodeURIComponent(model.name)}/predictions`,
        };
    }

    if (input.mode === "official-model") {
        const model = parseOwnerName(input.target);
        return {
            mode: "official-model" as const,
            endpoint: `${REPLICATE_API_BASE}/models/${encodeURIComponent(
                model.owner,
            )}/${encodeURIComponent(model.name)}/predictions`,
        };
    }

    if (
        input.mode === "version" ||
        input.target.includes(":") ||
        /^[a-f0-9]{64}$/iu.test(input.target)
    ) {
        return {
            mode: "version" as const,
            endpoint: `${REPLICATE_API_BASE}/predictions`,
            version: input.target,
        };
    }

    const model = parseOwnerName(input.target);
    const latestVersion = await fetchLatestModelVersion({
        owner: model.owner,
        name: model.name,
        token: input.token,
    });
    return {
        mode: "latest-version" as const,
        endpoint: `${REPLICATE_API_BASE}/predictions`,
        version: latestVersion,
    };
}

function parseOwnerName(value: string) {
    const [owner, name, extra] = value.split("/");
    if (!owner || !name || extra) {
        throw new ReplicateValidationError(
            "VAL_REPLICATE_TARGET_INVALID",
            "Use owner/model, owner/model:version, a 64-character version id, or owner/deployment.",
        );
    }
    return { owner, name };
}

async function fetchLatestModelVersion(input: {
    owner: string;
    name: string;
    token: string;
}) {
    const response = await fetch(
        `${REPLICATE_API_BASE}/models/${encodeURIComponent(
            input.owner,
        )}/${encodeURIComponent(input.name)}`,
        {
            headers: {
                Authorization: `Bearer ${input.token}`,
            },
        },
    );
    const payload = (await response.json().catch(() => ({}))) as {
        latest_version?: { id?: string };
        detail?: string;
        error?: string;
    };

    if (!response.ok) {
        throw new ReplicateApiError(
            "PRV_REPLICATE_MODEL_LOOKUP_FAILED",
            payload.detail || payload.error || "Replicate model lookup failed.",
            response.status,
        );
    }

    const version = payload.latest_version?.id;
    if (!version) {
        throw new ReplicateApiError(
            "PRV_REPLICATE_MODEL_VERSION_MISSING",
            "Replicate model response did not include latest_version.id.",
            502,
        );
    }
    return version;
}

async function createPrediction(input: {
    target: string;
    token: string;
    waitSeconds: number;
    cancelAfter: string;
    input: Record<string, unknown>;
    resolved:
        | { mode: "deployment"; endpoint: string }
        | { mode: "official-model"; endpoint: string }
        | { mode: "version"; endpoint: string; version: string }
        | { mode: "latest-version"; endpoint: string; version: string };
}) {
    const body =
        "version" in input.resolved
            ? { version: input.resolved.version, input: input.input }
            : { input: input.input };
    const headers: Record<string, string> = {
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
        Prefer: `wait=${input.waitSeconds}`,
    };
    if (input.cancelAfter) headers["Cancel-After"] = input.cancelAfter;

    const response = await fetch(input.resolved.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });
    const payload = (await response.json().catch(() => ({}))) as
        | ReplicatePredictionResponse
        | { detail?: string; error?: string };

    if (!response.ok) {
        throw new ReplicateApiError(
            "PRV_REPLICATE_PREDICTION_FAILED",
            getReplicateErrorMessage(payload),
            response.status,
        );
    }

    return payload as ReplicatePredictionResponse;
}

async function blobToDataUrl(blob: Blob) {
    const buffer = Buffer.from(await blob.arrayBuffer());
    const mimeType = blob.type || "application/octet-stream";
    return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

function clampNumber(value: number, min: number, max: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function validationError(errorCode: string, error: string) {
    return NextResponse.json({ ok: false, errorCode, error }, { status: 400 });
}

function getReplicateErrorMessage(payload: unknown) {
    if (payload && typeof payload === "object") {
        const candidate = payload as { detail?: unknown; error?: unknown };
        if (typeof candidate.detail === "string" && candidate.detail) {
            return candidate.detail;
        }
        if (typeof candidate.error === "string" && candidate.error) {
            return candidate.error;
        }
    }
    return "Replicate prediction failed.";
}
