export const INSPIRATION_VAULT_UPDATED_EVENT =
    "omnivideo:inspiration-vault-updated";

export type InspirationCategory =
    | "video-source"
    | "link"
    | "keyword"
    | "note";

export type InspirationPlatform =
    | "bilibili"
    | "douyin"
    | "youtube"
    | "tiktok"
    | "generic"
    | "unknown";

export type InspirationVaultItem = {
    id: string;
    raw: string;
    title: string;
    category: InspirationCategory;
    platform: InspirationPlatform;
    url?: string;
    host?: string;
    referenceId?: string;
    tags: string[];
    exploited: boolean;
    createdAt: string;
    updatedAt: string;
};

export type InspirationDraft =
    | {
          ok: true;
          item: InspirationVaultItem;
      }
    | {
          ok: false;
          reason: "empty";
      };

export type ClassifyOptions = {
    now?: Date;
    idFactory?: () => string;
};

function createVaultId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }

    return `inspiration-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function toIsoDate(value: Date | undefined) {
    return (value ?? new Date()).toISOString();
}

function tryParseUrl(value: string): URL | null {
    try {
        return new URL(value);
    } catch {
        return null;
    }
}

function detectPlatform(url: URL): {
    platform: InspirationPlatform;
    category: InspirationCategory;
    referenceId?: string;
} {
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const full = `${host}${url.pathname}`;

    if (host.includes("bilibili.com") || host.includes("b23.tv")) {
        const referenceId = full.match(/BV[A-Za-z0-9]+/)?.[0];
        return {
            platform: "bilibili",
            category: "video-source",
            referenceId,
        };
    }

    if (host.includes("douyin.com")) {
        const referenceId = url.pathname
            .split("/")
            .filter(Boolean)
            .at(-1);
        return {
            platform: "douyin",
            category: "video-source",
            referenceId,
        };
    }

    if (host.includes("youtube.com") || host.includes("youtu.be")) {
        const referenceId =
            url.searchParams.get("v") ??
            url.pathname
                .split("/")
                .filter(Boolean)
                .at(-1);
        return {
            platform: "youtube",
            category: "video-source",
            referenceId: referenceId ?? undefined,
        };
    }

    if (host.includes("tiktok.com")) {
        return {
            platform: "tiktok",
            category: "video-source",
            referenceId: url.pathname
                .split("/")
                .filter(Boolean)
                .at(-1),
        };
    }

    return {
        platform: "generic",
        category: "link",
    };
}

function inferTextCategory(value: string): InspirationCategory {
    const words = value.split(/\s+/).filter(Boolean);

    if (words.length <= 3 && value.length <= 48) {
        return "keyword";
    }

    return "note";
}

function titleFromUrl(url: URL, platform: InspirationPlatform, referenceId?: string) {
    if (referenceId) {
        return `${platformLabel(platform)} ${referenceId}`;
    }

    return url.hostname.replace(/^www\./, "");
}

export function platformLabel(platform: InspirationPlatform) {
    const labels: Record<InspirationPlatform, string> = {
        bilibili: "Bilibili",
        douyin: "Douyin",
        youtube: "YouTube",
        tiktok: "TikTok",
        generic: "Web",
        unknown: "Unknown",
    };

    return labels[platform];
}

export function categoryLabel(category: InspirationCategory) {
    const labels: Record<InspirationCategory, string> = {
        "video-source": "Video Source",
        link: "Link",
        keyword: "Keyword",
        note: "Note",
    };

    return labels[category];
}

export function classifyInspirationInput(
    rawInput: string,
    options: ClassifyOptions = {},
): InspirationDraft {
    const raw = rawInput.trim();

    if (!raw) {
        return {
            ok: false,
            reason: "empty",
        };
    }

    const createdAt = toIsoDate(options.now);
    const url = tryParseUrl(raw);
    const id = options.idFactory?.() ?? createVaultId();

    if (url && (url.protocol === "http:" || url.protocol === "https:")) {
        const detected = detectPlatform(url);

        return {
            ok: true,
            item: {
                id,
                raw,
                title: titleFromUrl(url, detected.platform, detected.referenceId),
                category: detected.category,
                platform: detected.platform,
                url: url.toString(),
                host: url.hostname.replace(/^www\./, ""),
                referenceId: detected.referenceId,
                tags: [
                    detected.category,
                    detected.platform,
                    ...(detected.referenceId ? [detected.referenceId] : []),
                ],
                exploited: false,
                createdAt,
                updatedAt: createdAt,
            },
        };
    }

    const category = inferTextCategory(raw);

    return {
        ok: true,
        item: {
            id,
            raw,
            title: raw,
            category,
            platform: "unknown",
            tags: [category],
            exploited: false,
            createdAt,
            updatedAt: createdAt,
        },
    };
}

export function isValidInspirationVaultItemId(value: string): boolean {
    return /^[A-Za-z0-9:_-]{6,128}$/.test(value);
}

export function toggleInspirationVaultItem(
    items: InspirationVaultItem[],
    itemId: string,
    exploited: boolean,
    now = new Date(),
): InspirationVaultItem[] {
    const updatedAt = now.toISOString();

    return items.map((item) =>
        item.id === itemId
            ? {
                  ...item,
                  exploited,
                  updatedAt,
              }
            : item,
    );
}

export function deleteInspirationVaultItem(
    items: InspirationVaultItem[],
    itemId: string,
): InspirationVaultItem[] {
    return items.filter((item) => item.id !== itemId);
}
