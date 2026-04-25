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

export async function checkSocialAccountConnections(
  accounts: Array<WithId<SocialAccountDocument>>,
): Promise<SocialConnectionCheck[]> {
  return accounts.map((account) => {
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

    if (account.authMode === "manual" || account.authMode === "not_configured") {
      return {
        ...base,
        status: "skipped" as const,
        message:
          "Real platform connection is deferred; account is tracked manually.",
      };
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
      status: "ok" as const,
      message:
        "Credential metadata is configured. Real API health check is deferred.",
    };
  });
}
