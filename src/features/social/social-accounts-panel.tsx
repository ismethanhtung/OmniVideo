"use client";

import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

import {
  formatPlatform,
  formatPublishType,
  type ApiResponse,
  type SocialAccount,
  type SocialAuthMode,
  type SocialPlatform,
} from "./social-types";

type SocialAccountsPanelProps = {
  section: LeftbarNavItem;
};

type AccountFormState = {
  platform: SocialPlatform;
  label: string;
  displayName: string;
  handle: string;
  accountId: string;
  status: "active" | "paused" | "error";
  authMode: SocialAuthMode;
  channelTags: string;
  permissionScopes: string;
  accessToken: string;
  refreshToken: string;
  appId: string;
  appSecret: string;
  pageId: string;
  shopId: string;
  channelId: string;
  connectionJson: string;
};

const EMPTY_FORM: AccountFormState = {
  platform: "tiktok",
  label: "",
  displayName: "",
  handle: "",
  accountId: "",
  status: "active",
  authMode: "manual",
  channelTags: "shorts, primary",
  permissionScopes: "",
  accessToken: "",
  refreshToken: "",
  appId: "",
  appSecret: "",
  pageId: "",
  shopId: "",
  channelId: "",
  connectionJson: "",
};

const PLATFORM_OPTIONS: SocialPlatform[] = [
  "facebook",
  "tiktok",
  "shopee",
  "youtube",
];

function splitCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function compactSecrets(form: AccountFormState) {
  return Object.fromEntries(
    [
      ["accessToken", form.accessToken],
      ["refreshToken", form.refreshToken],
      ["appId", form.appId],
      ["appSecret", form.appSecret],
      ["pageId", form.pageId],
      ["shopId", form.shopId],
      ["channelId", form.channelId],
      ["connectionJson", form.connectionJson],
    ].filter(([, value]) => value.trim()),
  );
}

