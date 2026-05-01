"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";
import { getTelegramDownloadBlockedReason } from "@/lib/storage/telegram-download";
import {
  finishProgressTask,
  startProgressTask,
  updateProgressTask,
} from "@/lib/ui/progress-center";

import {
  buildPublishedPostUrl,
  formatPlatform,
  formatPublishType,
  type ApiResponse,
  type PublishMode,
  type SocialAccount,
  type SocialPlatform,
  type SocialPublishType,
  type YouTubePrivacyStatus,
} from "./social-types";
import { StatusBadge } from "./status-badge";

type PublishRecordsPanelProps = {
  section: LeftbarNavItem;
};

type StoredVideoAsset = {
  _id: string;
  durationMs?: number | null;
  sizeBytes?: number | null;
  metadata?: {
    title?: string | null;
    width?: number | null;
    height?: number | null;
    originPlatform?: string | null;
    actualQuality?: string | null;
  };
  createdFrom?: {
    storageProviderLabel?: string | null;
  };
  storageProvider: string;
};

type PublishRecord = {
  _id: string;
  assetId: string;
  socialAccountId: string;
  platform: SocialAccount["platform"];
  publishType: SocialPublishType;
  facebookPageId?: string | null;
  publishMode?: PublishMode;
  privacyStatus?: YouTubePrivacyStatus;
  status: string;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  scheduledAt: string | null;
  retryCount: number;
  platformPostId?: string | null;
  errorCode: string | null;
  errorDetail?: string | null;
  socialAccount?: { label?: string; displayName?: string | null };
  asset?: { title?: string | null; storageProvider?: string };
};

type FormState = {
  assetId: string;
  publishMode: PublishMode;
  title: string;
  caption: string;
  hashtags: string;
  scheduledAt: string;
  destinations: DestinationState[];
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const EMPTY_FORM: FormState = {
  assetId: "",
  publishMode: "publish_now",
  title: "",
  caption: "",
  hashtags: "",
  scheduledAt: "",
  destinations: [],
};

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};
const PUBLISH_RECORD_PAGE_SIZE = 10;

const PUBLISH_STATUS_OPTIONS = [
  "planned",
  "queued",
  "published",
  "failed",
  "retrying",
  "canceled",
] as const;

type FacebookPageOption = {
  id: string;
  name: string;
};

type DestinationState = {
  id: string;
  socialAccountId: string;
  publishType: SocialPublishType | "";
  facebookPageId: string;
  privacyStatus: YouTubePrivacyStatus;
};

