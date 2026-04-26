# [FAST-SOCIAL-003] Add Facebook Page Picker in New Publish Record

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

- Task ID: FAST-SOCIAL-003
- Phase: FAST
- Target Phase: Social runtime UX hardening
- Domain: Social Account Management
- Task Type: Feature
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User có nhiều Facebook Pages, nhưng `New Publish Record` chưa cho chọn target Page nên dễ publish nhầm hoặc fail `AUTH_FACEBOOK_PAGE_ID_REQUIRED`.
- Bài toán cần giải quyết: Form publish cần cho chọn Page cụ thể và truyền target vào runtime publish.
- Tài liệu liên quan:
  - `docs/domains/social-account-management.md`
  - `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Thêm API đọc danh sách Facebook Pages khả dụng theo social account.
  - Thêm dropdown chọn Page trong `New Publish Record` khi platform là Facebook.
  - Truyền `facebookPageId` vào publish record và runtime publish.
  - Cập nhật tests/docs/changelog/task evidence.
- Out of scope:
  - Full page-management module.
  - Persist page cache background job.

## 4. Input / Output

- Input: Facebook social account + user selection of target Page in publish form.
- Output mong đợi: Publish record và runtime publish dùng đúng Page user chọn.

## 5. Acceptance Criteria

1. Khi chọn social account Facebook trong `New Publish Record`, UI hiển thị dropdown `Facebook Page`.
2. Dropdown load danh sách Pages từ token/account context và cho chọn Page cụ thể.
3. `Publish now` Facebook dùng đúng `facebookPageId` user chọn.
4. Nếu chưa chọn Page trong trường hợp bắt buộc, submit bị chặn với message rõ ràng.
5. Có test bao phủ behavior mới.

## 6. Technical Plan

1. Add server helper/API for Facebook pages list by account.
2. Extend publish-record input/document with optional `facebookPageId`.
3. Wire page picker UI and submit payload.
4. Add/update tests and run test/build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/features/social/publish-records-panel.tsx`
  - `src/app/api/social/accounts/[accountId]/*` (facebook pages endpoint)
  - `src/lib/social/*`
  - tests/docs/changelog/tasks.

## 8. Test Plan

1. Unit tests for Facebook page list resolver/API.
2. Validation/repository tests for `facebookPageId` flow.
3. `npm run test` + `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: do not log tokens.
- Errors: reuse `AUTH_FACEBOOK_*`, `PRV_FACEBOOK_*`.

## 10. Risks & Rollback

- Risks: `/me/accounts` call may fail if token missing scope.
- Rollback strategy: revert UI picker and keep account-level page selection only.

## 11. Deliverables

1. Facebook Page picker in publish modal.
2. Backend support for page list + page-specific publish target.
3. Tests and changelog/task updates.

## 12. Changelog Note

- Add Facebook Page picker in New Publish Record and route publish-now to the selected Page.

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

- Assumptions: Facebook account already connected by OAuth/token.
- Blockers:
- Verification evidence:
  - Added endpoint `GET /api/social/accounts/[accountId]/facebook-pages` to list manageable Pages for a Facebook account.
  - `New Publish Record` now shows a Facebook Page dropdown and blocks submit when Facebook publish type has no selected Page.
  - Selected `facebookPageId` is persisted in publish records and used by runtime adapter for per-record Page targeting.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts` (new)
  - `src/lib/social/facebook-auth.test.ts` (updated)
  - `src/lib/social/facebook-upload.test.ts` (updated)
  - `src/lib/social/validation.test.ts` (updated)
  - `src/lib/social/connection-checks.test.ts` (updated)
- Test commands executed:
  - `npm run test -- --run src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/connection-checks.test.ts src/lib/social/validation.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts'`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (28 tests / 5 files).
  - Full suite pass (123 tests / 31 files).
  - Build pass; existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
