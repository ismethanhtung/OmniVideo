# [FAST-CONN-002] Stabilize Social Connection Checks for Facebook Multi-Page and YouTube Refresh Flow

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

- Task ID: FAST-CONN-002
- Phase: FAST
- Target Phase: Connection reliability hardening
- Domain: Operations / Social Account Management
- Task Type: Bugfix
- Priority: P0
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Connection Test hiển thị `down` cho Facebook/YouTube dù account đã connect.
- Bài toán cần giải quyết:
  - Facebook: account nhiều Page bị đánh down chỉ vì thiếu `pageId` account-level.
  - YouTube: check theo access token hiện tại, dễ fail 400 khi token hết hạn dù có refresh token.
- Tài liệu liên quan:
  - `docs/operations/connection-management.md`
  - `docs/domains/social-account-management.md`

## 3. Scope

- In scope:
  - Cập nhật logic Facebook connection check để coi trạng thái nhiều Page là healthy-with-selection-required thay vì down.
  - Cập nhật YouTube connection check để ưu tiên refresh token flow trước khi validate scope.
  - Cập nhật test coverage cho nhánh mới.
- Out of scope:
  - Full observability metrics.
  - Background token refresh scheduler.

## 4. Input / Output

- Input: social account secrets/status cho Facebook và YouTube.
- Output mong đợi: Connection Test phản ánh đúng health thực tế và actionable guidance.

## 5. Acceptance Criteria

1. Facebook account có nhiều Pages nhưng token hợp lệ không còn bị `down` chỉ vì thiếu account-level pageId.
2. YouTube check ưu tiên token refresh khi có refresh credentials, giảm false-down do access token cũ.
3. Connection Test message vẫn actionable cho user chọn Page ở publish form.
4. Regression tests pass.

## 6. Technical Plan

1. Refactor `checkSocialAccountConnections` cho Facebook/YouTube semantics.
2. Add/update tests cho multi-page + refresh token paths.
3. Run focused tests, full tests, and build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted:
  - `src/lib/social/connection-checks.ts`
  - `src/lib/social/connection-checks.test.ts`
  - related social auth helpers if needed.

## 8. Test Plan

1. Focused tests cho connection-checks.
2. Full `npm run test`.
3. `npm run build`.

## 9. Observability

- Metrics: none.
- Logs: không log raw tokens.
- Error codes: giữ nhóm `AUTH_YOUTUBE_*`, `AUTH_FACEBOOK_*`.

## 10. Risks & Rollback

- Risks: Scope validation endpoint thay đổi behavior theo Google API response shape.
- Rollback strategy: revert check logic to previous implementation.

## 11. Deliverables

1. Corrected social connection check behavior.
2. Regression tests.
3. Changelog/task updates.

## 12. Changelog Note

- Fix false-down social connection checks for Facebook multi-page accounts and YouTube tokens requiring refresh.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

### 13.2 Bugfix

- [x] Có mô tả cách tái hiện lỗi
- [x] Có root cause ngắn gọn
- [x] Có regression test
- [x] Có xác nhận lỗi cũ không tái diễn

### 13.3 Research

- [ ] Có câu hỏi nghiên cứu rõ
- [ ] Có kết quả/khuyến nghị cụ thể
- [ ] Có quyết định next step
- [ ] Có tài liệu tham chiếu

## 14. Execution Notes

- Assumptions:
- Blockers:
- Verification evidence:
  - Facebook connection check now treats multi-page accounts as healthy and instructs page selection at publish time.
  - YouTube connection check now refreshes access token first when refresh credentials are available.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - `src/lib/social/connection-checks.ts`
  - `src/lib/social/connection-checks.test.ts`
- Test commands executed:
  - `npm run test -- --run src/lib/social/connection-checks.test.ts src/lib/social/facebook-auth.test.ts src/lib/social/facebook-upload.test.ts src/lib/social/validation.test.ts src/app/api/social/publish-records/route.test.ts 'src/app/api/social/accounts/[accountId]/facebook-pages/route.test.ts'`
  - `npm run test`
  - `npm run build`
- Test results summary:
  - Focused tests pass (30 tests / 6 files).
  - Full suite pass (124 tests / 31 files).
  - Build pass with existing non-blocking lint warnings in `navigation.ts` and `display-preferences-panel.tsx`.
