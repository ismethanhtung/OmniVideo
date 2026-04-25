type GoogleApiErrorPayload = {
  error?: {
    message?: string;
    errors?: Array<{
      message?: string;
      reason?: string;
    }>;
  };
};

function toReadableText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function readGoogleDriveErrorMessage(
  response: Response,
  fallbackMessage: string,
) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    const rawText = toReadableText(await response.text().catch(() => ""));
    return rawText || fallbackMessage;
  }

  const payload = (await response
    .json()
    .catch(() => ({}))) as GoogleApiErrorPayload;
  const primary = toReadableText(payload.error?.message);

  if (primary) {
    return primary;
  }

  const nested = payload.error?.errors
    ?.map((item) => toReadableText(item.message || item.reason))
    .find(Boolean);

  return nested || fallbackMessage;
}

export function withGoogleDrivePermissionHint(message: string) {
  const lowered = message.toLowerCase();
  const looksLikePermissionIssue =
    lowered.includes("insufficient") ||
    lowered.includes("permission") ||
    lowered.includes("forbidden") ||
    lowered.includes("not a member") ||
    lowered.includes("parents") ||
    lowered.includes("shared drive");

  if (!looksLikePermissionIssue) {
    return message;
  }

  return `${message} Ensure the target folder is shared with the Service Account email and supportsAllDrives is enabled.`;
}
