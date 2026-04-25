"use client";

import { useEffect, useState } from "react";

import type { LeftbarNavItem } from "@/components/layout/types";

type ConnectionStatus = "idle" | "checking" | "ok" | "down" | "skipped";

type ConnectionCheck = {
  serviceType: "mongodb" | "storage" | "social";
  serviceKey: string;
  label: string;
  status: "ok" | "down" | "skipped";
  message: string;
  latencyMs: number;
  checkedAt: string;
  providerId?: string;
  providerType?: "telegram" | "drive";
  accountId?: string;
  platform?: "facebook" | "tiktok" | "shopee" | "youtube";
};

type ConnectionSummary = {
  total: number;
  okCount: number;
  downCount: number;
  skippedCount: number;
};

type ConnectionState = {
  status: "idle" | "checking" | "ok" | "down";
  message: string;
  lastCheckedAt?: string;
  checks: ConnectionCheck[];
  summary?: ConnectionSummary;
};

type ConnectionTestPanelProps = {
  section: LeftbarNavItem;
};

const INITIAL_STATE: ConnectionState = {
  status: "idle",
  message: "Connection status not checked yet.",
  checks: [],
};

function formatCheckedAt(value?: string) {
  if (!value) {
    return "Never";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function getStatusClasses(status: ConnectionStatus) {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "down") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "checking") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (status === "skipped") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }

  return "border-main bg-secondary text-muted";
}

export function ConnectionTestPanel({ section }: ConnectionTestPanelProps) {
  const [state, setState] = useState<ConnectionState>(INITIAL_STATE);
  const Icon = section.icon;

  const runConnectionTest = async () => {
    setState({
      status: "checking",
      message: "Checking MongoDB, storage, and social connections...",
      checks: [],
    });

    try {
      const response = await fetch("/api/health/connections", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        ok: boolean;
        checks?: ConnectionCheck[];
        summary?: ConnectionSummary;
        error?: string;
        timestamp?: string;
      };

      const checks = payload.checks ?? [];
      const summary = payload.summary;

      if (payload.ok) {
        setState({
          status: "ok",
          message: "All configured connections are healthy.",
          checks,
          summary,
          lastCheckedAt: payload.timestamp,
        });
        return;
      }

      setState({
        status: "down",
        message: payload.error ?? "Some connections are not healthy.",
        checks,
        summary,
        lastCheckedAt: payload.timestamp,
      });
    } catch {
      setState({
        status: "down",
        message: "Connection test failed.",
        checks: [],
      });
    }
  };

  useEffect(() => {
    void runConnectionTest();
  }, []);

  return (
    <section className="overflow-hidden border border-main bg-main">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-main bg-secondary/45 px-5 py-4">
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

        <button
          type="button"
          onClick={() => {
            void runConnectionTest();
          }}
          disabled={state.status === "checking"}
          className="shrink-0 border border-main bg-main px-3 py-1.5 text-[12px] font-semibold text-main transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === "checking" ? "Checking..." : "Run Test"}
        </button>
      </header>

      <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="overflow-hidden border border-main">
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Test Endpoint
            </div>
            <div className="px-3 py-2 font-mono text-[11px] text-main">
              /api/health/connections
            </div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Total checks
            </div>
            <div className="px-3 py-2 text-main">
              {state.summary?.total ?? state.checks.length}
            </div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Healthy
            </div>
            <div className="px-3 py-2 text-main">{state.summary?.okCount ?? 0}</div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Down
            </div>
            <div className="px-3 py-2 text-main">
              {state.summary?.downCount ?? 0}
            </div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Skipped
            </div>
            <div className="px-3 py-2 text-main">
              {state.summary?.skippedCount ?? 0}
            </div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Last checked
            </div>
            <div className="px-3 py-2 text-main">
              {formatCheckedAt(state.lastCheckedAt)}
            </div>
          </div>
        </div>

        <aside className="border border-main bg-secondary/30 p-3">
          <div
            className={`inline-flex border px-2 py-1 text-[11px] font-bold uppercase tracking-wide ${getStatusClasses(
              state.status,
            )}`}
          >
            {state.status}
          </div>
          <p className="mt-3 text-[12px] leading-5 text-main">{state.message}</p>
          <p className="mt-3 text-[11px] leading-5 text-muted">
            Connection page hiện kiểm tra MongoDB, storage Telegram/Drive và social
            accounts đã cấu hình. Không hiển thị secrets.
          </p>
        </aside>
      </div>

      <div className="border-t border-main px-5 py-5">
        <p className="text-[12px] font-semibold text-main">Checks Detail</p>
        <p className="mt-1 text-[11px] text-muted">
          Từng provider account được kiểm tra độc lập với status và latency riêng.
        </p>

        <div className="mt-3 overflow-x-auto border border-main">
          <table className="w-full border-collapse text-left text-[12px]">
            <thead className="border-b border-main bg-secondary/45 text-muted">
              <tr>
                <th className="px-4 py-2 font-semibold">Service</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Latency</th>
                <th className="px-4 py-2 font-semibold">Message</th>
              </tr>
            </thead>
            <tbody>
              {state.checks.length === 0 ? (
                <tr>
                  <td className="px-4 py-5 text-muted" colSpan={4}>
                    Chưa có dữ liệu kiểm tra.
                  </td>
                </tr>
              ) : (
                state.checks.map((check) => (
                  <tr
                    key={check.serviceKey}
                    className="border-b border-main last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <p className="text-main">{check.label}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted">
                        {check.serviceType}
                        {check.providerType ? ` · ${check.providerType}` : ""}
                        {check.platform ? ` · ${check.platform}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusClasses(
                          check.status,
                        )}`}
                      >
                        {check.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-main">
                      {check.latencyMs} ms
                    </td>
                    <td className="max-w-[520px] px-4 py-3 text-muted">
                      {check.message}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
