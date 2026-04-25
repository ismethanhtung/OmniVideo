# [P2-SOCIAL-002] Social account CRUD and masked secrets

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

- Task ID: P2-SOCIAL-002
- Phase: P2
- Target Phase: P2
- Domain: Social Account Management
- Task Type: Feature
- Priority: P1
- Size: M
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: User cần add/manage account social cho các nền tảng chính.
- Bài toán cần giải quyết: tạo CRUD account với secret masking và validation nền tảng.
- Tài liệu liên quan: `docs/domains/social-account-management.md`, `docs/governance/testing-rules.md`

## 3. Scope

- In scope: social account repository, validation, sanitize, APIs, UI panel.
- Out of scope: OAuth browser flow và publish thật.

## 4. Input / Output

- Input: account metadata/secrets nhập từ dashboard.
- Output mong đợi: account được lưu MongoDB, list UI không lộ raw secrets.

## 5. Acceptance Criteria

1. User có thể create/list/edit/delete social account.
2. List API/UI chỉ hiển thị `secretSummary`.
3. Detail API có payload editable để hydrate form edit.
4. Validation reject platform/status/authMode invalid.

## 6. Technical Plan

1. Add social types/validation/sanitize/repository.
2. Add `GET/POST /api/social/accounts` and dynamic account route.
3. Add `Social Accounts` panel and navigation entry.
4. Add validation tests for account and masking.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/*`, `src/app/api/social/accounts/*`, `src/features/social/*`

## 8. Test Plan

1. Unit tests for validation and secret masking.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Metrics: future account counts by platform.
- Logs: route errors return stable `VAL_*`/`SYS_*` codes.
- Error codes: social validation errors use `VAL_SOCIAL_*`.

## 10. Risks & Rollback

- Risks: inline secret storage is MVP-only.
- Rollback strategy: disable UI panel/API routes and keep docs noting deferred secret manager.

## 11. Deliverables

1. Social account CRUD APIs.
2. Social Accounts UI.
3. Tests and evidence.

## 12. Changelog Note

- Add Social Accounts control center with masked secrets.

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

- Assumptions: secret handling follows current Storage Providers MVP pattern.
- Blockers: none
- Verification evidence: updated after final verification commands.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/validation.test.ts`, `src/app/api/social/accounts/route.test.ts`, `vitest.config.ts`
- Test commands executed: `npm run test -- src/lib/social/validation.test.ts src/lib/social/connection-checks.test.ts`, `npm run test`, `npm run build`
- Test results summary: targeted social tests pass (12 tests); full tests pass (84 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
