# FAST-UX-013 Finalize Topbar Icons and Remove Temporary Logo Options

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

- Task ID: FAST-UX-013
- Phase: P2
- Target Phase: P2
- Domain: UX
- Task Type: Refactor
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: User
- Status: Done

## 2. Context

- Lý do: User chốt icon topbar mới và yêu cầu xoá phần tạm.
- Bài toán cần giải quyết: Đồng bộ icon controls và dọn UI thử nghiệm.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: đổi icon topbar; xoá khối logo options tạm.
- Out of scope: thay đổi logic progress/system/refresh.

## 4. Input / Output

- Input: mapping icon user chỉ định.
- Output mong đợi: topbar icon mới + UI tạm bị xoá.

## 5. Acceptance Criteria

1. `Refresh` dùng icon `Orbit`.
2. `Progress` dùng icon `Rocket`.
3. `System` dùng icon `Gauge`.
4. Khối logo options tạm bị xoá.

## 6. Technical Plan

1. Update icon imports/usage in topbar.
2. Remove temporary logo-options block.
3. Run build and update governance artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/topbar.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run build`.
2. Failure cases cần thử: compile/type/lint warnings mới từ icon imports.
3. Kết quả mong đợi: build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: None significant.
- Rollback strategy: revert icon/block-only edits.

## 11. Deliverables

1. Topbar icons updated.
2. Temporary logo block removed.
3. Verification evidence.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Switch topbar icons and remove temporary logo options panel.

## 13. Task Type Checklist (Stamp [x])

### 13.1 Feature

- [ ] Có user/system flow rõ ràng
- [ ] Có acceptance criteria đo được
- [ ] Có test cho happy path
- [ ] Có test cho failure path chính

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

- Assumptions: "xoá" refers to removing temporary logo options block.
- Blockers: None.
- Verification evidence: build pass.
- Files changed: `src/components/layout/topbar.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `tasks/FAST-UX-013.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: None.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: `npm run build`.
- Test results summary: Build pass. Existing warnings remain outside task scope.
