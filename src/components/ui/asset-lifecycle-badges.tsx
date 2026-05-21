import { getAssetLifecycleBadges } from "@/lib/storage/asset-lifecycle-tags";

export function AssetLifecycleBadges({
    tags,
    wrap = false,
}: {
    tags?: string[] | null;
    wrap?: boolean;
}) {
    const badges = getAssetLifecycleBadges(tags);
    if (badges.length === 0) {
        return null;
    }

    return (
        <span
            className={
                wrap
                    ? "inline-flex max-w-full flex-wrap items-center gap-1"
                    : "inline-flex shrink-0 items-center gap-1"
            }
        >
            {badges.map((badge) => (
                <span
                    key={badge.label}
                    className={`inline-flex ${wrap ? "" : "whitespace-nowrap"} border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.className}`}
                >
                    {badge.label}
                </span>
            ))}
        </span>
    );
}
