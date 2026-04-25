import type { ElementType } from "react";

export type AppSectionId =
  | "profile"
  | "ai"
  | "ui"
  | "appearance"
  | "notif"
  | "videoIntake"
  | "storageProviders"
  | "storageLibrary"
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
