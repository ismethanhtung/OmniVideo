import { describe, expect, it } from "vitest";

import { assertStorageProviderCanUploadForIntake } from "./intake-eligibility";
import { sanitizeStorageProviderDocument } from "./sanitize";
import { validateStorageProviderCreateInput } from "./validation";

describe("storage provider validation", () => {
  it("accepts a telegram provider with required secrets", () => {
    const result = validateStorageProviderCreateInput({
      providerType: "telegram",
      label: "Main Telegram vault",
      priority: 92.4,
      tags: ["raw", "primary"],
      secrets: {
        botToken: "123456:telegram-token",
        chatId: "-100123456",
      },
    });

    expect(result.providerType).toBe("telegram");
    expect(result.priority).toBe(92);
    expect(result.tags).toEqual(["raw", "primary"]);
  });

  it("rejects missing required provider secrets", () => {
    expect(() =>
      validateStorageProviderCreateInput({
        providerType: "drive",
        label: "Drive vault",
        secrets: {},
      }),
    ).toThrow("Missing required secret fields: accessToken.");
  });

  it("does not expose raw secrets in sanitized documents", () => {
    const now = new Date("2026-04-25T00:00:00.000Z");
    const result = sanitizeStorageProviderDocument({
      _id: {
        toHexString: () => "507f1f77bcf86cd799439011",
      } as never,
      providerType: "s3",
      label: "S3 archive",
      description: null,
      status: "active",
      priority: 50,
      tags: [],
      secrets: {
        accessKeyId: "AKIA123456789",
        secretAccessKey: "super-secret-value",
      },
      usage: {
        assetCountApprox: 0,
        lastUsedAt: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    expect("secrets" in result).toBe(false);
    expect(result.secretSummary.accessKeyId).toEqual({
      configured: true,
      preview: "AKI...789",
    });
    expect(result.secretSummary.secretAccessKey).toEqual({
      configured: true,
      preview: "sup...lue",
    });
  });

  it("rejects inactive storage accounts for intake upload", async () => {
    expect(() =>
      assertStorageProviderCanUploadForIntake({
        providerType: "telegram",
        status: "paused",
      }),
    ).toThrow("must be active");
  });
});
