import { describe, expect, it, vi } from "vitest";

import { fetchFacebookPagesForAccount } from "./facebook-pages-client";

function makeResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchFacebookPagesForAccount", () => {
  it("returns empty result when account id is empty", async () => {
    const fetchSpy = vi.fn();

    const result = await fetchFacebookPagesForAccount("", fetchSpy);

    expect(result).toEqual({
      pages: [],
      configuredPageId: null,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("loads facebook pages payload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      makeResponse({
        ok: true,
        data: {
          pages: [{ id: "page-1", name: "Main Page" }],
          configuredPageId: "page-1",
        },
      }),
    );

    const result = await fetchFacebookPagesForAccount("acc-1", fetchSpy);

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/social/accounts/acc-1/facebook-pages",
      {
        method: "GET",
        cache: "no-store",
      },
    );
    expect(result).toEqual({
      pages: [{ id: "page-1", name: "Main Page" }],
      configuredPageId: "page-1",
    });
  });

  it("throws payload error on failure", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(makeResponse({ ok: false, error: "failed" }, 400));

    await expect(
      fetchFacebookPagesForAccount("acc-1", fetchSpy),
    ).rejects.toThrow("failed");
  });
});
