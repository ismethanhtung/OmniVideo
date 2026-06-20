import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireWriteAccess } from "@/lib/access-control/route-guards";

import { GET, POST } from "./route";

vi.mock("@/lib/access-control/route-guards", () => ({
    requireWriteAccess: vi.fn(() => null),
}));

const mockedRequireWriteAccess = vi.mocked(requireWriteAccess);

describe("Replicate predictions sandbox route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        mockedRequireWriteAccess.mockReturnValue(null);
    });

    it("resolves owner/model refs to latest version and creates a prediction", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        latest_version: { id: "latest-version-id" },
                    }),
                    { status: 200 },
                ),
            )
            .mockResolvedValueOnce(
                new Response(
                    JSON.stringify({
                        id: "prediction-1",
                        status: "succeeded",
                        output: ["https://replicate.delivery/output.png"],
                    }),
                    { status: 201 },
                ),
            );
        vi.stubGlobal("fetch", fetchMock);
        vi.stubEnv("REPLICATE_API_TOKEN", "env-token");

        const formData = new FormData();
        formData.set("target", "prunaai/z-image-turbo");
        formData.set("mode", "auto");
        formData.set("inputJson", JSON.stringify({ prompt: "moon palace" }));
        formData.set("waitSeconds", "30");

        const response = await POST(
            new Request("http://localhost/api/replicate/predictions", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.resolved.version).toBe("latest-version-id");
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://api.replicate.com/v1/models/prunaai/z-image-turbo",
            expect.objectContaining({
                headers: { Authorization: "Bearer env-token" },
            }),
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "https://api.replicate.com/v1/predictions",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer env-token",
                    Prefer: "wait=30",
                }),
                body: JSON.stringify({
                    version: "latest-version-id",
                    input: { prompt: "moon palace" },
                }),
            }),
        );
    });

    it("inspects model schema and suggests likely file inputs", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    latest_version: {
                        id: "version-with-schema",
                        openapi_schema: {
                            components: {
                                schemas: {
                                    Input: {
                                        properties: {
                                            prompt: {
                                                type: "string",
                                                description: "Text prompt",
                                            },
                                            image: {
                                                type: "string",
                                                format: "uri",
                                                description:
                                                    "Reference image URL",
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                }),
                { status: 200 },
            ),
        );
        vi.stubGlobal("fetch", fetchMock);
        vi.stubEnv("REPLICATE_API_TOKEN", "env-token");

        const response = await GET(
            new Request(
                "http://localhost/api/replicate/predictions?target=owner/model&mode=auto",
            ),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(payload.data.version).toBe("version-with-schema");
        expect(payload.data.inputProperties).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    key: "prompt",
                    likelyFileInput: false,
                }),
                expect.objectContaining({
                    key: "image",
                    likelyFileInput: true,
                }),
            ]),
        );
        expect(payload.data.suggestedFileKeys).toEqual(["image"]);
    });

    it("injects uploaded files as data URLs into the selected input key", async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            new Response(
                JSON.stringify({
                    id: "prediction-2",
                    status: "succeeded",
                    output: "done",
                }),
                { status: 201 },
            ),
        );
        vi.stubGlobal("fetch", fetchMock);

        const formData = new FormData();
        formData.set("token", "manual-token");
        formData.set("target", "owner/model:version-id");
        formData.set("mode", "version");
        formData.set("inputJson", JSON.stringify({ prompt: "clean vocal" }));
        formData.set("fileInputKey", "audio");
        formData.set("waitSeconds", "5");
        formData.set(
            "inputFile",
            new File([Buffer.from("abc")], "voice.wav", {
                type: "audio/wav",
            }),
        );

        const response = await POST(
            new Request("http://localhost/api/replicate/predictions", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(200);
        expect(payload.ok).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://api.replicate.com/v1/predictions",
            expect.objectContaining({
                body: JSON.stringify({
                    version: "owner/model:version-id",
                    input: {
                        prompt: "clean vocal",
                        audio: "data:audio/wav;base64,YWJj",
                    },
                }),
            }),
        );
    });

    it("rejects invalid input JSON before contacting Replicate", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        vi.stubEnv("REPLICATE_API_TOKEN", "env-token");

        const formData = new FormData();
        formData.set("target", "owner/model");
        formData.set("inputJson", "[1,2,3]");

        const response = await POST(
            new Request("http://localhost/api/replicate/predictions", {
                method: "POST",
                body: formData,
            }),
        );
        const payload = await response.json();

        expect(response.status).toBe(400);
        expect(payload.errorCode).toBe("VAL_REPLICATE_INPUT_INVALID");
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
