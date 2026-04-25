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

export type PublishRecordStatus =
  | "planned"
  | "queued"
  | "published"
  | "failed"
  | "retrying"
  | "canceled";

export type PublishMode = "schedule" | "publish_now";

export type YouTubePrivacyStatus = "private" | "unlisted" | "public";

export type SocialSecretMap = {
  accessToken?: string;
  refreshToken?: string;
  appId?: string;
  appSecret?: string;
  pageId?: string;
  shopId?: string;
  openId?: string;
  channelId?: string;
  clientId?: string;
  clientSecret?: string;
  connectionJson?: string;
};

export type SocialAccountCreateInput = {
  platform: SocialPlatform;
  label: string;
  displayName?: string;
  handle?: string;
  accountId?: string;
  status?: SocialAccountStatus;
  authMode?: SocialAuthMode;
  channelTags?: string[];
  permissionScopes?: string[];
  supportedFormats?: SocialPublishType[];
  secrets?: SocialSecretMap;
};

export type ValidatedSocialAccountInput = {
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
  secrets: SocialSecretMap;
};

export type SocialAccountDocument = ValidatedSocialAccountInput & {
  lastHealthCheckAt: Date | null;
  lastError: {
    code: string;
    message: string;
    checkedAt: Date;
  } | null;
  usage: {
    publishRecordCountApprox: number;
    lastPlannedAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
};

export type SanitizedSocialAccount = Omit<SocialAccountDocument, "secrets"> & {
  _id: string;
  secretSummary: Record<string, { configured: boolean; preview: string | null }>;
};

export type EditableSocialAccount = Omit<
  SocialAccountDocument,
  "usage" | "lastHealthCheckAt" | "lastError"
> & {
  _id: string;
};

export type SocialPlatformCapability = {
  platform: SocialPlatform;
  label: string;
  formats: Array<{
    publishType: SocialPublishType;
    label: string;
    assetType: "video";
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

export type PublishRecordCreateInput = {
  assetId: string;
  socialAccountId: string;
  publishType: SocialPublishType;
  publishNow?: boolean;
  privacyStatus?: YouTubePrivacyStatus;
  title?: string;
  caption?: string;
  hashtags?: string[];
  scheduledAt?: string | null;
};

export type ValidatedPublishRecordInput = {
  assetId: string;
  socialAccountId: string;
  publishType: SocialPublishType;
  publishMode: PublishMode;
  privacyStatus: YouTubePrivacyStatus;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  scheduledAt: Date | null;
};

export type PublishRecordDocument = {
  assetId: import("mongodb").ObjectId;
  socialAccountId: import("mongodb").ObjectId;
  platform: SocialPlatform;
  publishType: SocialPublishType;
  publishMode: PublishMode;
  privacyStatus: YouTubePrivacyStatus;
  status: PublishRecordStatus;
  title: string | null;
  caption: string | null;
  hashtags: string[];
  scheduledAt: Date | null;
  publishedAt: Date | null;
  platformPostId: string | null;
  retryCount: number;
  errorCode: string | null;
  errorDetail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class SocialError extends Error {
  readonly errorCode: string;

  readonly statusCode: number;

  constructor({
    errorCode,
    message,
    statusCode = 400,
  }: {
    errorCode: string;
    message: string;
    statusCode?: number;
  }) {
    super(message);
    this.name = "SocialError";
    this.errorCode = errorCode;
    this.statusCode = statusCode;
  }
}
