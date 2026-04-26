import { afterEach, describe, expect, it, vi } from "vitest";

import {
  finishProgressTask,
  getActiveProgressTaskCount,
  getProgressTasksSnapshot,
  resetProgressTasksForTest,
  startProgressTask,
  subscribeProgressTasks,
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
});
