type DriveTokenRefreshPayload = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

export async function resolveDriveRuntimeAccessToken({
  accessToken,
  refreshToken,
  clientId = process.env.DRIVE_CLIENT_ID?.trim(),
  clientSecret = process.env.DRIVE_CLIENT_SECRET?.trim(),
  fetchImpl = fetch,
}: {
  accessToken?: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  fetchImpl?: typeof fetch;
}) {
  const trimmedAccessToken = accessToken?.trim();
  const trimmedRefreshToken = refreshToken?.trim();

  if (trimmedRefreshToken && clientId && clientSecret) {
    const response = await fetchImpl("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: trimmedRefreshToken,
        grant_type: "refresh_token",
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as DriveTokenRefreshPayload;
    const refreshedAccessToken = payload.access_token?.trim();

    if (!response.ok || !refreshedAccessToken) {
      throw new Error(
        payload.error_description ??
          payload.error ??
          `AUTH_DRIVE_REFRESH_FAILED: status ${response.status}`,
      );
    }

    return refreshedAccessToken;
  }

  if (!trimmedAccessToken) {
    return undefined;
  }

  return trimmedAccessToken;
}
