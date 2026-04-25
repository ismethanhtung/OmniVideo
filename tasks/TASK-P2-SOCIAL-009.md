# [P2-SOCIAL-009] Keep OAuth setup errors inside social account modal

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

- Task ID: P2-SOCIAL-009
- Phase: P2
- Target Phase: P2
- Domain: Social Account Management UX
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: OAuth config errors were displayed in the page status bar instead of the New/Edit Social Account modal.
- Bài toán cần giải quyết: modal-local errors must stay in modal and YouTube setup needs redirect URI guidance.
- Tài liệu liên quan: `docs/domains/social-account-management.md`

## 3. Scope

- In scope: modal-local status/message, YouTube setup guide, redirect URI display.
- Out of scope: completing real YouTube upload adapter.

## 4. Input / Output

- Input: user starts OAuth from account modal.
- Output mong đợi: missing env/config errors appear inside the modal; guide shows exact redirect URI.

## 5. Acceptance Criteria

1. OAuth start errors no longer replace the page-level Social Accounts status bar.
2. New/Edit modal shows modal-local `failed/loading/success/idle` status.
3. YouTube guide includes Google Cloud Console, YouTube Data API v3, OAuth Web Application, `.env`, `SOCIAL_OAUTH_BASE_URL`, and redirect URI setup.
4. Modal shows current redirect URI for the selected platform.

## 6. Technical Plan

1. Add modal status/message state.
2. Route save/OAuth errors into modal state.
3. Add YouTube setup steps and redirect URI display.
4. Update docs/changelog and verify.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/social/social-accounts-panel.tsx`

## 8. Test Plan

1. `npm run test`.
2. `npm run build`.

## 9. Observability

- UI error visibility improves operator feedback; no new metrics.

## 10. Risks & Rollback

- Risks: redirect URI must still match actual deployment base URL.
- Rollback strategy: remove modal-local state and guide additions.

## 11. Deliverables

1. Modal-local OAuth error display.
2. YouTube setup guide and redirect URI display.

## 12. Changelog Note

- Fix Social Account OAuth errors to display inside modal and add YouTube redirect URI setup guidance.

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

## 14. Execution Notes

- Assumptions: visual modal-local error state is sufficient for this UX regression.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: none
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (85 tests / 21 files); build pass with existing unused `Image` warning and Mongo DNS logs during static generation.
