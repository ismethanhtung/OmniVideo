# FAST-UX-012 Use Table Layout for Inspiration Vault and Simplify Topbar Capture

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

- Task ID: FAST-UX-012
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

- Lý do: User yêu cầu topbar chỉ giữ ô nhập, bỏ nút Vault; danh sách Inspiration Vault cần chuyển từ card phức tạp sang bảng dữ liệu đầy đủ và thêm copy action.
- Bài toán cần giải quyết: Tối giản thao tác capture và tăng khả năng scan dữ liệu theo bảng.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`, `docs/governance/testing-rules.md`.

## 3. Scope

- In scope: Remove topbar Vault button; table-based vault list; add copy action per row.
- Out of scope: Thay đổi logic classify/persistence.

## 4. Input / Output

- Input: UX feedback for topbar and vault list.
- Output mong đợi: topbar input-only + vault table with copy/open/delete/exploited controls.

## 5. Acceptance Criteria

1. Topbar không còn nút `Vault`, submit từ ô nhập vẫn capture bình thường.
2. Inspiration Vault hiển thị bằng bảng theo pattern các trang khác.
3. Có nút `Copy` để copy nội dung item đã lưu.

## 6. Technical Plan

1. Refactor topbar quick capture control.
2. Refactor vault render to table layout and add copy action.
3. Run tests/build and update governance artifacts.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Nếu Yes, module impacted: `src/components/layout/topbar.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`.
2. Failure cases cần thử: copy action graceful fallback khi clipboard fail.
3. Kết quả mong đợi: tests pass, build pass.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: Bảng quá rộng ở màn hình nhỏ.
- Rollback strategy: Revert layout refactor for panel/topbar.

## 11. Deliverables

1. Topbar input-only capture control.
2. Table layout for Inspiration Vault + Copy action.
3. Verification evidence and changelog.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Simplify topbar capture and replace Inspiration Vault cards with table + copy action.

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

- Assumptions: Copy action dùng `navigator.clipboard` với fallback đơn giản.
- Blockers: None.
- Verification evidence: Targeted tests pass; production build pass.
- Files changed: `src/components/layout/topbar.tsx`, `src/features/inspiration-vault/inspiration-vault-panel.tsx`, `src/components/layout/navigation.test.ts`, `src/components/layout/navigation.ts`, `tasks/FAST-UX-012.md`, `tasks/board.md`, `changelog/changelog.md`.
- Residual risks: Table có thể cần thêm responsive collapse nếu dữ liệu dài hơn nữa.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: `src/components/layout/navigation.test.ts` (assertion alignment with current nav grouping).
- Test commands executed: `npm run test -- --run src/lib/inspiration-vault/inspiration-vault.test.ts src/components/layout/navigation.test.ts`; `npm run build`.
- Test results summary: Tests pass (2 files / 14 tests). Build pass. Existing warnings remain outside this task scope.