function StatusBadge({ status }: { status: SocialAccount["status"] }) {
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

export function SocialAccountsPanel({ section }: SocialAccountsPanelProps) {
  const Icon = section.icon;
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [message, setMessage] = useState("Ready.");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);

  const activeCount = useMemo(
    () => accounts.filter((account) => account.status === "active").length,
    [accounts],
  );

  const loadAccounts = async () => {
    setStatus("loading");
    setMessage("Loading social accounts...");

    try {
      const response = await fetch("/api/social/accounts", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<SocialAccount[]>;

      if (!response.ok || !payload.ok) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not load social accounts.");
        return;
      }

      setAccounts(payload.data ?? []);
      setStatus("ready");
      setMessage(`Loaded ${(payload.data ?? []).length} social accounts.`);
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not load social accounts.",
      );
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const saveAccount = async () => {
    setStatus("loading");
    setMessage(editingId ? "Updating social account..." : "Creating account...");

    try {
      const response = await fetch(
        editingId ? `/api/social/accounts/${editingId}` : "/api/social/accounts",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            platform: form.platform,
            label: form.label,
            displayName: form.displayName,
            handle: form.handle,
            accountId: form.accountId,
            status: form.status,
            authMode: form.authMode,
            channelTags: splitCsv(form.channelTags),
            permissionScopes: splitCsv(form.permissionScopes),
            secrets: compactSecrets(form),
          }),
        },
      );
      const payload = (await response.json()) as ApiResponse<SocialAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not save social account.");
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAccounts();
      setMessage(editingId ? "Social account updated." : "Social account created.");
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not save social account.",
      );
    }
  };

  const editAccount = async (accountId: string) => {
    setStatus("loading");
    setMessage("Loading editable account...");

    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<
        SocialAccount & { secrets?: Partial<Record<keyof AccountFormState, string>> }
      >;

      if (!response.ok || !payload.ok || !payload.data) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not load social account.");
        return;
      }

      const account = payload.data;
      setEditingId(accountId);
      setForm({
        ...EMPTY_FORM,
        platform: account.platform,
        label: account.label,
        displayName: account.displayName ?? "",
        handle: account.handle ?? "",
        accountId: account.accountId ?? "",
        status: account.status,
        authMode: account.authMode,
        channelTags: account.channelTags.join(", "),
        permissionScopes: account.permissionScopes.join(", "),
        accessToken: account.secrets?.accessToken ?? "",
        refreshToken: account.secrets?.refreshToken ?? "",
        appId: account.secrets?.appId ?? "",
        appSecret: account.secrets?.appSecret ?? "",
        pageId: account.secrets?.pageId ?? "",
        shopId: account.secrets?.shopId ?? "",
        channelId: account.secrets?.channelId ?? "",
        connectionJson: account.secrets?.connectionJson ?? "",
      });
      setShowForm(true);
      setStatus("ready");
      setMessage("Editable account loaded.");
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not load social account.",
      );
    }
  };

  const deleteAccount = async (accountId: string) => {
    setStatus("loading");
    setMessage("Deleting social account...");

    try {
      const response = await fetch(`/api/social/accounts/${accountId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as ApiResponse<SocialAccount>;

      if (!response.ok || !payload.ok) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not delete social account.");
        return;
      }

      setAccounts((previous) =>
        previous.filter((account) => account._id !== accountId),
      );
      setStatus("ready");
      setMessage("Social account deleted.");
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not delete social account.",
      );
    }
  };

  return (
    <section className="overflow-hidden border border-main bg-main">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-main bg-secondary/45 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted" />
            <h1 className="text-[15px] font-semibold text-main">
              {section.label}
            </h1>
          </div>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-muted">
            {section.description}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setForm(EMPTY_FORM);
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary/75"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Account
          </button>
          <button
            type="button"
            onClick={() => void loadAccounts()}
            disabled={status === "loading"}
            className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </header>

      <div className="border-b border-main bg-secondary/25 px-5 py-3 text-[12px] text-muted">
        <span className="inline-flex border border-main bg-main px-2 py-1 text-[10px] font-bold uppercase">
          {status}
        </span>
        <span className="ml-3">{message}</span>
        <span className="ml-3">Active: {activeCount}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="border-b border-main bg-secondary/45 text-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Account</th>
              <th className="px-4 py-2 font-semibold">Platform</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Formats</th>
              <th className="px-4 py-2 font-semibold">Scopes</th>
              <th className="px-4 py-2 font-semibold">Secrets</th>
              <th className="px-4 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={7}>
                  Chưa có social account nào.
                </td>
              </tr>
            ) : (
              accounts.map((account) => (
                <tr key={account._id} className="border-b border-main">
                  <td className="px-4 py-3">
                    <p className="font-medium text-main">{account.label}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {account.displayName ?? account.handle ?? account.accountId ?? "-"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-main">
                    {formatPlatform(account.platform)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={account.status} />
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-muted">
                    {account.supportedFormats.map(formatPublishType).join(", ")}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-muted">
                    {account.permissionScopes.join(", ") || "-"}
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-muted">
                    {Object.entries(account.secretSummary)
                      .filter(([, summary]) => summary.configured)
                      .map(([key, summary]) => `${key}:${summary.preview}`)
                      .join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void editAccount(account._id)}
                        className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                      >
                        <Edit3 className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteAccount(account._id)}
                        className="btn-danger inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-semibold"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="border-t border-main bg-secondary/30 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-[12px] font-medium text-main">
              Platform
              <select
                value={form.platform}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    platform: event.target.value as SocialPlatform,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                {PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform} value={platform}>
                    {formatPlatform(platform)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-medium text-main">
              Label
              <input
                value={form.label}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, label: event.target.value }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Auth Mode
              <select
                value={form.authMode}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    authMode: event.target.value as SocialAuthMode,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                <option value="manual">Manual</option>
                <option value="oauth">OAuth</option>
                <option value="access_token">Access Token</option>
                <option value="api_key">API Key</option>
                <option value="not_configured">Not Configured</option>
              </select>
            </label>
            <label className="text-[12px] font-medium text-main">
              Display Name
              <input
                value={form.displayName}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    displayName: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Handle
              <input
                value={form.handle}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, handle: event.target.value }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Platform Account ID
              <input
                value={form.accountId}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    accountId: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Tags
              <input
                value={form.channelTags}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    channelTags: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Permission Scopes
              <input
                value={form.permissionScopes}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    permissionScopes: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    status: event.target.value as AccountFormState["status"],
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="error">Error</option>
              </select>
            </label>
            {[
              "accessToken",
              "refreshToken",
              "appId",
              "appSecret",
              "pageId",
              "shopId",
              "channelId",
              "connectionJson",
            ].map((key) => (
              <label key={key} className="text-[12px] font-medium text-main">
                {key}
                <input
                  type="password"
                  value={form[key as keyof AccountFormState]}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      [key]: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveAccount()}
              className="btn-success border px-3 py-1.5 text-[12px] font-semibold"
            >
              {editingId ? "Update Account" : "Create Account"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
