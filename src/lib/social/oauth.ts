import crypto from "node:crypto";

import type { SocialPlatform } from "./types";

export type SocialOAuthConfig = {
  platform: SocialPlatform;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
};

export function getOAuthRedirectUri(platform: SocialPlatform) {
  const baseUrl =
    process.env.SOCIAL_OAUTH_BASE_URL?.trim() || "http://localhost:3001";

  return `${baseUrl.replace(/\/$/, "")}/api/social/oauth/callback/${platform}`;
}

export function getSocialOAuthConfig(platform: SocialPlatform): SocialOAuthConfig {
  const redirectUri = getOAuthRedirectUri(platform);

  if (platform === "youtube") {
    return {
      platform,
      clientId: process.env.YOUTUBE_CLIENT_ID?.trim() ?? "",
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET?.trim() ?? "",
      redirectUri,
      scopes: [
        "https://www.googleapis.com/auth/youtube.upload",
        "https://www.googleapis.com/auth/youtube.readonly",
      ],
    };
  }

  if (platform === "tiktok") {
    return {
      platform,
      clientId: process.env.TIKTOK_CLIENT_KEY?.trim() ?? "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET?.trim() ?? "",
      redirectUri,
      scopes: ["user.info.basic", "video.upload", "video.publish"],
    };
  }

  if (platform === "facebook") {
    return {
      platform,
      clientId: process.env.FACEBOOK_CLIENT_ID?.trim() ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET?.trim() ?? "",
      redirectUri,
      scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    };
  }

  return {
    platform,
    clientId: process.env.SHOPEE_PARTNER_ID?.trim() ?? "",
    clientSecret: process.env.SHOPEE_PARTNER_KEY?.trim() ?? "",
    redirectUri,
    scopes: ["shop_authorization", "product_write"],
  };
}

export function getMissingOAuthConfig(platform: SocialPlatform) {
  const config = getSocialOAuthConfig(platform);
  const missing: string[] = [];

  if (!process.env.SOCIAL_OAUTH_BASE_URL?.trim()) {
    missing.push("SOCIAL_OAUTH_BASE_URL");
  }

  if (!config.clientId) {
    missing.push(
      platform === "tiktok"
        ? "TIKTOK_CLIENT_KEY"
        : platform === "shopee"
          ? "SHOPEE_PARTNER_ID"
          : `${platform.toUpperCase()}_CLIENT_ID`,
    );
  }

  if (!config.clientSecret) {
    missing.push(
      platform === "tiktok"
        ? "TIKTOK_CLIENT_SECRET"
        : platform === "shopee"
          ? "SHOPEE_PARTNER_KEY"
          : `${platform.toUpperCase()}_CLIENT_SECRET`,
    );
  }

  return missing;
}

export function createOAuthState(accountId: string) {
  return crypto
    .createHash("sha256")
    .update(`${accountId}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex");
}

export function buildAuthorizationUrl({
  platform,
  accountId,
  state,
}: {
  platform: SocialPlatform;
  accountId: string;
  state: string;
}) {
  const config = getSocialOAuthConfig(platform);

  if (platform === "youtube") {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(" "));
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", `${state}:${accountId}`);
    return url.toString();
  }

  if (platform === "tiktok") {
    const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
    url.searchParams.set("client_key", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(","));
    url.searchParams.set("state", `${state}:${accountId}`);
    return url.toString();
  }

  if (platform === "facebook") {
    const url = new URL("https://www.facebook.com/v20.0/dialog/oauth");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", config.scopes.join(","));
    url.searchParams.set("state", `${state}:${accountId}`);
    return url.toString();
  }

  throw new Error(
    "Shopee OAuth requires signed partner authorization; connector flow is not implemented yet.",
  );
}

export async function exchangeOAuthCode({
  platform,
  code,
}: {
  platform: SocialPlatform;
  code: string;
}) {
  const config = getSocialOAuthConfig(platform);

  if (platform === "youtube") {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  if (platform === "tiktok") {
    const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_key: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });
    return response.json() as Promise<Record<string, unknown>>;
  }

  if (platform === "facebook") {
    const url = new URL("https://graph.facebook.com/v20.0/oauth/access_token");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("client_secret", config.clientSecret);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("code", code);
    const response = await fetch(url.toString(), { method: "GET" });
    return response.json() as Promise<Record<string, unknown>>;
  }

  throw new Error("Shopee token exchange is not implemented yet.");
}
