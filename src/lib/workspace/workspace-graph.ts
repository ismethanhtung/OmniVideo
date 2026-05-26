export type WorkspaceNodeCategory =
    | "input"
    | "processing"
    | "output"
    | "cleanup";

export type WorkspaceNodeImplementationStatus =
    | "available"
    | "planned"
    | "blocked";

export type WorkspacePort = {
    id: string;
    label: string;
    dataType:
        | "source"
        | "asset"
        | "video"
        | "audio"
        | "metadata"
        | "transcript"
        | "publish";
};

export type WorkspaceConfigField = {
    key: string;
    label: string;
    type: "text" | "number" | "boolean" | "select" | "region" | "account";
    required: boolean;
    defaultValue?: string | number | boolean;
};

export type WorkspaceNodeTemplate = {
    nodeType: string;
    version: string;
    label: string;
    description: string;
    category: WorkspaceNodeCategory;
    status: WorkspaceNodeImplementationStatus;
    inputPorts: WorkspacePort[];
    outputPorts: WorkspacePort[];
    configFields: WorkspaceConfigField[];
    timeoutMs: number;
    retryPolicy: {
        maxAttempts: number;
        backoff: "none" | "linear" | "exponential";
    };
    idempotencyStrategy:
        | "input-hash"
        | "asset-checksum"
        | "provider-request-id";
    observabilityHooks: Array<"onStart" | "onSuccess" | "onError">;
    traceabilityNotes: string;
};

export type WorkspaceNodeInstance = {
    id: string;
    templateNodeType: string;
    label: string;
    position: {
        x: number;
        y: number;
    };
    config: Record<string, string | number | boolean>;
};

export type WorkspaceEdge = {
    id: string;
    fromNodeId: string;
    fromPortId: string;
    toNodeId: string;
    toPortId: string;
};

export type WorkspaceGraph = {
    version: 1;
    draftId: string;
    title: string;
    updatedAt: string;
    selectedNodeId: string | null;
    nodes: WorkspaceNodeInstance[];
    edges: WorkspaceEdge[];
};

export type WorkspaceGraphValidation = {
    ok: boolean;
    errors: string[];
};

export type WorkspaceConnectionValidation = {
    ok: boolean;
    error?: string;
};

export type WorkspaceExecutableUploadToSocialPlan = {
    ok: boolean;
    mode?: "upload-to-storage" | "asset-to-social" | "upload-to-social";
    sourceNodeId?: string;
    storageNodeId?: string;
    publishNodeId?: string;
    error?: string;
};

export type WorkspaceFlowStep =
    | {
          kind: "use-existing-asset";
          nodeId: string;
          producerNodeId: string;
      }
    | {
          kind: "upload-and-store";
          sourceFileNodeId: string;
          storageNodeId: string;
          producerNodeId: string;
      }
    | {
          kind: "intake-url-and-store";
          sourceUrlNodeId: string;
          storageNodeId: string;
          producerNodeId: string;
      }
    | {
          kind: "publish";
          publishNodeId: string;
          producerNodeId: string;
      }
    | {
          kind: "transcribe-chinese";
          sourceNodeId: string;
          transcriptionNodeId: string;
      }
    | {
          kind: "translate-transcript";
          transcriptionNodeId: string;
          translationNodeId: string;
      }
    | {
          kind: "generate-vi-metadata";
          translationNodeId: string;
          metadataNodeId: string;
      }
    | {
          kind: "generate-voice";
          transcriptionNodeId: string;
          translationNodeId: string;
          voiceNodeId: string;
      }
    | {
          kind: "preprocess-video";
          sourceNodeId: string;
          preprocessNodeId: string;
      }
    | {
          kind: "dub-video";
          sourceNodeId: string;
          dubbingNodeId: string;
      }
    | {
          kind: "vip-process-video";
          sourceNodeId: string;
          vipNodeId: string;
      }
    | {
          kind: "mirror-video";
          sourceNodeId: string;
          mirrorNodeId: string;
      }
    | {
          kind: "edit-video";
          sourceNodeId: string;
          editNodeId: string;
          translationNodeId: string;
      }
    | {
          kind: "store-artifact";
          artifactNodeId: string;
          storageNodeId: string;
          producerNodeId: string;
      }
    | {
          kind: "cleanup-assets";
          cleanupNodeId: string;
          producerNodeId?: string;
          publishNodeId?: string;
      }
    | {
          kind: "download-local";
          downloadNodeId: string;
          producerNodeId: string;
      };

export type WorkspaceFlowPlan = {
    ok: boolean;
    steps: WorkspaceFlowStep[];
    errors: string[];
};

export const WORKSPACE_DRAFT_STORAGE_KEY = "omnivideo.workspaceDraft.v1";

