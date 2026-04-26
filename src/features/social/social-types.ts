export type SocialPlatform = "facebook" | "tiktok" | "shopee" | "youtube";
export type SocialAccountStatus = "needs_auth" | "connected" | "paused" | "error";
export type SocialAuthMode =
  | "oauth"
  | "access_token"
  | "api_key"
  | "manual"
  | "not_configured";
export type SocialPublishType =
  | "facebook_reel"
  | "facebook_video"
  | "tiktok_video"
  | "shopee_video"
  | "youtube_short"
  | "youtube_video";

export type PublishMode = "schedule" | "publish_now";
export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export type SocialAccount = {
  _id: string;
  platform: SocialPlatform;
  label: string;
  displayName: string | null;
  handle: string | null;
  accountId: string | null;
  status: SocialAccountStatus;
  authMode: SocialAuthMode;
  channelTags: string[];
  permissionScopes: string[];
  supportedFormats: SocialPublishType[];
  secretSummary: Record<string, { configured: boolean; preview: string | null }>;
  usage?: {
    publishRecordCountApprox: number;
    lastPlannedAt: string | null;
  };
};

export type SocialCapability = {
  platform: SocialPlatform;
  label: string;
  formats: Array<{
    publishType: SocialPublishType;
    label: string;
    requiredScopes: string[];
    metadataLimits: {
      titleMaxLength: number;
      captionMaxLength: number;
      hashtagsMaxCount: number;
      maxDurationSeconds: number | null;
      preferredAspectRatios: string[];
    };
  }>;
  supportedTaskTypes: string[];
  realPublishStatus: "enabled" | "deferred";
  complianceNotes: string[];
};

export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
};

export function formatPlatform(platform: SocialPlatform) {
  const labels: Record<SocialPlatform, string> = {
    facebook: "Facebook",
    tiktok: "TikTok",
    shopee: "Shopee",
    youtube: "YouTube",
  };

  return labels[platform];
}

export function formatPublishType(publishType: SocialPublishType) {
  return publishType
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function looksLikeUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function buildPublishedPostUrl({
  platform,
  platformPostId,
}: {
  platform: SocialPlatform;
  platformPostId: string | null | undefined;
}) {
  const id = platformPostId?.trim();

  if (!id) {
    return null;
  }

  if (looksLikeUrl(id)) {
    return id;
  }

  if (platform === "youtube") {
    return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
  }

  return null;
}
