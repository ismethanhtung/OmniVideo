import { describe, expect, it, vi } from "vitest";

import {
    DEFAULT_VIP_SOURCE_VOCAL_ISOLATION_MODEL,
    normalizeVipOriginalAudioSourceMode,
    runReplicateSpleeterVocalsIsolation,
    selectReplicateVocalsUrl,
} from "./source-vocal-isolation";

describe("VIP source vocal isolation", () => {
    it("normalizes unknown original audio source modes to full source audio", () => {
        expect(normalizeVipOriginalAudioSourceMode("vocals")).toBe("vocals");
        expect(normalizeVipOriginalAudioSourceMode("source")).toBe("source");
        expect(normalizeVipOriginalAudioSourceMode("music")).toBe("source");
        expect(normalizeVipOriginalAudioSourceMode(undefined)).toBe("source");
    });

    it("selects the vocals stem from Replicate Spleeter output", () => {
        expect(
            selectReplicateVocalsUrl({
                accompaniment:
                    "https://replicate.delivery/output/accompaniment.wav",
                vocals: "https://replicate.delivery/output/vocals.wav",
            }),
        ).toBe("https://replicate.delivery/output/vocals.wav");

        expect(
            selectReplicateVocalsUrl([
                "https://replicate.delivery/output/accompaniment.wav",
                "https://replicate.delivery/output/vocals.wav",
            ]),
        ).toBe("https://replicate.delivery/output/vocals.wav");
    });

    it("runs a Replicate prediction and downloads the vocals stem", async () => {
        const fetchImpl = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    id: "prediction-1",
                    status: "succeeded",
                    output: {
                        vocals: "https://replicate.delivery/output/vocals.wav",
                        accompaniment:
                            "https://replicate.delivery/output/accompaniment.wav",
                    },
                }),
            )
            .mockResolvedValueOnce(
                new Response(Buffer.from("vocals"), {
                    status: 200,
                    headers: { "Content-Type": "audio/wav" },
                }),
            );

        const result = await runReplicateSpleeterVocalsIsolation({
            audioBytes: Buffer.from("audio"),
            replicateToken: "token",
            fetchImpl,
        });

        expect(fetchImpl).toHaveBeenCalledTimes(2);
        const [, init] = fetchImpl.mock.calls[0];
        expect(init?.headers).toMatchObject({
            Authorization: "Bearer token",
            Prefer: "wait=60",
        });
        expect(JSON.parse(String(init?.body))).toMatchObject({
            version: DEFAULT_VIP_SOURCE_VOCAL_ISOLATION_MODEL.split(":")[1],
            input: {
                audio: expect.stringMatching(/^data:audio\/mpeg;base64,/u),
            },
        });
        expect(result.bytes.toString()).toBe("vocals");
        expect(result.mimeType).toBe("audio/wav");
        expect(result.fileName).toBe("vocals.wav");
    });

    it("fails clearly when Replicate token is missing", async () => {
        await expect(
            runReplicateSpleeterVocalsIsolation({
                audioBytes: Buffer.from("audio"),
                replicateToken: "",
                fetchImpl: vi.fn<typeof fetch>(),
            }),
        ).rejects.toMatchObject({
            code: "CFG_REPLICATE_TOKEN_MISSING",
            status: 400,
        });
    });
});
