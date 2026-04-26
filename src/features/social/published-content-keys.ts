import type { SocialPlatform, SocialPublishType } from "./social-types";

type PublishedFootprintPlatform = {
  accountId: string;
  publishType: SocialPublishType;
  platform: SocialPlatform;
  status: string;
  platformPostId: string | null;
  publishedAt: string | null;
};

export function buildPublishedFootprintKey(
  platform: PublishedFootprintPlatform,
  index: number,
) {
  return [
    platform.accountId,
    platform.publishType,
    platform.platformPostId ?? platform.status,
    platform.publishedAt ?? "not-published",
    index,
  ].join("-");
}
