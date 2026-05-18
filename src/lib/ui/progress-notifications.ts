import type { ProgressTask, ProgressTaskStatus } from "./progress-center";

export type ProgressNotificationChannel = "toast" | "browser" | "none";

export function collectNewlyFinishedProgressTasks({
  previousStatuses,
  tasks,
}: {
  previousStatuses: Map<string, ProgressTaskStatus>;
  tasks: ProgressTask[];
}) {
  return tasks.filter((task) => {
    const previousStatus = previousStatuses.get(task.id);
    const wasActive =
      previousStatus === "queued" || previousStatus === "running";
    const isFinished = task.status === "success" || task.status === "failed";

    return wasActive && isFinished;
  });
}

export function buildProgressStatusMap(tasks: ProgressTask[]) {
  return new Map(tasks.map((task) => [task.id, task.status]));
}

export function getProgressNotificationChannel({
  visibilityState,
  browserPermission,
}: {
  visibilityState: DocumentVisibilityState;
  browserPermission?: NotificationPermission;
}): ProgressNotificationChannel {
  if (visibilityState === "visible") {
    return "toast";
  }

  return browserPermission === "granted" ? "browser" : "none";
}
