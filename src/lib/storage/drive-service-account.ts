import { createSign } from "node:crypto";

type DriveServiceAccountCredentials = {
  client_email?: string;
  private_key?: string;
  token_uri?: string;
};

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  error?: string;
  error_description?: string;
};

const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function normalizePrivateKey(privateKey: string): string {
  return privateKey.includes("\\n")
    ? privateKey.replace(/\\n/g, "\n")
    : privateKey;
}

function parseDriveServiceAccountJson(json: string): DriveServiceAccountCredentials {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Service account JSON is not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Service account JSON must be an object.");
  }

  const payload = parsed as Record<string, unknown>;
  const clientEmail =
    typeof payload.client_email === "string" ? payload.client_email.trim() : "";
  const privateKey =
    typeof payload.private_key === "string" ? payload.private_key.trim() : "";
  const tokenUri =
    typeof payload.token_uri === "string" ? payload.token_uri.trim() : "";

  if (!clientEmail) {
    throw new Error("Service account JSON missing client_email.");
  }

  if (!privateKey) {
    throw new Error("Service account JSON missing private_key.");
  }

  return {
    client_email: clientEmail,
    private_key: normalizePrivateKey(privateKey),
    token_uri: tokenUri || GOOGLE_TOKEN_AUDIENCE,
  };
}

type ExchangeTokenInput = {
  serviceAccountJson: string;
  scope?: string;
  fetchImpl?: typeof fetch;
  nowMs?: number;
};

export async function exchangeDriveServiceAccountToken({
  serviceAccountJson,
  scope = GOOGLE_DRIVE_SCOPE,
  fetchImpl = fetch,
  nowMs = Date.now(),
}: ExchangeTokenInput): Promise<string> {
  const credentials = parseDriveServiceAccountJson(serviceAccountJson);
  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    iss: credentials.client_email,
    scope,
    aud: credentials.token_uri ?? GOOGLE_TOKEN_AUDIENCE,
    exp,
    iat,
  };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;
  const signer = createSign("RSA-SHA256");

  signer.update(unsignedJwt);
  signer.end();

  const signature = signer.sign(credentials.private_key ?? "", "base64url");
  const assertion = `${unsignedJwt}.${signature}`;
  const response = await fetchImpl(credentials.token_uri ?? GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as TokenResponse;
  const token = payload.access_token?.trim();

  if (!response.ok || !token) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        `Could not exchange service account token. Status ${response.status}.`,
    );
  }

  return token;
}

export async function resolveDriveAccessToken({
  accessToken,
  driveServiceAccountJson,
  fetchImpl,
}: {
  accessToken?: string;
  driveServiceAccountJson?: string;
  fetchImpl?: typeof fetch;
}): Promise<string | undefined> {
  const trimmedToken = accessToken?.trim();

  if (trimmedToken) {
    return trimmedToken;
  }

  const serviceAccountJson = driveServiceAccountJson?.trim();

  if (!serviceAccountJson) {
    return undefined;
  }

  return exchangeDriveServiceAccountToken({
    serviceAccountJson,
    fetchImpl,
  });
}
