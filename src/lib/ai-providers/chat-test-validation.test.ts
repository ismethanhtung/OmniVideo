import { describe, expect, it } from "vitest";

import { AiProviderError } from "./types";
import {
    extractAssistantCompletionText,
    parseChatCompletionTestBody,
} from "./chat-test-validation";

describe("parseChatCompletionTestBody", () => {
    it("defaults temperature to 0.7", () => {
        expect(
            parseChatCompletionTestBody({
                model: "m1",
                messages: [{ role: "user", content: "hello" }],
            }),
        ).toEqual({
            model: "m1",
            messages: [{ role: "user", content: "hello" }],
            temperature: 0.7,
        });
    });

    it("trims model and message content", () => {
        expect(
            parseChatCompletionTestBody({
                model: "  m ",
                messages: [{ role: "user", content: " hi " }],
            }),
        ).toEqual({
            model: "m",
            messages: [{ role: "user", content: "hi" }],
            temperature: 0.7,
        });
    });

    it("rejects empty model", () => {
        expect(() =>
            parseChatCompletionTestBody({
                model: "  ",
                messages: [{ role: "user", content: "x" }],
            }),
        ).toThrow(AiProviderError);
    });

    it("rejects invalid role", () => {
        expect(() =>
            parseChatCompletionTestBody({
                model: "x",
                messages: [{ role: "tool", content: "x" }],
            }),
        ).toThrow(AiProviderError);
    });

    it("rejects invalid temperature", () => {
        expect(() =>
            parseChatCompletionTestBody({
                model: "x",
                messages: [{ role: "user", content: "y" }],
                temperature: Number.NaN,
            }),
        ).toThrow(AiProviderError);
    });
});

describe("extractAssistantCompletionText", () => {
    it("returns string content from first choice", () => {
        expect(
            extractAssistantCompletionText({
                choices: [{ message: { content: "Reply" } }],
            }),
        ).toBe("Reply");
    });

    it("serializes non-string content", () => {
        expect(
            extractAssistantCompletionText({
                choices: [{ message: { content: { a: 1 } } }],
            }),
        ).toBe(JSON.stringify({ a: 1 }));
    });
});
