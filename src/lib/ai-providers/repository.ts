import {
  ObjectId,
  type Db,
  type OptionalUnlessRequiredId,
  type WithId,
} from "mongodb";

import { getMongoDb } from "../db/mongodb";

import { sanitizeAiProviderDocument } from "./sanitize";
import {
  AiProviderError,
  type AiProviderDocument,
  type SanitizedAiProvider,
  type ValidatedAiProviderInput,
} from "./types";
import type { ValidatedAiProviderUpdateInput } from "./validation";

const COLLECTION_NAME = "ai_providers";

export async function getAiProvidersDb(): Promise<Db> {
  return getMongoDb();
}

export async function createAiProvider({
  db,
  input,
}: {
  db: Db;
  input: ValidatedAiProviderInput;
}): Promise<SanitizedAiProvider> {
  const now = new Date();
  const document: AiProviderDocument = {
    ...input,
    usage: {
      totalRequests: 0,
      totalTokensUsed: 0,
      lastUsedAt: null,
    },
    createdAt: now,
    updatedAt: now,
  };

  const result = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .insertOne(document as OptionalUnlessRequiredId<AiProviderDocument>);

  return sanitizeAiProviderDocument({
    ...document,
    _id: result.insertedId,
  } as WithId<AiProviderDocument>);
}

export async function listAiProviders(
  db: Db,
): Promise<SanitizedAiProvider[]> {
  const documents = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .find({})
    .sort({ status: 1, priority: -1, label: 1 })
    .toArray();

  return documents.map(sanitizeAiProviderDocument);
}

export async function listActiveAiProviders(
  db: Db,
): Promise<SanitizedAiProvider[]> {
  const documents = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .find({ status: "active" })
    .sort({ priority: -1, label: 1 })
    .toArray();

  return documents.map(sanitizeAiProviderDocument);
}

function assertValidObjectId(providerId: string) {
  if (!ObjectId.isValid(providerId)) {
    throw new AiProviderError({
      errorCode: "VAL_AI_PROVIDER_ID_INVALID",
      message: "providerId must be a valid Mongo ObjectId.",
    });
  }
}

export async function getAiProviderById({
  db,
  providerId,
}: {
  db: Db;
  providerId: string;
}): Promise<WithId<AiProviderDocument>> {
  assertValidObjectId(providerId);

  const provider = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(providerId) });

  if (!provider) {
    throw new AiProviderError({
      errorCode: "VAL_AI_PROVIDER_NOT_FOUND",
      message: "AI provider was not found.",
      statusCode: 404,
    });
  }

  return provider;
}

export async function updateAiProvider({
  db,
  providerId,
  patch,
}: {
  db: Db;
  providerId: string;
  patch: ValidatedAiProviderUpdateInput;
}): Promise<SanitizedAiProvider> {
  assertValidObjectId(providerId);

  const result = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .findOneAndUpdate(
      { _id: new ObjectId(providerId) },
      { $set: { ...patch, updatedAt: new Date() } },
      { returnDocument: "after" },
    );

  if (!result) {
    throw new AiProviderError({
      errorCode: "VAL_AI_PROVIDER_NOT_FOUND",
      message: "AI provider was not found.",
      statusCode: 404,
    });
  }

  return sanitizeAiProviderDocument(result);
}

export async function deleteAiProvider({
  db,
  providerId,
}: {
  db: Db;
  providerId: string;
}): Promise<SanitizedAiProvider> {
  assertValidObjectId(providerId);

  const result = await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .findOneAndDelete({ _id: new ObjectId(providerId) });

  if (!result) {
    throw new AiProviderError({
      errorCode: "VAL_AI_PROVIDER_NOT_FOUND",
      message: "AI provider was not found.",
      statusCode: 404,
    });
  }

  return sanitizeAiProviderDocument(result);
}

export async function incrementAiProviderUsage({
  db,
  providerId,
  tokensUsed,
}: {
  db: Db;
  providerId: string;
  tokensUsed: number;
}) {
  assertValidObjectId(providerId);

  await db
    .collection<AiProviderDocument>(COLLECTION_NAME)
    .updateOne(
      { _id: new ObjectId(providerId) },
      {
        $inc: {
          "usage.totalRequests": 1,
          "usage.totalTokensUsed": tokensUsed,
        },
        $set: {
          "usage.lastUsedAt": new Date(),
          updatedAt: new Date(),
        },
      },
    );
}
