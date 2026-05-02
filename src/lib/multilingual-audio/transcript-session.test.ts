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
      videoMetadata: {
        title: "Tieu de",
        description: "Mo ta ngan",
        hashtags: ["a", "b"],
        model: "llama",
        provider: { name: "groq" },
      },
    };

    const raw = serializeTranscriptSession(state);
    expect(parseTranscriptSession(raw)).toMatchObject(state);
  });

  it("returns null for invalid payload", () => {
    expect(parseTranscriptSession("{bad json")).toBeNull();
    expect(parseTranscriptSession(null)).toBeNull();
  });
});
