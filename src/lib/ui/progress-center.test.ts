import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearFinishedProgressTasks,
  dismissProgressTask,
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
    vi.unstubAllGlobals();
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
      durationMs: 32000,
    });

    const [finishedTask] = getProgressTasksSnapshot();
    expect(finishedTask.steps[0]).toMatchObject({
      status: "success",
      progress: 100,
      description: "Download complete.",
      durationMs: 32000,
    });
    expect(finishedTask.steps[0].finishedAt).toEqual(expect.any(Number));
  });

  it("persists finished tasks across reload-style rehydration and clears them on demand", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });

    const taskId = startProgressTask({
      id: "publish-persisted",
      title: "Publishing",
      scope: "publish",
    });

    finishProgressTask({
      id: taskId,
      status: "success",
      description: "Published.",
    });

    expect(storage.getItem("omnivideo-progress-tasks")).toContain(
      "publish-persisted",
    );

    resetProgressTasksForTest({ preserveStorage: true });

    expect(getProgressTasksSnapshot()).toMatchObject([
      {
        id: "publish-persisted",
        status: "success",
        description: "Published.",
      },
    ]);

    clearFinishedProgressTasks();

    expect(getProgressTasksSnapshot()).toEqual([]);
    expect(storage.getItem("omnivideo-progress-tasks")).toBeNull();
  });

  it("persists active tasks across reload-style rehydration", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });

    const taskId = startProgressTask({
      id: "workspace-heavy-flow",
      title: "Workspace flow",
      scope: "system",
      progressMode: "indeterminate",
      steps: [{ id: "dub", title: "Dub video" }],
    });
    startProgressStep({
      taskId,
      stepId: "dub",
      description: "Generating voice...",
    });

    expect(storage.getItem("omnivideo-progress-tasks")).toContain(
      "workspace-heavy-flow",
    );

    resetProgressTasksForTest({ preserveStorage: true });

    expect(getProgressTasksSnapshot()).toMatchObject([
      {
        id: "workspace-heavy-flow",
        status: "running",
        steps: [
          {
            id: "dub",
            status: "running",
            description: "Generating voice...",
          },
        ],
      },
    ]);
    expect(getActiveProgressTaskCount()).toBe(1);
  });

  it("persists measured step durations across reload-style rehydration", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });

    const taskId = startProgressTask({
      id: "workspace-measured-flow",
      title: "Workspace flow",
      scope: "system",
      progressMode: "indeterminate",
      steps: [{ id: "vip:translation", title: "VIP Translate" }],
    });

    finishProgressStep({
      taskId,
      stepId: "vip:translation",
      status: "success",
      description: "Translation complete.",
      durationMs: 20432,
    });

    resetProgressTasksForTest({ preserveStorage: true });

    expect(getProgressTasksSnapshot()).toMatchObject([
      {
        id: "workspace-measured-flow",
        steps: [
          {
            id: "vip:translation",
            status: "success",
            durationMs: 20432,
          },
        ],
      },
    ]);
  });

  it("compacts very large segment descriptions only for persisted storage", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });
    const segmentLines = Array.from(
      { length: 130 },
      (_, index) =>
        `SEGMENT_JSON ${JSON.stringify({
          id: index,
          start: index,
          end: index + 1,
          translatedText: `Line ${index}`,
        })}`,
    );
    const description = [
      "VIP complete.",
      "Metadata:",
      "File: done.mp4",
      "Segments (130 total):",
      ...segmentLines,
    ].join("\n");

    const taskId = startProgressTask({
      id: "workspace-large-vip",
      title: "Workspace flow",
      scope: "system",
      steps: [{ id: "vip", title: "VIP" }],
    });
    finishProgressStep({
      taskId,
      stepId: "vip",
      status: "success",
      description,
    });

    expect(getProgressTasksSnapshot()[0].steps[0].description).toContain(
      '"id":129',
    );
    const persisted = storage.getItem("omnivideo-progress-tasks") ?? "";
    const persistedDescription = JSON.parse(persisted)[0].steps[0]
      .description as string;
    expect(persistedDescription).toContain("Segment list compacted for storage");
    expect(persistedDescription).toContain('"id":79');
    expect(persistedDescription).not.toContain('"id":80');
    expect(persistedDescription).not.toContain('"id":129');
  });

  it("does not move finishedAt when polling finishes an already completed step again", () => {
    const nowSpy = vi.spyOn(Date, "now");
    try {
      nowSpy.mockReturnValue(1000);
      const taskId = startProgressTask({
        id: "workspace-vip-polling",
        title: "Workspace flow",
        scope: "system",
        progressMode: "indeterminate",
        steps: [{ id: "vip:transcript", title: "VIP Transcript" }],
      });
      startProgressStep({
        taskId,
        stepId: "vip:transcript",
        description: "Transcribing...",
      });

      nowSpy.mockReturnValue(2000);
      finishProgressStep({
        taskId,
        stepId: "vip:transcript",
        status: "success",
        description: "Transcript complete.",
      });
      const firstFinishedAt =
        getProgressTasksSnapshot()[0].steps[0].finishedAt;

      nowSpy.mockReturnValue(5000);
      finishProgressStep({
        taskId,
        stepId: "vip:transcript",
        status: "success",
        description: "Transcript complete: 643 segment(s).",
        durationMs: 32000,
      });

      const [task] = getProgressTasksSnapshot();
      expect(task.steps[0]).toMatchObject({
        status: "success",
        description: "Transcript complete: 643 segment(s).",
        finishedAt: firstFinishedAt,
        durationMs: 32000,
      });
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("removes one dismissed finished task from persisted history", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });

    const firstTaskId = startProgressTask({
      id: "publish-first",
      title: "First publish",
      scope: "publish",
    });
    const secondTaskId = startProgressTask({
      id: "publish-second",
      title: "Second publish",
      scope: "publish",
    });

    finishProgressTask({
      id: firstTaskId,
      status: "success",
    });
    finishProgressTask({
      id: secondTaskId,
      status: "failed",
    });

    dismissProgressTask(firstTaskId);

    expect(storage.getItem("omnivideo-progress-tasks")).not.toContain(
      "publish-first",
    );
    expect(storage.getItem("omnivideo-progress-tasks")).toContain(
      "publish-second",
    );
  });

  it("ignores corrupted persisted payloads safely", () => {
    const storage = createLocalStorageMock();
    storage.setItem("omnivideo-progress-tasks", "{bad-json");
    vi.stubGlobal("window", { localStorage: storage });

    expect(getProgressTasksSnapshot()).toEqual([]);
  });
});

function createLocalStorageMock() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}
