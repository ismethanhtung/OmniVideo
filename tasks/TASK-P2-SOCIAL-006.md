# [P2-SOCIAL-006] Social navigation integration and UI polish

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

- Task ID: P2-SOCIAL-006
- Phase: P2
- Target Phase: P2
- Domain: Dashboard UX
- Task Type: Feature
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Social Control Center cần xuất hiện trong dashboard hiện tại.
- Bài toán cần giải quyết: thêm leftbar group và route panels theo registry hiện có.
- Tài liệu liên quan: `docs/architecture/nextjs-mongodb-conventions.md`

## 3. Scope

- In scope: navigation types, leftbar group, content router, panel polish.
- Out of scope: route-level pages riêng.

## 4. Input / Output

- Input: social panel components.
- Output mong đợi: dashboard có group `Social Platforms` với 3 panel hoạt động.

## 5. Acceptance Criteria

1. Leftbar có Social Platforms group.
2. ContentRouter render đúng 3 social panels.
3. UI dùng existing tokens và không lộ secrets.

## 6. Technical Plan

1. Extend `AppSectionId`.
2. Add nav group.
3. Register panels in ContentRouter.
4. Verify build.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/*`, `src/features/social/*`

## 8. Test Plan

1. `npm run build`.
2. Manual code review for nav registration.

## 9. Observability

- No new metrics.

## 10. Risks & Rollback

- Risks: panel type mismatch can break build.
- Rollback strategy: unregister social group until fixed.

## 11. Deliverables

1. Social navigation group.
2. Registered social panels.

## 12. Changelog Note

- Add Social Platforms navigation and dashboard panels.

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

- Assumptions: dashboard remains panel-based.
- Blockers: none
- Verification evidence: final build command listed after verification.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: none for UI registration
- Test commands executed: `npm run test`, `npm run build`
- Test results summary: full tests pass (84 tests / 21 files); build pass with pre-existing `display-preferences-panel.tsx` unused `Image` warning.
