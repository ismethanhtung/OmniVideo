export type ProgressTaskStatus = "queued" | "running" | "success" | "failed";
export type ProgressStepStatus =
  | "queued"
  | "running"
  | "success"
  | "failed"
  | "skipped";
export type ProgressMode = "determinate" | "indeterminate";

export type ProgressTaskStep = {
  id: string;
  title: string;
  description?: string;
  status: ProgressStepStatus;
  progress: number;
  progressMode: ProgressMode;
  startedAt?: number;
  updatedAt: number;
  finishedAt?: number;
  error?: string;
};

export type ProgressTask = {
  id: string;
  title: string;
  description?: string;
  scope: "publish" | "upload" | "download" | "system";
  status: ProgressTaskStatus;
  progress: number;
  progressMode: ProgressMode;
  steps: ProgressTaskStep[];
  startedAt: number;
  updatedAt: number;
  finishedAt?: number;
  error?: string;
};

type ProgressTaskStepInput = {
  id: string;
  title: string;
  description?: string;
  progress?: number;
  progressMode?: ProgressMode;
};

type ProgressTaskInput = {
  id?: string;
  title: string;
  description?: string;
  scope: ProgressTask["scope"];
  progress?: number;
  progressMode?: ProgressMode;
  steps?: ProgressTaskStepInput[];
};

const listeners = new Set<() => void>();
const tasks = new Map<string, ProgressTask>();
let snapshotCache: ProgressTask[] | null = null;
let hydrated = false;

const PROGRESS_TASKS_STORAGE_KEY = "omnivideo-progress-tasks";

function getBrowserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

function isProgressMode(value: unknown): value is ProgressMode {
  return value === "determinate" || value === "indeterminate";
}

function isProgressStepStatus(value: unknown): value is ProgressStepStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "success" ||
    value === "failed" ||
    value === "skipped"
  );
}

function isProgressScope(value: unknown): value is ProgressTask["scope"] {
  return (
    value === "publish" ||
    value === "upload" ||
    value === "download" ||
    value === "system"
  );
}

function isPersistedProgressTaskStep(value: unknown): value is ProgressTaskStep {
  if (!value || typeof value !== "object") {
    return false;
  }

  const step = value as Partial<ProgressTaskStep>;
  return (
    typeof step.id === "string" &&
    typeof step.title === "string" &&
    (step.description === undefined || typeof step.description === "string") &&
    isProgressStepStatus(step.status) &&
    typeof step.progress === "number" &&
    isProgressMode(step.progressMode) &&
    (step.startedAt === undefined || typeof step.startedAt === "number") &&
    typeof step.updatedAt === "number" &&
    (step.finishedAt === undefined || typeof step.finishedAt === "number") &&
    (step.error === undefined || typeof step.error === "string")
  );
}

function isProgressTaskStatus(value: unknown): value is ProgressTaskStatus {
  return (
    value === "queued" ||
    value === "running" ||
    value === "success" ||
    value === "failed"
  );
}

function isPersistedProgressTask(value: unknown): value is ProgressTask {
  if (!value || typeof value !== "object") {
    return false;
  }

  const task = value as Partial<ProgressTask>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    (task.description === undefined || typeof task.description === "string") &&
    isProgressScope(task.scope) &&
    isProgressTaskStatus(task.status) &&
    typeof task.progress === "number" &&
    isProgressMode(task.progressMode) &&
    Array.isArray(task.steps) &&
    task.steps.every(isPersistedProgressTaskStep) &&
    typeof task.startedAt === "number" &&
    typeof task.updatedAt === "number" &&
    (task.finishedAt === undefined || typeof task.finishedAt === "number") &&
    (task.error === undefined || typeof task.error === "string")
  );
}

function ensureHydrated() {
  if (hydrated) {
    return;
  }

  hydrated = true;
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  try {
    const raw = storage.getItem(PROGRESS_TASKS_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return;
    }

    for (const task of parsed) {
      if (isPersistedProgressTask(task)) {
        tasks.set(task.id, task);
      }
    }
  } catch {
    // Browser storage is best-effort; corrupted payloads should not break UI state.
  }
}