export const WORKSPACE_NODE_TEMPLATES: WorkspaceNodeTemplate[] = [
    {
        nodeType: "source.url",
        version: "1.0.0",
        label: "URL Video",
        description:
            "Nhận URL video nguồn và giữ source trace cho intake flow.",
        category: "input",
        status: "available",
        inputPorts: [],
        outputPorts: [
            { id: "source", label: "Source URL", dataType: "source" },
        ],
        configFields: [
            { key: "url", label: "Source URL", type: "text", required: true },
            {
                key: "title",
                label: "Title",
                type: "text",
                required: false,
            },
            {
                key: "description",
                label: "Description",
                type: "text",
                required: false,
            },
            {
                key: "tags",
                label: "Trace tags",
                type: "text",
                required: false,
                defaultValue: "workspace,url",
            },
            {
                key: "qualityPreference",
                label: "Quality preference",
                type: "select",
                required: true,
                defaultValue: "best",
            },
            {
                key: "ownershipStatus",
                label: "Ownership status",
                type: "select",
                required: true,
                defaultValue: "unknown",
            },
        ],
        timeoutMs: 30000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Source URL, origin platform, ownership status, and tags must be preserved on every downstream asset.",
    },
    {
        nodeType: "source.file",
        version: "1.0.0",
        label: "Upload Video",
        description: "Nhận file local và tạo asset đầu vào trước khi xử lý.",
        category: "input",
        status: "available",
        inputPorts: [],
        outputPorts: [{ id: "asset", label: "Input asset", dataType: "asset" }],
        configFields: [
            {
                key: "storageAccountId",
                label: "Storage account",
                type: "account",
                required: true,
            },
            {
                key: "title",
                label: "Title",
                type: "text",
                required: false,
            },
            {
                key: "description",
                label: "Description",
                type: "text",
                required: false,
            },
            {
                key: "tags",
                label: "Trace tags",
                type: "text",
                required: false,
                defaultValue: "workspace,upload",
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "asset-checksum",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Local upload must persist original filename, size, checksum when available, storage pointer, and source type=file.",
    },
    {
        nodeType: "source.asset",
        version: "1.0.0",
        label: "Storage Asset",
        description: "Dùng video đã có trong Storage Library làm input flow.",
        category: "input",
        status: "available",
        inputPorts: [],
        outputPorts: [
            { id: "asset", label: "Existing asset", dataType: "asset" },
        ],
        configFields: [
            {
                key: "assetId",
                label: "Video asset",
                type: "account",
                required: true,
            },
        ],
        timeoutMs: 5000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "asset-checksum",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Existing asset input must preserve asset id, storage pointer, source refs, and prior pipeline trace.",
    },
    {
        nodeType: "video.preprocess",
        version: "1.0.0",
        label: "Video Preprocess",
        description:
            "Điều chỉnh tốc độ source video trước các bước transcript/dubbing/edit downstream.",
        category: "processing",
        status: "available",
        inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
        outputPorts: [
            { id: "video", label: "Processed video", dataType: "video" },
        ],
        configFields: [
            {
                key: "enabled",
                label: "Enable preprocess",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "speedFactor",
                label: "Video speed",
                type: "number",
                required: true,
                defaultValue: 0.7,
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Preprocess output must preserve source refs, speed factor, and generated artifact lineage.",
    },
    {
        nodeType: "edit.mask-region",
        version: "0.1.0",
        label: "Mask Logo/Subtitles",
        description:
            "Làm mờ logo, tem hoặc phụ đề gốc theo vùng chọn timeline.",
        category: "processing",
        status: "available",
        inputPorts: [
            { id: "video", label: "Video", dataType: "video" },
            {
                id: "transcript",
                label: "Translated transcript",
                dataType: "transcript",
            },
        ],
        outputPorts: [
            { id: "video", label: "Masked video", dataType: "video" },
        ],
        configFields: [
            {
                key: "blurRegionsJson",
                label: "Blur regions JSON",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "regionX",
                label: "Region X %",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "regionY",
                label: "Region Y %",
                type: "number",
                required: true,
                defaultValue: 84,
            },
            {
                key: "regionWidth",
                label: "Region width %",
                type: "number",
                required: true,
                defaultValue: 100,
            },
            {
                key: "regionHeight",
                label: "Region height %",
                type: "number",
                required: true,
                defaultValue: 16,
            },
            {
                key: "timelineStart",
                label: "Timeline start seconds",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "timelineEnd",
                label: "Timeline end seconds",
                type: "number",
                required: true,
                defaultValue: 36000,
            },
            {
                key: "blurStrength",
                label: "Blur strength",
                type: "number",
                required: true,
                defaultValue: 50,
            },
            {
                key: "subtitleOverlayEnabled",
                label: "Burn translated subtitles",
                type: "boolean",
                required: true,
                defaultValue: true,
            },
            {
                key: "subtitleFontFamily",
                label: "Subtitle font family",
                type: "text",
                required: false,
                defaultValue: "Arial",
            },
            {
                key: "subtitleFontSize",
                label: "Subtitle font size",
                type: "number",
                required: false,
                defaultValue: 55,
            },
            {
                key: "subtitleMarginBottom",
                label: "Subtitle bottom margin",
                type: "number",
                required: false,
                defaultValue: 150,
            },
            {
                key: "subtitleMarginLeft",
                label: "Subtitle left margin",
                type: "number",
                required: false,
                defaultValue: 60,
            },
            {
                key: "subtitleMarginRight",
                label: "Subtitle right margin",
                type: "number",
                required: false,
                defaultValue: 60,
            },
            {
                key: "subtitleAlignment",
                label: "Subtitle alignment",
                type: "number",
                required: false,
                defaultValue: 2,
            },
            {
                key: "subtitleBackgroundEnabled",
                label: "Subtitle background enabled",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "subtitleBackgroundColor",
                label: "Subtitle background color",
                type: "text",
                required: false,
                defaultValue: "#000000",
            },
            {
                key: "subtitleBackgroundOpacity",
                label: "Subtitle background opacity",
                type: "number",
                required: false,
                defaultValue: 65,
            },
            {
                key: "mirrorEnabled",
                label: "Mirror horizontal",
                type: "boolean",
                required: false,
                defaultValue: false,
            },
        ],
        timeoutMs: 600000,
        retryPolicy: { maxAttempts: 2, backoff: "exponential" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Transform chain must record source asset id, mask region, timeline range, and output asset id.",
    },
    {
        nodeType: "audio.extract-voice",
        version: "0.1.0",
        label: "Extract Voice",
        description: "Tách hoặc giảm voice gốc để chuẩn bị lồng tiếng mới.",
        category: "processing",
        status: "planned",
        inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
        outputPorts: [
            { id: "video", label: "Video bed", dataType: "video" },
            { id: "audio", label: "Voice track", dataType: "audio" },
        ],
        configFields: [
            {
                key: "mode",
                label: "Mode",
                type: "select",
                required: true,
                defaultValue: "separate",
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 2, backoff: "exponential" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Audio outputs must keep language hint, model/provider used later, and sync metadata.",
    },
    {
        nodeType: "audio.chinese-transcribe",
        version: "1.0.0",
        label: "Audio Transcript",
        description:
            "Extract speech-ready audio and transcribe with Groq Whisper timestamps.",
        category: "processing",
        status: "available",
        inputPorts: [{ id: "asset", label: "Video file", dataType: "asset" }],
        outputPorts: [
            {
                id: "transcript",
                label: "Timestamp transcript",
                dataType: "transcript",
            },
        ],
        configFields: [
            {
                key: "language",
                label: "Language hint",
                type: "select",
                required: true,
                defaultValue: "zh",
            },
            {
                key: "includeWordTimestamps",
                label: "Word timestamps",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "prompt",
                label: "Prompt",
                type: "text",
                required: false,
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Transcript output must preserve source filename, language, provider/model, segment timestamps, and optional word timestamps.",
    },
    {
        nodeType: "audio.voice-insert",
        version: "0.1.0",
        label: "Insert Voice",
        description: "Chèn voice mới hoặc voice clone/TTS vào video bed.",
        category: "processing",
        status: "planned",
        inputPorts: [
            { id: "video", label: "Video bed", dataType: "video" },
            { id: "audio", label: "Voice audio", dataType: "audio" },
        ],
        outputPorts: [
            { id: "video", label: "Voiced video", dataType: "video" },
        ],
        configFields: [
            {
                key: "voiceProfile",
                label: "Voice profile",
                type: "text",
                required: true,
            },
            {
                key: "ducking",
                label: "Auto ducking",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
        ],
        timeoutMs: 600000,
        retryPolicy: { maxAttempts: 2, backoff: "exponential" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Voice insertion must record voice profile, provider/model, sync offsets, and audio peak checks.",
    },
    {
        nodeType: "audio.voice-generation",
        version: "1.0.0",
        label: "Voice Generation",
        description:
            "Sinh voice tiếng Việt từ translated transcript bằng Piper local.",
        category: "processing",
        status: "available",
        inputPorts: [
            {
                id: "transcript",
                label: "Translated transcript",
                dataType: "transcript",
            },
        ],
        outputPorts: [{ id: "audio", label: "Voice WAV", dataType: "audio" }],
        configFields: [
            {
                key: "ttsBinaryPath",
                label: "Piper executable",
                type: "text",
                required: true,
                defaultValue: "piper",
            },
            {
                key: "ttsModelPath",
                label: "ONNX model",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsConfigPath",
                label: "Config JSON",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsSpeaker",
                label: "Speaker",
                type: "number",
                required: false,
                defaultValue: 0,
            },
            {
                key: "ttsLengthScale",
                label: "Length scale",
                type: "number",
                required: false,
                defaultValue: 1,
            },
            {
                key: "ttsNoiseScale",
                label: "Noise scale",
                type: "number",
                required: false,
                defaultValue: 0.667,
            },
            {
                key: "ttsNoiseW",
                label: "Noise W",
                type: "number",
                required: false,
                defaultValue: 0.8,
            },
            {
                key: "ttsSentenceSilence",
                label: "Sentence silence",
                type: "number",
                required: false,
                defaultValue: 0.2,
            },
            {
                key: "ttsPreserveTimestampGaps",
                label: "Balanced timing",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "ttsAlignmentMode",
                label: "Alignment mode",
                type: "select",
                required: false,
                defaultValue: "strict",
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Voice output must preserve translated segment ids/timestamps, Piper model/config, and alignment mode.",
    },
    {
        nodeType: "audio.video-dubbing",
        version: "1.0.0",
        label: "Video Dubbing",
        description:
            "Transcribe source speech, translate to target language, generate voice, duck original audio, and mux MP4.",
        category: "processing",
        status: "available",
        inputPorts: [{ id: "asset", label: "Source video", dataType: "asset" }],
        outputPorts: [
            { id: "asset", label: "Dubbed video artifact", dataType: "asset" },
            {
                id: "transcript",
                label: "Translated transcript",
                dataType: "transcript",
            },
        ],
        configFields: [
            {
                key: "language",
                label: "Language hint",
                type: "select",
                required: true,
                defaultValue: "zh",
            },
            {
                key: "targetLanguage",
                label: "Target language",
                type: "select",
                required: true,
                defaultValue: "vi",
            },
            {
                key: "translationProviderId",
                label: "AI Provider",
                type: "account",
                required: false,
                defaultValue: "",
            },
            {
                key: "model",
                label: "Translation model",
                type: "select",
                required: true,
                defaultValue: "cx/gpt-5.3-codex-low",
            },
            {
                key: "originalAudioVolume",
                label: "Original audio volume",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "voiceVolume",
                label: "Voice volume",
                type: "number",
                required: true,
                defaultValue: 1,
            },
            {
                key: "ttsBinaryPath",
                label: "Piper executable",
                type: "text",
                required: true,
                defaultValue: "piper",
            },
            {
                key: "ttsModelPath",
                label: "ONNX model",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsConfigPath",
                label: "Config JSON",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsNoiseScale",
                label: "Noise scale",
                type: "number",
                required: false,
                defaultValue: 0.667,
            },
            {
                key: "ttsNoiseW",
                label: "Noise W",
                type: "number",
                required: false,
                defaultValue: 0.8,
            },
            {
                key: "ttsSentenceSilence",
                label: "Sentence silence",
                type: "number",
                required: false,
                defaultValue: 0.2,
            },
            {
                key: "ttsPreserveTimestampGaps",
                label: "Balanced timing",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "ttsAlignmentMode",
                label: "Alignment mode",
                type: "select",
                required: false,
                defaultValue: "strict",
            },
        ],
        timeoutMs: 1800000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Dubbed output must record transcript/translation/TTS model settings, mix volumes, source asset/file, and output asset id when persisted.",
    },
    {
        nodeType: "video.vip-processing",
        version: "1.0.0",
        label: "VIP Processing",
        description:
            "Composite pipeline: preprocess + dubbing + mirror + blur/subtitles + VI metadata in one dedicated runtime path.",
        category: "processing",
        status: "available",
        inputPorts: [{ id: "asset", label: "Source video", dataType: "asset" }],
        outputPorts: [
            { id: "asset", label: "Processed video artifact", dataType: "asset" },
            {
                id: "metadata",
                label: "Vietnamese metadata",
                dataType: "metadata",
            },
        ],
        configFields: [
            {
                key: "language",
                label: "Language hint",
                type: "select",
                required: true,
                defaultValue: "zh",
            },
            {
                key: "targetLanguage",
                label: "Target language",
                type: "select",
                required: true,
                defaultValue: "vi",
            },
            {
                key: "translationProviderId",
                label: "AI Provider",
                type: "account",
                required: false,
                defaultValue: "",
            },
            {
                key: "model",
                label: "Translation model",
                type: "select",
                required: true,
                defaultValue: "cx/gpt-5.3-codex-low",
            },
            {
                key: "metadataProviderId",
                label: "Metadata AI Provider",
                type: "account",
                required: false,
                defaultValue: "",
            },
            {
                key: "metadataModel",
                label: "Metadata model",
                type: "select",
                required: true,
                defaultValue: "cx/gpt-5.3-codex-low",
            },
            {
                key: "speedFactor",
                label: "Video speed",
                type: "number",
                required: false,
                defaultValue: 0.7,
            },
            {
                key: "originalAudioVolume",
                label: "Original audio volume",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "voiceVolume",
                label: "Voice volume",
                type: "number",
                required: true,
                defaultValue: 1,
            },
            {
                key: "ttsBinaryPath",
                label: "Piper executable",
                type: "text",
                required: true,
                defaultValue: "piper",
            },
            {
                key: "ttsModelPath",
                label: "ONNX model",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsConfigPath",
                label: "Config JSON",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "ttsNoiseScale",
                label: "Noise scale",
                type: "number",
                required: false,
                defaultValue: 0.667,
            },
            {
                key: "ttsNoiseW",
                label: "Noise W",
                type: "number",
                required: false,
                defaultValue: 0.8,
            },
            {
                key: "ttsSentenceSilence",
                label: "Sentence silence",
                type: "number",
                required: false,
                defaultValue: 0.2,
            },
            {
                key: "ttsPreserveTimestampGaps",
                label: "Balanced timing",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "ttsAlignmentMode",
                label: "Alignment mode",
                type: "select",
                required: false,
                defaultValue: "strict",
            },
            {
                key: "mirrorEnabled",
                label: "Mirror horizontal",
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            {
                key: "blurRegionsJson",
                label: "Blur regions JSON",
                type: "text",
                required: false,
                defaultValue: "",
            },
            {
                key: "regionX",
                label: "Region X %",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "regionY",
                label: "Region Y %",
                type: "number",
                required: true,
                defaultValue: 84,
            },
            {
                key: "regionWidth",
                label: "Region width %",
                type: "number",
                required: true,
                defaultValue: 100,
            },
            {
                key: "regionHeight",
                label: "Region height %",
                type: "number",
                required: true,
                defaultValue: 16,
            },
            {
                key: "timelineStart",
                label: "Timeline start seconds",
                type: "number",
                required: true,
                defaultValue: 0,
            },
            {
                key: "timelineEnd",
                label: "Timeline end seconds",
                type: "number",
                required: true,
                defaultValue: 36000,
            },
            {
                key: "blurStrength",
                label: "Blur strength",
                type: "number",
                required: true,
                defaultValue: 50,
            },
        ],
        timeoutMs: 1800000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "VIP node records transcript/translation/TTS settings, composite edit options, metadata generation, and final asset lineage in one runtime step.",
    },
    {
        nodeType: "text.translate-transcript",
        version: "1.0.0",
        label: "Translate Transcript",
        description:
            "Translate timestamped transcript segments to Vietnamese with Groq LLM while preserving timeline.",
        category: "processing",
        status: "available",
        inputPorts: [
            {
                id: "transcript",
                label: "Source transcript",
                dataType: "transcript",
            },
        ],
        outputPorts: [
            {
                id: "transcript",
                label: "Translated transcript",
                dataType: "transcript",
            },
        ],
        configFields: [
            {
                key: "translationProviderId",
                label: "AI Provider",
                type: "account",
                required: false,
                defaultValue: "",
            },
            {
                key: "model",
                label: "Translation model",
                type: "select",
                required: true,
                defaultValue: "cx/gpt-5.3-codex-low",
            },
            {
                key: "targetLanguage",
                label: "Target language",
                type: "select",
                required: true,
                defaultValue: "vi",
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Translation must preserve segment ids, start/end timestamps, source text, target text, model, and language pair.",
    },
    {
        nodeType: "text.generate-vi-metadata",
        version: "1.0.0",
        label: "Generate VI Metadata",
        description:
            "Generate Vietnamese title, description, and hashtags from translated transcript. Create + Save, những node khác tự động sử dụng metadata đã được lưu.",
        category: "processing",
        status: "available",
        inputPorts: [
            {
                id: "transcript",
                label: "Translated transcript",
                dataType: "transcript",
            },
        ],
        outputPorts: [
            { id: "metadata", label: "Metadata", dataType: "metadata" },
        ],
        configFields: [
            {
                key: "metadataProviderId",
                label: "AI Provider",
                type: "account",
                required: false,
                defaultValue: "",
            },
            {
                key: "model",
                label: "Metadata model",
                type: "select",
                required: true,
                defaultValue: "cx/gpt-5.3-codex-low",
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Generated Vietnamese metadata should be reusable in downstream publish nodes.",
    },
    {
        nodeType: "edit.mirror",
        version: "0.1.0",
        label: "Mirror Video",
        description: "Lật ngang video cho các biến thể edit hợp lệ.",
        category: "processing",
        status: "available",
        inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
        outputPorts: [
            { id: "video", label: "Mirrored video", dataType: "video" },
        ],
        configFields: [
            {
                key: "axis",
                label: "Axis",
                type: "select",
                required: true,
                defaultValue: "horizontal",
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 2, backoff: "linear" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Mirror transform must record axis and output asset preview metadata.",
    },
    {
        nodeType: "edit.rotate",
        version: "0.1.0",
        label: "Rotate Video",
        description: "Xoay video theo góc cấu hình để chuẩn hóa layout.",
        category: "processing",
        status: "planned",
        inputPorts: [{ id: "video", label: "Video", dataType: "video" }],
        outputPorts: [
            { id: "video", label: "Rotated video", dataType: "video" },
        ],
        configFields: [
            {
                key: "degrees",
                label: "Degrees",
                type: "number",
                required: true,
                defaultValue: 0,
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 2, backoff: "linear" },
        idempotencyStrategy: "input-hash",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Rotation must update output width/height metadata and preserve original asset refs.",
    },
    {
        nodeType: "storage.upload",
        version: "1.0.0",
        label: "Save to Storage",
        description: "Lưu asset đầu ra vào Telegram/Drive storage account.",
        category: "output",
        status: "available",
        inputPorts: [{ id: "asset", label: "Asset", dataType: "asset" }],
        outputPorts: [
            { id: "asset", label: "Stored asset", dataType: "asset" },
        ],
        configFields: [
            {
                key: "storageAccountId",
                label: "Storage account",
                type: "account",
                required: true,
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 3, backoff: "exponential" },
        idempotencyStrategy: "asset-checksum",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Storage output must include provider, account id, storage pointer, file size, and source run refs.",
    },
    {
        nodeType: "social.publish",
        version: "0.1.0",
        label: "Publish Social",
        description:
            "Đăng hoặc lập kế hoạch đăng video sang platform đã cấu hình.",
        category: "output",
        status: "available",
        inputPorts: [{ id: "asset", label: "Asset", dataType: "asset" }],
        outputPorts: [
            { id: "publish", label: "Publish record", dataType: "publish" },
        ],
        configFields: [
            {
                key: "socialAccountId",
                label: "Social account",
                type: "account",
                required: true,
            },
            {
                key: "thumbnailAssetId",
                label: "Thumbnail asset",
                type: "text",
                required: false,
            },
            {
                key: "publishMode",
                label: "Publish mode",
                type: "select",
                required: true,
                defaultValue: "schedule",
            },
        ],
        timeoutMs: 900000,
        retryPolicy: { maxAttempts: 2, backoff: "exponential" },
        idempotencyStrategy: "provider-request-id",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Publish node must preserve account id, platform, target page/channel, publish record id, and platform response.",
    },
    {
        nodeType: "output.download-local",
        version: "1.0.0",
        label: "Save to Local",
        description:
            "Lưu output về máy local từ Storage hoặc runtime artifact, không cần upload lên Storage trước.",
        category: "output",
        status: "available",
        inputPorts: [{ id: "asset", label: "Asset", dataType: "asset" }],
        outputPorts: [],
        configFields: [
            {
                key: "downloadMode",
                label: "Save mode",
                type: "select",
                required: true,
                defaultValue: "downloads",
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "asset-checksum",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Local download output should preserve upstream asset/artifact lineage and chosen save mode.",
    },
    {
        nodeType: "cleanup.delete-assets",
        version: "1.0.0",
        label: "Cleanup Assets",
        description:
            "Xóa asset nguồn và/hoặc asset processed cuối cùng sau khi flow hoàn tất.",
        category: "cleanup",
        status: "available",
        inputPorts: [
            { id: "asset", label: "Stored asset", dataType: "asset" },
            { id: "publish", label: "Publish result", dataType: "publish" },
        ],
        outputPorts: [],
        configFields: [
            {
                key: "deleteOriginalAsset",
                label: "Delete original asset",
                type: "boolean",
                required: false,
                defaultValue: false,
            },
            {
                key: "deleteProcessedAsset",
                label: "Delete processed asset",
                type: "boolean",
                required: false,
                defaultValue: false,
            },
        ],
        timeoutMs: 300000,
        retryPolicy: { maxAttempts: 1, backoff: "none" },
        idempotencyStrategy: "asset-checksum",
        observabilityHooks: ["onStart", "onSuccess", "onError"],
        traceabilityNotes:
            "Cleanup must preserve explicit operator intent and only delete selected assets after upstream prerequisites are satisfied.",
    },
];

export function createEmptyWorkspaceGraph(
    title = "Untitled workspace",
): WorkspaceGraph {
    return {
        version: 1,
        draftId: "local-draft",
        title,
        updatedAt: new Date(0).toISOString(),
        selectedNodeId: null,
        nodes: [],
        edges: [],
    };
}

export function getWorkspaceNodeTemplate(
    nodeType: string,
): WorkspaceNodeTemplate | undefined {
    return WORKSPACE_NODE_TEMPLATES.find(
        (template) => template.nodeType === nodeType,
    );
}

function buildDefaultConfig(template: WorkspaceNodeTemplate) {
    return template.configFields.reduce<WorkspaceNodeInstance["config"]>(
        (config, field) => {
            if (field.defaultValue !== undefined) {
                config[field.key] = field.defaultValue;
            }
            return config;
        },
        {},
    );
}

function nodeTypeToInstancePrefix(nodeType: string) {
    return nodeType.replaceAll(".", "-");
}

export function addWorkspaceNode(
    graph: WorkspaceGraph,
    template: WorkspaceNodeTemplate,
    position: WorkspaceNodeInstance["position"],
): WorkspaceGraph {
    const prefix = nodeTypeToInstancePrefix(template.nodeType);
    const nextIndex =
        graph.nodes.filter((node) => node.id.startsWith(`${prefix}-`)).length +
        1;
    const node: WorkspaceNodeInstance = {
        id: `${prefix}-${nextIndex}`,
        templateNodeType: template.nodeType,
        label: template.label,
        position,
        config: buildDefaultConfig(template),
    };

    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        selectedNodeId: node.id,
        nodes: [...graph.nodes, node],
    };
}

export function selectWorkspaceNode(
    graph: WorkspaceGraph,
    nodeId: string | null,
): WorkspaceGraph {
    return {
        ...graph,
        selectedNodeId: nodeId,
    };
}

export function deleteWorkspaceNode(
    graph: WorkspaceGraph,
    nodeId: string,
): WorkspaceGraph {
    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        selectedNodeId:
            graph.selectedNodeId === nodeId ? null : graph.selectedNodeId,
        nodes: graph.nodes.filter((node) => node.id !== nodeId),
        edges: graph.edges.filter(
            (edge) => edge.fromNodeId !== nodeId && edge.toNodeId !== nodeId,
        ),
    };
}

export function deleteWorkspaceEdge(
    graph: WorkspaceGraph,
    edgeId: string,
): WorkspaceGraph {
    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        edges: graph.edges.filter((edge) => edge.id !== edgeId),
    };
}

function areWorkspacePortsCompatible(
    fromPort: WorkspacePort,
    toPort: WorkspacePort,
) {
    if (fromPort.dataType === toPort.dataType) return true;
    if (fromPort.dataType === "asset" && toPort.dataType === "video") {
        return true;
    }
    if (fromPort.dataType === "video" && toPort.dataType === "asset") {
        return true;
    }
    if (fromPort.dataType === "source" && toPort.dataType === "video") {
        return true;
    }
    return false;
}

function selectWorkspaceConnectionPorts(input: {
    graph: WorkspaceGraph;
    fromTemplate: WorkspaceNodeTemplate;
    toTemplate: WorkspaceNodeTemplate;
    toNodeId: string;
}) {
    const occupiedInputPorts = new Set(
        input.graph.edges
            .filter((edge) => edge.toNodeId === input.toNodeId)
            .map((edge) => edge.toPortId),
    );

    for (const fromPort of input.fromTemplate.outputPorts) {
        for (const toPort of input.toTemplate.inputPorts) {
            if (occupiedInputPorts.has(toPort.id)) continue;
            if (areWorkspacePortsCompatible(fromPort, toPort)) {
                return { fromPort, toPort };
            }
        }
    }

    const fromPort = input.fromTemplate.outputPorts[0];
    const toPort =
        input.toTemplate.inputPorts.find(
            (port) => !occupiedInputPorts.has(port.id),
        ) ?? input.toTemplate.inputPorts[0];

    return fromPort && toPort ? { fromPort, toPort } : null;
}

export function moveWorkspaceNode(
    graph: WorkspaceGraph,
    nodeId: string,
    position: WorkspaceNodeInstance["position"],
): WorkspaceGraph {
    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        nodes: graph.nodes.map((node) =>
            node.id === nodeId
                ? {
                      ...node,
                      position: {
                          x: Math.max(0, Math.round(position.x)),
                          y: Math.max(0, Math.round(position.y)),
                      },
                  }
                : node,
        ),
    };
}

export function validateWorkspaceConnection(
    graph: WorkspaceGraph,
    fromNodeId: string,
    toNodeId: string,
): WorkspaceConnectionValidation {
    if (fromNodeId === toNodeId) {
        return {
            ok: false,
            error: "Không thể nối một node vào chính nó.",
        };
    }

    const fromNode = graph.nodes.find((node) => node.id === fromNodeId);
    const toNode = graph.nodes.find((node) => node.id === toNodeId);

    if (!fromNode || !toNode) {
        return {
            ok: false,
            error: "Không thể nối vì node nguồn hoặc node đích không còn tồn tại.",
        };
    }

    const fromTemplate = getWorkspaceNodeTemplate(fromNode.templateNodeType);
    const toTemplate = getWorkspaceNodeTemplate(toNode.templateNodeType);

    if (!fromTemplate || !toTemplate) {
        return {
            ok: false,
            error: "Không thể nối vì node template chưa được đăng ký.",
        };
    }

    const selectedPorts = selectWorkspaceConnectionPorts({
        graph,
        fromTemplate,
        toTemplate,
        toNodeId,
    });
    const fromPort = selectedPorts?.fromPort;
    const toPort = selectedPorts?.toPort;

    if (!fromPort || !toPort) {
        return {
            ok: false,
            error: "Node này thiếu cổng input/output phù hợp. Hãy chọn một node có output và một node có input.",
        };
    }

    const edgeId = `${fromNodeId}:${fromPort.id}->${toNodeId}:${toPort.id}`;

    return { ok: true };
}

export function connectWorkspaceNodes(
    graph: WorkspaceGraph,
    fromNodeId: string,
    toNodeId: string,
): WorkspaceGraph {
    if (
        graph.edges.some(
            (edge) =>
                edge.fromNodeId === fromNodeId && edge.toNodeId === toNodeId,
        )
    ) {
        return graph;
    }

    const validation = validateWorkspaceConnection(graph, fromNodeId, toNodeId);

    if (!validation.ok) {
        throw new Error(validation.error ?? "Cannot connect workspace nodes.");
    }

    const fromNode = graph.nodes.find((node) => node.id === fromNodeId);
    const toNode = graph.nodes.find((node) => node.id === toNodeId);
    const fromTemplate = fromNode
        ? getWorkspaceNodeTemplate(fromNode.templateNodeType)
        : undefined;
    const toTemplate = toNode
        ? getWorkspaceNodeTemplate(toNode.templateNodeType)
        : undefined;
    const selectedPorts =
        fromTemplate && toTemplate
            ? selectWorkspaceConnectionPorts({
                  graph,
                  fromTemplate,
                  toTemplate,
                  toNodeId,
              })
            : null;
    const fromPort = selectedPorts?.fromPort;
    const toPort = selectedPorts?.toPort;

    if (!fromNode || !toNode || !fromPort || !toPort) {
        throw new Error("Cannot connect workspace nodes.");
    }

    const edgeId = `${fromNodeId}:${fromPort.id}->${toNodeId}:${toPort.id}`;

    if (graph.edges.some((edge) => edge.id === edgeId)) {
        return graph;
    }

    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        edges: [
            ...graph.edges,
            {
                id: edgeId,
                fromNodeId,
                fromPortId: fromPort.id,
                toNodeId,
                toPortId: toPort.id,
            },
        ],
    };
}

export function validateWorkspaceGraph(
    graph: WorkspaceGraph,
): WorkspaceGraphValidation {
    const errors: string[] = [];
    const nodeIds = new Set(graph.nodes.map((node) => node.id));

    for (const node of graph.nodes) {
        if (!getWorkspaceNodeTemplate(node.templateNodeType)) {
            errors.push(`Unknown node template: ${node.templateNodeType}`);
        }
    }

    for (const edge of graph.edges) {
        if (!nodeIds.has(edge.fromNodeId)) {
            errors.push(`Missing edge source node: ${edge.fromNodeId}`);
        }
        if (!nodeIds.has(edge.toNodeId)) {
            errors.push(`Missing edge target node: ${edge.toNodeId}`);
        }
    }

    if (graph.selectedNodeId && !nodeIds.has(graph.selectedNodeId)) {
        errors.push(`Selected node does not exist: ${graph.selectedNodeId}`);
    }

    return {
        ok: errors.length === 0,
        errors,
    };
}

export function updateWorkspaceNodeConfig(
    graph: WorkspaceGraph,
    nodeId: string,
    patch: WorkspaceNodeInstance["config"],
): WorkspaceGraph {
    return {
        ...graph,
        updatedAt: new Date().toISOString(),
        nodes: graph.nodes.map((node) =>
            node.id === nodeId
                ? { ...node, config: { ...node.config, ...patch } }
                : node,
        ),
    };
}

function detectGraphCycle(graph: WorkspaceGraph): string[] {
    const inDegree = new Map<string, number>();
    for (const node of graph.nodes) {
        inDegree.set(node.id, 0);
    }
    for (const edge of graph.edges) {
        if (inDegree.has(edge.toNodeId)) {
            inDegree.set(edge.toNodeId, (inDegree.get(edge.toNodeId) ?? 0) + 1);
        }
    }

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
        if (degree === 0) {
            queue.push(nodeId);
        }
    });

    const sorted: string[] = [];
    while (queue.length > 0) {
        const current = queue.shift() as string;
        sorted.push(current);
        for (const edge of graph.edges) {
            if (edge.fromNodeId !== current) continue;
            const next = inDegree.get(edge.toNodeId);
            if (next === undefined) continue;
            const reduced = next - 1;
            inDegree.set(edge.toNodeId, reduced);
            if (reduced === 0) {
                queue.push(edge.toNodeId);
            }
        }
    }

    if (sorted.length !== graph.nodes.length) {
        return graph.nodes
            .map((node) => node.id)
            .filter((id) => !sorted.includes(id));
    }

    return [];
}

function findUpstreamProducer(
    graph: WorkspaceGraph,
    targetNodeId: string,
    producers: Set<string>,
): string | undefined {
    const visited = new Set<string>();
    const stack = graph.edges
        .filter((edge) => edge.toNodeId === targetNodeId)
        .map((edge) => edge.fromNodeId);

    while (stack.length > 0) {
        const current = stack.pop() as string;
        if (visited.has(current)) continue;
        visited.add(current);
        if (producers.has(current)) {
            return current;
        }
        for (const edge of graph.edges) {
            if (edge.toNodeId === current && !visited.has(edge.fromNodeId)) {
                stack.push(edge.fromNodeId);
            }
        }
    }

    return undefined;
}

function findUpstreamLocalSaveProducer(
    graph: WorkspaceGraph,
    targetNodeId: string,
    assetProducers: Set<string>,
    artifactProducers: Set<string>,
): string | undefined {
    const visited = new Set<string>();
    const stack = graph.edges
        .filter((edge) => edge.toNodeId === targetNodeId)
        .map((edge) => edge.fromNodeId);

    while (stack.length > 0) {
        const current = stack.pop() as string;
        if (visited.has(current)) continue;
        visited.add(current);
        if (assetProducers.has(current) || artifactProducers.has(current)) {
            return current;
        }
        for (const edge of graph.edges) {
            if (edge.toNodeId === current && !visited.has(edge.fromNodeId)) {
                stack.push(edge.fromNodeId);
            }
        }
    }

    return undefined;
}

export function planWorkspaceFlow(graph: WorkspaceGraph): WorkspaceFlowPlan {
    const errors: string[] = [];
    const baseValidation = validateWorkspaceGraph(graph);
    if (!baseValidation.ok) {
        return { ok: false, steps: [], errors: baseValidation.errors };
    }

    const cycleNodes = detectGraphCycle(graph);
    if (cycleNodes.length > 0) {
        errors.push(`Flow chứa cycle giữa các node: ${cycleNodes.join(", ")}.`);
    }

    const fileSourceNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "source.file",
    );
    const urlSourceNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "source.url",
    );
    const assetSourceNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "source.asset",
    );
    const storageNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "storage.upload",
    );
    const transcriptionNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "audio.chinese-transcribe",
    );
    const translationNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "text.translate-transcript",
    );
    const metadataNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "text.generate-vi-metadata",
    );
    const voiceNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "audio.voice-generation",
    );
    const preprocessNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "video.preprocess",
    );
    const dubbingNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "audio.video-dubbing",
    );
    const vipNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "video.vip-processing",
    );
    const editNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "edit.mask-region",
    );
    const mirrorNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "edit.mirror",
    );
    const publishNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "social.publish",
    );
    const downloadNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "output.download-local",
    );
    const cleanupNodes = graph.nodes.filter(
        (node) => node.templateNodeType === "cleanup.delete-assets",
    );

    const consumedStorageByFile = new Map<string, string>();
    const consumedStorageByArtifact = new Map<string, string>();
    const fileToStorage = new Map<string, string>();
    const urlToStorage = new Map<string, string>();
    const artifactToStorage = new Map<string, string>();

    for (const fileNode of fileSourceNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        const downstreamTranscription = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "audio.chinese-transcribe",
            );
        const downstreamDubbing = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "audio.video-dubbing",
            );
        const downstreamPreprocess = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "video.preprocess",
            );
        const downstreamMirror = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "edit.mirror",
            );
        const downstreamEdit = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "edit.mask-region",
            );
        const downstreamVip = graph.edges
            .filter((edge) => edge.fromNodeId === fileNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "video.vip-processing",
            );

        if (
            downstreamStorage.length === 0 &&
            downstreamTranscription.length === 0 &&
            downstreamPreprocess.length === 0 &&
            downstreamDubbing.length === 0 &&
            downstreamMirror.length === 0 &&
            downstreamEdit.length === 0 &&
            downstreamVip.length === 0
        ) {
            errors.push(
                `Upload Video '${fileNode.label}' (${fileNode.id}) cần nối tới Save to Storage, Video Preprocess, Audio Transcript, Video Dubbing, VIP Processing, Mirror Video hoặc Mask Logo/Subtitles downstream.`,
            );
            continue;
        }
        if (downstreamStorage.length === 0) {
            continue;
        }
        if (downstreamStorage.length > 1) {
            errors.push(
                `Upload Video '${fileNode.label}' (${fileNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (consumedStorageByFile.has(storageNode.id)) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều Upload Video; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByFile.set(storageNode.id, fileNode.id);
        fileToStorage.set(fileNode.id, storageNode.id);
    }

    for (const urlNode of urlSourceNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );
        const downstreamTranscription = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "audio.chinese-transcribe",
            );
        const downstreamDubbing = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "audio.video-dubbing",
            );
        const downstreamPreprocess = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "video.preprocess",
            );
        const downstreamMirror = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "edit.mirror",
            );
        const downstreamEdit = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "edit.mask-region",
            );
        const downstreamVip = graph.edges
            .filter((edge) => edge.fromNodeId === urlNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "video.vip-processing",
            );
        if (
            downstreamStorage.length === 0 &&
            downstreamTranscription.length === 0 &&
            downstreamPreprocess.length === 0 &&
            downstreamDubbing.length === 0 &&
            downstreamMirror.length === 0 &&
            downstreamEdit.length === 0 &&
            downstreamVip.length === 0
        ) {
            errors.push(
                `URL Video '${urlNode.label}' (${urlNode.id}) cần nối tới Save to Storage, Video Preprocess, Audio Transcript, Video Dubbing, VIP Processing, Mirror Video hoặc Mask Logo/Subtitles downstream.`,
            );
            continue;
        }
        if (downstreamStorage.length === 0) {
            continue;
        }
        if (downstreamStorage.length > 1) {
            errors.push(
                `URL Video '${urlNode.label}' (${urlNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (consumedStorageByFile.has(storageNode.id)) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều source node; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByFile.set(storageNode.id, urlNode.id);
        urlToStorage.set(urlNode.id, storageNode.id);
    }

    for (const preprocessNode of preprocessNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === preprocessNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        if (downstreamStorage.length === 0) continue;
        if (downstreamStorage.length > 1) {
            errors.push(
                `Video Preprocess '${preprocessNode.label}' (${preprocessNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều producer; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByArtifact.set(storageNode.id, preprocessNode.id);
        artifactToStorage.set(preprocessNode.id, storageNode.id);
    }

    for (const dubbingNode of dubbingNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === dubbingNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        if (downstreamStorage.length === 0) continue;
        if (downstreamStorage.length > 1) {
            errors.push(
                `Video Dubbing '${dubbingNode.label}' (${dubbingNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều producer; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByArtifact.set(storageNode.id, dubbingNode.id);
        artifactToStorage.set(dubbingNode.id, storageNode.id);
    }

    for (const vipNode of vipNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === vipNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        if (downstreamStorage.length === 0) continue;
        if (downstreamStorage.length > 1) {
            errors.push(
                `VIP Processing '${vipNode.label}' (${vipNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều producer; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByArtifact.set(storageNode.id, vipNode.id);
        artifactToStorage.set(vipNode.id, storageNode.id);
    }

    for (const mirrorNode of mirrorNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === mirrorNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        if (downstreamStorage.length === 0) continue;
        if (downstreamStorage.length > 1) {
            errors.push(
                `Mirror Video '${mirrorNode.label}' (${mirrorNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều producer; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByArtifact.set(storageNode.id, mirrorNode.id);
        artifactToStorage.set(mirrorNode.id, storageNode.id);
    }

    for (const editNode of editNodes) {
        const downstreamStorage = graph.edges
            .filter((edge) => edge.fromNodeId === editNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.toNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "storage.upload",
            );

        if (downstreamStorage.length === 0) continue;
        if (downstreamStorage.length > 1) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) đang nối tới nhiều Save to Storage; backend hiện chỉ hỗ trợ 1.`,
            );
            continue;
        }
        const storageNode = downstreamStorage[0];
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) đang nhận từ nhiều producer; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        consumedStorageByArtifact.set(storageNode.id, editNode.id);
        artifactToStorage.set(editNode.id, storageNode.id);
    }

    const producers = new Set<string>();
    const producerSteps: WorkspaceFlowStep[] = [];

    for (const fileNode of fileSourceNodes) {
        const storageId = fileToStorage.get(fileNode.id);
        if (!storageId) continue;
        producers.add(storageId);
        producerSteps.push({
            kind: "upload-and-store",
            sourceFileNodeId: fileNode.id,
            storageNodeId: storageId,
            producerNodeId: storageId,
        });
    }
    for (const urlNode of urlSourceNodes) {
        const storageId = urlToStorage.get(urlNode.id);
        if (!storageId) continue;
        producers.add(storageId);
        producerSteps.push({
            kind: "intake-url-and-store",
            sourceUrlNodeId: urlNode.id,
            storageNodeId: storageId,
            producerNodeId: storageId,
        });
    }

    for (const assetNode of assetSourceNodes) {
        producers.add(assetNode.id);
        producerSteps.push({
            kind: "use-existing-asset",
            nodeId: assetNode.id,
            producerNodeId: assetNode.id,
        });
    }

    const artifactProducers = new Set<string>();
    const preprocessSteps: WorkspaceFlowStep[] = [];
    for (const preprocessNode of preprocessNodes) {
        const upstreamSources = graph.edges
            .filter((edge) => edge.toNodeId === preprocessNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "source.asset" ||
                        node.templateNodeType === "video.preprocess"),
            );

        if (upstreamSources.length === 0) {
            errors.push(
                `Video Preprocess '${preprocessNode.label}' (${preprocessNode.id}) cần upstream Upload Video, URL Video hoặc Storage Asset.`,
            );
            continue;
        }
        if (upstreamSources.length > 1) {
            errors.push(
                `Video Preprocess '${preprocessNode.label}' (${preprocessNode.id}) đang nhận nhiều video source; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        preprocessSteps.push({
            kind: "preprocess-video",
            sourceNodeId: upstreamSources[0].id,
            preprocessNodeId: preprocessNode.id,
        });
        artifactProducers.add(preprocessNode.id);
    }

    const transcriptionSteps: WorkspaceFlowStep[] = [];
    const transcriptionProducers = new Set<string>();
    for (const transcriptionNode of transcriptionNodes) {
        const upstreamMedia = graph.edges
            .filter((edge) => edge.toNodeId === transcriptionNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "source.asset" ||
                        node.templateNodeType === "video.preprocess"),
            );

        if (upstreamMedia.length === 0) {
            errors.push(
                `Audio Transcript '${transcriptionNode.label}' (${transcriptionNode.id}) cần upstream Upload Video, URL Video, Storage Asset hoặc Video Preprocess.`,
            );
            continue;
        }
        if (upstreamMedia.length > 1) {
            errors.push(
                `Audio Transcript '${transcriptionNode.label}' (${transcriptionNode.id}) đang nhận nhiều source video; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        const upstreamSource = upstreamMedia[0];
        if (
            upstreamSource.templateNodeType === "video.preprocess" &&
            !artifactProducers.has(upstreamSource.id)
        ) {
            errors.push(
                `Audio Transcript '${transcriptionNode.label}' (${transcriptionNode.id}) cần Video Preprocess upstream chạy được.`,
            );
            continue;
        }
        transcriptionSteps.push({
            kind: "transcribe-chinese",
            sourceNodeId: upstreamSource.id,
            transcriptionNodeId: transcriptionNode.id,
        });
        transcriptionProducers.add(transcriptionNode.id);
    }

    const translationSteps: WorkspaceFlowStep[] = [];
    const translationProducers = new Set<string>();
    for (const translationNode of translationNodes) {
        const upstreamTranscriptions = graph.edges
            .filter((edge) => edge.toNodeId === translationNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "audio.chinese-transcribe",
            );

        if (upstreamTranscriptions.length === 0) {
            errors.push(
                `Translate Transcript '${translationNode.label}' (${translationNode.id}) cần upstream Audio Transcript.`,
            );
            continue;
        }
        if (upstreamTranscriptions.length > 1) {
            errors.push(
                `Translate Transcript '${translationNode.label}' (${translationNode.id}) đang nhận nhiều Audio Transcript; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        if (!transcriptionProducers.has(upstreamTranscriptions[0].id)) {
            errors.push(
                `Translate Transcript '${translationNode.label}' (${translationNode.id}) cần Audio Transcript upstream chạy được.`,
            );
            continue;
        }
        translationSteps.push({
            kind: "translate-transcript",
            transcriptionNodeId: upstreamTranscriptions[0].id,
            translationNodeId: translationNode.id,
        });
        translationProducers.add(translationNode.id);
    }

    const voiceSteps: WorkspaceFlowStep[] = [];
    for (const voiceNode of voiceNodes) {
        const upstreamTranslations = graph.edges
            .filter((edge) => edge.toNodeId === voiceNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "text.translate-transcript",
            );

        if (upstreamTranslations.length === 0) {
            errors.push(
                `Voice Generation '${voiceNode.label}' (${voiceNode.id}) cần upstream Translate Transcript.`,
            );
            continue;
        }
        if (upstreamTranslations.length > 1) {
            errors.push(
                `Voice Generation '${voiceNode.label}' (${voiceNode.id}) đang nhận nhiều Translate Transcript; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        if (!translationProducers.has(upstreamTranslations[0].id)) {
            errors.push(
                `Voice Generation '${voiceNode.label}' (${voiceNode.id}) cần Translate Transcript upstream chạy được.`,
            );
            continue;
        }
        voiceSteps.push({
            kind: "generate-voice",
            transcriptionNodeId:
                translationSteps.find(
                    (
                        step,
                    ): step is Extract<
                        WorkspaceFlowStep,
                        { kind: "translate-transcript" }
                    > =>
                        step.kind === "translate-transcript" &&
                        step.translationNodeId === upstreamTranslations[0].id,
                )?.transcriptionNodeId ?? "",
            translationNodeId: upstreamTranslations[0].id,
            voiceNodeId: voiceNode.id,
        });
    }

    const dubbingSteps: WorkspaceFlowStep[] = [];
    const dubbingProducers = new Set<string>();
    for (const dubbingNode of dubbingNodes) {
        const upstreamSources = graph.edges
            .filter((edge) => edge.toNodeId === dubbingNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "source.asset" ||
                        node.templateNodeType === "video.preprocess"),
            );

        if (upstreamSources.length === 0) {
            errors.push(
                `Video Dubbing '${dubbingNode.label}' (${dubbingNode.id}) cần upstream Upload Video, URL Video, Storage Asset hoặc Video Preprocess.`,
            );
            continue;
        }
        if (upstreamSources.length > 1) {
            errors.push(
                `Video Dubbing '${dubbingNode.label}' (${dubbingNode.id}) đang nhận nhiều source; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        if (
            upstreamSources[0].templateNodeType === "video.preprocess" &&
            !artifactProducers.has(upstreamSources[0].id)
        ) {
            errors.push(
                `Video Dubbing '${dubbingNode.label}' (${dubbingNode.id}) cần Video Preprocess upstream chạy được.`,
            );
            continue;
        }
        dubbingSteps.push({
            kind: "dub-video",
            sourceNodeId: upstreamSources[0].id,
            dubbingNodeId: dubbingNode.id,
        });
        dubbingProducers.add(dubbingNode.id);
        artifactProducers.add(dubbingNode.id);
    }

    const vipSteps: WorkspaceFlowStep[] = [];
    for (const vipNode of vipNodes) {
        const upstreamSources = graph.edges
            .filter((edge) => edge.toNodeId === vipNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "source.asset" ||
                        node.templateNodeType === "video.preprocess"),
            );

        if (upstreamSources.length === 0) {
            errors.push(
                `VIP Processing '${vipNode.label}' (${vipNode.id}) cần upstream Upload Video, URL Video, Storage Asset hoặc Video Preprocess.`,
            );
            continue;
        }
        if (upstreamSources.length > 1) {
            errors.push(
                `VIP Processing '${vipNode.label}' (${vipNode.id}) đang nhận nhiều source; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        if (
            upstreamSources[0].templateNodeType === "video.preprocess" &&
            !artifactProducers.has(upstreamSources[0].id)
        ) {
            errors.push(
                `VIP Processing '${vipNode.label}' (${vipNode.id}) cần Video Preprocess upstream chạy được.`,
            );
            continue;
        }
        vipSteps.push({
            kind: "vip-process-video",
            sourceNodeId: upstreamSources[0].id,
            vipNodeId: vipNode.id,
        });
        artifactProducers.add(vipNode.id);
    }

    const metadataSteps: WorkspaceFlowStep[] = [];
    for (const metadataNode of metadataNodes) {
        const upstreamTranslations = graph.edges
            .filter(
                (edge) =>
                    edge.toNodeId === metadataNode.id &&
                    edge.toPortId === "transcript",
            )
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "text.translate-transcript" ||
                        node.templateNodeType === "audio.video-dubbing"),
            );
        if (upstreamTranslations.length === 0) {
            errors.push(
                `Generate VI Metadata '${metadataNode.label}' (${metadataNode.id}) cần upstream Translate Transcript hoặc Video Dubbing.`,
            );
            continue;
        }
        if (upstreamTranslations.length > 1) {
            errors.push(
                `Generate VI Metadata '${metadataNode.label}' (${metadataNode.id}) đang nhận nhiều nguồn transcript; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        const upstreamTranslation = upstreamTranslations[0];
        const translationReady =
            upstreamTranslation.templateNodeType === "text.translate-transcript"
                ? translationProducers.has(upstreamTranslation.id)
                : dubbingProducers.has(upstreamTranslation.id);
        if (!translationReady) {
            errors.push(
                `Generate VI Metadata '${metadataNode.label}' (${metadataNode.id}) cần transcript upstream chạy được.`,
            );
            continue;
        }
        metadataSteps.push({
            kind: "generate-vi-metadata",
            translationNodeId: upstreamTranslation.id,
            metadataNodeId: metadataNode.id,
        });
    }

    const mirrorSteps: WorkspaceFlowStep[] = [];
    for (const mirrorNode of mirrorNodes) {
        const upstreamSources = graph.edges
            .filter((edge) => edge.toNodeId === mirrorNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "audio.video-dubbing" ||
                        node.templateNodeType === "video.preprocess"),
            );

        if (upstreamSources.length === 0) {
            errors.push(
                `Mirror Video '${mirrorNode.label}' (${mirrorNode.id}) cần upstream Upload Video, URL Video, Video Preprocess hoặc Video Dubbing.`,
            );
            continue;
        }
        if (upstreamSources.length > 1) {
            errors.push(
                `Mirror Video '${mirrorNode.label}' (${mirrorNode.id}) đang nhận nhiều video source; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        const upstreamSource = upstreamSources[0];
        if (
            (upstreamSource.templateNodeType === "audio.video-dubbing" ||
                upstreamSource.templateNodeType === "video.preprocess") &&
            !artifactProducers.has(upstreamSource.id)
        ) {
            errors.push(
                `Mirror Video '${mirrorNode.label}' (${mirrorNode.id}) cần Video Dubbing upstream chạy được.`,
            );
            continue;
        }
        mirrorSteps.push({
            kind: "mirror-video",
            sourceNodeId: upstreamSource.id,
            mirrorNodeId: mirrorNode.id,
        });
        artifactProducers.add(mirrorNode.id);
    }

    const editSteps: WorkspaceFlowStep[] = [];
    for (const editNode of editNodes) {
        const upstreamVideos = graph.edges
            .filter(
                (edge) =>
                    edge.toNodeId === editNode.id && edge.toPortId === "video",
            )
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "source.file" ||
                        node.templateNodeType === "source.url" ||
                        node.templateNodeType === "video.preprocess" ||
                        node.templateNodeType === "audio.video-dubbing" ||
                        node.templateNodeType === "edit.mirror"),
            );
        const upstreamTranslations = graph.edges
            .filter(
                (edge) =>
                    edge.toNodeId === editNode.id &&
                    edge.toPortId === "transcript",
            )
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    (node.templateNodeType === "text.translate-transcript" ||
                        node.templateNodeType === "audio.video-dubbing"),
            );

        if (upstreamVideos.length === 0) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) cần upstream Upload Video, URL Video, Video Preprocess, Video Dubbing hoặc Mirror Video.`,
            );
            continue;
        }
        if (upstreamVideos.length > 1) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) đang nhận nhiều video source; chưa hỗ trợ fan-in.`,
            );
            continue;
        }
        if (upstreamTranslations.length > 1) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) đang nhận nhiều nguồn transcript; chưa hỗ trợ fan-in.`,
            );
            continue;
        }

        const upstreamVideo = upstreamVideos[0];
        if (
            upstreamVideo.templateNodeType !== "source.file" &&
            upstreamVideo.templateNodeType !== "source.url" &&
            !artifactProducers.has(upstreamVideo.id)
        ) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) cần video artifact upstream chạy được.`,
            );
            continue;
        }

        const upstreamTranslation = upstreamTranslations[0] ?? upstreamVideo;
        if (
            upstreamTranslations.length === 0 &&
            upstreamVideo.templateNodeType !== "audio.video-dubbing"
        ) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) cần upstream Translate Transcript hoặc Video Dubbing có translation để đè phụ đề tiếng Việt.`,
            );
            continue;
        }
        const translationReady =
            upstreamTranslations.length === 0
                ? true
                : upstreamTranslation.templateNodeType ===
                    "text.translate-transcript"
                  ? translationProducers.has(upstreamTranslation.id)
                  : dubbingProducers.has(upstreamTranslation.id);
        if (upstreamTranslations.length > 0 && !translationReady) {
            errors.push(
                `Mask Logo/Subtitles '${editNode.label}' (${editNode.id}) cần transcript upstream chạy được.`,
            );
            continue;
        }

        editSteps.push({
            kind: "edit-video",
            sourceNodeId: upstreamVideo.id,
            editNodeId: editNode.id,
            translationNodeId: upstreamTranslation.id,
        });
        artifactProducers.add(editNode.id);
    }

    for (const storageNode of storageNodes) {
        if (
            consumedStorageByFile.has(storageNode.id) ||
            consumedStorageByArtifact.has(storageNode.id)
        ) {
            continue;
        }
        const upstream = graph.edges.filter(
            (edge) => edge.toNodeId === storageNode.id,
        );
        if (upstream.length === 0) {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) cần input từ Upload Video hoặc generated video artifact.`,
            );
        } else {
            errors.push(
                `Save to Storage '${storageNode.label}' (${storageNode.id}) hiện chỉ hỗ trợ upstream là Upload Video hoặc generated video artifact.`,
            );
        }
    }

    const artifactStorageSteps: WorkspaceFlowStep[] = [];
    for (const [artifactNodeId, storageNodeId] of artifactToStorage.entries()) {
        if (!artifactProducers.has(artifactNodeId)) {
            errors.push(
                `Save to Storage '${storageNodeId}' cần generated video artifact upstream chạy được.`,
            );
            continue;
        }
        producers.add(storageNodeId);
        artifactStorageSteps.push({
            kind: "store-artifact",
            artifactNodeId,
            storageNodeId,
            producerNodeId: storageNodeId,
        });
    }

    const publishSteps: Extract<WorkspaceFlowStep, { kind: "publish" }>[] = [];
    for (const publishNode of publishNodes) {
        const producer = findUpstreamProducer(graph, publishNode.id, producers);
        if (!producer) {
            errors.push(
                `Publish Social '${publishNode.label}' (${publishNode.id}) cần upstream Storage Asset hoặc Save to Storage.`,
            );
            continue;
        }
        publishSteps.push({
            kind: "publish",
            publishNodeId: publishNode.id,
            producerNodeId: producer,
        });
    }

    const downloadSteps: Extract<
        WorkspaceFlowStep,
        { kind: "download-local" }
    >[] = [];
    for (const downloadNode of downloadNodes) {
        const producer = findUpstreamLocalSaveProducer(
            graph,
            downloadNode.id,
            producers,
            artifactProducers,
        );
        if (!producer) {
            errors.push(
                `Save to Local '${downloadNode.label}' (${downloadNode.id}) cần upstream Storage Asset, Save to Storage hoặc generated video artifact.`,
            );
            continue;
        }
        downloadSteps.push({
            kind: "download-local",
            downloadNodeId: downloadNode.id,
            producerNodeId: producer,
        });
    }

    const cleanupSteps: WorkspaceFlowStep[] = [];
    for (const cleanupNode of cleanupNodes) {
        const directUpstreamPublishNodes = graph.edges
            .filter((edge) => edge.toNodeId === cleanupNode.id)
            .map((edge) =>
                graph.nodes.find((node) => node.id === edge.fromNodeId),
            )
            .filter(
                (node): node is WorkspaceNodeInstance =>
                    node !== undefined &&
                    node.templateNodeType === "social.publish",
            );
        if (directUpstreamPublishNodes.length > 1) {
            errors.push(
                `Cleanup Assets '${cleanupNode.label}' (${cleanupNode.id}) đang nhận nhiều Publish Social; chưa hỗ trợ fan-in.`,
            );
            continue;
        }

        const publishNodeId = directUpstreamPublishNodes[0]?.id;
        const producerNodeId = publishNodeId
            ? publishSteps.find((step) => step.publishNodeId === publishNodeId)
                  ?.producerNodeId
            : findUpstreamProducer(graph, cleanupNode.id, producers);

        if (!producerNodeId && !publishNodeId) {
            errors.push(
                `Cleanup Assets '${cleanupNode.label}' (${cleanupNode.id}) cần upstream Save to Storage, Storage Asset hoặc Publish Social.`,
            );
            continue;
        }
        if (publishNodeId && !producerNodeId) {
            errors.push(
                `Cleanup Assets '${cleanupNode.label}' (${cleanupNode.id}) cần Publish Social upstream chạy được.`,
            );
            continue;
        }

        cleanupSteps.push({
            kind: "cleanup-assets",
            cleanupNodeId: cleanupNode.id,
            producerNodeId,
            publishNodeId,
        });
    }

    if (
        producerSteps.length === 0 &&
        preprocessSteps.length === 0 &&
        transcriptionSteps.length === 0 &&
        translationSteps.length === 0 &&
        voiceSteps.length === 0 &&
        metadataSteps.length === 0 &&
        dubbingSteps.length === 0 &&
        vipSteps.length === 0 &&
        mirrorSteps.length === 0 &&
        editSteps.length === 0 &&
        artifactStorageSteps.length === 0 &&
        publishSteps.length === 0 &&
        downloadSteps.length === 0 &&
        cleanupSteps.length === 0 &&
        errors.length === 0
    ) {
        errors.push(
            "Flow cần ít nhất một input chạy thật: Upload Video, Storage Asset,...",
        );
    }

    return {
        ok: errors.length === 0,
        steps: [
            ...producerSteps,
            ...preprocessSteps,
            ...transcriptionSteps,
            ...translationSteps,
            ...voiceSteps,
            ...dubbingSteps,
            ...vipSteps,
            ...metadataSteps,
            ...mirrorSteps,
            ...editSteps,
            ...artifactStorageSteps,
            ...publishSteps,
            ...downloadSteps,
            ...cleanupSteps,
        ],
        errors,
    };
}

export function getWorkspaceExecutableUploadToSocialPlan(
    graph: WorkspaceGraph,
): WorkspaceExecutableUploadToSocialPlan {
    const plan = planWorkspaceFlow(graph);
    if (!plan.ok) {
        return {
            ok: false,
            error: plan.errors[0] ?? "Flow hiện tại chưa có path chạy được.",
        };
    }

    const uploadStep = plan.steps.find(
        (
            step,
        ): step is Extract<WorkspaceFlowStep, { kind: "upload-and-store" }> =>
            step.kind === "upload-and-store",
    );
    const assetStep = plan.steps.find(
        (
            step,
        ): step is Extract<WorkspaceFlowStep, { kind: "use-existing-asset" }> =>
            step.kind === "use-existing-asset",
    );
    const publishStep = plan.steps.find(
        (step): step is Extract<WorkspaceFlowStep, { kind: "publish" }> =>
            step.kind === "publish",
    );

    if (uploadStep && publishStep) {
        return {
            ok: true,
            mode: "upload-to-social",
            sourceNodeId: uploadStep.sourceFileNodeId,
            storageNodeId: uploadStep.storageNodeId,
            publishNodeId: publishStep.publishNodeId,
        };
    }
    if (uploadStep) {
        return {
            ok: true,
            mode: "upload-to-storage",
            sourceNodeId: uploadStep.sourceFileNodeId,
            storageNodeId: uploadStep.storageNodeId,
        };
    }
    if (assetStep && publishStep) {
        return {
            ok: true,
            mode: "asset-to-social",
            sourceNodeId: assetStep.nodeId,
            publishNodeId: publishStep.publishNodeId,
        };
    }

    return {
        ok: false,
        error: "Flow hiện tại chưa có path chạy được.",
    };
}

export function serializeWorkspaceDraft(graph: WorkspaceGraph): string {
    return JSON.stringify({
        ...graph,
        updatedAt: new Date().toISOString(),
    });
}

function isWorkspaceGraph(value: unknown): value is WorkspaceGraph {
    if (!value || typeof value !== "object") {
        return false;
    }

    const graph = value as Partial<WorkspaceGraph>;
    return (
        graph.version === 1 &&
        typeof graph.draftId === "string" &&
        typeof graph.title === "string" &&
        Array.isArray(graph.nodes) &&
        Array.isArray(graph.edges)
    );
}

export function parseWorkspaceDraft(raw: string | null): WorkspaceGraph {
    if (!raw) {
        return createEmptyWorkspaceGraph("Workspace Draft");
    }

    try {
        const parsed = JSON.parse(raw) as unknown;

        if (!isWorkspaceGraph(parsed)) {
            return createEmptyWorkspaceGraph("Workspace Draft");
        }

        const validation = validateWorkspaceGraph(parsed);
        if (!validation.ok) {
            return createEmptyWorkspaceGraph("Workspace Draft");
        }

        return parsed;
    } catch {
        return createEmptyWorkspaceGraph("Workspace Draft");
    }
}

export function createDouyinReworkSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    const nodes: WorkspaceNodeInstance[] = [
        {
            id: "source-url-1",
            templateNodeType: "source.url",
            label: "Douyin source",
            position: { x: 48, y: 96 },
            config: { ownershipStatus: "unknown" },
        },
        {
            id: "edit-mask-region-1",
            templateNodeType: "edit.mask-region",
            label: "Blur Chinese subtitles/logo",
            position: { x: 300, y: 96 },
            config: { blurStrength: 50 },
        },
        {
            id: "audio-extract-voice-1",
            templateNodeType: "audio.extract-voice",
            label: "Separate original voice",
            position: { x: 552, y: 96 },
            config: { mode: "separate" },
        },
        {
            id: "audio-voice-insert-1",
            templateNodeType: "audio.voice-insert",
            label: "Insert custom voice",
            position: { x: 804, y: 96 },
            config: { voiceProfile: "planned-voice", ducking: true },
        },
        {
            id: "edit-mirror-1",
            templateNodeType: "edit.mirror",
            label: "Mirror final video",
            position: { x: 1056, y: 96 },
            config: { axis: "horizontal" },
        },
        {
            id: "storage-upload-1",
            templateNodeType: "storage.upload",
            label: "Save to Drive/Telegram",
            position: { x: 1308, y: 96 },
            config: {},
        },
        {
            id: "social-publish-1",
            templateNodeType: "social.publish",
            label: "Publish to platforms",
            position: { x: 1560, y: 96 },
            config: { publishMode: "schedule" },
        },
    ];

    const edges: WorkspaceEdge[] = [
        "source-url-1->edit-mask-region-1",
        "edit-mask-region-1->audio-extract-voice-1",
        "audio-extract-voice-1->audio-voice-insert-1",
        "audio-voice-insert-1->edit-mirror-1",
        "edit-mirror-1->storage-upload-1",
        "storage-upload-1->social-publish-1",
    ].map((edge) => {
        const [fromNodeId, toNodeId] = edge.split("->");
        return {
            id: `${fromNodeId}:video->${toNodeId}:video`,
            fromNodeId,
            fromPortId: "video",
            toNodeId,
            toPortId: "video",
        };
    });

    return {
        version: 1,
        draftId: "douyin-rework-sample",
        title: "Douyin rework sample",
        updatedAt: now,
        selectedNodeId: "source-url-1",
        nodes,
        edges,
    };
}

export function createUploadToSocialSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    const nodes: WorkspaceNodeInstance[] = [
        {
            id: "source-file-1",
            templateNodeType: "source.file",
            label: "Upload source video",
            position: { x: 80, y: 120 },
            config: {},
        },
        {
            id: "storage-upload-1",
            templateNodeType: "storage.upload",
            label: "Save to storage",
            position: { x: 360, y: 120 },
            config: {},
        },
        {
            id: "social-publish-1",
            templateNodeType: "social.publish",
            label: "Publish now",
            position: { x: 640, y: 120 },
            config: { publishMode: "publish_now" },
        },
    ];

    return {
        version: 1,
        draftId: "upload-to-social-sample",
        title: "Upload to Social executable flow",
        updatedAt: now,
        selectedNodeId: "source-file-1",
        nodes,
        edges: [
            {
                id: "source-file-1:asset->storage-upload-1:asset",
                fromNodeId: "source-file-1",
                fromPortId: "asset",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
            {
                id: "storage-upload-1:asset->social-publish-1:asset",
                fromNodeId: "storage-upload-1",
                fromPortId: "asset",
                toNodeId: "social-publish-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createUploadToStorageSampleGraph(): WorkspaceGraph {
    const graph = createUploadToSocialSampleGraph();
    return {
        ...graph,
        draftId: "upload-to-storage-sample",
        title: "Upload to Storage executable flow",
        selectedNodeId: "source-file-1",
        nodes: graph.nodes.filter(
            (node) => node.templateNodeType !== "social.publish",
        ),
        edges: graph.edges.filter(
            (edge) => edge.toNodeId !== "social-publish-1",
        ),
    };
}

export function createAssetToSocialSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "asset-to-social-sample",
        title: "Existing Asset to Social executable flow",
        updatedAt: now,
        selectedNodeId: "source-asset-1",
        nodes: [
            {
                id: "source-asset-1",
                templateNodeType: "source.asset",
                label: "Storage Library asset",
                position: { x: 100, y: 140 },
                config: {},
            },
            {
                id: "social-publish-1",
                templateNodeType: "social.publish",
                label: "Publish now",
                position: { x: 400, y: 140 },
                config: { publishMode: "publish_now" },
            },
        ],
        edges: [
            {
                id: "source-asset-1:asset->social-publish-1:asset",
                fromNodeId: "source-asset-1",
                fromPortId: "asset",
                toNodeId: "social-publish-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createUploadDubbingToSocialSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "upload-dubbing-to-social-sample",
        title: "Upload -> Dubbing -> Storage -> Social",
        updatedAt: now,
        selectedNodeId: "source-file-1",
        nodes: [
            {
                id: "source-file-1",
                templateNodeType: "source.file",
                label: "Upload source video",
                position: { x: 80, y: 120 },
                config: {},
            },
            {
                id: "audio-video-dubbing-1",
                templateNodeType: "audio.video-dubbing",
                label: "Video dubbing ZH -> VI",
                position: { x: 360, y: 120 },
                config: {
                    language: "zh",
                    targetLanguage: "vi",
                    model: "cx/gpt-5.3-codex-low",
                    originalAudioVolume: 0,
                    voiceVolume: 1,
                    ttsPreserveTimestampGaps: true,
                    ttsAlignmentMode: "strict",
                },
            },
            {
                id: "storage-upload-1",
                templateNodeType: "storage.upload",
                label: "Save dubbed video",
                position: { x: 680, y: 120 },
                config: {},
            },
            {
                id: "social-publish-1",
                templateNodeType: "social.publish",
                label: "Publish dubbed video",
                position: { x: 980, y: 120 },
                config: {},
            },
        ],
        edges: [
            {
                id: "source-file-1:asset->audio-video-dubbing-1:asset",
                fromNodeId: "source-file-1",
                fromPortId: "asset",
                toNodeId: "audio-video-dubbing-1",
                toPortId: "asset",
            },
            {
                id: "audio-video-dubbing-1:asset->storage-upload-1:asset",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "asset",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
            {
                id: "storage-upload-1:asset->social-publish-1:asset",
                fromNodeId: "storage-upload-1",
                fromPortId: "asset",
                toNodeId: "social-publish-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createUploadVietnameseMaskPublishSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "upload-vi-mask-publish-sample",
        title: "Upload -> VI Voice -> Mask -> Storage -> Social",
        updatedAt: now,
        selectedNodeId: "source-file-1",
        nodes: [
            {
                id: "source-file-1",
                templateNodeType: "source.file",
                label: "Upload source video",
                position: { x: 80, y: 160 },
                config: {},
            },
            {
                id: "audio-video-dubbing-1",
                templateNodeType: "audio.video-dubbing",
                label: "Vietnamese Voice Dubbing",
                position: { x: 360, y: 160 },
                config: {
                    language: "zh",
                    targetLanguage: "vi",
                    model: "cx/gpt-5.3-codex-low",
                    originalAudioVolume: 0,
                    voiceVolume: 1,
                    ttsPreserveTimestampGaps: true,
                    ttsAlignmentMode: "strict",
                },
            },
            {
                id: "edit-mask-region-1",
                templateNodeType: "edit.mask-region",
                label: "Mask Logo/Subtitles",
                position: { x: 680, y: 160 },
                config: {
                    blurRegionsJson: "",
                    regionX: 0,
                    regionY: 84,
                    regionWidth: 100,
                    regionHeight: 16,
                    timelineStart: 0,
                    timelineEnd: 36000,
                    blurStrength: 50,
                    subtitleOverlayEnabled: true,
                    subtitleFontFamily: "Arial",
                    subtitleFontSize: 55,
                    subtitleMarginBottom: 150,
                    subtitleMarginLeft: 60,
                    subtitleMarginRight: 60,
                    subtitleAlignment: 2,
                    subtitleBackgroundEnabled: true,
                    subtitleBackgroundColor: "#000000",
                    subtitleBackgroundOpacity: 65,
                    mirrorEnabled: false,
                },
            },
            {
                id: "storage-upload-1",
                templateNodeType: "storage.upload",
                label: "Save final video",
                position: { x: 1000, y: 160 },
                config: {},
            },
            {
                id: "social-publish-1",
                templateNodeType: "social.publish",
                label: "Publish final video",
                position: { x: 1320, y: 160 },
                config: {},
            },
        ],
        edges: [
            {
                id: "source-file-1:asset->audio-video-dubbing-1:asset",
                fromNodeId: "source-file-1",
                fromPortId: "asset",
                toNodeId: "audio-video-dubbing-1",
                toPortId: "asset",
            },
            {
                id: "audio-video-dubbing-1:asset->edit-mask-region-1:video",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "asset",
                toNodeId: "edit-mask-region-1",
                toPortId: "video",
            },
            {
                id: "edit-mask-region-1:video->storage-upload-1:asset",
                fromNodeId: "edit-mask-region-1",
                fromPortId: "video",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
            {
                id: "storage-upload-1:asset->social-publish-1:asset",
                fromNodeId: "storage-upload-1",
                fromPortId: "asset",
                toNodeId: "social-publish-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createAssetPreprocessDubbingSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "asset-preprocess-dubbing-sample",
        title: "Asset -> Preprocess -> Dubbing -> Storage",
        updatedAt: now,
        selectedNodeId: "source-asset-1",
        nodes: [
            {
                id: "source-asset-1",
                templateNodeType: "source.asset",
                label: "Storage source asset",
                position: { x: 80, y: 160 },
                config: {},
            },
            {
                id: "video-preprocess-1",
                templateNodeType: "video.preprocess",
                label: "Slow source video",
                position: { x: 340, y: 160 },
                config: { speedFactor: 0.7 },
            },
            {
                id: "audio-video-dubbing-1",
                templateNodeType: "audio.video-dubbing",
                label: "Vietnamese Voice Dubbing",
                position: { x: 620, y: 160 },
                config: {
                    language: "zh",
                    targetLanguage: "vi",
                    model: "cx/gpt-5.3-codex-low",
                    originalAudioVolume: 0,
                    voiceVolume: 1,
                    ttsNoiseScale: 0.667,
                    ttsNoiseW: 0.8,
                    ttsSentenceSilence: 0.2,
                    ttsPreserveTimestampGaps: true,
                    ttsAlignmentMode: "strict",
                },
            },
            {
                id: "storage-upload-1",
                templateNodeType: "storage.upload",
                label: "Save dubbed video",
                position: { x: 940, y: 160 },
                config: {},
            },
        ],
        edges: [
            {
                id: "source-asset-1:asset->video-preprocess-1:video",
                fromNodeId: "source-asset-1",
                fromPortId: "asset",
                toNodeId: "video-preprocess-1",
                toPortId: "video",
            },
            {
                id: "video-preprocess-1:video->audio-video-dubbing-1:asset",
                fromNodeId: "video-preprocess-1",
                fromPortId: "video",
                toNodeId: "audio-video-dubbing-1",
                toPortId: "asset",
            },
            {
                id: "audio-video-dubbing-1:asset->storage-upload-1:asset",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "asset",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createAssetTranscriptFullProcessingSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "asset-transcript-full-processing-sample",
        title: "Asset -> Transcript Full Processing -> Storage",
        updatedAt: now,
        selectedNodeId: "source-asset-1",
        nodes: [
            {
                id: "source-asset-1",
                templateNodeType: "source.asset",
                label: "Storage source asset",
                position: { x: 80, y: 220 },
                config: {},
            },
            {
                id: "video-preprocess-1",
                templateNodeType: "video.preprocess",
                label: "Preprocess source video",
                position: { x: 320, y: 220 },
                config: { speedFactor: 0.7 },
            },
            {
                id: "audio-video-dubbing-1",
                templateNodeType: "audio.video-dubbing",
                label: "Vietnamese voice dubbing",
                position: { x: 560, y: 220 },
                config: {
                    language: "zh",
                    targetLanguage: "vi",
                    model: "cx/gpt-5.3-codex-low",
                    originalAudioVolume: 0,
                    voiceVolume: 1,
                    ttsNoiseScale: 0.667,
                    ttsNoiseW: 0.8,
                    ttsSentenceSilence: 0.2,
                    ttsPreserveTimestampGaps: true,
                    ttsAlignmentMode: "strict",
                },
            },
            {
                id: "text-generate-vi-metadata-1",
                templateNodeType: "text.generate-vi-metadata",
                label: "Generate VI metadata",
                position: { x: 820, y: 90 },
                config: { model: "cx/gpt-5.3-codex-low" },
            },
            {
                id: "edit-mirror-1",
                templateNodeType: "edit.mirror",
                label: "Mirror video",
                position: { x: 820, y: 220 },
                config: { axis: "horizontal" },
            },
            {
                id: "edit-mask-region-1",
                templateNodeType: "edit.mask-region",
                label: "Blur + subtitle overlay",
                position: { x: 1080, y: 220 },
                config: {
                    blurRegionsJson: "",
                    regionX: 0,
                    regionY: 84,
                    regionWidth: 100,
                    regionHeight: 16,
                    timelineStart: 0,
                    timelineEnd: 36000,
                    blurStrength: 50,
                    subtitleOverlayEnabled: true,
                    subtitleFontFamily: "Arial",
                    subtitleFontSize: 55,
                    subtitleMarginBottom: 150,
                    subtitleMarginLeft: 60,
                    subtitleMarginRight: 60,
                    subtitleAlignment: 2,
                    subtitleBackgroundEnabled: true,
                    subtitleBackgroundColor: "#000000",
                    subtitleBackgroundOpacity: 65,
                    mirrorEnabled: false,
                },
            },
            {
                id: "storage-upload-1",
                templateNodeType: "storage.upload",
                label: "Save final video",
                position: { x: 1340, y: 220 },
                config: {},
            },
        ],
        edges: [
            {
                id: "source-asset-1:asset->video-preprocess-1:video",
                fromNodeId: "source-asset-1",
                fromPortId: "asset",
                toNodeId: "video-preprocess-1",
                toPortId: "video",
            },
            {
                id: "video-preprocess-1:video->audio-video-dubbing-1:asset",
                fromNodeId: "video-preprocess-1",
                fromPortId: "video",
                toNodeId: "audio-video-dubbing-1",
                toPortId: "asset",
            },
            {
                id: "audio-video-dubbing-1:transcript->text-generate-vi-metadata-1:transcript",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "transcript",
                toNodeId: "text-generate-vi-metadata-1",
                toPortId: "transcript",
            },
            {
                id: "audio-video-dubbing-1:asset->edit-mirror-1:video",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "asset",
                toNodeId: "edit-mirror-1",
                toPortId: "video",
            },
            {
                id: "edit-mirror-1:video->edit-mask-region-1:video",
                fromNodeId: "edit-mirror-1",
                fromPortId: "video",
                toNodeId: "edit-mask-region-1",
                toPortId: "video",
            },
            {
                id: "audio-video-dubbing-1:transcript->edit-mask-region-1:transcript",
                fromNodeId: "audio-video-dubbing-1",
                fromPortId: "transcript",
                toNodeId: "edit-mask-region-1",
                toPortId: "transcript",
            },
            {
                id: "edit-mask-region-1:video->storage-upload-1:asset",
                fromNodeId: "edit-mask-region-1",
                fromPortId: "video",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
        ],
    };
}

export function createAssetVipProcessingSampleGraph(): WorkspaceGraph {
    const now = new Date().toISOString();
    return {
        version: 1,
        draftId: "asset-vip-processing-sample",
        title: "Asset -> VIP Processing -> Storage",
        updatedAt: now,
        selectedNodeId: "source-asset-1",
        nodes: [
            {
                id: "source-asset-1",
                templateNodeType: "source.asset",
                label: "Storage source asset",
                position: { x: 120, y: 220 },
                config: {},
            },
            {
                id: "video-vip-processing-1",
                templateNodeType: "video.vip-processing",
                label: "VIP full processing",
                position: { x: 520, y: 220 },
                config: {
                    language: "zh",
                    targetLanguage: "vi",
                    model: "cx/gpt-5.3-codex-low",
                    metadataModel: "cx/gpt-5.3-codex-low",
                    speedFactor: 0.7,
                    originalAudioVolume: 0,
                    voiceVolume: 1,
                    ttsNoiseScale: 0.667,
                    ttsNoiseW: 0.8,
                    ttsSentenceSilence: 0.2,
                    ttsPreserveTimestampGaps: true,
                    ttsAlignmentMode: "strict",
                    mirrorEnabled: true,
                    blurRegionsJson: "",
                    regionX: 0,
                    regionY: 84,
                    regionWidth: 100,
                    regionHeight: 16,
                    timelineStart: 0,
                    timelineEnd: 36000,
                    blurStrength: 50,
                },
            },
            {
                id: "storage-upload-1",
                templateNodeType: "storage.upload",
                label: "Save final video",
                position: { x: 940, y: 220 },
                config: {},
            },
        ],
        edges: [
            {
                id: "source-asset-1:asset->video-vip-processing-1:asset",
                fromNodeId: "source-asset-1",
                fromPortId: "asset",
                toNodeId: "video-vip-processing-1",
                toPortId: "asset",
            },
            {
                id: "video-vip-processing-1:asset->storage-upload-1:asset",
                fromNodeId: "video-vip-processing-1",
                fromPortId: "asset",
                toNodeId: "storage-upload-1",
                toPortId: "asset",
            },
        ],
    };
}
