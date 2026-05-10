import { describe, expect, it } from "vitest";

import {
  buildSpeechReadyFfmpegArgs,
  getFfmpegCandidates,
  parseFfmpegDurationSeconds,
  resolveFfmpegPath,
} from "./audio-extraction";

describe("audio extraction command", () => {
  it("builds ffmpeg args for compressed speech-ready mono 16k MP3", () => {
    expect(buildSpeechReadyFfmpegArgs("/tmp/in.mp4", "/tmp/out.mp3")).toEqual([
      "-y",
      "-i",
      "/tmp/in.mp4",
      "-vn",
      "-ac",
      "1",
      "-ar",
      "16000",
      "-map",
      "0:a:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "64k",
      "/tmp/out.mp3",
    ]);
  });

  it("prefers existing ffmpeg-static path", () => {
    expect(
      resolveFfmpegPath({
        staticPath: "/app/node_modules/ffmpeg-static/ffmpeg",
        fileExists: (candidate) =>
          candidate === "/app/node_modules/ffmpeg-static/ffmpeg",
      }),
    ).toBe("/app/node_modules/ffmpeg-static/ffmpeg");
  });

  it("falls back to cwd ffmpeg-static when imported static path is stale", () => {
    const cwdCandidate = getFfmpegCandidates("/ROOT/node_modules/ffmpeg-static/ffmpeg")[1];

    expect(
      resolveFfmpegPath({
        staticPath: "/ROOT/node_modules/ffmpeg-static/ffmpeg",
        fileExists: (candidate) => candidate === cwdCandidate,
      }),
    ).toBe(cwdCandidate);
  });

  it("falls back to ffmpeg in PATH when static candidates are missing", () => {
    expect(
      resolveFfmpegPath({
        staticPath: "/ROOT/node_modules/ffmpeg-static/ffmpeg",
        fileExists: () => false,
      }),
    ).toBe("ffmpeg");
  });

  it("parses ffmpeg duration from stderr", () => {
    expect(
      parseFfmpegDurationSeconds(
        "Input #0\n  Duration: 00:03:49.12, start: 0.000000",
      ),
    ).toBe(229.12);
  });
});
