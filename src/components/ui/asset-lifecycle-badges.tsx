import { getAssetLifecycleBadges } from "@/lib/storage/asset-lifecycle-tags";

export function AssetLifecycleBadges({
    tags,
}: {
    tags?: string[] | null;
}) {
    const badges = getAssetLifecycleBadges(tags);
    if (badges.length === 0) {
        return null;
    }

    return (
        <span className="flex flex-wrap gap-1">
            {badges.map((badge) => (
                <span
                    key={badge.label}
                    className={`inline-flex border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.className}`}
                >
                    {badge.label}
                </span>
            ))}
        </span>
    );
}