function createDestinationRow(): DestinationState {
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `dest-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    socialAccountId: "",
    publishType: "",
    facebookPageId: "",
    privacyStatus: "private",
  };
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatBytes(size?: number | null) {
  if (!size || size <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function buildDestinationLabel({
  destination,
  accounts,
}: {
  destination: DestinationState;
  accounts: SocialAccount[];
}) {
  const account = accounts.find((entry) => entry._id === destination.socialAccountId);
  const accountLabel = account?.label ?? destination.socialAccountId;
  const publishType = destination.publishType
    ? formatPublishType(destination.publishType)
    : "Unknown";

  return `${publishType} · ${accountLabel}`;
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
  const [formMessage, setFormMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [platformFilter, setPlatformFilter] = useState<SocialPlatform | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION);
  const [facebookPagesByAccount, setFacebookPagesByAccount] = useState<
    Record<string, FacebookPageOption[]>
  >({});
  const [loadingFacebookAccountIds, setLoadingFacebookAccountIds] = useState<
    Record<string, boolean>
  >({});
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset._id === form.assetId),
    [assets, form.assetId],
  );
  const hasYouTubeShortDestination = form.destinations.some(
    (destination) => destination.publishType === "youtube_short",
  );
  const isDestinationValid = (destination: DestinationState) => {
    if (!destination.socialAccountId || !destination.publishType) {
      return false;
    }

    if (
      (destination.publishType === "facebook_reel" ||
        destination.publishType === "facebook_video") &&
      !destination.facebookPageId
    ) {
      return false;
    }

    return true;
  };
  const canSubmit =
    Boolean(
      form.assetId && form.destinations.length > 0 && form.destinations.every(isDestinationValid),
    ) &&
    !isSubmitting;

  const selectedAssetShortHint = useMemo(() => {
    if (!selectedAsset || !hasYouTubeShortDestination) {
      return null;
    }

    const durationMs =
      typeof selectedAsset.durationMs === "number" ? selectedAsset.durationMs : null;
    const width =
      typeof selectedAsset.metadata?.width === "number"
        ? selectedAsset.metadata.width
        : null;
    const height =
      typeof selectedAsset.metadata?.height === "number"
        ? selectedAsset.metadata.height
        : null;

    if (!durationMs || !width || !height) {
      return "Shorts cần metadata duration/width/height. Asset này thiếu metadata nên server sẽ chặn upload để tránh vào video thường.";
    }

    if (durationMs > 180_000) {
      return "Video dài hơn 3 phút nên không đủ điều kiện YouTube Shorts.";
    }

    if (width > height) {
      return "Video đang là ngang. YouTube Shorts cần video vuông hoặc dọc.";
    }

    return `Đủ điều kiện Shorts: ${width}x${height}, ${Math.round(durationMs / 1000)}s.`;
  }, [hasYouTubeShortDestination, selectedAsset]);

  const loadAll = useCallback(async (nextPage = 1) => {
    setStatus("loading");
    setMessage("Loading publish planning data...");

    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: String(PUBLISH_RECORD_PAGE_SIZE),
      });

      if (platformFilter !== "all") {
        params.set("platform", platformFilter);
      }

      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const [recordsResponse, accountsResponse, assetsResponse] = await Promise.all([
        fetch(`/api/social/publish-records?${params.toString()}`, {
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
      setPagination(recordsPayload.pagination ?? DEFAULT_PAGINATION);
      setAccounts(accountsPayload.data ?? []);
      setAssets(assetsPayload.data ?? []);
      setStatus("ready");
      setMessage(
        `Loaded ${(recordsPayload.data ?? []).length} of ${
          recordsPayload.pagination?.total ?? (recordsPayload.data ?? []).length
        } publish records.`,
      );
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Could not load data.");
    }
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    void loadAll(1);
  }, [loadAll]);

  const ensureFacebookPages = async (accountId: string) => {
    if (!accountId) {
      return { pages: [] as FacebookPageOption[], configuredPageId: null as string | null };
    }

    if (facebookPagesByAccount[accountId]) {
      return {
        pages: facebookPagesByAccount[accountId],
        configuredPageId: null,
      };
    }

    setLoadingFacebookAccountIds((previous) => ({ ...previous, [accountId]: true }));

    try {
      const response = await fetch(
        `/api/social/accounts/${accountId}/facebook-pages`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      const payload = (await response.json()) as ApiResponse<{
        pages: FacebookPageOption[];
        configuredPageId: string | null;
        source: "graph" | "cached";
      }>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Could not load Facebook pages.");
      }

      setFacebookPagesByAccount((previous) => ({
        ...previous,
        [accountId]: payload.data?.pages ?? [],
      }));

      return payload.data;
    } finally {
      setLoadingFacebookAccountIds((previous) => ({ ...previous, [accountId]: false }));
    }
  };

  const createRecord = async () => {
    if (isSubmitting) {
      return;
    }
    const destinations = form.destinations.filter(isDestinationValid);

    if (destinations.length === 0) {
      setStatus("failed");
      setFormMessage("Add at least one valid destination before publishing.");
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setStatus("loading");
    const submitMessage =
      form.publishMode === "publish_now"
        ? `Publishing to ${destinations.length} destination(s) in background...`
        : "Creating planned publish record...";
    setMessage(submitMessage);
    setFormMessage(submitMessage);
    const progressTaskId = startProgressTask({
      title:
        form.publishMode === "publish_now"
          ? "Publishing social destinations"
          : "Creating publish records",
      description: submitMessage,
      scope: "publish",
      progress: 0,
    });
    let successCount = 0;
    let failedCount = 0;
    let currentProgress = 0;

    const updatePublishProgress = ({
      destinationIndex,
      stagePercent,
      destinationLabel,
      detail,
    }: {
      destinationIndex: number;
      stagePercent: number;
      destinationLabel: string;
      detail: string;
    }) => {
      const nextProgress = Math.round(
        ((destinationIndex + stagePercent / 100) / destinations.length) * 100,
      );
      currentProgress = Math.max(currentProgress, nextProgress);
      setSubmitProgress(currentProgress);
      const completed = destinationIndex;
      const progressText = `${successCount}/${destinations.length} success · ${failedCount} failed · ${completed}/${destinations.length} completed`;
      const detailText = `${destinationLabel} · ${detail}`;
      const composed = `${progressText}. ${detailText}`;
      setFormMessage(`${composed} (${currentProgress}%).`);
      updateProgressTask(progressTaskId, {
        progress: currentProgress,
        description: composed,
      });
    };

    type DestinationResult = {
      ok: boolean;
      error?: string;
    };

    const results: DestinationResult[] = [];

    try {
      for (const [index, destination] of destinations.entries()) {
        const destinationLabel = buildDestinationLabel({ destination, accounts });
        updatePublishProgress({
          destinationIndex: index,
          stagePercent: 20,
          destinationLabel,
          detail: "Preparing request",
        });

        try {
          updatePublishProgress({
            destinationIndex: index,
            stagePercent: 40,
            destinationLabel,
            detail: "Sending request",
          });
          const response = await fetch("/api/social/publish-records", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              assetId: form.assetId,
              socialAccountId: destination.socialAccountId,
              publishType: destination.publishType,
              facebookPageId: destination.facebookPageId || null,
              publishNow: form.publishMode === "publish_now",
              privacyStatus: destination.privacyStatus,
              title: form.title,
              caption: form.caption,
              hashtags: splitCsv(form.hashtags),
              scheduledAt: form.scheduledAt || null,
            }),
          });
          updatePublishProgress({
            destinationIndex: index,
            stagePercent: 65,
            destinationLabel,
            detail: `Response received (HTTP ${response.status})`,
          });
          const payload = (await response.json()) as ApiResponse<PublishRecord>;
          updatePublishProgress({
            destinationIndex: index,
            stagePercent: 85,
            destinationLabel,
            detail: "Validating response payload",
          });

          const isSuccess = response.ok && payload.ok && Boolean(payload.data);

          if (isSuccess) {
            successCount += 1;
            results.push({ ok: true });
          } else {
            failedCount += 1;
            results.push({
              ok: false,
              error: payload.error ?? "Could not create publish record.",
            });
          }
        } catch (error) {
          failedCount += 1;
          results.push({
            ok: false,
            error: error instanceof Error ? error.message : "Could not create publish record.",
          });
        }

        updatePublishProgress({
          destinationIndex: index + 1,
          stagePercent: 0,
          destinationLabel,
          detail: "Destination completed",
        });
      }

      const failed = results.filter((result) => !result.ok);
      const firstError = failed[0]?.error ?? "Could not create publish record.";

      if (successCount === 0) {
        setStatus("failed");
        setMessage(firstError);
        setFormMessage(firstError);
        finishProgressTask({
          id: progressTaskId,
          status: "failed",
          description: `${successCount}/${destinations.length} success · ${failedCount} failed.`,
          error: firstError,
        });
        return;
      }

      setShowForm(false);
      setForm({ ...EMPTY_FORM, destinations: [createDestinationRow()] });
      setFormMessage("");
      await loadAll(1);
      setStatus(failed.length === 0 ? "ready" : "failed");
      setMessage(
        failed.length === 0
          ? `Created ${successCount} publish record(s).`
          : `Created ${successCount} record(s), ${failed.length} failed. First error: ${firstError}`,
      );
      finishProgressTask({
        id: progressTaskId,
        status: failed.length === 0 ? "success" : "failed",
        description:
          `${successCount}/${destinations.length} success · ${failedCount} failed.`,
        error: failed.length === 0 ? undefined : firstError,
      });
    } catch (error) {
      setStatus("failed");
      const errorMessage =
        error instanceof Error ? error.message : "Could not create publish record.";
      setMessage(errorMessage);
      setFormMessage(errorMessage);
      finishProgressTask({
        id: progressTaskId,
        status: "failed",
        description: "Publish request failed.",
        error: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
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
              setForm({ ...EMPTY_FORM, destinations: [createDestinationRow()] });
              setFormMessage("");
              setSubmitProgress(0);
              setShowAssetPicker(false);
              setShowForm(true);
            }}
            className="inline-flex items-center gap-2 border border-main bg-secondary px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary/75"
          >
            <Plus className="h-3.5 w-3.5" />
            Plan Publish
          </button>
          <button
            type="button"
            onClick={() => void loadAll(pagination.page)}
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
        <StatusBadge status={status} />
        <span className="ml-3">{message}</span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-main bg-main px-5 py-3">
        <div className="flex flex-wrap gap-3">
          <label className="text-[11px] font-semibold text-main">
            Platform
            <select
              value={platformFilter}
              onChange={(event) =>
                setPlatformFilter(event.target.value as SocialPlatform | "all")
              }
              className="mt-1 block min-w-32 border border-main bg-main px-2 py-1.5 text-[12px] font-normal text-main"
            >
              <option value="all">All platforms</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="facebook">Facebook</option>
              <option value="shopee">Shopee</option>
            </select>
          </label>
          <label className="text-[11px] font-semibold text-main">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="mt-1 block min-w-32 border border-main bg-main px-2 py-1.5 text-[12px] font-normal text-main"
            >
              <option value="all">All statuses</option>
              {PUBLISH_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <button
            type="button"
            onClick={() => void loadAll(Math.max(1, pagination.page - 1))}
            disabled={status === "loading" || pagination.page <= 1}
            className="border border-main bg-main px-2.5 py-1 font-semibold text-main hover:bg-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {pagination.page} / {pagination.totalPages} · {pagination.total} record(s)
          </span>
          <button
            type="button"
            onClick={() =>
              void loadAll(Math.min(pagination.totalPages, pagination.page + 1))
            }
            disabled={status === "loading" || pagination.page >= pagination.totalPages}
            className="border border-main bg-main px-2.5 py-1 font-semibold text-main hover:bg-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="border-b border-main bg-secondary/45 text-muted">
            <tr>
              <th className="px-4 py-2 font-semibold">Asset</th>
              <th className="px-4 py-2 font-semibold">Account</th>
              <th className="px-4 py-2 font-semibold">Platform</th>
              <th className="px-4 py-2 font-semibold">Type</th>
              <th className="px-4 py-2 font-semibold">Mode</th>
              <th className="px-4 py-2 font-semibold">Privacy</th>
              <th className="px-4 py-2 font-semibold">Status</th>
              <th className="px-4 py-2 font-semibold">Post</th>
              <th className="px-4 py-2 font-semibold">Schedule</th>
              <th className="px-4 py-2 font-semibold">Hashtags</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted" colSpan={10}>
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
                    {record.platform === "facebook" && record.facebookPageId ? (
                      <p className="mt-1 text-[11px] text-muted">
                        Page: {record.facebookPageId}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-main">
                    {formatPlatform(record.platform)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {formatPublishType(record.publishType)}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {record.publishMode === "publish_now" ? "Publish now" : "Schedule"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {record.privacyStatus ?? "private"}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    <StatusText status={record.status} className="font-medium" />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {record.platformPostId ? (
                      (() => {
                        const postUrl = buildPublishedPostUrl({
                          platform: record.platform,
                          platformPostId: record.platformPostId,
                        });

                        return postUrl ? (
                          <a
                            href={postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-main hover:underline"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          record.platformPostId
                        );
                      })()
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="max-w-[260px] px-4 py-3 text-muted">
                    {record.errorCode
                      ? `${record.errorCode}: ${record.errorDetail ?? ""}`
                      : record.scheduledAt
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/35 px-4 py-6">
          <form
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto border border-main bg-main shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              void createRecord();
            }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-main bg-secondary/35 px-4 py-3">
              <div>
                <p className="text-[12px] font-semibold text-main">
                  New Publish Record
                </p>
                <p className="mt-1 text-[11px] leading-5 text-muted">
                  YouTube, TikTok và Facebook publish now sẽ upload thật khi account đã connected và asset có thể download. Shopee hiện vẫn deferred nên publish now sẽ fail rõ ràng.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  if (!isSubmitting) {
                    setForm({ ...EMPTY_FORM, destinations: [createDestinationRow()] });
                    setFormMessage("");
                    setSubmitProgress(0);
                    setShowAssetPicker(false);
                  }
                }}
                className="border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
              >
                {isSubmitting ? "Hide" : "Close"}
              </button>
            </div>

            <div className="grid gap-3 px-4 py-4 md:grid-cols-2">
            {isSubmitting ? (
              <div className="border border-main bg-secondary/20 p-3 md:col-span-2">
                <div className="flex items-center justify-between gap-3 text-[11px] text-muted">
                  <span>{formMessage}</span>
                  <span className="font-semibold text-main">{submitProgress}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden border border-main bg-main">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${submitProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  Bạn có thể bấm Hide; tiến trình vẫn nằm trong nút Progress trên topbar.
                </p>
              </div>
            ) : null}
            <label className="text-[12px] font-medium text-main">
              Video Asset
              <button
                type="button"
                onClick={() => setShowAssetPicker((previous) => !previous)}
                disabled={isSubmitting}
                className="mt-1 flex w-full items-center justify-between border border-main bg-main px-3 py-2 text-left text-[12px] text-main"
              >
                <span className="truncate">
                  {selectedAsset?.metadata?.title ?? selectedAsset?._id ?? "Select asset"}
                </span>
                <span className="ml-2 text-[11px] text-muted">
                  {showAssetPicker ? "Close" : "Browse"}
                </span>
              </button>
              {selectedAsset ? (
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted">
                  <span className="border border-main bg-secondary/20 px-1.5 py-0.5">
                    {selectedAsset.storageProvider}
                  </span>
                  {selectedAsset.metadata?.originPlatform ? (
                    <span className="border border-main bg-secondary/20 px-1.5 py-0.5">
                      {selectedAsset.metadata.originPlatform}
                    </span>
                  ) : null}
                  {selectedAsset.metadata?.actualQuality ? (
                    <span className="border border-main bg-secondary/20 px-1.5 py-0.5">
                      {selectedAsset.metadata.actualQuality}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {showAssetPicker ? (
                <div className="mt-2 max-h-64 overflow-y-auto border border-main bg-main">
                  {assets.length === 0 ? (
                    <p className="px-3 py-4 text-[11px] text-muted">No asset available.</p>
                  ) : (
                    <div className="space-y-2 p-2">
                      {assets.map((asset) => {
                        const isSelected = form.assetId === asset._id;
                        const previewBlockedReason = getTelegramDownloadBlockedReason({
                          storageProvider: asset.storageProvider,
                          sizeBytes: asset.sizeBytes ?? undefined,
                        });

                        return (
                          <button
                            key={asset._id}
                            type="button"
                            onClick={() => {
                              setForm((previous) => ({ ...previous, assetId: asset._id }));
                              setShowAssetPicker(false);
                            }}
                            className={`flex w-full items-start gap-2 border p-2 text-left ${
                              isSelected
                                ? "border-accent bg-secondary/35"
                                : "border-main bg-main hover:bg-secondary/20"
                            }`}
                          >
                            {previewBlockedReason ? (
                              <div className="flex h-12 w-20 shrink-0 items-center justify-center border border-main bg-secondary text-[10px] text-muted">
                                No preview
                              </div>
                            ) : (
                              <div className="flex h-12 w-20 shrink-0 items-center justify-center border border-main bg-black text-[10px] font-semibold text-white/80">
                                Video
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-main">
                                {asset.metadata?.title ?? asset._id}
                              </p>
                              <p className="mt-1 truncate text-[10px] text-muted">
                                {asset.createdFrom?.storageProviderLabel ?? asset.storageProvider} ·{" "}
                                {formatBytes(asset.sizeBytes)}
                              </p>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="border border-main bg-secondary/20 px-1.5 py-0.5 text-[10px] text-main">
                                  {asset.storageProvider}
                                </span>
                                {asset.metadata?.originPlatform ? (
                                  <span className="border border-main bg-secondary/20 px-1.5 py-0.5 text-[10px] text-main">
                                    {asset.metadata.originPlatform}
                                  </span>
                                ) : null}
                                {asset.metadata?.actualQuality ? (
                                  <span className="border border-main bg-secondary/20 px-1.5 py-0.5 text-[10px] text-main">
                                    {asset.metadata.actualQuality}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </label>
            <fieldset className="border border-main bg-secondary/20 p-3">
              <legend className="px-1 text-[12px] font-medium text-main">
                Publish mode
              </legend>
              <div className="mt-2 grid gap-2">
                <label className="flex items-start gap-2 text-[12px] text-main">
                  <input
                    type="radio"
                    checked={form.publishMode === "publish_now"}
                    disabled={isSubmitting}
                    onChange={() =>
                      setForm((previous) => ({
                        ...previous,
                        publishMode: "publish_now",
                        scheduledAt: "",
                      }))
                    }
                  />
                  <span>
                    Publish now
                    <span className="block text-[11px] text-muted">
                      Upload ngay cho YouTube/TikTok/Facebook. Các platform chưa có adapter thật sẽ trả lỗi chưa hỗ trợ.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-[12px] text-main">
                  <input
                    type="radio"
                    checked={form.publishMode === "schedule"}
                    disabled={isSubmitting}
                    onChange={() =>
                      setForm((previous) => ({
                        ...previous,
                        publishMode: "schedule",
                      }))
                    }
                  />
                  <span>
                    Schedule / plan
                    <span className="block text-[11px] text-muted">
                      Keep this as a planned record for a selected time or later review.
                    </span>
                  </span>
                </label>
              </div>
            </fieldset>
            {form.publishMode === "schedule" ? (
              <label className="text-[12px] font-medium text-main">
                Scheduled At
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      scheduledAt: event.target.value,
                    }))
                  }
                  className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
                />
              </label>
            ) : null}
            <div className="border border-main bg-secondary/10 p-3 md:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-main">Destinations</p>
                <button
                  type="button"
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      destinations: [...previous.destinations, createDestinationRow()],
                    }))
                  }
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main hover:bg-secondary"
                >
                  <Plus className="h-3 w-3" />
                  Add Destination
                </button>
              </div>

              {form.destinations.length === 0 ? (
                <p className="text-[11px] text-muted">Add at least one destination.</p>
              ) : (
                <div className="space-y-3">
                  {form.destinations.map((destination, index) => {
                    const destinationAccount = accounts.find(
                      (account) => account._id === destination.socialAccountId,
                    );
                    const isFacebookDestination =
                      destination.publishType === "facebook_reel" ||
                      destination.publishType === "facebook_video";
                    const isYouTubeDestination =
                      destination.publishType === "youtube_short" ||
                      destination.publishType === "youtube_video";
                    const facebookPages =
                      facebookPagesByAccount[destination.socialAccountId] ?? [];
                    const isLoadingPages =
                      loadingFacebookAccountIds[destination.socialAccountId] === true;

                    return (
                      <div key={destination.id} className="border border-main bg-main p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-main">
                            Destination {index + 1}
                          </p>
                          {form.destinations.length > 1 ? (
                            <button
                              type="button"
                              onClick={() =>
                                setForm((previous) => ({
                                  ...previous,
                                  destinations: previous.destinations.filter(
                                    (entry) => entry.id !== destination.id,
                                  ),
                                }))
                              }
                              disabled={isSubmitting}
                              className="inline-flex items-center gap-1 border border-main bg-main px-2 py-1 text-[10px] font-semibold text-main hover:bg-secondary"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="text-[12px] font-medium text-main">
                            Social Account
                            <select
                              value={destination.socialAccountId}
                              onChange={async (event) => {
                                const nextAccountId = event.target.value;
                                const account = accounts.find(
                                  (entry) => entry._id === nextAccountId,
                                );
                                let defaultFacebookPageId = "";

                                if (account?.platform === "facebook" && nextAccountId) {
                                  try {
                                    const facebookData =
                                      await ensureFacebookPages(nextAccountId);
                                    defaultFacebookPageId =
                                      facebookData.configuredPageId ??
                                      facebookData.pages[0]?.id ??
                                      "";
                                  } catch (error) {
                                    setFormMessage(
                                      error instanceof Error
                                        ? error.message
                                        : "Could not load Facebook pages.",
                                    );
                                  }
                                }

                                setForm((previous) => ({
                                  ...previous,
                                  destinations: previous.destinations.map((entry) =>
                                    entry.id === destination.id
                                      ? {
                                          ...entry,
                                          socialAccountId: nextAccountId,
                                          publishType: account?.supportedFormats[0] ?? "",
                                          facebookPageId: defaultFacebookPageId,
                                          privacyStatus: "private",
                                        }
                                      : entry,
                                  ),
                                }));
                              }}
                              disabled={isSubmitting}
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
                              value={destination.publishType}
                              onChange={(event) =>
                                setForm((previous) => ({
                                  ...previous,
                                  destinations: previous.destinations.map((entry) =>
                                    entry.id === destination.id
                                      ? {
                                          ...entry,
                                          publishType: event.target.value as SocialPublishType,
                                          facebookPageId:
                                            event.target.value === "facebook_reel" ||
                                            event.target.value === "facebook_video"
                                              ? entry.facebookPageId
                                              : "",
                                        }
                                      : entry,
                                  ),
                                }))
                              }
                              disabled={isSubmitting || !destinationAccount}
                              className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
                            >
                              <option value="">Select type</option>
                              {(destinationAccount?.supportedFormats ?? []).map((format) => (
                                <option key={format} value={format}>
                                  {formatPublishType(format)}
                                </option>
                              ))}
                            </select>
                          </label>

                          {isFacebookDestination ? (
                            <label className="text-[12px] font-medium text-main md:col-span-2">
                              Facebook Page
                              <select
                                value={destination.facebookPageId}
                                onChange={(event) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    destinations: previous.destinations.map((entry) =>
                                      entry.id === destination.id
                                        ? { ...entry, facebookPageId: event.target.value }
                                        : entry,
                                    ),
                                  }))
                                }
                                disabled={isSubmitting || isLoadingPages}
                                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
                              >
                                <option value="">
                                  {isLoadingPages ? "Loading pages..." : "Select Facebook Page"}
                                </option>
                                {facebookPages.map((page) => (
                                  <option key={page.id} value={page.id}>
                                    {page.name} ({page.id})
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}

                          {isYouTubeDestination ? (
                            <label className="text-[12px] font-medium text-main md:col-span-2">
                              YouTube Privacy
                              <select
                                value={destination.privacyStatus}
                                disabled={isSubmitting}
                                onChange={(event) =>
                                  setForm((previous) => ({
                                    ...previous,
                                    destinations: previous.destinations.map((entry) =>
                                      entry.id === destination.id
                                        ? {
                                            ...entry,
                                            privacyStatus:
                                              event.target.value as YouTubePrivacyStatus,
                                          }
                                        : entry,
                                    ),
                                  }))
                                }
                                className="mt-1 w-full border border-main bg-main px-3 py-2 text-[12px]"
                              >
                                <option value="private">Private</option>
                                <option value="unlisted">Unlisted</option>
                                <option value="public">Public</option>
                              </select>
                            </label>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {selectedAssetShortHint ? (
              <div className="border border-main bg-secondary/25 px-3 py-2 text-[11px] leading-5 text-muted md:col-span-2">
                {selectedAssetShortHint}
              </div>
            ) : null}
            <label className="text-[12px] font-medium text-main">
              Title
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, title: event.target.value }))
                }
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                className="mt-1 h-24 w-full border border-main bg-main px-3 py-2 text-[12px]"
              />
            </label>
            </div>
            {formMessage ? (
              <div className="border-t border-main bg-secondary/20 px-4 py-3 text-[12px] leading-5 text-muted">
                {isSubmitting ? (
                  <RefreshCw className="mr-2 inline h-3.5 w-3.5 animate-spin" />
                ) : null}
                {formMessage}
              </div>
            ) : null}
            <div className="flex gap-2 border-t border-main bg-secondary/25 px-4 py-3">
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-success border px-3 py-1.5 text-[12px] font-semibold"
            >
              {isSubmitting
                ? form.publishMode === "publish_now"
                  ? "Publishing..."
                  : "Creating..."
                : form.publishMode === "publish_now"
                  ? "Publish Now"
                  : "Create Plan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ ...EMPTY_FORM, destinations: [createDestinationRow()] });
                setFormMessage("");
              }}
              disabled={isSubmitting}
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
