import { afterEach, describe, expect, it, vi } from "vitest";

import { setEdgeTtsWebSocketConstructorForTest } from "@/lib/multilingual-audio/edge-tts";

import { POST } from "./route";

class MockEdgeWebSocket {
  binaryType: BinaryType = "arraybuffer";
  readyState = 1;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor() {
    setTimeout(() => this.onopen?.(new Event("open")), 0);
  }

  send(data: string) {
    if (!data.includes("Path:ssml")) return;
    setTimeout(() => {
      this.onmessage?.({
        data: createAudioFrame(Buffer.from("route-audio")),
      } as MessageEvent);
      setTimeout(() => {
        this.onmessage?.({
          data: "Path:turn.end\r\n\r\n",
        } as MessageEvent);
      }, 0);
    }, 0);
  }

  close() {
    this.readyState = 3;
    this.onclose?.({ code: 1000, reason: "done" } as CloseEvent);
  }
}

function createAudioFrame(audio: Buffer) {
  const header = Buffer.from("Path:audio\r\nContent-Type:audio/mpeg\r\n", "utf8");
  const prefix = Buffer.alloc(2);
  prefix.writeUInt16BE(header.length, 0);
  const frame = Buffer.concat([prefix, header, audio]);
  return frame.buffer.slice(frame.byteOffset, frame.byteOffset + frame.byteLength);
}

describe("voice generation API", () => {
  afterEach(() => {
    setEdgeTtsWebSocketConstructorForTest(null);
    vi.unstubAllGlobals();
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

  it("rejects unsupported output formats", async () => {
    const response = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        body: JSON.stringify({
          segments: [{ id: 0, start: 0, end: 1, text: "Xin chào" }],
          settings: {
            outputFormat: "riff-24khz-16bit-mono-pcm",
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toMatchObject({
      ok: false,
      errorCode: "VAL_TTS_CONFIG_INVALID",
    });
  });

  it("returns synthesized Edge-TTS audio", async () => {
    setEdgeTtsWebSocketConstructorForTest(MockEdgeWebSocket);

    const response = await POST(
      new Request("http://localhost/api/audio/voice-generation", {
        method: "POST",
        body: JSON.stringify({
          segments: [{ id: 0, start: 0, end: 1, text: "Xin chào" }],
          settings: {
            voice: "vi-VN-HoaiMyNeural",
            outputFormat: "audio-24khz-48kbitrate-mono-mp3",
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
        mimeType: "audio/mpeg",
        extension: "mp3",
        byteLength: "route-audio".length,
        segmentCount: 1,
      },
    });
    expect(Buffer.from(payload.data.audioBase64, "base64").toString()).toBe(
      "route-audio",
    );
  });
});
