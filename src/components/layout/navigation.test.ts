import { describe, expect, it } from "vitest";

import {
  DEFAULT_SECTION_ID,
  LEFTBAR_NAV,
  getNavItem,
  isAppSectionId,
  resolveSectionFromSegment,
  toSectionPath,
} from "./navigation";

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

  it("registers audio transcription and inspiration vault pages", () => {
    const pipelineGroup = LEFTBAR_NAV.find(
      (group) => group.sectionId === "pipeline",
    );

    expect(pipelineGroup?.items.map((item) => item.id)).toContain(
      "chineseTranscription",
    );
    expect(pipelineGroup?.items.map((item) => item.id)).toContain(
      "thumbnailStudio",
    );
    expect(pipelineGroup?.items.map((item) => item.id)).toContain(
      "aiImageStudio",
    );
    expect(LEFTBAR_NAV.flatMap((group) => group.items.map((item) => item.id))).toContain(
      "inspirationVault",
    );
    expect(getNavItem("chineseTranscription")?.description).toContain("Groq");
    expect(getNavItem("chineseTranscription")?.label).toBe("Audio Transcript");
    expect(getNavItem("thumbnailStudio")?.label).toBe("Thumbnail Studio");
    expect(getNavItem("aiImageStudio")?.label).toBe("AI Image Studio");
    expect(getNavItem("inspirationVault")?.label).toBe("Inspiration Vault");
  });

  it("registers feature sandbox in test group and leaves Groq TTS sandbox removed", () => {
    const testGroup = LEFTBAR_NAV.find(
      (group) => group.sectionId === "test",
    );
    const pipelineGroup = LEFTBAR_NAV.find(
      (group) => group.sectionId === "pipeline",
    );
    const navIds = LEFTBAR_NAV.flatMap((group) =>
      group.items.map((item) => item.id),
    );

    expect(testGroup?.items.map((item) => item.id)).toContain(
      "piperTtsSandbox",
    );
    expect(pipelineGroup?.items.map((item) => item.id)).toContain("videoToolsLab");
    expect(getNavItem("piperTtsSandbox")?.label).toBe("Feature Sandbox");
    expect(getNavItem("piperTtsSandbox")?.description).toContain("speech transcription providers");
    expect(getNavItem("videoToolsLab")?.description).toContain("mirror video");
    expect(getNavItem("videoSplitter")?.label).toBe("Video Tools");
    expect(navIds).not.toContain("groqTtsSandbox");
  });

  it("maps sections to stable route paths", () => {
    expect(toSectionPath("workspace")).toBe("/workspace");
    expect(toSectionPath("inspirationVault")).toBe("/inspiration-vault");
    expect(toSectionPath("videoIntake")).toBe("/video-intake");
    expect(toSectionPath("thumbnailStudio")).toBe("/thumbnail-studio");
    expect(toSectionPath("aiImageStudio")).toBe("/ai-image-studio");
    expect(toSectionPath("publishedContent")).toBe("/published-content");
  });

  it("validates section ids from route segments", () => {
    expect(isAppSectionId("workspace")).toBe(true);
    expect(isAppSectionId("inspirationVault")).toBe(true);
    expect(isAppSectionId("tutorialDocs")).toBe(true);
    expect(isAppSectionId("unknown")).toBe(false);
  });

  it("resolves section from canonical and legacy route segments", () => {
    expect(resolveSectionFromSegment("inspiration-vault")).toBe("inspirationVault");
    expect(resolveSectionFromSegment("inspirationVault")).toBe("inspirationVault");
    expect(resolveSectionFromSegment("published-content")).toBe("publishedContent");
    expect(resolveSectionFromSegment("publishedContent")).toBe("publishedContent");
    expect(resolveSectionFromSegment("thumbnail-studio")).toBe("thumbnailStudio");
    expect(resolveSectionFromSegment("thumbnailStudio")).toBe("thumbnailStudio");
    expect(resolveSectionFromSegment("ai-image-studio")).toBe("aiImageStudio");
    expect(resolveSectionFromSegment("aiImageStudio")).toBe("aiImageStudio");
    expect(resolveSectionFromSegment("")).toBe("workspace");
    expect(resolveSectionFromSegment("unknown")).toBeNull();
  });
});
