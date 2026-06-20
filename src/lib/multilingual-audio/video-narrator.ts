import {
    DEFAULT_GEMINI_TEXT_MODEL,
    normalizeGeminiModelName,
} from "@/lib/ai-providers/default-provider";

import { ChineseTranscriptionError } from "./types";

export type TimedNarrationSegment = {
    id: number;
    start: number;
    end: number;
    text: string;
};

export type TimedNarrationResult = {
    segments: TimedNarrationSegment[];
    model: string;
    durationMs: number;
    provider: {
        name: string;
        fileUri?: string;
    };
};

/**
 * Uploads a video file to Google AI Studio's File API using resumable protocol.
 */
export async function uploadVideoToGemini(
    videoBytes: Uint8Array,
    mimeType: string,
    apiKey: string,
): Promise<{ fileUri: string; fileName: string }> {
    const initUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`;
    const displayName = `video-narrator-${Date.now()}`;

    // 1. Initialize resumable session
    const initResponse = await fetch(initUrl, {
        method: "POST",
        headers: {
            "X-Goog-Upload-Protocol": "resumable",
            "X-Goog-Upload-Command": "start",
            "X-Goog-Upload-Header-Content-Length": String(videoBytes.byteLength),
            "X-Goog-Upload-Header-Content-Type": mimeType,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            file: {
                displayName,
            },
        }),
    });

    if (!initResponse.ok) {
        const errText = await initResponse.text();
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Failed to initialize Gemini video upload (HTTP ${initResponse.status}): ${errText}`,
            502,
        );
    }

    const uploadUrl = initResponse.headers.get("x-goog-upload-url") || initResponse.headers.get("location");
    if (!uploadUrl) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            "Missing upload location URL in Gemini File API response headers.",
            502,
        );
    }

    // 2. Upload actual video bytes
    const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
            "Content-Length": String(videoBytes.byteLength),
        },
        body: Buffer.from(videoBytes),
    });

    if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Failed to upload video bytes to Gemini File API (HTTP ${uploadResponse.status}): ${errText}`,
            502,
        );
    }

    const fileMeta = (await uploadResponse.json()) as {
        file?: { uri?: string; name?: string };
    };
    const fileUri = fileMeta.file?.uri;
    const fileName = fileMeta.file?.name; // e.g. "files/abc123xyz"

    if (!fileUri || !fileName) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            "Failed to retrieve file URI from Gemini upload response.",
            502,
        );
    }

    return { fileUri, fileName };
}

/**
 * Polls the file status in Gemini File API until it is ACTIVE.
 */
export async function pollGeminiFileStatus(
    fileName: string,
    apiKey: string,
    pollIntervalMs = 1500,
    maxAttempts = 30,
): Promise<void> {
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const response = await fetch(pollUrl);
        if (!response.ok) {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                `Failed to query Gemini file status (HTTP ${response.status})`,
                502,
            );
        }

        const statusMeta = (await response.json()) as { state?: string };
        const state = statusMeta.state?.toUpperCase();

        if (state === "ACTIVE") {
            return;
        }

        if (state === "FAILED") {
            throw new ChineseTranscriptionError(
                "SYS_DUBBING_MUX_FAILED",
                "Gemini File API processing failed for the uploaded video.",
                502,
            );
        }

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        attempts++;
    }

    throw new ChineseTranscriptionError(
        "SYS_DUBBING_MUX_FAILED",
        "Gemini video processing timed out (exceeded limit).",
        504,
    );
}

/**
 * Generates timed narration script in Vietnamese from Gemini Video Understanding.
 */
export async function generateGeminiNarrationScript(input: {
    fileUri: string;
    mimeType: string;
    apiKey: string;
    model: string;
    customPrompt?: string;
}): Promise<TimedNarrationSegment[]> {
    const modelName = normalizeGeminiModelName(
        input.model || DEFAULT_GEMINI_TEXT_MODEL,
    );
    const generateUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${input.apiKey}`;

    const defaultPrompt =
        "Xem video này và viết một kịch bản thuyết minh ngắn bằng tiếng Việt. Hãy mô tả sinh động sự kiện đang xảy ra từng bước, dí dỏm và thú vị để giữ chân người xem. Phân chia kịch bản thành các phân đoạn tương ứng với các mốc thời gian trong video.";
    const userPrompt = input.customPrompt?.trim() || defaultPrompt;

    const fullPrompt = `${userPrompt}

Đầu ra BẮT BUỘC phải là mảng JSON hợp lệ theo cấu trúc sau:
[
  {
    "start": 0.0,
    "end": 4.5,
    "text": "Người đàn ông này đang đi dạo trên đường..."
  }
]
Yêu cầu:
- start và end phải là số giây thực tế diễn ra phân cảnh trong video.
- text phải là câu thuyết minh bằng tiếng Việt tương ứng với đoạn thời gian đó.
- Trả về JSON thô duy nhất, không thêm ký tự markdown hay ghi chú khác.`;

    const response = await fetch(generateUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            fileData: {
                                fileUri: input.fileUri,
                                mimeType: input.mimeType,
                            },
                        },
                        {
                            text: fullPrompt,
                        },
                    ],
                },
            ],
            generationConfig: {
                responseMimeType: "application/json",
            },
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Gemini content generation failed (HTTP ${response.status}): ${errText}`,
            502,
        );
    }

    const resultPayload = (await response.json()) as {
        candidates?: Array<{
            content?: {
                parts?: Array<{ text?: string }>;
            };
        }>;
    };

    const rawJsonText =
        resultPayload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rawJsonText) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            "Gemini returned an empty narration script response.",
            502,
        );
    }

    try {
        const segments = JSON.parse(rawJsonText) as Array<{
            start?: unknown;
            end?: unknown;
            text?: unknown;
        }>;

        if (!Array.isArray(segments)) {
            throw new Error("Parsed JSON response is not an array.");
        }

        return segments.map((item, index) => {
            const start = Number(item.start);
            const end = Number(item.end);
            const text = String(item.text ?? "").trim();

            if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
                throw new Error(
                    `Invalid segment at index ${index}: start=${item.start}, end=${item.end}, text=${item.text}`,
                );
            }

            return {
                id: index,
                start,
                end,
                text,
            };
        });
    } catch (error) {
        throw new ChineseTranscriptionError(
            "SYS_DUBBING_MUX_FAILED",
            `Failed to parse timed segments from Gemini JSON response: ${
                error instanceof Error ? error.message : "Invalid format"
            }. Raw text: ${rawJsonText.slice(0, 100)}`,
            502,
        );
    }
}
