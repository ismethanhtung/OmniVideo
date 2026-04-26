import {
  ObjectId,
  type Db,
  type OptionalUnlessRequiredId,
  type WithId,
} from "mongodb";

import { getMongoDb } from "@/lib/db/mongodb";

import {
  getPlatformForPublishType,
  SOCIAL_PLATFORM_CAPABILITIES,
} from "./capabilities";
import {
  sanitizeSocialAccountDocument,
  mapSocialAccountToEditableDocument,
} from "./sanitize";
import {
  SocialError,
  type EditableSocialAccount,
  type PublishRecordDocument,
  type PublishRecordStatus,
  type SanitizedSocialAccount,
  type SocialAccountDocument,
  type SocialPlatform,
  type ValidatedPublishRecordInput,
  type ValidatedSocialAccountInput,
} from "./types";
import type { ValidatedSocialAccountUpdateInput } from "./validation";
import { uploadVideoToFacebook } from "./facebook-upload";
import { uploadVideoToTikTok } from "./tiktok-upload";
import { uploadVideoToYouTube } from "./youtube-upload";

const SOCIAL_ACCOUNTS_COLLECTION = "social_accounts";
const PUBLISH_RECORDS_COLLECTION = "publish_records";

type PublishRecordListFilters = {
  platform?: SocialPlatform;
  status?: PublishRecordStatus;
};

type PublishRecordListInput = PublishRecordListFilters & {
  limit?: number;
};

type PublishRecordPageInput = PublishRecordListFilters & {
  page: number;
  pageSize: number;
};

export async function getSocialDb(): Promise<Db> {
  return getMongoDb();
}

export async function createSocialAccount({
  db,
  input,
}: {
  db: Db;
  input: ValidatedSocialAccountInput;
}): Promise<SanitizedSocialAccount> {
  const now = new Date();
  const document: SocialAccountDocument = {
    ...input,
    lastHealthCheckAt: null,
    lastError: null,
    usage: {
      publishRecordCountApprox: 0,
      lastPlannedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
    .insertOne(document as OptionalUnlessRequiredId<SocialAccountDocument>);

  return sanitizeSocialAccountDocument({
    ...document,
    _id: result.insertedId,
  });
}

async function getPublishUsageByAccount(db: Db) {
  const rows = await db
    .collection(PUBLISH_RECORDS_COLLECTION)
    .aggregate<{
      _id: ObjectId;
      count: number;
      lastPlannedAt: Date | null;
    }>([
      {
        $group: {
          _id: "$socialAccountId",
          count: { $sum: 1 },
          lastPlannedAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id.toHexString(), row]));
}

export async function listSocialAccounts(
  db: Db,
): Promise<SanitizedSocialAccount[]> {
  const [documents, usageByAccount] = await Promise.all([
    db
      .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
      .find({})
      .sort({ status: 1, platform: 1, label: 1 })
      .toArray(),
    getPublishUsageByAccount(db),
  ]);

  return documents.map((document) => {
    const usage = usageByAccount.get(document._id.toHexString());

    return sanitizeSocialAccountDocument({
      ...document,
      usage: {
        publishRecordCountApprox:
          usage?.count ?? document.usage?.publishRecordCountApprox ?? 0,
        lastPlannedAt: usage?.lastPlannedAt ?? document.usage?.lastPlannedAt ?? null,
      },
    });
  });
}

export async function listSocialAccountsForConnectionChecks(
  db: Db,
): Promise<Array<WithId<SocialAccountDocument>>> {
  return db
    .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
    .find({})
    .sort({ status: 1, platform: 1, label: 1 })
    .toArray();
}

export async function getSocialAccountById({
  db,
  accountId,
}: {
  db: Db;
  accountId: string;
}): Promise<WithId<SocialAccountDocument>> {
  if (!ObjectId.isValid(accountId)) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_ID_INVALID",
      message: "accountId must be a valid Mongo ObjectId.",
    });
  }

  const account = await db
    .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
    .findOne({ _id: new ObjectId(accountId) });

  if (!account) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_NOT_FOUND",
      message: "Social account was not found.",
      statusCode: 404,
    });
  }

  return account;
}

