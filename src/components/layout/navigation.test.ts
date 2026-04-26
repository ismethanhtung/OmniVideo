import { describe, expect, it } from "vitest";

import { DEFAULT_SECTION_ID, LEFTBAR_NAV, getNavItem } from "./navigation";

describe("navigation registry", () => {
  it("resolves the default workspace section", () => {
    expect(DEFAULT_SECTION_ID).toBe("workspace");
    expect(getNavItem(DEFAULT_SECTION_ID)?.label).toBe("Workspace");
  });

  it("registers workspace as a visible leftbar item", () => {
    const workspaceGroup = LEFTBAR_NAV.find(
      (group) => group.sectionId === "workspace",
    );

    expect(workspaceGroup?.items.map((item) => item.id)).toContain("workspace");
    expect(getNavItem("workspace")?.description).toContain("node-flow");
  });
});
