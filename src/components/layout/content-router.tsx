import type { ComponentType } from "react";

import { getNavItem } from "@/components/layout/navigation";
import type { AppSectionId, LeftbarNavItem } from "@/components/layout/types";
import { ConnectionTestPanel } from "@/features/connections/connection-test-panel";
import { PlaceholderPanel } from "@/features/workspace/placeholder-panel";

type SectionComponentProps = {
  section: LeftbarNavItem;
};

const SECTION_COMPONENTS: Partial<
  Record<AppSectionId, ComponentType<SectionComponentProps>>
> = {
  connectionTest: ConnectionTestPanel,
};

type ContentRouterProps = {
  activeSection: AppSectionId;
};

export function ContentRouter({ activeSection }: ContentRouterProps) {
  const section = getNavItem(activeSection);

  if (!section) {
    return (
      <main className="min-w-0 flex-1 overflow-auto bg-secondary/35 p-5">
        <div className="border border-main bg-main px-5 py-4">
          <p className="text-sm font-medium text-main">Unknown section</p>
          <p className="mt-1 text-xs text-muted">
            Section này chưa được đăng ký trong navigation registry.
          </p>
        </div>
      </main>
    );
  }

  const SectionComponent = SECTION_COMPONENTS[activeSection] ?? PlaceholderPanel;

  return (
    <main className="min-w-0 flex-1 overflow-auto bg-secondary/35">
      <div className="mx-auto w-full max-w-6xl px-5 py-5">
        <SectionComponent section={section} />
      </div>
    </main>
  );
}
