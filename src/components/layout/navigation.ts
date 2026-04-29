import {
    BrainCircuit,
    Cable,
    DownloadCloud,
    HardDrive,
    LayoutGrid,
    Layers,
    Network,
    Vault,
    Palette,
    Upload,
    Share2,
    ClipboardList,
    Send,
    BookOpen,
    ListVideo,
    Mic2,
    RadioTower,
    TestTubes,
} from "lucide-react";

import type { AppSectionId, LeftbarNavGroup, LeftbarNavItem } from "./types";

export const DEFAULT_SECTION_ID: AppSectionId = "workspace";

export const LEFTBAR_NAV: LeftbarNavGroup[] = [
    {
        sectionId: "workspace",
        sectionIcon: Layers,
        groupLabel: "Workspace",
        items: [
            {
                id: "workspace",
                icon: Layers,
                label: "Workspace",
                description:
                    "Thiết kế node-flow pipeline linh hoạt bằng node contracts.",
            },
        ],
    },
    {
        sectionId: "general",
        sectionIcon: LayoutGrid,
        groupLabel: "General Settings",
        items: [
            {
                id: "display",
                icon: Palette,
                label: "Display",
                description: "Typography + Appearance: fonts và themes.",
            },
            {
                id: "aiProviders",
                icon: BrainCircuit,
                label: "AI Providers",
                description:
                    "Quản lý kết nối AI providers (Groq, OpenRouter, custom) với quota và usage tracking.",
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
                description:
                    "Nhập video URL, chạy node pipeline và upload sang storage.",
            },
            {
                id: "localUploadIntake",
                icon: Upload,
                label: "Local Upload Intake",
                description:
                    "Upload video từ máy local lên Telegram/Drive và persist metadata đầy đủ vào MongoDB.",
            },
            {
                id: "chineseTranscription",
                icon: Mic2,
                label: "Audio Transcript",
                description:
                    "Extract audio từ video/audio và gọi Groq Whisper Large v3 Turbo để lấy text + timestamp.",
            },

            {
                id: "storageProviders",
                icon: HardDrive,
                label: "Storage Providers",
                description:
                    "Quản lý nhiều Telegram/Drive/S3/local storage accounts.",
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
        sectionId: "social",
        sectionIcon: Share2,
        groupLabel: "Social Platforms",
        items: [
            {
                id: "socialAccounts",
                icon: Share2,
                label: "Social Accounts",
                description:
                    "Quản lý account Facebook, TikTok, Shopee và YouTube với secrets được mask.",
            },
            {
                id: "platformTasks",
                icon: ClipboardList,
                label: "Platform Tasks",
                description:
                    "Xem capability, scope còn thiếu và tác vụ có thể làm trên từng nền tảng.",
            },
            {
                id: "publishRecords",
                icon: Send,
                label: "Publish Records",
                description:
                    "Lập kế hoạch đăng video từ Storage Library sang social account.",
            },
            {
                id: "publishedContent",
                icon: ListVideo,
                label: "Published Content",
                description:
                    "Xem video/Short đã đăng theo social account và footprint nền tảng của từng asset.",
            },
            {
                id: "tutorialDocs",
                icon: BookOpen,
                label: "Tutor Docs",
                description:
                    "Hướng dẫn tích hợp OAuth, social publish và các cấu hình vận hành quan trọng.",
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
        ],
    },
    {
        sectionId: "test",
        sectionIcon: TestTubes,
        groupLabel: "Test",
        items: [
            {
                id: "piperTtsSandbox",
                icon: RadioTower,
                label: "Piper TTS Sandbox",
                description:
                    "Test local Piper voice model ONNX bằng CPU, không cần GPU.",
            },
        ],
    },
];

export function getNavItem(
    sectionId: AppSectionId,
): LeftbarNavItem | undefined {
    for (const group of LEFTBAR_NAV) {
        const item = group.items.find((entry) => entry.id === sectionId);

        if (item) {
            return item;
        }
    }

    return undefined;
}
