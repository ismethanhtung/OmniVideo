type StrictDownloadFilenameInput = {
  baseName: string | null | undefined;
  fallbackBaseName: string;
  extension: string;
  maxBaseLength?: number;
};

function normalizeExtension(extension: string) {
  const normalized = extension.trim().replace(/^\.+/u, "").toLowerCase();
  return normalized ? `.${normalized}` : "";
}

export function sanitizeStrictDownloadBaseName(
  value: string | null | undefined,
  fallbackBaseName: string,
  maxLength = 90,
) {
  const normalized = (value || "")
    .replace(/[Đđ]/gu, (match) => (match === "Đ" ? "D" : "d"))
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, maxLength)
    .replace(/-+$/gu, "");

  return normalized || fallbackBaseName;
}

export function buildStrictDownloadFilename(input: StrictDownloadFilenameInput) {
  const fallbackBaseName = sanitizeStrictDownloadBaseName(
    input.fallbackBaseName,
    "download",
    input.maxBaseLength,
  );
  const baseName = sanitizeStrictDownloadBaseName(
    input.baseName,
    fallbackBaseName,
    input.maxBaseLength,
  );

  return `${baseName}${normalizeExtension(input.extension)}`;
}
