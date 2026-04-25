import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("social capabilities API", () => {
  it("returns the initial platform capability registry", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.map((entry: { platform: string }) => entry.platform)).toEqual([
      "facebook",
      "tiktok",
      "shopee",
      "youtube",
    ]);
  });
});
