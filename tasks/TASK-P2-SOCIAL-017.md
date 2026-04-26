# [P2-SOCIAL-017] Enable Facebook Publish-Now Adapter and Controls

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

- Task ID: P2-SOCIAL-017
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

- Lý do: YouTube và TikTok đã có publish-now thật; cần mở rộng sang Facebook để đăng và quản lý video/Reels.
- Bài toán cần giải quyết: Facebook capability hiện deferred, `executePublishNow` chặn adapter, connection check Facebook chỉ skipped.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/operations/tutorial-docs.md`
  - Meta Graph API/Page Video/Reels publishing docs.

## 3. Scope

- In scope:
  - Thêm Facebook publish-now adapter dùng Graph API cho `facebook_video` và Reels flow best-effort cho `facebook_reel`.
  - Hỗ trợ Page ID/page token resolution từ OAuth/manual secrets.
  - Bật Facebook `publish_now` capability và UI copy/config controls.
  - Thêm Facebook connection check thật qua Graph API.
  - Thêm tests cho adapter success/failure và connection check.
  - Cập nhật docs/changelog/task evidence.
- Out of scope:
  - Scheduler/background worker.
  - Auto-spam/cross-posting không kiểm soát.
  - Full Meta app review automation hoặc bypass permission review.
  - Facebook comments/insights moderation tooling beyond post URL/control metadata.

## 4. Input / Output

- Input: Connected Facebook social account, Page ID, video asset, publish record metadata.
- Output mong đợi: `publish_now` cho Facebook không còn fail adapter-not-implemented; record lưu post id/URL hoặc fail rõ error code/detail.

## 5. Acceptance Criteria

1. Facebook capability chuyển `realPublishStatus=enabled` và hỗ trợ `publish_now`.
2. `facebook_video` publish-now upload video asset lên Page video endpoint với title/description.
3. `facebook_reel` publish-now chạy Reels create/upload/publish flow hoặc fail bằng provider error rõ ràng nếu Graph API trả lỗi.
4. Account thiếu Page ID/token fail bằng `AUTH_FACEBOOK_*` trước khi upload.
5. Connection Test kiểm tra Facebook token/Page access thay vì skipped.
6. Tests cover happy path và failure path chính.

## 6. Technical Plan

1. Tạo `src/lib/social/facebook-upload.ts` với token/page resolution, video upload, Reel flow và error parsing.
2. Wire adapter vào `executePublishNow`, capability registry, post URL builder/UI messaging.
3. Update connection checks, social account guide, tutorial docs/domain docs.
4. Add focused tests and run build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/social/*`
  - `src/features/social/*`
  - `docs/*`
  - tests/changelog/tasks.

## 8. Test Plan

1. Unit tests cho Facebook adapter: video success, Reel success/queued, missing Page ID/token failure.
2. Unit tests cho Facebook connection check success/failure.
3. Capability/API regression tests nếu impacted.
4. Run `npm run build`.

## 9. Observability

- Metrics: none in MVP.
- Logs: Không log access token/page token.
- Error codes:
  - `AUTH_FACEBOOK_ACCESS_TOKEN_MISSING`
  - `AUTH_FACEBOOK_PAGE_ID_MISSING`
  - `PRV_FACEBOOK_PAGE_TOKEN_FAILED`
  - `PRV_FACEBOOK_VIDEO_UPLOAD_FAILED`
  - `PRV_FACEBOOK_REEL_*`

## 10. Risks & Rollback

- Risks:
  - Meta app chưa review/live có thể khiến post chỉ thấy với app roles hoặc bị permission denial.
  - Reels API behavior có thể khác theo Page/app permission; adapter phải fail rõ thay vì giả success.
- Rollback strategy:
  - Remove Facebook adapter wire and revert capability to deferred.

## 11. Deliverables

1. Facebook publish-now adapter.
2. Facebook connection check and UI guidance.
3. Tests, docs, changelog, task evidence.

## 12. Changelog Note

- Enable Facebook publish-now for Page videos/Reels with Graph API adapter and connection checks.

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
  - Facebook publishing targets Pages, not personal profiles.
  - User-provided `pageId` identifies the target Page.
  - Manual `accessToken` may be either user token with page permissions or Page access token; adapter will prefer explicit `pageAccessToken`/connection JSON when available if supported.
- Blockers:
- Verification evidence:
  - Added Facebook Graph API adapter for Page video upload and Reels start/upload/finish flow.
  - Added Page token resolution via `pageAccessToken`, connection JSON, or user access token Page lookup.
  - Enabled Facebook `publish_now` capability and routed `executePublishNow`.
  - Added Facebook Graph API connection check and UI/docs guidance.
  - Focused tests and full suite pass; build pass with unrelated existing unused `Image` warning.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/facebook-upload.test.ts`
  - `src/lib/social/connection-checks.test.ts`
  - `src/app/api/social/capabilities/route.test.ts` (regression suite)
- Test commands executed:
  - `npm run test -- --run src/lib/storage-providers/form-secrets.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts src/app/api/social/capabilities/route.test.ts`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (14 tests / 4 files).
  - Full suite pass (117 tests / 29 files).
  - Build pass; existing warning: unused `Image` in `src/features/workspace/display-preferences-panel.tsx`.
