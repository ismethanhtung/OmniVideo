import type { SocialAccountDocument } from "./types";

export type FacebookApiError = {
  message?: string;
  type?: string;
  code?: number;
  error_subcode?: number;
};

type FacebookApiResponse = {
  access_token?: string;
  id?: string;
  name?: string;
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
  }>;
  error?: FacebookApiError;
};

const GRAPH_API_BASE = "https://graph.facebook.com/v20.0";

export function readFacebookError(
  payload: { error?: FacebookApiError } | null,
  fallback: string,
) {
  const error = payload?.error;

  if (!error) {
    return fallback;
  }

  const codeParts = [
    error.type,
    typeof error.code === "number" ? `code=${error.code}` : null,
    typeof error.error_subcode === "number" ? `subcode=${error.error_subcode}` : null,
  ].filter(Boolean);

  return [error.message ?? fallback, codeParts.join(" ")].filter(Boolean).join(" ");
}

function readConnectionJsonPages(connectionJson: string | undefined) {
  if (!connectionJson?.trim()) {
    return [];
  }

  try {
    const payload = JSON.parse(connectionJson) as {
      pages?: Array<{ id?: unknown; name?: unknown; access_token?: unknown }>;
    };

    return (payload.pages ?? [])
      .map((page) => ({
        id: typeof page.id === "string" ? page.id.trim() : "",
        name: typeof page.name === "string" ? page.name.trim() : "",
        accessToken:
          typeof page.access_token === "string" ? page.access_token.trim() : "",
      }))
      .filter((page) => page.id);
  } catch {
    return [];
  }
}

function formatPageOptions(
  pages: Array<{ id: string; name: string }>,
  limit = 3,
) {
  return pages
    .slice(0, limit)
    .map((page) => `${page.name || "Page"} (${page.id})`)
    .join(", ");
}

export type FacebookPageContext = {
  pageId: string;
  pageAccessToken: string;
  pageName: string | null;
};

export type FacebookPageOption = {
  id: string;
  name: string;
};

type FacebookCachedPage = {
  id: string;
  name: string;
  accessToken: string;
};

async function listFacebookPages(userAccessToken: string) {
  const url = new URL(`${GRAPH_API_BASE}/me/accounts`);
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userAccessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as
    | FacebookApiResponse
    | null;

  if (!response.ok || payload?.error) {
    throw new Error(
      `PRV_FACEBOOK_PAGE_LIST_FAILED: ${readFacebookError(
        payload,
        `status ${response.status}`,
      )}`,
    );
  }

  return (payload?.data ?? [])
    .map((page) => ({
      id: page.id?.trim() ?? "",
      name: page.name?.trim() ?? "",
      accessToken: page.access_token?.trim() ?? "",
    }))
    .filter((page) => page.id && page.accessToken);
}

function parseConnectionJsonPayload(connectionJson: string | undefined) {
  if (!connectionJson?.trim()) {
    return {};
  }

  try {
    return JSON.parse(connectionJson) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function mergeFacebookPagesToConnectionJson({
  connectionJson,
  pages,
}: {
  connectionJson: string | undefined;
  pages: FacebookCachedPage[];
}) {
  const payload = parseConnectionJsonPayload(connectionJson);
  const nextPayload = {
    ...payload,
    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      access_token: page.accessToken,
    })),
  };

  return JSON.stringify(nextPayload);
}

export async function refreshFacebookPagesForAccount(
  account: SocialAccountDocument,
) {
  const userAccessToken = account.secrets.accessToken?.trim();

  if (!userAccessToken) {
    throw new Error("AUTH_FACEBOOK_ACCESS_TOKEN_MISSING");
  }

  const pages = await listFacebookPages(userAccessToken);
  const configuredPageId = account.secrets.pageId?.trim() ?? null;
  const connectionJson = mergeFacebookPagesToConnectionJson({
    connectionJson: account.secrets.connectionJson,
    pages,
  });

  return {
    pages: pages.map((page) => ({ id: page.id, name: page.name || page.id })),
    configuredPageId,
    connectionJson,
    source: "graph" as const,
  };
}

export async function listFacebookPagesForAccount(
  account: SocialAccountDocument,
  options?: { refreshFromGraph?: boolean },
) {
  const configuredPageId = account.secrets.pageId?.trim() ?? null;
  const refreshFromGraph = Boolean(options?.refreshFromGraph);

  if (refreshFromGraph) {
    return refreshFacebookPagesForAccount(account);
  }

  const cachedPages = readConnectionJsonPages(account.secrets.connectionJson);
  return {
    pages: cachedPages.map((page) => ({ id: page.id, name: page.name || page.id })),
    configuredPageId,
    source: "cached" as const,
  };
}

export async function resolveFacebookPageContext(
  account: SocialAccountDocument,
  preferredPageId?: string,
): Promise<FacebookPageContext> {
  const normalizedPreferredPageId = preferredPageId?.trim() || null;
  const accountConfiguredPageId = account.secrets.pageId?.trim() ?? null;
  const configuredPageId = normalizedPreferredPageId ?? accountConfiguredPageId;
  const configuredPageToken = account.secrets.pageAccessToken?.trim();
  const cachedPages = readConnectionJsonPages(account.secrets.connectionJson);

  if (
    configuredPageToken &&
    configuredPageId &&
    (!normalizedPreferredPageId || normalizedPreferredPageId === accountConfiguredPageId)
  ) {
    return {
      pageId: configuredPageId,
      pageAccessToken: configuredPageToken,
      pageName: null,
    };
  }

  if (!configuredPageId && configuredPageToken) {
    throw new Error(
      "AUTH_FACEBOOK_PAGE_ID_REQUIRED: pageId is required when pageAccessToken is configured.",
    );
  }

  const cachedPage = configuredPageId
    ? cachedPages.find((page) => page.id === configuredPageId)
    : null;

  if (cachedPage?.accessToken) {
    return {
      pageId: cachedPage.id,
      pageAccessToken: cachedPage.accessToken,
      pageName: cachedPage.name || null,
    };
  }

  const userAccessToken = account.secrets.accessToken?.trim();

  if (!userAccessToken) {
    throw new Error("AUTH_FACEBOOK_ACCESS_TOKEN_MISSING");
  }

  const pages = await listFacebookPages(userAccessToken);

  if (pages.length === 0) {
    throw new Error(
      "AUTH_FACEBOOK_PAGE_NOT_ACCESSIBLE: token does not expose any manageable Pages.",
    );
  }

  if (configuredPageId) {
    const matched = pages.find((page) => page.id === configuredPageId);

    if (!matched) {
      throw new Error(
        `AUTH_FACEBOOK_PAGE_ID_NOT_ACCESSIBLE: pageId ${configuredPageId} is not in /me/accounts. Available: ${formatPageOptions(
          pages,
        )}`,
      );
    }

    return {
      pageId: matched.id,
      pageAccessToken: matched.accessToken,
      pageName: matched.name || null,
    };
  }

  if (pages.length > 1) {
    throw new Error(
      `AUTH_FACEBOOK_PAGE_ID_REQUIRED: multiple Pages found (${formatPageOptions(
        pages,
      )}). Set pageId in Social Account.`,
    );
  }

  return {
    pageId: pages[0].id,
    pageAccessToken: pages[0].accessToken,
    pageName: pages[0].name || null,
  };
}
