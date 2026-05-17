export type FolderSearchableAsset = {
  _id?: string;
  providerAssetId?: string | null;
  metadata?: {
    title?: string | null;
    folder?: string | null;
    tags?: string[] | null;
    sourceUrl?: string | null;
  };
};

const FOLDER_MAX_LENGTH = 120;
const LIFECYCLE_TAGS = new Set(["raw", "processed"]);

export function normalizeAssetFolderName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ").slice(0, FOLDER_MAX_LENGTH);
}

export function normalizeAssetSearchText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

export function buildFolderAssetTags({
  folder,
  lifecycle,
  extraTags = [],
}: {
  folder: string;
  lifecycle: "raw" | "processed";
  extraTags?: string[];
}) {
  const normalizedFolder = normalizeAssetFolderName(folder);
  const normalizedTags = [
    normalizedFolder,
    lifecycle,
    ...extraTags.map((tag) => tag.trim()).filter(Boolean),
  ].filter(Boolean);
  const seen = new Set<string>();

  return normalizedTags.filter((tag) => {
    const key = normalizeAssetSearchText(tag);
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function inferFolderFromTags(tags: unknown) {
  if (!Array.isArray(tags)) {
    return "";
  }

  const candidate = tags.find((tag) => {
    const normalized = normalizeAssetSearchText(tag);
    return (
      typeof tag === "string" &&
      Boolean(normalizeAssetFolderName(tag)) &&
      !LIFECYCLE_TAGS.has(normalized)
    );
  });

  return normalizeAssetFolderName(candidate);
}

export function getAssetFolderName(asset: FolderSearchableAsset) {
  return (
    normalizeAssetFolderName(asset.metadata?.folder) ||
    inferFolderFromTags(asset.metadata?.tags)
  );
}

export function matchesVideoAssetSearch(
  asset: FolderSearchableAsset,
  query: string,
) {
  const normalizedQuery = normalizeAssetSearchText(query);
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    asset.metadata?.title,
    getAssetFolderName(asset),
    ...(asset.metadata?.tags ?? []),
    asset.metadata?.sourceUrl,
    asset.providerAssetId,
    asset._id,
  ]
    .map((value) => normalizeAssetSearchText(value))
    .filter(Boolean)
    .join(" ");

  return haystack.includes(normalizedQuery);
}
