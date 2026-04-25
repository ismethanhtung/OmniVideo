import type {
  SocialPlatform,
  SocialPlatformCapability,
  SocialPublishType,
} from "./types";

export const SOCIAL_PLATFORM_CAPABILITIES: SocialPlatformCapability[] = [
  {
    platform: "facebook",
    label: "Facebook",
    formats: [
      {
        publishType: "facebook_reel",
        label: "Reels",
        assetType: "video",
        requiredScopes: ["pages_manage_posts", "pages_read_engagement"],
        metadataLimits: {
          titleMaxLength: 120,
          captionMaxLength: 2200,
          hashtagsMaxCount: 30,
          maxDurationSeconds: 90,
          preferredAspectRatios: ["9:16"],
        },
      },
      {
        publishType: "facebook_video",
        label: "Video",
        assetType: "video",
        requiredScopes: ["pages_manage_posts", "pages_read_engagement"],
        metadataLimits: {
          titleMaxLength: 255,
          captionMaxLength: 5000,
          hashtagsMaxCount: 30,
          maxDurationSeconds: null,
          preferredAspectRatios: ["16:9", "9:16", "1:1"],
        },
      },
    ],
    supportedTaskTypes: ["plan_publish", "permission_review", "connection_check"],
    realPublishStatus: "deferred",
    complianceNotes: [
      "Publish requires valid Page/account permissions.",
      "Content must respect Meta policies and usage rights.",
    ],
  },
  {
    platform: "tiktok",
    label: "TikTok",
    formats: [
      {
        publishType: "tiktok_video",
        label: "Video",
        assetType: "video",
        requiredScopes: ["video.upload", "video.publish"],
        metadataLimits: {
          titleMaxLength: 150,
          captionMaxLength: 2200,
          hashtagsMaxCount: 30,
          maxDurationSeconds: 600,
          preferredAspectRatios: ["9:16"],
        },
      },
    ],
    supportedTaskTypes: ["plan_publish", "permission_review", "connection_check"],
    realPublishStatus: "deferred",
    complianceNotes: [
      "Publish requires TikTok API eligibility and user authorization.",
      "Automation must respect TikTok platform rate limits and review rules.",
    ],
  },
  {
    platform: "shopee",
    label: "Shopee",
    formats: [
      {
        publishType: "shopee_video",
        label: "Product Video",
        assetType: "video",
        requiredScopes: ["shop_authorization", "product_write"],
        metadataLimits: {
          titleMaxLength: 120,
          captionMaxLength: 1000,
          hashtagsMaxCount: 10,
          maxDurationSeconds: 60,
          preferredAspectRatios: ["1:1", "9:16"],
        },
      },
    ],
    supportedTaskTypes: ["plan_publish", "product_mapping", "connection_check"],
    realPublishStatus: "deferred",
    complianceNotes: [
      "Product/video mapping must use legitimate product and shop metadata.",
      "No spam distribution or policy bypass is allowed.",
    ],
  },
  {
    platform: "youtube",
    label: "YouTube",
    formats: [
      {
        publishType: "youtube_short",
        label: "Shorts",
        assetType: "video",
        requiredScopes: ["youtube.upload"],
        metadataLimits: {
          titleMaxLength: 100,
          captionMaxLength: 5000,
          hashtagsMaxCount: 15,
          maxDurationSeconds: 180,
          preferredAspectRatios: ["9:16"],
        },
      },
      {
        publishType: "youtube_video",
        label: "Video",
        assetType: "video",
        requiredScopes: ["youtube.upload"],
        metadataLimits: {
          titleMaxLength: 100,
          captionMaxLength: 5000,
          hashtagsMaxCount: 15,
          maxDurationSeconds: null,
          preferredAspectRatios: ["16:9", "9:16"],
        },
      },
    ],
    supportedTaskTypes: [
      "plan_publish",
      "publish_now",
      "permission_review",
      "connection_check",
    ],
    realPublishStatus: "enabled",
    complianceNotes: [
      "Uploads require channel authorization.",
      "Content must respect YouTube policies and rights metadata.",
    ],
  },
];

export function getSocialCapabilityByPlatform(platform: SocialPlatform) {
  return SOCIAL_PLATFORM_CAPABILITIES.find(
    (capability) => capability.platform === platform,
  );
}

export function getPlatformForPublishType(
  publishType: SocialPublishType,
): SocialPlatform | null {
  for (const capability of SOCIAL_PLATFORM_CAPABILITIES) {
    if (
      capability.formats.some((format) => format.publishType === publishType)
    ) {
      return capability.platform;
    }
  }

  return null;
}

export function getDefaultFormatsForPlatform(
  platform: SocialPlatform,
): SocialPublishType[] {
  return (
    getSocialCapabilityByPlatform(platform)?.formats.map(
      (format) => format.publishType,
    ) ?? []
  );
}
