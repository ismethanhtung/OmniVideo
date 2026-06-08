import { describe, expect, it } from "vitest";
import { rm, readFile, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { parseMultipartStream } from "./multipart-parser";

describe("custom streaming multipart parser", () => {
    it("parses fields and streams files to disk correctly", async () => {
        const boundary = "----TestBoundary123";
        const bodyParts = [
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="mode"\r\n\r\n`,
            `interval\r\n`,
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="intervalMinutes"\r\n\r\n`,
            `30\r\n`,
            `--${boundary}\r\n`,
            `Content-Disposition: form-data; name="videoFile"; filename="dummy.mp4"\r\n`,
            `Content-Type: video/mp4\r\n\r\n`,
            `fake-video-bytes-content-here`,
            `\r\n--${boundary}--\r\n`
        ];

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                for (const part of bodyParts) {
                    controller.enqueue(encoder.encode(part));
                }
                controller.close();
            }
        });

        const request = new Request("http://localhost/api", {
            method: "POST",
            headers: {
                "content-type": `multipart/form-data; boundary=${boundary}`
            },
            body: stream,
            duplex: "half"
        } as unknown as RequestInit);

        const workDir = path.join(tmpdir(), `omnivideo-test-split-${randomUUID()}`);
        
        try {
            const result = await parseMultipartStream(request, workDir);
            
            expect(result.fields).toEqual({
                mode: "interval",
                intervalMinutes: "30"
            });
            expect(result.fileName).toBe("dummy.mp4");
            expect(result.filePath).toBe(path.join(workDir, "source.mp4"));

            const fileContent = await new Promise<string>((resolve, reject) => {
                readFile(result.filePath, "utf8", (err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            expect(fileContent).toBe("fake-video-bytes-content-here");
        } finally {
            await new Promise<void>((resolve) => {
                rm(workDir, { recursive: true, force: true }, () => resolve());
            });
        }
    });
});
