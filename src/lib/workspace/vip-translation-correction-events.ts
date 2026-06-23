export const WORKSPACE_VIP_TRANSLATION_CORRECTION_EVENT =
    "omnivideo:workspace-vip-translation-correction";

export type WorkspaceVipTranslationCorrectionSegment = {
    id: number;
    translatedText: string;
};

export type WorkspaceVipTranslationCorrectionDetail = {
    vipNodeId: string;
    segments: WorkspaceVipTranslationCorrectionSegment[];
};

export function dispatchWorkspaceVipTranslationCorrection(
    detail: WorkspaceVipTranslationCorrectionDetail,
) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent(WORKSPACE_VIP_TRANSLATION_CORRECTION_EVENT, {
            detail,
        }),
    );
}

export function isWorkspaceVipTranslationCorrectionDetail(
    value: unknown,
): value is WorkspaceVipTranslationCorrectionDetail {
    if (!value || typeof value !== "object") return false;
    const detail = value as Partial<WorkspaceVipTranslationCorrectionDetail>;
    if (typeof detail.vipNodeId !== "string" || !detail.vipNodeId.trim()) {
        return false;
    }
    if (!Array.isArray(detail.segments) || detail.segments.length === 0) {
        return false;
    }
    return detail.segments.every(
        (segment) =>
            segment !== null &&
            typeof segment === "object" &&
            Number.isInteger(
                (segment as WorkspaceVipTranslationCorrectionSegment).id,
            ) &&
            typeof (segment as WorkspaceVipTranslationCorrectionSegment)
                .translatedText === "string",
    );
}
