"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
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

type EditableStorageProviderAccount = Omit<StorageProviderAccount, "secretSummary"> & {
  secrets: Partial<SecretFormState>;
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
  driveServiceAccountJson: string;
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
    help: "Service account JSON key + optional folder.",
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
  driveServiceAccountJson: "",
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
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
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

  const resetForm = () => {
    setProviderType("telegram");
    setLabel("");
    setDescription("");
    setPriority(50);
    setTags("raw, primary");
    setSecrets(EMPTY_SECRETS);
    setEditingProviderId(null);
  };

  const onDriveJsonFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const rawJson = (await file.text()).trim();
      const parsed = JSON.parse(rawJson) as Record<string, unknown>;
      const clientEmail =
        typeof parsed.client_email === "string" ? parsed.client_email.trim() : "";
      const privateKey =
        typeof parsed.private_key === "string" ? parsed.private_key.trim() : "";

      if (!clientEmail || !privateKey) {
        setState({
          status: "failed",
          message:
            "Service Account JSON missing client_email/private_key. Check file key.",
          errorCode: "VAL_DRIVE_SERVICE_ACCOUNT_JSON_INVALID",
        });
        return;
      }

      updateSecret("driveServiceAccountJson", rawJson);
      setState({
        status: "success",
        message: `Loaded Drive Service Account key from ${file.name}.`,
      });
    } catch {
      setState({
        status: "failed",
        message: "Could not read Service Account JSON file.",
        errorCode: "VAL_DRIVE_SERVICE_ACCOUNT_JSON_PARSE_FAILED",
      });
    }
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

  const saveProvider = async () => {
    const isEditing = Boolean(editingProviderId);
    setState({
      status: "loading",
      message: isEditing
        ? "Updating storage provider..."
        : "Creating storage provider...",
    });

    try {
      const response = await fetch(
        isEditing
          ? `/api/storage/providers/${editingProviderId}`
          : "/api/storage/providers",
        {
          method: isEditing ? "PATCH" : "POST",
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
        },
      );
      const payload = (await response.json()) as ApiResponse<StorageProviderAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not save storage provider.",
          errorCode: payload.errorCode,
        });
        return;
      }

      setProviders((previous) => {
        if (!isEditing) {
          return [payload.data as StorageProviderAccount, ...previous];
        }

        return previous.map((provider) =>
          provider._id === editingProviderId
            ? (payload.data as StorageProviderAccount)
            : provider,
        );
      });
      resetForm();
      setShowCreateForm(false);
      setState({
        status: "success",
        message: isEditing
          ? "Storage provider updated."
          : "Storage provider saved with masked secrets.",
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not save storage provider.",
      });
    }
  };

  const deleteProvider = async (providerId: string) => {
    setState({ status: "loading", message: "Deleting storage provider..." });

    try {
      const response = await fetch(`/api/storage/providers/${providerId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<StorageProviderAccount>;

      if (!response.ok || !payload.ok) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not delete storage provider.",
          errorCode: payload.errorCode,
        });
        return;
      }

      setProviders((previous) =>
        previous.filter((provider) => provider._id !== providerId),
      );
      setState({
        status: "success",
        message: "Storage provider deleted.",
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not delete storage provider.",
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

  const openCreateForm = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const openEditForm = async (provider: StorageProviderAccount) => {
    setState({
      status: "loading",
      message: `Loading config for ${provider.label}...`,
    });

    try {
      const response = await fetch(`/api/storage/providers/${provider._id}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<EditableStorageProviderAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setState({
          status: "failed",
          message: payload.error ?? "Could not load storage provider config.",
          errorCode: payload.errorCode,
        });
        return;
      }

      const editableProvider = payload.data;
      setEditingProviderId(editableProvider._id);
      setProviderType(editableProvider.providerType);
      setLabel(editableProvider.label);
      setDescription(editableProvider.description ?? "");
      setPriority(editableProvider.priority);
      setTags(editableProvider.tags.join(", "));
      setSecrets({
        ...EMPTY_SECRETS,
        ...editableProvider.secrets,
      });
      setShowCreateForm(true);
      setState({
        status: "success",
        message: `Loaded config for ${editableProvider.label}.`,
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not load storage provider config.",
      });
    }
  };

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
            onClick={openCreateForm}
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
                        <button
                          type="button"
                          onClick={() => {
                            void openEditForm(provider);
                          }}
                          className="inline-flex items-center gap-1.5 border border-main bg-secondary px-2.5 py-1.5 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                        >
                          Edit
                        </button>
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
                            className="btn-success inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Activate
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm(`Delete storage provider "${provider.label}"?`)) {
                              return;
                            }
                            void deleteProvider(provider._id);
                          }}
                          className="btn-danger inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                        >
                          Delete
                        </button>
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
              void saveProvider();
            }}
          >
            <div className="flex items-center justify-between border-b border-main bg-secondary/35 px-4 py-3">
              <div>
                <p className="text-[12px] font-semibold text-main">
                  {editingProviderId ? "Edit Storage Account" : "New Storage Account"}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Secret values are write-only from the browser view.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
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
                  disabled={Boolean(editingProviderId)}
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
                      <label className="block">
                        <span className="text-[12px] font-medium text-main">
                          Service Account JSON key
                        </span>
                        <div className="mt-1 space-y-2 border border-main bg-main p-2">
                          <input
                            type="file"
                            accept=".json,application/json"
                            onChange={(event) => {
                              void onDriveJsonFileChange(event);
                            }}
                            className="w-full text-[12px] text-main file:mr-2 file:border file:border-main file:bg-secondary file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-main"
                          />
                          <textarea
                            value={secrets.driveServiceAccountJson}
                            onChange={(event) =>
                              updateSecret(
                                "driveServiceAccountJson",
                                event.target.value,
                              )
                            }
                            rows={7}
                            placeholder='{"type":"service_account","client_email":"...","private_key":"..."}'
                            className="w-full resize-y border border-main bg-main px-3 py-2 font-mono text-[12px] text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent"
                          />
                        </div>
                      </label>
                      <SecretInput
                        label="Access Token (legacy optional)"
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
                {editingProviderId ? "Update Provider" : "Save Provider"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
