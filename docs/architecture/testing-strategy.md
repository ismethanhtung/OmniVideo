# Testing Strategy (Next.js + MongoDB)

## 1. Objective

Thiết lập chiến lược test chuẩn cho OmniVideo để đảm bảo mọi thay đổi code đều có kiểm chứng kỹ thuật, giảm regression và bảo vệ data integrity.

## 2. Testing Principles

1. Test là một phần của tính năng, không phải việc làm thêm sau cùng.
2. Ưu tiên test ở boundary nghiệp vụ và điểm rủi ro cao.
3. Mọi bug fix phải có regression test tương ứng.
4. Không có verify thì không xem là hoàn thành.

## 3. Test Pyramid

1. Unit tests (nhiều nhất): domain logic, helpers, validation, mappers.
2. Integration tests: repository MongoDB, adapters, use-cases có dependency.
3. API tests: route handlers (`src/app/api/*`) với input/output/error contracts.
4. E2E/smoke tests (ít hơn): luồng quan trọng end-to-end theo phase.

## 4. Coverage Targets (Baseline)

1. Unit coverage tổng thể: mục tiêu >= 80% với modules mới.
2. Critical domains (`pipeline`, `providers`, `storage`, `social`): mục tiêu >= 85%.
3. Coverage chỉ là chỉ số phụ, không thay thế quality assertions.

## 5. Mandatory Test Scenarios by Domain

### Source & Intake

1. URL hợp lệ/không hợp lệ.
2. Dedup source.
3. Metadata normalization.

### Pipeline & Orchestration

1. Tạo job run và step run đúng trạng thái.
2. Retry policy hoạt động đúng.
3. Timeout/failure transitions đúng.

### Providers/Adapters

1. Success mapping.
2. Auth/quota/network/provider errors.
3. Fallback provider selection.

### Storage

1. Upload success tạo asset metadata.
2. Checksum mismatch -> corrupted path.
3. Retry upload on transient failures.

### Social Publish

1. Publish success + mapping record.
2. Permission/auth failure no-auto-retry.
3. Retry behavior cho transient failures.

## 6. Database Testing Strategy (MongoDB)

1. Dùng test database riêng, không dùng DB thật của môi trường runtime.
2. Mỗi test suite có setup/teardown rõ ràng.
3. Test indexes và query behavior cho collection chính.
4. Test dữ liệu biên (missing fields, invalid enums, stale refs).

## 7. API Contract Testing

1. Validate request schema (bad request cases).
2. Validate response schema (success + error).
3. Validate error code taxonomy (`VAL_*`, `AUTH_*`, `QTA_*`, `NET_*`, `PRV_*`, `SYS_*`).
4. Validate traceId/requestId presence.

## 8. CI Quality Gates (Recommended)

1. `lint` pass.
2. Unit + integration tests pass.
3. Critical smoke tests pass.
4. Coverage threshold không thấp hơn baseline đã đặt.

## 9. Test Data Management

1. Test fixtures versioned trong repo.
2. Không dùng dữ liệu nhạy cảm thật.
3. Mẫu binary test media nên nhẹ và deterministic.

## 10. Done Criteria for Code Changes

Một code task chỉ được `Done` khi:

1. Có test mới/cập nhật tương ứng với thay đổi.
2. Test chạy pass ở local/CI theo phạm vi task.
3. Có ghi nhận test evidence trong task notes.
