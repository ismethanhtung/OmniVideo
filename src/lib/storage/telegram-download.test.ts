import { describe, expect, it } from "vitest";

import {
  buildTelegramTooBigDownloadMessage,
  getTelegramDownloadBlockedReason,
  isTelegramBotDownloadTooBig,
  isTelegramGetFileTooBigError,
  TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES,
} from "./telegram-download";

describe("telegram download guard", () => {
  it("detects Telegram getFile too-big message", () => {
    expect(isTelegramGetFileTooBigError("Bad Request: file is too big")).toBe(true);
    expect(isTelegramGetFileTooBigError("FILE IS TOO BIG")).toBe(true);
    expect(isTelegramGetFileTooBigError("Unauthorized")).toBe(false);
  });

  it("checks bot download size limit", () => {
    expect(isTelegramBotDownloadTooBig(TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES)).toBe(
      false,
    );
    expect(
      isTelegramBotDownloadTooBig(TELEGRAM_BOT_DOWNLOAD_LIMIT_BYTES + 1),
    ).toBe(true);
  });

  it("builds user-facing too-big message", () => {
    const message = buildTelegramTooBigDownloadMessage(35 * 1024 * 1024);
    expect(message).toContain("20.0 MB");
    expect(message).toContain("35.0 MB");
  });

  it("returns blocked reason only for oversized Telegram assets", () => {
    expect(
      getTelegramDownloadBlockedReason({
        storageProvider: "telegram",
        sizeBytes: 35 * 1024 * 1024,
      }),
    ).toContain("cannot download files larger than");

    expect(
      getTelegramDownloadBlockedReason({
        storageProvider: "drive",
        sizeBytes: 35 * 1024 * 1024,
      }),
    ).toBeNull();
  });
});
