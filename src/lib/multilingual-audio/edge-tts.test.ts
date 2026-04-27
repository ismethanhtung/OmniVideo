import { describe, expect, it } from "vitest";

import {
  buildEdgeTtsSsml,
  buildAtempoFilterChain,
  generateVoiceFromSegments,
  normalizeVoiceSettings,
  validateVoiceSegments,
} from "./edge-tts";

const segments = [
  { id: 0, start: 0, end: 1.2, text: "Xin chào mọi người." },
  { id: 1, start: 2, end: 3.4, text: "Đây là bản lồng tiếng." },
];

class MockEdgeWebSocket {
  static sentMessages: string[] = [];
  static latestUrl = "";

  binaryType: BinaryType = "arraybuffer";
  readyState = 1;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string) {
    MockEdgeWebSocket.latestUrl = url;
    setTimeout(() => this.onopen?.(new Event("open")), 0);
  }

  send(data: string) {
    MockEdgeWebSocket.sentMessages.push(data);
    if (data.includes("Path:ssml")) {
      setTimeout(() => {
        this.onmessage?.({
          data: createAudioFrame(Buffer.from("audio-bytes")),
        } as MessageEvent);
        setTimeout(() => {
          this.onmessage?.({
            data: "X-RequestId:test\r\nPath:turn.end\r\n\r\n",
          } as MessageEvent);
        }, 0);
      }, 0);
    }
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

describe("Edge TTS voice generation", () => {
  it("builds chained atempo filters for large speed-up factors", () => {
    expect(buildAtempoFilterChain(1)).toBe("anull");
    expect(buildAtempoFilterChain(1.5)).toBe("atempo=1.5");
    expect(buildAtempoFilterChain(5)).toBe("atempo=2,atempo=2,atempo=1.25");
  });

  it("normalizes voice settings and rejects unsupported output formats", () => {
    expect(
      normalizeVoiceSettings({
        voice: "vi-VN-NamMinhNeural",
        rate: 150,
        pitch: -125,
        volume: 10,
        outputFormat: "audio-24khz-96kbitrate-mono-mp3",
        preserveTimestampGaps: false,
      }),
    ).toMatchObject({
      voice: "vi-VN-NamMinhNeural",
      rate: 100,
      pitch: -100,
      volume: 10,
      preserveTimestampGaps: false,
    });

    expect(() =>
      normalizeVoiceSettings({
        outputFormat: "riff-24khz-16bit-mono-pcm",
      }),
    ).toThrow("Unsupported Edge-TTS output format");
  });

  it("rejects empty voice segments", () => {
    expect(() => validateVoiceSegments([])).toThrow(
      "At least one translated transcript segment",
    );
  });

  it("builds SSML with voice, prosody, escaped text, and timestamp gap breaks", () => {
    const ssml = buildEdgeTtsSsml({
      segments: [
        { id: 0, start: 0, end: 1, text: "A & B\u000bẩn\uD800\uFDD0" },
        { id: 1, start: 2.25, end: 3, text: "Tiếp theo" },
      ],
      settings: normalizeVoiceSettings({
        voice: "vi-VN-NamMinhNeural",
        rate: 15,
        pitch: -5,
        volume: 20,
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        preserveTimestampGaps: true,
      }),
    });

    expect(ssml).toContain(
      'voice name="Microsoft Server Speech Text to Speech Voice (vi-VN, NamMinhNeural)"',
    );
    expect(ssml).toContain('rate="+15%"');
    expect(ssml).toContain('pitch="-5Hz"');
    expect(ssml).toContain('volume="+20%"');
    expect(ssml).toContain("A &amp; B ẩn");
    expect(ssml).not.toContain("\u000b");
    expect(ssml).not.toContain("\uD800");
    expect(ssml).not.toContain("\uFDD0");
    expect(ssml).not.toContain("<break");
    expect(ssml).toContain("A &amp; B ẩn Tiếp theo");
  });

  it("synthesizes segments through Edge websocket protocol", async () => {
    MockEdgeWebSocket.sentMessages = [];
    const result = await generateVoiceFromSegments({
      segments,
      settings: {
        voice: "vi-VN-HoaiMyNeural",
        rate: 0,
        pitch: 0,
        volume: 0,
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        preserveTimestampGaps: false,
      },
      WebSocketImpl: MockEdgeWebSocket,
      timeoutMs: 1000,
    });

    expect(MockEdgeWebSocket.latestUrl).toContain("TrustedClientToken=");
    expect(MockEdgeWebSocket.latestUrl).toContain("Sec-MS-GEC=");
    expect(MockEdgeWebSocket.latestUrl).toContain("Sec-MS-GEC-Version=1-");
    expect(MockEdgeWebSocket.sentMessages[0]).toContain("Path:speech.config");
    expect(MockEdgeWebSocket.sentMessages[0]).toContain(
      "audio-24khz-48kbitrate-mono-mp3",
    );
    expect(MockEdgeWebSocket.sentMessages[1]).toContain("Path:ssml");
    expect(MockEdgeWebSocket.sentMessages[1]).toContain("Xin chào mọi người.");
    expect(result).toMatchObject({
      mimeType: "audio/mpeg",
      extension: "mp3",
      byteLength: "audio-bytes".length,
      segmentCount: 2,
      alignment: { mode: "natural", chunks: 1 },
      provider: { name: "edge-tts" },
    });
    expect(Buffer.from(result.audioBase64, "base64").toString()).toBe(
      "audio-bytes",
    );
  });

  it("splits long inputs into multiple Edge websocket synthesis requests", async () => {
    MockEdgeWebSocket.sentMessages = [];
    const longSegments = Array.from({ length: 45 }, (_, index) => ({
      id: index,
      start: index,
      end: index + 0.5,
      text: `Câu thoại số ${index}.`,
    }));

    const result = await generateVoiceFromSegments({
      segments: longSegments,
      settings: {
        voice: "vi-VN-HoaiMyNeural",
        rate: 0,
        pitch: 0,
        volume: 0,
        outputFormat: "audio-24khz-48kbitrate-mono-mp3",
        preserveTimestampGaps: false,
      },
      WebSocketImpl: MockEdgeWebSocket,
      timeoutMs: 1000,
    });

    const ssmlMessages = MockEdgeWebSocket.sentMessages.filter((message) =>
      message.includes("Path:ssml"),
    );
    expect(ssmlMessages).toHaveLength(3);
    expect(result.segmentCount).toBe(45);
    expect(Buffer.from(result.audioBase64, "base64").toString()).toBe(
      "audio-bytesaudio-bytesaudio-bytes",
    );
  });
});
