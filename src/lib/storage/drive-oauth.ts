import crypto from "node:crypto";

type DriveOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  baseUrl: string;
  scopes: string[];
};

function readBaseUrl(preferredBaseUrl?: string) {
  const preferred = preferredBaseUrl?.trim();

  if (preferred) {
    return preferred;
  }

  return (
    process.env.STORAGE_OAUTH_BASE_URL?.trim() ||
    process.env.SOCIAL_OAUTH_BASE_URL?.trim() ||
    "http://localhost:3001"
  );
}

export function getDriveOAuthConfig(preferredBaseUrl?: string): DriveOAuthConfig {
  const baseUrl = readBaseUrl(preferredBaseUrl).replace(/\/$/, "");

  return {
    clientId: process.env.DRIVE_CLIENT_ID?.trim() ?? "",
    clientSecret: process.env.DRIVE_CLIENT_SECRET?.trim() ?? "",
    redirectUri: `${baseUrl}/api/storage/oauth/callback/drive`,
    baseUrl,
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  };
}

export function getMissingDriveOAuthConfig(preferredBaseUrl?: string) {
  const config = getDriveOAuthConfig(preferredBaseUrl);
  const missing: string[] = [];

  if (!config.clientId) {
    missing.push("DRIVE_CLIENT_ID");
  }

  if (!config.clientSecret) {
    missing.push("DRIVE_CLIENT_SECRET");
  }

  return missing;
}

export function createDriveOAuthState() {
  return crypto
    .createHash("sha256")
    .update(`${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex");
}

export function buildDriveAuthorizationUrl(
  state: string,
  preferredBaseUrl?: string,
) {
  const config = getDriveOAuthConfig(preferredBaseUrl);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  return url.toString();
}

export async function exchangeDriveOAuthCode(
  code: string,
  preferredBaseUrl?: string,
) {
  const config = getDriveOAuthConfig(preferredBaseUrl);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  return response.json() as Promise<Record<string, unknown>>;
}

export function getDriveOAuthOrigin(preferredBaseUrl?: string) {
  const config = getDriveOAuthConfig(preferredBaseUrl);

  try {
    return new URL(config.baseUrl).origin;
  } catch {
    return "http://localhost:3001";
  }
}
