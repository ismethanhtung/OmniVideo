import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/topbar.tsx";

describe("Topbar background progress modal", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders step-aware progress details with live durations", () => {
        expect(source).toContain("Flow steps");
        expect(source).toContain("formatStepSummary");
        expect(source).toContain("parseStepDescription");
        expect(source).toContain("timelineHeader");
        expect(source).toContain("timelineLines");
        expect(source).toContain("ProgressSegmentsPanel");
        expect(source).toContain(
            "xl:grid-cols-[minmax(360px,0.9fr)_minmax(0,1.1fr)]",
        );
        expect(source).toContain("Show source");
        expect(source).toContain("Hide source");
        expect(source).toContain("HIGH_PROGRESS_VOICE_SPEED_FACTOR");
        expect(source).toContain("parseProgressSegmentLine");
        expect(source).toContain("relative min-h-0");
        expect(source).toContain("xl:absolute xl:inset-0 xl:max-h-none");
        expect(source).not.toContain("ResizeObserver");
        expect(source).not.toContain("maxHeightPx");
        expect(source).toContain("min-h-0 flex-1");
        expect(source).toContain("rawDurationSeconds.toFixed(2)");
        expect(source).toContain("sm:grid-cols-2");
        expect(source).toContain("ProgressRichStepPanel");
        expect(source).toContain("Dubbing details");
        expect(source).toContain("metadataLines");
        expect(source).toContain('label === "Measured stages" ? "Stages" : label');
        expect(source).not.toContain('normalizedLabel === "Stages"');
        expect(source).not.toContain("sm:col-span-2");
        expect(source).toContain("render (speed+mix+mirror+blur+sub)");
        expect(source).toContain("ProgressStepRow");
        expect(source).toContain("formatDurationValueMs");
        expect(source).toContain("typeof step.durationMs === \"number\"");
        expect(source).toContain("step.progressMode === \"determinate\"");
        expect(source).toContain("setInterval(() =>");
        expect(source).toContain("measured progress");
        expect(source).toContain("divide-y divide-soft");
    });

    it("supports completion toasts and optional browser notifications", () => {
        expect(source).toContain("CompletionToastStack");
        expect(source).toContain("collectNewlyFinishedProgressTasks");
        expect(source).toContain("getProgressNotificationChannel");
        expect(source).toContain("Enable notifications");
        expect(source).toContain("Send test notification");
        expect(source).toContain("onSendTestNotification");
        expect(source).toContain("new Notification(task.title");
    });

    it("exposes server status controls in the topbar", () => {
        expect(source).toContain("showServerStatus");
        expect(source).toContain("ServerStatusModal");
        expect(source).toContain("Open server status");
        expect(source).toContain("/api/audio/remote-vip-worker");
        expect(source).toContain("Remote VIP worker jobs and Piper/ffmpeg");
        expect(source).toContain("subprocesses.");
        expect(source).toContain("Kill active");
        expect(source).toContain("activeProcesses");
        expect(source).toContain("systemProcesses");
        expect(source).toContain("System Processes");
        expect(source).toContain("process.cpuPercent.toFixed(1)");
        expect(source).toContain("EC2 Instance");
        expect(source).toContain("Top Snapshot");
        expect(source).toContain("ServerStatusField");
        expect(source).toContain("top.lines.join");
        expect(source).toContain("autoRefreshPaused");
        expect(source).toContain("Auto-refresh is paused until you retry.");
        expect(source).toContain("setAutoRefreshPaused(true)");
        expect(source).toContain("REMOTE_VIP_WORKER_CONFIG_STORAGE_KEY");
        expect(source).toContain("readRemoteVipWorkerBrowserConfig");
        expect(source).toContain("writeRemoteVipWorkerBrowserConfig");
        expect(source).toContain("buildServerStatusRequest");
        expect(source).toContain("formatRemoteWorkerProxyError");
        expect(source).toContain("timeoutMs");
        expect(source).toContain("Remote worker URL");
        expect(source).toContain("Worker token");
        expect(source).toContain("http://16.163.29.17:8787");
        expect(source).toContain("X-OmniVideo-Remote-Vip-Token");
        expect(source).toContain("Saved in this browser.");
        expect(source).toContain("hasLoadedWorkerConfig");
    });
});
