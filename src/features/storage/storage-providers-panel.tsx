"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  CheckCircle2,
  Database,
  HardDrive,
  PauseCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Vault,
} from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

type ProviderType = "telegram" | "drive" | "s3" | "local" | "other";
type ProviderStatus = "active" | "paused" | "error";

type StorageProviderAccount = {
  _id: string;
  providerType: ProviderType;
  label: string;
  description: string | null;
  status: ProviderStatus;
  priority: number;
  tags: string[];
  secretSummary: Record<string, { configured: boolean; preview: string | null }>;
  usage: {
    assetCountApprox: number;
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

type SecretFormState = {
  botToken: string;
  chatId: string;
  accessToken: string;
  folderId: string;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  basePath: string;
  connectionJson: string;
};

type SubmitState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "failed"; message: string; errorCode?: string };

const PROVIDER_OPTIONS: Array<{
  value: ProviderType;
  label: string;
  icon: typeof Vault;
  help: string;
}> = [
  {
    value: "telegram",
    label: "Telegram",
    icon: Vault,
    help: "Bot token + chat vault.",
  },
  {
    value: "drive",
    label: "Google Drive",
    icon: HardDrive,
    help: "Access token + optional folder.",
  },
  {
    value: "s3",
    label: "S3-compatible",
    icon: Archive,
    help: "Endpoint, bucket, access key.",
  },
  {
    value: "local",
    label: "Local",
    icon: Database,
    help: "Dev filesystem path.",
  },
  {
    value: "other",
    label: "Other",
    icon: ShieldCheck,
    help: "Custom JSON secret config.",
  },
];

const EMPTY_SECRETS: SecretFormState = {
  botToken: "",
  chatId: "",
  accessToken: "",
  folderId: "",
  endpoint: "",
  bucket: "",
  region: "",
  accessKeyId: "",
  secretAccessKey: "",
  basePath: "",
  connectionJson: "",
};

function compactSecretPayload(secrets: SecretFormState) {
  return Object.fromEntries(
    Object.entries(secrets)
      .map(([key, value]) => [key, value.trim()])
      .filter(([, value]) => value),
  );
}

function providerLabel(providerType: ProviderType) {
  return PROVIDER_OPTIONS.find((option) => option.value === providerType)?.label;
}

function StatusBadge({ status }: { status: ProviderStatus }) {
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

function SecretInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-main">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
      />
    </label>
  );
}

type StorageProvidersPanelProps = {
  section: LeftbarNavItem;
};