export async function getEditableSocialAccountById({
  db,
  accountId,
}: {
  db: Db;
  accountId: string;
}): Promise<EditableSocialAccount> {
  return mapSocialAccountToEditableDocument(
    await getSocialAccountById({ db, accountId }),
  );
}

export async function updateSocialAccount({
  db,
  accountId,
  patch,
}: {
  db: Db;
  accountId: string;
  patch: ValidatedSocialAccountUpdateInput;
}): Promise<SanitizedSocialAccount> {
  if (!ObjectId.isValid(accountId)) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_ID_INVALID",
      message: "accountId must be a valid Mongo ObjectId.",
    });
  }

  const result = await db
    .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
    .findOneAndUpdate(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          ...patch,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_NOT_FOUND",
      message: "Social account was not found.",
      statusCode: 404,
    });
  }

  return sanitizeSocialAccountDocument(result);
}

export async function markSocialAccountConnected({
  db,
  accountId,
  patch,
}: {
  db: Db;
  accountId: string;
  patch: {
    displayName?: string | null;
    handle?: string | null;
    accountId?: string | null;
    permissionScopes: string[];
    secrets: SocialAccountDocument["secrets"];
  };
}): Promise<SanitizedSocialAccount> {
  return updateSocialAccount({
    db,
    accountId,
    patch: {
      displayName: patch.displayName,
      handle: patch.handle,
      accountId: patch.accountId,
      authMode: "oauth",
      permissionScopes: patch.permissionScopes,
      secrets: patch.secrets,
      status: "connected",
    },
  });
}

export async function deleteSocialAccount({
  db,
  accountId,
}: {
  db: Db;
  accountId: string;
}): Promise<SanitizedSocialAccount> {
  if (!ObjectId.isValid(accountId)) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_ID_INVALID",
      message: "accountId must be a valid Mongo ObjectId.",
    });
  }

  const activePublishRecords = await db
    .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
    .countDocuments({
      socialAccountId: new ObjectId(accountId),
      status: { $in: ["planned", "queued", "retrying"] },
    });

  if (activePublishRecords > 0) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_HAS_ACTIVE_PUBLISH_RECORDS",
      message:
        "Social account has active publish records. Cancel them before deleting.",
      statusCode: 409,
    });
  }

  const result = await db
    .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
    .findOneAndDelete({ _id: new ObjectId(accountId) });

  if (!result) {
    throw new SocialError({
      errorCode: "VAL_SOCIAL_ACCOUNT_NOT_FOUND",
      message: "Social account was not found.",
      statusCode: 404,
    });
  }

  return sanitizeSocialAccountDocument(result);
}

export async function createPublishRecord({
  db,
  input,
}: {
  db: Db;
  input: ValidatedPublishRecordInput;
}) {
  const account = await getSocialAccountById({
    db,
    accountId: input.socialAccountId,
  });
  const platform = getPlatformForPublishType(input.publishType);

  if (!platform || platform !== account.platform) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_TYPE_PLATFORM_MISMATCH",
      message: "publishType does not match the selected social account platform.",
    });
  }

  if (!account.supportedFormats.includes(input.publishType)) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_TYPE_NOT_ENABLED",
      message: "publishType is not enabled for this social account.",
    });
  }

  const assetObjectId = new ObjectId(input.assetId);
  const asset = await db.collection("assets").findOne({
    _id: assetObjectId,
    assetType: "video",
  });

  if (!asset) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_ASSET_NOT_FOUND",
      message: "Video asset was not found.",
      statusCode: 404,
    });
  }

  const now = new Date();
  const document: PublishRecordDocument = {
    assetId: assetObjectId,
    socialAccountId: account._id,
    platform,
    publishType: input.publishType,
    facebookPageId: input.facebookPageId,
    publishMode: input.publishMode,
    privacyStatus: input.privacyStatus,
    status: "planned",
    title: input.title,
    caption: input.caption,
    hashtags: input.hashtags,
    scheduledAt: input.scheduledAt,
    publishedAt: null,
    platformPostId: null,
    retryCount: 0,
    errorCode: null,
    errorDetail: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
    .insertOne(document as OptionalUnlessRequiredId<PublishRecordDocument>);

  return {
    ...document,
    _id: result.insertedId,
  };
}

