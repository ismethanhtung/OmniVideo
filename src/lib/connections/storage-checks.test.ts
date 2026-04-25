import { ObjectId } from "mongodb";
import { generateKeyPairSync } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { StorageProviderDocument } from "@/lib/storage-providers/types";

import { checkStorageProviderConnections } from "./storage-checks";

function buildServiceAccountJson() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privatePem = privateKey.export({
    type: "pkcs8",
    format: "pem",
  }) as string;

  return JSON.stringify({
    type: "service_account",
    private_key: privatePem,
    client_email: "omni@omnivideo-dev.iam.gserviceaccount.com",
    token_uri: "https://oauth2.googleapis.com/token",
  });
}

function buildAccount(
  overrides: Partial<StorageProviderDocument> & {
    providerType: "telegram" | "drive";
    label: string;
  },
) {
  const now = new Date("2026-04-25T00:00:00.000Z");

  return {
    _id: new ObjectId(),
    providerType: overrides.providerType,
    label: overrides.label,
    description: overrides.description ?? null,
    status: overrides.status ?? "active",
    priority: overrides.priority ?? 100,
    tags: overrides.tags ?? [],
    secrets: overrides.secrets ?? {},
    usage: overrides.usage ?? {
      assetCountApprox: 0,
      lastUsedAt: null,
    },
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("checkStorageProviderConnections", () => {
  it("returns down when telegram secrets are missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "telegram",
        label: "Telegram1",
        secrets: {},
      }),
    ]);

    expect(checks).toHaveLength(1);
    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("Missing botToken or chatId");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok when telegram getMe/getChat both succeed", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { id: 1 } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, result: { id: -1001 } }), {
          status: 200,
        }),
      );

    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "telegram",
        label: "Telegram1",
        secrets: {
          botToken: "123456:token",
          chatId: "-100123456",
        },
      }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("healthy");
  });

  it("returns down when drive token is invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: { message: "Invalid Credentials" },
        }),
        { status: 401 },
      ),
    );

    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "drive",
        label: "Drive1",
        secrets: {
          accessToken: "bad-token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("Invalid Credentials");
  });

  it("returns down when drive auth secrets are missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "drive",
        label: "Drive missing secrets",
        secrets: {},
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain(
      "Missing accessToken or driveServiceAccountJson",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns ok when drive about endpoint succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ user: { displayName: "OmniVideo" } }), {
        status: 200,
      }),
    );

    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "drive",
        label: "Drive1",
        secrets: {
          accessToken: "good-token",
        },
      }),
    ]);

    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("healthy");
  });

  it("returns ok when drive service account token exchange succeeds", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "service-account-token",
            token_type: "Bearer",
            expires_in: 3600,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { displayName: "OmniVideo" } }), {
          status: 200,
        }),
      );

    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "drive",
        label: "Drive SA",
        secrets: {
          driveServiceAccountJson: buildServiceAccountJson(),
        },
      }),
    ]);

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(checks[0].status).toBe("ok");
    expect(checks[0].message).toContain("healthy");
  });

  it("returns down when drive folderId is not accessible", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { displayName: "OmniVideo" } }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { message: "The user does not have sufficient permissions." },
          }),
          { status: 403 },
        ),
      );

    const checks = await checkStorageProviderConnections([
      buildAccount({
        providerType: "drive",
        label: "Drive folder check",
        secrets: {
          accessToken: "good-token",
          folderId: "folder-id",
        },
      }),
    ]);

    expect(checks[0].status).toBe("down");
    expect(checks[0].message).toContain("sufficient permissions");
    expect(checks[0].message).toContain("Service Account email");
  });
});
