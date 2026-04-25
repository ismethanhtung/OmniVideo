import {
  Bell,
  Box,
  Cable,
  Database,
  DownloadCloud,
  HardDrive,
  LayoutGrid,
  Layers,
  LifeBuoy,
  Network,
  Palette,
  Radio,
  Server,
  Shield,
  Sparkles,
  Vault,
  Type,
  User,
} from "lucide-react";

import type { AppSectionId, LeftbarNavGroup, LeftbarNavItem } from "./types";

export const DEFAULT_SECTION_ID: AppSectionId = "profile";

export const LEFTBAR_NAV: LeftbarNavGroup[] = [
  {
    sectionId: "general",
    sectionIcon: LayoutGrid,
    groupLabel: "General Settings",
    items: [
      {
        id: "profile",
        icon: User,
        label: "Account",
        description: "Thông tin vận hành cá nhân của workspace.",
      },
      {
        id: "ai",
        icon: Sparkles,
        label: "AI Settings",
        description: "Provider, model, quota và policy chọn AI.",
      },
      {
        id: "ui",
        icon: Type,
        label: "Typography",
        description: "Thiết lập font và density giao diện.",
      },
      {
        id: "appearance",
        icon: Palette,
        label: "Appearance",
        description: "Theme, token màu và giao diện tổng thể.",
      },
      {
        id: "notif",
        icon: Bell,
        label: "Notifications",
        description: "Thông báo job, lỗi và tác vụ cần chú ý.",
      },
    ],
  },
  {
    sectionId: "pipeline",
    sectionIcon: DownloadCloud,
    groupLabel: "Video Pipeline",
    items: [
      {
        id: "videoIntake",
        icon: DownloadCloud,
        label: "Video Intake",
        description: "Nhập video URL, chạy node pipeline và upload sang storage.",
      },
      {
        id: "storageProviders",
        icon: HardDrive,
        label: "Storage Providers",
        description: "Quản lý nhiều Telegram/Drive/S3/local storage accounts.",
      },
      {
        id: "storageLibrary",
        icon: Vault,
        label: "Storage Library",
        description: "Quản lý metadata video đã lưu ở Telegram/Drive.",
      },
    ],
  },
  {
    sectionId: "workspace",
    sectionIcon: Layers,
    groupLabel: "Workspace Settings",
    items: [
      {
        id: "integrations",
        icon: Server,
        label: "Integrations",
        description: "Kết nối AI, storage, social và automation tool.",
      },
      {
        id: "security",
        icon: Shield,
        label: "Security",
        description: "Secret, key, quyền truy cập và safety boundary.",
      },
      {
        id: "data",
        icon: Database,
        label: "Data Privacy",
        description: "Metadata, retention và quyền truy xuất dữ liệu.",
      },
      {
        id: "support",
        icon: LifeBuoy,
        label: "Support Access",
        description: "Cấu hình debug/support nội bộ khi cần.",
      },
    ],
  },
  {
    sectionId: "connection",
    sectionIcon: Network,
    groupLabel: "Connection",
    items: [
      {
        id: "connectionTest",
        icon: Cable,
        label: "Connection Test",
        description: "Kiểm tra trạng thái kết nối MongoDB và service.",
      },
      {
        id: "connectionStreams",
        icon: Radio,
        label: "Connection Streams",
        description: "Theo dõi stream/event kết nối khi pipeline chạy.",
        badge: "Soon",
      },
      {
        id: "connectionProviders",
        icon: Box,
        label: "Connection Providers",
        description: "Danh sách provider/API connection đã cấu hình.",
        badge: "Soon",
      },
    ],
  },
];

export function getNavItem(sectionId: AppSectionId): LeftbarNavItem | undefined {
  for (const group of LEFTBAR_NAV) {
    const item = group.items.find((entry) => entry.id === sectionId);

    if (item) {
      return item;
    }
  }

  return undefined;
}
