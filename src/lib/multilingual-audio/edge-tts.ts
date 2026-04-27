import { createHash, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { connect, type TLSSocket } from "node:tls";

import {
  ChineseTranscriptionError,
  DEFAULT_EDGE_TTS_SETTINGS,
  EDGE_TTS_OUTPUT_FORMATS,
  type VoiceGenerationResult,
  type VoiceGenerationSegment,
  type VoiceGenerationSettings,
} from "./types";
import { resolveFfmpegPath } from "./audio-extraction";

const EDGE_TTS_TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const EDGE_CHROMIUM_FULL_VERSION = "143.0.3650.75";
const EDGE_CHROMIUM_MAJOR_VERSION = EDGE_CHROMIUM_FULL_VERSION.split(".")[0];
const EDGE_TTS_SEC_MS_GEC_VERSION = `1-${EDGE_CHROMIUM_FULL_VERSION}`;
const EDGE_TTS_ORIGIN = "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold";
const EDGE_TTS_USER_AGENT =
  `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ` +
  `(KHTML, like Gecko) Chrome/${EDGE_CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 ` +
  `Edg/${EDGE_CHROMIUM_MAJOR_VERSION}.0.0.0`;
const EDGE_TTS_ENDPOINT =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const MAX_SEGMENTS = 240;
const MAX_TEXT_CHARS = 20000;
const MAX_SEGMENTS_PER_SYNTHESIS_CHUNK = 20;
const MAX_TEXT_CHARS_PER_SYNTHESIS_CHUNK = 1800;
const DEFAULT_TIMEOUT_MS = 60000;
const WINDOWS_EPOCH_SECONDS = 11644473600;

type EdgeWebSocketLike = {
  binaryType: BinaryType;
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: ((event: Event) => void) | null;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onclose: ((event: CloseEvent) => void) | null;
};

type EdgeWebSocketConstructor = new (
  url: string,
  protocols?: string | string[],
) => EdgeWebSocketLike;

let edgeTtsWebSocketOverride: EdgeWebSocketConstructor | null = null;

export function setEdgeTtsWebSocketConstructorForTest(
  WebSocketImpl: EdgeWebSocketConstructor | null,
) {
  edgeTtsWebSocketOverride = WebSocketImpl;
}

const enum WebSocketReadyState {
  Connecting = 0,
  Open = 1,
  Closing = 2,
  Closed = 3,
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getOutputFormat(format: string) {
  return EDGE_TTS_OUTPUT_FORMATS.find((entry) => entry.id === format);
}

function getOutputBitrateKbps(format: string) {
  const match = /(\d+)kbitrate/u.exec(format);
  return match ? Number(match[1]) : 48;
}

function xmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function toEdgeVoiceName(voice: string) {
  if (/^Microsoft Server Speech Text to Speech Voice \(.+,.+\)$/.test(voice)) {
    return voice;
  }

  const match = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(voice);
  if (!match) return voice;

  const [, language, region, rawName] = match;
  let normalizedRegion = region;
  let name = rawName;
  const nameRegionSeparator = rawName.indexOf("-");
  if (nameRegionSeparator !== -1) {
    normalizedRegion = `${region}-${rawName.slice(0, nameRegionSeparator)}`;
    name = rawName.slice(nameRegionSeparator + 1);
  }

  return `Microsoft Server Speech Text to Speech Voice (${language}-${normalizedRegion}, ${name})`;
}

function formatProsodyPercent(value: number) {
  const normalized = clampInteger(value, -100, 100);
  if (normalized === 0) return "+0%";
  return normalized > 0 ? `+${normalized}%` : `${normalized}%`;
}

function formatProsodyPitchHz(value: number) {
  const normalized = clampInteger(value, -100, 100);
  if (normalized === 0) return "+0Hz";
  return normalized > 0 ? `+${normalized}Hz` : `${normalized}Hz`;
}

function formatBreakMs(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 0;
  return Math.min(10000, Math.round(seconds * 1000));
}

function removeIncompatibleCharacters(value: string) {
  return Array.from(value)
    .map((character) => {
      const code = character.codePointAt(0) ?? 0;
      const isControl =
        (code >= 0 && code <= 8) ||
        (code >= 11 && code <= 12) ||
        (code >= 14 && code <= 31);
      const isSurrogate = code >= 0xd800 && code <= 0xdfff;
      const isNonCharacter =
        (code >= 0xfdd0 && code <= 0xfdef) ||
        (code & 0xfffe) === 0xfffe;
      const isOutOfXmlRange = code > 0x10ffff;
      if (isControl || isSurrogate || isNonCharacter || isOutOfXmlRange) {
        return " ";
      }
      return character;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function segmentText(segment: VoiceGenerationSegment) {
  return removeIncompatibleCharacters(segment.text);
}

function normalizeVoiceSegments(segments: VoiceGenerationSegment[]) {
  return segments
    .map((segment) => ({ ...segment, text: segmentText(segment) }))
    .filter((segment) => segment.text)
    .toSorted((left, right) => left.start - right.start || left.id - right.id);
}

function splitVoiceSegmentsForSynthesis(segments: VoiceGenerationSegment[]) {
  const chunks: VoiceGenerationSegment[][] = [];
  let current: VoiceGenerationSegment[] = [];
  let currentChars = 0;

  for (const segment of segments) {
    const nextChars = segment.text.length;
    if (
      current.length > 0 &&
      (current.length >= MAX_SEGMENTS_PER_SYNTHESIS_CHUNK ||
        currentChars + nextChars > MAX_TEXT_CHARS_PER_SYNTHESIS_CHUNK)
    ) {
      chunks.push(current);
      current = [];
      currentChars = 0;
    }
    current.push(segment);
    currentChars += nextChars;
  }

  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks;
}

export function buildAtempoFilterChain(speedFactor: number) {
  if (!Number.isFinite(speedFactor) || speedFactor <= 1.0001) {
    return "anull";
  }

  const filters: string[] = [];
  let remaining = speedFactor;
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  filters.push(`atempo=${remaining.toFixed(4).replace(/0+$/u, "").replace(/\.$/u, "")}`);
  return filters.join(",");
}

function segmentDuration(segment: VoiceGenerationSegment) {
  if (!Number.isFinite(segment.start) || !Number.isFinite(segment.end)) {
    return 0;
  }
  return Math.max(0, segment.end - segment.start);
}

export function normalizeVoiceSettings(
  settings?: Partial<VoiceGenerationSettings>,
): VoiceGenerationSettings {
  const outputFormat =
    settings?.outputFormat ?? DEFAULT_EDGE_TTS_SETTINGS.outputFormat;

  if (!getOutputFormat(outputFormat)) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_CONFIG_INVALID",
      `Unsupported Edge-TTS output format: ${outputFormat}.`,
      400,
    );
  }

  return {
    voice: settings?.voice?.trim() || DEFAULT_EDGE_TTS_SETTINGS.voice,
    rate: clampInteger(settings?.rate ?? DEFAULT_EDGE_TTS_SETTINGS.rate, -100, 100),
    pitch: clampInteger(
      settings?.pitch ?? DEFAULT_EDGE_TTS_SETTINGS.pitch,
      -100,
      100,
    ),
    volume: clampInteger(
      settings?.volume ?? DEFAULT_EDGE_TTS_SETTINGS.volume,
      -100,
      100,
    ),
    outputFormat,
    preserveTimestampGaps:
      settings?.preserveTimestampGaps ??
      DEFAULT_EDGE_TTS_SETTINGS.preserveTimestampGaps,
  };
}

export function validateVoiceSegments(segments: VoiceGenerationSegment[]) {
  if (!Array.isArray(segments) || segments.length === 0) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_SEGMENTS_REQUIRED",
      "At least one translated transcript segment is required for voice generation.",
      400,
    );
  }

  const nonEmptySegments = normalizeVoiceSegments(segments);
  if (nonEmptySegments.length === 0) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_SEGMENTS_REQUIRED",
      "At least one translated transcript segment with text is required for voice generation.",
      400,
    );
  }

  if (nonEmptySegments.length > MAX_SEGMENTS) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_CONFIG_INVALID",
      `Edge-TTS voice generation supports up to ${MAX_SEGMENTS} non-empty segments per request.`,
      400,
    );
  }

  const totalChars = nonEmptySegments.reduce(
    (sum, segment) => sum + segmentText(segment).length,
    0,
  );
  if (totalChars > MAX_TEXT_CHARS) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_CONFIG_INVALID",
      `Edge-TTS voice generation supports up to ${MAX_TEXT_CHARS} text characters per request.`,
      400,
    );
  }
}

