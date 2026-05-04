import { afterEach, describe, expect, it, vi } from "vitest";

import { OWNER_TOKEN_COOKIE } from "@/lib/access-control/access-control";

import { GET, POST } from "./route";

describe("app access API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns public demo access state", async () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");

    const response = await GET(new Request("http://localhost/api/app/access"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toMatchObject({
      mode: "public-demo",
      isPublicDemo: true,
      isOwner: false,
      writesAllowed: false,
    });
  });

  it("sets owner cookie for a valid token", async () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");
    vi.stubEnv("OMNIVIDEO_OWNER_TOKEN", "secret");

    const response = await POST(
      new Request("http://localhost/api/app/access", {
        method: "POST",
        body: JSON.stringify({ token: "secret" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.isOwner).toBe(true);
    expect(response.headers.get("set-cookie")).toContain(OWNER_TOKEN_COOKIE);
  });

  it("rejects invalid owner token", async () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");
    vi.stubEnv("OMNIVIDEO_OWNER_TOKEN", "secret");

    const response = await POST(
      new Request("http://localhost/api/app/access", {
        method: "POST",
        body: JSON.stringify({ token: "bad" }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.errorCode).toBe("VAL_OWNER_TOKEN_INVALID");
  });
});
