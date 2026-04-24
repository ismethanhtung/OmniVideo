# Social Account Management

## 1. Objective

Quản lý tập trung tài khoản xuất bản nội dung (TikTok, YouTube, Facebook, Shopee có thể mở rộng), đảm bảo kết nối, quyền hạn, lịch sử đăng và khả năng retry khi API lỗi.

## 2. Account Model

Mỗi social account bao gồm:

1. `platform`
2. `accountId`
3. `displayName`
4. `permissionScopes`
5. `connectionStatus`
6. `channelTags` (topic/group)
7. `publishPolicy` (default visibility/schedule)
8. `lastHealthCheckAt`

## 3. Core Features

1. CRUD account social.
2. Test connection per account.
3. Hiển thị permission/API scope.
4. Mapping output video -> kênh đã đăng.
5. Lịch sử publish và lỗi API.
6. Retry có kiểm soát cho publish failed.

## 4. Publish Mapping Rules

1. Mỗi publish record bắt buộc link `assetId` và `socialAccountId`.
2. Mỗi publish phải có status lifecycle (`queued`, `published`, `failed`, `retrying`).
3. Nếu publish failed, phải lưu `errorCode` và retry count.

## 5. Retry Rules

1. Retry tối đa 3 lần với backoff.
2. Lỗi auth/permission không retry tự động.
3. Lỗi rate limit retry theo `retry-after` nếu có.

## 6. Observability Requirements

1. Dashboard theo platform: success rate, fail rate, latency.
2. Danh sách account lỗi kết nối theo thời gian thực.
3. Top error code 24h.

## 7. Extensibility Requirements

1. Platform-specific logic nằm trong adapter riêng.
2. Domain service chỉ dùng interface chung.
3. Bổ sung platform mới không sửa orchestration core.
