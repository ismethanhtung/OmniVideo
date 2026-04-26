import { describe, expect, it } from "vitest";

import { normalizeStorageProviderSecretFormState } from "./form-secrets";

describe("normalizeStorageProviderSecretFormState", () => {
  it("converts null and undefined editable secrets to empty strings", () => {
    const result = normalizeStorageProviderSecretFormState({
      accessToken: null,
      refreshToken: undefined,
      folderId: "folder-1",
    });

    expect(result.accessToken).toBe("");
    expect(result.refreshToken).toBe("");
    expect(result.folderId).toBe("folder-1");
  });

  it("returns a complete controlled-input state for missing secrets", () => {
    const result = normalizeStorageProviderSecretFormState(null);

    expect(result.botToken).toBe("");
    expect(result.accessToken).toBe("");
    expect(result.connectionJson).toBe("");
  });
});
