import type { ElementType } from "react";

export type AppSectionId =
  | "workspace"
  | "profile"
  | "ai"
  | "display"
  | "notif"
  | "videoIntake"
  | "localUploadIntake"
  | "chineseTranscription"
  | "storageProviders"
  | "storageLibrary"
  | "socialAccounts"
  | "platformTasks"
  | "publishRecords"
  | "publishedContent"
  | "tutorialDocs"
  | "integrations"
  | "security"
  | "data"
  | "support"
  | "connectionTest"
  | "connectionStreams"
  | "connectionProviders";

export type LeftbarNavItem = {
  id: AppSectionId;
  icon: ElementType;
  label: string;
  description: string;
  badge?: string;
};

export type LeftbarNavGroup = {
  sectionId: string;
  sectionIcon: ElementType;
  groupLabel: string;
  items: LeftbarNavItem[];
};
