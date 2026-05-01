import { describe, expect, it } from "vitest";

import {
  parseTranscriptSession,
  serializeTranscriptSession,
  type TranscriptSessionState,
} from "./transcript-session";

describe("transcript-session", () => {
  it("serializes and parses session", () => {
    const state: TranscriptSessionState = {
      language: "zh",
      prompt: "test",
      includeWordTimestamps: true,
      selectedProviderId: "provider-1",
      translationModel: "llama",
      selectedAssetId: "asset-1",
      segmentView: "translation",
      steps: [],
      result: null,
      translation: null,
    };

    const raw = serializeTranscriptSession(state);
    expect(parseTranscriptSession(raw)).toMatchObject(state);
  });

  it("returns null for invalid payload", () => {
    expect(parseTranscriptSession("{bad json")).toBeNull();
    expect(parseTranscriptSession(null)).toBeNull();
  });
});
