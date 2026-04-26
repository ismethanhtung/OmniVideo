export type ProgressTaskStatus = "queued" | "running" | "success" | "failed";

export type ProgressTask = {
  id: string;
  title: string;
  description?: string;
  scope: "publish" | "upload" | "download" | "system";
  status: ProgressTaskStatus;
  progress: number;
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  error?: string;
};

type ProgressTaskInput = {
  id?: string;
  title: string;
  description?: string;
  scope: ProgressTask["scope"];
  progress?: number;
};

const listeners = new Set<() => void>();
const tasks = new Map<string, ProgressTask>();
let snapshotCache: ProgressTask[] | null = null;

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function emit() {
  snapshotCache = null;
  for (const listener of listeners) {
    listener();
  }
}

function createTaskId(scope: ProgressTask["scope"]) {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${scope}-${random}`;
}

export function subscribeProgressTasks(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getProgressTasksSnapshot() {
  if (!snapshotCache) {
    snapshotCache = Array.from(tasks.values()).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  return snapshotCache;
}

export function getActiveProgressTaskCount() {
  return getProgressTasksSnapshot().filter(
    (task) => task.status === "queued" || task.status === "running",
  ).length;
}

export function startProgressTask(input: ProgressTaskInput) {
  const now = Date.now();
  const id = input.id ?? createTaskId(input.scope);

  tasks.set(id, {
    id,
    title: input.title,
    description: input.description,
    scope: input.scope,
    status: "running",
    progress: clampProgress(input.progress ?? 0),
    startedAt: now,
    updatedAt: now,
  });
  emit();

  return id;
}

export function updateProgressTask(
  id: string,
  patch: Partial<Pick<ProgressTask, "title" | "description" | "progress" | "status">>,
) {
  const existing = tasks.get(id);

  if (!existing) {
    return;
  }

  tasks.set(id, {
    ...existing,
    ...patch,
    progress:
      typeof patch.progress === "number"
        ? clampProgress(patch.progress)
        : existing.progress,
    updatedAt: Date.now(),
  });
  emit();
}

export function finishProgressTask({
  id,
  status,
  description,
  error,
}: {
  id: string;
  status: Extract<ProgressTaskStatus, "success" | "failed">;
  description?: string;
  error?: string;
}) {
  const existing = tasks.get(id);

  if (!existing) {
    return;
  }

  const now = Date.now();
  tasks.set(id, {
    ...existing,
    description: description ?? existing.description,
    error,
    status,
    progress: status === "success" ? 100 : existing.progress,
    updatedAt: now,
    finishedAt: now,
  });
  emit();
}

export function dismissProgressTask(id: string) {
  tasks.delete(id);
  emit();
}

export function clearFinishedProgressTasks() {
  for (const task of tasks.values()) {
    if (task.status === "success" || task.status === "failed") {
      tasks.delete(task.id);
    }
  }
  emit();
}

export function resetProgressTasksForTest() {
  tasks.clear();
  emit();
}
