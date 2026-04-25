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
  VIDEO_RESOLVER_ENDPOINT?: string;
  VIDEO_RESOLVER_COOKIES_FILE?: string;
  VIDEO_RESOLVER_COOKIES_FROM_BROWSER?: string;
  VIDEO_RESOLVER_COOKIES_HEADER?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  GOOGLE_DRIVE_ACCESS_TOKEN?: string;
  GOOGLE_DRIVE_FOLDER_ID?: string;
};

let cachedEnv: AppEnv | null = null;

export function getAppEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    MONGODB_URI: readRequiredEnv("MONGODB_URI"),
    MONGODB_DB_NAME: readRequiredEnv("MONGODB_DB_NAME"),
    VIDEO_RESOLVER_ENDPOINT: process.env.VIDEO_RESOLVER_ENDPOINT?.trim(),
    VIDEO_RESOLVER_COOKIES_FILE:
      process.env.VIDEO_RESOLVER_COOKIES_FILE?.trim(),
    VIDEO_RESOLVER_COOKIES_FROM_BROWSER:
      process.env.VIDEO_RESOLVER_COOKIES_FROM_BROWSER?.trim(),
    VIDEO_RESOLVER_COOKIES_HEADER:
      process.env.VIDEO_RESOLVER_COOKIES_HEADER?.trim(),
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim(),
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID?.trim(),
    GOOGLE_DRIVE_ACCESS_TOKEN: process.env.GOOGLE_DRIVE_ACCESS_TOKEN?.trim(),
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID?.trim(),
  };

  return cachedEnv;
}
