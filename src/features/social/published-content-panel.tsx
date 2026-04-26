"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";
import { StatusText } from "@/components/ui/status-text";

import { buildPublishedFootprintKey } from "./published-content-keys";
import {
  buildPublishedPostUrl,
  formatPlatform,
  formatPublishType,
  type ApiResponse,
  type SocialPlatform,
  type SocialPublishType,
} from "./social-types";
import { StatusBadge } from "./status-badge";

type PublishedContentPanelProps = {
  section: LeftbarNavItem;
};

type InventoryRecord = {
  _id: string;
  assetId: string;
  socialAccountId: string;
  platform: SocialPlatform;
  publishType: SocialPublishType;
  status: string;
  title: string | null;
  platformPostId: string | null;
  publishedAt: string | null;
  scheduledAt: string | null;
  asset: {
    title?: string | null;
    storageProvider?: string | null;
    providerAssetId?: string | null;
  };
};

type YouTubeRemoteVideo = {
  platformPostId: string;
  title: string;
  description: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  url: string;
  inferredType: "youtube_short" | "youtube_video" | "unknown";
};

type AccountInventory = {
  accountId: string;
  platform: SocialPlatform;
  label: string;
  displayName: string | null;
  handle: string | null;
  status: string;
  localRecords: InventoryRecord[];
  youtubeRemote: {
    status: "ok" | "skipped" | "failed";
    message: string;
    fetchedAt: string;
    videos: YouTubeRemoteVideo[];
  } | null;
};

type AssetInventory = {
  assetId: string;
  title: string | null;
  storageProvider: string | null;
  providerAssetId: string | null;
  platforms: Array<{
    platform: SocialPlatform;
    accountId: string;
    accountLabel: string;
    publishType: SocialPublishType;
    status: string;
    platformPostId: string | null;
    publishedAt: string | null;
  }>;
};

type InventoryPayload = {
  accounts: AccountInventory[];
  assets: AssetInventory[];
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString("vi-VN") : "-";
}

