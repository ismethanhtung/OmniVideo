import { describe, expect, it } from "vitest";

import {
  readGoogleDriveErrorMessage,
  withGoogleDrivePermissionHint,
} from "./google-drive-error";

describe("google drive error parser", () => {
  it("reads JSON error.message", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          message: "The user does not have sufficient permissions for this file.",
        },
      }),
      {
        status: 403,
        headers: {
          "content-type": "application/json",
        },
      },
    );

    await expect(
      readGoogleDriveErrorMessage(response, "fallback"),
    ).resolves.toContain("sufficient permissions");
  });

  it("returns fallback for empty payload", async () => {
    const response = new Response("{}", {
      status: 500,
      headers: {
        "content-type": "application/json",
      },
    });

    await expect(readGoogleDriveErrorMessage(response, "fallback")).resolves.toBe(
      "fallback",
    );
  });

  it("adds actionable hint for permission failures", () => {
    const message = withGoogleDrivePermissionHint(
      "The user does not have sufficient permissions.",
    );

    expect(message).toContain("Service Account email");
  });
});
