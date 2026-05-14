"use client";

import type { LeftbarNavItem } from "@/components/layout/types";
import { ChineseTranscriptionPanel } from "./chinese-transcription-panel";

type ChineseTranscriptionV2PanelProps = {
    section: LeftbarNavItem;
};

export function ChineseTranscriptionV2Panel({
    section,
}: ChineseTranscriptionV2PanelProps) {
    return (
        <ChineseTranscriptionPanel
            section={section}
            enableVideoPreprocess
            defaultVideoSpeedFactor={0.6}
        />
    );
}
