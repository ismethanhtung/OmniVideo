import type { StorageProviderSecretMap } from "./types";

export type StorageProviderSecretFormState = Required<StorageProviderSecretMap>;

export const EMPTY_STORAGE_PROVIDER_SECRETS: StorageProviderSecretFormState = {
  botToken: "",
  chatId: "",
  accessToken: "",
  refreshToken: "",
  folderId: "",
  endpoint: "",
  bucket: "",
  region: "",
  accessKeyId: "",
  secretAccessKey: "",
  basePath: "",
  connectionJson: "",
};

export function normalizeStorageProviderSecretFormState(
  value: unknown,
): StorageProviderSecretFormState {
  const payload =
    value && typeof value === "object"
      ? (value as Partial<Record<keyof StorageProviderSecretMap, unknown>>)
      : {};

  return Object.fromEntries(
    Object.keys(EMPTY_STORAGE_PROVIDER_SECRETS).map((key) => {
      const secret = payload[key as keyof StorageProviderSecretMap];

      return [key, typeof secret === "string" ? secret : ""];
    }),
  ) as StorageProviderSecretFormState;
}
