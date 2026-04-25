import { describe, expect, it } from "vitest";

import { shouldFallbackToBinaryUpload } from "./telegram-fallback";

describe("telegram fallback signal", () => {
  it("returns true for telegram remote-url fetch errors", () => {
    expect(
      shouldFallbackToBinaryUpload("Bad Request: failed to get HTTP URL content"),
    ).toBe(true);
    expect(
      shouldFallbackToBinaryUpload("Bad Request: wrong type of the web page content"),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(shouldFallbackToBinaryUpload("Unauthorized")).toBe(false);
  });
});
