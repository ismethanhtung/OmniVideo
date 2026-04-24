"use client";

import { useEffect, useState } from "react";

import type { LeftbarNavItem } from "@/components/layout/types";

type DbHealthState = {
  status: "idle" | "checking" | "ok" | "down";
  message: string;
  latencyMs?: number;
  database?: string;
  lastCheckedAt?: string;
};

type ConnectionTestPanelProps = {
  section: LeftbarNavItem;
};

const INITIAL_STATE: DbHealthState = {
  status: "idle",
  message: "MongoDB status not checked yet.",
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

function getStatusClasses(status: DbHealthState["status"]) {
  if (status === "ok") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "down") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "checking") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-main bg-secondary text-muted";
}

export function ConnectionTestPanel({ section }: ConnectionTestPanelProps) {
  const [state, setState] = useState<DbHealthState>(INITIAL_STATE);
  const Icon = section.icon;

  const runConnectionTest = async () => {
    setState({
      status: "checking",
      message: "Checking MongoDB connection...",
    });

    try {
      const response = await fetch("/api/health/db", {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        database?: string;
        error?: string;
        latencyMs?: number;
        timestamp?: string;
      };

      if (response.ok && payload.ok) {
        setState({
          status: "ok",
          message: "MongoDB connection is healthy.",
          latencyMs: payload.latencyMs,
          database: payload.database,
          lastCheckedAt: payload.timestamp,
        });
        return;
      }

      setState({
        status: "down",
        message: payload.error ?? "MongoDB connection failed.",
        latencyMs: payload.latencyMs,
        database: payload.database,
        lastCheckedAt: payload.timestamp,
      });
    } catch {
      setState({
        status: "down",
        message: "MongoDB connection failed.",
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
              Service
            </div>
            <div className="px-3 py-2 font-medium text-main">MongoDB</div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Endpoint
            </div>
            <div className="px-3 py-2 font-mono text-[11px] text-main">
              /api/health/db
            </div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Database
            </div>
            <div className="px-3 py-2 text-main">{state.database ?? "-"}</div>
          </div>
          <div className="grid grid-cols-[160px_minmax(0,1fr)] border-b border-main text-[12px]">
            <div className="bg-secondary/45 px-3 py-2 font-medium text-muted">
              Latency
            </div>
            <div className="px-3 py-2 text-main">
              {typeof state.latencyMs === "number" ? `${state.latencyMs} ms` : "-"}
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
            Connection page chỉ kiểm tra trạng thái kết nối. Logging, retry và
            history sẽ nằm trong Observability module sau.
          </p>
        </aside>
      </div>
    </section>
  );
}
