import type { WithId } from "mongodb";

import type {
  EditableSocialAccount,
  SanitizedSocialAccount,
  SocialAccountDocument,
  SocialSecretMap,
} from "./types";

function summarizeSecret(value: string | undefined) {
  if (!value) {
    return { configured: false, preview: null };
  }

  if (value.length <= 8) {
    return { configured: true, preview: "configured" };
  }

  return {
    configured: true,
    preview: `${value.slice(0, 3)}...${value.slice(-3)}`,
  };
}

export function sanitizeSocialAccountDocument(
  document: WithId<SocialAccountDocument>,
): SanitizedSocialAccount {
  const { secrets, _id, ...safeDocument } = document;
  const secretKeys = Object.keys(secrets) as Array<keyof SocialSecretMap>;
  const secretSummary = secretKeys.reduce<
    Record<string, { configured: boolean; preview: string | null }>
  >((summary, key) => {
    summary[key] = summarizeSecret(secrets[key]);
    return summary;
  }, {});

  return {
    ...safeDocument,
    _id: _id.toHexString(),
    secretSummary,
  };
}

export function mapSocialAccountToEditableDocument(
  document: WithId<SocialAccountDocument>,
): EditableSocialAccount {
  const { _id, ...payload } = document;

  return {
    ...payload,
    _id: _id.toHexString(),
  };
}