export function StorageProvidersPanel({ section }: StorageProvidersPanelProps) {
  const Icon = section.icon;
  const [providers, setProviders] = useState<StorageProviderAccount[]>([]);
  const [providerType, setProviderType] = useState<ProviderType>("telegram");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(50);
  const [tags, setTags] = useState("raw, primary");
  const [secrets, setSecrets] = useState<SecretFormState>(EMPTY_SECRETS);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [state, setState] = useState<SubmitState>({
    status: "idle",
    message: "Ready.",
  });

  const activeCount = useMemo(
    () => providers.filter((provider) => provider.status === "active").length,
    [providers],
  );

  const updateSecret = (key: keyof SecretFormState, value: string) => {
    setSecrets((previous) => ({ ...previous, [key]: value }));
  };

  const loadProviders = async () => {
    setState({ status: "loading", message: "Loading storage providers..." });

    try {
      const response = await fetch("/api/storage/providers", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<
        StorageProviderAccount[]
      >;

      if (!response.ok || !payload.ok) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not load storage providers.",
          errorCode: payload.errorCode,
        });
        return;
      }

      setProviders(payload.data ?? []);
      setState({
        status: "success",
        message: `Loaded ${(payload.data ?? []).length} storage providers.`,
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error ? error.message : "Could not load providers.",
      });
    }
  };

  const createProvider = async () => {
    setState({ status: "loading", message: "Creating storage provider..." });

    try {
      const response = await fetch("/api/storage/providers", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          providerType,
          label,
          description,
          priority,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          secrets: compactSecretPayload(secrets),
        }),
      });
      const payload = (await response.json()) as ApiResponse<StorageProviderAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not create storage provider.",
          errorCode: payload.errorCode,
        });
        return;
      }

      setProviders((previous) => [payload.data as StorageProviderAccount, ...previous]);
      setLabel("");
      setDescription("");
      setPriority(50);
      setTags("raw, primary");
      setSecrets(EMPTY_SECRETS);
      setShowCreateForm(false);
      setState({
        status: "success",
        message: "Storage provider saved with masked secrets.",
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not create storage provider.",
      });
    }
  };

  const updateStatus = async (providerId: string, status: ProviderStatus) => {
    setState({ status: "loading", message: "Updating provider status..." });

    try {
      const response = await fetch(`/api/storage/providers/${providerId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as ApiResponse<StorageProviderAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not update provider status.",
          errorCode: payload.errorCode,
        });
        return;
      }

      setProviders((previous) =>
        previous.map((provider) =>
          provider._id === providerId ? (payload.data as StorageProviderAccount) : provider,
        ),
      );
      setState({ status: "success", message: "Provider status updated." });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not update provider status.",
      });
    }
  };

  useEffect(() => {
    void loadProviders();
  }, []);

  return (
    <section className="overflow-hidden border border-main bg-main">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-main bg-secondary/45 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted" />
            <h1 className="text-[15px] font-semibold text-main">{section.label}</h1>
          </div>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
            {section.description}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
          <button
            type="button"
            onClick={() => {
              void loadProviders();
            }}
            disabled={state.status === "loading"}
            className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <div className="px-5 py-5">
        <div className="border border-main">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
            <div>
              <p className="text-[12px] font-semibold text-main">
                Provider Accounts
              </p>
              <p className="mt-1 text-[11px] text-muted">
                {activeCount} active / {providers.length} total.
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                {state.status}
              </span>
              <p className="mt-1 text-[11px] text-muted">{state.message}</p>
              {state.status === "failed" && state.errorCode ? (
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {state.errorCode}
                </p>
              ) : null}
            </div>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {providers.length === 0 ? (
              <div className="px-4 py-10 text-[12px] text-muted">
                Chưa có storage provider account nào.
              </div>
            ) : (
              providers.map((provider) => {
                const option = PROVIDER_OPTIONS.find(
                  (entry) => entry.value === provider.providerType,
                );
                const ProviderIcon = option?.icon ?? Vault;

                return (
                  <article key={provider._id} className="bg-main px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <ProviderIcon className="h-4 w-4 shrink-0 text-muted" />
                          <p className="truncate text-[13px] font-semibold text-main">
                            {provider.label}
                          </p>
                          <StatusBadge status={provider.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {providerLabel(provider.providerType)} · priority{" "}
                          {provider.priority}
                        </p>
                        {provider.description ? (
                          <p className="mt-2 max-w-3xl text-[12px] leading-5 text-muted">
                            {provider.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex gap-2">
                        {provider.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => {
                              void updateStatus(provider._id, "paused");
                            }}
                            className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                          >
                            <PauseCircle className="h-3.5 w-3.5" />
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              void updateStatus(provider._id, "active");
                            }}
                            className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activate
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-3">
                      <div className="border border-main bg-secondary/20 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Usage
                        </p>
                        <p className="mt-1 text-[12px] text-main">
                          {provider.usage.assetCountApprox} assets approx
                        </p>
                      </div>
                      <div className="border border-main bg-secondary/20 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Tags
                        </p>
                        <p className="mt-1 truncate text-[12px] text-main">
                          {provider.tags.length > 0 ? provider.tags.join(", ") : "-"}
                        </p>
                      </div>
                      <div className="border border-main bg-secondary/20 px-3 py-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                          Secrets
                        </p>
                        <p className="mt-1 truncate font-mono text-[11px] text-main">
                          {Object.entries(provider.secretSummary)
                            .filter(([, value]) => value.configured)
                            .map(([key, value]) => `${key}:${value.preview}`)
                            .join(" · ") || "-"}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showCreateForm ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-main bg-main shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void createProvider();
            }}
          >
            <div className="flex items-center justify-between border-b border-main bg-secondary/35 px-4 py-3">
              <div>
                <p className="text-[12px] font-semibold text-main">New Storage Account</p>
                <p className="mt-1 text-[11px] text-muted">
                  Secret values are write-only from the browser view.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <label className="block">
                <span className="text-[12px] font-medium text-main">Provider</span>
                <select
                  value={providerType}
                  onChange={(event) => setProviderType(event.target.value as ProviderType)}
                  className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                >
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-main">Label</span>
                <input
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Main Telegram vault"
                  className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <label className="block">
                <span className="text-[12px] font-medium text-main">Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  placeholder="Internal storage role"
                  className="mt-1 w-full resize-none border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[12px] font-medium text-main">Priority</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={priority}
                    onChange={(event) => setPriority(Number(event.target.value))}
                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                  />
                </label>
                <label className="block">
                  <span className="text-[12px] font-medium text-main">Tags</span>
                  <input
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px] text-main outline-none transition-colors focus:border-accent"
                  />
                </label>
              </div>

              <div className="border-t border-main pt-4">
                <p className="mb-3 text-[12px] font-semibold text-main">Secret Configuration</p>
                <div className="space-y-3">
                  {providerType === "telegram" ? (
                    <>
                      <SecretInput
                        label="Bot Token"
                        value={secrets.botToken}
                        onChange={(value) => updateSecret("botToken", value)}
                      />
                      <SecretInput
                        label="Chat ID"
                        value={secrets.chatId}
                        onChange={(value) => updateSecret("chatId", value)}
                      />
                    </>
                  ) : null}
                  {providerType === "drive" ? (
                    <>
                      <SecretInput
                        label="Access Token"
                        value={secrets.accessToken}
                        onChange={(value) => updateSecret("accessToken", value)}
                      />
                      <SecretInput
                        label="Folder ID optional"
                        value={secrets.folderId}
                        onChange={(value) => updateSecret("folderId", value)}
                      />
                    </>
                  ) : null}
                  {providerType === "s3" ? (
                    <>
                      <SecretInput
                        label="Endpoint"
                        value={secrets.endpoint}
                        onChange={(value) => updateSecret("endpoint", value)}
                      />
                      <SecretInput
                        label="Bucket"
                        value={secrets.bucket}
                        onChange={(value) => updateSecret("bucket", value)}
                      />
                      <SecretInput
                        label="Access Key ID"
                        value={secrets.accessKeyId}
                        onChange={(value) => updateSecret("accessKeyId", value)}
                      />
                      <SecretInput
                        label="Secret Access Key"
                        value={secrets.secretAccessKey}
                        onChange={(value) => updateSecret("secretAccessKey", value)}
                      />
                      <SecretInput
                        label="Region optional"
                        value={secrets.region}
                        onChange={(value) => updateSecret("region", value)}
                      />
                    </>
                  ) : null}
                  {providerType === "local" ? (
                    <SecretInput
                      label="Base Path"
                      value={secrets.basePath}
                      onChange={(value) => updateSecret("basePath", value)}
                      placeholder="/tmp/omnivideo-assets"
                    />
                  ) : null}
                  {providerType === "other" ? (
                    <label className="block">
                      <span className="text-[12px] font-medium text-main">
                        Connection JSON
                      </span>
                      <textarea
                        value={secrets.connectionJson}
                        onChange={(event) =>
                          updateSecret("connectionJson", event.target.value)
                        }
                        rows={4}
                        placeholder='{"token":"...","endpoint":"..."}'
                        className="mt-1 w-full resize-none border border-main bg-main px-3 py-2 font-mono text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                      />
                    </label>
                  ) : null}
                </div>
              </div>

              <button
                type="submit"
                disabled={state.status === "loading"}
                className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-2 text-[12px] font-semibold text-main transition-colors hover:bg-secondary/75 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="h-3.5 w-3.5" />
                Save Provider
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
