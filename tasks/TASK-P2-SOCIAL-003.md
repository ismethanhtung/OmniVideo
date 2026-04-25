# [P2-SOCIAL-003] Social capability registry and platform task dashboard

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

- Task ID: P2-SOCIAL-003
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

- Lý do: User cần biết từng nền tảng có tác vụ/công cụ/scope gì.
- Bài toán cần giải quyết: capability registry thống nhất cho UI và validation.
- Tài liệu liên quan: `docs/domains/social-account-management.md`

## 3. Scope

- In scope: capability registry, capabilities API, dashboard API, Platform Tasks UI.
- Out of scope: adapter publish thật.

## 4. Input / Output

- Input: platform capability definitions.
- Output mong đợi: dashboard hiển thị format, required scopes, missing scopes, next actions.

## 5. Acceptance Criteria

1. Capability registry có Facebook/TikTok/Shopee/YouTube.
2. `GET /api/social/capabilities` trả registry.
3. `GET /api/social/dashboard` trả summary/accounts/capabilities.
4. Platform Tasks UI hiển thị next actions theo account/scope.

## 6. Technical Plan

1. Add capability registry.
2. Use registry in validation and dashboard aggregation.
3. Add Platform Tasks panel.
4. Add tests ensuring every publish type maps to a platform.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/lib/social/capabilities.ts`, `src/app/api/social/*`, `src/features/social/platform-tasks-panel.tsx`

## 8. Test Plan

1. Unit tests for capability mapping.
2. `npm run test`.
3. `npm run build`.

## 9. Observability

- Dashboard summary includes account counts and asset counts.

## 10. Risks & Rollback

- Risks: platform limits may change.
- Rollback strategy: capability registry is centralized for quick correction.

## 11. Deliverables

1. Capability registry/API.
2. Platform Tasks dashboard.

## 12. Changelog Note

- Add social capability registry and platform task dashboard.

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

- Assumptions: capability values are operational defaults, not legal guarantees.
- Blockers: none
- Verification evidence: targeted social tests pass.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/lib/social/validation.test.ts`, `src/app/api/social/capabilities/route.test.ts`
- Test commands executed: `npm run test -- src/lib/social/validation.test.ts src/lib/social/connection-checks.test.ts`, `npm run test`, `npm run build`
- Test results summary: targeted social tests pass (12 tests); full tests pass (84 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
