import {
  ObjectId,
  type Db,
  type OptionalUnlessRequiredId,
  type WithId,
} from "mongodb";

import { getMongoDb } from "../db/mongodb";

import { assertStorageProviderCanUploadForIntake } from "./intake-eligibility";
import {
  StorageProviderError,
  type SanitizedStorageProvider,
  type StorageProviderDocument,
  type StorageProviderStatus,
  type StorageProviderType,
  type ValidatedStorageProviderInput,
} from "./types";
import type { ValidatedStorageProviderUpdateInput } from "./validation";
import { sanitizeStorageProviderDocument } from "./sanitize";

const COLLECTION_NAME = "storage_provider_accounts";

export async function getStorageProvidersDb(): Promise<Db> {
  return getMongoDb();
}

export async function createStorageProviderAccount({
  db,
  input,
}: {
  db: Db;
  input: ValidatedStorageProviderInput;
}): Promise<SanitizedStorageProvider> {
  const now = new Date();
  const document = {
    ...input,
    usage: {
      assetCountApprox: 0,
      lastUsedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .insertOne(document as OptionalUnlessRequiredId<StorageProviderDocument>);

  return sanitizeStorageProviderDocument({
    ...document,
    _id: result.insertedId,
  });
}

async function getApproxAssetCountsByProviderType(db: Db) {
  const rows = await db
    .collection("assets")
    .aggregate<{ _id: StorageProviderType; count: number; lastUsedAt: Date | null }>([
      { $match: { assetType: "video" } },
      {
        $group: {
          _id: "$storageProvider",
          count: { $sum: 1 },
          lastUsedAt: { $max: "$createdAt" },
        },
      },
    ])
    .toArray();

  return new Map(rows.map((row) => [row._id, row]));
}

export async function listStorageProviderAccounts(
  db: Db,
): Promise<SanitizedStorageProvider[]> {
  const [documents, countsByProviderType] = await Promise.all([
    db
      .collection<StorageProviderDocument>(COLLECTION_NAME)
      .find({})
      .sort({ status: 1, priority: -1, label: 1 })
      .toArray(),
    getApproxAssetCountsByProviderType(db),
  ]);

  return documents.map((document) => {
    const usage = countsByProviderType.get(document.providerType);

    return sanitizeStorageProviderDocument({
      ...document,
      usage: {
        assetCountApprox: usage?.count ?? document.usage?.assetCountApprox ?? 0,
        lastUsedAt: usage?.lastUsedAt ?? document.usage?.lastUsedAt ?? null,
      },
    });
  });
}

export async function listStorageProviderAccountsForConnectionChecks(
  db: Db,
): Promise<WithId<StorageProviderDocument>[]> {
  return db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .find({
      providerType: { $in: ["telegram", "drive"] },
    })
    .sort({ status: 1, priority: -1, label: 1 })
    .toArray();
}

export async function updateStorageProviderStatus({
  db,
  providerId,
  status,
}: {
  db: Db;
  providerId: string;
  status: StorageProviderStatus;
}): Promise<SanitizedStorageProvider> {
  if (!ObjectId.isValid(providerId)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ID_INVALID",
      message: "providerId must be a valid Mongo ObjectId.",
    });
  }

  const result = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(providerId) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_NOT_FOUND",
      message: "Storage provider account was not found.",
      statusCode: 404,
    });
  }

  return sanitizeStorageProviderDocument(result);
}

export async function updateStorageProviderAccount({
  db,
  providerId,
  patch,
}: {
  db: Db;
  providerId: string;
  patch: ValidatedStorageProviderUpdateInput;
}): Promise<SanitizedStorageProvider> {
  if (!ObjectId.isValid(providerId)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ID_INVALID",
      message: "providerId must be a valid Mongo ObjectId.",
    });
  }

  const result = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(providerId) },
      {
        $set: {
          ...patch,
          updatedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_NOT_FOUND",
      message: "Storage provider account was not found.",
      statusCode: 404,
    });
  }

  return sanitizeStorageProviderDocument(result);
}

export async function deleteStorageProviderAccount({
  db,
  providerId,
}: {
  db: Db;
  providerId: string;
}) {
  if (!ObjectId.isValid(providerId)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ID_INVALID",
      message: "providerId must be a valid Mongo ObjectId.",
    });
  }

  const result = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .findOneAndDelete({
      _id: new ObjectId(providerId),
    });

  if (!result) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_NOT_FOUND",
      message: "Storage provider account was not found.",
      statusCode: 404,
    });
  }

  return sanitizeStorageProviderDocument(result);
}

export async function getActiveStorageProviderAccountForUpload({
  db,
  providerId,
}: {
  db: Db;
  providerId: string;
}): Promise<WithId<StorageProviderDocument>> {
  if (!ObjectId.isValid(providerId)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_ID_INVALID",
      message: "storageProviderAccountId must be a valid Mongo ObjectId.",
    });
  }

  const provider = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(providerId) });

  if (!provider) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_NOT_FOUND",
      message: "Storage provider account was not found.",
      statusCode: 404,
    });
  }

  assertStorageProviderCanUploadForIntake(provider);

  return provider;
}

export async function getStorageProviderAccountById({
  db,
  providerId,
}: {
  db: Db;
  providerId: string;
}): Promise<WithId<StorageProviderDocument>> {
  if (!ObjectId.isValid(providerId)) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_ID_INVALID",
      message: "storageProviderAccountId must be a valid Mongo ObjectId.",
    });
  }

  const provider = await db
    .collection<StorageProviderDocument>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(providerId) });

  if (!provider) {
    throw new StorageProviderError({
      errorCode: "VAL_STORAGE_PROVIDER_ACCOUNT_NOT_FOUND",
      message: "Storage provider account was not found.",
      statusCode: 404,
    });
  }

  return provider;
}
