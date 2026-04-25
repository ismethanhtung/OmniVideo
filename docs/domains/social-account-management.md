# Social Account Management

## 1. Objective

Quản lý tập trung các nền tảng social phục vụ phát hành video: Facebook Reels/video, TikTok, Shopee product/video commerce, YouTube Shorts/video. Phase đầu là `Control Center`: quản lý account, capability, task/publish planning, connection status và traceability. YouTube đã có adapter `publish_now` đầu tiên; Facebook/TikTok/Shopee vẫn tách sang phase adapter sau.

## 2. Platform Matrix

| Platform | Initial formats | Primary tasks | Real publish status |
| --- | --- | --- | --- |
| `facebook` | `facebook_reel`, `facebook_video` | permission review, plan publish, connection check | deferred |
| `tiktok` | `tiktok_video` | permission review, plan publish, connection check | deferred |
| `shopee` | `shopee_video` | product mapping, plan publish, connection check | deferred |
| `youtube` | `youtube_short`, `youtube_video` | permission review, plan publish, publish now, connection check | enabled for `publish_now` upload |

## 3. Account Model

Mỗi social account bao gồm:

1. `platform`
2. `label`, `displayName`, `handle`, `accountId`
3. `status` (`needs_auth`, `connected`, `paused`, `error`)
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
2. `connected` chỉ được set sau khi OAuth callback/token exchange thành công; user không được tự chọn trạng thái này trong form.
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

Record có thể có `publishMode=schedule` hoặc `publishMode=publish_now`.

1. Với YouTube account `connected`, `publish_now` gọi YouTube resumable upload ngay trong request tạo record. Nếu có `refreshToken` và OAuth env hợp lệ, server refresh access token trước khi upload. Thành công sẽ đổi record sang `published` và lưu `platformPostId`.
2. Nếu YouTube upload fail, record chuyển sang `failed` và UI phải hiển thị `errorCode`/`errorDetail`.
3. Với Facebook/TikTok/Shopee, `publish_now` chưa có adapter thật nên phải trả lỗi adapter chưa triển khai thay vì giả vờ đã đăng.
4. `schedule` vẫn chỉ tạo record `planned`; worker/scheduler tự động chưa nằm trong scope hiện tại.
5. `privacyStatus` cho YouTube nhận `private`, `unlisted`, hoặc `public`; Google có thể vẫn ép upload từ API project chưa được audit về private.
6. `youtube_short` không có endpoint riêng. Hệ thống chỉ upload khi asset có metadata duration/width/height, thời lượng tối đa 3 phút, và aspect ratio vuông hoặc dọc. Nếu không đạt, record phải fail bằng `VAL_YOUTUBE_SHORT_*` để tránh đăng nhầm thành video thường.

## 7. Publish Mapping Rules

1. Mỗi publish record bắt buộc link `assetId` và `socialAccountId`.
2. `platform` được suy ra từ account, không lấy tự do từ client.
3. `publishType` phải thuộc `supportedFormats` của account.
4. Nếu publish failed, phải lưu `errorCode`, `errorDetail`, `retryCount`.
5. Metadata publish gồm title/caption/hashtags/scheduledAt.
6. `publish_now` records được server set `scheduledAt=now`; YouTube xử lý ngay, các platform còn lại cần adapter thật trước khi được bật.

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

## 12. Account Connection UX Recommendation

Không nên bắt user thường xuyên copy/paste `accessToken`/`refreshToken` thủ công làm workflow chính, vì token ngắn hạn hết hạn nhanh và lấy token platform thường chậm. Hướng đúng cho real publish là:

1. OAuth connect flow trong dashboard: user bấm `Connect`, platform redirect/callback về OmniVideo.
2. Server lưu refresh token/secretRef, UI chỉ thấy trạng thái kết nối và scope.
3. Background refresh tự làm mới access token trước khi hết hạn.
4. Manual token fields chỉ giữ lại cho MVP fallback, debug hoặc account planning khi chưa có adapter.
5. Account tạo mới mặc định `needs_auth`; Connection Center phải báo lỗi cho đến khi OAuth hoàn tất.

Platform notes:

1. Facebook: ưu tiên OAuth + Page permission, không nhập Page token thủ công làm chuẩn.
2. TikTok: OAuth phụ thuộc app review/eligibility; manual token chỉ dùng tạm.
3. Shopee: cần shop authorization; token phải gắn shop/product scope.
4. YouTube: OAuth offline access là lựa chọn thực tế để refresh token lâu dài.

### YouTube OAuth setup checklist

1. Vào Google Cloud Console.
2. Tìm kiếm và bật YouTube Data API v3.
3. Tạo OAuth Client ID qua OAuth consent screen -> client, chọn loại Web Application.
4. Copy Client ID và Client Secret dán vào `.env`:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
5. Thiết lập `SOCIAL_OAUTH_BASE_URL`, ví dụ `http://localhost:3001` khi chạy local hoặc domain thật khi deploy.
6. Trong OAuth Client, thêm Authorized redirect URI:
   - Local ví dụ: `http://localhost:3001/api/social/oauth/callback/youtube`
   - Production ví dụ: `https://your-domain.com/api/social/oauth/callback/youtube`
7. Redirect URI trong Google Cloud phải khớp chính xác với URI hiển thị trong modal Social Account.
8. Nếu gặp lỗi Google `403: access_denied` với thông báo app `omni` chưa hoàn tất xác minh, thêm email của bạn vào danh sách test users:
   - `APIs & Services` -> `OAuth consent screen` -> `Audience` -> `Test users`
   - Thêm email đang login, ví dụ `vivathanhtung@gmail.com`.
9. Nếu Connection Test vẫn báo `Request had insufficient authentication scopes` sau khi thêm scope:
   - Token cũ được cấp trước khi thêm scope sẽ không tự có quyền mới.
   - Bấm `Connect OAuth` lại để Google cấp token mới.
   - Nếu Google không hiện lại consent screen, vào Google Account -> Security -> Third-party access và remove app `omni`, rồi connect lại.
10. Connection Test cho YouTube hiện kiểm tra access token còn hợp lệ và có scope `https://www.googleapis.com/auth/youtube.upload`; nó không dùng endpoint đọc channel để tránh yêu cầu scope đọc không cần thiết.
11. `Publish now` của YouTube có thể chọn `private`, `unlisted`, hoặc `public`. Sau khi có `platformPostId`, mở YouTube Studio để kiểm tra metadata, copyright checks và visibility thực tế.
