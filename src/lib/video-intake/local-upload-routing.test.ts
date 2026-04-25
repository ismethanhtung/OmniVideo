import { describe, expect, it } from "vitest";

import {
  needsDriveConfirmationForLargeLocalFile,
  pickBestDriveFallbackAccount,
  type UploadProviderAccountOption,
} from "./local-upload-routing";

describe("local upload routing", () => {
  it("requires confirmation when telegram is selected and file is over 20MB", () => {
    expect(
      needsDriveConfirmationForLargeLocalFile({
        selectedProviderType: "telegram",
        fileSizeBytes: 21 * 1024 * 1024,
      }),
    ).toBe(true);
  });

  it("does not require confirmation for drive uploads", () => {
    expect(
      needsDriveConfirmationForLargeLocalFile({
        selectedProviderType: "drive",
        fileSizeBytes: 99 * 1024 * 1024,
      }),
    ).toBe(false);
  });

  it("picks highest-priority active drive account as fallback", () => {
    const accounts: UploadProviderAccountOption[] = [
      {
        _id: "telegram-1",
        providerType: "telegram",
        label: "Telegram1",
        priority: 99,
        status: "active",
      },
      {
        _id: "drive-2",
        providerType: "drive",
        label: "DriveB",
        priority: 70,
        status: "active",
      },
      {
        _id: "drive-1",
        providerType: "drive",
        label: "DriveA",
        priority: 80,
        status: "active",
      },
    ];

    expect(pickBestDriveFallbackAccount(accounts)?._id).toBe("drive-1");
  });

  it("returns null when no active drive account exists", () => {
    const accounts: UploadProviderAccountOption[] = [
      {
        _id: "telegram-1",
        providerType: "telegram",
        label: "Telegram1",
        priority: 99,
        status: "active",
      },
      {
        _id: "drive-paused",
        providerType: "drive",
        label: "Drive paused",
        priority: 99,
        status: "paused",
      },
    ];

    expect(pickBestDriveFallbackAccount(accounts)).toBeNull();
  });
});