export function buildEdgeTtsSsml(input: {
  segments: VoiceGenerationSegment[];
  settings: VoiceGenerationSettings;
}) {
  const orderedSegments = normalizeVoiceSegments(input.segments);

  let previousEnd = 0;
  const parts: string[] = [];

  for (const segment of orderedSegments) {
    const gap = formatBreakMs(segment.start - previousEnd);
    if (parts.length > 0) {
      parts.push(gap > 0 && input.settings.preserveTimestampGaps ? " " : " ");
    }
    parts.push(xmlEscape(segment.text.trim()));
    previousEnd = Number.isFinite(segment.end) ? Math.max(previousEnd, segment.end) : previousEnd;
  }

  return [
    '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="vi-VN">',
    `<voice name="${xmlEscape(toEdgeVoiceName(input.settings.voice))}">`,
    `<prosody rate="${formatProsodyPercent(input.settings.rate)}" pitch="${formatProsodyPitchHz(
      input.settings.pitch,
    )}" volume="${formatProsodyPercent(input.settings.volume)}">`,
    parts.join(""),
    "</prosody>",
    "</voice>",
    "</speak>",
  ].join("");
}

function createConnectionId() {
  return crypto.randomUUID().replaceAll("-", "");
}

function timestamp() {
  const date = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${weekdays[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${String(
    date.getUTCDate(),
  ).padStart(2, "0")} ${date.getUTCFullYear()} ${String(
    date.getUTCHours(),
  ).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}:${String(
    date.getUTCSeconds(),
  ).padStart(2, "0")} GMT+0000 (Coordinated Universal Time)`;
}

function generateSecMsGec(date = new Date()) {
  let ticks = date.getTime() / 1000 + WINDOWS_EPOCH_SECONDS;
  ticks -= ticks % 300;
  ticks *= 10_000_000;
  return createHash("sha256")
    .update(`${ticks.toFixed(0)}${EDGE_TTS_TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

function generateMuid() {
  return randomBytes(16).toString("hex").toUpperCase();
}

function buildMessage(headers: Record<string, string>, body: string) {
  const headerText = Object.entries(headers)
    .map(([key, value]) => `${key}:${value}`)
    .join("\r\n");
  return `${headerText}\r\n\r\n${body}`;
}

async function messageDataToBuffer(data: MessageEvent["data"]): Promise<Buffer> {
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  if (ArrayBuffer.isView(data)) {
    return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof Blob) {
    return Buffer.from(await data.arrayBuffer());
  }
  return Buffer.from(String(data));
}

function readTextMessage(data: MessageEvent["data"]) {
  return typeof data === "string" ? data : null;
}

function extractAudioPayload(buffer: Buffer) {
  if (buffer.length < 2) return null;
  const headerLength = buffer.readUInt16BE(0);
  const payloadOffset = 2 + headerLength;
  if (payloadOffset > buffer.length) return null;
  const headerText = buffer.subarray(2, payloadOffset).toString("utf8");
  if (!/Path:audio/i.test(headerText)) return null;
  return buffer.subarray(payloadOffset);
}

function runFfmpeg(args: string[]) {
  return new Promise<{ stderr: string }>((resolve, reject) => {
    let ffmpegPath: string;
    try {
      ffmpegPath = resolveFfmpegPath();
    } catch (error) {
      reject(error);
      return;
    }

    const child = spawn(ffmpegPath, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stderr });
        return;
      }
      reject(new Error(stderr.trim() || `ffmpeg exited with code ${code}`));
    });
  });
}

