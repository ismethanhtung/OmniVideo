# [P2-SOCIAL-004] Social connection checks

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

- Task ID: P2-SOCIAL-004
- Phase: P2
- Target Phase: P2
- Domain: Connection Center
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Feature phụ thuộc social integration phải có connection visibility.
- Bài toán cần giải quyết: Connection Test cần hiển thị social accounts cùng MongoDB/storage.
- Tài liệu liên quan: `docs/operations/connection-management.md`

## 3. Scope

- In scope: social connection helper, `/api/health/connections` extension, UI type/display update.
- Out of scope: live API calls đến platform thật.

## 4. Input / Output

- Input: social account metadata.
- Output mong đợi: social checks `ok/down/skipped` không lộ secrets.

## 5. Acceptance Criteria

1. No social accounts returns `skipped`.
2. Manual accounts return `skipped`.
3. Credential auth without secrets returns `down` with auth message.
4. Credential metadata configured returns `ok` with deferred real check message.

## 6. Technical Plan

1. Add `checkSocialAccountConnections`.
2. Add repository query for social connection checks.
3. Extend health connections API and UI.
4. Add unit tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/connection-checks.ts`, `src/app/api/health/connections/route.ts`, `src/features/connections/connection-test-panel.tsx`

## 8. Test Plan

1. Unit tests for skipped/down/ok social check cases.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Service checks include `serviceType=social`, platform and account label.

## 10. Risks & Rollback

- Risks: check is metadata-level until adapters exist.
- Rollback strategy: leave social checks skipped/deferred.

## 11. Deliverables

1. Social connection checks.
2. Connection Center social display.

## 12. Changelog Note

- Extend Connection Test with social account checks.

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

- Assumptions: real network health checks wait for platform adapters.
- Blockers: none
- Verification evidence: targeted social tests pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/connection-checks.test.ts`
- Test commands executed: `npm run test -- src/lib/social/validation.test.ts src/lib/social/connection-checks.test.ts`, `npm run test`, `npm run build`
- Test results summary: targeted social tests pass (12 tests); full tests pass (84 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
