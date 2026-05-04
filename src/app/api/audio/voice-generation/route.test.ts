import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetDemoRateLimitForTests,
} from "@/lib/access-control/access-control";
import {
  setPiperFfmpegRunnerForTest,
  setPiperFileExistsForTest,
  setPiperReadFileForTest,
  setPiperSpawnForTest,
} from "@/lib/multilingual-audio/piper-tts";

import { POST } from "./route";

function mockPiperSpawn() {
  return vi.fn(() => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough;
      stdout: PassThrough;
      stderr: PassThrough;
      kill: ReturnType<typeof vi.fn>;
    };
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.kill = vi.fn();

    setTimeout(() => child.emit("close", 0), 0);

    return child;
  });
}

describe("voice generation API", () => {
  afterEach(() => {
    setPiperSpawnForTest(null);
    setPiperFileExistsForTest(null);
    setPiperReadFileForTest(null);
    setPiperFfmpegRunnerForTest(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    resetDemoRateLimitForTests();
  });

  it("rejects empty segments", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        body: JSON.stringify({ segments: [] }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_TTS_SEGMENTS_REQUIRED",
    });
  });

  it("rejects missing Piper model config", async () => {
    setPiperFileExistsForTest((filePath) => !filePath.includes("missing"));

    const response = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        body: JSON.stringify({
          segments: [{ id: 0, start: 0, end: 1, text: "Xin chào" }],
          settings: {
            binaryPath: "piper",
            modelPath: "/missing/voice.onnx",
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_PIPER_TTS_MODEL_REQUIRED",
    });
  });

  it("returns synthesized Piper WAV audio", async () => {
    setPiperSpawnForTest(mockPiperSpawn() as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("route-audio"));
    setPiperFfmpegRunnerForTest(async () => ({
      stderr: "Duration: 00:00:01.000",
    }));

    const response = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        body: JSON.stringify({
          segments: [{ id: 0, start: 0, end: 1, text: "Xin chào" }],
          settings: {
            binaryPath: "piper",
            modelPath: "/models/voice.onnx",
            preserveTimestampGaps: false,
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      ok: true,
      data: {
        mimeType: "audio/wav",
        extension: "wav",
        byteLength: "route-audio".length,
        segmentCount: 1,
        generationDurationMs: expect.any(Number),
        provider: { name: "piper", mode: "local-cli" },
      },
    });
    expect(Buffer.from(payload.data.audioBase64, "base64").toString()).toBe(
      "route-audio",
    );
  });

  it("rate limits public demo voice generation", async () => {
    vi.stubEnv("OMNIVIDEO_APP_MODE", "public-demo");
    vi.stubEnv("OMNIVIDEO_DEMO_AI_RATE_LIMIT", "1");
    vi.stubEnv("OMNIVIDEO_DEMO_AI_RATE_LIMIT_WINDOW_SECONDS", "60");

    const first = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ segments: [] }),
      }),
    );
    const second = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ segments: [] }),
      }),
    );
    const payload = await second.json();

    expect(first.status).toBe(400);
    expect(second.status).toBe(429);
    expect(payload.errorCode).toBe("DEMO_RATE_LIMITED");
  });
});
