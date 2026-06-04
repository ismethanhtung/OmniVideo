export const REMOTE_VIP_WORKER_CONFIG_STORAGE_KEY =
    "omnivideo.remoteVipWorkerConfig.v1";

export type RemoteVipWorkerBrowserConfig = {
    endpoint: string;
    token: string;
};

export function readRemoteVipWorkerBrowserConfig(): RemoteVipWorkerBrowserConfig {
    if (typeof window === "undefined") {
        return { endpoint: "", token: "" };
    }
    try {
        const raw = window.localStorage.getItem(
            REMOTE_VIP_WORKER_CONFIG_STORAGE_KEY,
        );
        if (!raw) return { endpoint: "", token: "" };
        const parsed = JSON.parse(raw) as {
            endpoint?: unknown;
            token?: unknown;
        };
        return {
            endpoint:
                typeof parsed.endpoint === "string" ? parsed.endpoint : "",
            token: typeof parsed.token === "string" ? parsed.token : "",
        };
    } catch {
        return { endpoint: "", token: "" };
    }
}

export function writeRemoteVipWorkerBrowserConfig(
    config: RemoteVipWorkerBrowserConfig,
) {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(
        REMOTE_VIP_WORKER_CONFIG_STORAGE_KEY,
        JSON.stringify({
            endpoint: config.endpoint.trim(),
            token: config.token.trim(),
        }),
    );
}
