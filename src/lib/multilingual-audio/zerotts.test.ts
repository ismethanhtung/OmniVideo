import { describe, expect, it } from "vitest";

import {
  checkDaemonHealthy,
  checkZeroTtsEnvironment,
  generateZeroTtsSpeech,
  normalizeZeroTtsText,
  resolvePythonExecutable,
  shutdownZeroTtsDaemon,
  ZeroTtsError,
} from "./zerotts";

describe("ZeroTTS service", () => {
  it("resolves python executable path without throwing", () => {
    const pythonBin = resolvePythonExecutable();
    expect(pythonBin).toBeDefined();
    expect(typeof pythonBin).toBe("string");
    expect(pythonBin.length).toBeGreaterThan(0);
  });

  it("exposes shutdownZeroTtsDaemon and checkDaemonHealthy helpers", () => {
    expect(typeof shutdownZeroTtsDaemon).toBe("function");
    expect(typeof checkDaemonHealthy).toBe("function");
  });

  it("checks environment status returning preset voices and info", async () => {
    const env = await checkZeroTtsEnvironment();
    expect(env).toBeDefined();
    expect(Array.isArray(env.presetVoices)).toBe(true);
    expect(env.presetVoices.length).toBeGreaterThanOrEqual(1);
    expect(env.presetVoices.some((v) => v.id === "maichi")).toBe(true);
  });

  it("normalizes Vietnamese numbers, currency, and dates", async () => {
    const raw = "Ngày 23/8/2024 lúc 15h30, giá 1.250.000đ, giảm 50%";
    const normalized = await normalizeZeroTtsText(raw);
    expect(normalized).toBeDefined();
    expect(normalized).toContain("tháng tám");
    expect(normalized).toContain("năm hai nghìn");
    expect(normalized).toContain("phần trăm");
  });

  it("throws validation error for empty text", async () => {
    await expect(generateZeroTtsSpeech({ text: "" })).rejects.toThrow(ZeroTtsError);
    await expect(generateZeroTtsSpeech({ text: "   " })).rejects.toMatchObject({
      code: "ZERO_TTS_EMPTY_TEXT",
      status: 400,
    });
  });

  it("generates speech audio WAV successfully with valid text and respects cfgScale 1.0", async () => {
    const res = await generateZeroTtsSpeech({
      text: "Xin chào bạn, đây là thử nghiệm giọng nói ZeroTTS.",
      voice: "maichi",
      speed: 1.0,
      cfgScale: 1.0,
      normalizeVi: true,
    });

    expect(res).toBeDefined();
    expect(res.mimeType).toBe("audio/wav");
    expect(res.extension).toBe("wav");
    expect(typeof res.audioBase64).toBe("string");
    expect(res.audioBase64.length).toBeGreaterThan(100);
    expect(res.byteLength).toBeGreaterThan(1000);
    expect(res.durationMs).toBeGreaterThan(500);
    expect(res.sampleRate).toBe(48000);
    expect(res.cfgScale).toBe(1.0);
    expect(res.segmentCount).toBeGreaterThanOrEqual(1);
  }, 45000);

  it("checks daemon status and supports graceful shutdown", async () => {
    const isHealthy = await checkDaemonHealthy();
    if (isHealthy) {
      const shutdownOk = await shutdownZeroTtsDaemon();
      expect(shutdownOk).toBe(true);
    }
  });
});
