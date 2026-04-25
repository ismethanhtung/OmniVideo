import type { WithId } from "mongodb";

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

  if (!accessToken) {
    return {
      ...base,
      status: "down",
      message: "AUTH_SOCIAL_SECRET_MISSING: connected YouTube account has no access token.",
    };
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
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