export function PublishedContentPanel({ section }: PublishedContentPanelProps) {
  const Icon = section.icon;
  const [inventory, setInventory] = useState<InventoryPayload>({
    accounts: [],
    assets: [],
  });
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [message, setMessage] = useState("Ready.");
  const youtubeAccounts = useMemo(
    () => inventory.accounts.filter((account) => account.platform === "youtube"),
    [inventory.accounts],
  );

  const loadInventory = async () => {
    setStatus("loading");
    setMessage("Loading published content inventory...");

    try {
      const response = await fetch("/api/social/published-content", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<InventoryPayload>;

      if (!response.ok || !payload.ok || !payload.data) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not load published content inventory.");
        return;
      }

      setInventory(payload.data);
      setStatus("ready");
      setMessage(
        `Loaded ${payload.data.accounts.length} accounts and ${payload.data.assets.length} asset footprints.`,
      );
    } catch (error) {
      setStatus("failed");
      setMessage(error instanceof Error ? error.message : "Could not load inventory.");
    }
  };

  useEffect(() => {
    void loadInventory();
  }, []);

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

        <button
          type="button"
          onClick={() => void loadInventory()}
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      <div className="border-b border-main bg-secondary/25 px-5 py-3 text-[12px] text-muted">
        <StatusBadge status={status} />
        <span className="ml-3">{message}</span>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <div>
            <h2 className="text-[13px] font-semibold text-main">
              Account Inventory
            </h2>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Local records come from OmniVideo publish records. YouTube remote
              rows are fetched live from the connected channel when OAuth scope
              allows it.
            </p>
          </div>

          {inventory.accounts.length === 0 ? (
            <div className="border border-main bg-secondary/20 px-4 py-6 text-[12px] text-muted">
              Chưa có social account nào.
            </div>
          ) : (
            inventory.accounts.map((account) => (
              <div key={account.accountId} className="border border-main">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-main bg-secondary/30 px-4 py-3">
                  <div>
                    <p className="text-[12px] font-semibold text-main">
                      {formatPlatform(account.platform)} · {account.label}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {account.displayName ?? account.handle ?? account.accountId}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={account.status} />
                    </div>
                  </div>
                  <span className="border border-main bg-main px-2 py-1 text-[10px] font-bold uppercase text-muted">
                    {account.localRecords.length} local records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead className="border-b border-main bg-secondary/20 text-muted">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Video</th>
                        <th className="px-4 py-2 font-semibold">Type</th>
                        <th className="px-4 py-2 font-semibold">Status</th>
                        <th className="px-4 py-2 font-semibold">Published</th>
                        <th className="px-4 py-2 font-semibold">Post ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.localRecords.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-muted" colSpan={5}>
                            Chưa có publish record nội bộ cho account này.
                          </td>
                        </tr>
                      ) : (
                        account.localRecords.map((record) => (
                          <tr key={record._id} className="border-b border-main">
                            <td className="px-4 py-3 text-main">
                              {record.asset.title ?? record.title ?? record.assetId}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {formatPublishType(record.publishType)}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              <StatusText status={record.status} className="font-medium" />
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {formatDate(record.publishedAt)}
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="border border-main">
            <div className="border-b border-main bg-secondary/30 px-4 py-3">
              <h2 className="text-[13px] font-semibold text-main">
                YouTube Channel Uploads
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Requires reconnecting YouTube with the read-only inventory scope.
              </p>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {youtubeAccounts.length === 0 ? (
                <p className="px-4 py-4 text-[12px] text-muted">
                  Chưa có YouTube account.
                </p>
              ) : (
                youtubeAccounts.map((account) => (
                  <div key={account.accountId} className="border-b border-main p-4">
                    <p className="text-[12px] font-semibold text-main">
                      {account.label}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-muted">
                      <StatusText
                        status={account.youtubeRemote?.status ?? "skipped"}
                        className="font-semibold"
                      />{" "}
                      <span className="ml-1">
                        {account.youtubeRemote?.message ?? "No YouTube fetch."}
                      </span>
                    </p>
                    <div className="mt-3 space-y-3">
                      {(account.youtubeRemote?.videos ?? []).map((video) => (
                        <a
                          key={video.platformPostId}
                          href={video.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block border border-main bg-secondary/15 p-3 hover:bg-secondary/35"
                        >
                          <div className="flex gap-3">
                            {video.thumbnailUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={video.thumbnailUrl}
                                alt=""
                                className="h-14 w-24 shrink-0 object-cover"
                              />
                            ) : null}
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-[12px] font-semibold text-main">
                                {video.title}
                              </p>
                              <p className="mt-1 text-[11px] text-muted">
                                {video.inferredType === "youtube_short"
                                  ? "Possible Short"
                                  : "Video"}{" "}
                                · {formatDate(video.publishedAt)}
                              </p>
                              <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-main">
                                Open <ExternalLink className="h-3 w-3" />
                              </span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-main">
            <div className="border-b border-main bg-secondary/30 px-4 py-3">
              <h2 className="text-[13px] font-semibold text-main">
                Video Footprint
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-muted">
                Mỗi asset bên dưới cho biết đã được plan/publish lên account nào.
              </p>
            </div>
            <div className="max-h-[520px] overflow-y-auto">
              {inventory.assets.length === 0 ? (
                <p className="px-4 py-4 text-[12px] text-muted">
                  Chưa có asset nào có publish record.
                </p>
              ) : (
                inventory.assets.map((asset) => (
                  <div key={asset.assetId} className="border-b border-main p-4">
                    <p className="text-[12px] font-semibold text-main">
                      {asset.title ?? asset.assetId}
                    </p>
                    <p className="mt-1 text-[11px] text-muted">
                      {asset.storageProvider ?? "unknown storage"} ·{" "}
                      {asset.platforms.length} destinations
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {asset.platforms.map((platform, index) => {
                        const postUrl = buildPublishedPostUrl({
                          platform: platform.platform,
                          platformPostId: platform.platformPostId,
                        });
                        const footprintKey = buildPublishedFootprintKey(platform, index);

                        const content = (
                          <>
                            {formatPlatform(platform.platform)} ·{" "}
                            {platform.accountLabel} ·{" "}
                            <StatusText status={platform.status} className="font-semibold" />
                            {postUrl ? (
                              <span className="inline-flex items-center gap-1">
                                · Open <ExternalLink className="h-3 w-3" />
                              </span>
                            ) : null}
                          </>
                        );

                        return postUrl ? (
                          <a
                            key={footprintKey}
                            href={postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="border border-main bg-secondary/20 px-2 py-1 text-[11px] font-semibold text-main hover:bg-secondary/35"
                          >
                            {content}
                          </a>
                        ) : (
                          <span
                            key={footprintKey}
                            className="border border-main bg-secondary/20 px-2 py-1 text-[11px] text-main"
                          >
                            {content}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
