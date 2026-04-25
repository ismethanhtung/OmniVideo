import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import {
  exchangeDriveServiceAccountToken,
  resolveDriveAccessToken,
} from "./drive-service-account";

function buildServiceAccountJson() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privatePem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;

  return JSON.stringify({
    type: "service_account",
    project_id: "omnivideo-dev",
    private_key_id: "abc123",
    private_key: privatePem,
    client_email: "omni@omnivideo-dev.iam.gserviceaccount.com",
    client_id: "1234567890",
    token_uri: "https://oauth2.googleapis.com/token",
  });
}

describe("drive service account token resolver", () => {
  it("returns legacy access token directly when available", async () => {
    const fetchSpy = vi.fn<typeof fetch>();
    const token = await resolveDriveAccessToken({
      accessToken: " legacy-token ",
      driveServiceAccountJson: buildServiceAccountJson(),
      fetchImpl: fetchSpy,
    });

    expect(token).toBe("legacy-token");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("exchanges token using service account json key", async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: "sa-token",
          token_type: "Bearer",
          expires_in: 3600,
        }),
        { status: 200 },
      ),
    );

    const token = await exchangeDriveServiceAccountToken({
      serviceAccountJson: buildServiceAccountJson(),
      fetchImpl: fetchSpy,
      nowMs: 1_714_000_000_000,
    });

    expect(token).toBe("sa-token");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("throws a readable error for invalid json key", async () => {
    await expect(
      exchangeDriveServiceAccountToken({
        serviceAccountJson: "{bad-json",
      }),
    ).rejects.toThrow("Service account JSON is not valid JSON.");
  });

  it("throws provider error detail when token exchange fails", async () => {
    const fetchSpy = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Invalid JWT Signature",
        }),
        { status: 400 },
      ),
    );

    await expect(
      exchangeDriveServiceAccountToken({
        serviceAccountJson: buildServiceAccountJson(),
        fetchImpl: fetchSpy,
      }),
    ).rejects.toThrow("Invalid JWT Signature");
  });
});
