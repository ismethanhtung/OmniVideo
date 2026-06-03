import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/topbar.tsx";

describe("Topbar background progress modal", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders step-aware progress details with live durations", () => {
        expect(source).toContain("Flow steps");
        expect(source).toContain("formatStepSummary");
        expect(source).toContain("parseStepDescription");
        expect(source).toContain("PROGRESS_TIMELINE_COLLAPSED_LIMIT");
        expect(source).toContain("timelineHeader");
        expect(source).toContain("timelineLines");
        expect(source).toContain("Show all");
        expect(source).toContain("ProgressRichStepPanel");
        expect(source).toContain("Dubbing details");
        expect(source).toContain("metadataLines");
        expect(source).toContain("ProgressStepRow");
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
        expect(source).toContain("Remote VIP worker jobs and Piper/ffmpeg subprocesses.");
        expect(source).toContain("Kill active");
        expect(source).toContain("activeProcesses");
        expect(source).toContain("systemProcesses");
        expect(source).toContain("System Processes");
        expect(source).toContain("CPU {process.cpuPercent.toFixed(1)}%");
    });
});
