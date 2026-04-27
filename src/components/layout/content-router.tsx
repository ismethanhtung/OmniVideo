import type { ComponentType } from "react";

import { getNavItem } from "@/components/layout/navigation";
import type { AppSectionId, LeftbarNavItem } from "@/components/layout/types";
import { ConnectionTestPanel } from "@/features/connections/connection-test-panel";
import { ChineseTranscriptionPanel } from "@/features/audio/chinese-transcription-panel";
import { StorageLibraryPanel } from "@/features/storage/storage-library-panel";
import { StorageProvidersPanel } from "@/features/storage/storage-providers-panel";
import { LocalUploadIntakePanel } from "@/features/video-intake/local-upload-intake-panel";
import { VideoIntakePanel } from "@/features/video-intake/video-intake-panel";
import { DisplayPreferencesPanel } from "@/features/workspace/display-preferences-panel";
import { PlaceholderPanel } from "@/features/workspace/placeholder-panel";
import { WorkspaceCanvasPanel } from "@/features/workspace/workspace-canvas-panel";
import { PlatformTasksPanel } from "@/features/social/platform-tasks-panel";
import { PublishedContentPanel } from "@/features/social/published-content-panel";
import { PublishRecordsPanel } from "@/features/social/publish-records-panel";
import { SocialAccountsPanel } from "@/features/social/social-accounts-panel";
import { TutorialDocsPanel } from "@/features/social/tutorial-docs-panel";
import type { AppFontKey, AppThemeKey } from "@/lib/ui/preferences";

type SectionComponentProps = {
    section: LeftbarNavItem;
};

const SECTION_COMPONENTS: Partial<
    Record<AppSectionId, ComponentType<SectionComponentProps>>
> = {
    connectionTest: ConnectionTestPanel,
    storageLibrary: StorageLibraryPanel,
    chineseTranscription: ChineseTranscriptionPanel,
    localUploadIntake: LocalUploadIntakePanel,
    storageProviders: StorageProvidersPanel,
    socialAccounts: SocialAccountsPanel,
    platformTasks: PlatformTasksPanel,
    publishedContent: PublishedContentPanel,
    publishRecords: PublishRecordsPanel,
    tutorialDocs: TutorialDocsPanel,
    videoIntake: VideoIntakePanel,
    workspace: WorkspaceCanvasPanel,
};

type ContentRouterProps = {
    activeSection: AppSectionId;
    appTheme: AppThemeKey;
    appFont: AppFontKey;
    onAppThemeChange: (theme: AppThemeKey) => void;
    onAppFontChange: (font: AppFontKey) => void;
};

export function ContentRouter({
    activeSection,
    appTheme,
    appFont,
    onAppThemeChange,
    onAppFontChange,
}: ContentRouterProps) {
    const section = getNavItem(activeSection);

    if (!section) {
        return (
            <main className="min-w-0 flex-1 overflow-auto bg-secondary/35 p-5">
                <div className="border border-main bg-main px-5 py-4">
                    <p className="text-sm font-medium text-main">
                        Unknown section
                    </p>
                    <p className="mt-1 text-xs text-muted">
                        Section này chưa được đăng ký trong navigation registry.
                    </p>
                </div>
            </main>
        );
    }

    const SectionComponent =
        SECTION_COMPONENTS[activeSection] ?? PlaceholderPanel;

    if (activeSection === "display") {
        return (
            <main className="min-w-0 flex-1 overflow-auto bg-secondary/35">
                <div className="mx-auto w-full max-w-7xl px-5 py-5">
                    <DisplayPreferencesPanel
                        section={section}
                        appTheme={appTheme}
                        appFont={appFont}
                        onAppThemeChange={onAppThemeChange}
                        onAppFontChange={onAppFontChange}
                    />
                </div>
            </main>
        );
    }

    if (activeSection === "workspace") {
        return (
            <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-secondary/35 p-3">
                <SectionComponent section={section} />
            </main>
        );
    }

    return (
        <main className="min-w-0 flex-1 overflow-auto bg-secondary/35">
            <div className="mx-auto w-full max-w-7xl px-5 py-5">
                <SectionComponent section={section} />
            </div>
        </main>
    );
}
