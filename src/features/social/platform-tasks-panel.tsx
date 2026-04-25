"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import type { LeftbarNavItem } from "@/components/layout/types";

import {
  formatPlatform,
  formatPublishType,
  type ApiResponse,
  type SocialAccount,
  type SocialCapability,
} from "./social-types";

type PlatformTasksPanelProps = {
  section: LeftbarNavItem;
};

type DashboardPayload = {
  capabilities: SocialCapability[];
  accounts: SocialAccount[];
  summary: {
    accountCount: number;
    connectedAccountCount: number;
    assetCount: number;
    accountsByPlatform: Record<string, number>;
  };
};

export function PlatformTasksPanel({ section }: PlatformTasksPanelProps) {
  const Icon = section.icon;
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "failed">(
    "idle",
  );
  const [message, setMessage] = useState("Ready.");

  const loadDashboard = async () => {
    setStatus("loading");
    setMessage("Loading social platform tasks...");

    try {
      const response = await fetch("/api/social/dashboard", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as ApiResponse<DashboardPayload>;

      if (!response.ok || !payload.ok || !payload.data) {
        setStatus("failed");
        setMessage(payload.error ?? "Could not load social dashboard.");
        return;
      }

      setDashboard(payload.data);
      setStatus("ready");
      setMessage("Social platform matrix loaded.");
    } catch (error) {
      setStatus("failed");
      setMessage(
        error instanceof Error ? error.message : "Could not load dashboard.",
      );
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const accountsByPlatform = useMemo(() => {
    return new Map(
      (dashboard?.accounts ?? []).map((account) => [account.platform, account]),
    );
  }, [dashboard]);

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
          onClick={() => void loadDashboard()}
          disabled={status === "loading"}
          className="inline-flex items-center gap-2 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${status === "loading" ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </header>

      <div className="grid border-b border-main bg-secondary/25 px-5 py-3 text-[12px] text-muted md:grid-cols-4">
        <span>Status: {status}</span>
        <span>Accounts: {dashboard?.summary.accountCount ?? 0}</span>
        <span>Connected: {dashboard?.summary.connectedAccountCount ?? 0}</span>
        <span>Video assets: {dashboard?.summary.assetCount ?? 0}</span>
      </div>

      <div className="px-5 py-5">
        <p className="text-[12px] text-muted">{message}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(dashboard?.capabilities ?? []).map((capability) => {
            const account = accountsByPlatform.get(capability.platform);
            const missingScopes = capability.formats.flatMap((format) =>
              format.requiredScopes.filter(
                (scope) => !account?.permissionScopes.includes(scope),
              ),
            );

            return (
              <article
                key={capability.platform}
                className="border border-main bg-secondary/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[14px] font-semibold text-main">
                      {formatPlatform(capability.platform)}
                    </h2>
                    <p className="mt-1 text-[11px] text-muted">
                      Real publish adapter: {capability.realPublishStatus}
                    </p>
                  </div>
                  <span
                    className={`border px-2 py-1 text-[10px] font-bold uppercase ${
                      account
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {account ? account.status : "no account"}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {capability.formats.map((format) => (
                    <div key={format.publishType} className="border border-main bg-main p-3">
                      <p className="text-[12px] font-semibold text-main">
                        {formatPublishType(format.publishType)}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Scopes: {format.requiredScopes.join(", ")}
                      </p>
                      <p className="mt-1 text-[11px] text-muted">
                        Limits: title {format.metadataLimits.titleMaxLength}, caption{" "}
                        {format.metadataLimits.captionMaxLength}, hashtags{" "}
                        {format.metadataLimits.hashtagsMaxCount}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-main pt-3">
                  <p className="text-[12px] font-semibold text-main">
                    Next actions
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] text-muted">
                    {!account ? <li>Add account for this platform.</li> : null}
                    {account && account.status !== "connected" ? (
                      <li>Connect OAuth or repair account status.</li>
                    ) : null}
                    {account && missingScopes.length > 0 ? (
                      <li>Review missing scopes: {Array.from(new Set(missingScopes)).join(", ")}</li>
                    ) : null}
                    <li>Plan publish records from Storage Library assets.</li>
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
