"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  Loader2,
  PauseCircle,
  Plus,
  RefreshCw,
  Trash2,
  Unplug,
  Zap,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type AiProviderType =
  | "groq"
  | "openrouter"
  | "openai"
  | "anthropic"
  | "openai-compatible";

type AiProviderStatus = "active" | "paused" | "error";

type AiProvider = {
  _id: string;
  label: string;
  providerType: AiProviderType;
  baseUrl: string;
  apiKeyPreview: string | null;
  description: string | null;
  status: AiProviderStatus;
  priority: number;
  tags: string[];
  rateLimitRpm: number | null;
  rateLimitTpm: number | null;
  quotaMonthlyTokens: number | null;
  usage: {
    totalRequests: number;
    totalTokensUsed: number;
    lastUsedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  errorCode?: string;
  error?: string;
};

type TestResult = {
  ok: boolean;
  modelCount: number;
  latencyMs: number;
  error?: string;
};

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "failed"; message: string };

const PROVIDER_TYPE_OPTIONS: Array<{
  value: AiProviderType;
  label: string;
  defaultBaseUrl: string;
}> = [
  {
    value: "groq",
    label: "Groq",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
  {
    value: "openai",
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com/v1",
  },
  {
    value: "openai-compatible",
    label: "OpenAI-Compatible (Custom)",
    defaultBaseUrl: "",
  },
];

function StatusBadge({ status }: { status: AiProviderStatus }) {
  const classes = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    paused: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

type AiProvidersPanelProps = {
  section: LeftbarNavItem;
};

export function AiProvidersPanel({ section }: AiProvidersPanelProps) {
  const Icon = section.icon;

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formLabel, setFormLabel] = useState("");
  const [formType, setFormType] = useState<AiProviderType>("groq");
  const [formBaseUrl, setFormBaseUrl] = useState(
    "https://api.groq.com/openai/v1",
  );
  const [formApiKey, setFormApiKey] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState(50);
  const [formStatus, setFormStatus] = useState<AiProviderStatus>("active");
  const [formRateLimitRpm, setFormRateLimitRpm] = useState("");
  const [formRateLimitTpm, setFormRateLimitTpm] = useState("");
  const [formQuotaMonthly, setFormQuotaMonthly] = useState("");

  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "",
  });

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    providerId: string;
    result: TestResult;
  } | null>(null);

  const fetchProviders = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/ai-providers");
      const payload = (await response.json()) as ApiResponse<AiProvider[]>;
      if (payload.ok && payload.data) {
        setProviders(payload.data);
      } else {
        setLoadError(payload.error ?? "Failed to load providers.");
      }
    } catch {
      setLoadError("Network error loading providers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const resetForm = () => {
    setFormLabel("");
    setFormType("groq");
    setFormBaseUrl("https://api.groq.com/openai/v1");
    setFormApiKey("");
    setFormDescription("");
    setFormPriority(50);
    setFormStatus("active");
    setFormRateLimitRpm("");
    setFormRateLimitTpm("");
    setFormQuotaMonthly("");
    setEditingId(null);
    setShowForm(false);
    setSubmitState({ status: "idle", message: "" });
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (provider: AiProvider) => {
    setFormLabel(provider.label);
    setFormType(provider.providerType);
    setFormBaseUrl(provider.baseUrl);
    setFormApiKey("");
    setFormDescription(provider.description ?? "");
    setFormPriority(provider.priority);
    setFormStatus(provider.status);
    setFormRateLimitRpm(
      provider.rateLimitRpm ? String(provider.rateLimitRpm) : "",
    );
    setFormRateLimitTpm(
      provider.rateLimitTpm ? String(provider.rateLimitTpm) : "",
    );
    setFormQuotaMonthly(
      provider.quotaMonthlyTokens
        ? String(provider.quotaMonthlyTokens)
        : "",
    );
    setEditingId(provider._id);
    setShowForm(true);
    setSubmitState({ status: "idle", message: "" });
  };

  const handleTypeChange = (value: AiProviderType) => {
    setFormType(value);
    if (!editingId) {
      const option = PROVIDER_TYPE_OPTIONS.find((o) => o.value === value);
      if (option?.defaultBaseUrl) {
        setFormBaseUrl(option.defaultBaseUrl);
      }
    }
  };

  const handleSubmit = async () => {
    setSubmitState({ status: "loading", message: "Saving..." });

    const body: Record<string, unknown> = {
      label: formLabel,
      providerType: formType,
      baseUrl: formBaseUrl,
      description: formDescription || undefined,
      priority: formPriority,
      status: formStatus,
      rateLimitRpm: formRateLimitRpm ? Number(formRateLimitRpm) : null,
      rateLimitTpm: formRateLimitTpm ? Number(formRateLimitTpm) : null,
      quotaMonthlyTokens: formQuotaMonthly ? Number(formQuotaMonthly) : null,
    };

    if (formApiKey) {
      body.apiKey = formApiKey;
    }

    if (!editingId) {
      body.apiKey = formApiKey;
    }

    try {
      const url = editingId
        ? `/api/ai-providers/${editingId}`
        : "/api/ai-providers";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as ApiResponse<AiProvider>;

      if (!payload.ok) {
        setSubmitState({
          status: "failed",
          message: payload.error ?? "Save failed.",
        });
        return;
      }

      setSubmitState({
        status: "success",
        message: editingId ? "Provider updated." : "Provider created.",
      });
      await fetchProviders();
      setTimeout(resetForm, 800);
    } catch {
      setSubmitState({ status: "failed", message: "Network error." });
    }
  };

  const handleDelete = async (providerId: string) => {
    try {
      const response = await fetch(`/api/ai-providers/${providerId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<unknown>;
      if (payload.ok) {
        await fetchProviders();
      }
    } catch {
      // silent
    }
  };

  const handleTest = async (providerId: string) => {
    setTestingId(providerId);
    setTestResult(null);

    try {
      const response = await fetch(
        `/api/ai-providers/${providerId}/test`,
        { method: "POST" },
      );
      const payload = (await response.json()) as ApiResponse<TestResult>;

      if (payload.ok && payload.data) {
        setTestResult({ providerId, result: payload.data });
      } else {
        setTestResult({
          providerId,
          result: {
            ok: false,
            modelCount: 0,
            latencyMs: 0,
            error: payload.error,
          },
        });
      }
    } catch {
      setTestResult({
        providerId,
        result: {
          ok: false,
          modelCount: 0,
          latencyMs: 0,
          error: "Network error.",
        },
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleStatus = async (
    provider: AiProvider,
  ) => {
    const newStatus: AiProviderStatus =
      provider.status === "active" ? "paused" : "active";

    try {
      await fetch(`/api/ai-providers/${provider._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchProviders();
    } catch {
      // silent
    }
  };

  return (
    <section className="border border-main bg-main">
      <header className="flex items-start justify-between gap-4 border-b border-main bg-secondary/45 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted" />
            <h1 className="truncate text-[15px] font-semibold text-main">
              {section.label}
            </h1>
          </div>
          <p className="mt-1 max-w-2xl text-[12px] leading-5 text-muted">
            {section.description}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={fetchProviders}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 border border-main bg-main px-3 py-1.5 text-[11px] font-semibold text-main hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 border border-accent/35 bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent hover:bg-accent/15"
          >
            <Plus className="h-3 w-3" />
            Add Provider
          </button>
        </div>
      </header>

      <div className="p-5">
        {loadError ? (
          <div className="border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <p className="text-[12px] font-medium text-rose-700">
              {loadError}
            </p>
          </div>
        ) : null}

        {showForm ? (
          <div className="mb-5 border border-main bg-secondary/20 p-5">
            <h2 className="text-[13px] font-semibold text-main">
              {editingId ? "Edit Provider" : "New AI Provider"}
            </h2>
            <p className="mt-1 text-[11px] text-muted">
              {editingId
                ? "Cập nhật thông tin provider. Để trống API key nếu không muốn thay đổi."
                : "Thêm một OpenAI-compatible AI provider mới."}
            </p>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Label *
                </span>
                <input
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="My Groq Account"
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Provider Type *
                </span>
                <select
                  value={formType}
                  onChange={(e) =>
                    handleTypeChange(e.target.value as AiProviderType)
                  }
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main"
                >
                  {PROVIDER_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Base URL *
                </span>
                <input
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="https://api.groq.com/openai/v1"
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] font-mono text-main outline-none placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  API Key {editingId ? "(leave blank to keep current)" : "*"}
                </span>
                <input
                  type="password"
                  value={formApiKey}
                  onChange={(e) => setFormApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] font-mono text-main outline-none placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Description
                </span>
                <input
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Free tier, rate limited..."
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Priority (0-100)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formPriority}
                  onChange={(e) => setFormPriority(Number(e.target.value))}
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Status
                </span>
                <select
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as AiProviderStatus)
                  }
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Rate Limit (req/min)
                </span>
                <input
                  type="number"
                  value={formRateLimitRpm}
                  onChange={(e) => setFormRateLimitRpm(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main placeholder:text-muted/60"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Rate Limit (tokens/min)
                </span>
                <input
                  type="number"
                  value={formRateLimitTpm}
                  onChange={(e) => setFormRateLimitTpm(e.target.value)}
                  placeholder="Optional"
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main placeholder:text-muted/60"
                />
              </label>

              <label className="block lg:col-span-2">
                <span className="mb-1 block text-[10px] font-semibold text-muted">
                  Monthly Token Quota
                </span>
                <input
                  type="number"
                  value={formQuotaMonthly}
                  onChange={(e) => setFormQuotaMonthly(e.target.value)}
                  placeholder="Optional (e.g. 1000000)"
                  className="w-full border border-main bg-main px-3 py-2 text-[12px] text-main placeholder:text-muted/60"
                />
              </label>
            </div>

            {submitState.status !== "idle" ? (
              <div
                className={`mt-3 border px-3 py-2 text-[11px] font-medium ${
                  submitState.status === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                    : submitState.status === "failed"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700"
                      : "border-main bg-secondary/30 text-main"
                }`}
              >
                {submitState.message}
              </div>
            ) : null}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={
                  submitState.status === "loading" ||
                  !formLabel.trim() ||
                  !formBaseUrl.trim() ||
                  (!editingId && !formApiKey.trim())
                }
                className="inline-flex items-center gap-2 border border-accent/35 bg-accent/10 px-4 py-2 text-[12px] font-semibold text-accent hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitState.status === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {editingId ? "Update" : "Create"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-main bg-main px-4 py-2 text-[12px] font-semibold text-main hover:bg-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {isLoading && providers.length === 0 ? (
          <div className="flex items-center gap-2 py-8 text-[12px] text-muted">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading providers...
          </div>
        ) : null}

        {!isLoading && providers.length === 0 && !loadError ? (
          <div className="border border-dashed border-main bg-secondary/20 px-5 py-8">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-muted" />
              <p className="text-[13px] font-semibold text-main">
                No AI providers configured
              </p>
            </div>
            <p className="mt-2 max-w-xl text-[12px] leading-5 text-muted">
              Thêm một AI provider để bắt đầu sử dụng cho translation, chat
              completion và các tính năng AI khác.
            </p>
          </div>
        ) : null}

        {providers.length > 0 ? (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider._id}
                className="border border-main bg-main transition-colors"
              >
                <div className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BrainCircuit className="h-3.5 w-3.5 text-muted" />
                      <p className="truncate text-[13px] font-semibold text-main">
                        {provider.label}
                      </p>
                      <StatusBadge status={provider.status} />
                    </div>
                    <p className="mt-1 text-[11px] font-mono text-muted">
                      {provider.baseUrl}
                    </p>
                    {provider.description ? (
                      <p className="mt-1 text-[11px] text-muted">
                        {provider.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleTest(provider._id)}
                      disabled={testingId === provider._id}
                      title="Test connection"
                      className="border border-main bg-main p-1.5 text-muted hover:bg-secondary hover:text-main disabled:opacity-60"
                    >
                      {testingId === provider._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(provider)}
                      title={
                        provider.status === "active" ? "Pause" : "Activate"
                      }
                      className="border border-main bg-main p-1.5 text-muted hover:bg-secondary hover:text-main"
                    >
                      {provider.status === "active" ? (
                        <PauseCircle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(provider)}
                      title="Edit"
                      className="border border-main bg-main p-1.5 text-muted hover:bg-secondary hover:text-main"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(provider._id)}
                      title="Delete"
                      className="border border-main bg-main p-1.5 text-muted hover:bg-secondary hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 border-t border-main px-4 py-2.5">
                  <div className="text-[10px]">
                    <span className="font-semibold text-muted">Type:</span>{" "}
                    <span className="text-main">{provider.providerType}</span>
                  </div>
                  <div className="text-[10px]">
                    <span className="font-semibold text-muted">
                      API Key:
                    </span>{" "}
                    <span className="font-mono text-main">
                      {provider.apiKeyPreview ?? "not set"}
                    </span>
                  </div>
                  <div className="text-[10px]">
                    <span className="font-semibold text-muted">
                      Priority:
                    </span>{" "}
                    <span className="text-main">{provider.priority}</span>
                  </div>
                  <div className="text-[10px]">
                    <span className="font-semibold text-muted">
                      Requests:
                    </span>{" "}
                    <span className="text-main">
                      {formatNumber(provider.usage.totalRequests)}
                    </span>
                  </div>
                  <div className="text-[10px]">
                    <span className="font-semibold text-muted">
                      Tokens:
                    </span>{" "}
                    <span className="text-main">
                      {formatNumber(provider.usage.totalTokensUsed)}
                    </span>
                  </div>
                  {provider.quotaMonthlyTokens ? (
                    <div className="text-[10px]">
                      <span className="font-semibold text-muted">
                        Quota:
                      </span>{" "}
                      <span className="text-main">
                        {formatNumber(provider.quotaMonthlyTokens)}/mo
                      </span>
                    </div>
                  ) : null}
                  {provider.rateLimitRpm ? (
                    <div className="text-[10px]">
                      <span className="font-semibold text-muted">RPM:</span>{" "}
                      <span className="text-main">
                        {provider.rateLimitRpm}
                      </span>
                    </div>
                  ) : null}
                  {provider.usage.lastUsedAt ? (
                    <div className="text-[10px]">
                      <span className="font-semibold text-muted">
                        Last used:
                      </span>{" "}
                      <span className="text-main">
                        {new Date(
                          provider.usage.lastUsedAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  ) : null}
                </div>

                {testResult?.providerId === provider._id ? (
                  <div
                    className={`border-t px-4 py-2.5 text-[11px] ${
                      testResult.result.ok
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                        : "border-rose-500/30 bg-rose-500/5 text-rose-700"
                    }`}
                  >
                    {testResult.result.ok ? (
                      <p>
                        Connection OK — {testResult.result.modelCount} models
                        available — {testResult.result.latencyMs}ms latency
                      </p>
                    ) : (
                      <p>
                        Connection failed:{" "}
                        {testResult.result.error ?? "Unknown error"}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
