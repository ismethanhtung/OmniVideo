"use client";

import { useMemo, useState } from "react";
import type { ElementType } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { LEFTBAR_NAV } from "@/components/layout/navigation";
import type {
  AppSectionId,
  LeftbarNavGroup,
} from "@/components/layout/types";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function filterSettingsNav(groups: LeftbarNavGroup[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return groups;
  }

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(normalized),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function SettingsSectionHeader({
  label,
  icon: Icon,
  isOpen,
  onToggle,
}: {
  label: string;
  icon: ElementType;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="group flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary/80"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted group-hover:text-main">
          {label}
        </span>
      </div>
      {isOpen ? (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted group-hover:text-main" />
      )}
    </button>
  );
}

type LeftbarProps = {
  activeSection: AppSectionId;
  onSectionChange: (sectionId: AppSectionId) => void;
};

export function Leftbar({ activeSection, onSectionChange }: LeftbarProps) {
  const [navQuery, setNavQuery] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    general: true,
    workspace: true,
    connection: true,
  });

  const filteredGroups = useMemo(
    () => filterSettingsNav(LEFTBAR_NAV, navQuery),
    [navQuery],
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <aside className="flex h-full min-h-0 w-[264px] shrink-0 select-none flex-col overflow-hidden border-r border-main bg-secondary/40">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-main px-4">
        <Link
          href="/"
          className="flex min-w-0 max-w-[min(100%,180px)] items-center gap-2.5 rounded-md py-0.5 pl-0.5 pr-1.5 transition-colors"
          title="Back to app"
        >
          <Image
            src="/logo.gif"
            alt="Logo"
            width={32}
            height={32}
            unoptimized
            className="shrink-0 rounded-sm"
            priority
          />
          <span className="truncate text-[14px] font-bold tracking-tight text-main">
            OmniVideo
          </span>
        </Link>
      </div>

      <div className="shrink-0 px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-main bg-main py-1.5 pl-8 pr-3 text-[12px] text-main placeholder:text-muted/60 focus:border-accent/40 focus:outline-none focus:ring-1 focus:ring-accent/25"
          />
        </div>
      </div>

      <nav className="thin-scrollbar flex-1 min-h-0 overflow-y-auto px-2 pb-6 pt-1">
        {filteredGroups.map((group) => {
          const isOpen = openSections[group.sectionId] ?? true;

          return (
            <div key={group.sectionId} className="mt-1 first:mt-0">
              <SettingsSectionHeader
                label={group.groupLabel}
                icon={group.sectionIcon}
                isOpen={isOpen}
                onToggle={() => toggleSection(group.sectionId)}
              />
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                    }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 py-1">
                      {group.items.map((item) => {
                        const active = activeSection === item.id;
                        const Icon = item.icon;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onSectionChange(item.id)}
                            className={cn(
                              "group flex w-full items-center gap-2.5 border-l-2 py-1.5 pl-2.5 pr-2 text-left transition-all duration-150",
                              active
                                ? "border-l-accent bg-accent/10"
                                : "border-l-transparent hover:bg-secondary/90",
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                active
                                  ? "text-accent"
                                  : "text-muted group-hover:text-main",
                              )}
                              strokeWidth={active ? 2.2 : 1.8}
                            />
                            <span
                              className={cn(
                                "min-w-0 flex-1 truncate text-[12px]",
                                active
                                  ? "font-semibold text-main"
                                  : "text-muted group-hover:text-main",
                              )}
                            >
                              {item.label}
                            </span>
                            {item.badge ? (
                              <span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                                {item.badge}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-main bg-secondary/30 px-3 py-3">
        <p className="text-center text-[10px] font-medium text-muted">
          OmniVideo + v0.1.0
        </p>
      </div>
    </aside>
  );
}
