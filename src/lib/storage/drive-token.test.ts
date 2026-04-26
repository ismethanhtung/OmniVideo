import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveDriveRuntimeAccessToken } from "./drive-token";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("drive runtime access token", () => {
  it("returns trimmed access token when refresh path is unavailable", async () => {
    const token = await resolveDriveRuntimeAccessToken({
      accessToken: "  drive-access-token  ",
    });

    expect(token).toBe("drive-access-token");
  });

  it("refreshes access token when refresh token and client config are available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "refreshed-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const token = await resolveDriveRuntimeAccessToken({
      refreshToken: "refresh-token",
      clientId: "client-id",
      clientSecret: "client-secret",
      fetchImpl: fetchSpy,
    });

    expect(token).toBe("refreshed-token");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws readable error when refresh exchange fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        }),
        { status: 400 },
      ),
    );

    await expect(
      resolveDriveRuntimeAccessToken({
        refreshToken: "refresh-token",
        clientId: "client-id",
        clientSecret: "client-secret",
        fetchImpl: fetchSpy,
      }),
    ).rejects.toThrow("Token has been expired or revoked.");
  });
});
