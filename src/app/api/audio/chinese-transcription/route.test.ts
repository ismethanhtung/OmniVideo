import { describe, expect, it } from "vitest";

import { POST } from "./route";

describe("Audio transcription API", () => {
  it("rejects requests without videoFile", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/chinese-transcription", {
        method: "POST",
        body: new FormData(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_AUDIO_FILE_REQUIRED",
      error: "videoFile or assetId is required.",
    });
  });
});
