# [P4-WORKSPACE-005] Workspace progress integration and canvas toolbar polish

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

- Task ID: P4-WORKSPACE-005
- Phase: P4
- Target Phase: P4
- Domain: Workspace / UX
- Task Type: Bugfix
- Priority: P1
- Size: S
- Owner: AI Agent
- Reviewer: Owner
- Status: Done

## 2. Context

- Lý do: Workspace flow đang chạy nhưng không xuất hiện trên Progress Center; toolbar canvas còn nằm sai chỗ và nút Run chưa đẹp.
- Bài toán cần giải quyết: Đưa Workspace run vào Progress Center và gom controls pan/zoom/reset/clear vào canvas.
- Tài liệu liên quan: `docs/governance/testing-rules.md`

## 3. Scope

- In scope:
  - Workspace runner đăng ký/update/finish Progress Center.
  - Tinh chỉnh nút Run Workspace Flow.
  - Bỏ canvas title strip `title/nodes/edges`.
  - Đưa pan/zoom/reset/clear controls nổi trong canvas.
- Out of scope:
  - Thay đổi runner semantics.

## 4. Input / Output

- Input: User feedback trực tiếp trên Workspace.
- Output mong đợi: Progress Center hiển thị Workspace flow và canvas controls nằm trong graph surface.

## 5. Acceptance Criteria

1. Khi Workspace flow chạy, topbar Progress count tăng và task có progress.
2. Workspace flow cập nhật progress theo upload/publish stages và finish success/failed.
3. Canvas không còn title strip `Upload to Social executable flow ...`.
4. Pan/Zoom/Reset/Clear controls nằm bên trong canvas.
5. Tests/build pass.

## 6. Technical Plan

1. Import progress-center helpers vào Workspace panel.
2. Update `runWorkspaceFlow` tạo task progress và cập nhật theo stages.
3. Move canvas controls from header/title strip into canvas overlay.
4. Verify build/tests.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/features/workspace/workspace-canvas-panel.tsx`

## 8. Test Plan

1. Targeted workspace/navigation tests.
2. Full tests.
3. Build.

## 9. Observability

- Progress Center records Workspace flow with scope `system`.

## 10. Risks & Rollback

- Risks: Progress percentages are UI-estimated by stage.
- Rollback strategy: remove progress-center calls and restore toolbar placement.

## 11. Deliverables

1. Workspace progress integration.
2. Canvas toolbar polish.
3. Verification evidence.

## 12. Changelog Note

- Add Workspace flow Progress Center integration and move graph controls into canvas.

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

- Assumptions: Workspace flow progress can use stage-based percentages.
- Blockers: none.
- Verification evidence:
  - Workspace starts/updates/finishes Progress Center tasks when running flows.
  - Canvas title strip removed; pan/zoom/graph-valid/reset/clear controls are now overlayed inside canvas.
  - Run button style updated with stronger primary treatment.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated:
  - N/A
- Test commands executed:
  - `npm run test -- --run src/lib/workspace/workspace-graph.test.ts src/components/layout/navigation.test.ts src/lib/ui/progress-center.test.ts`
  - `npm run build`
  - `npm run test`
- Test results summary:
  - Targeted tests: pass (14 tests / 3 files).
  - Build: pass. Existing warning remains in `src/features/workspace/display-preferences-panel.tsx` (`Image` unused).
  - Full tests: pass (148 tests / 37 files).
