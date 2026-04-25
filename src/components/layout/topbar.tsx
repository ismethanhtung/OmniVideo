"use client";

import { Moon, RefreshCw, Sun } from "lucide-react";

import { getNavItem } from "@/components/layout/navigation";
import type { AppSectionId } from "@/components/layout/types";

type TopbarProps = {
    activeSection: AppSectionId;
    onRefreshView: () => void;
    themeMode: "light" | "dark";
    onToggleTheme: () => void;
};

export function Topbar({
    activeSection,
    onRefreshView,
    themeMode,
    onToggleTheme,
}: TopbarProps) {
    const currentSection = getNavItem(activeSection);

    return (
        <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-main bg-main px-3 md:px-5">
            <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-main">
                    {currentSection?.label ?? "OmniVideo"}
                </p>
                <p className="hidden truncate text-[10px] text-muted md:block">
                    {currentSection?.description ?? "Workspace navigation"}
                </p>
            </div>

            <div className="ml-2 flex min-w-0 items-center gap-2 overflow-x-auto thin-scrollbar">
                <button
                    type="button"
                    onClick={onRefreshView}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-main px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary"
                >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Refresh
                </button>
                <button
                    type="button"
                    onClick={onToggleTheme}
                    className="inline-flex shrink-0 items-center gap-1.5 border border-main bg-secondary px-2.5 py-1 text-[11px] font-semibold text-main transition-colors hover:bg-secondary/75"
                    aria-label="Toggle dark and light mode"
                >
                    {themeMode === "dark" ? (
                        <Moon className="h-3.5 w-3.5" />
                    ) : (
                        <Sun className="h-3.5 w-3.5" />
                    )}
                    {themeMode === "dark" ? "Dark" : "Light"}
                </button>
            </div>
        </header>
    );
}
