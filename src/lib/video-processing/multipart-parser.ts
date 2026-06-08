import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export type CustomMultipartResult = {
    fields: Record<string, string>;
    fileName: string;
    filePath: string;
};

function indexOfBuffer(source: Uint8Array, target: Uint8Array, start = 0): number {
    if (target.length === 0) return 0;
    if (source.length < target.length) return -1;
    for (let i = start; i <= source.length - target.length; i++) {
        let match = true;
        for (let j = 0; j < target.length; j++) {
            if (source[i + j] !== target[j]) {
                match = false;
                break;
            }
        }
        if (match) return i;
    }
    return -1;
}

export async function parseMultipartStream(
    request: Request,
    workDir: string,
): Promise<CustomMultipartResult> {
    const contentType = request.headers.get("content-type") || "";
    const match = contentType.match(/boundary=(.+)$/i);
    if (!match) {
        throw new Error("Missing boundary in Content-Type header");
    }
    const boundary = match[1];
    const boundaryBytes = new TextEncoder().encode(`\r\n--${boundary}`);
    const firstBoundaryBytes = new TextEncoder().encode(`--${boundary}`);

    const reader = request.body?.getReader();
    if (!reader) {
        throw new Error("Request body is empty");
    }

    let buffer = new Uint8Array(0);
    const fields: Record<string, string> = {};
    let fileName = "";
    let filePath = "";
    let fileWriteStream: ReturnType<typeof createWriteStream> | null = null;
    let fileWritePromise: Promise<void> | null = null;

    let state: "FIND_FIRST_BOUNDARY" | "PARSE_HEADERS" | "READ_CONTENT" = "FIND_FIRST_BOUNDARY";
    let currentFieldName = "";
    let isFileField = false;
    
    // Held back bytes for sliding window file writing
    let heldBack = new Uint8Array(0);

    const decoder = new TextDecoder("utf-8");

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (value) {
                // Concat buffer and new value
                const nextBuffer = new Uint8Array(buffer.length + value.length);
                nextBuffer.set(buffer);
                nextBuffer.set(value, buffer.length);
                buffer = nextBuffer;
            }

            // Process buffer based on state
            let processed = true;
            while (processed && buffer.length > 0) {
                if (state === "FIND_FIRST_BOUNDARY") {
                    const idx = indexOfBuffer(buffer, firstBoundaryBytes);
                    if (idx !== -1) {
                        // Skip first boundary + optional \r\n
                        let skip = idx + firstBoundaryBytes.length;
                        if (buffer[skip] === 13 && buffer[skip + 1] === 10) {
                            skip += 2;
                        }
                        buffer = buffer.subarray(skip);
                        state = "PARSE_HEADERS";
                    } else {
                        // Keep only the last boundary-length bytes to check for partial boundary
                        if (buffer.length > firstBoundaryBytes.length) {
                            buffer = buffer.subarray(buffer.length - firstBoundaryBytes.length);
                        }
                        processed = false;
                    }
                } else if (state === "PARSE_HEADERS") {
                    // Search for \r\n\r\n
                    const headerEndPattern = new Uint8Array([13, 10, 13, 10]);
                    const idx = indexOfBuffer(buffer, headerEndPattern);
                    if (idx !== -1) {
                        const headerText = decoder.decode(buffer.subarray(0, idx));
                        buffer = buffer.subarray(idx + 4);

                        // Parse disposition/headers
                        // e.g., Content-Disposition: form-data; name="videoFile"; filename="video.mp4"
                        const dispMatch = headerText.match(/Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
                        if (dispMatch) {
                            currentFieldName = dispMatch[1];
                            const filename = dispMatch[2];
                            if (filename !== undefined) {
                                isFileField = true;
                                fileName = filename;
                                await mkdir(workDir, { recursive: true });
                                filePath = path.join(workDir, "source.mp4");
                                fileWriteStream = createWriteStream(filePath);
                                fileWritePromise = new Promise((resolve, reject) => {
                                    fileWriteStream?.on("finish", resolve);
                                    fileWriteStream?.on("error", reject);
                                });
                            } else {
                                isFileField = false;
                            }
                        }
                        state = "READ_CONTENT";
                        heldBack = new Uint8Array(0);
                    } else {
                        processed = false;
                    }
                } else if (state === "READ_CONTENT") {
                    if (isFileField) {
                        // Concat heldBack and buffer
                        const tempBuf = new Uint8Array(heldBack.length + buffer.length);
                        tempBuf.set(heldBack);
                        tempBuf.set(buffer, heldBack.length);

                        const idx = indexOfBuffer(tempBuf, boundaryBytes);
                        if (idx !== -1) {
                            // Found boundary!
                            // Write everything before the boundary
                            const fileData = tempBuf.subarray(0, idx);
                            if (fileData.length > 0) {
                                fileWriteStream?.write(fileData);
                            }
                            fileWriteStream?.end();
                            fileWriteStream = null;
                            if (fileWritePromise) {
                                await fileWritePromise;
                                fileWritePromise = null;
                            }

                            // Skip boundary bytes
                            let skip = idx + boundaryBytes.length;
                            // Check if final boundary (-- suffix)
                            if (tempBuf[skip] === 45 && tempBuf[skip + 1] === 45) {
                                // Done!
                                buffer = new Uint8Array(0);
                                break;
                            }
                            if (tempBuf[skip] === 13 && tempBuf[skip + 1] === 10) {
                                skip += 2;
                            }
                            buffer = tempBuf.subarray(skip);
                            state = "PARSE_HEADERS";
                        } else {
                            // Not found boundary yet
                            // We can write everything except the last boundaryBytes.length bytes
                            const L = boundaryBytes.length;
                            if (tempBuf.length > L) {
                                const writeBytes = tempBuf.subarray(0, tempBuf.length - L);
                                fileWriteStream?.write(writeBytes);
                                heldBack = tempBuf.subarray(tempBuf.length - L);
                            } else {
                                heldBack = tempBuf;
                            }
                            buffer = new Uint8Array(0);
                            processed = false;
                        }
                    } else {
                        // Text field content
                        const idx = indexOfBuffer(buffer, boundaryBytes);
                        if (idx !== -1) {
                            const valText = decoder.decode(buffer.subarray(0, idx));
                            fields[currentFieldName] = valText;
                            
                            let skip = idx + boundaryBytes.length;
                            if (buffer[skip] === 45 && buffer[skip + 1] === 45) {
                                buffer = new Uint8Array(0);
                                break;
                            }
                            if (buffer[skip] === 13 && buffer[skip + 1] === 10) {
                                skip += 2;
                            }
                            buffer = buffer.subarray(skip);
                            state = "PARSE_HEADERS";
                        } else {
                            processed = false;
                        }
                    }
                }
            }

            if (done) {
                break;
            }
        }
    } finally {
        if (fileWriteStream) {
            fileWriteStream.end();
            if (fileWritePromise) {
                await fileWritePromise.catch(() => undefined);
            }
        }
        reader.releaseLock();
    }

    return {
        fields,
        fileName,
        filePath,
    };
}
