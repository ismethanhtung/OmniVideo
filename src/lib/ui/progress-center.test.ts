import { afterEach, describe, expect, it, vi } from "vitest";

import {
  finishProgressTask,
  finishProgressStep,
  getActiveProgressTaskCount,
  getProgressTasksSnapshot,
  resetProgressTasksForTest,
  startProgressStep,
  startProgressTask,
  subscribeProgressTasks,
  updateProgressStep,
  updateProgressTask,
} from "./progress-center";

describe("progress center", () => {
  afterEach(() => {
    resetProgressTasksForTest();
  });

  it("tracks active task progress and clamps percent", () => {
    const taskId = startProgressTask({
      id: "publish-1",
      title: "Publishing",
      scope: "publish",
    });

    updateProgressTask(taskId, { progress: 140 });

    const [task] = getProgressTasksSnapshot();
    expect(task.id).toBe("publish-1");
    expect(task.progress).toBe(100);
    expect(getActiveProgressTaskCount()).toBe(1);
  });

  it("marks finished tasks inactive and notifies subscribers", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeProgressTasks(listener);
    const taskId = startProgressTask({
      title: "Upload",
      scope: "upload",
      progress: 20,
    });

    finishProgressTask({
      id: taskId,
      status: "success",
      description: "Done.",
    });

    expect(listener).toHaveBeenCalled();
    expect(getActiveProgressTaskCount()).toBe(0);
    expect(getProgressTasksSnapshot()[0]).toMatchObject({
      status: "success",
      progress: 100,
      description: "Done.",
    });

    unsubscribe();
  });

  it("tracks nested step lifecycle without forcing fake overall progress", () => {
    const taskId = startProgressTask({
      id: "workspace-1",
      title: "Workspace flow",
      scope: "system",
      progressMode: "indeterminate",
      steps: [
        {
          id: "download",
          title: "Download source",
        },
      ],
    });

    startProgressStep({
      taskId,
      stepId: "download",
      description: "Downloading source asset...",
      progressMode: "determinate",
    });
    updateProgressStep(taskId, "download", {
      progress: 48,
      description: "Downloading 48 MB / 100 MB",
    });

    const [runningTask] = getProgressTasksSnapshot();
    expect(runningTask.progressMode).toBe("indeterminate");
    expect(runningTask.progress).toBe(0);
    expect(runningTask.steps[0]).toMatchObject({
      status: "running",
      progressMode: "determinate",
      progress: 48,
      description: "Downloading 48 MB / 100 MB",
    });
    expect(runningTask.steps[0].startedAt).toEqual(expect.any(Number));

    finishProgressStep({
      taskId,
      stepId: "download",
      status: "success",
      description: "Download complete.",
    });

    const [finishedTask] = getProgressTasksSnapshot();
    expect(finishedTask.steps[0]).toMatchObject({
      status: "success",
      progress: 100,
      description: "Download complete.",
    });
    expect(finishedTask.steps[0].finishedAt).toEqual(expect.any(Number));
  });
});
