import { describe, expect, it } from "vitest";

import { assertStorageProviderCanUploadForIntake } from "./intake-eligibility";
import {
  mapStorageProviderToEditableDocument,
  sanitizeStorageProviderDocument,
} from "./sanitize";
import {
  validateStorageProviderCreateInput,
  validateStorageProviderUpdateInput,
} from "./validation";

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

  it("accepts drive provider with access token secret", () => {
    const result = validateStorageProviderCreateInput({
      providerType: "drive",
      label: "Drive oauth",
      secrets: {
        accessToken: "ya29.oauth-token",
      },
    });

    expect(result.providerType).toBe("drive");
    expect(result.secrets.accessToken).toBe("ya29.oauth-token");
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

  it("maps editable provider payload with raw secrets for edit form hydration", () => {
    const now = new Date("2026-04-26T00:00:00.000Z");
    const result = mapStorageProviderToEditableDocument({
      _id: {
        toHexString: () => "507f1f77bcf86cd799439012",
      } as never,
      providerType: "drive",
      label: "Drive1",
      description: "Primary Drive",
      status: "active",
      priority: 50,
      tags: ["raw", "primary"],
      secrets: {
        accessToken: "ya29.edit-token",
        folderId: "folder-123",
      },
      usage: {
        assetCountApprox: 0,
        lastUsedAt: null,
      },
      createdAt: now,
      updatedAt: now,
    });

    expect(result._id).toBe("507f1f77bcf86cd799439012");
    expect(result.secrets.accessToken).toBe("ya29.edit-token");
    expect(result.secrets.folderId).toBe("folder-123");
  });

  it("rejects inactive storage accounts for intake upload", async () => {
    expect(() =>
      assertStorageProviderCanUploadForIntake({
        providerType: "telegram",
        status: "paused",
      }),
    ).toThrow("must be active");
  });

  it("accepts provider update patch with label/priority/tags/secrets", () => {
    const patch = validateStorageProviderUpdateInput({
      label: "Drive main",
      priority: 88.7,
      tags: ["raw", "backup"],
      secrets: {
        folderId: "folder-1",
      },
    });

    expect(patch.label).toBe("Drive main");
    expect(patch.priority).toBe(89);
    expect(patch.tags).toEqual(["raw", "backup"]);
    expect(patch.secrets?.folderId).toBe("folder-1");
  });

  it("rejects empty provider update patch", () => {
    expect(() => validateStorageProviderUpdateInput({})).toThrow(
      "At least one field is required for update",
    );
  });
});
