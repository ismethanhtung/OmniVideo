import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("transcript translation API", () => {
  it("rejects empty segments", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/transcript-translation", {
        method: "POST",
        body: JSON.stringify({ segments: [] }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_TRANSLATION_SEGMENTS_REQUIRED",
    });
  });
});
