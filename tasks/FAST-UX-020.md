# FAST-UX-020 Use Pointer Cursor for Content Copy Hover

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

- Task ID: FAST-UX-020
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

- Lý do: `cursor-copy` hiển thị dấu `+` không phù hợp mong muốn UI.
- Bài toán cần giải quyết: đổi về pointer thường.
- Tài liệu liên quan: `docs/governance/ai-agent-rules.md`.

## 3. Scope

- In scope: đổi class cursor tại content-click copy.
- Out of scope: logic copy.

## 4. Input / Output

- Input: feedback cursor style.
- Output mong đợi: hover pointer thường.

## 5. Acceptance Criteria

1. Không còn dấu `+` ở cursor.
2. Hover hiển thị pointer thường.

## 6. Technical Plan

1. Update cursor class.
2. Update task/changelog/board.

## 7. Code Change Impact

- Có thay đổi code không: Yes
- Եթե Yes, module impacted: `src/features/inspiration-vault/inspiration-vault-panel.tsx`

## 8. Test Plan

1. Unit/Integration cần chạy: N/A (style-only micro change).
2. Failure cases cần thử: N/A.
3. Kết quả mong đợi: N/A.

## 9. Observability

- Metrics: No change.
- Logs: No change.
- Error codes: No change.

## 10. Risks & Rollback

- Risks: None.
- Rollback strategy: revert one-line class change.

## 11. Deliverables

1. Cursor style fix.

## 12. Changelog Note

- Tóm tắt dòng changelog dự kiến: Replace `cursor-copy` with `cursor-pointer` for content click-to-copy.

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

- Assumptions: user wants standard pointer only.
- Blockers: None.
- Verification evidence: style class updated.

## 15. Test Evidence (Mandatory if code changed)

- Test files added/updated: None.
- Test commands executed: None (style-only micro update).
- Test results summary: N/A.
