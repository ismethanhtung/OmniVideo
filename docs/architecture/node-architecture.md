# Workspace Node Architecture

## 1. Design Goals

1. Dễ lắp ráp pipeline theo graph, không hard-code theo loại video.
2. Node có contract rõ ràng để thêm/bớt/thay thế dễ.
3. Runtime có thể resume/retry từ node lỗi.

## 2. Graph Model

- Mỗi workspace lưu một `PipelineDefinition` dạng DAG.
- Node kết nối qua ports (typed input/output).
- Execution theo topological order + dependency constraints.

## 3. Node Categories

### Input Nodes

1. URL Input Node
2. Text Input Node
3. File Input Node
4. RSS/Feed Input Node

### Processing Nodes

1. AI Agent Node: scene breakdown, script transform.
2. Visual Node: render/generate visual.
3. Audio Node: TTS/music/voice mix.
4. Edit Node: ffmpeg transforms (trim, concat, blur, overlay).

### Output Nodes

1. Storage Output Node.
2. Social Publish Node.
3. Metadata Export Node.

## 4. Node Contract (Bắt buộc)

Mỗi node template phải khai báo:

1. `nodeType` và `version`.
2. `inputSchema` và `outputSchema`.
3. `configSchema`.
4. `timeoutMs` mặc định.
5. `retryPolicy` mặc định.
6. `idempotencyStrategy`.
7. `observabilityHooks`.

Ví dụ contract tối thiểu:

```json
{
  "nodeType": "edit.trim",
  "version": "1.0.0",
  "inputSchema": {
    "type": "object",
    "required": ["assetId", "startMs", "endMs"]
  },
  "outputSchema": {
    "type": "object",
    "required": ["assetId", "durationMs"]
  },
  "configSchema": {
    "type": "object",
    "properties": {
      "preserveAudio": { "type": "boolean", "default": true }
    }
  },
  "timeoutMs": 120000,
  "retryPolicy": {
    "maxAttempts": 3,
    "backoff": "exponential"
  },
  "idempotencyStrategy": "input-hash",
  "observabilityHooks": ["onStart", "onSuccess", "onError"]
}
```

## 5. Execution Semantics

1. Node chỉ chạy khi mọi dependency đã `success`.
2. Node fail sẽ theo retry policy của node hoặc pipeline override.
3. Node timeout được xem là `failed_timeout`, có thể retry.
4. Nếu node là `non-retryable`, run chuyển sang failed ngay.

## 6. Error Handling Standard

Mỗi lỗi phải có:

1. `errorCode` chuẩn hóa theo domain.
2. `category` (`validation`, `dependency`, `provider`, `system`).
3. `retryable` true/false.
4. `stepContext` (nodeId, runId, inputRef).

## 7. Versioning Rule

1. Node contract thay đổi backward-incompatible -> tăng major version.
2. Pipeline cũ phải được pin theo version node.
3. Không silently migrate runtime behavior.

## 8. Safety and Compliance Guardrails

1. Node không được thiết kế để né cơ chế bản quyền hoặc vi phạm chính sách nền tảng.
2. Node publish phải hỗ trợ check policy trước khi gửi lên platform.
3. Node xử lý media phải giữ trace source và transform chain.
