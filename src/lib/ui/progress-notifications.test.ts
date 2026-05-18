import { describe, expect, it } from "vitest";

import type { ProgressTask } from "./progress-center";
import {
  buildProgressStatusMap,
  collectNewlyFinishedProgressTasks,
  getProgressNotificationChannel,
} from "./progress-notifications";

describe("progress notifications", () => {
  it("collects only active tasks that just became finished", () => {
    const previousStatuses = buildProgressStatusMap([
      createTask("running-task", "running"),
      createTask("already-finished", "success"),
    ]);

    expect(
      collectNewlyFinishedProgressTasks({
        previousStatuses,
        tasks: [
          createTask("running-task", "success"),
          createTask("already-finished", "success"),
          createTask("historical-finished", "failed"),
        ],
      }).map((task) => task.id),
    ).toEqual(["running-task"]);
  });

  it("routes visible tabs to toast and hidden granted tabs to browser notifications", () => {
    expect(
      getProgressNotificationChannel({
        visibilityState: "visible",
        browserPermission: "granted",
      }),
    ).toBe("toast");
    expect(
      getProgressNotificationChannel({
        visibilityState: "hidden",
        browserPermission: "granted",
      }),
    ).toBe("browser");
    expect(
      getProgressNotificationChannel({
        visibilityState: "hidden",
        browserPermission: "default",
      }),
    ).toBe("none");
  });
});

function createTask(
  id: string,
  status: ProgressTask["status"],
): ProgressTask {
  return {
    id,
    title: id,
    scope: "system",
    status,
    progress: status === "success" ? 100 : 0,
    progressMode: "determinate",
    steps: [],
    startedAt: 1,
    updatedAt: 1,
    finishedAt:
      status === "success" || status === "failed" ? 1 : undefined,
  };
}
