import { describe, expect, it } from "vitest";

import { IntakeError } from "./types";
import { validateLocalIntakeInput } from "./local-validation";

describe("validateLocalIntakeInput", () => {
  it("returns normalized metadata for valid local intake input", () => {
    const result = validateLocalIntakeInput({
      storageProvider: "telegram",
      storageProviderAccountId: "507f1f77bcf86cd799439011",
      folder: "kiến thức sức khoẻ",
      tags: [],
      title: "Demo local upload",
      description: " Desc ",
      fileName: "demo.mp4",
      mimeType: "video/mp4",
      fileSizeBytes: 4,
      fileBytes: new Uint8Array([1, 2, 3, 4]),
    });

    expect(result.storageProviderAccountId).toBe("507f1f77bcf86cd799439011");
    expect(result.storageProvider).toBe("telegram");
    expect(result.folder).toBe("kiến thức sức khoẻ");
    expect(result.tags).toEqual(["kiến thức sức khoẻ", "raw"]);
    expect(result.contentIntent).toBe("other");
    expect(result.description).toBe("Desc");
    expect(result.ownershipStatus).toBe("unknown");
    expect(result.fileName).toBe("demo.mp4");
    expect(result.fileSizeBytes).toBe(4);
  });

  it("keeps Video Tools Lab setup for later asset metadata persistence", () => {
    const result = validateLocalIntakeInput({
      storageProvider: "drive",
      storageProviderAccountId: "507f1f77bcf86cd799439011",
      folder: "workspace",
      tags: [],
      fileName: "demo.mp4",
      fileSizeBytes: 4,
      fileBytes: new Uint8Array([1, 2, 3, 4]),
      videoEditSetup: {
        blurEnabled: true,
        subtitleFontSize: 55,
      },
    });

    expect(result.videoEditSetup).toEqual({
      blurEnabled: true,
      subtitleFontSize: 55,
    });
  });

  it("rejects missing storage provider account id", () => {
    expect(() =>
      validateLocalIntakeInput({
        storageProvider: "telegram",
        folder: "kiến thức sức khoẻ",
        tags: [],
        fileName: "demo.mp4",
        fileSizeBytes: 10,
        fileBytes: new Uint8Array([1]),
      }),
    ).toThrow("storageProviderAccountId is required");
  });

  it("rejects invalid storage provider account id", () => {
    expect(() =>
      validateLocalIntakeInput({
        storageProvider: "telegram",
        storageProviderAccountId: "telegram-main",
        folder: "kiến thức sức khoẻ",
        tags: [],
        fileName: "demo.mp4",
        fileSizeBytes: 10,
        fileBytes: new Uint8Array([1]),
      }),
    ).toThrow("storageProviderAccountId must be a valid Mongo ObjectId");
  });

  it("rejects empty file bytes", () => {
    expect(() =>
      validateLocalIntakeInput({
        storageProvider: "telegram",
        storageProviderAccountId: "507f1f77bcf86cd799439011",
        folder: "kiến thức sức khoẻ",
        tags: [],
        fileName: "demo.mp4",
        fileSizeBytes: 10,
        fileBytes: new Uint8Array([]),
      }),
    ).toThrow(IntakeError);
  });

  it("rejects missing folder metadata", () => {
    expect(() =>
      validateLocalIntakeInput({
        storageProvider: "telegram",
        storageProviderAccountId: "507f1f77bcf86cd799439011",
        tags: [],
        fileName: "demo.mp4",
        fileSizeBytes: 10,
        fileBytes: new Uint8Array([1]),
      }),
    ).toThrow("folder is required");
  });

  it("rejects unsupported storage providers", () => {
    expect(() =>
      validateLocalIntakeInput({
        storageProvider: "s3",
        storageProviderAccountId: "507f1f77bcf86cd799439011",
        folder: "kiến thức sức khoẻ",
        tags: [],
        fileName: "demo.mp4",
        fileSizeBytes: 10,
        fileBytes: new Uint8Array([1]),
      }),
    ).toThrow("storageProvider must be telegram or drive");
  });
});
