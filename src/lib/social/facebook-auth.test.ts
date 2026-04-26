import { afterEach, describe, expect, it, vi } from "vitest";

import type { SocialAccountDocument } from "./types";
import { resolveFacebookPageContext } from "./facebook-auth";

function makeAccount(
  secrets: SocialAccountDocument["secrets"] = {
    accessToken: "user-token",
  },
): SocialAccountDocument {
  const now = new Date("2026-04-26T00:00:00.000Z");

  return {
    platform: "facebook",
    label: "Facebook",
    displayName: "Facebook Page",
    handle: null,
    accountId: null,
    status: "connected",
    authMode: "oauth",
    channelTags: [],
    permissionScopes: [],
    supportedFormats: ["facebook_video", "facebook_reel"],
    secrets,
    lastHealthCheckAt: null,
    lastError: null,
    usage: {
      publishRecordCountApprox: 0,
      lastPlannedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}

describe("resolveFacebookPageContext", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns configured page token and page id without extra requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await resolveFacebookPageContext(
      makeAccount({
        pageId: "page-1",
        pageAccessToken: "page-token",
      }),
    );

    expect(result).toEqual({
      pageId: "page-1",
      pageAccessToken: "page-token",
      pageName: null,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves page token from /me/accounts for configured pageId", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "page-1",
              name: "Omni Page",
              access_token: "page-token-1",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await resolveFacebookPageContext(
      makeAccount({
        accessToken: "user-token",
        pageId: "page-1",
      }),
    );

    expect(result.pageId).toBe("page-1");
    expect(result.pageAccessToken).toBe("page-token-1");
    expect(result.pageName).toBe("Omni Page");
  });

  it("resolves preferred page id for per-record target overrides", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "page-1",
              name: "Page 1",
              access_token: "page-token-1",
            },
            {
              id: "page-2",
              name: "Page 2",
              access_token: "page-token-2",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const result = await resolveFacebookPageContext(
      makeAccount({
        accessToken: "user-token",
        pageId: "page-1",
        pageAccessToken: "page-token-1",
      }),
      "page-2",
    );

    expect(result.pageId).toBe("page-2");
    expect(result.pageAccessToken).toBe("page-token-2");
  });

  it("fails when multiple pages are available but pageId is not configured", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "page-1",
              name: "Page 1",
              access_token: "page-token-1",
            },
            {
              id: "page-2",
              name: "Page 2",
              access_token: "page-token-2",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(
      resolveFacebookPageContext(
        makeAccount({
          accessToken: "user-token",
        }),
      ),
    ).rejects.toThrow("AUTH_FACEBOOK_PAGE_ID_REQUIRED");
  });
});
