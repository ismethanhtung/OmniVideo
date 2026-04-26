import type { WithId } from "mongodb";

import { resolveFacebookPageContext } from "./facebook-auth";
import type { SocialAccountDocument, SocialPlatform } from "./types";

export type SocialConnectionCheck = {
  serviceType: "social";
  serviceKey: string;
  accountId: string;
  platform: SocialPlatform;
  label: string;
  status: "ok" | "down" | "skipped";
  message: string;
  latencyMs: number;
  checkedAt: string;
};

function hasConfiguredSecret(account: WithId<SocialAccountDocument>) {
  return Object.values(account.secrets).some((value) => Boolean(value?.trim()));
}

async function checkYouTubeConnectedAccount(
  account: WithId<SocialAccountDocument>,
  base: Omit<SocialConnectionCheck, "status" | "message">,
): Promise<SocialConnectionCheck> {
  const accessToken = account.secrets.accessToken?.trim();
  const refreshToken = account.secrets.refreshToken?.trim();
  const clientId = process.env.YOUTUBE_CLIENT_ID?.trim();
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET?.trim();

  if (!accessToken && !refreshToken) {
    return {
      ...base,
      status: "down",
      message:
        "AUTH_SOCIAL_SECRET_MISSING: connected YouTube account has no access or refresh token.",
    };
  }

  try {
    let tokenForCheck = accessToken ?? "";

    if (refreshToken && clientId && clientSecret) {
      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const refreshPayload = (await refreshResponse.json().catch(() => null)) as
        | {
            access_token?: string;
            error?: string;
            error_description?: string;
          }
        | null;

      if (!refreshResponse.ok || !refreshPayload?.access_token) {
        return {
          ...base,
          status: "down",
          message:
            refreshPayload?.error_description ??
            refreshPayload?.error ??
            `AUTH_YOUTUBE_REFRESH_FAILED: status ${refreshResponse.status}.`,
        };
      }

      tokenForCheck = refreshPayload.access_token;
    }

    if (!tokenForCheck) {
      return {
        ...base,
        status: "down",
        message:
          "AUTH_SOCIAL_SECRET_MISSING: connected YouTube account has no usable access token.",
      };
    }

    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(tokenForCheck)}`,
      { cache: "no-store" },
    );

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;

      return {
        ...base,
        status: "down",
        message:
          payload?.error?.message ??
          `YouTube token check failed with status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as { scope?: string };
    const scopes = payload.scope?.split(/\s+/).filter(Boolean) ?? [];
    const requiredScope = "https://www.googleapis.com/auth/youtube.upload";

    if (!scopes.includes(requiredScope)) {
      return {
        ...base,
        status: "down",
        message: `AUTH_YOUTUBE_SCOPE_MISSING: token is missing ${requiredScope}. Reconnect OAuth after adding the scope.`,
      };
    }

    return {
      ...base,
      status: "ok",
      message: "YouTube OAuth token is valid and includes youtube.upload scope.",
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      message:
        error instanceof Error
          ? error.message
          : "YouTube connection check failed.",
    };
  }
}

async function checkTikTokConnectedAccount(
  account: WithId<SocialAccountDocument>,
  base: Omit<SocialConnectionCheck, "status" | "message">,
): Promise<SocialConnectionCheck> {
  const accessToken = account.secrets.accessToken?.trim();

  if (!accessToken) {
    return {
      ...base,
      status: "down",
      message: "AUTH_SOCIAL_SECRET_MISSING: connected TikTok account has no access token.",
    };
  }

  const requiredScope = "video.publish";
  if (!account.permissionScopes.includes(requiredScope)) {
    return {
      ...base,
      status: "down",
      message: `AUTH_TIKTOK_SCOPE_MISSING: account is missing ${requiredScope}. Reconnect OAuth.`,
    };
  }

  try {
    const response = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/creator_info/query/",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({}),
      },
    );
    const payload = (await response.json().catch(() => null)) as
      | {
          data?: { creator_username?: string };
          error?: { code?: string; message?: string };
        }
      | null;
    const errorCode = payload?.error?.code?.trim();

    if (!response.ok || (errorCode && errorCode !== "ok")) {
      return {
        ...base,
        status: "down",
        message:
          payload?.error?.message ??
          `TikTok creator info check failed with status ${response.status}.`,
      };
    }

    return {
      ...base,
      status: "ok",
      message: payload?.data?.creator_username
        ? `TikTok OAuth is valid for @${payload.data.creator_username}.`
        : "TikTok OAuth token is valid for publishing.",
    };
  } catch (error) {
    return {
      ...base,
      status: "down",
      message:
        error instanceof Error
          ? error.message
          : "TikTok connection check failed.",
    };
  }
}

async function checkFacebookConnectedAccount(
  account: WithId<SocialAccountDocument>,
  base: Omit<SocialConnectionCheck, "status" | "message">,
): Promise<SocialConnectionCheck> {
  try {
    const pageContext = await resolveFacebookPageContext(account);
    const url = new URL(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(pageContext.pageId)}`,
    );
    url.searchParams.set("fields", "id,name");
    url.searchParams.set("access_token", pageContext.pageAccessToken);
    const response = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { id?: string; name?: string; error?: { message?: string } }
      | null;

    if (!response.ok || payload?.error) {
      return {
        ...base,
        status: "down",
        message:
          payload?.error?.message ??
          `Facebook Page check failed with status ${response.status}.`,
      };
    }

    return {
      ...base,
      status: "ok",
      message: payload?.name
        ? `Facebook Page token is valid for ${payload.name}.`
        : "Facebook Page token is valid for publishing.",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Facebook connection check failed.";

    if (message.startsWith("AUTH_FACEBOOK_PAGE_ID_REQUIRED")) {
      return {
        ...base,
        status: "ok",
        message:
          "Facebook token is valid for multiple Pages. Select target Page in New Publish Record.",
      };
    }

    return {
      ...base,
      status: "down",
      message,
    };
  }
}

export async function checkSocialAccountConnections(
  accounts: Array<WithId<SocialAccountDocument>>,
): Promise<SocialConnectionCheck[]> {
  return Promise.all(accounts.map(async (account) => {
    const startedAt = Date.now();
    const checkedAt = new Date().toISOString();
    const base = {
      serviceType: "social" as const,
      serviceKey: `social:${account.platform}:${account._id.toHexString()}`,
      accountId: account._id.toHexString(),
      platform: account.platform,
      label: account.label,
      latencyMs: Date.now() - startedAt,
      checkedAt,
    };

    if (account.status === "paused") {
      return {
        ...base,
        status: "skipped" as const,
        message: "Social account is paused.",
      };
    }

    if (account.status !== "connected") {
      return {
        ...base,
        status: "down" as const,
        message: "AUTH_SOCIAL_NOT_CONNECTED: OAuth connection has not completed.",
      };
    }

    if (account.platform === "youtube") {
      return checkYouTubeConnectedAccount(account, {
        ...base,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (account.platform === "tiktok") {
      return checkTikTokConnectedAccount(account, {
        ...base,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (account.platform === "facebook") {
      return checkFacebookConnectedAccount(account, {
        ...base,
        latencyMs: Date.now() - startedAt,
      });
    }

    if (!hasConfiguredSecret(account)) {
      return {
        ...base,
        status: "down" as const,
        message: "AUTH_SOCIAL_SECRET_MISSING: no credential is configured.",
      };
    }

    return {
      ...base,
      status: "skipped" as const,
      message:
        "Real platform health check is deferred for this connected platform.",
    };
  }));
}
