export type FacebookPageOption = {
  id: string;
  name: string;
};

type FacebookPagesPayload = {
  ok?: boolean;
  error?: string;
  data?: {
    pages?: FacebookPageOption[];
    configuredPageId?: string | null;
  };
};

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchFacebookPagesForAccount(
  accountId: string,
  fetchLike: FetchLike = fetch,
) {
  if (!accountId.trim()) {
    return {
      pages: [] as FacebookPageOption[],
      configuredPageId: null as string | null,
    };
  }

  const response = await fetchLike(
    `/api/social/accounts/${accountId}/facebook-pages`,
    {
      method: "GET",
      cache: "no-store",
    },
  );
  const payload = (await response.json()) as FacebookPagesPayload;

  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error ?? "Could not load Facebook pages.");
  }

  return {
    pages: payload.data.pages ?? [],
    configuredPageId: payload.data.configuredPageId ?? null,
  };
}
