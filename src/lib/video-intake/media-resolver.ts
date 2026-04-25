import { getAppEnv } from "@/lib/config/env";

import { resolveMediaUrlInternal } from "./internal-resolver";
import { isLikelyDirectMediaUrl } from "./platform";
import {
  type IntakeQualityPreference,
  type ResolvedMedia,
  type ValidatedIntakeInput,
} from "./types";

type ResolverResponse = {
  directMediaUrl?: string;
  title?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationMs?: number;
  formatId?: string;
  formatNote?: string;
  height?: number;
  width?: number;
  resolution?: string;
  ext?: string;
  vcodec?: string;
  acodec?: string;
  requestHeaders?: Record<string, string>;
};

function normalizeResolverQuality(preference: IntakeQualityPreference) {
  return preference;
}

function mapResolvedMedia({
  input,
  payload,
  resolver,
}: {
  input: ValidatedIntakeInput;
  payload: ResolverResponse;
  resolver: ResolvedMedia["resolver"];
}): ResolvedMedia {
  return {
    originalUrl: input.canonicalUrl,
    directMediaUrl: payload.directMediaUrl as string,
    originPlatform: input.originPlatform,
    title: payload.title ?? input.title,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    durationMs: payload.durationMs,
    requestedQuality: normalizeResolverQuality(input.qualityPreference ?? "best"),
    formatId: payload.formatId,
    formatNote: payload.formatNote,
    height: payload.height,
    width: payload.width,
    resolution: payload.resolution,
    ext: payload.ext,
    vcodec: payload.vcodec,
    acodec: payload.acodec,
    requestHeaders: payload.requestHeaders,
    resolver,
  };
}

async function resolveViaExternalEndpoint(
  input: ValidatedIntakeInput,
  resolverEndpoint: string,
): Promise<ResolvedMedia | null> {
  const response = await fetch(resolverEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      url: input.canonicalUrl,
      platform: input.originPlatform,
      qualityPreference: input.qualityPreference ?? "best",
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as ResolverResponse;

  if (!payload.directMediaUrl) {
    return null;
  }

  return mapResolvedMedia({
    input,
    payload,
    resolver: "external-resolver",
  });
}

export async function resolveMediaUrl(
  input: ValidatedIntakeInput,
): Promise<ResolvedMedia> {
  if (isLikelyDirectMediaUrl(input.canonicalUrl)) {
    return {
      originalUrl: input.canonicalUrl,
      directMediaUrl: input.canonicalUrl,
      originPlatform: input.originPlatform,
      title: input.title,
      requestedQuality: input.qualityPreference ?? "best",
      resolver: "direct-url",
    };
  }

  const resolverEndpoint = getAppEnv().VIDEO_RESOLVER_ENDPOINT;

  if (resolverEndpoint) {
    const externalResult = await resolveViaExternalEndpoint(input, resolverEndpoint);

    if (externalResult) {
      return externalResult;
    }
  }

  const payload = await resolveMediaUrlInternal(
    input.canonicalUrl,
    input.qualityPreference ?? "best",
  );

  return mapResolvedMedia({
    input,
    payload,
    resolver: "internal-resolver",
  });
}
