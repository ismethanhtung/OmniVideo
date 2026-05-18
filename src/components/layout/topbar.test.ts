import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SOURCE_PATH = "src/components/layout/topbar.tsx";

describe("Topbar background progress modal", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");

    it("renders step-aware progress details with live durations", () => {
        expect(source).toContain("Flow steps");
        expect(source).toContain("formatStepSummary");
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
});
