# Social Account Management

## 1. Objective

Quản lý tập trung các nền tảng social phục vụ phát hành video: Facebook Reels/video, TikTok, Shopee product/video commerce, YouTube Shorts/video. Phase đầu là `Control Center`: quản lý account, capability, task/publish planning, connection status và traceability. Real auto-publish adapter được tách sang phase sau.

## 2. Platform Matrix

| Platform | Initial formats | Primary tasks | Real publish status |
| --- | --- | --- | --- |
| `facebook` | `facebook_reel`, `facebook_video` | permission review, plan publish, connection check | deferred |
| `tiktok` | `tiktok_video` | permission review, plan publish, connection check | deferred |
| `shopee` | `shopee_video` | product mapping, plan publish, connection check | deferred |
| `youtube` | `youtube_short`, `youtube_video` | permission review, plan publish, connection check | deferred |

## 3. Account Model

Mỗi social account bao gồm:

1. `platform`
2. `label`, `displayName`, `handle`, `accountId`
3. `status` (`active`, `paused`, `error`)
4. `authMode` (`oauth`, `access_token`, `api_key`, `manual`, `not_configured`)
5. `permissionScopes`
6. `supportedFormats`
7. `channelTags` (topic/group/campaign)
8. `secrets` server-side only; list API chỉ trả `secretSummary`
9. `lastHealthCheckAt`, `lastError`
10. `usage` summary cho publish records

MVP hiện cho phép lưu secret inline trong MongoDB giống storage provider để thao tác nhanh. Production phải chuyển sang secret manager hoặc encryption at-rest.

## 4. Capability Model

Capability registry là nguồn sự thật cho UI và validation:

1. Mỗi platform khai báo format được hỗ trợ.
2. Mỗi format có `publishType`, required scopes, metadata limits và aspect ratios khuyến nghị.
3. UI Platform Tasks dùng capability registry để hiển thị scope thiếu và next actions.
4. Publish record không được tạo nếu `publishType` không khớp platform account.

## 5. Core Features

1. CRUD social account.
2. Pause/activate/error status để kiểm soát vận hành.
3. Hiển thị permission/API scope và missing scopes.
4. Mapping output video asset -> social account -> planned publish record.
5. Lịch sử publish planning và lỗi API chuẩn bị cho adapter thật.
6. Connection Center có check social account cơ bản.

## 6. Publish Lifecycle

`publish_records.status` dùng lifecycle:

1. `planned`: user đã lên kế hoạch từ Storage Library asset.
2. `queued`: future publish adapter đã nhận job.
3. `published`: platform trả platform post id.
4. `failed`: publish fail và có `errorCode`.
5. `retrying`: retry đang chờ hoặc đang chạy.
6. `canceled`: user hủy kế hoạch.

Phase Control Center chỉ tạo `planned`. Các trạng thái còn lại dành cho real publish adapter.

## 7. Publish Mapping Rules

1. Mỗi publish record bắt buộc link `assetId` và `socialAccountId`.
2. `platform` được suy ra từ account, không lấy tự do từ client.
3. `publishType` phải thuộc `supportedFormats` của account.
4. Nếu publish failed, phải lưu `errorCode`, `errorDetail`, `retryCount`.
5. Metadata publish gồm title/caption/hashtags/scheduledAt.

## 8. Retry Rules

1. Retry tối đa 3 lần với backoff.
2. Lỗi `AUTH_*` và `VAL_*` không retry tự động.
3. Lỗi `QTA_*` retry theo `retry-after` nếu platform trả về.
4. Lỗi `NET_*`/transient provider có thể retry.

## 9. Observability Requirements

1. Dashboard theo platform: account count, active count, planned publish count.
2. Connection Center hiển thị social checks theo account.
3. Top error code 24h khi real publish adapter được thêm.
4. Không log raw secret/token/cookie.

## 10. Compliance Boundaries

1. Không xây tính năng né chính sách nền tảng, review, quota hoặc bản quyền.
2. Publish chỉ dùng nội dung có quyền sử dụng rõ trong source/asset metadata.
3. Không tự động spam hoặc lặp nội dung không kiểm soát.
4. Shopee/product commerce phải gắn với sản phẩm/shop hợp lệ.

## 11. Extensibility Requirements

1. Platform-specific logic nằm trong adapter riêng.
2. Domain service chỉ dùng interface chung.
3. Bổ sung platform mới bằng capability registry + adapter, không sửa orchestration core.
4. Real publish adapters phải có contract tests cho success/auth/quota/network/provider errors.
