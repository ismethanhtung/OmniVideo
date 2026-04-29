import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
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

    setTimeout(() => {
      child.stdout.write(Buffer.from("api-wav"));
      child.emit("close", 0);
    }, 0);

    return child;
  });
}

describe("piper tts API", () => {
  afterEach(() => {
    setPiperSpawnForTest(null);
    setPiperFileExistsForTest(null);
    setPiperReadFileForTest(null);
  });

  it("rejects empty text", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/piper-tts", {
        method: "POST",
        body: JSON.stringify({
          text: "",
          binaryPath: "piper",
          modelPath: "/models/voice.onnx",
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_PIPER_TTS_TEXT_REQUIRED",
    });
  });

  it("returns synthesized Piper WAV audio", async () => {
    setPiperSpawnForTest(mockPiperSpawn() as never);
    setPiperFileExistsForTest(() => true);
    setPiperReadFileForTest(async () => Buffer.from("api-wav"));

    const response = await POST(
      new Request("http://localhost/api/audio/piper-tts", {
        method: "POST",
        body: JSON.stringify({
          text: "Hello Piper",
          binaryPath: "piper",
          modelPath: "/models/voice.onnx",
          speaker: "0",
          lengthScale: "1",
          noiseScale: "0.667",
          noiseW: "0.8",
          sentenceSilence: "0.2",
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
        byteLength: "api-wav".length,
        provider: { name: "piper", mode: "local-cli" },
      },
    });
    expect(Buffer.from(payload.data.audioBase64, "base64").toString()).toBe(
      "api-wav",
    );
  });
});
