# P2-SOCIAL-016 Enable TikTok Publish-Now Adapter

## 0. Progress Stamp

- [x] DoR checklist completed
- [x] Scope locked
- [x] Implementation completed
- [x] Tests added/updated (if code changed)
- [x] Docs updated (if impacted)
- [x] Changelog updated
- [x] Ready for review
- [x] Done

## 1. Metadata

- Task ID: P2-SOCIAL-016
- Phase: P2
- Target Phase: Social Platform MVP
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: YouTube publish-now đã chạy thật, cần mở rộng sang TikTok để hoàn thiện social publishing workflow ưu tiên.
- Bài toán cần giải quyết: Hiện TikTok vẫn deferred trong capability và executePublishNow sẽ fail adapter-not-implemented.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - TikTok Content Posting API docs (Direct Post, Creator Info Query, Get Post Status)
  - TikTok OAuth user token management v2 docs

## 3. Scope

- In scope:
  - Thêm TikTok publish-now adapter dùng Content Posting API Direct Post.
  - Hỗ trợ refresh access token bằng refresh token.
  - Poll status endpoint để cập nhật `published` hoặc `queued`.
  - Bật capability TikTok `realPublishStatus=enabled`.
  - Cập nhật connection check cơ bản cho TikTok connected account.
  - Cập nhật UI copy/docs/changelog.
- Out of scope:
  - Webhook receiver cho TikTok posting events.
  - Facebook/Shopee real publish adapters.
  - Full TikTok media URL fallback mode `PULL_FROM_URL`.

## 4. Input / Output

- Input: TikTok connected social account, storage video asset, publish record metadata.
- Output mong đợi: TikTok publish-now hoạt động thật và trạng thái publish được phản ánh trong publish records.

## 5. Acceptance Criteria

1. Với `tiktok_video` + account TikTok connected, `publish_now` không còn fail `PRV_SOCIAL_PUBLISH_ADAPTER_NOT_IMPLEMENTED`.
2. Adapter gọi đúng luồng: creator_info query -> direct post init -> upload binary -> status fetch.
3. Nếu TikTok trả `PUBLISH_COMPLETE`, record chuyển `published`; nếu chưa hoàn tất moderation/process thì record ở `queued`.
4. Nếu TikTok trả fail, record chuyển `failed` với error code/detail có ý nghĩa.
5. Có test cho happy path và failure path của TikTok adapter.

## 6. Technical Plan

1. Tạo module `src/lib/social/tiktok-upload.ts` và tests tương ứng.
2. Nối adapter vào `executePublishNow` trong `src/lib/social/repository.ts`.
3. Bật capability TikTok, cập nhật connection checks và UI messaging.
4. Cập nhật docs/changelog/task board và evidence.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/social/*`
  - `src/features/social/*`
  - docs/changelog/tasks.

## 8. Test Plan

1. Unit tests cho TikTok upload adapter (success/queued/failure/refresh token).
2. Regression tests cho social connection checks nếu chỉnh logic TikTok.
3. `npm run build` để verify type + app compile.

## 9. Observability

- Metrics: Chưa thêm metrics mới trong MVP.
- Logs: Không log raw tokens/secrets.
- Error codes:
  - `AUTH_TIKTOK_ACCESS_TOKEN_MISSING`
  - `AUTH_TIKTOK_REFRESH_FAILED`
  - `PRV_TIKTOK_INIT_FAILED`
  - `PRV_TIKTOK_UPLOAD_FAILED`
  - `PRV_TIKTOK_PUBLISH_FAILED`

## 10. Risks & Rollback

- Risks:
  - TikTok post có thể ở trạng thái process/moderation nên không có post id public ngay.
  - App chưa audit có thể bị TikTok hạn chế visibility/private.
- Rollback strategy:
  - Revert adapter integration và đặt lại TikTok capability về deferred.

## 11. Deliverables

1. TikTok publish-now adapter implementation.
2. Tests và docs/changelog cập nhật.
3. UI copy cập nhật theo trạng thái mới.

## 12. Changelog Note

- Bật TikTok publish-now adapter thật qua Content Posting API Direct Post.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [x] Có user/system flow rõ ràng
- [x] Có acceptance criteria đo được
- [x] Có test cho happy path
- [x] Có test cho failure path chính

### 13.2 Bugfix

- [ ] Có mô tả cách tái hiện lỗi
- [ ] Có root cause ngắn gọn
- [ ] Có regression test
- [ ] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
  - TikTok OAuth v2 tokens đã được lấy qua flow hiện tại.
  - publish-now dùng `FILE_UPLOAD` để tránh phụ thuộc verify domain cho `PULL_FROM_URL`.
- Blockers:
- Verification evidence:
  - `npm run test -- --run src/lib/social/tiktok-upload.test.ts src/lib/social/connection-checks.test.ts src/lib/social/inventory.test.ts src/app/api/social/published-content/route.test.ts` pass (14 tests / 4 files).
  - `npm run test` pass (102 tests / 25 files).
  - `npm run build` pass (warning cũ: unused `Image` ở display-preferences-panel).

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/tiktok-upload.test.ts` (new)
  - `src/lib/social/connection-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/social/tiktok-upload.test.ts src/lib/social/connection-checks.test.ts src/lib/social/inventory.test.ts src/app/api/social/published-content/route.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - All commands pass.
