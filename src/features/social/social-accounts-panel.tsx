"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Edit3, Plus, RefreshCw, Trash2 } from "lucide-react";

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

const PLATFORM_GUIDES: Record<
  SocialPlatform,
  {
    title: string;
    recommended: string;
    notes: string[];
    scopes: string;
    quickSetup: string[];
  }
> = {
  facebook: {
    title: "Facebook Reels / Video",
    recommended: "Prefer OAuth later; use Manual for planning-only accounts now.",
    scopes: "pages_manage_posts, pages_read_engagement",
    quickSetup: [
      "Configure Meta app credentials in .env.",
      "Save the account, then connect OAuth from edit mode.",
      "Use Page ID when publishing to a page.",
    ],
    notes: [
      "Use Page ID when publishing to a page.",
      "Long-lived Page tokens still need lifecycle handling; raw token entry is only a fallback.",
    ],
  },
  tiktok: {
    title: "TikTok Video",
    recommended: "Prefer OAuth later; use Manual until publish adapter is enabled.",
    scopes: "video.upload, video.publish",
    quickSetup: [
      "Configure TikTok app credentials in .env.",
      "Confirm app review/eligibility before real publish.",
      "Save the account, then connect OAuth from edit mode.",
    ],
    notes: [
      "TikTok publish APIs require app review/eligibility.",
      "Manual tokens are inconvenient and should not be the primary long-term workflow.",
    ],
  },
  shopee: {
    title: "Shopee Product Video",
    recommended: "Use Manual or API Key metadata first; real shop authorization comes later.",
    scopes: "shop_authorization, product_write",
    quickSetup: [
      "Configure Shopee partner credentials in .env.",
      "Record Shop ID for product/video mapping.",
      "Use full OAuth/shop authorization when adapter is enabled.",
    ],
    notes: [
      "Shop ID is useful for planning product/video mapping.",
      "Real publish must verify shop/product permissions before posting.",
    ],
  },
  youtube: {
    title: "YouTube Shorts / Video",
    recommended: "Prefer OAuth later with offline refresh token storage.",
    scopes: "youtube.upload",
    quickSetup: [
      "Enable YouTube Data API v3 in Google Cloud.",
      "Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and SOCIAL_OAUTH_BASE_URL.",
      "Add the redirect URI below to Authorized redirect URIs.",
      "Save account, edit it, then Connect OAuth.",
    ],
    notes: [
      "Channel ID helps identify the target channel before OAuth is wired.",
      "Raw access tokens expire quickly; OAuth refresh flow is the maintainable option.",
    ],
  },
};

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
    connected: "border-emerald-200 bg-emerald-50 text-emerald-700",
    needs_auth: "border-amber-200 bg-amber-50 text-amber-700",
    paused: "border-amber-200 bg-amber-50 text-amber-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
  };

  return (
    <span
      className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${classes[status]}`}
    >
      {status.replace("_", " ")}
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
  const [modalStatus, setModalStatus] = useState<
    "idle" | "loading" | "success" | "failed"
  >("idle");
  const [modalMessage, setModalMessage] = useState("Ready.");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM);

  const activeCount = useMemo(
    () => accounts.filter((account) => account.status === "connected").length,
    [accounts],
  );
  const platformGuide = PLATFORM_GUIDES[form.platform];
  const oauthBaseUrl =
    typeof window === "undefined" ? "" : window.location.origin;
  const redirectUri = `${oauthBaseUrl}/api/social/oauth/callback/${form.platform}`;
  const openTutorialDocs = () => {
    window.dispatchEvent(
      new CustomEvent("omnivideo:navigate", { detail: "tutorialDocs" }),
    );
  };

  const openCreateForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalStatus("idle");
    setModalMessage("Create the account, then use Connect OAuth from edit mode.");
    setShowForm(true);
  };

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
    setModalStatus("loading");
    setModalMessage(
      editingId ? "Updating social account..." : "Creating account...",
    );

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
            authMode: form.authMode,
            channelTags: splitCsv(form.channelTags),
            permissionScopes: splitCsv(form.permissionScopes),
            secrets: compactSecrets(form),
          }),
        },
      );
      const payload = (await response.json()) as ApiResponse<SocialAccount>;

      if (!response.ok || !payload.ok || !payload.data) {
        setModalStatus("failed");
        setModalMessage(payload.error ?? "Could not save social account.");
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setModalStatus("idle");
      setModalMessage("Ready.");
      await loadAccounts();
      setMessage(editingId ? "Social account updated." : "Social account created.");
    } catch (error) {
      setModalStatus("failed");
      setModalMessage(
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
      setModalStatus("idle");
      setModalMessage("Use Connect OAuth to verify the account with the platform.");
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

  const connectOAuth = async () => {
    if (!editingId) {
      setModalStatus("failed");
      setModalMessage("Save the social account before starting OAuth.");
      return;
    }

    setModalStatus("loading");
    setModalMessage("Preparing OAuth redirect...");

    try {
      const response = await fetch(
        `/api/social/oauth/start?platform=${form.platform}&accountId=${editingId}`,
        { method: "GET", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
        missing?: string[];
      };

      if (!response.ok || !payload.ok || !payload.url) {
        setModalStatus("failed");
        setModalMessage(
          payload.error ??
            `Missing OAuth config: ${(payload.missing ?? []).join(", ")}`,
        );
        return;
      }

      window.location.href = payload.url;
    } catch (error) {
      setModalStatus("failed");
      setModalMessage(error instanceof Error ? error.message : "OAuth start failed.");
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
              openCreateForm();
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
        <span className="ml-3">Connected: {activeCount}</span>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
          <form
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto border border-main bg-main shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void saveAccount();
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
              <div>
                <p className="text-[12px] font-semibold text-main">
                  {editingId ? "Edit Social Account" : "New Social Account"}
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  OAuth should be the long-term default. Manual token entry is only a fallback for planning, diagnostics, or temporary adapter testing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setModalStatus("idle");
                  setModalMessage("Ready.");
                }}
                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
              >
                Close
              </button>
            </div>

            <div
              className={`border-b border-main px-4 py-3 text-[12px] ${
                modalStatus === "failed"
                  ? "bg-rose-50 text-rose-700"
                  : modalStatus === "success"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-secondary/20 text-muted"
              }`}
            >
              <span className="font-bold uppercase">{modalStatus}</span>
              <span className="ml-2">{modalMessage}</span>
            </div>

            <div className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_280px]">
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
            <div className="border border-main bg-secondary/20 px-3 py-2">
              <p className="text-[12px] font-medium text-main">
                Connection Status
              </p>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Status is system-controlled. It becomes connected only after OAuth callback succeeds.
              </p>
            </div>
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

              <aside className="border border-main bg-secondary/25 p-3">
                <p className="text-[12px] font-semibold text-main">
                  {platformGuide.title}
                </p>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  {platformGuide.recommended}
                </p>
                <div className="mt-3 border border-main bg-main p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Quick setup
                  </p>
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-5 text-muted">
                    {platformGuide.quickSetup.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div className="mt-3 border border-main bg-main p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Common scopes
                  </p>
                  <p className="mt-1 text-[11px] text-main">
                    {platformGuide.scopes}
                  </p>
                </div>
                <div className="mt-3 border border-main bg-main p-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Redirect URI
                  </p>
                  <p className="mt-1 break-all font-mono text-[11px] text-main">
                    {redirectUri}
                  </p>
                </div>
                <ul className="mt-3 space-y-1 text-[11px] leading-5 text-muted">
                  {platformGuide.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={openTutorialDocs}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 border border-main bg-main px-3 py-2 text-[11px] font-semibold text-main hover:bg-secondary"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Open Tutor Docs
                </button>
              </aside>
            </div>

            <div className="flex gap-2 border-t border-main bg-secondary/25 px-4 py-3">
              {editingId ? (
                <button
                  type="button"
                  onClick={() => void connectOAuth()}
                  className="border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary"
                >
                  Connect OAuth
                </button>
              ) : null}
              <button
                type="submit"
                className="btn-success border px-3 py-1.5 text-[12px] font-semibold"
              >
                {editingId ? "Update Account" : "Create Account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                  setModalStatus("idle");
                  setModalMessage("Ready.");
                }}
                className="border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
