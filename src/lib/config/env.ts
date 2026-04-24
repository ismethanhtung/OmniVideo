function readRequiredEnv(name: "MONGODB_URI" | "MONGODB_DB_NAME"): string {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export type AppEnv = {
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
};

let cachedEnv: AppEnv | null = null;

export function getAppEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    MONGODB_URI: readRequiredEnv("MONGODB_URI"),
    MONGODB_DB_NAME: readRequiredEnv("MONGODB_DB_NAME"),
  };

  return cachedEnv;
}
