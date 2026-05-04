import { Db, MongoClient } from "mongodb";

import { getAppEnv } from "@/lib/config/env";

const mongoClientOptions = {
  maxPoolSize: 10,
};

declare global {
  var __omnivideoMongoClientPromise: Promise<MongoClient> | undefined;
}

function createMongoClientPromise(): Promise<MongoClient> {
  const { MONGODB_URI } = getAppEnv();
  const client = new MongoClient(MONGODB_URI, mongoClientOptions);
  return client.connect();
}

const mongoClientPromise =
  global.__omnivideoMongoClientPromise ?? createMongoClientPromise();

if (process.env.NODE_ENV !== "production") {
  global.__omnivideoMongoClientPromise = mongoClientPromise;
}

export async function getMongoClient(): Promise<MongoClient> {
  return mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const { MONGODB_DB_NAME } = getAppEnv();
  const client = await getMongoClient();
  return client.db(MONGODB_DB_NAME);
}
