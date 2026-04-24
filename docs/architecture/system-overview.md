# System Overview

## 1. Architectural Intent

OmniVideo được thiết kế theo hướng:

1. `Web-first control plane` bằng Next.js.
2. `Metadata-first orchestration` bằng MongoDB.
3. `Capability adapters` cho mọi tích hợp ngoài.
4. `Node-based pipeline` để mở rộng dần.

## 2. High-Level Layers

### 2.1 Presentation Layer (Next.js)

Trách nhiệm:

1. Dashboard tổng quan run/connection/errors.
2. Workspace quản lý flow/node.
3. Settings cho provider/account/storage.
4. Source/Asset/Publish management.

### 2.2 Orchestration Layer

Trách nhiệm:

1. Nhận pipeline definition và tạo `JobRun`.
2. Điều phối thực thi theo DAG node.
3. Quản lý retry, timeout, trạng thái từng step.
4. Ghi log sự kiện theo chuẩn.

### 2.3 Capability Layer

Trách nhiệm:

1. Chuẩn hóa kết nối downloader, AI, storage, social API.
2. Tách logic domain khỏi SDK/API cụ thể.
3. Đảm bảo fallback dễ dàng khi provider lỗi.

### 2.4 Data Layer (MongoDB)

Trách nhiệm:

1. Lưu metadata nguồn, asset, run, event.
2. Lưu account/provider/social connection state.
3. Lưu traceability và audit trail.

### 2.5 Governance Layer

Trách nhiệm:

1. Rules, docs, tasks, changelog.
2. Ép quy trình agent làm việc có kỷ luật.

## 3. Runtime Components

1. `next-web`: Next.js app (App Router) cho UI + API endpoints.
2. `orchestrator`: service điều phối run và queue.
3. `workers`: thực thi node workloads (download/edit/render/transcode).
4. `scheduler` (future): cron/recurring jobs.
5. `mongo`: metadata store.
6. `binary storage`: local/S3-compatible/Telegram/Drive (qua adapter).

## 4. Suggested Project Structure (Next.js + MongoDB)

```txt
src/
  app/
    (dashboard)/
    (workspace)/
    api/
  modules/
    sources/
    pipeline/
    providers/
    social/
    storage/
    observability/
  lib/
    db/
    queue/
    logger/
    validation/
    adapters/
  workers/
    handlers/
```

## 5. MVP Flow (URL Intake)

1. User nhập URL trên UI/API.
2. API tạo `Source` + `JobRun` (status: queued).
3. Orchestrator enqueue job download.
4. Worker tải video qua downloader adapter.
5. Worker lưu asset vào binary storage.
6. Worker ghi `Asset`, `StepRun`, `RunEvent` vào MongoDB.
7. API/UI phản hồi output pointer + trace info.

## 6. Cross-Cutting Requirements

1. Idempotency: tránh xử lý trùng khi retry.
2. Observability: metrics + structured logs + error code taxonomy.
3. Reliability: timeout, backoff, circuit breaker cho tích hợp ngoài.
4. Data integrity: trạng thái run/step nhất quán, không cập nhật mơ hồ.
5. Security baseline: secrets nằm ở env/secret manager, không hard-code.

## 7. Deployment Direction

1. Local dev: Next.js + MongoDB local.
2. Staging/Prod: web và worker chạy tách process/container.
3. Không phụ thuộc máy cá nhân để chạy tác vụ pipeline dài.
