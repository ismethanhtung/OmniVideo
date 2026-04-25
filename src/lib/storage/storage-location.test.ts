import { describe, expect, it } from "vitest";

import { buildStorageLocationUrl } from "./storage-location";

describe("buildStorageLocationUrl", () => {
  it("returns publicUrl when available", () => {
    expect(
      buildStorageLocationUrl({
        storageProvider: "drive",
        publicUrl: "https://drive.google.com/file/d/abc/view",
      }),
    ).toBe("https://drive.google.com/file/d/abc/view");
  });

  it("returns drive webViewLink from storagePointer", () => {
    expect(
      buildStorageLocationUrl({
        storageProvider: "drive",
        storagePointer: {
          webViewLink: "https://drive.google.com/file/d/xyz/view",
        },
      }),
    ).toBe("https://drive.google.com/file/d/xyz/view");
  });

  it("builds telegram URL for public username chat", () => {
    expect(
      buildStorageLocationUrl({
        storageProvider: "telegram",
        storagePointer: {
          chatId: "@omnivideo_channel",
          messageId: 123,
        },
      }),
    ).toBe("https://t.me/omnivideo_channel/123");
  });

  it("builds telegram URL for supergroup/channel id", () => {
    expect(
      buildStorageLocationUrl({
        storageProvider: "telegram",
        storagePointer: {
          chatId: "-1009876543210",
          messageId: 999,
        },
      }),
    ).toBe("https://t.me/c/9876543210/999");
  });

  it("returns null when URL cannot be inferred", () => {
    expect(
      buildStorageLocationUrl({
        storageProvider: "telegram",
        storagePointer: {
          chatId: "-999",
          messageId: 10,
        },
      }),
    ).toBeNull();
  });
});
