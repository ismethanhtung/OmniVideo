"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

import {
  formatPlatform,
  formatPublishType,
  type ApiResponse,
  type SocialAccount,
  type SocialPublishType,
} from "./social-types";

type PublishRecordsPanelProps = {
  section: LeftbarNavItem;
};

type StoredVideoAsset = {
  _id: string;
  metadata?: { title?: string | null };
  storageProvider: string;
};

type PublishRecord = {
  _id: string;
  assetId: string;
  socialAccountId: string;
  platform: SocialAccount["platform"];
  publishType: SocialPublishType;
  status: string;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  scheduledAt: string | null;
  retryCount: number;
  errorCode: string | null;
  socialAccount?: { label?: string; displayName?: string | null };
  asset?: { title?: string | null; storageProvider?: string };
};

type FormState = {
  assetId: string;
  socialAccountId: string;
  publishType: SocialPublishType | "";
  title: string;
  caption: string;
  hashtags: string;
  scheduledAt: string;
};

const EMPTY_FORM: FormState = {
  assetId: "",
  socialAccountId: "",
  publishType: "",
  title: "",
  caption: "",
  hashtags: "",
  scheduledAt: "",
};

function splitCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function PublishRecordsPanel({ section }: PublishRecordsPanelProps) {
  const Icon = section.icon;
  const [records, setRecords] = useState<PublishRecord[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [assets, setAssets] = useState<StoredVideoAsset[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [message, setMessage] = useState("Ready.");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const selectedAccount = useMemo(
    () => accounts.find((account) => account._id === form.socialAccountId),
    [accounts, form.socialAccountId],
  );

  const loadAll = async () => {
    setStatus("loading");
    setMessage("Loading publish planning data...");

    try {
      const [recordsResponse, accountsResponse, assetsResponse] = await Promise.all([
        fetch("/api/social/publish-records?limit=50", {
          method: "GET",
          cache: "no-store",
        }),
        fetch("/api/social/accounts", { method: "GET", cache: "no-store" }),
        fetch("/api/storage/assets?limit=100", { method: "GET", cache: "no-store" }),
      ]);

      const recordsPayload =
        (await recordsResponse.json()) as ApiResponse<PublishRecord[]>;
      const accountsPayload =
        (await accountsResponse.json()) as ApiResponse<SocialAccount[]>;
      const assetsPayload =
        (await assetsResponse.json()) as ApiResponse<StoredVideoAsset[]>;

      if (!recordsResponse.ok || !recordsPayload.ok) {
        setStatus("failed");
        setMessage(recordsPayload.error ?? "Could not load publish records.");
        return;
      }

      setRecords(recordsPayload.data ?? []);
      setAccounts(accountsPayload.data ?? []);
      setAssets(assetsPayload.data ?? []);
      setStatus("ready");
      setMessage(`Loaded ${(recordsPayload.data ?? []).length} publish records.`);
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Could not load data.");
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const createRecord = async () => {
    setStatus("loading");
    setMessage("Creating planned publish record...");

    try {
      const response = await fetch("/api/social/publish-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetId: form.assetId,
          socialAccountId: form.socialAccountId,
          publishType: form.publishType,
          title: form.title,
          caption: form.caption,
          hashtags: splitCsv(form.hashtags),
          scheduledAt: form.scheduledAt || null,
        }),
      });
      const payload = (await response.json()) as ApiResponse<PublishRecord>;

      if (!response.ok || !payload.ok || !payload.data) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not create publish record.");
        return;
      }

      setShowForm(false);
      setForm(EMPTY_FORM);
      await loadAll();
      setMessage("Publish record planned.");
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not create publish record.",
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
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary/75"
          >
            <Plus className="h-3.5 w-3.5" />
            Plan Publish
          </button>
          <button
            type="button"
            onClick={() => void loadAll()}
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="border-b border-main bg-secondary/45 text-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Asset</th>
              <th className="px-4 py-2 font-semibold">Account</th>
              <th className="px-4 py-2 font-semibold">Platform</th>
              <th className="px-4 py-2 font-semibold">Type</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Schedule</th>
              <th className="px-4 py-2 font-semibold">Hashtags</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={7}>
                  Chưa có publish record nào.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record._id} className="border-b border-main">
                  <td className="px-4 py-3 text-main">
                    {record.asset?.title ?? record.title ?? record.assetId}
                  </td>
                  <td className="px-4 py-3 text-main">
                    {record.socialAccount?.label ?? record.socialAccountId}
                  </td>
                  <td className="px-4 py-3 text-main">
                    {formatPlatform(record.platform)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatPublishType(record.publishType)}
                  </td>
                  <td className="px-4 py-3 text-muted">{record.status}</td>
                  <td className="px-4 py-3 text-muted">
                    {record.scheduledAt
                      ? new Date(record.scheduledAt).toLocaleString("vi-VN")
                      : "-"}
                  </td>
                  <td className="max-w-[240px] px-4 py-3 text-muted">
                    {record.hashtags.join(", ") || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="border-t border-main bg-secondary/30 px-5 py-5">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-[12px] font-medium text-main">
              Video Asset
              <select
                value={form.assetId}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, assetId: event.target.value }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                <option value="">Select asset</option>
                {assets.map((asset) => (
                  <option key={asset._id} value={asset._id}>
                    {asset.metadata?.title ?? asset._id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-medium text-main">
              Social Account
              <select
                value={form.socialAccountId}
                onChange={(event) => {
                  const account = accounts.find(
                    (entry) => entry._id === event.target.value,
                  );
                  setForm((previous) => ({
                    ...previous,
                    socialAccountId: event.target.value,
                    publishType: account?.supportedFormats[0] ?? "",
                  }));
                }}
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                <option value="">Select account</option>
                {accounts.map((account) => (
                  <option key={account._id} value={account._id}>
                    {formatPlatform(account.platform)} · {account.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-medium text-main">
              Publish Type
              <select
                value={form.publishType}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    publishType: event.target.value as SocialPublishType,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              >
                <option value="">Select type</option>
                {(selectedAccount?.supportedFormats ?? []).map((format) => (
                  <option key={format} value={format}>
                    {formatPublishType(format)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-medium text-main">
              Scheduled At
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    scheduledAt: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, title: event.target.value }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="text-[12px] font-medium text-main">
              Hashtags
              <input
                value={form.hashtags}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    hashtags: event.target.value,
                  }))
                }
                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            <label className="md:col-span-2 text-[12px] font-medium text-main">
              Caption
              <textarea
                value={form.caption}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    caption: event.target.value,
                  }))
                }
                className="mt-1 h-24 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void createRecord()}
              className="btn-success border px-3 py-1.5 text-[12px] font-semibold"
            >
              Create Plan
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
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
