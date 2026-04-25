# [P2-SOCIAL-010] Add YouTube OAuth test-user guidance and real connection check

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

- Task ID: P2-SOCIAL-010
- Phase: P2
- Target Phase: P2
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User gặp Google OAuth 403 test-user access_denied và Connection Test đang skip YouTube dù account đã connected.
- Bài toán cần giải quyết: hướng dẫn thêm Google test user và kiểm tra thật YouTube OAuth token.
- Tài liệu liên quan: `docs/domains/social-account-management.md`

## 3. Scope

- In scope: YouTube guide update, YouTube connection checker via `channels?mine=true`.
- Out of scope: YouTube upload adapter.

## 4. Input / Output

- Input: connected YouTube account with access token.
- Output mong đợi: Connection Test calls YouTube Data API and returns ok/down instead of skipped.

## 5. Acceptance Criteria

1. YouTube guide mentions adding the user email under OAuth consent screen test users for Google 403 access_denied.
2. Connected YouTube social account is checked against YouTube Data API.
3. Connection Test only skips connected platforms without implemented health checker.
4. Tests cover YouTube connection checker.

## 6. Technical Plan

1. Add YouTube checker in social connection checks.
2. Update repository OAuth callback to set `authMode=oauth`.
3. Add test for YouTube checker.
4. Update docs/changelog.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/connection-checks.ts`, `src/lib/social/repository.ts`, `src/features/social/social-accounts-panel.tsx`

## 8. Test Plan

1. Unit test YouTube connection checker.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- YouTube social check now returns ok/down with provider message.

## 10. Risks & Rollback

- Risks: expired YouTube access token may require refresh-token flow next.
- Rollback strategy: return skipped for YouTube until refresh flow is added.

## 11. Deliverables

1. YouTube connection checker.
2. Google test-user guidance.

## 12. Changelog Note

- Add real YouTube OAuth connection check and Google test-user guidance.

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

## 14. Execution Notes

- Assumptions: YouTube access token is still valid; refresh-token renewal is follow-up.
- Blockers: none
- Verification evidence: tests/build pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/connection-checks.test.ts`
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (86 tests / 21 files); build pass with existing unused `Image` warning and Mongo DNS logs during static generation.