function parseFfmpegDuration(stderr: string) {
  const match = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/u.exec(stderr);
  if (!match) return 0;
  return (
    Number(match[1]) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3])
  );
}

async function probeAudioDuration(filePath: string) {
  const { stderr } = await runFfmpeg(["-hide_banner", "-i", filePath, "-f", "null", "-"]);
  return parseFfmpegDuration(stderr);
}

async function alignVoiceAudioToTimeline(input: {
  segments: VoiceGenerationSegment[];
  audioBySegmentId: Map<number, Buffer>;
  bitrateKbps: number;
}) {
  const workDir = path.join(tmpdir(), `omnivideo-tts-align-${crypto.randomUUID()}`);
  const concatListPath = path.join(workDir, "concat.txt");

  try {
    await mkdir(workDir, { recursive: true });
    const concatPaths: string[] = [];
    let cursor = 0;

    for (const segment of input.segments) {
      const duration = segmentDuration(segment);
      if (duration <= 0) continue;

      const gap = Math.max(0, segment.start - cursor);
      if (gap > 0.01) {
        const silencePath = path.join(workDir, `silence-${segment.id}.mp3`);
        await runFfmpeg([
          "-y",
          "-f",
          "lavfi",
          "-i",
          "anullsrc=r=24000:cl=mono",
          "-t",
          gap.toFixed(3),
          "-c:a",
          "libmp3lame",
          "-b:a",
          `${input.bitrateKbps}k`,
          silencePath,
        ]);
        concatPaths.push(silencePath);
      }

      const rawPath = path.join(workDir, `segment-${segment.id}-raw.mp3`);
      const alignedPath = path.join(workDir, `segment-${segment.id}-aligned.mp3`);
      const audio = input.audioBySegmentId.get(segment.id);
      if (!audio) continue;
      await writeFile(rawPath, audio);

      const rawDuration = await probeAudioDuration(rawPath);
      const speedFactor = rawDuration > duration ? rawDuration / duration : 1;
      const tempoFilter = buildAtempoFilterChain(speedFactor);
      await runFfmpeg([
        "-y",
        "-i",
        rawPath,
        "-af",
        `${tempoFilter},apad,atrim=0:${duration.toFixed(3)},asetpts=PTS-STARTPTS`,
        "-ac",
        "1",
        "-ar",
        "24000",
        "-c:a",
        "libmp3lame",
        "-b:a",
        `${input.bitrateKbps}k`,
        alignedPath,
      ]);
      concatPaths.push(alignedPath);
      cursor = Math.max(cursor, segment.end);
    }

    const concatList = concatPaths
      .map((filePath) => `file '${filePath.replaceAll("'", "'\\''")}'`)
      .join("\n");
    await writeFile(concatListPath, concatList);

    const outputPath = path.join(workDir, "voice-timeline.mp3");
    await runFfmpeg([
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatListPath,
      "-c",
      "copy",
      outputPath,
    ]);

    return await readFile(outputPath);
  } catch (error) {
    throw new ChineseTranscriptionError(
      "PRV_EDGE_TTS_FAILED",
      error instanceof Error
        ? `Edge-TTS timeline alignment failed: ${error.message}`
        : "Edge-TTS timeline alignment failed.",
      500,
    );
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

function encodeWebSocketTextFrame(value: string) {
  const payload = Buffer.from(value, "utf8");
  const mask = randomBytes(4);
  const header =
    payload.length < 126
      ? Buffer.from([0x81, 0x80 | payload.length])
      : payload.length <= 0xffff
        ? Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
        : (() => {
            const frameHeader = Buffer.alloc(10);
            frameHeader[0] = 0x81;
            frameHeader[1] = 0x80 | 127;
            frameHeader.writeBigUInt64BE(BigInt(payload.length), 2);
            return frameHeader;
          })();
  const maskedPayload = Buffer.alloc(payload.length);
  for (let index = 0; index < payload.length; index += 1) {
    maskedPayload[index] = payload[index] ^ mask[index % 4];
  }
  return Buffer.concat([header, mask, maskedPayload]);
}

class EdgeTtsRawWebSocket implements EdgeWebSocketLike {
  binaryType: BinaryType = "arraybuffer";
  readyState = WebSocketReadyState.Connecting;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private socket: TLSSocket | null = null;
  private handshakeBuffer = Buffer.alloc(0);
  private frameBuffer = Buffer.alloc(0);
  private handshakeComplete = false;

  constructor(private readonly url: string) {
    this.connect();
  }

  send(data: string) {
    if (this.readyState !== WebSocketReadyState.Open || !this.socket) {
      this.emitError("Edge-TTS websocket send attempted before open.");
      return;
    }
    this.socket.write(encodeWebSocketTextFrame(data));
  }

  close() {
    if (this.readyState === WebSocketReadyState.Closed) return;
    this.readyState = WebSocketReadyState.Closing;
    this.socket?.end();
    this.emitClose(1000, "closed");
  }

  private connect() {
    const parsed = new URL(this.url);
    const key = randomBytes(16).toString("base64");
    this.socket = connect(
      {
        host: parsed.hostname,
        port: Number(parsed.port || 443),
        servername: parsed.hostname,
        ALPNProtocols: ["http/1.1"],
      },
      () => {
        const headers = [
          `GET ${parsed.pathname}${parsed.search} HTTP/1.1`,
          `Host: ${parsed.hostname}`,
          "Upgrade: websocket",
          "Connection: Upgrade",
          "Pragma: no-cache",
          "Cache-Control: no-cache",
          `Origin: ${EDGE_TTS_ORIGIN}`,
          `Sec-WebSocket-Key: ${key}`,
          "Sec-WebSocket-Version: 13",
          `User-Agent: ${EDGE_TTS_USER_AGENT}`,
          "Accept-Encoding: gzip, deflate, br, zstd",
          "Accept-Language: en-US,en;q=0.9",
          `Cookie: muid=${generateMuid()};`,
          "\r\n",
        ];
        this.socket?.write(headers.join("\r\n"));
      },
    );

    this.socket.on("data", (chunk) => this.handleData(chunk));
    this.socket.on("error", (error) => this.emitError(error.message));
    this.socket.on("end", () => this.emitClose(1000, "remote end"));
    this.socket.on("close", () => this.emitClose(1000, "remote close"));
  }

  private handleData(chunk: Buffer) {
    if (!this.handshakeComplete) {
      this.handshakeBuffer = Buffer.concat([this.handshakeBuffer, chunk]);
      const headerEnd = this.handshakeBuffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) return;

      const headerText = this.handshakeBuffer.subarray(0, headerEnd).toString("utf8");
      const remaining = this.handshakeBuffer.subarray(headerEnd + 4);
      this.handshakeBuffer = Buffer.alloc(0);

      if (!/^HTTP\/1\.1 101\b/.test(headerText)) {
        const statusLine = headerText.split("\r\n")[0] || "unknown status";
        this.emitError(`Edge-TTS websocket upgrade failed: ${statusLine}.`);
        this.emitClose(1006, statusLine);
        return;
      }

      this.handshakeComplete = true;
      this.readyState = WebSocketReadyState.Open;
      this.onopen?.(new Event("open"));
      if (remaining.length > 0) {
        this.handleFrameData(remaining);
      }
      return;
    }

    this.handleFrameData(chunk);
  }

  private handleFrameData(chunk: Buffer) {
    this.frameBuffer = Buffer.concat([this.frameBuffer, chunk]);

    while (this.frameBuffer.length >= 2) {
      const first = this.frameBuffer[0];
      const second = this.frameBuffer[1];
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let payloadLength = second & 0x7f;
      let offset = 2;

      if (payloadLength === 126) {
        if (this.frameBuffer.length < offset + 2) return;
        payloadLength = this.frameBuffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (this.frameBuffer.length < offset + 8) return;
        const length = this.frameBuffer.readBigUInt64BE(offset);
        if (length > BigInt(Number.MAX_SAFE_INTEGER)) {
          this.emitError("Edge-TTS websocket frame is too large.");
          return;
        }
        payloadLength = Number(length);
        offset += 8;
      }

      const maskOffset = masked ? 4 : 0;
      if (this.frameBuffer.length < offset + maskOffset + payloadLength) return;

      const mask = masked ? this.frameBuffer.subarray(offset, offset + 4) : null;
      offset += maskOffset;
      let payload = this.frameBuffer.subarray(offset, offset + payloadLength);
      this.frameBuffer = this.frameBuffer.subarray(offset + payloadLength);

      if (mask) {
        const unmasked = Buffer.alloc(payload.length);
        for (let index = 0; index < payload.length; index += 1) {
          unmasked[index] = payload[index] ^ mask[index % 4];
        }
        payload = unmasked;
      }

      if (opcode === 0x1) {
        this.onmessage?.({ data: payload.toString("utf8") } as MessageEvent);
      } else if (opcode === 0x2) {
        const data = payload.buffer.slice(
          payload.byteOffset,
          payload.byteOffset + payload.byteLength,
        );
        this.onmessage?.({ data } as MessageEvent);
      } else if (opcode === 0x8) {
        const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000;
        const reason =
          payload.length > 2 ? payload.subarray(2).toString("utf8") : "remote close frame";
        this.emitClose(code, reason || "remote close frame");
        return;
      } else if (opcode === 0x9) {
        this.socket?.write(Buffer.from([0x8a, 0x00]));
      }
    }
  }

  private emitError(message: string) {
    if (this.readyState === WebSocketReadyState.Closed) return;
    this.onerror?.({ type: "error", message } as Event & { message: string });
  }

  private emitClose(code: number, reason: string) {
    if (this.readyState === WebSocketReadyState.Closed) return;
    this.readyState = WebSocketReadyState.Closed;
    this.onclose?.({ code, reason } as CloseEvent);
  }
}

async function synthesizeWithEdgeWebSocket(input: {
  ssml: string;
  settings: VoiceGenerationSettings;
  connectionId: string;
  timeoutMs: number;
  WebSocketImpl: EdgeWebSocketConstructor;
}) {
  const url = `${EDGE_TTS_ENDPOINT}?TrustedClientToken=${EDGE_TTS_TRUSTED_CLIENT_TOKEN}&ConnectionId=${input.connectionId}&Sec-MS-GEC=${generateSecMsGec()}&Sec-MS-GEC-Version=${EDGE_TTS_SEC_MS_GEC_VERSION}`;

  return await new Promise<Buffer>((resolve, reject) => {
    const audioChunks: Buffer[] = [];
    const textEvents: string[] = [];
    let settled = false;
    const socket = new input.WebSocketImpl(url);
    socket.binaryType = "arraybuffer";

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      finish(() => {
        socket.close();
        reject(
          new ChineseTranscriptionError(
            "PRV_EDGE_TTS_FAILED",
            "Edge-TTS request timed out.",
            504,
          ),
        );
      });
    }, input.timeoutMs);

    socket.onopen = () => {
      socket.send(
        buildMessage(
          {
            "X-Timestamp": timestamp(),
            "Content-Type": "application/json; charset=utf-8",
            Path: "speech.config",
          },
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: input.settings.outputFormat,
                },
              },
            },
          }) + "\r\n",
        ),
      );

      socket.send(
        buildMessage(
          {
            "X-RequestId": createConnectionId(),
            "X-Timestamp": `${timestamp()}Z`,
            "Content-Type": "application/ssml+xml",
            Path: "ssml",
          },
          input.ssml,
        ),
      );
    };

    socket.onerror = (event) => {
      finish(() => {
        socket.close();
        const detail =
          "message" in event && typeof event.message === "string"
            ? ` ${event.message}`
            : "";
        reject(
          new ChineseTranscriptionError(
            "PRV_EDGE_TTS_FAILED",
            `Edge-TTS websocket failed.${detail}`,
            502,
          ),
        );
      });
    };

    socket.onclose = (event) => {
      finish(() => {
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
          return;
        }
        const detail =
          event.reason || event.code
            ? ` Code: ${event.code || "n/a"}. Reason: ${event.reason || "n/a"}.`
            : "";
        reject(
          new ChineseTranscriptionError(
            "PRV_EDGE_TTS_FAILED",
            `Edge-TTS websocket closed without audio.${detail}`,
            502,
          ),
        );
      });
    };

    socket.onmessage = async (event) => {
      const text = readTextMessage(event.data);
      if (text?.includes("Path:turn.end")) {
        finish(() => {
          socket.close();
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
            return;
          }
          reject(
            new ChineseTranscriptionError(
              "PRV_EDGE_TTS_FAILED",
              textEvents.length > 0
                ? `Edge-TTS completed without audio. Provider events: ${textEvents.join(" | ").slice(0, 500)}`
                : "Edge-TTS completed without audio.",
              502,
            ),
          );
        });
        return;
      }

      if (text?.includes("Path:response") && text.includes("error")) {
        finish(() => {
          reject(
            new ChineseTranscriptionError(
              "PRV_EDGE_TTS_FAILED",
              "Edge-TTS provider returned an error response.",
              502,
            ),
          );
        });
        return;
      }

      if (text !== null) {
        textEvents.push(text.replace(/\s+/g, " ").slice(0, 180));
        return;
      }

      const buffer = await messageDataToBuffer(event.data);
      const audio = extractAudioPayload(buffer);
      if (audio && audio.length > 0) {
        audioChunks.push(audio);
      }
    };
  });
}

