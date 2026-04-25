# Data Model (MongoDB)

## 1. Modeling Principle

1. Metadata-first: binary lưu ở storage, MongoDB giữ metadata và trace.
2. Event-aware: mọi run/step có event log để điều tra lỗi.
3. Query-driven: tối ưu truy vấn theo run history, source, channel, status.

## 2. Core Collections

## 2.1 `sources`

Dùng để quản lý nguồn nội dung.

Trường chính:

- `_id`
- `sourceType` (`url`, `channel`, `trend_list`, `text_idea`, `file`)
- `url` (nullable)
- `originPlatform` (`douyin`, `youtube`, `bilibili`, `other`)
- `title`
- `tags`: string[]
- `languageHint`
- `ownershipStatus` (`unknown`, `owned`, `licensed`, `public_domain`, `restricted`)
- `createdAt`, `updatedAt`

## 2.2 `assets`

Dùng để quản lý input/output artifacts.

Trường chính:

- `_id`
- `assetType` (`video`, `audio`, `subtitle`, `thumbnail`, `script`)
- `storageProvider` (`local`, `s3`, `telegram`, `drive`, `other`)
- `storagePointer` (path/url/id)
- `checksumSha256`
- `mimeType`
- `durationMs`
- `sizeBytes`
- `metadata` (codec, width, height, fps)
- `createdFrom` (run/step refs)
- `createdAt`

## 2.3 `storage_provider_accounts`

Dùng để quản lý nhiều storage account/vault.

Trường chính:

- `_id`
- `providerType` (`telegram`, `drive`, `s3`, `local`, `other`)
- `label`
- `description`
- `status` (`active`, `paused`, `error`)
- `priority`
- `tags`
- `secrets` (server-only, không trả raw value về UI)
- `usage` (assetCountApprox, lastUsedAt)
- `createdAt`, `updatedAt`

## 2.4 `pipeline_definitions`

- `_id`
- `name`
- `version`
- `graph` (nodes + edges)
- `status` (`draft`, `active`, `archived`)
- `createdAt`, `updatedAt`

## 2.5 `job_runs`

- `_id`
- `pipelineId`
- `triggerType` (`manual`, `api`, `schedule`)
- `status` (`queued`, `running`, `failed`, `success`, `canceled`)
- `sourceRefs`
- `inputSnapshot`
- `outputSummary`
- `startedAt`, `endedAt`
- `durationMs`

## 2.6 `step_runs`

- `_id`
- `jobRunId`
- `nodeId`
- `nodeType`
- `attempt`
- `status`
- `errorCode` (nullable)
- `errorDetail` (nullable)
- `metrics` (latencyMs, providerCalls, tokensUsed)
- `startedAt`, `endedAt`

## 2.7 `run_events`

- `_id`
- `jobRunId`
- `stepRunId` (nullable)
- `eventType` (`created`, `started`, `retry`, `failed`, `completed`, `warning`)
- `level` (`info`, `warn`, `error`)
- `payload`
- `timestamp`

## 2.8 `ai_provider_accounts`

- `_id`
- `providerName`
- `accountLabel`
- `modelPolicies`
- `secretRef`
- `quotaDaily`, `quotaMonthly`
- `spendDaily`, `spendMonthly`
- `priorityWeight`
- `status` (`active`, `paused`, `depleted`, `error`)
- `lastHealthCheckAt`

## 2.9 `social_accounts`

- `_id`
- `platform` (`tiktok`, `youtube`, `facebook`, `shopee`, `other`)
- `label`
- `accountId`
- `displayName`
- `handle`
- `authMode` (`oauth`, `access_token`, `api_key`, `manual`, `not_configured`)
- `status` (`active`, `paused`, `error`)
- `permissionScopes`
- `supportedFormats`
- `channelTags`
- `secrets` (server-only, không trả raw value về UI)
- `lastHealthCheckAt`
- `lastError`
- `usage`

## 2.9.1 `social_platform_capabilities`

Capability registry cho UI và validation social.

- `_id` (optional nếu persist registry)
- `platform` (`facebook`, `tiktok`, `shopee`, `youtube`)
- `formats` (`publishType`, required scopes, metadata limits)
- `supportedTaskTypes`
- `realPublishStatus`
- `complianceNotes`

## 2.10 `publish_records`

- `_id`
- `assetId`
- `socialAccountId`
- `platform`
- `publishType`
- `platformPostId`
- `status` (`planned`, `queued`, `published`, `failed`, `retrying`, `canceled`)
- `title`, `caption`, `hashtags`
- `scheduledAt`
- `publishedAt`
- `retryCount`
- `errorCode`
- `errorDetail`

## 2.11 `connection_checks`

- `_id`
- `serviceType` (`mongodb`, `provider`, `storage`, `social_api`, `queue`)
- `serviceKey`
- `status` (`ok`, `degraded`, `down`)
- `latencyMs`
- `errorCode`
- `checkedAt`

## 3. Indexing Strategy (Minimum)

1. `job_runs`: `{ status: 1, createdAt: -1 }`, `{ pipelineId: 1, createdAt: -1 }`.
2. `step_runs`: `{ jobRunId: 1, nodeId: 1, attempt: -1 }`.
3. `assets`: `{ checksumSha256: 1 }`, `{ createdAt: -1 }`.
4. `sources`: `{ sourceType: 1, originPlatform: 1, createdAt: -1 }`.
5. `publish_records`: `{ socialAccountId: 1, publishedAt: -1 }`.
6. `storage_provider_accounts`: `{ providerType: 1, status: 1, priority: -1 }`.
7. `social_accounts`: `{ platform: 1, status: 1, label: 1 }`.
8. `publish_records`: `{ platform: 1, status: 1, createdAt: -1 }`, `{ assetId: 1, socialAccountId: 1 }`.

## 4. Data Integrity Rules

1. `job_runs.status` phải phản ánh aggregate của `step_runs`.
2. Không xóa `run_events` trong thời gian retention active.
3. `errorCode` phải nằm trong taxonomy định nghĩa trước.
4. `assets.storagePointer` luôn đi kèm `storageProvider`.

## 5. Retention and Archival (Initial)

1. Giữ `job_runs/step_runs/run_events` tối thiểu 90 ngày.
2. Sau 90 ngày có thể archive sang collection lạnh hoặc external store.
3. Không archive metadata đang tham chiếu bởi publish records active.