export async function executePublishNow({
  db,
  publishRecordId,
}: {
  db: Db;
  publishRecordId: ObjectId;
}) {
  const record = await db
    .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
    .findOne({ _id: publishRecordId });

  if (!record) {
    throw new SocialError({
      errorCode: "VAL_PUBLISH_RECORD_NOT_FOUND",
      message: "Publish record was not found.",
      statusCode: 404,
    });
  }

  await db.collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION).updateOne(
    { _id: publishRecordId },
    {
      $set: {
        status: "queued",
        updatedAt: new Date(),
      },
    },
  );

  try {
    const [account, asset] = await Promise.all([
      db
        .collection<SocialAccountDocument>(SOCIAL_ACCOUNTS_COLLECTION)
        .findOne({ _id: record.socialAccountId }),
      db.collection("assets").findOne({ _id: record.assetId, assetType: "video" }),
    ]);

    if (!account) {
      throw new Error("VAL_SOCIAL_ACCOUNT_NOT_FOUND");
    }

    if (!asset) {
      throw new Error("VAL_PUBLISH_ASSET_NOT_FOUND");
    }

    if (
      record.platform !== "youtube" &&
      record.platform !== "tiktok" &&
      record.platform !== "facebook"
    ) {
      throw new Error("PRV_SOCIAL_PUBLISH_ADAPTER_NOT_IMPLEMENTED");
    }

    if (account.status !== "connected") {
      throw new Error("AUTH_SOCIAL_NOT_CONNECTED");
    }

    if (record.platform === "youtube") {
      const upload = await uploadVideoToYouTube({
        db,
        account,
        asset,
        record,
      });
      const now = new Date();

      const updated = await db
        .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
        .findOneAndUpdate(
          { _id: publishRecordId },
          {
            $set: {
              status: "published",
              platformPostId: upload.platformPostId,
              publishedAt: now,
              errorCode: null,
              errorDetail: null,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );

      return updated;
    }

    if (record.platform === "facebook") {
      const upload = await uploadVideoToFacebook({
        db,
        account,
        asset,
        record,
      });
      const now = new Date();

      const updated = await db
        .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
        .findOneAndUpdate(
          { _id: publishRecordId },
          {
            $set: {
              status: upload.status,
              platformPostId: upload.platformPostId,
              publishedAt: upload.status === "published" ? now : null,
              errorCode: null,
              errorDetail: null,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );

      return updated;
    }

    const upload = await uploadVideoToTikTok({
      db,
      account,
      asset,
      record,
    });
    const now = new Date();

    if (upload.status === "published") {
      const updated = await db
        .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
        .findOneAndUpdate(
          { _id: publishRecordId },
          {
            $set: {
              status: "published",
              platformPostId: upload.platformPostId,
              publishedAt: now,
              errorCode: null,
              errorDetail: null,
              updatedAt: now,
            },
          },
          { returnDocument: "after" },
        );

      return updated;
    }

    const updated = await db
      .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
      .findOneAndUpdate(
        { _id: publishRecordId },
        {
          $set: {
            status: "queued",
            platformPostId: upload.publishId,
            publishedAt: null,
            errorCode: null,
            errorDetail: null,
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );

    return updated;
  } catch (error) {
    const now = new Date();
    const message =
      error instanceof Error ? error.message : "Social publish failed.";
    const errorCode = message.includes(":")
      ? message.split(":")[0]
      : message.startsWith("AUTH_") ||
          message.startsWith("VAL_") ||
          message.startsWith("PRV_")
        ? message
        : "PRV_YOUTUBE_UPLOAD_FAILED";

    const updated = await db
      .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
      .findOneAndUpdate(
        { _id: publishRecordId },
        {
          $set: {
            status: "failed",
            errorCode,
            errorDetail: message,
            updatedAt: now,
          },
        },
        { returnDocument: "after" },
      );

    return updated;
  }
}

function buildPublishRecordMatch({
  platform,
  status,
}: PublishRecordListFilters) {
  const match: Partial<Pick<PublishRecordDocument, "platform" | "status">> = {};

  if (platform) {
    match.platform = platform;
  }

  if (status) {
    match.status = status;
  }

  return match;
}

function buildPublishRecordLookupStages() {
  return [
    {
      $lookup: {
        from: SOCIAL_ACCOUNTS_COLLECTION,
        localField: "socialAccountId",
        foreignField: "_id",
        as: "socialAccount",
      },
    },
    {
      $lookup: {
        from: "assets",
        localField: "assetId",
        foreignField: "_id",
        as: "asset",
      },
    },
    {
      $project: {
        assetId: 1,
        socialAccountId: 1,
        platform: 1,
        publishType: 1,
        facebookPageId: 1,
        publishMode: 1,
        privacyStatus: 1,
        status: 1,
        title: 1,
        caption: 1,
        hashtags: 1,
        scheduledAt: 1,
        publishedAt: 1,
        platformPostId: 1,
        retryCount: 1,
        errorCode: 1,
        errorDetail: 1,
        createdAt: 1,
        updatedAt: 1,
        socialAccount: {
          $let: {
            vars: { account: { $arrayElemAt: ["$socialAccount", 0] } },
            in: {
              label: "$$account.label",
              displayName: "$$account.displayName",
              handle: "$$account.handle",
            },
          },
        },
        asset: {
          $let: {
            vars: { asset: { $arrayElemAt: ["$asset", 0] } },
            in: {
              title: "$$asset.metadata.title",
              storageProvider: "$$asset.storageProvider",
              providerAssetId: "$$asset.providerAssetId",
            },
          },
        },
      },
    },
  ];
}

export async function listPublishRecords({
  db,
  limit = 50,
  platform,
  status,
}: { db: Db } & PublishRecordListInput) {
  const match = buildPublishRecordMatch({ platform, status });

  return db
    .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
    .aggregate([
      ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
      { $sort: { createdAt: -1 } },
      { $limit: limit },
      ...buildPublishRecordLookupStages(),
    ])
    .toArray();
}

export async function listPublishRecordsPage({
  db,
  page,
  pageSize,
  platform,
  status,
}: { db: Db } & PublishRecordPageInput) {
  const match = buildPublishRecordMatch({ platform, status });
  const query = Object.keys(match).length > 0 ? match : {};
  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    db
      .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
      .aggregate([
        ...(Object.keys(match).length > 0 ? [{ $match: match }] : []),
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize },
        ...buildPublishRecordLookupStages(),
      ])
      .toArray(),
    db
      .collection<PublishRecordDocument>(PUBLISH_RECORDS_COLLECTION)
      .countDocuments(query),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getSocialDashboard(db: Db) {
  const [accounts, records, assetCount] = await Promise.all([
    listSocialAccounts(db),
    listPublishRecords({ db, limit: 25 }),
    db.collection("assets").countDocuments({ assetType: "video" }),
  ]);

  const accountsByPlatform = accounts.reduce<Record<SocialPlatform, number>>(
    (summary, account) => {
      summary[account.platform] += 1;
      return summary;
    },
    { facebook: 0, tiktok: 0, shopee: 0, youtube: 0 },
  );

  const publishStatusCounts = records.reduce<Record<string, number>>(
    (summary, record) => {
      const status = typeof record.status === "string" ? record.status : "unknown";
      summary[status] = (summary[status] ?? 0) + 1;
      return summary;
    },
    {},
  );

  return {
    capabilities: SOCIAL_PLATFORM_CAPABILITIES,
    accounts,
    recentPublishRecords: records,
    summary: {
      accountCount: accounts.length,
      connectedAccountCount: accounts.filter((account) => account.status === "connected")
        .length,
      publishRecordCount: records.length,
      assetCount,
      accountsByPlatform,
      publishStatusCounts,
    },
  };
}
