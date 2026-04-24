# Integration Boundaries

## 1. Principle

Mọi tích hợp bên thứ ba phải đi qua adapter boundary, không gọi SDK/API trực tiếp từ domain services.

## 2. Adapter Categories

1. Downloader Adapter
2. AI Adapter (chat/tts/vision/generation)
3. Storage Adapter
4. Social Publish Adapter
5. Trend Source Adapter

## 3. Adapter Contract (Minimum)

Mỗi adapter phải có:

1. `healthCheck()`
2. `execute(request, context)`
3. `normalizeError(error)`
4. `rateLimitMetadata()`
5. `capabilities()`

## 4. Provider Selection Policy

1. Chọn provider theo `priorityWeight` + `availability` + `quotaRemaining`.
2. Nếu provider chính fail retryable, fallback provider tiếp theo.
3. Nếu provider fail non-retryable, dừng ngay step và báo lỗi rõ.

## 5. Error Taxonomy (Global)

Nhóm mã lỗi bắt buộc:

1. `VAL_*`: validation errors.
2. `AUTH_*`: credential/auth errors.
3. `QTA_*`: quota/rate-limit errors.
4. `NET_*`: network/timeouts.
5. `PRV_*`: provider internal errors.
6. `SYS_*`: internal system errors.

## 6. Secret Management Rule

1. Secret lưu ngoài codebase (`.env` cho local, secret manager cho deploy).
2. DB chỉ lưu `secretRef`, không lưu raw token/key.
3. Log không được chứa secret/raw credential.

## 7. Retry and Timeout Rule

1. Adapter call phải có timeout rõ ràng.
2. Retry dùng exponential backoff + jitter.
3. Không retry vô hạn.
4. Retry policy phải phân biệt retryable/non-retryable.

## 8. Compatibility and Versioning

1. Thay đổi response mapping phải có version note.
2. Nếu thay đổi có nguy cơ phá backward compatibility, phải thêm adapter version.
3. Không đổi behavior production mà không cập nhật changelog.

## 9. Testing Baseline for Integrations

1. Contract tests cho adapter request/response mapping.
2. Mock failure tests cho timeout/quota/auth.
3. Smoke health-check test cho từng integration.
