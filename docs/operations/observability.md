# Observability

## 1. Objective

Cung cấp bức tranh toàn cảnh vận hành: biết pipeline nào chạy, step nào lỗi, lỗi thuộc loại gì, và hệ thống đang xuống cấp ở đâu.

## 2. Observability Pillars

1. Metrics: số liệu định lượng theo thời gian.
2. Logs: nhật ký structured có context.
3. Traces: theo dõi chuỗi xử lý theo run/step.

## 3. Minimum Metrics

### Pipeline Metrics

1. `job_run_total` theo status.
2. `job_run_duration_ms` p50/p95/p99.
3. `step_run_total` theo nodeType/status.
4. `step_retry_total` theo errorCode.

### Integration Metrics

1. `provider_call_latency_ms`.
2. `provider_error_total` theo provider/errorCode.
3. `storage_upload_latency_ms` / `download_latency_ms`.
4. `social_publish_success_rate`.

### System Health Metrics

1. Queue depth.
2. Worker concurrency utilization.
3. MongoDB query latency.
4. Connection status counts (`ok/degraded/down`).

## 4. Structured Logging Standard

Mọi log sự kiện run/step cần có:

1. `timestamp`
2. `level`
3. `service`
4. `jobRunId`
5. `stepRunId` (nullable)
6. `nodeId` (nullable)
7. `errorCode` (nullable)
8. `message`
9. `context`

## 5. Tracing Strategy

1. Mỗi `jobRunId` là trace root.
2. Mỗi `stepRun` là span child.
3. Adapter calls tạo span con để đo latency provider.

## 6. Dashboard Requirements

1. Pipeline status overview (24h/7d).
2. Top failing nodes và error codes.
3. Provider health và quota alerts.
4. Social publish success/failure.
5. Connection Center status snapshot.

## 7. Alert Policy (Initial)

1. Critical: hệ thống `down`, queue stuck, DB unavailable.
2. High: fail rate > ngưỡng, provider chính unavailable > N phút.
3. Medium: latency tăng bất thường.
4. Low: warning về quota approaching.

## 8. Instrumentation Rule

1. Node mới phải có metrics/logs hooks trước khi release.
2. Tích hợp mới phải có healthCheck observable.
3. Thiếu observability là chưa đủ Definition of Done.
