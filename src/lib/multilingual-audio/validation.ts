import {
    ChineseTranscriptionError,
    type ChineseTranscriptionRequest,
} from "./types";

const MAX_GROQ_AUDIO_BYTES = 100 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([
    "flac",
    "m4a",
    "mov",
    "mp3",
    "mp4",
    "mpeg",
    "mpga",
    "ogg",
    "wav",
    "webm",
]);

export function isSupportedAudioVideoFile(fileName: string, mimeType = "") {
    const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
    return (
        SUPPORTED_EXTENSIONS.has(extension) ||
        mimeType.startsWith("video/") ||
        mimeType.startsWith("audio/")
    );
}

export function validateChineseTranscriptionRequest(
    input: ChineseTranscriptionRequest,
) {
    if (!input.fileName || input.fileBytes.byteLength === 0) {
        throw new ChineseTranscriptionError(
            "VAL_AUDIO_FILE_REQUIRED",
            "A non-empty video or audio file is required.",
            400,
        );
    }

    if (!isSupportedAudioVideoFile(input.fileName, input.mimeType)) {
        throw new ChineseTranscriptionError(
            "VAL_AUDIO_FILE_UNSUPPORTED",
            "Unsupported file type. Use a common video/audio file such as mp4, mov, webm, mp3, m4a, wav, or ogg.",
            400,
        );
    }
}

export function validateGroqAudioPayloadSize(audioBytes: Uint8Array) {
    if (audioBytes.byteLength > MAX_GROQ_AUDIO_BYTES) {
        throw new ChineseTranscriptionError(
            "VAL_AUDIO_FILE_TOO_LARGE",
            "Extracted audio is larger than the 100 MB Groq transcription upload limit.",
            413,
        );
    }
}

export function readGroqApiKey() {
    const apiKey = process.env.GROQ_API_KEY?.trim();
    if (!apiKey) {
        throw new ChineseTranscriptionError(
            "CFG_GROQ_API_KEY_MISSING",
            "Missing GROQ_API_KEY environment variable.",
            500,
        );
    }
    return apiKey;
}