export async function generateVoiceFromSegments(input: {
  segments: VoiceGenerationSegment[];
  settings?: Partial<VoiceGenerationSettings>;
  timeoutMs?: number;
  WebSocketImpl?: EdgeWebSocketConstructor;
}): Promise<VoiceGenerationResult> {
  validateVoiceSegments(input.segments);
  const settings = normalizeVoiceSettings(input.settings);
  const format = getOutputFormat(settings.outputFormat);
  if (!format) {
    throw new ChineseTranscriptionError(
      "VAL_TTS_CONFIG_INVALID",
      `Unsupported Edge-TTS output format: ${settings.outputFormat}.`,
      400,
    );
  }

  if (settings.preserveTimestampGaps && format.extension !== "mp3") {
    throw new ChineseTranscriptionError(
      "VAL_TTS_CONFIG_INVALID",
      "Timeline-aligned Edge-TTS output currently supports MP3 formats only.",
      400,
    );
  }

  const WebSocketImpl =
    input.WebSocketImpl ??
    edgeTtsWebSocketOverride ??
    (EdgeTtsRawWebSocket as EdgeWebSocketConstructor | undefined);
  if (!WebSocketImpl) {
    throw new ChineseTranscriptionError(
      "PRV_EDGE_TTS_FAILED",
      "WebSocket runtime is not available for Edge-TTS.",
      500,
    );
  }

  const connectionId = createConnectionId();
  const normalizedSegments = normalizeVoiceSegments(input.segments);
  let audioBuffer: Buffer;
  let chunkCount = 0;
  const timelineMode = settings.preserveTimestampGaps;

  if (timelineMode) {
    const audioBySegmentId = new Map<number, Buffer>();
    for (const [index, segment] of normalizedSegments.entries()) {
      const ssml = buildEdgeTtsSsml({ segments: [segment], settings });
      audioBySegmentId.set(
        segment.id,
        await synthesizeWithEdgeWebSocket({
          ssml,
          settings,
          connectionId: `${connectionId}${String(index).padStart(3, "0")}`,
          timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          WebSocketImpl,
        }),
      );
      chunkCount += 1;
    }
    audioBuffer = await alignVoiceAudioToTimeline({
      segments: normalizedSegments,
      audioBySegmentId,
      bitrateKbps: getOutputBitrateKbps(settings.outputFormat),
    });
  } else {
    const segmentChunks = splitVoiceSegmentsForSynthesis(normalizedSegments);
    const audioChunks: Buffer[] = [];

    for (const [index, segmentChunk] of segmentChunks.entries()) {
      const ssml = buildEdgeTtsSsml({ segments: segmentChunk, settings });
      audioChunks.push(
        await synthesizeWithEdgeWebSocket({
          ssml,
          settings,
          connectionId: `${connectionId}${String(index).padStart(2, "0")}`,
          timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
          WebSocketImpl,
        }),
      );
    }
    chunkCount = segmentChunks.length;
    audioBuffer = Buffer.concat(audioChunks);
  }

  return {
    audioBase64: audioBuffer.toString("base64"),
    mimeType: format.mimeType,
    extension: format.extension,
    fileName: `omnivideo-voice-${connectionId.slice(0, 8)}.${format.extension}`,
    byteLength: audioBuffer.byteLength,
    segmentCount: normalizedSegments.length,
    alignment: {
      mode: timelineMode ? "timeline" : "natural",
      targetDurationSeconds: timelineMode
        ? Math.max(...normalizedSegments.map((segment) => segment.end))
        : undefined,
      chunks: chunkCount,
    },
    settings,
    provider: {
      name: "edge-tts",
      connectionId,
    },
  };
}
