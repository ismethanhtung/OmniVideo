export type LifecycleBadge = {
    label: string;
    className: string;
};

const LIFECYCLE_BADGES: Record<string, LifecycleBadge> = {
    raw: {
        label: "raw",
        className: "border-amber-500/35 bg-amber-500/12 text-amber-700",
    },
    processed: {
        label: "processed",
        className: "border-emerald-500/35 bg-emerald-500/12 text-emerald-700",
    },
    "has-processed-output": {
        label: "has processed output",
        className: "border-rose-500/35 bg-rose-500/12 text-rose-700",
    },
};

export function getAssetLifecycleBadges(tags?: string[] | null) {
    return (tags ?? [])
        .map((tag) => LIFECYCLE_BADGES[tag.trim().toLocaleLowerCase("en-US")])
        .filter((badge): badge is LifecycleBadge => Boolean(badge));
}
