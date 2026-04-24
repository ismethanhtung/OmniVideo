"use client";

import { useState } from "react";

import { ContentRouter } from "@/components/layout/content-router";
import { DEFAULT_SECTION_ID } from "@/components/layout/navigation";
import { Leftbar } from "@/components/layout/leftbar";
import type { AppSectionId } from "@/components/layout/types";

export function AppShell() {
  const [activeSection, setActiveSection] =
    useState<AppSectionId>(DEFAULT_SECTION_ID);

  return (
    <div className="flex h-screen min-h-screen bg-main text-main">
      <Leftbar activeSection={activeSection} onSectionChange={setActiveSection} />
      <ContentRouter activeSection={activeSection} />
    </div>
  );
}