function persistProgressTasks() {
  const storage = getBrowserStorage();
  if (!storage) {
    return;
  }

  const progressTasks = Array.from(tasks.values());

  try {
    if (progressTasks.length === 0) {
      storage.removeItem(PROGRESS_TASKS_STORAGE_KEY);
      return;
    }

    storage.setItem(
      PROGRESS_TASKS_STORAGE_KEY,
      JSON.stringify(progressTasks),
    );
  } catch {
    // Browser storage is best-effort; progress tracking should keep working.
  }
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function emit() {
  snapshotCache = null;
  persistProgressTasks();
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

function createInitialStep(
  input: ProgressTaskStepInput,
  now: number,
): ProgressTaskStep {
  return {
    id: input.id,
    title: input.title,
    description: input.description,
    status: "queued",
    progress: clampProgress(input.progress ?? 0),
    progressMode: input.progressMode ?? "indeterminate",
    updatedAt: now,
  };
}

function updateTask(
  id: string,
  updater: (task: ProgressTask, now: number) => ProgressTask,
) {
  const existing = tasks.get(id);

  if (!existing) {
    return;
  }

  const now = Date.now();
  tasks.set(id, updater(existing, now));
  emit();
}

export function subscribeProgressTasks(listener: () => void) {
  ensureHydrated();
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getProgressTasksSnapshot() {
  ensureHydrated();
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
  ensureHydrated();
  const now = Date.now();
  const id = input.id ?? createTaskId(input.scope);

  tasks.set(id, {
    id,
    title: input.title,
    description: input.description,
    scope: input.scope,
    status: "running",
    progress: clampProgress(input.progress ?? 0),
    progressMode: input.progressMode ?? "determinate",
    steps: (input.steps ?? []).map((step) => createInitialStep(step, now)),
    startedAt: now,
    updatedAt: now,
  });
  emit();

  return id;
}

export function updateProgressTask(
  id: string,
  patch: Partial<
    Pick<
      ProgressTask,
      "title" | "description" | "progress" | "progressMode" | "status"
    >
  >,
) {
  updateTask(id, (existing, now) => ({
    ...existing,
    ...patch,
    progress:
      typeof patch.progress === "number"
        ? clampProgress(patch.progress)
        : existing.progress,
    updatedAt: now,
  }));
}

export function startProgressStep({
  taskId,
  stepId,
  description,
  progress,
  progressMode,
}: {
  taskId: string;
  stepId: string;
  description?: string;
  progress?: number;
  progressMode?: ProgressMode;
}) {
  updateTask(taskId, (existing, now) => ({
    ...existing,
    steps: existing.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            description: description ?? step.description,
            status: "running",
            progress:
              typeof progress === "number"
                ? clampProgress(progress)
                : step.progress,
            progressMode: progressMode ?? step.progressMode,
            startedAt: step.startedAt ?? now,
            updatedAt: now,
            finishedAt: undefined,
            error: undefined,
          }
        : step,
    ),
    updatedAt: now,
  }));
}

export function updateProgressStep(
  taskId: string,
  stepId: string,
  patch: Partial<
    Pick<
      ProgressTaskStep,
      "title" | "description" | "progress" | "progressMode" | "status"
    >
  >,
) {
  updateTask(taskId, (existing, now) => ({
    ...existing,
    steps: existing.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            ...patch,
            progress:
              typeof patch.progress === "number"
                ? clampProgress(patch.progress)
                : step.progress,
            updatedAt: now,
          }
        : step,
    ),
    updatedAt: now,
  }));
}

export function finishProgressStep({
  taskId,
  stepId,
  status,
  description,
  error,
}: {
  taskId: string;
  stepId: string;
  status: Extract<ProgressStepStatus, "success" | "failed" | "skipped">;
  description?: string;
  error?: string;
}) {
  updateTask(taskId, (existing, now) => ({
    ...existing,
    steps: existing.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            description: description ?? step.description,
            error,
            status,
            progress: status === "success" ? 100 : step.progress,
            updatedAt: now,
            finishedAt: now,
          }
        : step,
    ),
    updatedAt: now,
  }));
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
  ensureHydrated();
  tasks.delete(id);
  emit();
}

export function clearFinishedProgressTasks() {
  ensureHydrated();
  for (const task of tasks.values()) {
    if (task.status === "success" || task.status === "failed") {
      tasks.delete(task.id);
    }
  }
  emit();
}

export function resetProgressTasksForTest({
  preserveStorage = false,
}: {
  preserveStorage?: boolean;
} = {}) {
  tasks.clear();
  snapshotCache = null;
  hydrated = false;
  if (!preserveStorage) {
    const storage = getBrowserStorage();
    try {
      storage?.removeItem(PROGRESS_TASKS_STORAGE_KEY);
    } catch {
      // Test cleanup should not fail on inaccessible storage.
    }
  }
  for (const listener of listeners) {
    listener();
  }
}
